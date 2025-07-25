const SonnetAgent = require('./sonnet-agent');
const OpusAgent = require('./opus-agent');

class AgentRunner {
  constructor() {
    this.agents = new Map();
    this.running = false;
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
      
      this.running = true;
      console.log('✅ All agents connected and running');
      
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
    
    const shutdownPromises = Array.from(this.agents.values()).map(agent => 
      agent.shutdown()
    );
    
    await Promise.all(shutdownPromises);
    console.log('✅ All agents shut down successfully');
    process.exit(0);
  }

  getAgent(name) {
    return this.agents.get(name);
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
    const prdPath = path.join(__dirname, '../trilogy_prd.md');
    
    if (fs.existsSync(prdPath)) {
      const prdContent = fs.readFileSync(prdPath, 'utf8');
      const result = await runner.triggerWorkflow(prdContent);
      
      if (result.success) {
        console.log('🎉 Workflow Results:');
        console.log(`📊 Analysis: ${result.analysis.overview}`);
        console.log(`📋 Tasks Generated: ${result.taskBreakdown.totalTasks}`);
        console.log(`✅ Tasks Approved: ${result.finalDecision.approved.length}`);
        console.log(`❌ Tasks Rejected: ${result.finalDecision.rejected.length}`);
        console.log(`🔧 Tasks Modified: ${result.finalDecision.modified.length}`);
      } else {
        console.error('❌ Workflow failed:', result.error);
      }
    } else {
      console.error('❌ PRD file not found:', prdPath);
    }
    
  } else {
    // Just start agents
    await runner.start();
    console.log('💡 Agents running. Use --workflow flag to trigger automated workflow.');
    
    // Keep process alive
    const keepAlive = () => {
      if (runner.running) {
        setTimeout(keepAlive, 5000);
      }
    };
    keepAlive();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = AgentRunner;