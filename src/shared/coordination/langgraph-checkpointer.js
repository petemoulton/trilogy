/**
 * LangGraph PostgreSQL Checkpointer Integration
 * 
 * Provides state management and fault tolerance for Trilogy AI agents
 * using LangGraph's production-ready PostgreSQL checkpointer.
 * 
 * Features:
 * - Fault-tolerant agent execution with automatic recovery
 * - Thread-based conversation management
 * - Time travel debugging capabilities
 * - Human-in-the-loop approval gates
 * - Production-grade state persistence
 */

const { PostgresSaver } = require('@langchain/langgraph-checkpoint-postgres');
const { Pool } = require('pg');
const EventEmitter = require('events');

class TrilogyLangGraphCheckpointer extends EventEmitter {
  constructor(postgresConfig, options = {}) {
    super();
    
    this.config = {
      ...postgresConfig,
      application_name: 'trilogy-langgraph',
      max: options.maxConnections || 10,
      idleTimeoutMillis: options.idleTimeout || 30000,
      connectionTimeoutMillis: options.connectionTimeout || 5000,
    };
    
    this.options = {
      enableTimeTravel: options.enableTimeTravel !== false,
      enableHumanApproval: options.enableHumanApproval !== false,
      maxCheckpoints: options.maxCheckpoints || 1000,
      cleanupInterval: options.cleanupInterval || 24 * 60 * 60 * 1000, // 24 hours
      ...options
    };
    
    this.pool = null;
    this.checkpointer = null;
    this.isInitialized = false;
    
    // Thread management
    this.activeThreads = new Map();
    this.threadConfigs = new Map();
    
    // Human approval queue
    this.approvalQueue = new Map();
    
    console.log('🧠 LangGraph Checkpointer initialized with PostgreSQL backend');
  }

  /**
   * Initialize the checkpointer and database connection
   */
  async initialize() {
    try {
      // Create dedicated connection pool for LangGraph
      this.pool = new Pool(this.config);
      
      // Test connection
      const client = await this.pool.connect();
      client.release();
      
      // Initialize PostgreSQL checkpointer with proper pool format
      this.checkpointer = PostgresSaver.fromConnString(
        `postgresql://${this.config.user}:${this.config.password}@${this.config.host}:${this.config.port}/${this.config.database}`
      );
      
      // Create checkpointer tables
      await this.checkpointer.setup();
      
      // Initialize cleanup job
      this.startCleanupJob();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      console.log('✅ LangGraph PostgreSQL Checkpointer initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize LangGraph checkpointer:', error);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Create a new conversation thread
   */
  async createThread(config = {}) {
    if (!this.isInitialized) {
      throw new Error('Checkpointer not initialized');
    }
    
    const threadId = config.threadId || `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const threadConfig = {
      configurable: {
        thread_id: threadId,
        checkpoint_ns: config.namespace || 'trilogy',
        ...config.configurable
      }
    };
    
    this.activeThreads.set(threadId, {
      id: threadId,
      config: threadConfig,
      created: new Date(),
      lastActivity: new Date(),
      status: 'active',
      checkpoints: 0,
      metadata: config.metadata || {}
    });
    
    this.threadConfigs.set(threadId, threadConfig);
    
    this.emit('thread:created', { threadId, config: threadConfig });
    
    console.log(`🧵 Created new thread: ${threadId}`);
    return { threadId, config: threadConfig };
  }

  /**
   * Save checkpoint for agent state
   */
  async saveCheckpoint(threadId, state, metadata = {}) {
    if (!this.isInitialized) {
      throw new Error('Checkpointer not initialized');
    }
    
    const threadConfig = this.threadConfigs.get(threadId);
    if (!threadConfig) {
      throw new Error(`Thread ${threadId} not found`);
    }
    
    try {
      // Prepare checkpoint data in LangGraph format
      const threadKey = { thread_id: threadId };
      const checkpoint = {
        ts: Date.now(),
        channel_values: state || {},
        channel_versions: {},
        versions_seen: {}
      };
      
      // Add checkpoint metadata
      const checkpointMetadata = {
        timestamp: new Date().toISOString(),
        threadId,
        checkpointId: `checkpoint_${Date.now()}`,
        ...metadata
      };
      
      await this.checkpointer.put(threadKey, checkpoint, checkpointMetadata);
      
      // Update thread tracking
      const thread = this.activeThreads.get(threadId);
      if (thread) {
        thread.lastActivity = new Date();
        thread.checkpoints += 1;
        thread.lastCheckpoint = checkpointMetadata;
      }
      
      this.emit('checkpoint:saved', { threadId, checkpoint: checkpointMetadata });
      
      console.log(`💾 Saved checkpoint for thread ${threadId}: ${checkpointMetadata.checkpointId}`);
      return checkpointMetadata.checkpointId;
      
    } catch (error) {
      console.error(`❌ Failed to save checkpoint for thread ${threadId}:`, error);
      this.emit('checkpoint:error', { threadId, error });
      throw error;
    }
  }

  /**
   * Load the latest checkpoint for a thread
   */
  async loadCheckpoint(threadId) {
    if (!this.isInitialized) {
      throw new Error('Checkpointer not initialized');
    }
    
    const threadConfig = this.threadConfigs.get(threadId);
    if (!threadConfig) {
      throw new Error(`Thread ${threadId} not found`);
    }
    
    try {
      const checkpoint = await this.checkpointer.get(threadConfig);
      
      if (checkpoint) {
        console.log(`📖 Loaded checkpoint for thread ${threadId}: ${checkpoint._metadata?.checkpointId}`);
        this.emit('checkpoint:loaded', { threadId, checkpoint: checkpoint._metadata });
      }
      
      return checkpoint;
      
    } catch (error) {
      console.error(`❌ Failed to load checkpoint for thread ${threadId}:`, error);
      this.emit('checkpoint:error', { threadId, error });
      throw error;
    }
  }

  /**
   * Get checkpoint history for time travel debugging
   */
  async getCheckpointHistory(threadId, limit = 10) {
    if (!this.isInitialized || !this.options.enableTimeTravel) {
      return [];
    }
    
    const threadConfig = this.threadConfigs.get(threadId);
    if (!threadConfig) {
      throw new Error(`Thread ${threadId} not found`);
    }
    
    try {
      const history = await this.checkpointer.list(threadConfig, { limit });
      
      console.log(`📚 Retrieved ${history.length} checkpoints for thread ${threadId}`);
      return history;
      
    } catch (error) {
      console.error(`❌ Failed to get checkpoint history for thread ${threadId}:`, error);
      return [];
    }
  }

  /**
   * Revert to a previous checkpoint (time travel)
   */
  async revertToCheckpoint(threadId, checkpointId) {
    if (!this.isInitialized || !this.options.enableTimeTravel) {
      throw new Error('Time travel not enabled');
    }
    
    const history = await this.getCheckpointHistory(threadId, 100);
    const targetCheckpoint = history.find(cp => cp._metadata?.checkpointId === checkpointId);
    
    if (!targetCheckpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found in thread ${threadId}`);
    }
    
    // Save current state as a backup before reverting
    await this.saveCheckpoint(threadId, targetCheckpoint, {
      type: 'revert',
      originalCheckpoint: checkpointId,
      revertedAt: new Date().toISOString()
    });
    
    this.emit('checkpoint:reverted', { threadId, checkpointId });
    
    console.log(`⏰ Reverted thread ${threadId} to checkpoint ${checkpointId}`);
    return targetCheckpoint;
  }

  /**
   * Request human approval for agent action
   */
  async requestApproval(threadId, action, context = {}) {
    if (!this.options.enableHumanApproval) {
      return { approved: true, automatic: true };
    }
    
    const approvalId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const approvalRequest = {
      id: approvalId,
      threadId,
      action,
      context,
      requestedAt: new Date(),
      status: 'pending',
      timeout: context.timeout || 5 * 60 * 1000 // 5 minutes default
    };
    
    this.approvalQueue.set(approvalId, approvalRequest);
    
    // Set timeout for automatic rejection
    setTimeout(() => {
      const request = this.approvalQueue.get(approvalId);
      if (request && request.status === 'pending') {
        request.status = 'timeout';
        this.emit('approval:timeout', approvalRequest);
      }
    }, approvalRequest.timeout);
    
    this.emit('approval:requested', approvalRequest);
    
    console.log(`👤 Requested human approval for thread ${threadId}: ${approvalId}`);
    
    // Return a promise that resolves when approval is given
    return new Promise((resolve, reject) => {
      const checkApproval = () => {
        const request = this.approvalQueue.get(approvalId);
        if (!request) {
          reject(new Error('Approval request not found'));
          return;
        }
        
        if (request.status === 'approved') {
          resolve({ approved: true, feedback: request.feedback });
        } else if (request.status === 'rejected') {
          resolve({ approved: false, reason: request.reason });
        } else if (request.status === 'timeout') {
          resolve({ approved: false, reason: 'timeout' });
        } else {
          // Still pending, check again
          setTimeout(checkApproval, 1000);
        }
      };
      
      checkApproval();
    });
  }

  /**
   * Approve a pending action
   */
  async approveAction(approvalId, feedback = '') {
    const request = this.approvalQueue.get(approvalId);
    if (!request) {
      throw new Error(`Approval request ${approvalId} not found`);
    }
    
    request.status = 'approved';
    request.feedback = feedback;
    request.approvedAt = new Date();
    
    this.emit('approval:approved', request);
    
    console.log(`✅ Approved action: ${approvalId}`);
    return request;
  }

  /**
   * Reject a pending action
   */
  async rejectAction(approvalId, reason = '') {
    const request = this.approvalQueue.get(approvalId);
    if (!request) {
      throw new Error(`Approval request ${approvalId} not found`);
    }
    
    request.status = 'rejected';
    request.reason = reason;
    request.rejectedAt = new Date();
    
    this.emit('approval:rejected', request);
    
    console.log(`❌ Rejected action: ${approvalId}`);
    return request;
  }

  /**
   * Get thread statistics and health
   */
  async getThreadStats() {
    const stats = {
      activeThreads: this.activeThreads.size,
      totalCheckpoints: 0,
      pendingApprovals: Array.from(this.approvalQueue.values()).filter(req => req.status === 'pending').length,
      threads: []
    };
    
    for (const [threadId, thread] of this.activeThreads) {
      stats.totalCheckpoints += thread.checkpoints;
      stats.threads.push({
        id: threadId,
        status: thread.status,
        checkpoints: thread.checkpoints,
        created: thread.created,
        lastActivity: thread.lastActivity,
        metadata: thread.metadata
      });
    }
    
    return stats;
  }

  /**
   * Cleanup old checkpoints and inactive threads
   */
  async cleanup() {
    if (!this.isInitialized) return;
    
    const cutoffTime = new Date(Date.now() - this.options.cleanupInterval);
    let cleaned = 0;
    
    // Clean up inactive threads
    for (const [threadId, thread] of this.activeThreads) {
      if (thread.lastActivity < cutoffTime && thread.status !== 'active') {
        this.activeThreads.delete(threadId);
        this.threadConfigs.delete(threadId);
        cleaned++;
      }
    }
    
    // Clean up old approval requests
    for (const [approvalId, request] of this.approvalQueue) {
      if (request.requestedAt < cutoffTime) {
        this.approvalQueue.delete(approvalId);
      }
    }
    
    console.log(`🧹 Cleaned up ${cleaned} inactive threads`);
    this.emit('cleanup:completed', { cleaned });
  }

  /**
   * Start periodic cleanup job
   */
  startCleanupJob() {
    setInterval(() => {
      this.cleanup().catch(error => {
        console.error('❌ Cleanup job failed:', error);
      });
    }, this.options.cleanupInterval);
    
    console.log('🕐 Started periodic cleanup job');
  }

  /**
   * Get the raw checkpointer instance for advanced usage
   */
  getCheckpointer() {
    return this.checkpointer;
  }

  /**
   * Close connections and cleanup
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('✅ LangGraph checkpointer connections closed');
    }
  }
}

module.exports = TrilogyLangGraphCheckpointer;