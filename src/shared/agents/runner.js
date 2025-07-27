const SonnetAgent = require('./sonnet-agent');
const OpusAgent = require('./opus-agent');
const AgentPool = require('./agent-pool');

class AgentRunner {
  constructor() {
    this.agents = new Map();
    this.agentPool = new AgentPool();
    this.running = false;
    
    // Set up agent pool event listeners
    this.setupPoolEventListeners();
  }

  /**
   * Set up event listeners for agent pool coordination
   */
  setupPoolEventListeners() {
    this.agentPool.on('agent_spawned', (data) => {
      console.log(`🎯 Pool: Agent spawned - ${data.agentId} (${data.role})`);
    });

    this.agentPool.on('agent_status_change', (data) => {
      console.log(`🔄 Pool: ${data.agentId} status changed to ${data.status}`);
    });

    this.agentPool.on('agent_task_completed', (data) => {
      console.log(`✅ Pool: Task ${data.taskId} completed by ${data.agentId}`);
    });

    this.agentPool.on('agent_error', (data) => {
      console.error(`❌ Pool: Agent ${data.agentId} error - ${data.error}`);
    });
  }

  async start() {
    console.log('🚀 Starting Trilogy AI Agent System...');
    
    try {
      // Initialize agents
      const sonnetAgent = new SonnetAgent();
      const opusAgent = new OpusAgent();
      
      // Connect agents to server
      await sonnetAgent.connect();
      await opusAgent.connect();
      
      this.agents.set('sonnet', sonnetAgent);
      this.agents.set('opus', opusAgent);
      
      // Attach this runner to the server for API access via HTTP
      try {
        // Wait a moment for server to be ready, then register via API
        setTimeout(async () => {
          try {
            // Instead of requiring the server module, use HTTP to register
            const http = require('http');
            const data = JSON.stringify({ 
              runner: 'attached',
              agents: ['sonnet', 'opus'],
              poolReady: true 
            });

            const options = {
              hostname: 'localhost',
              port: 8080,
              path: '/agents/runner/attach',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
              }
            };

            const req = http.request(options, (res) => {
              if (res.statusCode === 200) {
                console.log('🔗 Agent runner attached to server API');
                // Also try direct attachment via bridge
                try {
                  const runnerBridge = require('../runner-bridge');
                  runnerBridge.attachRunner(this);
                } catch (e) {
                  // Bridge not available, that's ok
                }
              } else {
                console.log('⚠️ Failed to attach runner to server');
              }
            });

            req.on('error', (error) => {
              console.log('⚠️ Could not attach to server:', error.message);
            });

            req.write(data);
            req.end();
          } catch (error) {
            console.log('⚠️ Could not attach to server:', error.message);
          }
        }, 2000);
      } catch (error) {
        console.log('⚠️ Could not attach to server (server may not be running)');
      }
      
      this.running = true;
      console.log('✅ All agents connected and running');
      console.log('🏊 Agent pool ready for specialist spawning');
      
      // Set up graceful shutdown
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());
      
    } catch (error) {
      console.error('❌ Failed to start agents:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    if (!this.running) return;
    
    console.log('🔄 Shutting down agents...');
    this.running = false;
    
    // Shutdown core agents
    const shutdownPromises = Array.from(this.agents.values()).map(agent => 
      agent.shutdown()
    );
    
    // Shutdown agent pool
    await this.agentPool.shutdown();
    
    await Promise.all(shutdownPromises);
    console.log('✅ All agents shut down successfully');
    process.exit(0);
  }

  getAgent(name) {
    return this.agents.get(name);
  }

  /**
   * Get the agent pool instance
   */
  getAgentPool() {
    return this.agentPool;
  }

  /**
   * Spawn a specialist agent in the pool
   */
  async spawnSpecialistAgent(role, capabilities = []) {
    return await this.agentPool.spawnAgent(role, capabilities);
  }

  /**
   * Get all agent pool statistics
   */
  getPoolStats() {
    return this.agentPool.getPoolStats();
  }

  /**
   * Enhanced workflow with multi-agent coordination
   */
  async triggerMultiAgentWorkflow(prdContent) {
    console.log('🔄 Triggering Multi-Agent Workflow...');
    
    try {
      // Step 1: Team Lead (Opus) analyzes PRD and determines specialist needs
      const opus = this.getAgent('opus');
      const teamPlan = await opus.process({
        type: 'analyze_prd_for_agents',
        prd: prdContent
      });

      if (!teamPlan.success) {
        throw new Error('Team planning failed: ' + teamPlan.error);
      }

      console.log(`📋 Team plan created: ${teamPlan.agentRequirements.length} specialist roles needed`);

      // Step 2: Spawn required specialist agents
      const spawnedAgents = [];
      for (const requirement of teamPlan.agentRequirements) {
        const agentId = await this.agentPool.spawnAgent(
          requirement.role, 
          requirement.capabilities,
          requirement.config
        );
        spawnedAgents.push(agentId);
        console.log(`🤖 Spawned ${requirement.role}: ${agentId}`);
      }

      // Step 3: Sonnet generates detailed task breakdown
      const sonnet = this.getAgent('sonnet');
      const taskBreakdown = await sonnet.process({
        type: 'detailed_task_breakdown',
        prd: prdContent,
        availableAgents: spawnedAgents.map(id => ({
          agentId: id,
          status: this.agentPool.getAgentStatus(id)
        }))
      });

      if (!taskBreakdown.success) {
        throw new Error('Task breakdown failed: ' + taskBreakdown.error);
      }

      // Step 4: Team Lead assigns tasks to agents
      const taskAssignments = await opus.process({
        type: 'assign_tasks_to_agents',
        tasks: taskBreakdown.tasks,
        agents: spawnedAgents.map(id => this.agentPool.getAgentStatus(id))
      });

      if (!taskAssignments.success) {
        throw new Error('Task assignment failed: ' + taskAssignments.error);
      }

      console.log(`✅ Multi-agent workflow setup complete:`);
      console.log(`   - ${spawnedAgents.length} specialist agents spawned`);
      console.log(`   - ${taskBreakdown.tasks.length} tasks generated`);
      console.log(`   - ${taskAssignments.assignments.length} assignments made`);

      return {
        success: true,
        spawnedAgents,
        taskBreakdown: taskBreakdown.tasks,
        assignments: taskAssignments.assignments,
        teamPlan: teamPlan.agentRequirements,
        message: 'Multi-agent workflow initialized successfully'
      };

    } catch (error) {
      console.error('❌ Multi-agent workflow failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async triggerWorkflow(prdContent) {
    console.log('🔄 Triggering Sonnet → Opus workflow...');
    
    try {
      // Step 1: Sonnet analyzes PRD
      const sonnet = this.getAgent('sonnet');
      const analysis = await sonnet.process({
        type: 'analyze_prd',
        prd: prdContent
      });
      
      if (!analysis.success) {
        throw new Error('Sonnet analysis failed: ' + analysis.error);
      }
      
      // Step 2: Sonnet generates tasks
      const taskBreakdown = await sonnet.process({
        type: 'breakdown_tasks',
        requirements: [
          'memory', 'agents', 'VS Code', 'Chrome', 
          'shared state', 'browser automation'
        ]
      });
      
      if (!taskBreakdown.success) {
        throw new Error('Task breakdown failed: ' + taskBreakdown.error);
      }
      
      // Step 3: Opus reviews and finalizes
      const opus = this.getAgent('opus');
      const finalDecision = await opus.process({
        type: 'finalize_tasks',
        tasks: taskBreakdown.taskBreakdown.tasks
      });
      
      if (!finalDecision.success) {
        throw new Error('Opus finalization failed: ' + finalDecision.error);
      }
      
      console.log('✅ Workflow completed successfully');
      return {
        success: true,
        analysis: analysis.analysis,
        taskBreakdown: taskBreakdown.taskBreakdown,
        finalDecision: finalDecision.finalOutput,
        message: 'Sonnet → Opus workflow completed'
      };
      
    } catch (error) {
      console.error('❌ Workflow failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// CLI interface
async function main() {
  const runner = new AgentRunner();
  
  if (process.argv.includes('--workflow')) {
    // Run the full workflow
    await runner.start();
    
    // Wait a moment for connections to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Read PRD and trigger workflow
    const fs = require('fs');
    const path = require('path');
    const prdPath = path.join(__dirname, '../../../docs/design/trilogy_prd.md');
    
    if (fs.existsSync(prdPath)) {
      const prdContent = fs.readFileSync(prdPath, 'utf8');
      
      // Choose workflow type based on arguments
      const useMultiAgent = process.argv.includes('--multi-agent');
      const result = useMultiAgent 
        ? await runner.triggerMultiAgentWorkflow(prdContent)
        : await runner.triggerWorkflow(prdContent);
      
      if (result.success) {
        console.log('🎉 Workflow Results:');
        
        if (useMultiAgent) {
          console.log(`🤖 Specialist Agents: ${result.spawnedAgents.length}`);
          console.log(`📋 Tasks Generated: ${result.taskBreakdown.length}`);
          console.log(`🎯 Assignments Made: ${result.assignments.length}`);
          console.log(`👥 Team Roles: ${result.teamPlan.map(p => p.role).join(', ')}`);
        } else {
          console.log(`📊 Analysis: ${result.analysis.overview}`);
          console.log(`📋 Tasks Generated: ${result.taskBreakdown.totalTasks}`);
          console.log(`✅ Tasks Approved: ${result.finalDecision.approved.length}`);
          console.log(`❌ Tasks Rejected: ${result.finalDecision.rejected.length}`);
          console.log(`🔧 Tasks Modified: ${result.finalDecision.modified.length}`);
        }
      } else {
        console.error('❌ Workflow failed:', result.error);
      }
    } else {
      console.error('❌ PRD file not found:', prdPath);
    }
    
  } else {
    // Just start agents
    await runner.start();
    console.log('💡 Agents running. Available options:');
    console.log('   --workflow                Run traditional Sonnet → Opus workflow');
    console.log('   --workflow --multi-agent  Run new multi-agent coordination workflow');
    
    // Keep process alive indefinitely
    console.log('🔄 Keeping agents alive...');
    setInterval(() => {
      if (runner.running) {
        console.log(`💓 Agents alive - Pool size: ${runner.getPoolStats().totalAgents}`);
      }
    }, 30000); // Heartbeat every 30 seconds
    
    // Prevent process exit
    process.stdin.resume();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = AgentRunner;