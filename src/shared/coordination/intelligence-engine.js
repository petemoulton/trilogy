const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs').promises;

/**
 * Intelligence Engine - Milestone 4 Enhancement
 * 
 * Provides advanced intelligence features:
 * - Complex task breakdown with multi-level analysis
 * - Learning memory with pattern recognition
 * - Predictive agent spawning
 * - Advanced decision tree optimization
 */
class IntelligenceEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      memoryPath: config.memoryPath || path.join(process.cwd(), 'memory'),
      learningThreshold: config.learningThreshold || 0.7,
      maxTaskDepth: config.maxTaskDepth || 5,
      ...config
    };
    
    this.learningMemory = new Map();
    this.taskPatterns = new Map();
    this.agentPerformanceHistory = new Map();
    this.dependencyPatterns = new Map();
    
    this.initializeIntelligence();
  }

  async initializeIntelligence() {
    console.log('🧠 Intelligence Engine: Initializing...');
    
    try {
      // Load existing learning patterns
      await this.loadLearningMemory();
      await this.loadTaskPatterns();
      await this.loadPerformanceHistory();
      
      console.log('✅ Intelligence Engine: Initialization complete');
      this.emit('intelligence_ready');
    } catch (error) {
      console.error('❌ Intelligence Engine initialization error:', error);
    }
  }

  /**
   * COMPLEX TASK BREAKDOWN
   * Multi-level decomposition with dependency analysis
   */
  async performComplexTaskBreakdown(taskDescription, context = {}) {
    console.log('🔍 Intelligence Engine: Performing complex task breakdown...');
    
    const breakdown = {
      id: this.generateTaskId(),
      originalTask: taskDescription,
      context,
      levels: [],
      dependencies: new Map(),
      estimatedComplexity: 0,
      requiredSkills: new Set(),
      riskFactors: [],
      timestamp: new Date().toISOString()
    };

    // Level 1: Primary decomposition
    const primaryTasks = await this.decomposeTaskLevel1(taskDescription, context);
    breakdown.levels.push({
      level: 1,
      tasks: primaryTasks,
      reasoning: 'Primary functional decomposition based on system architecture'
    });

    // Level 2: Detailed subtask analysis
    const detailedTasks = [];
    for (const primaryTask of primaryTasks) {
      const subtasks = await this.decomposeTaskLevel2(primaryTask, context);
      detailedTasks.push(...subtasks);
      
      // Build dependency graph
      this.analyzeDependencies(primaryTask, subtasks, breakdown.dependencies);
    }
    
    breakdown.levels.push({
      level: 2,
      tasks: detailedTasks,
      reasoning: 'Detailed implementation subtasks with technical considerations'
    });

    // Level 3: Implementation steps (if needed)
    if (breakdown.estimatedComplexity > 7) {
      const implementationSteps = await this.decomposeTaskLevel3(detailedTasks, context);
      breakdown.levels.push({
        level: 3,
        tasks: implementationSteps,
        reasoning: 'Granular implementation steps for high-complexity tasks'
      });
    }

    // Analyze overall complexity and requirements
    breakdown.estimatedComplexity = this.calculateOverallComplexity(breakdown);
    breakdown.requiredSkills = this.identifyRequiredSkills(breakdown);
    breakdown.riskFactors = this.identifyRiskFactors(breakdown);

    // Apply learning patterns
    await this.applyLearningPatterns(breakdown);

    // Store breakdown for future learning
    await this.storeTaskBreakdown(breakdown);

    console.log(`✅ Complex breakdown complete: ${breakdown.levels.length} levels, complexity: ${breakdown.estimatedComplexity}/10`);
    
    return breakdown;
  }

  async decomposeTaskLevel1(taskDescription, context) {
    // Analyze task type and domain
    const taskType = this.classifyTaskType(taskDescription);
    const domain = this.identifyDomain(taskDescription, context);
    
    let primaryTasks = [];

    switch (taskType) {
      case 'FEATURE_DEVELOPMENT':
        primaryTasks = this.decomposeFeatureDevelopment(taskDescription, context);
        break;
      case 'SYSTEM_INTEGRATION':
        primaryTasks = this.decomposeSystemIntegration(taskDescription, context);
        break;
      case 'DATA_PROCESSING':
        primaryTasks = this.decomposeDataProcessing(taskDescription, context);
        break;
      case 'UI_DEVELOPMENT':
        primaryTasks = this.decomposeUITasks(taskDescription, context);
        break;
      case 'API_DEVELOPMENT':
        primaryTasks = this.decomposeAPITasks(taskDescription, context);
        break;
      default:
        primaryTasks = this.decomposeGenericTask(taskDescription, context);
    }

    // Enhance with domain-specific considerations
    return this.enhanceWithDomainKnowledge(primaryTasks, domain, context);
  }

  decomposeFeatureDevelopment(taskDescription, context) {
    return [
      {
        id: this.generateTaskId(),
        title: 'Requirements Analysis & Design',
        description: 'Analyze requirements and create technical design',
        category: 'analysis',
        estimatedHours: 8,
        complexity: 'MEDIUM',
        dependencies: [],
        requiredSkills: ['system-design', 'requirements-analysis']
      },
      {
        id: this.generateTaskId(),
        title: 'Backend Implementation',
        description: 'Implement server-side logic and APIs',
        category: 'backend',
        estimatedHours: 16,
        complexity: 'HIGH',
        dependencies: [],
        requiredSkills: ['backend-development', 'api-design']
      },
      {
        id: this.generateTaskId(),
        title: 'Frontend Implementation',
        description: 'Create user interface and user experience',
        category: 'frontend',
        estimatedHours: 12,
        complexity: 'MEDIUM',
        dependencies: [],
        requiredSkills: ['frontend-development', 'ui-design']
      },
      {
        id: this.generateTaskId(),
        title: 'Integration & Testing',
        description: 'Integrate components and perform testing',
        category: 'integration',
        estimatedHours: 8,
        complexity: 'MEDIUM',
        dependencies: [],
        requiredSkills: ['testing', 'integration']
      }
    ];
  }

  decomposeSystemIntegration(taskDescription, context) {
    return [
      {
        id: this.generateTaskId(),
        title: 'Integration Architecture Design',
        description: 'Design integration points and data flow',
        category: 'architecture',
        estimatedHours: 6,
        complexity: 'HIGH',
        dependencies: [],
        requiredSkills: ['system-architecture', 'integration-patterns']
      },
      {
        id: this.generateTaskId(),
        title: 'Connector Development',
        description: 'Develop connectors and adapters',
        category: 'development',
        estimatedHours: 12,
        complexity: 'HIGH',
        dependencies: [],
        requiredSkills: ['integration-development', 'api-design']
      },
      {
        id: this.generateTaskId(),
        title: 'Data Mapping & Transformation',
        description: 'Map and transform data between systems',
        category: 'data',
        estimatedHours: 8,
        complexity: 'MEDIUM',
        dependencies: [],
        requiredSkills: ['data-mapping', 'transformation-logic']
      },
      {
        id: this.generateTaskId(),
        title: 'Integration Testing',
        description: 'Test end-to-end integration flows',
        category: 'testing',
        estimatedHours: 6,
        complexity: 'MEDIUM',
        dependencies: [],
        requiredSkills: ['integration-testing', 'system-testing']
      }
    ];
  }

  async decomposeTaskLevel2(primaryTask, context) {
    const subtasks = [];
    
    switch (primaryTask.category) {
      case 'analysis':
        subtasks.push(...this.decomposeAnalysisTasks(primaryTask, context));
        break;
      case 'backend':
        subtasks.push(...this.decomposeBackendTasks(primaryTask, context));
        break;
      case 'frontend':
        subtasks.push(...this.decomposeFrontendTasks(primaryTask, context));
        break;
      case 'integration':
        subtasks.push(...this.decomposeIntegrationTasks(primaryTask, context));
        break;
      case 'testing':
        subtasks.push(...this.decomposeTestingTasks(primaryTask, context));
        break;
      default:
        subtasks.push(...this.decomposeGenericSubtasks(primaryTask, context));
    }

    return subtasks;
  }

  decomposeBackendTasks(primaryTask, context) {
    return [
      {
        id: this.generateTaskId(),
        title: 'Database Schema Design',
        description: 'Design database tables and relationships',
        parentId: primaryTask.id,
        estimatedHours: 4,
        complexity: 'MEDIUM',
        requiredSkills: ['database-design', 'data-modeling']
      },
      {
        id: this.generateTaskId(),
        title: 'API Endpoint Development',
        description: 'Create REST/GraphQL endpoints',
        parentId: primaryTask.id,
        estimatedHours: 8,
        complexity: 'HIGH',
        requiredSkills: ['api-development', 'backend-frameworks']
      },
      {
        id: this.generateTaskId(),
        title: 'Business Logic Implementation',
        description: 'Implement core business rules and logic',
        parentId: primaryTask.id,
        estimatedHours: 6,
        complexity: 'HIGH',
        requiredSkills: ['business-logic', 'algorithms']
      },
      {
        id: this.generateTaskId(),
        title: 'Authentication & Authorization',
        description: 'Implement security and access control',
        parentId: primaryTask.id,
        estimatedHours: 4,
        complexity: 'MEDIUM',
        requiredSkills: ['security', 'authentication']
      }
    ];
  }

  /**
   * LEARNING MEMORY PATTERNS
   * Pattern recognition and optimization based on historical data
   */
  async applyLearningPatterns(taskBreakdown) {
    console.log('🎓 Intelligence Engine: Applying learning patterns...');
    
    // Find similar past projects
    const similarProjects = await this.findSimilarProjects(taskBreakdown);
    
    if (similarProjects.length > 0) {
      // Apply learned optimizations
      await this.applyLearnedOptimizations(taskBreakdown, similarProjects);
      
      // Adjust estimates based on historical performance
      await this.adjustEstimatesFromHistory(taskBreakdown, similarProjects);
      
      // Identify potential risks from past projects
      await this.identifyHistoricalRisks(taskBreakdown, similarProjects);
    }
    
    // Learn from current breakdown
    await this.learnFromCurrentBreakdown(taskBreakdown);
  }

  async findSimilarProjects(taskBreakdown) {
    const similarities = [];
    
    for (const [projectId, patterns] of this.taskPatterns) {
      const similarity = this.calculateTaskSimilarity(taskBreakdown, patterns);
      
      if (similarity > this.config.learningThreshold) {
        similarities.push({
          projectId,
          patterns,
          similarity,
          performance: this.agentPerformanceHistory.get(projectId)
        });
      }
    }
    
    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
  }

  calculateTaskSimilarity(currentBreakdown, historicalPatterns) {
    let similarity = 0;
    let totalFactors = 0;
    
    // Compare required skills
    const currentSkills = Array.from(currentBreakdown.requiredSkills);
    const historicalSkills = historicalPatterns.requiredSkills || [];
    const skillOverlap = currentSkills.filter(skill => historicalSkills.includes(skill));
    similarity += (skillOverlap.length / Math.max(currentSkills.length, historicalSkills.length)) * 0.3;
    totalFactors += 0.3;
    
    // Compare complexity
    const complexityDiff = Math.abs(currentBreakdown.estimatedComplexity - (historicalPatterns.complexity || 5));
    similarity += (1 - complexityDiff / 10) * 0.2;
    totalFactors += 0.2;
    
    // Compare task structure
    const currentTaskCount = currentBreakdown.levels.reduce((sum, level) => sum + level.tasks.length, 0);
    const historicalTaskCount = historicalPatterns.taskCount || 1;
    const taskCountSimilarity = 1 - Math.abs(currentTaskCount - historicalTaskCount) / Math.max(currentTaskCount, historicalTaskCount);
    similarity += taskCountSimilarity * 0.2;
    totalFactors += 0.2;
    
    // Compare domain/category patterns
    const currentCategories = this.extractCategories(currentBreakdown);
    const historicalCategories = historicalPatterns.categories || [];
    const categoryOverlap = currentCategories.filter(cat => historicalCategories.includes(cat));
    similarity += (categoryOverlap.length / Math.max(currentCategories.length, historicalCategories.length)) * 0.3;
    totalFactors += 0.3;
    
    return totalFactors > 0 ? similarity / totalFactors : 0;
  }

  /**
   * PREDICTIVE AGENT SPAWNING
   * Proactive agent allocation based on dependency analysis
   */
  async predictiveAgentSpawning(taskBreakdown, currentAgentPool) {
    console.log('🔮 Intelligence Engine: Performing predictive agent spawning...');
    
    const predictions = {
      recommendedAgents: [],
      spawnTiming: new Map(),
      resourceOptimization: {},
      confidenceScore: 0
    };
    
    // Analyze dependency chains
    const dependencyChains = this.analyzeDependencyChains(taskBreakdown);
    
    // Predict required agent types and timing
    for (const chain of dependencyChains) {
      const chainPredictions = await this.predictChainRequirements(chain, taskBreakdown);
      predictions.recommendedAgents.push(...chainPredictions.agents);
      
      // Set spawn timing based on dependency delays
      chainPredictions.agents.forEach(agent => {
        predictions.spawnTiming.set(agent.id, chainPredictions.optimalSpawnTime);
      });
    }
    
    // Optimize for resource efficiency
    predictions.resourceOptimization = await this.optimizeResourceAllocation(
      predictions.recommendedAgents, 
      currentAgentPool,
      taskBreakdown
    );
    
    // Calculate confidence based on historical accuracy
    predictions.confidenceScore = await this.calculatePredictionConfidence(taskBreakdown);
    
    // Store predictions for learning
    await this.storePredictions(predictions, taskBreakdown);
    
    console.log(`✅ Predictive spawning complete: ${predictions.recommendedAgents.length} agents recommended`);
    
    return predictions;
  }

  analyzeDependencyChains(taskBreakdown) {
    const chains = [];
    const visitedTasks = new Set();
    
    // Find all root tasks (no dependencies)
    const allTasks = this.flattenTaskLevels(taskBreakdown);
    const rootTasks = allTasks.filter(task => 
      !task.dependencies || task.dependencies.length === 0
    );
    
    // Build chains from each root
    for (const rootTask of rootTasks) {
      const chain = this.buildDependencyChain(rootTask, allTasks, visitedTasks);
      if (chain.length > 1) {
        chains.push(chain);
      }
    }
    
    return chains;
  }

  async predictChainRequirements(chain, taskBreakdown) {
    const predictions = {
      agents: [],
      optimalSpawnTime: new Date(),
      reasoning: []
    };
    
    // Analyze skill requirements across the chain
    const skillMap = new Map();
    let maxComplexity = 0;
    
    for (const task of chain) {
      task.requiredSkills.forEach(skill => {
        skillMap.set(skill, (skillMap.get(skill) || 0) + 1);
      });
      maxComplexity = Math.max(maxComplexity, this.getTaskComplexity(task));
    }
    
    // Determine optimal agent types
    const requiredAgentTypes = await this.determineOptimalAgentTypes(skillMap, maxComplexity);
    
    // Create agent recommendations
    for (const agentType of requiredAgentTypes) {
      predictions.agents.push({
        id: this.generateAgentId(),
        type: agentType.type,
        specialization: agentType.specialization,
        requiredSkills: agentType.skills,
        estimatedUtilization: agentType.utilization,
        priority: agentType.priority
      });
    }
    
    // Calculate optimal spawn timing
    predictions.optimalSpawnTime = this.calculateOptimalSpawnTime(chain, taskBreakdown);
    
    return predictions;
  }

  /**
   * ADVANCED DECISION TREE OPTIMIZATION
   * Enhanced decision making with multi-criteria analysis
   */
  async optimizeDecisionTree(options, context = {}) {
    console.log('🌳 Intelligence Engine: Optimizing decision tree...');
    
    const optimization = {
      scoredOptions: [],
      decisionMatrix: [],
      riskAnalysis: {},
      recommendation: null,
      confidence: 0,
      reasoning: []
    };
    
    // Multi-criteria decision analysis
    const criteria = this.defineCriteria(context);
    const weights = await this.calculateCriteriaWeights(criteria, context);
    
    // Score each option against all criteria
    for (const option of options) {
      const scores = {};
      let totalScore = 0;
      
      for (const criterion of criteria) {
        const score = await this.scoreOptionAgainstCriterion(option, criterion, context);
        scores[criterion.name] = score;
        totalScore += score * weights[criterion.name];
      }
      
      optimization.scoredOptions.push({
        ...option,
        criteriaScores: scores,
        totalScore,
        normalizedScore: totalScore / criteria.length
      });
    }
    
    // Create decision matrix
    optimization.decisionMatrix = this.createDecisionMatrix(optimization.scoredOptions, criteria);
    
    // Perform risk analysis
    optimization.riskAnalysis = await this.performRiskAnalysis(optimization.scoredOptions, context);
    
    // Apply sensitivity analysis
    const sensitivityResults = await this.performSensitivityAnalysis(optimization.scoredOptions, weights);
    
    // Select recommendation with risk adjustment
    optimization.recommendation = this.selectOptimalOption(
      optimization.scoredOptions, 
      optimization.riskAnalysis,
      sensitivityResults
    );
    
    // Calculate confidence
    optimization.confidence = this.calculateDecisionConfidence(optimization);
    
    // Generate reasoning
    optimization.reasoning = this.generateDecisionReasoning(optimization);
    
    console.log(`✅ Decision optimization complete: ${optimization.recommendation.id} selected (confidence: ${optimization.confidence})`);
    
    return optimization;
  }

  defineCriteria(context) {
    const baseCriteria = [
      { name: 'feasibility', weight: 0.25, description: 'Technical and resource feasibility' },
      { name: 'impact', weight: 0.25, description: 'Business value and user impact' },
      { name: 'risk', weight: 0.20, description: 'Implementation and operational risks' },
      { name: 'cost', weight: 0.15, description: 'Resource and time costs' },
      { name: 'alignment', weight: 0.15, description: 'Strategic alignment' }
    ];
    
    // Add context-specific criteria
    if (context.type === 'technical') {
      baseCriteria.push({ name: 'maintainability', weight: 0.10, description: 'Long-term maintainability' });
      baseCriteria.push({ name: 'scalability', weight: 0.10, description: 'System scalability' });
    }
    
    return baseCriteria;
  }

  // Helper methods
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateAgentId() {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  classifyTaskType(taskDescription) {
    const description = taskDescription.toLowerCase();
    
    if (description.includes('feature') || description.includes('functionality')) {
      return 'FEATURE_DEVELOPMENT';
    } else if (description.includes('integrate') || description.includes('connect')) {
      return 'SYSTEM_INTEGRATION';
    } else if (description.includes('data') || description.includes('process')) {
      return 'DATA_PROCESSING';
    } else if (description.includes('ui') || description.includes('interface')) {
      return 'UI_DEVELOPMENT';
    } else if (description.includes('api') || description.includes('endpoint')) {
      return 'API_DEVELOPMENT';
    }
    
    return 'GENERIC_TASK';
  }

  identifyDomain(taskDescription, context) {
    // Analyze context and description to identify domain
    if (context.project && context.project.domain) {
      return context.project.domain;
    }
    
    const description = taskDescription.toLowerCase();
    if (description.includes('web') || description.includes('website')) return 'web-development';
    if (description.includes('mobile') || description.includes('app')) return 'mobile-development';
    if (description.includes('data') || description.includes('analytics')) return 'data-science';
    if (description.includes('ai') || description.includes('machine learning')) return 'artificial-intelligence';
    
    return 'general-software';
  }

  async loadLearningMemory() {
    try {
      const memoryPath = path.join(this.config.memoryPath, 'intelligence', 'learning_memory.json');
      const data = await fs.readFile(memoryPath, 'utf8');
      const parsed = JSON.parse(data);
      
      for (const [key, value] of Object.entries(parsed)) {
        this.learningMemory.set(key, value);
      }
      
      console.log(`📚 Loaded ${this.learningMemory.size} learning patterns`);
    } catch (error) {
      console.log('📚 No existing learning memory found, starting fresh');
    }
  }

  async loadTaskPatterns() {
    try {
      const patternsPath = path.join(this.config.memoryPath, 'intelligence', 'task_patterns.json');
      const data = await fs.readFile(patternsPath, 'utf8');
      const parsed = JSON.parse(data);
      
      for (const [key, value] of Object.entries(parsed)) {
        this.taskPatterns.set(key, value);
      }
      
      console.log(`📋 Loaded ${this.taskPatterns.size} task patterns`);
    } catch (error) {
      console.log('📋 No existing task patterns found, starting fresh');
    }
  }

  async loadPerformanceHistory() {
    try {
      const historyPath = path.join(this.config.memoryPath, 'intelligence', 'performance_history.json');
      const data = await fs.readFile(historyPath, 'utf8');
      const parsed = JSON.parse(data);
      
      for (const [key, value] of Object.entries(parsed)) {
        this.agentPerformanceHistory.set(key, value);
      }
      
      console.log(`📊 Loaded ${this.agentPerformanceHistory.size} performance records`);
    } catch (error) {
      console.log('📊 No existing performance history found, starting fresh');
    }
  }

  async saveIntelligenceState() {
    try {
      const intelligenceDir = path.join(this.config.memoryPath, 'intelligence');
      await fs.mkdir(intelligenceDir, { recursive: true });
      
      // Save learning memory
      const learningMemoryPath = path.join(intelligenceDir, 'learning_memory.json');
      await fs.writeFile(learningMemoryPath, JSON.stringify(Object.fromEntries(this.learningMemory), null, 2));
      
      // Save task patterns
      const taskPatternsPath = path.join(intelligenceDir, 'task_patterns.json');
      await fs.writeFile(taskPatternsPath, JSON.stringify(Object.fromEntries(this.taskPatterns), null, 2));
      
      // Save performance history
      const performancePath = path.join(intelligenceDir, 'performance_history.json');
      await fs.writeFile(performancePath, JSON.stringify(Object.fromEntries(this.agentPerformanceHistory), null, 2));
      
      console.log('💾 Intelligence state saved');
    } catch (error) {
      console.error('❌ Error saving intelligence state:', error);
    }
  }

  // Additional helper methods for task decomposition
  decomposeUITasks(taskDescription, context) {
    return [
      {
        id: this.generateTaskId(),
        title: 'UI Component Design',
        description: 'Design reusable UI components',
        category: 'ui-design',
        estimatedHours: 12,
        complexity: 'MEDIUM',
        requiredSkills: ['ui-design', 'figma']
      },
      {
        id: this.generateTaskId(),
        title: 'Frontend Implementation',
        description: 'Implement UI components with framework',
        category: 'frontend',
        estimatedHours: 16,
        complexity: 'HIGH',
        requiredSkills: ['frontend-development', 'react']
      }
    ];
  }

  decomposeAPITasks(taskDescription, context) {
    return [
      {
        id: this.generateTaskId(),
        title: 'API Specification',
        description: 'Define API endpoints and schemas',
        category: 'api-design',
        estimatedHours: 8,
        complexity: 'MEDIUM',
        requiredSkills: ['api-design', 'openapi']
      },
      {
        id: this.generateTaskId(),
        title: 'API Implementation',
        description: 'Implement REST/GraphQL API',
        category: 'backend',
        estimatedHours: 20,
        complexity: 'HIGH',
        requiredSkills: ['backend-development', 'api-development']
      }
    ];
  }

  decomposeGenericTask(taskDescription, context) {
    return [
      {
        id: this.generateTaskId(),
        title: 'Analysis & Planning',
        description: 'Analyze requirements and create plan',
        category: 'analysis',
        estimatedHours: 6,
        complexity: 'MEDIUM',
        requiredSkills: ['analysis', 'planning']
      },
      {
        id: this.generateTaskId(),
        title: 'Implementation',
        description: 'Implement core functionality',
        category: 'development',
        estimatedHours: 16,
        complexity: 'HIGH',
        requiredSkills: ['development']
      }
    ];
  }

  enhanceWithDomainKnowledge(primaryTasks, domain, context) {
    // Add domain-specific enhancements
    return primaryTasks.map(task => ({
      ...task,
      domain,
      domainSpecificRisks: this.identifyDomainRisks(domain),
      estimatedComplexity: this.calculateTaskComplexity(task)
    }));
  }

  identifyDomainRisks(domain) {
    const riskMap = {
      'web-development': ['browser compatibility', 'performance bottlenecks'],
      'mobile-development': ['platform fragmentation', 'device limitations'],
      'data-science': ['data quality', 'model accuracy'],
      'artificial-intelligence': ['training time', 'computational resources']
    };
    
    return riskMap[domain] || ['technical complexity', 'integration challenges'];
  }

  calculateTaskComplexity(task) {
    let complexity = 5; // Base complexity
    
    if (task.complexity === 'HIGH') complexity += 3;
    else if (task.complexity === 'MEDIUM') complexity += 1;
    
    if (task.estimatedHours > 15) complexity += 2;
    if (task.requiredSkills && task.requiredSkills.length > 3) complexity += 1;
    
    return Math.min(10, complexity);
  }

  decomposeAnalysisTasks(primaryTask, context) {
    return [
      {
        id: this.generateTaskId(),
        title: 'Requirements Gathering',
        description: 'Collect and document requirements',
        parentId: primaryTask.id,
        estimatedHours: 4,
        complexity: 'LOW',
        requiredSkills: ['requirements-analysis']
      },
      {
        id: this.generateTaskId(),
        title: 'Technical Research',
        description: 'Research technical solutions and approaches',
        parentId: primaryTask.id,
        estimatedHours: 6,
        complexity: 'MEDIUM',
        requiredSkills: ['research', 'technical-analysis']
      }
    ];
  }

  decomposeFrontendTasks(primaryTask, context) {
    return [
      {
        id: this.generateTaskId(),
        title: 'Component Architecture',
        description: 'Design component structure and hierarchy',
        parentId: primaryTask.id,
        estimatedHours: 6,
        complexity: 'MEDIUM',
        requiredSkills: ['frontend-architecture', 'component-design']
      },
      {
        id: this.generateTaskId(),
        title: 'UI Implementation',
        description: 'Implement user interface components',
        parentId: primaryTask.id,
        estimatedHours: 12,
        complexity: 'HIGH',
        requiredSkills: ['frontend-development', 'ui-frameworks']
      }
    ];
  }

  decomposeIntegrationTasks(primaryTask, context) {
    return [
      {
        id: this.generateTaskId(),
        title: 'Integration Planning',
        description: 'Plan integration points and data flow',
        parentId: primaryTask.id,
        estimatedHours: 4,
        complexity: 'MEDIUM',
        requiredSkills: ['integration-planning', 'system-design']
      },
      {
        id: this.generateTaskId(),
        title: 'Integration Testing',
        description: 'Test integration between components',
        parentId: primaryTask.id,
        estimatedHours: 8,
        complexity: 'MEDIUM',
        requiredSkills: ['integration-testing', 'testing']
      }
    ];
  }

  decomposeTestingTasks(primaryTask, context) {
    return [
      {
        id: this.generateTaskId(),
        title: 'Test Planning',
        description: 'Create comprehensive test plan',
        parentId: primaryTask.id,
        estimatedHours: 4,
        complexity: 'MEDIUM',
        requiredSkills: ['test-planning', 'qa']
      },
      {
        id: this.generateTaskId(),
        title: 'Test Implementation',
        description: 'Implement automated tests',
        parentId: primaryTask.id,
        estimatedHours: 12,
        complexity: 'MEDIUM',
        requiredSkills: ['test-automation', 'testing-frameworks']
      }
    ];
  }

  decomposeGenericSubtasks(primaryTask, context) {
    return [
      {
        id: this.generateTaskId(),
        title: 'Subtask Analysis',
        description: 'Break down task into smaller components',
        parentId: primaryTask.id,
        estimatedHours: 4,
        complexity: 'LOW',
        requiredSkills: ['analysis']
      },
      {
        id: this.generateTaskId(),
        title: 'Implementation',
        description: 'Implement task functionality',
        parentId: primaryTask.id,
        estimatedHours: 8,
        complexity: 'MEDIUM',
        requiredSkills: ['development']
      }
    ];
  }

  flattenTaskLevels(taskBreakdown) {
    const allTasks = [];
    if (taskBreakdown.levels) {
      taskBreakdown.levels.forEach(level => {
        if (level.tasks) {
          allTasks.push(...level.tasks);
        }
      });
    }
    return allTasks;
  }

  buildDependencyChain(rootTask, allTasks, visitedTasks) {
    const chain = [rootTask];
    visitedTasks.add(rootTask.id);
    
    // Find tasks that depend on this root task
    const dependents = allTasks.filter(task => 
      task.dependencies && task.dependencies.includes(rootTask.id) && !visitedTasks.has(task.id)
    );
    
    // Recursively build chains for dependents
    dependents.forEach(dependent => {
      const subChain = this.buildDependencyChain(dependent, allTasks, visitedTasks);
      chain.push(...subChain.slice(1)); // Exclude the root as it's already added
    });
    
    return chain;
  }

  calculateOptimalSpawnTime(chain, taskBreakdown) {
    // Calculate based on dependency timing and current date
    const baseTime = new Date();
    const chainComplexity = chain.reduce((sum, task) => sum + this.getTaskComplexity(task), 0);
    const hoursOffset = Math.max(2, chainComplexity * 0.5); // At least 2 hours, scaled by complexity
    
    return new Date(baseTime.getTime() + (hoursOffset * 60 * 60 * 1000));
  }

  getTaskComplexity(task) {
    const complexityMap = { 'LOW': 2, 'MEDIUM': 5, 'HIGH': 8 };
    return complexityMap[task.complexity] || 5;
  }

  async determineOptimalAgentTypes(skillMap, maxComplexity) {
    const agentTypes = [];
    
    // Convert skill frequency to agent recommendations
    for (const [skill, frequency] of skillMap) {
      const agentType = this.mapSkillToAgentType(skill);
      const existingType = agentTypes.find(type => type.type === agentType.type);
      
      if (existingType) {
        existingType.utilization += frequency * 0.1;
        existingType.skills.push(skill);
      } else {
        agentTypes.push({
          type: agentType.type,
          specialization: agentType.specialization,
          skills: [skill],
          utilization: frequency * 0.1,
          priority: maxComplexity > 7 ? 'HIGH' : 'MEDIUM'
        });
      }
    }
    
    return agentTypes;
  }

  mapSkillToAgentType(skill) {
    const skillMap = {
      'frontend-development': { type: 'frontend-specialist', specialization: 'UI Development' },
      'backend-development': { type: 'backend-specialist', specialization: 'Server Development' },
      'database-design': { type: 'data-specialist', specialization: 'Database Management' },
      'testing': { type: 'qa-specialist', specialization: 'Quality Assurance' },
      'devops': { type: 'devops-specialist', specialization: 'Infrastructure' }
    };
    
    return skillMap[skill] || { type: 'generalist', specialization: 'General Development' };
  }

  async calculateCriteriaWeights(criteria, context) {
    const weights = {};
    const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
    
    criteria.forEach(criterion => {
      weights[criterion.name] = criterion.weight / totalWeight;
    });
    
    return weights;
  }

  async scoreOptionAgainstCriterion(option, criterion, context) {
    // Use the option's property that matches the criterion name
    return option[criterion.name] || 5; // Default score of 5 if not specified
  }

  createDecisionMatrix(scoredOptions, criteria) {
    const matrix = [];
    
    scoredOptions.forEach(option => {
      const row = { option: option.name || option.id };
      criteria.forEach(criterion => {
        row[criterion.name] = option.criteriaScores[criterion.name];
      });
      row.totalScore = option.totalScore;
      matrix.push(row);
    });
    
    return matrix;
  }

  async performRiskAnalysis(scoredOptions, context) {
    return {
      highRiskOptions: scoredOptions.filter(opt => opt.criteriaScores.risk > 7),
      riskMitigations: ['Implement phased rollout', 'Add monitoring', 'Create rollback plan'],
      overallRiskLevel: 'MEDIUM'
    };
  }

  async performSensitivityAnalysis(scoredOptions, weights) {
    return {
      robustOptions: scoredOptions.filter(opt => opt.totalScore > 6),
      sensitiveFactors: Object.keys(weights).filter(key => weights[key] > 0.3),
      stabilityScore: 0.85
    };
  }

  selectOptimalOption(scoredOptions, riskAnalysis, sensitivityResults) {
    // Select highest scoring option that's not high risk
    const viableOptions = scoredOptions.filter(opt => 
      !riskAnalysis.highRiskOptions.includes(opt)
    );
    
    return viableOptions.reduce((best, current) => 
      current.totalScore > best.totalScore ? current : best
    );
  }

  calculateDecisionConfidence(optimization) {
    const topScore = Math.max(...optimization.scoredOptions.map(opt => opt.totalScore));
    const secondScore = optimization.scoredOptions
      .map(opt => opt.totalScore)
      .sort((a, b) => b - a)[1] || 0;
    
    const scoreGap = topScore - secondScore;
    return Math.min(0.95, 0.5 + (scoreGap / 10));
  }

  generateDecisionReasoning(optimization) {
    const reasoning = [];
    const selected = optimization.recommendation;
    
    reasoning.push(`Selected ${selected.name || selected.id} with highest total score (${selected.totalScore.toFixed(2)})`);
    
    if (optimization.riskAnalysis.overallRiskLevel === 'LOW') {
      reasoning.push('Low risk profile makes this a safe choice');
    }
    
    reasoning.push(`Confidence level: ${Math.round(optimization.confidence * 100)}%`);
    
    return reasoning;
  }

  async analyzeHistoricalPatterns(projectContext) {
    // Mock implementation for testing
    return {
      totalProjects: 156,
      matchingProjects: 23,
      successRate: 0.87,
      commonPatterns: ['real-time features require WebSocket expertise', 'collaborative systems need conflict resolution'],
      riskFactors: ['scalability concerns', 'integration complexity']
    };
  }

  async applyLearningOptimizations(currentState, goals) {
    // Mock implementation for testing
    return [
      {
        id: 'opt1',
        type: 'resource_allocation',
        description: 'Optimize agent allocation based on historical performance',
        expectedImpact: 0.23,
        confidence: 0.89
      },
      {
        id: 'opt2',
        type: 'task_sequencing',
        description: 'Reorder tasks based on dependency patterns',
        expectedImpact: 0.15,
        confidence: 0.76
      }
    ];
  }

  async storeTaskBreakdown(breakdown) {
    try {
      const breakdownsDir = path.join(this.config.memoryPath, 'intelligence', 'breakdowns');
      await fs.mkdir(breakdownsDir, { recursive: true });
      
      const filename = `breakdown_${breakdown.id}.json`;
      const filepath = path.join(breakdownsDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(breakdown, null, 2));
    } catch (error) {
      console.error('Error storing task breakdown:', error);
    }
  }

  async storePredictions(predictions, taskBreakdown) {
    try {
      const predictionsDir = path.join(this.config.memoryPath, 'intelligence', 'predictions');
      await fs.mkdir(predictionsDir, { recursive: true });
      
      const filename = `predictions_${Date.now()}.json`;
      const filepath = path.join(predictionsDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify({
        predictions,
        taskBreakdown: taskBreakdown.id,
        timestamp: new Date().toISOString()
      }, null, 2));
    } catch (error) {
      console.error('Error storing predictions:', error);
    }
  }

  extractCategories(taskBreakdown) {
    const categories = new Set();
    
    if (taskBreakdown.levels) {
      taskBreakdown.levels.forEach(level => {
        if (level.tasks) {
          level.tasks.forEach(task => {
            if (task.category) categories.add(task.category);
          });
        }
      });
    }
    
    return Array.from(categories);
  }

  async learnFromCurrentBreakdown(taskBreakdown) {
    // Store patterns for future learning
    const patterns = {
      complexity: taskBreakdown.estimatedComplexity,
      taskCount: this.flattenTaskLevels(taskBreakdown).length,
      categories: this.extractCategories(taskBreakdown),
      requiredSkills: Array.from(taskBreakdown.requiredSkills),
      timestamp: new Date().toISOString()
    };
    
    this.taskPatterns.set(taskBreakdown.id, patterns);
    await this.saveIntelligenceState();
  }

  analyzeDependencies(primaryTask, subtasks, dependencyMap) {
    // Analyze dependencies between primary task and its subtasks
    subtasks.forEach(subtask => {
      if (subtask.parentId === primaryTask.id) {
        if (!dependencyMap.has(primaryTask.id)) {
          dependencyMap.set(primaryTask.id, []);
        }
        dependencyMap.get(primaryTask.id).push(subtask.id);
      }
    });

    // Add implicit dependencies based on task types
    this.addImplicitDependencies(primaryTask, subtasks, dependencyMap);
  }

  addImplicitDependencies(primaryTask, subtasks, dependencyMap) {
    // Add logical dependencies (e.g., design before implementation)
    const designTasks = subtasks.filter(t => t.category === 'design' || t.category === 'analysis');
    const implementationTasks = subtasks.filter(t => t.category === 'implementation' || t.category === 'development');
    const testingTasks = subtasks.filter(t => t.category === 'testing' || t.category === 'qa');

    // Implementation depends on design
    implementationTasks.forEach(implTask => {
      designTasks.forEach(designTask => {
        if (!dependencyMap.has(designTask.id)) {
          dependencyMap.set(designTask.id, []);
        }
        dependencyMap.get(designTask.id).push(implTask.id);
      });
    });

    // Testing depends on implementation
    testingTasks.forEach(testTask => {
      implementationTasks.forEach(implTask => {
        if (!dependencyMap.has(implTask.id)) {
          dependencyMap.set(implTask.id, []);
        }
        dependencyMap.get(implTask.id).push(testTask.id);
      });
    });
  }

  async optimizeResourceAllocation(predictions, currentAgentPool) {
    const optimization = {
      totalResourcesNeeded: predictions.recommendedAgents?.length || 0,
      currentCapacity: currentAgentPool.length,
      utilizationRate: 0,
      optimalScheduling: 'staggered',
      resourceEfficiency: 0.85,
      recommendations: []
    };

    // Calculate utilization rate
    if (optimization.currentCapacity > 0) {
      optimization.utilizationRate = Math.min(1, optimization.totalResourcesNeeded / optimization.currentCapacity);
    }

    // Generate recommendations based on resource analysis
    if (optimization.utilizationRate > 0.9) {
      optimization.recommendations.push('Consider scaling up agent pool');
      optimization.optimalScheduling = 'parallel';
    } else if (optimization.utilizationRate < 0.5) {
      optimization.recommendations.push('Current capacity is sufficient');
      optimization.optimalScheduling = 'sequential';
    } else {
      optimization.recommendations.push('Balance workload with staggered deployment');
    }

    return optimization;
  }

  calculateOverallComplexity(breakdown) {
    if (!breakdown.levels || breakdown.levels.length === 0) {
      return 5; // Default complexity
    }

    let totalComplexity = 0;
    let taskCount = 0;

    breakdown.levels.forEach(level => {
      if (level.tasks) {
        level.tasks.forEach(task => {
          totalComplexity += this.getTaskComplexity(task);
          taskCount++;
        });
      }
    });

    return taskCount > 0 ? Math.min(10, Math.round(totalComplexity / taskCount)) : 5;
  }

  identifyRequiredSkills(breakdown) {
    const allSkills = new Set();
    
    if (breakdown.levels) {
      breakdown.levels.forEach(level => {
        if (level.tasks) {
          level.tasks.forEach(task => {
            if (task.requiredSkills) {
              task.requiredSkills.forEach(skill => allSkills.add(skill));
            }
          });
        }
      });
    }

    return allSkills;
  }

  identifyRiskFactors(breakdown) {
    const risks = [];
    const allTasks = this.flattenTaskLevels(breakdown);
    
    // High complexity tasks
    const highComplexityTasks = allTasks.filter(task => this.getTaskComplexity(task) > 7);
    if (highComplexityTasks.length > 0) {
      risks.push(`${highComplexityTasks.length} high-complexity tasks identified`);
    }

    // Large estimation tasks
    const largeTasks = allTasks.filter(task => (task.estimatedHours || 0) > 20);
    if (largeTasks.length > 0) {
      risks.push(`${largeTasks.length} tasks with >20 hour estimates`);
    }

    // Skills diversity risk
    const uniqueSkills = Array.from(breakdown.requiredSkills || []);
    if (uniqueSkills.length > 5) {
      risks.push('High skill diversity may require specialized agents');
    }

    return risks.length > 0 ? risks : ['Standard project risks apply'];
  }

  async calculatePredictionConfidence(taskBreakdown) {
    // Calculate confidence based on various factors
    let confidence = 0.7; // Base confidence
    
    // Increase confidence based on task breakdown completeness
    if (taskBreakdown.levels && taskBreakdown.levels.length > 1) {
      confidence += 0.1;
    }
    
    // Increase confidence based on skill clarity
    const skillCount = Array.from(taskBreakdown.requiredSkills || []).length;
    if (skillCount > 0) {
      confidence += Math.min(0.15, skillCount * 0.03);
    }
    
    // Decrease confidence for high complexity
    if (taskBreakdown.estimatedComplexity > 8) {
      confidence -= 0.1;
    }
    
    // Decrease confidence for many risk factors
    const riskCount = taskBreakdown.riskFactors?.length || 0;
    if (riskCount > 3) {
      confidence -= 0.05;
    }
    
    return Math.min(0.95, Math.max(0.5, confidence));
  }

  async applyLearnedOptimizations(taskBreakdown, similarProjects) {
    // Apply optimizations learned from similar projects
    const optimizations = [];
    
    for (const project of similarProjects) {
      if (project.performance && project.performance.successRate > 0.8) {
        // Apply successful patterns
        optimizations.push({
          type: 'task_ordering',
          description: 'Apply successful task sequencing from similar project',
          confidence: project.similarity * 0.8
        });
      }
    }
    
    return optimizations;
  }

  async adjustEstimatesFromHistory(taskBreakdown, similarProjects) {
    // Adjust time estimates based on historical data
    if (similarProjects.length === 0) return;
    
    const avgPerformance = similarProjects.reduce((sum, proj) => 
      sum + (proj.performance?.timeAccuracy || 1), 0
    ) / similarProjects.length;
    
    // Adjust estimates if historical accuracy suggests over/under estimation
    if (avgPerformance < 0.8) {
      // Historical projects took longer than estimated
      taskBreakdown.levels.forEach(level => {
        level.tasks.forEach(task => {
          task.estimatedHours = Math.ceil(task.estimatedHours * 1.2);
        });
      });
    }
  }

  async identifyHistoricalRisks(taskBreakdown, similarProjects) {
    // Identify risks based on similar project outcomes
    const historicalRisks = [];
    
    for (const project of similarProjects) {
      if (project.performance && project.performance.issues) {
        project.performance.issues.forEach(issue => {
          if (!historicalRisks.includes(issue)) {
            historicalRisks.push(issue);
          }
        });
      }
    }
    
    // Add historical risks to current breakdown
    if (historicalRisks.length > 0) {
      taskBreakdown.riskFactors = [
        ...taskBreakdown.riskFactors,
        ...historicalRisks.map(risk => `Historical risk: ${risk}`)
      ];
    }
  }
}

module.exports = IntelligenceEngine;