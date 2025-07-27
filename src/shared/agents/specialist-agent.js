/**
 * Specialist Agent - Base class for dynamically spawned specialist agents
 * Extends BaseAgent with specialized capabilities and task processing
 */

const BaseAgent = require('./base-agent');

class SpecialistAgent extends BaseAgent {
  constructor(agentId, config = {}) {
    super(agentId);
    
    this.role = config.role || 'specialist';
    this.capabilities = config.capabilities || [];
    this.specialization = config.specialization || {};
    this.maxConcurrentTasks = config.maxConcurrentTasks || 1;
    
    // Task processing state
    this.currentTasks = new Map();
    this.taskHistory = [];
    this.performanceMetrics = {
      tasksCompleted: 0,
      averageTaskTime: 0,
      successRate: 1.0,
      lastActiveTime: Date.now()
    };
    
    console.log(`🤖 Specialist Agent initialized: ${agentId} (${this.role})`);
  }

  /**
   * Enhanced connection with specialist capabilities
   */
  async connect() {
    await super.connect();
    
    // Register specialist capabilities with the system
    await this.registerCapabilities();
    
    // Set up specialized processing patterns
    this.setupSpecialistProcessing();
    
    this.emit('status_change', 'ready');
  }

  /**
   * Register this agent's capabilities with the memory system
   */
  async registerCapabilities() {
    try {
      const capabilityInfo = {
        agentId: this.agentId,
        role: this.role,
        capabilities: this.capabilities,
        specialization: this.specialization,
        registeredAt: new Date().toISOString()
      };

      await this.writeMemory('agents', `${this.agentId}_capabilities`, capabilityInfo);
      console.log(`📋 Capabilities registered for ${this.agentId}`);
    } catch (error) {
      console.error(`Failed to register capabilities for ${this.agentId}:`, error.message);
    }
  }

  /**
   * Set up specialized processing patterns based on role
   */
  setupSpecialistProcessing() {
    // Define role-specific processing templates
    this.processingTemplates = {
      'frontend-specialist': {
        taskTypes: ['ui-component', 'styling', 'user-interaction', 'responsive-design'],
        tools: ['react', 'css', 'javascript', 'testing-library'],
        outputFormat: 'code-with-preview'
      },
      'backend-specialist': {
        taskTypes: ['api-endpoint', 'database-schema', 'business-logic', 'integration'],
        tools: ['node.js', 'database', 'api-design', 'testing'],
        outputFormat: 'code-with-tests'
      },
      'fullstack-specialist': {
        taskTypes: ['feature-complete', 'integration', 'end-to-end'],
        tools: ['frontend', 'backend', 'database', 'deployment'],
        outputFormat: 'complete-implementation'
      },
      'qa-specialist': {
        taskTypes: ['test-creation', 'quality-review', 'bug-detection', 'performance-test'],
        tools: ['testing-frameworks', 'code-analysis', 'performance-tools'],
        outputFormat: 'test-report'
      },
      'devops-specialist': {
        taskTypes: ['deployment', 'infrastructure', 'monitoring', 'security'],
        tools: ['docker', 'ci-cd', 'monitoring', 'security-tools'],
        outputFormat: 'infrastructure-code'
      }
    };

    // Set processing template based on role
    this.currentTemplate = this.processingTemplates[this.role] || {
      taskTypes: ['general'],
      tools: ['analysis'],
      outputFormat: 'structured-response'
    };
  }

  /**
   * Process a task with specialist knowledge
   */
  async processTask(task) {
    const startTime = Date.now();
    
    try {
      this.emit('task_started', task.id);
      this.currentTasks.set(task.id, { ...task, startTime });
      
      console.log(`🔄 ${this.agentId} processing task: ${task.id} (${task.type || 'unknown'})`);
      
      // Validate task compatibility with capabilities
      await this.validateTaskCompatibility(task);
      
      // Execute specialist processing
      const result = await this.executeSpecialistTask(task);
      
      // Record task completion
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.updatePerformanceMetrics(duration, true);
      this.currentTasks.delete(task.id);
      this.taskHistory.push({
        taskId: task.id,
        duration,
        success: true,
        completedAt: new Date().toISOString()
      });
      
      console.log(`✅ ${this.agentId} completed task: ${task.id} (${duration}ms)`);
      this.emit('task_completed', task.id, result);
      
      return result;
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.updatePerformanceMetrics(duration, false);
      this.currentTasks.delete(task.id);
      
      console.error(`❌ ${this.agentId} failed task: ${task.id} - ${error.message}`);
      this.emit('task_failed', task.id, error.message);
      
      throw error;
    }
  }

  /**
   * Validate that this agent can handle the given task
   */
  async validateTaskCompatibility(task) {
    const requiredCapabilities = task.requiredCapabilities || [];
    const taskType = task.type || 'general';
    
    // Check if agent has required capabilities
    for (const required of requiredCapabilities) {
      if (!this.capabilities.includes(required)) {
        throw new Error(`Agent ${this.agentId} lacks required capability: ${required}`);
      }
    }
    
    // Check if task type is supported
    const supportedTypes = this.currentTemplate.taskTypes;
    if (!supportedTypes.includes('general') && !supportedTypes.includes(taskType)) {
      console.warn(`⚠️ Task type '${taskType}' not optimal for ${this.role}, but proceeding`);
    }
    
    return true;
  }

  /**
   * Execute specialist task processing with AI integration
   */
  async executeSpecialistTask(task) {
    const processingStrategy = this.determineProcessingStrategy(task);
    
    // Try AI processing first, fall back to simulation
    try {
      return await this.processWithAI(task, processingStrategy);
    } catch (error) {
      console.log(`⚠️ AI processing failed for ${this.agentId}, using simulation:`, error.message);
      return await this.processWithSimulation(task, processingStrategy);
    }
  }

  /**
   * Process task using AI (Claude API)
   */
  async processWithAI(task, strategy) {
    // This would integrate with Claude API
    // For now, we'll use a simplified approach with system prompts
    
    const systemPrompt = this.buildSystemPrompt(strategy);
    const userPrompt = this.buildTaskPrompt(task);
    
    // TODO: Integrate with actual Claude API
    // const response = await this.callClaudeAPI(systemPrompt, userPrompt);
    
    // For now, return enhanced simulation with AI-like structure
    return await this.processWithSimulation(task, strategy);
  }

  /**
   * Build system prompt based on agent role and strategy
   */
  buildSystemPrompt(strategy) {
    const rolePrompts = {
      'frontend-specialist': 'You are a frontend specialist expert in React, CSS, and modern web development.',
      'backend-specialist': 'You are a backend specialist expert in Node.js, APIs, and database design.',
      'qa-specialist': 'You are a QA specialist expert in testing frameworks and quality assurance.',
      'devops-specialist': 'You are a DevOps specialist expert in deployment, infrastructure, and monitoring.',
      'fullstack-specialist': 'You are a fullstack specialist expert in end-to-end application development.'
    };
    
    const strategyPrompts = {
      'code-generation': 'Focus on generating clean, maintainable code with proper error handling.',
      'analysis-review': 'Provide thorough analysis with actionable recommendations.',
      'testing-validation': 'Create comprehensive test coverage with edge case handling.',
      'integration-setup': 'Design robust integrations with proper monitoring and fallbacks.'
    };
    
    return `${rolePrompts[this.role] || 'You are a specialist AI agent.'} ${strategyPrompts[strategy] || 'Complete the given task efficiently.'}`;
  }

  /**
   * Build task-specific prompt
   */
  buildTaskPrompt(task) {
    return `Task: ${task.description || task.title || 'Process the given task'}
    
Type: ${task.type || 'general'}
Requirements: ${task.requirements ? task.requirements.join(', ') : 'None specified'}
Context: ${task.context || 'No additional context'}

Please provide a detailed response including:
1. Approach and methodology
2. Implementation details
3. Potential challenges and solutions
4. Quality assurance considerations`;
  }

  /**
   * Process with simulation (fallback)
   */
  async processWithSimulation(task, strategy) {
    switch (strategy) {
      case 'code-generation':
        return await this.generateCode(task);
      
      case 'analysis-review':
        return await this.performAnalysis(task);
      
      case 'testing-validation':
        return await this.performTesting(task);
      
      case 'integration-setup':
        return await this.setupIntegration(task);
      
      default:
        return await this.performGeneralProcessing(task);
    }
  }

  /**
   * Determine processing strategy based on task and agent capabilities
   */
  determineProcessingStrategy(task) {
    const taskType = task.type || 'general';
    const role = this.role;
    
    if (role.includes('frontend') && ['ui-component', 'styling'].includes(taskType)) {
      return 'code-generation';
    }
    
    if (role.includes('backend') && ['api-endpoint', 'business-logic'].includes(taskType)) {
      return 'code-generation';
    }
    
    if (role.includes('qa') && ['test-creation', 'quality-review'].includes(taskType)) {
      return 'testing-validation';
    }
    
    if (role.includes('devops') && ['deployment', 'infrastructure'].includes(taskType)) {
      return 'integration-setup';
    }
    
    if (taskType === 'analysis' || task.description?.toLowerCase().includes('analyze')) {
      return 'analysis-review';
    }
    
    return 'general-processing';
  }

  /**
   * Generate code-based solutions
   */
  async generateCode(task) {
    // Simulate code generation with specialist knowledge
    await this.simulateProcessingTime(2000, 5000);
    
    const codeTemplate = this.getCodeTemplate(task.type);
    const generatedCode = this.customizeCodeForTask(codeTemplate, task);
    
    return {
      type: 'code-generation',
      taskId: task.id,
      deliverable: {
        code: generatedCode,
        files: this.generateFileStructure(task),
        tests: this.generateTests(task),
        documentation: this.generateDocumentation(task)
      },
      quality: this.assessCodeQuality(generatedCode),
      completedBy: this.agentId,
      completedAt: new Date().toISOString()
    };
  }

  /**
   * Perform analysis and review tasks
   */
  async performAnalysis(task) {
    await this.simulateProcessingTime(1500, 3000);
    
    return {
      type: 'analysis',
      taskId: task.id,
      deliverable: {
        findings: this.generateAnalysisFindings(task),
        recommendations: this.generateRecommendations(task),
        riskAssessment: this.assessRisks(task),
        nextSteps: this.suggestNextSteps(task)
      },
      confidence: 0.85,
      completedBy: this.agentId,
      completedAt: new Date().toISOString()
    };
  }

  /**
   * Perform testing and validation
   */
  async performTesting(task) {
    await this.simulateProcessingTime(1000, 4000);
    
    return {
      type: 'testing',
      taskId: task.id,
      deliverable: {
        testSuite: this.generateTestSuite(task),
        coverage: Math.random() * 20 + 80, // 80-100% coverage simulation
        results: this.generateTestResults(task),
        recommendations: this.generateTestingRecommendations(task)
      },
      passed: Math.random() > 0.1, // 90% pass rate simulation
      completedBy: this.agentId,
      completedAt: new Date().toISOString()
    };
  }

  /**
   * Setup integration tasks
   */
  async setupIntegration(task) {
    await this.simulateProcessingTime(3000, 7000);
    
    return {
      type: 'integration',
      taskId: task.id,
      deliverable: {
        configuration: this.generateConfiguration(task),
        deployment: this.generateDeploymentPlan(task),
        monitoring: this.setupMonitoring(task),
        security: this.applySecurityMeasures(task)
      },
      status: 'configured',
      completedBy: this.agentId,
      completedAt: new Date().toISOString()
    };
  }

  /**
   * Perform general processing for unspecialized tasks
   */
  async performGeneralProcessing(task) {
    await this.simulateProcessingTime(1000, 3000);
    
    return {
      type: 'general',
      taskId: task.id,
      deliverable: {
        output: `Processed task: ${task.description || task.id}`,
        approach: `Applied ${this.role} expertise to general task`,
        results: this.generateGeneralResults(task)
      },
      completedBy: this.agentId,
      completedAt: new Date().toISOString()
    };
  }

  // Helper methods for generating realistic outputs
  
  getCodeTemplate(taskType) {
    const templates = {
      'ui-component': 'export default function Component() { return <div>Generated Component</div>; }',
      'api-endpoint': 'app.get("/api/endpoint", (req, res) => { res.json({success: true}); });',
      'database-schema': 'CREATE TABLE generated_table (id SERIAL PRIMARY KEY, data JSONB);'
    };
    return templates[taskType] || '// Generated code for task';
  }

  customizeCodeForTask(template, task) {
    return template.replace(/Component/g, task.name || 'GeneratedComponent')
                  .replace(/endpoint/g, task.endpoint || 'generated')
                  .replace(/generated_table/g, task.tableName || 'task_table');
  }

  generateFileStructure(task) {
    return [
      `${task.name || 'component'}.js`,
      `${task.name || 'component'}.test.js`,
      `${task.name || 'component'}.css`
    ];
  }

  generateTests(task) {
    return `describe('${task.name || 'Generated Component'}', () => { 
      it('should render correctly', () => { expect(true).toBe(true); }); 
    });`;
  }

  generateDocumentation(task) {
    return `# ${task.name || 'Generated Component'}\n\nImplemented by ${this.agentId} with ${this.role} specialization.`;
  }

  assessCodeQuality(code) {
    return {
      score: Math.random() * 20 + 80, // 80-100 quality score
      metrics: {
        complexity: 'Low',
        maintainability: 'High',
        testability: 'Good'
      }
    };
  }

  generateAnalysisFindings(task) {
    return [
      `Analysis of ${task.description} reveals key implementation patterns`,
      `Identified ${Math.floor(Math.random() * 5) + 1} optimization opportunities`,
      `Current approach aligns with ${this.role} best practices`
    ];
  }

  generateRecommendations(task) {
    return [
      'Implement progressive enhancement approach',
      'Add comprehensive error handling',
      'Consider performance optimization'
    ];
  }

  // Performance and utility methods
  
  updatePerformanceMetrics(duration, success) {
    const metrics = this.performanceMetrics;
    
    if (success) {
      metrics.tasksCompleted++;
      metrics.averageTaskTime = (metrics.averageTaskTime + duration) / 2;
    }
    
    const totalTasks = metrics.tasksCompleted + this.taskHistory.filter(t => !t.success).length;
    metrics.successRate = metrics.tasksCompleted / Math.max(totalTasks, 1);
    metrics.lastActiveTime = Date.now();
  }

  async simulateProcessingTime(min, max) {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  generateGeneralResults(task) {
    return {
      approach: `Applied ${this.capabilities.join(', ')} capabilities`,
      outcome: 'Task completed successfully',
      confidence: Math.random() * 0.3 + 0.7 // 70-100% confidence
    };
  }

  /**
   * Get agent performance statistics
   */
  getPerformanceStats() {
    return {
      ...this.performanceMetrics,
      currentTasks: this.currentTasks.size,
      taskHistory: this.taskHistory.length,
      capabilities: this.capabilities,
      role: this.role
    };
  }

  /**
   * Enhanced disconnect with cleanup
   */
  async disconnect() {
    // Cancel any current tasks
    for (const [taskId, task] of this.currentTasks.entries()) {
      console.log(`⚠️ Cancelling task ${taskId} due to agent disconnect`);
      this.emit('task_cancelled', taskId);
    }
    
    this.currentTasks.clear();
    
    await super.disconnect();
    console.log(`👋 Specialist Agent disconnected: ${this.agentId}`);
  }
}

module.exports = SpecialistAgent;