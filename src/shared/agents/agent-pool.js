/**
 * Agent Pool Manager
 * Handles dynamic spawning, coordination, and lifecycle management of specialist agents
 */

const EventEmitter = require('events');

class AgentPool extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map(); // agentId -> Agent instance
    this.agentStatus = new Map(); // agentId -> status info
    this.capabilities = new Map(); // agentId -> capabilities array
    this.taskQueues = new Map(); // agentId -> Task[]
    this.nextAgentId = 1;
  }

  /**
   * Spawn a new specialist agent with specific role and capabilities
   */
  async spawnAgent(role, capabilities = [], config = {}) {
    const agentId = `agent-${this.nextAgentId++}`;

    try {
      // Dynamic import of specialist agent
      const SpecialistAgent = require('./specialist-agent');

      const agent = new SpecialistAgent(agentId, {
        role,
        capabilities,
        ...config
      });

      // Initialize agent connection
      await agent.connect();

      // Store in pool
      this.agents.set(agentId, agent);
      this.agentStatus.set(agentId, {
        id: agentId,
        role,
        status: 'idle',
        capabilities,
        spawnedAt: new Date().toISOString(),
        tasksCompleted: 0,
        currentTask: null
      });
      this.capabilities.set(agentId, capabilities);
      this.taskQueues.set(agentId, []);

      // Set up agent event listeners
      this.setupAgentListeners(agent, agentId);

      console.log(`✅ Agent spawned: ${agentId} (${role})`);
      this.emit('agent_spawned', { agentId, role, capabilities });

      return agentId;
    } catch (error) {
      console.error(`❌ Failed to spawn agent: ${error.message}`);
      throw new Error(`Agent spawn failed: ${error.message}`);
    }
  }

  /**
   * Set up event listeners for agent communication
   */
  setupAgentListeners(agent, agentId) {
    agent.on('status_change', (status) => {
      this.updateAgentStatus(agentId, { status });
      this.emit('agent_status_change', { agentId, status });
    });

    agent.on('task_started', (taskId) => {
      this.updateAgentStatus(agentId, {
        status: 'working',
        currentTask: taskId
      });
      this.emit('agent_task_started', { agentId, taskId });
    });

    agent.on('task_completed', (taskId, result) => {
      const currentStatus = this.agentStatus.get(agentId);
      this.updateAgentStatus(agentId, {
        status: 'idle',
        currentTask: null,
        tasksCompleted: (currentStatus.tasksCompleted || 0) + 1
      });
      this.emit('agent_task_completed', { agentId, taskId, result });
    });

    agent.on('error', (error) => {
      this.updateAgentStatus(agentId, { status: 'error' });
      this.emit('agent_error', { agentId, error: error.message });
    });

    agent.on('disconnected', () => {
      this.updateAgentStatus(agentId, { status: 'disconnected' });
      this.emit('agent_disconnected', { agentId });
    });
  }

  /**
   * Update agent status information
   */
  updateAgentStatus(agentId, updates) {
    if (this.agentStatus.has(agentId)) {
      const current = this.agentStatus.get(agentId);
      this.agentStatus.set(agentId, { ...current, ...updates });
    }
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  /**
   * Get all active agents
   */
  getAllAgents() {
    return Array.from(this.agents.entries()).map(([id, agent]) => ({
      id,
      agent,
      status: this.agentStatus.get(id)
    }));
  }

  /**
   * Get agent status information
   */
  getAgentStatus(agentId) {
    return this.agentStatus.get(agentId);
  }

  /**
   * Get all agent statuses
   */
  getAllAgentStatuses() {
    return Array.from(this.agentStatus.values());
  }

  /**
   * Find agents by capability
   */
  findAgentsByCapability(capability) {
    const matchingAgents = [];

    for (const [agentId, capabilities] of this.capabilities.entries()) {
      if (capabilities.includes(capability)) {
        matchingAgents.push({
          agentId,
          agent: this.agents.get(agentId),
          status: this.agentStatus.get(agentId)
        });
      }
    }

    return matchingAgents;
  }

  /**
   * Find best agent for a task based on capabilities and availability
   */
  findBestAgentForTask(requiredCapabilities = [], preferredRole = null) {
    let bestAgent = null;
    let bestScore = -1;

    for (const [agentId, agent] of this.agents.entries()) {
      const status = this.agentStatus.get(agentId);
      const capabilities = this.capabilities.get(agentId);

      // Skip if agent is not available
      if (status.status !== 'idle') continue;

      // Calculate capability match score
      let score = 0;

      // Points for matching capabilities
      for (const required of requiredCapabilities) {
        if (capabilities.includes(required)) {
          score += 10;
        }
      }

      // Bonus points for preferred role match
      if (preferredRole && status.role === preferredRole) {
        score += 5;
      }

      // Penalty for overloaded agents (too many completed tasks)
      score -= Math.floor(status.tasksCompleted / 5);

      if (score > bestScore) {
        bestScore = score;
        bestAgent = { agentId, agent, status, score };
      }
    }

    return bestAgent;
  }

  /**
   * Assign task to specific agent
   */
  async assignTask(agentId, task) {
    const agent = this.agents.get(agentId);

    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const status = this.agentStatus.get(agentId);
    if (status.status !== 'idle') {
      throw new Error(`Agent ${agentId} is not available (status: ${status.status})`);
    }

    // Add to task queue
    const queue = this.taskQueues.get(agentId);
    queue.push(task);

    // Start processing if this is the only task
    if (queue.length === 1) {
      await this.processNextTask(agentId);
    }

    return task.id;
  }

  /**
   * Process next task in agent's queue
   */
  async processNextTask(agentId) {
    const agent = this.agents.get(agentId);
    const queue = this.taskQueues.get(agentId);

    if (!agent || queue.length === 0) return;

    const task = queue[0]; // Process first task

    try {
      await agent.processTask(task);

      // Remove completed task from queue
      queue.shift();

      // Process next task if available
      if (queue.length > 0) {
        setTimeout(() => this.processNextTask(agentId), 100);
      }
    } catch (error) {
      console.error(`❌ Task processing failed for ${agentId}:`, error.message);
      this.emit('agent_task_failed', { agentId, taskId: task.id, error: error.message });
    }
  }

  /**
   * Remove agent from pool
   */
  async removeAgent(agentId) {
    const agent = this.agents.get(agentId);

    if (agent) {
      try {
        // Only call disconnect if the agent has this method (specialist agents)
        if (typeof agent.disconnect === 'function') {
          await agent.disconnect();
        } else {
          // For main agents (sonnet/opus), call shutdown instead
          if (typeof agent.shutdown === 'function') {
            await agent.shutdown();
          }
        }
      } catch (error) {
        console.error(`Error disconnecting agent ${agentId}:`, error.message);
      }

      this.agents.delete(agentId);
      this.agentStatus.delete(agentId);
      this.capabilities.delete(agentId);
      this.taskQueues.delete(agentId);

      console.log(`🗑️ Agent removed: ${agentId}`);
      this.emit('agent_removed', { agentId });
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    const statuses = Array.from(this.agentStatus.values());

    return {
      totalAgents: this.agents.size,
      activeAgents: statuses.filter(s => s.status === 'working').length,
      idleAgents: statuses.filter(s => s.status === 'idle').length,
      errorAgents: statuses.filter(s => s.status === 'error').length,
      totalTasksCompleted: statuses.reduce((sum, s) => sum + (s.tasksCompleted || 0), 0),
      capabilities: Array.from(new Set(
        Array.from(this.capabilities.values()).flat()
      )).sort()
    };
  }

  /**
   * Shutdown all agents gracefully
   */
  async shutdown() {
    console.log('🔄 Shutting down agent pool...');

    const shutdownPromises = Array.from(this.agents.keys()).map(agentId =>
      this.removeAgent(agentId)
    );

    await Promise.all(shutdownPromises);

    console.log('✅ Agent pool shutdown complete');
    this.emit('pool_shutdown');
  }
}

module.exports = AgentPool;
