require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const git = require('simple-git');
const { v4: uuidv4 } = require('uuid');
const PostgreSQLMemory = require('./database');
const runnerBridge = require('../../shared/runner-bridge');
const DependencyManager = require('../../shared/coordination/dependency-manager');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const CONFIG = {
  port: process.env.PORT || 8080,
  memoryBackend: process.env.MEMORY_BACKEND || 'postgresql',
  memoryPath: path.join(__dirname, '../../../memory'),
  logsPath: path.join(__dirname, '../../../logs'),
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'trilogy',
    user: process.env.POSTGRES_USER || 'trilogy',
    password: process.env.POSTGRES_PASSWORD || 'trilogy123'
  }
};

// Initialize Memory System
let memorySystem;
let dependencyManager;

async function initMemorySystem() {
  if (CONFIG.memoryBackend === 'postgresql') {
    memorySystem = new PostgreSQLMemory(CONFIG.postgres);
    const connected = await memorySystem.connect();
    if (!connected) {
      console.log('⚠️ PostgreSQL not available, using file-based memory');
      memorySystem = null;
    }
  } else {
    console.log('⚠️ Using file-based memory system');
    memorySystem = null;
  }
}

// Initialize Dependency Manager
async function initDependencyManager() {
  const memory = new TrilogyMemory();
  dependencyManager = new DependencyManager(memory, broadcastToAllClients);
  await dependencyManager.initializeDependencySystem();
  console.log('🔗 Dependency Resolution System initialized');
}

// Initialize Git repository
const gitRepo = git(CONFIG.logsPath);

// Memory Management
class TrilogyMemory {
  constructor() {
    this.memoryPath = CONFIG.memoryPath;
    this.ensureDirectories();
  }

  async ensureDirectories() {
    const dirs = [
      'prd', 'tasks/generated', 'tasks/final', 'tasks/dependencies',
      'observations/sessions', 'observations/macros', 
      'observations/screenshots', 'agents/sonnet', 
      'agents/opus', 'agents/shared'
    ];
    
    for (const dir of dirs) {
      await fs.ensureDir(path.join(this.memoryPath, dir));
    }
  }

  async acquireLock(namespace, key, ttl = 30000) {
    if (memorySystem) {
      return await memorySystem.acquireLock(namespace, key, ttl);
    }
    return true; // File-based fallback
  }

  async releaseLock(namespace, key) {
    if (memorySystem) {
      return await memorySystem.releaseLock(namespace, key);
    }
  }

  async read(namespace, key) {
    if (memorySystem) {
      return await memorySystem.read(namespace, key);
    }
    
    // File-based fallback
    const filePath = path.join(this.memoryPath, namespace, key);
    try {
      if (await fs.pathExists(filePath)) {
        const content = await fs.readFile(filePath, 'utf8');
        return key.endsWith('.json') ? JSON.parse(content) : content;
      }
      return null;
    } catch (error) {
      console.error(`Error reading ${namespace}/${key}:`, error);
      return null;
    }
  }

  async write(namespace, key, data) {
    if (memorySystem) {
      await memorySystem.write(namespace, key, data);
      await this.logToGit(namespace, key, 'write', data);
      return true;
    }

    // File-based fallback
    const lockAcquired = await this.acquireLock(namespace, key);
    if (!lockAcquired) {
      throw new Error(`Failed to acquire lock for ${namespace}/${key}`);
    }

    try {
      const filePath = path.join(this.memoryPath, namespace, key);
      const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      
      // Ensure directory exists
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf8');
      
      // Log to Git
      await this.logToGit(namespace, key, 'write', data);
      
      return true;
    } finally {
      await this.releaseLock(namespace, key);
    }
  }

  async logToGit(namespace, key, action, data) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        namespace,
        key,
        action,
        dataPreview: typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data).substring(0, 200)
      };

      const logFile = path.join(CONFIG.logsPath, `${namespace}_${key.replace(/[/\\]/g, '_')}.log`);
      await fs.ensureFile(logFile);
      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');

      // Git commit
      await gitRepo.add(logFile);
      await gitRepo.commit(`feat(${namespace}): ${action} on ${key}`, logFile);
    } catch (error) {
      console.error('Git logging error:', error);
    }
  }
}

const memory = new TrilogyMemory();

// WebSocket broadcast function
function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend/dashboard')));

// API Routes
app.get('/health', async (req, res) => {
  const stats = memorySystem ? await memorySystem.getStats() : null;
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    memoryBackend: CONFIG.memoryBackend,
    postgresql: !!memorySystem,
    memory: 'active',
    stats
  });
});

// Memory API
app.get('/memory/:namespace/:key', async (req, res) => {
  try {
    const { namespace, key } = req.params;
    const data = await memory.read(namespace, key);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/memory/:namespace/:key', async (req, res) => {
  try {
    const { namespace, key } = req.params;
    const { data } = req.body;
    await memory.write(namespace, key, data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Agent Pool API
app.get('/agents/pool/status', async (req, res) => {
  try {
    const poolStats = runnerBridge.getPoolStats();
    const allStatuses = runnerBridge.getAllAgentStatuses();
    res.json({ 
      success: true, 
      poolStats,
      agents: allStatuses,
      runnerAttached: runnerBridge.isRunnerAttached()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/agents/pool/spawn', async (req, res) => {
  try {
    const { role, capabilities = [], config = {} } = req.body;
    
    if (!role) {
      return res.status(400).json({ success: false, error: 'Role is required' });
    }

    if (runnerBridge.isRunnerAttached()) {
      const agentId = await runnerBridge.spawnAgent(role, capabilities, config);
      
      // Broadcast to connected clients
      broadcast({
        type: 'agent_spawned',
        data: { agentId, role, capabilities }
      });

      res.json({ success: true, agentId, role, capabilities });
    } else {
      res.status(503).json({ success: false, error: 'Agent runner not available' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/agents/pool/:agentId/status', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    if (global.agentRunner) {
      const status = global.agentRunner.getAgentPool().getAgentStatus(agentId);
      if (status) {
        res.json({ success: true, status });
      } else {
        res.status(404).json({ success: false, error: 'Agent not found' });
      }
    } else {
      res.status(503).json({ success: false, error: 'Agent runner not available' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/agents/pool/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    if (global.agentRunner) {
      await global.agentRunner.getAgentPool().removeAgent(agentId);
      
      // Broadcast to connected clients
      broadcast({
        type: 'agent_removed',
        data: { agentId }
      });

      res.json({ success: true, message: `Agent ${agentId} removed` });
    } else {
      res.status(503).json({ success: false, error: 'Agent runner not available' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/agents/pool/:agentId/assign', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { task } = req.body;
    
    if (!task) {
      return res.status(400).json({ success: false, error: 'Task is required' });
    }

    if (global.agentRunner) {
      const taskId = await global.agentRunner.getAgentPool().assignTask(agentId, {
        id: task.id || uuidv4(),
        ...task
      });
      
      // Broadcast to connected clients
      broadcast({
        type: 'task_assigned',
        data: { agentId, taskId, task }
      });

      res.json({ success: true, taskId, agentId });
    } else {
      res.status(503).json({ success: false, error: 'Agent runner not available' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Agent Runner Attachment API
app.post('/agents/runner/attach', async (req, res) => {
  try {
    console.log('🔗 Agent runner attempting to attach...');
    
    // Broadcast runner attachment to all connected clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'runner_attached',
          data: { status: 'attached', timestamp: new Date().toISOString() }
        }));
      }
    });
    
    res.json({ success: true, message: 'Runner attachment acknowledged' });
    console.log('✅ Agent runner attachment acknowledged');
  } catch (error) {
    console.error('❌ Failed to attach runner:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Function to attach agent runner directly (for same-process communication)
function attachAgentRunner(runner) {
  runnerBridge.attachRunner(runner);
  console.log('🔗 Agent runner attached via bridge');
}

// Traditional Agent API (existing functionality)
app.post('/agents/trigger/:agent', async (req, res) => {
  try {
    const { agent } = req.params;
    const { input } = req.body;
    
    const sessionId = uuidv4();
    const trigger = {
      sessionId,
      agent,
      input,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    await memory.write('agents/shared', `trigger_${sessionId}.json`, trigger);
    
    // Broadcast to WebSocket clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'agent_trigger',
          data: trigger
        }));
      }
    });

    res.json({ success: true, sessionId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================================
// MILESTONE 2: TEAM LEAD API ENDPOINTS
// ===========================================

// PRD Analysis
app.post('/teamlead/analyze-prd', async (req, res) => {
  try {
    const { prdContent } = req.body;
    
    if (!prdContent) {
      return res.status(400).json({ success: false, error: 'PRD content is required' });
    }

    if (runnerBridge.isRunnerAttached()) {
      // Get Opus agent (Team Lead)
      const teamLeadResponse = await runnerBridge.sendToAgent('opus', {
        type: 'analyze_prd',
        prdContent
      });

      // Broadcast analysis complete
      broadcast({
        type: 'prd_analysis_complete',
        data: teamLeadResponse
      });

      res.json({ success: true, analysis: teamLeadResponse });
    } else {
      res.status(503).json({ success: false, error: 'Team Lead (Opus agent) not available' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Task Allocation
app.post('/teamlead/allocate-tasks', async (req, res) => {
  try {
    const { tasks } = req.body;
    
    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ success: false, error: 'Tasks array is required' });
    }

    if (runnerBridge.isRunnerAttached()) {
      // Get current agent pool
      const agentPoolStatus = runnerBridge.getPoolStats();
      const allAgents = runnerBridge.getAllAgentStatuses();
      
      // Send to Team Lead for allocation
      const allocationResponse = await runnerBridge.sendToAgent('opus', {
        type: 'allocate_tasks',
        tasks,
        agentPool: allAgents
      });

      // Broadcast allocation complete
      broadcast({
        type: 'task_allocation_complete',
        data: allocationResponse
      });

      res.json({ success: true, allocation: allocationResponse });
    } else {
      res.status(503).json({ success: false, error: 'Team Lead (Opus agent) not available' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Task Allocation Status
app.get('/teamlead/allocation-status', async (req, res) => {
  try {
    const allocation = await memory.read('tasks', 'allocation.json');
    const analysis = await memory.read('prd', 'analysis.json');
    
    res.json({ 
      success: true, 
      allocation: allocation?.data || null,
      analysis: analysis?.data || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================================
// MILESTONE 3 API ENDPOINTS - DEPENDENCY RESOLUTION
// ===========================================

// Register a new task with dependencies
app.post('/dependencies/tasks/register', async (req, res) => {
  try {
    const { taskId, dependencies = [], agentId, taskData = {} } = req.body;
    
    if (!taskId) {
      return res.status(400).json({ success: false, error: 'taskId is required' });
    }

    // Don't await the task promise - it only resolves when the task completes
    const taskPromise = dependencyManager.registerTask(taskId, dependencies, agentId, taskData);
    
    res.json({ 
      success: true, 
      taskId,
      dependencies,
      status: 'registered',
      metadata: dependencyManager.getTaskMetadata(taskId)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start task execution
app.post('/dependencies/tasks/:taskId/start', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { agentId } = req.body;
    
    if (!agentId) {
      return res.status(400).json({ success: false, error: 'agentId is required' });
    }

    // Don't await the task promise - just start it
    const taskPromise = dependencyManager.startTask(taskId, agentId);
    
    res.json({ 
      success: true, 
      taskId,
      agentId,
      status: 'started',
      metadata: dependencyManager.getTaskMetadata(taskId)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Complete a task
app.post('/dependencies/tasks/:taskId/complete', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { result } = req.body;
    
    await dependencyManager.completeTask(taskId, result);
    
    res.json({ 
      success: true, 
      taskId,
      status: 'completed',
      metadata: dependencyManager.getTaskMetadata(taskId)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fail a task
app.post('/dependencies/tasks/:taskId/fail', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { error: errorMessage } = req.body;
    
    await dependencyManager.failTask(taskId, new Error(errorMessage || 'Task failed'));
    
    res.json({ 
      success: true, 
      taskId,
      status: 'failed',
      metadata: dependencyManager.getTaskMetadata(taskId)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get task status and metadata
app.get('/dependencies/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const metadata = dependencyManager.getTaskMetadata(taskId);
    
    if (!metadata) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    
    res.json({ 
      success: true, 
      task: metadata,
      canStart: await dependencyManager.canTaskStart(taskId)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get dependency chain for a task
app.get('/dependencies/tasks/:taskId/chain', async (req, res) => {
  try {
    const { taskId } = req.params;
    const chain = dependencyManager.getDependencyChain(taskId);
    
    res.json({ 
      success: true, 
      chain
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get system status
app.get('/dependencies/status', async (req, res) => {
  try {
    const status = dependencyManager.getSystemStatus();
    
    res.json({ 
      success: true, 
      dependencySystem: status
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Force complete a task (emergency override)
app.post('/dependencies/tasks/:taskId/force-complete', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { result, reason } = req.body;
    
    console.warn(`[API] Force completing task ${taskId}. Reason: ${reason || 'Not provided'}`);
    
    await dependencyManager.forceCompleteTask(taskId, result);
    
    res.json({ 
      success: true, 
      taskId,
      status: 'force-completed',
      warning: 'Task was manually force-completed',
      metadata: dependencyManager.getTaskMetadata(taskId)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================================
// END MILESTONE 3 API ENDPOINTS
// ===========================================

// WebSocket broadcast function
function broadcastToAllClients(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// WebSocket handling
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      console.log('WebSocket message:', message);
      
      // Handle different message types
      switch (message.type) {
        case 'memory_update':
          await memory.write(message.namespace, message.key, message.data);
          break;
        case 'agent_response':
          await memory.write('agents/shared', `response_${message.sessionId}.json`, message.data);
          break;
      }
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

// Initialize and start server
async function start() {
  try {
    await initMemorySystem();
    await initDependencyManager();
    await fs.ensureDir(CONFIG.logsPath);
    await gitRepo.init();
    
    // Copy PRD to memory
    const prdPath = path.join(__dirname, '../../../docs/design/trilogy_prd.md');
    if (await fs.pathExists(prdPath)) {
      const prdContent = await fs.readFile(prdPath, 'utf8');
      await memory.write('prd', 'active.md', prdContent);
    }

    server.listen(CONFIG.port, () => {
      console.log(`🚀 Trilogy AI System running on port ${CONFIG.port}`);
      console.log(`📊 Dashboard: http://localhost:${CONFIG.port}`);
      console.log(`🔗 API: http://localhost:${CONFIG.port}/health`);
      console.log(`🧠 Memory: ${CONFIG.memoryPath}`);
      console.log(`📝 Logs: ${CONFIG.logsPath}`);
      console.log(`🤖 Agent Pool API: http://localhost:${CONFIG.port}/agents/pool/status`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Function to attach agent runner globally for API access
function attachAgentRunner(runner) {
  global.agentRunner = runner;
  
  // Set up agent pool event forwarding to WebSocket clients
  if (runner && runner.getAgentPool) {
    const pool = runner.getAgentPool();
    
    pool.on('agent_spawned', (data) => {
      broadcast({ type: 'pool_agent_spawned', data });
    });
    
    pool.on('agent_status_change', (data) => {
      broadcast({ type: 'pool_agent_status_change', data });
    });
    
    pool.on('agent_task_completed', (data) => {
      broadcast({ type: 'pool_task_completed', data });
    });
    
    pool.on('agent_error', (data) => {
      broadcast({ type: 'pool_agent_error', data });
    });
  }
}

start();

module.exports = { app, memory, attachAgentRunner };