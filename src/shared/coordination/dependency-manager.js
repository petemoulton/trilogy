/**
 * Trilogy AI System - Dependency Resolution Manager
 * Milestone 3: Handles task dependencies and agent coordination
 *
 * Core Features:
 * - Task dependency tracking with Promise-based coordination
 * - Automatic blocking/unblocking of dependent tasks
 * - Circular dependency detection and prevention
 * - Real-time WebSocket notifications for dependency changes
 * - Manual override capabilities for emergency situations
 */

const EventEmitter = require('events');

class DependencyManager extends EventEmitter {
  constructor(memorySystem, webSocketBroadcast) {
    super();
    this.memory = memorySystem;
    this.broadcast = webSocketBroadcast;

    // Core dependency tracking
    this.taskStates = new Map(); // taskId -> { status, dependencies, dependents, result, promise, resolve, reject }
    this.dependencyGraph = new Map(); // taskId -> Set of dependent taskIds
    this.activeTasks = new Map(); // taskId -> { agentId, startTime, promise }

    // Task state constants
    this.TASK_STATES = {
      PENDING: 'pending',
      RUNNING: 'running',
      BLOCKED: 'blocked',
      COMPLETED: 'completed',
      FAILED: 'failed',
      CANCELLED: 'cancelled'
    };

    // Note: Call initializeDependencySystem() manually after construction
  }

  /**
     * Initialize the dependency management system
     */
  async initializeDependencySystem() {
    try {
      // Load existing dependencies from memory
      await this.loadDependenciesFromMemory();

      // Set up cleanup intervals
      this.setupCleanupIntervals();

      console.log('[DependencyManager] Dependency Resolution System initialized');
      this.emit('system:initialized');

      return this;

    } catch (error) {
      console.error('[DependencyManager] Failed to initialize:', error);
      throw error;
    }
  }

  /**
     * Register a new task with its dependencies
     * @param {string} taskId - Unique task identifier
     * @param {Array<string>} dependencies - Array of taskIds this task depends on
     * @param {string} agentId - Agent responsible for this task
     * @param {Object} taskData - Additional task metadata
     */
  async registerTask(taskId, dependencies = [], agentId = null, taskData = {}) {
    try {
      // Check for circular dependencies
      if (this.wouldCreateCircularDependency(taskId, dependencies)) {
        throw new Error(`Circular dependency detected for task ${taskId}`);
      }

      // Create task state
      const taskState = {
        id: taskId,
        agentId,
        status: this.TASK_STATES.PENDING,
        dependencies: new Set(dependencies),
        dependents: new Set(),
        result: null,
        error: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: taskData,
        promise: null,
        resolve: null,
        reject: null
      };

      // Create Promise for task completion
      taskState.promise = new Promise((resolve, reject) => {
        taskState.resolve = resolve;
        taskState.reject = reject;
      });

      this.taskStates.set(taskId, taskState);

      // Update dependency graph
      for (const depId of dependencies) {
        if (!this.dependencyGraph.has(depId)) {
          this.dependencyGraph.set(depId, new Set());
        }
        this.dependencyGraph.get(depId).add(taskId);

        // Add this task as dependent of the dependency
        if (this.taskStates.has(depId)) {
          this.taskStates.get(depId).dependents.add(taskId);
        }
      }

      // Persist to memory
      await this.persistTaskState(taskId);

      // Determine initial task status
      const initialStatus = dependencies.length > 0 ? this.TASK_STATES.BLOCKED : this.TASK_STATES.PENDING;
      await this.updateTaskStatus(taskId, initialStatus);

      console.log(`[DependencyManager] Task ${taskId} registered with ${dependencies.length} dependencies`);

      return taskState.promise;

    } catch (error) {
      console.error(`[DependencyManager] Failed to register task ${taskId}:`, error);
      throw error;
    }
  }

  /**
     * Start execution of a task (moves from PENDING to RUNNING)
     * @param {string} taskId - Task to start
     * @param {string} agentId - Agent executing the task
     */
  async startTask(taskId, agentId) {
    try {
      const taskState = this.taskStates.get(taskId);
      if (!taskState) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Check if task can be started (not blocked by dependencies)
      if (!await this.canTaskStart(taskId)) {
        throw new Error(`Task ${taskId} is blocked by dependencies`);
      }

      // Update task state
      taskState.agentId = agentId;
      taskState.startedAt = new Date().toISOString();

      // Track active task
      this.activeTasks.set(taskId, {
        agentId,
        startTime: Date.now(),
        promise: taskState.promise
      });

      await this.updateTaskStatus(taskId, this.TASK_STATES.RUNNING);

      console.log(`[DependencyManager] Task ${taskId} started by agent ${agentId}`);

      return taskState.promise;

    } catch (error) {
      console.error(`[DependencyManager] Failed to start task ${taskId}:`, error);
      throw error;
    }
  }

  /**
     * Complete a task successfully
     * @param {string} taskId - Task to complete
     * @param {*} result - Task result data
     */
  async completeTask(taskId, result = null) {
    try {
      const taskState = this.taskStates.get(taskId);
      if (!taskState) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Update task state
      taskState.result = result;
      taskState.completedAt = new Date().toISOString();

      // Remove from active tasks
      this.activeTasks.delete(taskId);

      await this.updateTaskStatus(taskId, this.TASK_STATES.COMPLETED);

      // Resolve the task promise
      if (taskState.resolve) {
        taskState.resolve(result);
      }

      // Unblock dependent tasks
      await this.unblockDependentTasks(taskId);

      console.log(`[DependencyManager] Task ${taskId} completed successfully`);

    } catch (error) {
      console.error(`[DependencyManager] Failed to complete task ${taskId}:`, error);
      throw error;
    }
  }

  /**
     * Mark a task as failed
     * @param {string} taskId - Task that failed
     * @param {Error} error - Error that caused the failure
     */
  async failTask(taskId, error) {
    try {
      const taskState = this.taskStates.get(taskId);
      if (!taskState) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Update task state
      taskState.error = error.message || error;
      taskState.failedAt = new Date().toISOString();

      // Remove from active tasks
      this.activeTasks.delete(taskId);

      await this.updateTaskStatus(taskId, this.TASK_STATES.FAILED);

      // Reject the task promise
      if (taskState.reject) {
        taskState.reject(error);
      }

      // Handle dependent tasks (fail them or mark as cancelled)
      await this.handleFailedTaskDependents(taskId);

      console.log(`[DependencyManager] Task ${taskId} failed:`, error.message);

    } catch (err) {
      console.error(`[DependencyManager] Failed to mark task ${taskId} as failed:`, err);
      throw err;
    }
  }

  /**
     * Check if a task can start (all dependencies completed)
     * @param {string} taskId - Task to check
     * @returns {boolean} True if task can start
     */
  async canTaskStart(taskId) {
    const taskState = this.taskStates.get(taskId);
    if (!taskState) return false;

    // Check all dependencies are completed
    for (const depId of taskState.dependencies) {
      const depState = this.taskStates.get(depId);
      if (!depState || depState.status !== this.TASK_STATES.COMPLETED) {
        return false;
      }
    }

    return true;
  }

  /**
     * Unblock tasks that were waiting for the completed task
     * @param {string} completedTaskId - Task that just completed
     */
  async unblockDependentTasks(completedTaskId) {
    const dependents = this.dependencyGraph.get(completedTaskId) || new Set();

    for (const dependentId of dependents) {
      const canStart = await this.canTaskStart(dependentId);
      if (canStart) {
        const taskState = this.taskStates.get(dependentId);
        if (taskState && taskState.status === this.TASK_STATES.BLOCKED) {
          await this.updateTaskStatus(dependentId, this.TASK_STATES.PENDING);
          console.log(`[DependencyManager] Task ${dependentId} unblocked`);
        }
      }
    }
  }

  /**
     * Handle dependent tasks when a task fails
     * @param {string} failedTaskId - Task that failed
     */
  async handleFailedTaskDependents(failedTaskId) {
    const dependents = this.dependencyGraph.get(failedTaskId) || new Set();

    for (const dependentId of dependents) {
      const taskState = this.taskStates.get(dependentId);
      if (taskState && [this.TASK_STATES.PENDING, this.TASK_STATES.BLOCKED].includes(taskState.status)) {
        await this.updateTaskStatus(dependentId, this.TASK_STATES.CANCELLED);

        // Reject the dependent task promise
        if (taskState.reject) {
          taskState.reject(new Error(`Dependency ${failedTaskId} failed`));
        }

        console.log(`[DependencyManager] Task ${dependentId} cancelled due to failed dependency`);
      }
    }
  }

  /**
     * Check if adding dependencies would create a circular dependency
     * @param {string} taskId - Task to add dependencies to
     * @param {Array<string>} dependencies - Dependencies to add
     * @returns {boolean} True if circular dependency would be created
     */
  wouldCreateCircularDependency(taskId, dependencies) {
    // Use DFS to detect cycles
    const visited = new Set();
    const recursionStack = new Set();

    const hasCycle = (currentTask) => {
      if (recursionStack.has(currentTask)) {
        return true; // Cycle detected
      }
      if (visited.has(currentTask)) {
        return false; // Already processed
      }

      visited.add(currentTask);
      recursionStack.add(currentTask);

      // Check dependencies of current task
      const taskDeps = currentTask === taskId ? dependencies :
        (this.taskStates.get(currentTask)?.dependencies || new Set());

      for (const dep of taskDeps) {
        if (hasCycle(dep)) {
          return true;
        }
      }

      recursionStack.delete(currentTask);
      return false;
    };

    return hasCycle(taskId);
  }

  /**
     * Update task status and broadcast changes
     * @param {string} taskId - Task to update
     * @param {string} newStatus - New status
     */
  async updateTaskStatus(taskId, newStatus) {
    const taskState = this.taskStates.get(taskId);
    if (!taskState) return;

    const oldStatus = taskState.status;
    taskState.status = newStatus;
    taskState.updatedAt = new Date().toISOString();

    // Persist to memory
    await this.persistTaskState(taskId);

    // Broadcast status change
    this.broadcastStatusChange(taskId, oldStatus, newStatus);

    console.log(`[DependencyManager] Task ${taskId}: ${oldStatus} → ${newStatus}`);
  }

  /**
     * Broadcast task status change via WebSocket
     * @param {string} taskId - Task that changed
     * @param {string} oldStatus - Previous status
     * @param {string} newStatus - New status
     */
  broadcastStatusChange(taskId, oldStatus, newStatus) {
    if (this.broadcast) {
      const statusUpdate = {
        type: 'dependency:status_change',
        taskId,
        oldStatus,
        newStatus,
        timestamp: new Date().toISOString(),
        metadata: this.getTaskMetadata(taskId)
      };

      this.broadcast(statusUpdate);
    }
  }

  /**
     * Get task metadata for broadcasting
     * @param {string} taskId - Task ID
     * @returns {Object} Task metadata
     */
  getTaskMetadata(taskId) {
    const taskState = this.taskStates.get(taskId);
    if (!taskState) return null;

    return {
      id: taskState.id,
      agentId: taskState.agentId,
      status: taskState.status,
      dependencies: Array.from(taskState.dependencies),
      dependents: Array.from(taskState.dependents),
      createdAt: taskState.createdAt,
      updatedAt: taskState.updatedAt,
      hasResult: taskState.result !== null,
      hasError: taskState.error !== null
    };
  }

  /**
     * Get current system status
     * @returns {Object} Dependency system status
     */
  getSystemStatus() {
    const statusCounts = {};
    for (const state of Object.values(this.TASK_STATES)) {
      statusCounts[state] = 0;
    }

    for (const taskState of this.taskStates.values()) {
      statusCounts[taskState.status]++;
    }

    return {
      totalTasks: this.taskStates.size,
      activeTasks: this.activeTasks.size,
      statusCounts,
      dependencyGraphSize: this.dependencyGraph.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
     * Manual override to force complete a task (emergency use)
     * @param {string} taskId - Task to force complete
     * @param {*} result - Result to set
     */
  async forceCompleteTask(taskId, result = null) {
    console.warn(`[DependencyManager] FORCE COMPLETING task ${taskId} - Manual override`);

    try {
      await this.completeTask(taskId, result || { forcedComplete: true, timestamp: new Date().toISOString() });

      // Broadcast override notification
      if (this.broadcast) {
        this.broadcast({
          type: 'dependency:force_complete',
          taskId,
          timestamp: new Date().toISOString(),
          warning: 'Task was manually force-completed'
        });
      }

    } catch (error) {
      console.error(`[DependencyManager] Failed to force complete task ${taskId}:`, error);
      throw error;
    }
  }

  /**
     * Get dependency chain for a task
     * @param {string} taskId - Task to analyze
     * @returns {Object} Dependency chain information
     */
  getDependencyChain(taskId) {
    const visited = new Set();
    const chain = [];

    const buildChain = (currentTaskId, depth = 0) => {
      if (visited.has(currentTaskId) || depth > 10) return; // Prevent infinite loops
      visited.add(currentTaskId);

      const taskState = this.taskStates.get(currentTaskId);
      if (!taskState) return;

      chain.push({
        taskId: currentTaskId,
        status: taskState.status,
        depth,
        dependencies: Array.from(taskState.dependencies),
        dependents: Array.from(taskState.dependents)
      });

      // Recursively build chain for dependencies
      for (const depId of taskState.dependencies) {
        buildChain(depId, depth + 1);
      }
    };

    buildChain(taskId);
    return { taskId, chain, totalDepth: Math.max(...chain.map(c => c.depth)) };
  }

  /**
     * Persist task state to memory system
     * @param {string} taskId - Task to persist
     */
  async persistTaskState(taskId) {
    try {
      const taskState = this.taskStates.get(taskId);
      if (!taskState) return;

      const persistData = {
        ...this.getTaskMetadata(taskId),
        result: taskState.result,
        error: taskState.error,
        data: taskState.data,
        startedAt: taskState.startedAt,
        completedAt: taskState.completedAt,
        failedAt: taskState.failedAt
      };

      // Store in memory system - use write method
      await this.memory.write('tasks/dependencies', `${taskId}.json`, persistData);

    } catch (error) {
      console.error(`[DependencyManager] Failed to persist task ${taskId}:`, error);
    }
  }

  /**
     * Load dependencies from memory system
     */
  async loadDependenciesFromMemory() {
    try {
      // Try to read existing dependency files from the dependencies directory
      const fs = require('fs-extra');
      const path = require('path');
      const dependenciesDir = path.join(this.memory.memoryPath, 'tasks', 'dependencies');

      let taskFiles = [];
      if (await fs.pathExists(dependenciesDir)) {
        taskFiles = await fs.readdir(dependenciesDir);
        taskFiles = taskFiles.filter(file => file.endsWith('.json'));
      }

      for (const fileName of taskFiles) {
        const taskId = fileName.replace('.json', '');
        const taskData = await this.memory.read('tasks/dependencies', fileName);

        if (taskData && typeof taskData === 'object') {
          // Reconstruct task state (but don't recreate promises for completed tasks)
          const taskState = {
            id: taskId,
            agentId: taskData.agentId,
            status: taskData.status,
            dependencies: new Set(taskData.dependencies || []),
            dependents: new Set(taskData.dependents || []),
            result: taskData.result,
            error: taskData.error,
            createdAt: taskData.createdAt,
            updatedAt: taskData.updatedAt,
            data: taskData.data || {},
            promise: null,
            resolve: null,
            reject: null
          };

          this.taskStates.set(taskId, taskState);

          // Rebuild dependency graph
          for (const depId of taskState.dependencies) {
            if (!this.dependencyGraph.has(depId)) {
              this.dependencyGraph.set(depId, new Set());
            }
            this.dependencyGraph.get(depId).add(taskId);
          }
        }
      }

      console.log(`[DependencyManager] Loaded ${this.taskStates.size} tasks from memory`);

    } catch (error) {
      console.error('[DependencyManager] Failed to load dependencies from memory:', error);
    }
  }

  /**
     * Setup cleanup intervals for completed tasks
     */
  setupCleanupIntervals() {
    // Clean up old completed tasks every hour
    setInterval(() => {
      this.cleanupOldTasks();
    }, 60 * 60 * 1000); // 1 hour

    // Log system status every 10 minutes
    setInterval(() => {
      const status = this.getSystemStatus();
      console.log('[DependencyManager] System Status:', status);
    }, 10 * 60 * 1000); // 10 minutes
  }

  /**
     * Clean up old completed tasks
     */
  cleanupOldTasks() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    let cleanedCount = 0;

    for (const [taskId, taskState] of this.taskStates.entries()) {
      if ([this.TASK_STATES.COMPLETED, this.TASK_STATES.FAILED, this.TASK_STATES.CANCELLED].includes(taskState.status)) {
        const taskTime = new Date(taskState.updatedAt).getTime();
        if (taskTime < cutoffTime) {
          this.taskStates.delete(taskId);
          this.dependencyGraph.delete(taskId);
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(`[DependencyManager] Cleaned up ${cleanedCount} old tasks`);
    }
  }
}

module.exports = DependencyManager;
