const client = require('prom-client');

class MonitoringManager {
  constructor() {
    // Create a Registry to register the metrics
    this.register = new client.Registry();

    // Add default metrics
    client.collectDefaultMetrics({
      register: this.register,
      timeout: 5000
    });

    this.initializeMetrics();
  }

  initializeMetrics() {
    // HTTP request metrics
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });

    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    });

    // Memory system metrics
    this.memoryOperationsTotal = new client.Counter({
      name: 'memory_operations_total',
      help: 'Total number of memory operations',
      labelNames: ['operation', 'namespace', 'status']
    });

    this.memoryOperationDuration = new client.Histogram({
      name: 'memory_operation_duration_seconds',
      help: 'Duration of memory operations in seconds',
      labelNames: ['operation', 'namespace'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    this.memoryKeysGauge = new client.Gauge({
      name: 'memory_keys_total',
      help: 'Total number of keys in memory by namespace',
      labelNames: ['namespace']
    });

    this.memoryLocksGauge = new client.Gauge({
      name: 'memory_locks_active',
      help: 'Number of active memory locks'
    });

    // Agent metrics
    this.agentSessionsTotal = new client.Counter({
      name: 'agent_sessions_total',
      help: 'Total number of agent sessions',
      labelNames: ['agent', 'status']
    });

    this.agentProcessingDuration = new client.Histogram({
      name: 'agent_processing_duration_seconds',
      help: 'Duration of agent processing in seconds',
      labelNames: ['agent', 'operation'],
      buckets: [1, 5, 10, 30, 60, 120, 300, 600]
    });

    this.agentActiveSessionsGauge = new client.Gauge({
      name: 'agent_active_sessions',
      help: 'Number of active agent sessions',
      labelNames: ['agent']
    });

    // Task metrics
    this.tasksTotal = new client.Gauge({
      name: 'tasks_total',
      help: 'Total number of tasks by status',
      labelNames: ['status', 'priority', 'category']
    });

    this.taskCompletionTime = new client.Histogram({
      name: 'task_completion_time_hours',
      help: 'Task completion time in hours',
      labelNames: ['priority', 'category'],
      buckets: [0.5, 1, 2, 4, 8, 16, 24, 48, 96]
    });

    // Database metrics
    this.dbConnectionsActive = new client.Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections'
    });

    this.dbQueryDuration = new client.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    this.dbQueriesTotal = new client.Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'status']
    });

    // WebSocket metrics
    this.wsConnectionsActive = new client.Gauge({
      name: 'websocket_connections_active',
      help: 'Number of active WebSocket connections'
    });

    this.wsMessagesTotal = new client.Counter({
      name: 'websocket_messages_total',
      help: 'Total number of WebSocket messages',
      labelNames: ['type', 'direction']
    });

    // Error metrics
    this.errorsTotal = new client.Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'component']
    });

    // System health
    this.systemHealth = new client.Gauge({
      name: 'system_health',
      help: 'System health status (1 = healthy, 0 = unhealthy)',
      labelNames: ['component']
    });

    // Register all metrics
    this.register.registerMetric(this.httpRequestDuration);
    this.register.registerMetric(this.httpRequestsTotal);
    this.register.registerMetric(this.memoryOperationsTotal);
    this.register.registerMetric(this.memoryOperationDuration);
    this.register.registerMetric(this.memoryKeysGauge);
    this.register.registerMetric(this.memoryLocksGauge);
    this.register.registerMetric(this.agentSessionsTotal);
    this.register.registerMetric(this.agentProcessingDuration);
    this.register.registerMetric(this.agentActiveSessionsGauge);
    this.register.registerMetric(this.tasksTotal);
    this.register.registerMetric(this.taskCompletionTime);
    this.register.registerMetric(this.dbConnectionsActive);
    this.register.registerMetric(this.dbQueryDuration);
    this.register.registerMetric(this.dbQueriesTotal);
    this.register.registerMetric(this.wsConnectionsActive);
    this.register.registerMetric(this.wsMessagesTotal);
    this.register.registerMetric(this.errorsTotal);
    this.register.registerMetric(this.systemHealth);
  }

  // HTTP request middleware
  httpRequestMiddleware() {
    return (req, res, next) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route ? req.route.path : req.path;

        this.httpRequestDuration
          .labels(req.method, route, res.statusCode)
          .observe(duration);

        this.httpRequestsTotal
          .labels(req.method, route, res.statusCode)
          .inc();
      });

      next();
    };
  }

  // Record memory operation
  recordMemoryOperation(operation, namespace, duration, success = true) {
    this.memoryOperationsTotal
      .labels(operation, namespace, success ? 'success' : 'error')
      .inc();

    if (duration !== undefined) {
      this.memoryOperationDuration
        .labels(operation, namespace)
        .observe(duration);
    }
  }

  // Update memory statistics
  updateMemoryStats(stats) {
    if (stats.keysByNamespace) {
      // Reset all namespace gauges
      this.memoryKeysGauge.reset();

      // Set current values
      stats.keysByNamespace.forEach(item => {
        this.memoryKeysGauge
          .labels(item.namespace)
          .set(item.count);
      });
    }

    if (stats.activeLocks !== undefined) {
      this.memoryLocksGauge.set(stats.activeLocks);
    }
  }

  // Record agent session
  recordAgentSession(agent, status, duration) {
    this.agentSessionsTotal
      .labels(agent, status)
      .inc();

    if (duration !== undefined) {
      this.agentProcessingDuration
        .labels(agent, 'process')
        .observe(duration);
    }
  }

  // Update active agent sessions
  updateActiveAgentSessions(agent, count) {
    this.agentActiveSessionsGauge
      .labels(agent)
      .set(count);
  }

  // Update task statistics
  updateTaskStats(tasksByStatus) {
    // Reset task gauges
    this.tasksTotal.reset();

    if (tasksByStatus) {
      tasksByStatus.forEach(item => {
        this.tasksTotal
          .labels(item.status, 'unknown', 'unknown')
          .set(item.count);
      });
    }
  }

  // Record task completion
  recordTaskCompletion(priority, category, hoursSpent) {
    this.taskCompletionTime
      .labels(priority, category)
      .observe(hoursSpent);
  }

  // Record database query
  recordDbQuery(operation, duration, success = true) {
    this.dbQueriesTotal
      .labels(operation, success ? 'success' : 'error')
      .inc();

    this.dbQueryDuration
      .labels(operation)
      .observe(duration);
  }

  // Update database connections
  updateDbConnections(active) {
    this.dbConnectionsActive.set(active);
  }

  // Update WebSocket connections
  updateWsConnections(active) {
    this.wsConnectionsActive.set(active);
  }

  // Record WebSocket message
  recordWsMessage(type, direction) {
    this.wsMessagesTotal
      .labels(type, direction)
      .inc();
  }

  // Record error
  recordError(type, component) {
    this.errorsTotal
      .labels(type, component)
      .inc();
  }

  // Update system health
  updateSystemHealth(component, healthy) {
    this.systemHealth
      .labels(component)
      .set(healthy ? 1 : 0);
  }

  // Get metrics for Prometheus endpoint
  async getMetrics() {
    return this.register.metrics();
  }

  // Update all system metrics
  async updateAllMetrics(memorySystem) {
    try {
      // Update system health
      this.updateSystemHealth('main', 1);
      this.updateSystemHealth('memory', memorySystem ? 1 : 0);

      // Get memory stats if available
      if (memorySystem) {
        const stats = await memorySystem.getStats();
        if (stats) {
          this.updateMemoryStats(stats);
          this.updateTaskStats(stats.tasksByStatus);
        }
      }
    } catch (error) {
      console.error('Error updating metrics:', error);
      this.recordError('metrics_update', 'monitoring');
    }
  }
}

module.exports = MonitoringManager;
