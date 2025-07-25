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

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const CONFIG = {
  port: process.env.PORT || 8080,
  memoryBackend: process.env.MEMORY_BACKEND || 'postgresql',
  memoryPath: path.join(__dirname, '../memory'),
  logsPath: path.join(__dirname, '../logs'),
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
      'prd', 'tasks/generated', 'tasks/final', 
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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dashboard')));

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

// Agent API
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
    await fs.ensureDir(CONFIG.logsPath);
    await gitRepo.init();
    
    // Copy PRD to memory
    const prdPath = path.join(__dirname, '../trilogy_prd.md');
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
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

module.exports = { app, memory };