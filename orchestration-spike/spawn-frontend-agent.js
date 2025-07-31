#!/usr/bin/env node

/**
 * Spawn OpenAI GPT-4 Agent for Frontend Development
 * This script initializes and coordinates the frontend development task
 */

const path = require('path');
const fs = require('fs').promises;
const MultiProviderAgent = require('../src/shared/agents/multi-provider-agent');

async function spawnFrontendAgent() {
  console.log('🚀 SPAWNING OPENAI GPT-4 FRONTEND AGENT');
  console.log('=====================================');

  // Initialize OpenAI GPT-4 agent for frontend tasks
  const frontendAgent = new MultiProviderAgent('frontend-agent-001', {
    role: 'frontend-specialist',
    provider: 'openai',
    model: 'gpt-4',
    capabilities: ['html', 'css', 'javascript', 'responsive-design', 'ui-testing']
  });

  try {
    // Connect agent
    console.log('🔌 Connecting to OpenAI GPT-4...');
    await frontendAgent.connect();

    // Load frontend task assignment
    const taskAssignmentPath = path.join(__dirname, 'task-assignments/openai-frontend-tasks.md');
    const taskAssignment = await fs.readFile(taskAssignmentPath, 'utf8');

    // Create frontend development tasks
    const frontendTasks = [
      {
        id: 'frontend-html-structure',
        type: 'html-development',
        title: 'Create HTML Structure',
        description: 'Create semantic HTML5 structure for todo list application',
        requirements: [
          'Clean, accessible HTML5 structure',
          'Semantic elements (header, main, section, etc.)',
          'Form for adding new todos',
          'Container for displaying todo list',
          'Responsive meta tags and proper document structure'
        ],
        context: 'Frontend development for todo list web application',
        deliverable: 'index.html',
        priority: 'high'
      },
      {
        id: 'frontend-css-styling',
        type: 'css-development',
        title: 'Create CSS Styling',
        description: 'Create modern, responsive CSS for todo application',
        requirements: [
          'Clean, modern visual design',
          'Responsive layout (mobile-first approach)',
          'Visual states for completed/incomplete todos',
          'Smooth transitions and hover effects',
          'Consistent color scheme and typography'
        ],
        context: 'Responsive styling for todo list interface',
        deliverable: 'styles.css',
        priority: 'high'
      },
      {
        id: 'frontend-javascript-functionality',
        type: 'javascript-development',
        title: 'Implement JavaScript Functionality',
        description: 'Implement todo list functionality with vanilla JavaScript',
        requirements: [
          'Add new todo items via form submission',
          'Display all todos in a list format',
          'Toggle todo completion status (complete/incomplete)',
          'Delete individual todo items',
          'Persist data via API calls to backend',
          'Handle loading states and basic error scenarios'
        ],
        context: 'Frontend logic for todo CRUD operations',
        deliverable: 'app.js',
        priority: 'high'
      },
      {
        id: 'frontend-testing',
        type: 'testing-development',
        title: 'Create Frontend Tests',
        description: 'Create unit tests for frontend functionality',
        requirements: [
          'Test form submission and input validation',
          'Test todo display and interaction functions',
          'Test API communication functions',
          'Test error handling scenarios',
          'Use vanilla JavaScript testing (no frameworks)'
        ],
        context: 'Quality assurance for frontend components',
        deliverable: 'frontend-tests.js',
        priority: 'medium'
      }
    ];

    console.log(`📋 Created ${frontendTasks.length} frontend development tasks`);

    // Process each task sequentially
    const results = [];
    let totalCost = 0;
    let totalTokens = 0;

    for (const task of frontendTasks) {
      console.log(`\n🎯 PROCESSING: ${task.title}`);
      console.log(`📝 ${task.description}`);
      
      const startTime = Date.now();
      
      try {
        const result = await frontendAgent.processTask(task);
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Update session totals
        totalCost += result.usage?.cost || 0;
        totalTokens += (result.usage?.inputTokens || 0) + (result.usage?.outputTokens || 0);

        const taskResult = {
          taskId: task.id,
          title: task.title,
          status: 'completed',
          duration: duration,
          provider: result.provider,
          model: result.model,
          tokens: {
            input: result.usage?.inputTokens || 0,
            output: result.usage?.outputTokens || 0,
            total: (result.usage?.inputTokens || 0) + (result.usage?.outputTokens || 0)
          },
          cost: result.usage?.cost || 0,
          deliverable: task.deliverable,
          content: result.content,
          timestamp: new Date().toISOString()
        };

        results.push(taskResult);

        // Save deliverable to frontend folder
        await saveDeliverable(task.deliverable, result.content);

        console.log(`✅ COMPLETED: ${task.title}`);
        console.log(`💰 Cost: $${(result.usage?.cost || 0).toFixed(4)}`);
        console.log(`🪙 Tokens: ${(result.usage?.inputTokens || 0) + (result.usage?.outputTokens || 0)}`);
        console.log(`⏱️ Duration: ${duration}ms`);

      } catch (error) {
        console.error(`❌ FAILED: ${task.title} - ${error.message}`);
        
        const taskResult = {
          taskId: task.id,
          title: task.title,
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        
        results.push(taskResult);
        
        // Continue with next task (don't halt entire process)
      }
    }

    // Generate session report
    const sessionReport = {
      agentId: frontendAgent.agentId,
      role: frontendAgent.role,
      provider: frontendAgent.provider,
      model: frontendAgent.model,
      sessionStart: new Date().toISOString(),
      tasks: results,
      summary: {
        totalTasks: frontendTasks.length,
        completedTasks: results.filter(r => r.status === 'completed').length,
        failedTasks: results.filter(r => r.status === 'failed').length,
        totalCost: totalCost,
        totalTokens: totalTokens,
        averageCostPerTask: totalCost / frontendTasks.length,
        averageTokensPerTask: totalTokens / frontendTasks.length
      },
      performanceStats: frontendAgent.getPerformanceStats()
    };

    // Save session report
    const reportsPath = path.join(__dirname, 'session-history');
    await fs.mkdir(reportsPath, { recursive: true });
    const reportPath = path.join(reportsPath, 'frontend-agent-report.json');
    await fs.writeFile(reportPath, JSON.stringify(sessionReport, null, 2));

    console.log('\n🎉 FRONTEND AGENT SESSION COMPLETED');
    console.log('====================================');
    console.log(`✅ Completed Tasks: ${sessionReport.summary.completedTasks}/${sessionReport.summary.totalTasks}`);
    console.log(`💰 Total Cost: $${sessionReport.summary.totalCost.toFixed(4)}`);
    console.log(`🪙 Total Tokens: ${sessionReport.summary.totalTokens}`);
    console.log(`📊 Success Rate: ${((sessionReport.summary.completedTasks / sessionReport.summary.totalTasks) * 100).toFixed(1)}%`);

    // Update orchestration session log
    await updateOrchestrationLog('frontend-completed', sessionReport.summary);

    return sessionReport;

  } catch (error) {
    console.error('❌ Frontend agent session failed:', error.message);
    await updateOrchestrationLog('frontend-failed', { error: error.message });
    throw error;
  } finally {
    await frontendAgent.disconnect();
  }
}

async function saveDeliverable(filename, content) {
  try {
    const frontendPath = path.join(__dirname, 'target-app/openai-frontend');
    await fs.mkdir(frontendPath, { recursive: true });
    
    const filePath = path.join(frontendPath, filename);
    await fs.writeFile(filePath, content);
    
    console.log(`💾 Saved: ${filename} (${content.length} characters)`);
  } catch (error) {
    console.error(`Failed to save ${filename}:`, error.message);
  }
}

async function updateOrchestrationLog(status, data) {
  try {
    const logPath = path.join(__dirname, 'session-history/orchestration-session.md');
    const timestamp = new Date().toISOString().substring(11, 19);
    
    let updateContent = '';
    
    if (status === 'frontend-completed') {
      updateContent = `
### [${timestamp}] Frontend Development COMPLETED ✅
- **Tasks Completed**: ${data.completedTasks}/${data.totalTasks}
- **Total Cost**: $${data.totalCost.toFixed(4)}
- **Total Tokens**: ${data.totalTokens}
- **Success Rate**: ${((data.completedTasks / data.totalTasks) * 100).toFixed(1)}%
- **Status**: ✅ **FRONTEND READY FOR INTEGRATION**

### OpenAI GPT-4 Performance Metrics
- **Cost Efficiency**: $${data.averageCostPerTask.toFixed(4)} per task
- **Token Efficiency**: ${Math.round(data.averageTokensPerTask)} tokens per task
- **Deliverables Created**: index.html, styles.css, app.js, frontend-tests.js

`;
    } else if (status === 'frontend-failed') {
      updateContent = `
### [${timestamp}] Frontend Development FAILED ❌
- **Error**: ${data.error}
- **Status**: ❌ **ESCALATION REQUIRED**

`;
    }

    const currentLog = await fs.readFile(logPath, 'utf8');
    const updatedLog = currentLog.replace(
      '---\n\n**Live Session Status**: 🔥 **EXECUTION IN PROGRESS** 🔥',
      `${updateContent}\n---\n\n**Live Session Status**: 🔥 **EXECUTION IN PROGRESS** 🔥`
    );

    // Update agent status
    const statusUpdate = status === 'frontend-completed' 
      ? '- **OpenAI GPT-4**: ✅ **COMPLETED** - Frontend development finished'
      : '- **OpenAI GPT-4**: ❌ **FAILED** - Escalation required';

    const finalLog = updatedLog.replace(
      '- **OpenAI GPT-4**: 🔄 **ACTIVE** - Working on frontend tasks',
      statusUpdate
    );

    await fs.writeFile(logPath, finalLog);
    
  } catch (error) {
    console.error('Failed to update orchestration log:', error.message);
  }
}

// Execute if called directly
if (require.main === module) {
  spawnFrontendAgent()
    .then(report => {
      console.log('\n📊 SESSION REPORT SAVED');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 SESSION FAILED:', error.message);
      process.exit(1);
    });
}

module.exports = { spawnFrontendAgent };