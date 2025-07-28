/**
 * LangGraph Agent Wrapper
 * 
 * Wraps existing Trilogy agents (Sonnet, Opus, Specialists) with LangGraph
 * state management, checkpointing, and fault tolerance capabilities.
 * 
 * This enables:
 * - Automatic state persistence across agent executions
 * - Fault tolerance with automatic recovery
 * - Human-in-the-loop approval gates
 * - Time travel debugging for agent workflows
 * - Thread-based conversation management
 */

const EventEmitter = require('events');
const TrilogyLangGraphCheckpointer = require('../coordination/langgraph-checkpointer');

class LangGraphAgentWrapper extends EventEmitter {
  constructor(agent, checkpointer, options = {}) {
    super();
    
    this.agent = agent;
    this.checkpointer = checkpointer;
    this.options = {
      enableCheckpointing: options.enableCheckpointing !== false,
      enableApprovalGates: options.enableApprovalGates !== false,
      checkpointInterval: options.checkpointInterval || 'auto', // 'auto', 'manual', or number in ms
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      ...options
    };
    
    // Agent state
    this.currentThread = null;
    this.executionState = 'idle'; // idle, running, paused, failed, completed
    this.lastCheckpoint = null;
    this.executionHistory = [];
    this.retryCount = 0;
    
    // Wrap agent methods with LangGraph capabilities
    this.wrapAgentMethods();
    
    console.log(`🤖 LangGraph wrapper initialized for agent: ${agent.constructor.name}`);
  }

  /**
   * Wrap existing agent methods with LangGraph state management
   */
  wrapAgentMethods() {
    const originalMethods = ['process', 'execute', 'performTask', 'analyze'];
    
    originalMethods.forEach(methodName => {
      if (typeof this.agent[methodName] === 'function') {
        const originalMethod = this.agent[methodName].bind(this.agent);
        
        this.agent[methodName] = async (...args) => {
          return this.executeWithCheckpointing(methodName, originalMethod, args);
        };
      }
    });
  }

  /**
   * Execute agent method with automatic checkpointing and fault tolerance
   */
  async executeWithCheckpointing(methodName, originalMethod, args) {
    if (!this.currentThread) {
      throw new Error('No active thread. Call startThread() first.');
    }
    
    const executionId = `exec_${Date.now()}_${methodName}`;
    this.executionState = 'running';
    
    try {
      // Pre-execution checkpoint
      if (this.options.enableCheckpointing) {
        await this.saveExecutionCheckpoint('pre_execution', {
          executionId,
          methodName,
          args: this.sanitizeArgs(args),
          timestamp: new Date().toISOString()
        });
      }
      
      // Check for approval gates
      if (this.options.enableApprovalGates && this.needsApproval(methodName, args)) {
        const approval = await this.checkpointer.requestApproval(
          this.currentThread.threadId,
          { method: methodName, args: this.sanitizeArgs(args) },
          { timeout: 5 * 60 * 1000 } // 5 minutes
        );
        
        if (!approval.approved) {
          throw new Error(`Execution rejected: ${approval.reason || 'No reason provided'}`);
        }
      }
      
      // Execute with retry logic
      let result;
      let attempts = 0;
      
      while (attempts <= this.options.maxRetries) {
        try {
          this.emit('execution:started', { executionId, methodName, attempt: attempts + 1 });
          
          result = await originalMethod(...args);
          
          // Successful execution
          this.retryCount = 0;
          this.executionState = 'completed';
          
          break;
          
        } catch (error) {
          attempts++;
          this.retryCount = attempts;
          
          console.error(`❌ Agent execution failed (attempt ${attempts}/${this.options.maxRetries + 1}):`, error);
          
          if (attempts > this.options.maxRetries) {
            this.executionState = 'failed';
            throw error;
          }
          
          // Save failure checkpoint for debugging
          if (this.options.enableCheckpointing) {
            await this.saveExecutionCheckpoint('execution_failure', {
              executionId,
              methodName,
              attempt: attempts,
              error: error.message,
              stack: error.stack,
              timestamp: new Date().toISOString()
            });
          }
          
          this.emit('execution:retry', { executionId, methodName, attempt: attempts, error });
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, this.options.retryDelay * attempts));
        }
      }
      
      // Post-execution checkpoint
      if (this.options.enableCheckpointing) {
        await this.saveExecutionCheckpoint('post_execution', {
          executionId,
          methodName,
          result: this.sanitizeResult(result),
          timestamp: new Date().toISOString(),
          success: true
        });
      }
      
      this.emit('execution:completed', { executionId, methodName, result });
      
      return result;
      
    } catch (error) {
      this.executionState = 'failed';
      
      // Final failure checkpoint
      if (this.options.enableCheckpointing) {
        await this.saveExecutionCheckpoint('execution_failed', {
          executionId,
          methodName,
          error: error.message,
          stack: error.stack,
          retryCount: this.retryCount,
          timestamp: new Date().toISOString(),
          success: false
        });
      }
      
      this.emit('execution:failed', { executionId, methodName, error });
      
      throw error;
    }
  }

  /**
   * Start a new conversation thread
   */
  async startThread(config = {}) {
    const threadConfig = {
      namespace: config.namespace || `agent_${this.agent.constructor.name.toLowerCase()}`,
      metadata: {
        agentType: this.agent.constructor.name,
        startedAt: new Date().toISOString(),
        ...config.metadata
      },
      ...config
    };
    
    this.currentThread = await this.checkpointer.createThread(threadConfig);
    this.executionState = 'idle';
    this.executionHistory = [];
    
    this.emit('thread:started', this.currentThread);
    
    console.log(`🧵 Started new thread for agent: ${this.currentThread.threadId}`);
    return this.currentThread;
  }

  /**
   * Resume execution from a checkpoint
   */
  async resumeFromCheckpoint(threadId, checkpointId = null) {
    // Load thread configuration
    this.currentThread = { threadId, config: { configurable: { thread_id: threadId } } };
    
    // Load checkpoint state
    const checkpoint = checkpointId 
      ? await this.checkpointer.revertToCheckpoint(threadId, checkpointId)
      : await this.checkpointer.loadCheckpoint(threadId);
    
    if (checkpoint) {
      this.lastCheckpoint = checkpoint;
      this.executionState = 'paused'; // Ready to continue
      
      this.emit('thread:resumed', { threadId, checkpoint });
      
      console.log(`🔄 Resumed thread ${threadId} from checkpoint`);
    }
    
    return checkpoint;
  }

  /**
   * Save execution checkpoint
   */
  async saveExecutionCheckpoint(phase, data) {
    if (!this.currentThread || !this.options.enableCheckpointing) {
      return;
    }
    
    const checkpoint = {
      phase,
      agentType: this.agent.constructor.name,
      executionState: this.executionState,
      data,
      thread: this.currentThread.threadId,
      timestamp: new Date().toISOString()
    };
    
    const checkpointId = await this.checkpointer.saveCheckpoint(
      this.currentThread.threadId,
      checkpoint,
      { phase, agentType: this.agent.constructor.name }
    );
    
    this.lastCheckpoint = { ...checkpoint, id: checkpointId };
    this.executionHistory.push(this.lastCheckpoint);
    
    return checkpointId;
  }

  /**
   * Check if method needs human approval
   */
  needsApproval(methodName, args) {
    // Define approval gates based on agent type and method
    const approvalGates = {
      'OpusAgent': ['performComplexTaskBreakdown', 'makeIntelligentDecision'],
      'SonnetAgent': ['generateTasks', 'analyzePRD'],
      'SpecialistAgent': ['executeTask', 'performTask']
    };
    
    const agentApprovals = approvalGates[this.agent.constructor.name] || [];
    return agentApprovals.includes(methodName);
  }

  /**
   * Sanitize arguments for checkpointing (remove sensitive data)
   */
  sanitizeArgs(args) {
    return args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        // Remove potentially sensitive fields
        const sanitized = { ...arg };
        delete sanitized.password;
        delete sanitized.apiKey;
        delete sanitized.secret;
        delete sanitized.token;
        return sanitized;
      }
      return arg;
    });
  }

  /**
   * Sanitize results for checkpointing
   */
  sanitizeResult(result) {
    if (typeof result === 'object' && result !== null) {
      const sanitized = { ...result };
      // Keep only essential result data
      if (sanitized.data && typeof sanitized.data === 'string' && sanitized.data.length > 1000) {
        sanitized.data = sanitized.data.substring(0, 1000) + '... [truncated]';
      }
      return sanitized;
    }
    return result;
  }

  /**
   * Get execution statistics
   */
  getExecutionStats() {
    return {
      currentThread: this.currentThread?.threadId,
      executionState: this.executionState,
      lastCheckpoint: this.lastCheckpoint?.id,
      executionHistory: this.executionHistory.length,
      retryCount: this.retryCount,
      agentType: this.agent.constructor.name
    };
  }

  /**
   * Get the wrapped agent instance
   */
  getAgent() {
    return this.agent;
  }

  /**
   * Close thread and cleanup
   */
  async closeThread() {
    if (this.currentThread) {
      // Final checkpoint
      if (this.options.enableCheckpointing) {
        await this.saveExecutionCheckpoint('thread_closed', {
          finalState: this.executionState,
          executionHistory: this.executionHistory.length,
          timestamp: new Date().toISOString()
        });
      }
      
      this.emit('thread:closed', this.currentThread);
      
      console.log(`🏁 Closed thread: ${this.currentThread.threadId}`);
      this.currentThread = null;
    }
    
    this.executionState = 'idle';
    this.executionHistory = [];
    this.retryCount = 0;
  }
}

module.exports = LangGraphAgentWrapper;