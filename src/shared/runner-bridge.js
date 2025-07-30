/**
 * Runner Bridge - Manages communication between server and agent runner processes
 */

class RunnerBridge {
  constructor() {
    this.runnerStatus = {
      attached: false,
      agents: [],
      poolStats: { totalAgents: 0, activeAgents: 0, idleAgents: 0 },
      agentPool: null
    };
  }

  attachRunner(runner) {
    this.runnerStatus.attached = true;
    this.runnerStatus.agentPool = runner;
    console.log('🔗 Runner bridge: Agent runner attached');
  }

  detachRunner() {
    this.runnerStatus.attached = false;
    this.runnerStatus.agentPool = null;
    console.log('🔌 Runner bridge: Agent runner detached');
  }

  isRunnerAttached() {
    return this.runnerStatus.attached && this.runnerStatus.agentPool !== null;
  }

  getRunner() {
    return this.runnerStatus.agentPool;
  }

  getPoolStats() {
    if (this.isRunnerAttached()) {
      return this.runnerStatus.agentPool.getPoolStats();
    }
    return { totalAgents: 0, activeAgents: 0, idleAgents: 0 };
  }

  getAllAgentStatuses() {
    if (this.isRunnerAttached()) {
      return this.runnerStatus.agentPool.getAgentPool().getAllAgentStatuses();
    }
    return [];
  }

  async spawnAgent(role, capabilities, config) {
    if (this.isRunnerAttached()) {
      return await this.runnerStatus.agentPool.spawnSpecialistAgent(role, capabilities);
    }
    throw new Error('Agent runner not attached');
  }
}

// Global singleton
const runnerBridge = new RunnerBridge();

module.exports = runnerBridge;
