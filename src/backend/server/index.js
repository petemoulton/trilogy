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
const TrilogyLangGraphCheckpointer = require('../../shared/coordination/langgraph-checkpointer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const CONFIG = {
  port: process.env.PORT || 3100, // Use allocated port range 3100-3109
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
let langGraphCheckpointer;

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

// Initialize LangGraph Checkpointer
async function initLangGraphCheckpointer() {
  if (CONFIG.memoryBackend === 'postgresql') {
    langGraphCheckpointer = new TrilogyLangGraphCheckpointer(CONFIG.postgres, {
      enableTimeTravel: true,
      enableHumanApproval: true,
      maxConnections: 5
    });
    
    const initialized = await langGraphCheckpointer.initialize();
    if (initialized) {
      console.log('🧠 LangGraph PostgreSQL Checkpointer initialized');
      
      // Set up event handlers
      langGraphCheckpointer.on('thread:created', (data) => {
        broadcastToAllClients('langgraph:thread_created', data);
      });
      
      langGraphCheckpointer.on('checkpoint:saved', (data) => {
        broadcastToAllClients('langgraph:checkpoint_saved', data);
      });
      
      langGraphCheckpointer.on('approval:requested', (data) => {
        broadcastToAllClients('langgraph:approval_requested', data);
      });
      
    } else {
      console.log('⚠️ LangGraph checkpointer initialization failed, continuing without');
      langGraphCheckpointer = null;
    }
  } else {
    console.log('⚠️ LangGraph requires PostgreSQL backend');
    langGraphCheckpointer = null;
  }
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

  getDataPreview(data) {
    try {
      if (data === null || data === undefined) {
        return '[null/undefined]';
      }
      if (typeof data === 'string') {
        return data.length > 200 ? data.substring(0, 200) + '...' : data;
      }
      if (typeof data === 'object') {
        const jsonString = JSON.stringify(data);
        return jsonString.length > 200 ? jsonString.substring(0, 200) + '...' : jsonString;
      }
      return String(data).substring(0, 200);
    } catch (error) {
      return '[preview error]';
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
        dataPreview: this.getDataPreview(data)
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

// Route for professional dashboard
app.get('/professional', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dashboard/professional.html'));
});

// Handle favicon requests to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).send(); // No content, prevents 404
});

// Set professional dashboard as default
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dashboard/professional.html'));
});

// Route for agent orchestration dashboard - redirect to main dashboard with tab
app.get('/orchestration', (req, res) => {
  res.redirect('/?tab=agents');
});

// Route for intelligence analytics dashboard - redirect to main dashboard with tab
app.get('/analytics', (req, res) => {
  res.redirect('/?tab=intelligence');
});

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

// Projects API - Returns the mock project data
app.get('/api/projects', async (req, res) => {
  try {
    // Mock project data matching the exact structure from the debug session
    const projects = [
      {
        id: "project_1753680601011",
        name: "Test Project",
        status: "created",
        createdAt: "2025-01-28T05:30:01.011Z",
        updatedAt: "2025-01-28T05:30:01.011Z",
        description: "Bug fix validation",
        requirements: ["testing"]
      },
      {
        id: "project_1753680610447",
        name: "Test Project",
        status: "created",
        createdAt: "2025-01-28T05:30:10.447Z",
        updatedAt: "2025-01-28T05:30:10.447Z",
        description: "Bug fix validation test",
        requirements: ["testing"]
      },
      {
        id: "project_1753681338302",
        name: "test",
        status: "created",
        createdAt: "2025-01-28T05:42:18.302Z",
        updatedAt: "2025-01-28T05:42:18.302Z",
        description: "teds",
        requirements: []
      },
      {
        id: "project_1753681666301",
        name: "Test Project",
        status: "created",
        createdAt: "2025-01-28T05:47:46.301Z",
        updatedAt: "2025-01-28T05:47:46.301Z",
        description: "API Test",
        requirements: []
      },
      {
        id: "project_1753681947037",
        name: "456",
        status: "created",
        createdAt: "2025-01-28T05:52:27.037Z",
        updatedAt: "2025-01-28T05:52:27.037Z",
        description: "456",
        requirements: []
      },
      {
        id: "project_1753685200638",
        name: "fcx",
        status: "created",
        createdAt: "2025-01-28T06:46:40.638Z",
        updatedAt: "2025-01-28T06:46:40.638Z",
        description: "dfg",
        requirements: []
      },
      {
        id: "project_1753685845605",
        name: "2345",
        status: "created",
        createdAt: "2025-01-28T06:57:25.605Z",
        updatedAt: "2025-01-28T06:57:25.605Z",
        description: "3454356",
        requirements: []
      },
      {
        id: "project_1753686015882",
        name: "test 1",
        status: "created",
        createdAt: "2025-01-28T07:00:15.882Z",
        updatedAt: "2025-01-28T07:00:15.882Z",
        description: "test 2",
        requirements: []
      },
      {
        id: "project_1753687085419",
        name: "2f234",
        status: "created",
        createdAt: "2025-01-28T07:18:05.419Z",
        updatedAt: "2025-01-28T07:18:05.419Z",
        description: "fa4wef",
        requirements: []
      },
      {
        id: "project_1753687449583",
        name: "vbn",
        status: "created",
        createdAt: "2025-01-28T07:24:09.583Z",
        updatedAt: "2025-01-28T07:24:09.583Z",
        description: "vcbn",
        requirements: []
      },
      {
        id: "project_1753687671710",
        name: "test 10",
        status: "created",
        createdAt: "2025-01-28T07:27:51.710Z",
        updatedAt: "2025-01-28T07:27:51.710Z",
        description: "",
        requirements: []
      },
      {
        id: "project_1753688428318",
        name: "000",
        status: "created",
        createdAt: "2025-01-28T07:40:28.318Z",
        updatedAt: "2025-01-28T07:40:28.318Z",
        description: "999",
        requirements: []
      },
      {
        id: "project_1753688608696",
        name: "657",
        status: "created",
        createdAt: "2025-01-28T07:43:28.696Z",
        updatedAt: "2025-01-28T07:43:28.696Z",
        description: "567",
        requirements: []
      },
      {
        id: "project_1753689049758",
        name: "ghj",
        status: "created",
        createdAt: "2025-01-28T07:50:49.758Z",
        updatedAt: "2025-01-28T07:50:49.758Z",
        description: "jghj",
        requirements: []
      }
    ];
    
    res.json({ 
      success: true, 
      data: projects 
    });
  } catch (error) {
    console.error('[SERVER] Error in /api/projects:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
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
// Note: Full attachAgentRunner implementation is at the end of file

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

// ===========================================
// LANGGRAPH CHECKPOINTER API ENDPOINTS
// ===========================================

// Create a new LangGraph thread
app.post('/langgraph/threads', async (req, res) => {
  try {
    if (!langGraphCheckpointer) {
      return res.status(503).json({ success: false, error: 'LangGraph checkpointer not available' });
    }
    
    const { namespace, metadata } = req.body;
    const thread = await langGraphCheckpointer.createThread({ namespace, metadata });
    
    res.json({ 
      success: true, 
      thread 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get thread statistics
app.get('/langgraph/threads/stats', async (req, res) => {
  try {
    if (!langGraphCheckpointer) {
      return res.status(503).json({ success: false, error: 'LangGraph checkpointer not available' });
    }
    
    const stats = await langGraphCheckpointer.getThreadStats();
    
    res.json({ 
      success: true, 
      stats 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get checkpoint history for a thread
app.get('/langgraph/threads/:threadId/checkpoints', async (req, res) => {
  try {
    if (!langGraphCheckpointer) {
      return res.status(503).json({ success: false, error: 'LangGraph checkpointer not available' });
    }
    
    const { threadId } = req.params;
    const { limit = 10 } = req.query;
    
    const history = await langGraphCheckpointer.getCheckpointHistory(threadId, parseInt(limit));
    
    res.json({ 
      success: true, 
      threadId,
      history
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Revert thread to previous checkpoint
app.post('/langgraph/threads/:threadId/revert/:checkpointId', async (req, res) => {
  try {
    if (!langGraphCheckpointer) {
      return res.status(503).json({ success: false, error: 'LangGraph checkpointer not available' });
    }
    
    const { threadId, checkpointId } = req.params;
    
    const checkpoint = await langGraphCheckpointer.revertToCheckpoint(threadId, checkpointId);
    
    res.json({ 
      success: true, 
      threadId,
      checkpointId,
      checkpoint
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve pending action
app.post('/langgraph/approvals/:approvalId/approve', async (req, res) => {
  try {
    if (!langGraphCheckpointer) {
      return res.status(503).json({ success: false, error: 'LangGraph checkpointer not available' });
    }
    
    const { approvalId } = req.params;
    const { feedback = '' } = req.body;
    
    const approval = await langGraphCheckpointer.approveAction(approvalId, feedback);
    
    res.json({ 
      success: true, 
      approval
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reject pending action
app.post('/langgraph/approvals/:approvalId/reject', async (req, res) => {
  try {
    if (!langGraphCheckpointer) {
      return res.status(503).json({ success: false, error: 'LangGraph checkpointer not available' });
    }
    
    const { approvalId } = req.params;
    const { reason = '' } = req.body;
    
    const approval = await langGraphCheckpointer.rejectAction(approvalId, reason);
    
    res.json({ 
      success: true, 
      approval
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================================
// END LANGGRAPH API ENDPOINTS
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
    await initLangGraphCheckpointer();
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