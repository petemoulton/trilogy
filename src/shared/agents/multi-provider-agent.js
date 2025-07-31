/**
 * Multi-Provider Agent - Enhanced SpecialistAgent with OpenAI and Gemini support
 * Supports real AI API integration with comprehensive metrics tracking
 */

const BaseAgent = require('./base-agent');
const fs = require('fs').promises;
const path = require('path');

class MultiProviderAgent extends BaseAgent {
  constructor(agentId, config = {}) {
    super(agentId);

    this.role = config.role || 'specialist';
    this.capabilities = config.capabilities || [];
    this.provider = config.provider || 'openai';
    this.model = config.model || 'gpt-3.5-turbo';
    this.maxConcurrentTasks = config.maxConcurrentTasks || 1;

    // Multi-provider configuration
    this.providerConfig = null;
    this.apiClients = {};
    
    // Enhanced metrics tracking
    this.metrics = {
      totalTokensInput: 0,
      totalTokensOutput: 0,
      totalCost: 0,
      requestCount: 0,
      failureCount: 0,
      retryCount: 0,
      averageResponseTime: 0,
      providerSwitches: 0
    };

    // Task processing state
    this.currentTasks = new Map();
    this.taskHistory = [];
    this.failureHistory = [];

    console.log(`🤖 Multi-Provider Agent initialized: ${agentId} (${this.role}) using ${this.provider}/${this.model}`);
  }

  /**
   * Initialize multi-provider configuration and API clients
   */
  async connect() {
    await super.connect();
    
    // Load provider configuration
    await this.loadProviderConfig();
    
    // Initialize API clients
    await this.initializeAPIClients();
    
    // Set up metrics tracking
    this.setupMetricsTracking();

    this.emit('status_change', 'ready');
    console.log(`✅ Multi-provider agent ${this.agentId} connected with ${this.provider}/${this.model}`);
  }

  /**
   * Load provider configuration from files
   */
  async loadProviderConfig() {
    try {
      const configPath = path.join(__dirname, '../../../orchestration-spike/provider-config/provider-settings.json');
      const configData = await fs.readFile(configPath, 'utf8');
      this.providerConfig = JSON.parse(configData);
      
      // Load environment variables for API keys
      require('dotenv').config({ 
        path: path.join(__dirname, '../../../orchestration-spike/provider-config/.env')
      });
      
    } catch (error) {
      console.warn(`⚠️ Could not load provider config, using defaults: ${error.message}`);
      this.providerConfig = this.getDefaultConfig();
    }
  }

  /**
   * Initialize API clients for different providers
   */
  async initializeAPIClients() {
    // OpenAI Client
    if (process.env.OPENAI_API_KEY) {
      this.apiClients.openai = {
        apiKey: process.env.OPENAI_API_KEY,
        orgId: process.env.OPENAI_ORG_ID,
        baseUrl: 'https://api.openai.com/v1',
        makeRequest: this.makeOpenAIRequest.bind(this)
      };
      console.log(`🔑 OpenAI client initialized for ${this.agentId}`);
    }

    // Gemini Client  
    if (process.env.GEMINI_API_KEY) {
      this.apiClients.gemini = {
        apiKey: process.env.GEMINI_API_KEY,
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        makeRequest: this.makeGeminiRequest.bind(this)
      };
      console.log(`🔑 Gemini client initialized for ${this.agentId}`);
    }

    if (Object.keys(this.apiClients).length === 0) {
      console.warn(`⚠️ No API clients available for ${this.agentId}, falling back to simulation`);
    }
  }

  /**
   * Process task with real AI API integration and metrics tracking
   */
  async processTask(task) {
    const startTime = Date.now();
    const taskMetrics = {
      taskId: task.id,
      provider: this.provider,
      model: this.model,
      attempts: [],
      totalCost: 0,
      success: false,
      escalated: false
    };

    try {
      this.emit('task_started', task.id);
      this.currentTasks.set(task.id, { ...task, startTime, metrics: taskMetrics });

      console.log(`🔄 ${this.agentId} processing task: ${task.id} with ${this.provider}/${this.model}`);

      // Execute task with retry logic
      const result = await this.executeTaskWithRetries(task, taskMetrics);

      // Record successful completion
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      taskMetrics.success = true;
      taskMetrics.duration = duration;
      
      this.updateMetrics(taskMetrics, true);
      this.currentTasks.delete(task.id);
      this.taskHistory.push(taskMetrics);

      console.log(`✅ ${this.agentId} completed task: ${task.id} (${duration}ms, $${taskMetrics.totalCost.toFixed(4)})`);
      this.emit('task_completed', task.id, result);

      return result;

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      taskMetrics.error = error.message;
      taskMetrics.duration = duration;
      
      this.updateMetrics(taskMetrics, false);
      this.currentTasks.delete(task.id);
      this.failureHistory.push(taskMetrics);

      console.error(`❌ ${this.agentId} failed task: ${task.id} - ${error.message}`);
      this.emit('task_failed', task.id, error.message);

      throw error;
    }
  }

  /**
   * Execute task with retry logic and provider switching
   */
  async executeTaskWithRetries(task, taskMetrics) {
    const maxRetries = this.providerConfig?.failureHandling?.maxRetries || 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const attemptStart = Date.now();
      
      try {
        console.log(`🎯 Attempt ${attempt}/${maxRetries} for task ${task.id}`);
        
        const result = await this.callAIProvider(task, attempt);
        
        // Record successful attempt
        const attemptEnd = Date.now();
        taskMetrics.attempts.push({
          attempt,
          provider: this.provider,
          model: this.model,
          duration: attemptEnd - attemptStart,
          inputTokens: result.usage?.inputTokens || 0,
          outputTokens: result.usage?.outputTokens || 0,
          cost: result.usage?.cost || 0,
          status: 'success'
        });

        taskMetrics.totalCost += result.usage?.cost || 0;
        return result;

      } catch (error) {
        const attemptEnd = Date.now();
        lastError = error;
        
        // Record failed attempt
        taskMetrics.attempts.push({
          attempt,
          provider: this.provider,
          model: this.model,
          duration: attemptEnd - attemptStart,
          error: error.message,
          status: 'failed'
        });

        console.log(`❌ Attempt ${attempt} failed: ${error.message}`);

        // Try switching provider on failure (if available)
        if (attempt < maxRetries && this.canSwitchProvider()) {
          await this.switchToFallbackProvider();
          taskMetrics.providerSwitches = (taskMetrics.providerSwitches || 0) + 1;
        }

        // Wait before retry
        if (attempt < maxRetries) {
          const delay = this.providerConfig?.failureHandling?.retryDelayMs || 1000;
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }

    // All attempts failed - this will trigger escalation
    throw new Error(`Task failed after ${maxRetries} attempts. Last error: ${lastError.message}`);
  }

  /**
   * Call AI provider with proper formatting and error handling
   */
  async callAIProvider(task, attempt) {
    const client = this.apiClients[this.provider];
    if (!client) {
      throw new Error(`No API client available for provider: ${this.provider}`);
    }

    const systemPrompt = this.buildSystemPrompt(task);
    const userPrompt = this.buildTaskPrompt(task, attempt);

    console.log(`🔌 Calling ${this.provider}/${this.model} for task ${task.id}`);
    
    const startTime = Date.now();
    const result = await client.makeRequest(systemPrompt, userPrompt, this.model);
    const endTime = Date.now();

    // Add response time to metrics
    result.responseTime = endTime - startTime;
    
    return result;
  }

  /**
   * Make OpenAI API request
   */
  async makeOpenAIRequest(systemPrompt, userPrompt, model) {
    const response = await fetch(`${this.apiClients.openai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiClients.openai.apiKey}`,
        'Content-Type': 'application/json',
        ...(this.apiClients.openai.orgId && { 'OpenAI-Organization': this.apiClients.openai.orgId })
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: this.providerConfig?.providers?.openai?.models?.[model]?.maxTokens || 4000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      usage: {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        cost: this.calculateOpenAICost(data.usage, model)
      },
      provider: 'openai',
      model: model
    };
  }

  /**
   * Make Gemini API request
   */
  async makeGeminiRequest(systemPrompt, userPrompt, model) {
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    
    const response = await fetch(`${this.apiClients.gemini.baseUrl}/models/${model}:generateContent?key=${this.apiClients.gemini.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: fullPrompt }]
        }],
        generationConfig: {
          maxOutputTokens: this.providerConfig?.providers?.gemini?.models?.[model]?.maxTokens || 3000,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Gemini API returned no candidates');
    }

    return {
      content: data.candidates[0].content.parts[0].text,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount || 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
        cost: this.calculateGeminiCost(data.usageMetadata, model)
      },
      provider: 'gemini',
      model: model
    };
  }

  /**
   * Calculate OpenAI API costs
   */
  calculateOpenAICost(usage, model) {
    const pricing = this.providerConfig?.providers?.openai?.models?.[model];
    if (!pricing) return 0;

    const inputCost = (usage.prompt_tokens / 1000) * pricing.costPer1kInput;
    const outputCost = (usage.completion_tokens / 1000) * pricing.costPer1kOutput;
    
    return inputCost + outputCost;
  }

  /**
   * Calculate Gemini API costs
   */
  calculateGeminiCost(usage, model) {
    const pricing = this.providerConfig?.providers?.gemini?.models?.[model];
    if (!pricing || !usage) return 0;

    const inputCost = (usage.promptTokenCount / 1000) * pricing.costPer1kInput;
    const outputCost = (usage.candidatesTokenCount / 1000) * pricing.costPer1kOutput;
    
    return inputCost + outputCost;
  }

  /**
   * Check if agent can switch to fallback provider
   */
  canSwitchProvider() {
    const assignment = this.providerConfig?.agentAssignments?.[this.role];
    return assignment && assignment.fallbackProvider && this.apiClients[assignment.fallbackProvider];
  }

  /**
   * Switch to fallback provider
   */
  async switchToFallbackProvider() {
    const assignment = this.providerConfig?.agentAssignments?.[this.role];
    if (!assignment) return;

    const oldProvider = this.provider;
    this.provider = assignment.fallbackProvider;
    this.model = assignment.fallbackModel;
    
    this.metrics.providerSwitches++;
    
    console.log(`🔄 ${this.agentId} switched from ${oldProvider} to ${this.provider}/${this.model}`);
  }

  /**
   * Build system prompt based on role and provider
   */
  buildSystemPrompt(task) {
    const rolePrompts = {
      'frontend-specialist': 'You are an expert frontend developer specializing in HTML, CSS, and JavaScript. Create clean, responsive, and accessible web interfaces.',
      'backend-specialist': 'You are an expert backend developer specializing in Node.js, Express, and API design. Create robust, scalable server applications.',
      'qa-specialist': 'You are an expert QA engineer specializing in testing frameworks and quality assurance. Create comprehensive test suites and validation procedures.'
    };

    const basePrompt = rolePrompts[this.role] || 'You are a specialist software developer.';
    
    return `${basePrompt}

You are working on a simple todo list web application. Focus on creating clean, functional code that follows best practices. 

Task Type: ${task.type || 'general'}
Provider: ${this.provider} (${this.model})

Provide complete, working code that can be immediately used. Include proper error handling and follow modern development practices.`;
  }

  /**
   * Build task-specific prompt
   */
  buildTaskPrompt(task, attempt = 1) {
    let prompt = `${task.description || task.title || 'Complete the assigned task'}

Requirements:
${task.requirements ? task.requirements.map(req => `- ${req}`).join('\n') : '- Follow best practices for clean, maintainable code'}

Context: ${task.context || 'This is part of a simple todo list web application'}`;

    if (attempt > 1) {
      prompt += `\n\nNote: This is attempt ${attempt}. Previous attempts may have failed due to errors or issues. Please ensure your response is complete and functional.`;
    }

    return prompt;
  }

  /**
   * Update agent metrics
   */
  updateMetrics(taskMetrics, success) {
    this.metrics.requestCount++;
    
    if (success) {
      // Update success metrics
      const totalTokens = taskMetrics.attempts.reduce((sum, attempt) => 
        sum + (attempt.inputTokens || 0) + (attempt.outputTokens || 0), 0);
      
      this.metrics.totalTokensInput += taskMetrics.attempts.reduce((sum, attempt) => 
        sum + (attempt.inputTokens || 0), 0);
      this.metrics.totalTokensOutput += taskMetrics.attempts.reduce((sum, attempt) => 
        sum + (attempt.outputTokens || 0), 0);
      this.metrics.totalCost += taskMetrics.totalCost;
      
      // Update average response time
      const avgTime = taskMetrics.attempts.reduce((sum, attempt) => sum + attempt.duration, 0) / taskMetrics.attempts.length;
      this.metrics.averageResponseTime = (this.metrics.averageResponseTime + avgTime) / 2;
      
    } else {
      this.metrics.failureCount++;
    }

    this.metrics.retryCount += taskMetrics.attempts.length - 1;
    this.metrics.providerSwitches += taskMetrics.providerSwitches || 0;
  }

  /**
   * Setup metrics tracking and periodic reporting
   */
  setupMetricsTracking() {
    // Save metrics every 30 seconds
    this.metricsInterval = setInterval(() => {
      this.saveMetrics();
    }, 30000);
  }

  /**
   * Save current metrics to file
   */
  async saveMetrics() {
    try {
      const metricsPath = path.join(__dirname, '../../../orchestration-spike/metrics-tracking/live-metrics.json');
      
      const metricsData = {
        agentId: this.agentId,
        role: this.role,
        provider: this.provider,
        model: this.model,
        timestamp: new Date().toISOString(),
        metrics: { ...this.metrics },
        currentTasks: this.currentTasks.size,
        taskHistory: this.taskHistory.length,
        failureHistory: this.failureHistory.length
      };

      await fs.writeFile(metricsPath, JSON.stringify(metricsData, null, 2));
      
    } catch (error) {
      console.error(`Failed to save metrics for ${this.agentId}:`, error.message);
    }
  }

  /**
   * Get comprehensive performance statistics
   */
  getPerformanceStats() {
    return {
      ...this.metrics,
      currentTasks: this.currentTasks.size,
      taskHistory: this.taskHistory.length,
      failureHistory: this.failureHistory.length,
      successRate: this.metrics.requestCount > 0 ? 
        (this.metrics.requestCount - this.metrics.failureCount) / this.metrics.requestCount : 0,
      avgCostPerTask: this.metrics.requestCount > 0 ? 
        this.metrics.totalCost / this.metrics.requestCount : 0,
      capabilities: this.capabilities,
      role: this.role,
      provider: this.provider,
      model: this.model
    };
  }

  /**
   * Get default configuration if files are not available
   */
  getDefaultConfig() {
    return {
      providers: {
        openai: {
          models: {
            'gpt-4': { costPer1kInput: 0.03, costPer1kOutput: 0.06, maxTokens: 8192 },
            'gpt-3.5-turbo': { costPer1kInput: 0.0015, costPer1kOutput: 0.002, maxTokens: 4096 }
          }
        },
        gemini: {
          models: {
            'gemini-pro': { costPer1kInput: 0.0005, costPer1kOutput: 0.0015, maxTokens: 30720 }
          }
        }
      },
      failureHandling: {
        maxRetries: 3,
        retryDelayMs: 1000
      }
    };
  }

  /**
   * Enhanced disconnect with cleanup
   */
  async disconnect() {
    // Save final metrics
    await this.saveMetrics();
    
    // Clear metrics interval
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Cancel current tasks
    for (const [taskId, task] of this.currentTasks.entries()) {
      console.log(`⚠️ Cancelling task ${taskId} due to agent disconnect`);
      this.emit('task_cancelled', taskId);
    }

    this.currentTasks.clear();
    await super.disconnect();
    
    console.log(`👋 Multi-Provider Agent disconnected: ${this.agentId}`);
  }
}

module.exports = MultiProviderAgent;