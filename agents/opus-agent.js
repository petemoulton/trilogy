const BaseAgent = require('./base-agent');

class OpusAgent extends BaseAgent {
  constructor(config = {}) {
    super('opus', config);
    this.role = 'Decision-Making Core';
    this.capabilities = [
      'Task Prioritization',
      'Feasibility Filtering',
      'Resource Allocation',
      'Roadmap Generation',
      'Strategic Decision Making'
    ];
  }

  async process(input) {
    console.log(`🎯 Opus Agent processing: ${input.type || 'unknown'}`);
    
    try {
      switch (input.type) {
        case 'finalize_tasks':
          return await this.finalizeTasks(input.tasks);
        case 'prioritize_roadmap':
          return await this.prioritizeRoadmap(input.requirements);
        case 'make_decision':
          return await this.makeDecision(input.options);
        case 'review_sonnet_output':
          return await this.reviewSonnetOutput(input.analysis);
        default:
          return await this.handleGenericInput(input);
      }
    } catch (error) {
      console.error(`Opus Agent processing error:`, error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async finalizeTasks(generatedTasks) {
    console.log(`🔍 Opus reviewing ${generatedTasks.length} tasks from Sonnet`);
    
    // Filter and prioritize tasks
    const approvedTasks = [];
    const rejectedTasks = [];
    const modifiedTasks = [];

    for (const task of generatedTasks) {
      const decision = await this.evaluateTask(task);
      
      switch (decision.action) {
        case 'APPROVE':
          approvedTasks.push({
            ...task,
            status: 'APPROVED',
            opusNotes: decision.reasoning
          });
          break;
        case 'REJECT':
          rejectedTasks.push({
            ...task,
            status: 'REJECTED',
            opusNotes: decision.reasoning
          });
          break;
        case 'MODIFY':
          modifiedTasks.push({
            ...task,
            ...decision.modifications,
            status: 'MODIFIED',
            opusNotes: decision.reasoning
          });
          break;
      }
    }

    // Generate final roadmap
    const finalRoadmap = this.generateRoadmap([...approvedTasks, ...modifiedTasks]);

    // Store final decisions
    const finalOutput = {
      approved: approvedTasks,
      rejected: rejectedTasks,
      modified: modifiedTasks,
      roadmap: finalRoadmap,
      summary: {
        totalReviewed: generatedTasks.length,
        approved: approvedTasks.length,
        rejected: rejectedTasks.length,
        modified: modifiedTasks.length
      },
      decisionMaker: 'opus',
      timestamp: new Date().toISOString()
    };

    await this.writeMemory('tasks/final', 'approved_tasks.json', finalOutput);

    return {
      success: true,
      finalOutput,
      message: `Reviewed ${generatedTasks.length} tasks: ${approvedTasks.length} approved, ${rejectedTasks.length} rejected, ${modifiedTasks.length} modified`,
      timestamp: new Date().toISOString()
    };
  }

  async evaluateTask(task) {
    // Strategic evaluation logic
    const evaluation = {
      strategicValue: this.assessStrategicValue(task),
      implementationRisk: this.assessImplementationRisk(task),
      resourceEfficiency: this.assessResourceEfficiency(task),
      timelineFit: this.assessTimelineFit(task)
    };

    // Decision making based on evaluation
    if (evaluation.strategicValue >= 8 && evaluation.implementationRisk <= 3) {
      return {
        action: 'APPROVE',
        reasoning: `High strategic value (${evaluation.strategicValue}/10) with manageable risk (${evaluation.implementationRisk}/10)`
      };
    } else if (evaluation.strategicValue < 5 || evaluation.implementationRisk > 7) {
      return {
        action: 'REJECT',
        reasoning: `Low strategic value or high risk - strategic: ${evaluation.strategicValue}/10, risk: ${evaluation.implementationRisk}/10`
      };
    } else {
      // Modify task to improve feasibility
      const modifications = this.suggestModifications(task, evaluation);
      return {
        action: 'MODIFY',
        reasoning: `Task has potential but needs adjustments`,
        modifications
      };
    }
  }

  assessStrategicValue(task) {
    let score = 5; // Base score
    
    // High value indicators
    if (task.category === 'Core System') score += 3;
    if (task.priority === 'HIGH') score += 2;
    if (task.title.includes('Memory') || task.title.includes('Agent')) score += 2;
    
    // Adjust for complexity vs. impact
    if (task.complexity === 'HIGH' && task.estimatedHours < 20) score += 1;
    if (task.complexity === 'LOW' && task.estimatedHours > 10) score -= 1;
    
    return Math.min(10, Math.max(1, score));
  }

  assessImplementationRisk(task) {
    let risk = 3; // Base risk
    
    // Risk factors
    if (task.complexity === 'HIGH') risk += 3;
    if (task.blockers.length > 1) risk += 2;
    if (task.dependencies.length > 2) risk += 2;
    if (task.estimatedHours > 20) risk += 1;
    
    // Risk mitigation factors
    if (task.category === 'Integration') risk -= 1;
    if (task.blockers.length === 0) risk -= 1;
    
    return Math.min(10, Math.max(1, risk));
  }

  assessResourceEfficiency(task) {
    // Hours per complexity point (lower is better)
    const complexityMultiplier = {
      'LOW': 1,
      'MEDIUM': 2,
      'HIGH': 3
    };
    
    const efficiency = task.estimatedHours / complexityMultiplier[task.complexity];
    return efficiency < 5 ? 8 : efficiency < 8 ? 6 : 4;
  }

  assessTimelineFit(task) {
    // Assess how well task fits in project timeline
    let fit = 7; // Base fit score
    
    if (task.dependencies.length === 0) fit += 2; // Can start immediately
    if (task.category === 'Infrastructure') fit += 1; // Foundation tasks
    if (task.estimatedHours > 15) fit -= 2; // Large tasks harder to fit
    
    return Math.min(10, Math.max(1, fit));
  }

  suggestModifications(task, evaluation) {
    const modifications = {};
    
    // Reduce scope if too complex
    if (task.complexity === 'HIGH' && task.estimatedHours > 15) {
      modifications.estimatedHours = Math.ceil(task.estimatedHours * 0.7);
      modifications.complexity = 'MEDIUM';
      modifications.description = task.description + ' (reduced scope)';
    }
    
    // Adjust priority based on strategic value
    if (evaluation.strategicValue > 7) {
      modifications.priority = 'HIGH';
    } else if (evaluation.strategicValue < 4) {
      modifications.priority = 'LOW';
    }
    
    // Add risk mitigation
    if (evaluation.implementationRisk > 6) {
      modifications.riskMitigation = [
        'Break into smaller subtasks',
        'Add checkpoints and reviews',
        'Consider proof of concept first'
      ];
    }
    
    return modifications;
  }

  generateRoadmap(approvedTasks) {
    // Sort tasks by priority and dependencies
    const sortedTasks = this.topologicalSort(approvedTasks);
    
    // Create phases
    const phases = [
      {
        name: 'Foundation',
        description: 'Core infrastructure and memory system',
        tasks: sortedTasks.filter(t => t.category === 'Infrastructure' || t.category === 'Core System'),
        estimatedWeeks: 2
      },
      {
        name: 'Agent Integration',
        description: 'Agent communication and processing',
        tasks: sortedTasks.filter(t => t.title.includes('Agent') && !t.category === 'Core System'),
        estimatedWeeks: 2
      },
      {
        name: 'Frontend Development',
        description: 'VS Code extension and user interfaces',
        tasks: sortedTasks.filter(t => t.category === 'Frontend'),
        estimatedWeeks: 3
      },
      {
        name: 'Integration & Testing',
        description: 'System integration and testing',
        tasks: sortedTasks.filter(t => t.category === 'Integration' || t.category === 'Testing'),
        estimatedWeeks: 1
      }
    ];

    return {
      phases,
      totalEstimatedWeeks: phases.reduce((sum, phase) => sum + phase.estimatedWeeks, 0),
      criticalPath: this.identifyCriticalPath(sortedTasks),
      milestones: this.generateMilestones(phases)
    };
  }

  topologicalSort(tasks) {
    // Simple dependency-based sorting
    const sorted = [];
    const visited = new Set();
    
    const visit = (task) => {
      if (visited.has(task.id)) return;
      
      // Visit dependencies first
      task.dependencies.forEach(depId => {
        const depTask = tasks.find(t => t.id === depId);
        if (depTask && !visited.has(depId)) {
          visit(depTask);
        }
      });
      
      visited.add(task.id);
      sorted.push(task);
    };
    
    tasks.forEach(task => {
      if (!visited.has(task.id)) {
        visit(task);
      }
    });
    
    return sorted;
  }

  identifyCriticalPath(tasks) {
    // Simplified critical path identification
    return tasks.filter(task => 
      task.priority === 'HIGH' || 
      tasks.some(t => t.dependencies.includes(task.id))
    ).map(task => task.id);
  }

  generateMilestones(phases) {
    return phases.map((phase, index) => ({
      id: `M${index + 1}`,
      name: `${phase.name} Complete`,
      description: `All ${phase.name.toLowerCase()} tasks completed`,
      week: phases.slice(0, index + 1).reduce((sum, p) => sum + p.estimatedWeeks, 0)
    }));
  }

  async prioritizeRoadmap(requirements) {
    // Strategic roadmap prioritization
    const priorities = {
      'memory_system': 1,
      'agent_framework': 2,
      'vscode_extension': 3,
      'chrome_integration': 4,
      'testing': 5
    };

    const prioritizedRequirements = requirements.sort((a, b) => 
      (priorities[a] || 99) - (priorities[b] || 99)
    );

    return {
      success: true,
      prioritizedRequirements,
      reasoning: 'Prioritized based on system dependencies and strategic value',
      timestamp: new Date().toISOString()
    };
  }

  async makeDecision(options) {
    // Multi-criteria decision making
    const scoredOptions = options.map(option => ({
      ...option,
      score: this.scoreOption(option)
    }));

    const bestOption = scoredOptions.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    return {
      success: true,
      decision: bestOption,
      alternatives: scoredOptions.filter(opt => opt !== bestOption),
      reasoning: `Selected option with highest score (${bestOption.score}) based on strategic criteria`,
      timestamp: new Date().toISOString()
    };
  }

  scoreOption(option) {
    // Multi-factor scoring
    let score = 0;
    score += (option.feasibility || 5) * 0.3;
    score += (option.impact || 5) * 0.3;
    score += (option.urgency || 5) * 0.2;
    score += (option.resources || 5) * 0.2;
    return score;
  }

  async reviewSonnetOutput(analysis) {
    // Review and validate Sonnet's analysis
    const review = {
      analysisQuality: this.assessAnalysisQuality(analysis),
      strategicAlignment: this.assessStrategicAlignment(analysis),
      implementationFeasibility: this.assessFeasibility(analysis),
      recommendations: this.generateStrategicRecommendations(analysis)
    };

    await this.writeMemory('agents/opus', 'sonnet_review.json', {
      review,
      originalAnalysis: analysis,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      review,
      approved: review.analysisQuality > 7 && review.strategicAlignment > 6,
      timestamp: new Date().toISOString()
    };
  }

  assessAnalysisQuality(analysis) {
    let quality = 5;
    if (analysis.overview) quality += 1;
    if (analysis.objectives && analysis.objectives.length > 0) quality += 1;
    if (analysis.features && analysis.features.length > 0) quality += 1;
    if (analysis.complexity) quality += 1;
    if (analysis.timeline) quality += 1;
    return Math.min(10, quality);
  }

  assessStrategicAlignment(analysis) {
    // Check alignment with business objectives
    const strategicKeywords = ['automation', 'efficiency', 'collaboration', 'integration'];
    const content = JSON.stringify(analysis).toLowerCase();
    const alignmentScore = strategicKeywords.reduce((score, keyword) => 
      content.includes(keyword) ? score + 2 : score, 4
    );
    return Math.min(10, alignmentScore);
  }

  assessFeasibility(analysis) {
    if (!analysis.complexity) return 5;
    return analysis.complexity === 'LOW' ? 9 : analysis.complexity === 'MEDIUM' ? 7 : 4;
  }

  generateStrategicRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.complexity === 'HIGH') {
      recommendations.push('Consider phased implementation approach');
    }
    
    if (!analysis.timeline || !analysis.timeline.phases) {
      recommendations.push('Develop detailed timeline with milestones');
    }
    
    if (!analysis.features || analysis.features.length < 3) {
      recommendations.push('Expand feature analysis for completeness');
    }
    
    return recommendations;
  }

  async handleGenericInput(input) {
    return {
      success: true,
      message: `Opus Agent provided strategic guidance on: ${JSON.stringify(input)}`,
      strategicAdvice: [
        'Consider long-term implications',
        'Prioritize high-impact, low-risk initiatives',
        'Ensure alignment with business objectives'
      ],
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = OpusAgent;