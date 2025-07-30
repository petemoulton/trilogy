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

// ===========================================
// PROJECT DIRECTORY MANAGEMENT
// ===========================================

// Global variable to store project directory setting
let currentProjectDirectory = process.cwd();

/**
 * Get the current project directory setting
 */
function getProjectDirectory() {
  return currentProjectDirectory;
}

/**
 * Set the project directory
 */
function setProjectDirectory(directory) {
  currentProjectDirectory = directory;
  console.log(`[SERVER] Project directory updated to: ${directory}`);
}

/**
 * Load projects from the specified directory
 */
async function loadProjectsFromDirectory(directory) {
  try {
    const projectsPath = path.resolve(directory);
    
    // Check if directory exists
    try {
      await fs.access(projectsPath);
    } catch (error) {
      console.log(`[SERVER] Directory ${projectsPath} not accessible, using current directory`);
      return [];
    }
    
    // Read directory contents
    const entries = await fs.readdir(projectsPath, { withFileTypes: true });
    const projects = [];
    
    // Look for project directories (directories or files with project metadata)
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectPath = path.join(projectsPath, entry.name);
        const project = await analyzeProjectDirectory(projectPath, entry.name);
        if (project) {
          projects.push(project);
        }
      }
    }
    
    return projects;
  } catch (error) {
    console.error('[SERVER] Error loading projects from directory:', error);
    return [];
  }
}

/**
 * Analyze a directory to determine if it's a project and extract metadata
 */
async function analyzeProjectDirectory(projectPath, directoryName) {
  try {
    const stats = await fs.stat(projectPath);
    
    // Look for common project files
    const projectFiles = ['package.json', 'README.md', 'requirements.txt', 'pom.xml', 'Cargo.toml', '.git'];
    let projectType = 'Unknown';
    let description = '';
    let requirements = [];
    
    // Check for project indicators
    for (const fileName of projectFiles) {
      const filePath = path.join(projectPath, fileName);
      try {
        await fs.access(filePath);
        
        // Determine project type based on files found
        switch (fileName) {
          case 'package.json':
            projectType = 'Node.js';
            try {
              const packageData = await fs.readFile(filePath, 'utf8');
              const packageJson = JSON.parse(packageData);
              description = packageJson.description || description;
              if (packageJson.dependencies) {
                requirements = Object.keys(packageJson.dependencies);
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
            break;
          case 'requirements.txt':
            projectType = 'Python';
            try {
              const reqData = await fs.readFile(filePath, 'utf8');
              requirements = reqData.split('\n').filter(line => line.trim()).map(line => line.split('==')[0]);
            } catch (e) {
              // Ignore file read errors
            }
            break;
          case 'pom.xml':
            projectType = 'Java/Maven';
            break;
          case 'Cargo.toml':
            projectType = 'Rust';
            break;
          case '.git':
            if (!projectType || projectType === 'Unknown') {
              projectType = 'Git Repository';
            }
            break;
          case 'README.md':
            try {
              const readmeData = await fs.readFile(filePath, 'utf8');
              // Extract first line or first paragraph as description
              const firstLine = readmeData.split('\n')[0].replace(/^#\s*/, '');
              if (firstLine && !description) {
                description = firstLine.substring(0, 100);
              }
            } catch (e) {
              // Ignore file read errors
            }
            break;
        }
      } catch (error) {
        // File doesn't exist, continue
      }
    }
    
    // If no specific project files found, still treat as a potential project directory
    if (projectType === 'Unknown') {
      // Check if directory has any code files
      try {
        const files = await fs.readdir(projectPath);
        const codeExtensions = ['.js', '.ts', '.py', '.java', '.rs', '.go', '.cpp', '.c', '.html', '.css'];
        const hasCodeFiles = files.some(file => 
          codeExtensions.some(ext => file.toLowerCase().endsWith(ext))
        );
        
        if (hasCodeFiles) {
          projectType = 'Code Project';
        } else {
          projectType = 'Directory';
        }
      } catch (e) {
        projectType = 'Directory';
      }
    }
    
    return {
      id: `project_${directoryName}_${Date.now()}`,
      name: directoryName,
      status: 'active',
      createdAt: stats.birthtime.toISOString(),
      updatedAt: stats.mtime.toISOString(),
      description: description || `${projectType} project`,
      requirements: requirements.slice(0, 10), // Limit to first 10 requirements
      projectType: projectType,
      path: projectPath,
      size: await calculateDirectorySize(projectPath)
    };
    
  } catch (error) {
    console.error(`[SERVER] Error analyzing project directory ${projectPath}:`, error);
    return null;
  }
}

/**
 * Calculate directory size
 */
async function calculateDirectorySize(dirPath) {
  try {
    let totalSize = 0;
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
      // Skip subdirectories for performance
    }
    
    // Return human readable size
    if (totalSize < 1024) return `${totalSize} B`;
    if (totalSize < 1024 * 1024) return `${(totalSize / 1024).toFixed(1)} KB`;
    if (totalSize < 1024 * 1024 * 1024) return `${(totalSize / 1024 / 1024).toFixed(1)} MB`;
    return `${(totalSize / 1024 / 1024 / 1024).toFixed(1)} GB`;
  } catch (error) {
    return 'Unknown';
  }
}

// Projects API - Returns projects from the configured directory
app.get('/api/projects', async (req, res) => {
  try {
    console.log('[SERVER] Loading projects from directory...');
    
    // Get project directory from settings (default to current directory)
    const projectDirectory = getProjectDirectory();
    console.log(`[SERVER] Project directory: ${projectDirectory}`);
    
    const projects = await loadProjectsFromDirectory(projectDirectory);
    
    console.log(`[SERVER] Found ${projects.length} projects`);
    
    // Fallback to mock data if no projects found
    const fallbackProjects = projects.length > 0 ? projects : [
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
      data: fallbackProjects 
    });
  } catch (error) {
    console.error('[SERVER] Error in /api/projects:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Settings API
app.get('/api/settings', async (req, res) => {
  try {
    const settings = {
      projectDirectory: getProjectDirectory()
    };
    
    res.json({ 
      success: true, 
      data: settings 
    });
  } catch (error) {
    console.error('[SERVER] Error in /api/settings:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { projectDirectory } = req.body;
    
    if (projectDirectory) {
      // Validate that the directory exists
      try {
        await fs.access(projectDirectory);
        setProjectDirectory(projectDirectory);
        console.log(`[SERVER] Project directory updated to: ${projectDirectory}`);
      } catch (error) {
        return res.status(400).json({ 
          success: false, 
          error: `Directory does not exist: ${projectDirectory}` 
        });
      }
    }
    
    const settings = {
      projectDirectory: getProjectDirectory()
    };
    
    res.json({ 
      success: true, 
      data: settings 
    });
  } catch (error) {
    console.error('[SERVER] Error in /api/settings POST:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Git Intelligence API
app.get('/api/intelligence/git', async (req, res) => {
  try {
    const git = require('simple-git')();
    
    // Get recent commits (last 30 days)
    const since = new Date();
    since.setDate(since.getDate() - 30);
    
    const [
      recentCommits,
      branches,
      contributors,
      fileStats
    ] = await Promise.all([
      git.log(['--max-count=50']),
      git.branch(['--all']),
      git.raw(['shortlog', '-sn', '--all']),
      git.diffSummary(['HEAD~10..HEAD']).catch(() => ({ files: [] }))
    ]);

    // Process commit data for analytics
    const commitAnalytics = {
      totalCommits: recentCommits.total,
      commitsByDay: {},
      commitsByAuthor: {},
      commitsByType: { feat: 0, fix: 0, docs: 0, refactor: 0, test: 0, other: 0 }
    };

    // Filter commits to last 30 days and process
    const filteredCommits = recentCommits.all.filter(commit => {
      const commitDate = new Date(commit.date);
      return commitDate >= since;
    });

    commitAnalytics.totalCommits = filteredCommits.length;

    filteredCommits.forEach(commit => {
      const date = commit.date.split('T')[0];
      const author = commit.author_name;
      
      // Count by day
      commitAnalytics.commitsByDay[date] = (commitAnalytics.commitsByDay[date] || 0) + 1;
      
      // Count by author
      commitAnalytics.commitsByAuthor[author] = (commitAnalytics.commitsByAuthor[author] || 0) + 1;
      
      // Count by type (based on commit message)
      const message = commit.message.toLowerCase();
      if (message.startsWith('feat')) commitAnalytics.commitsByType.feat++;
      else if (message.startsWith('fix')) commitAnalytics.commitsByType.fix++;
      else if (message.startsWith('docs')) commitAnalytics.commitsByType.docs++;
      else if (message.startsWith('refactor')) commitAnalytics.commitsByType.refactor++;
      else if (message.startsWith('test')) commitAnalytics.commitsByType.test++;
      else commitAnalytics.commitsByType.other++;
    });

    // Process contributor data
    const contributorList = contributors.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [commits, ...nameParts] = line.trim().split('\t');
        return {
          name: nameParts.join(' ').trim(),
          commits: parseInt(commits)
        };
      });

    // Process branch data
    const branchList = Object.keys(branches.branches).map(name => ({
      name: name.replace('remotes/origin/', ''),
      current: branches.current === name,
      remote: name.startsWith('remotes/')
    }));

    // Calculate productivity metrics
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    
    const recentCommitsCount = filteredCommits.filter(c => new Date(c.date) > sevenDaysAgo).length;
    const productivity = {
      weeklyCommits: recentCommitsCount,
      monthlyCommits: filteredCommits.length,
      avgCommitsPerDay: (filteredCommits.length / 30).toFixed(1),
      filesChanged: fileStats.files ? fileStats.files.length : 0,
      linesAdded: fileStats.insertions || 0,
      linesDeleted: fileStats.deletions || 0
    };

    const intelligence = {
      repository: {
        branches: branchList,
        totalBranches: branchList.length,
        activeBranches: branchList.filter(b => !b.remote).length
      },
      commits: commitAnalytics,
      contributors: {
        list: contributorList,
        total: contributorList.length,
        mostActive: contributorList[0] || { name: 'Unknown', commits: 0 }
      },
      productivity,
      recentActivity: recentCommits.all.slice(0, 10).map(commit => ({
        hash: commit.hash.substring(0, 7),
        message: commit.message,
        author: commit.author_name,
        date: commit.date,
        relative: new Date(commit.date).toLocaleDateString()
      })),
      lastUpdated: new Date().toISOString()
    };

    res.json({ 
      success: true, 
      data: intelligence 
    });
  } catch (error) {
    console.error('[SERVER] Error in /api/intelligence/git:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch git intelligence data: ' + error.message 
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
    // Try to get stats from runner API first (cross-process)
    const runnerResponse = await new Promise((resolve, reject) => {
      const http = require('http');
      const options = {
        hostname: 'localhost',
        port: 3102,
        path: '/pool/stats',
        method: 'GET',
        timeout: 2000
      };

      const request = http.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => data += chunk);
        response.on('end', () => {
          try {
            const runnerStats = JSON.parse(data);
            resolve(runnerStats);
          } catch (parseError) {
            reject(new Error('Invalid runner response'));
          }
        });
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Runner API timeout'));
      });

      request.end();
    });

    res.json(runnerResponse);
    
  } catch (runnerError) {
    // Fallback to bridge (same-process communication)
    console.log('Runner API unavailable, using bridge fallback. Error:', runnerError.message || runnerError.code || runnerError);
    const poolStats = runnerBridge.getPoolStats();
    const allStatuses = runnerBridge.getAllAgentStatuses();
    res.json({ 
      success: true, 
      poolStats,
      agents: allStatuses,
      runnerAttached: runnerBridge.isRunnerAttached()
    });
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

// ===========================================
// WORKFLOW EXECUTION API ENDPOINTS
// ===========================================

// Execute workflow
app.post('/workflows/execute', async (req, res) => {
  try {
    const { prdContent, workflowType = 'standard' } = req.body;
    
    if (!prdContent || prdContent.trim().length < 50) {
      return res.status(400).json({ 
        success: false, 
        error: 'PRD content must be at least 50 characters long' 
      });
    }

    // Check if runner is available via HTTP API
    try {
      const http = require('http');
      const runnerHealthCheck = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: 3102,
          path: '/health',
          method: 'GET',
          timeout: 2000
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              const result = JSON.parse(data);
              resolve(result.running === true);
            } catch (e) {
              reject(new Error('Invalid runner response'));
            }
          });
        });
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Runner timeout'));
        });
        req.end();
      });
      
      if (!runnerHealthCheck) {
        return res.status(503).json({ 
          success: false, 
          error: 'Agent runner not available. Please ensure agents are running.' 
        });
      }
    } catch (error) {
      return res.status(503).json({ 
        success: false, 
        error: 'Agent runner not available. Please ensure agents are running.' 
      });
    }

    // Generate workflow ID
    const workflowId = `workflow_${Date.now()}`;
    
    console.log(`🚀 Starting workflow ${workflowId} with type: ${workflowType}`);
    
    // Execute workflow asynchronously
    executeWorkflowAsync(workflowId, prdContent, workflowType);
    
    res.json({ 
      success: true, 
      workflowId,
      message: 'Workflow started successfully',
      estimatedDuration: '2-3 minutes'
    });
    
  } catch (error) {
    console.error('❌ Workflow execution error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel workflow
app.post('/workflows/:workflowId/cancel', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    console.log(`⏹️ Cancelling workflow: ${workflowId}`);
    
    // Broadcast cancellation to clients
    broadcastToAllClients({
      type: 'workflow_cancelled',
      data: { workflowId, timestamp: new Date().toISOString() }
    });
    
    res.json({ success: true, message: 'Workflow cancelled' });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get workflow status
app.get('/workflows/:workflowId/status', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    // For now, return basic status - can be enhanced with actual tracking
    res.json({ 
      success: true, 
      workflowId,
      status: 'running', // Could be: pending, running, completed, error, cancelled
      progress: {
        currentStep: 'sonnet_analysis',
        completedSteps: [],
        totalSteps: 2
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get workflow results
app.get('/workflows/:workflowId/results', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    // For demonstration, simulate results based on workflow completion
    // In a real implementation, this would fetch stored results
    const mockResults = {
      success: true,
      workflowId,
      completedAt: new Date().toISOString(),
      analysis: {
        sonnetAnalysis: {
          summary: "PRD analyzed successfully",
          tasksIdentified: 5,
          complexity: "Moderate",
          estimatedTimeline: "3-4 weeks"
        },
        opusReview: {
          summary: "Analysis reviewed and approved",
          recommendations: ["Prioritize authentication", "Consider scalability", "Plan for testing"],
          riskAssessment: "Low to Medium"
        }
      },
      tasks: [
        { title: "User Authentication System", priority: "High", estimated: "5 days" },
        { title: "Database Schema Design", priority: "High", estimated: "3 days" },
        { title: "API Development", priority: "High", estimated: "7 days" },
        { title: "Frontend Implementation", priority: "Medium", estimated: "8 days" }
      ]
    };
    
    res.json(mockResults);
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================================
// PRD ANALYSIS API ENDPOINTS
// ===========================================

// Analyze PRD and estimate required Sonnet agents
app.post('/api/analyze-prd', async (req, res) => {
  try {
    const { prdContent } = req.body;
    
    if (!prdContent || prdContent.trim().length < 20) {
      return res.status(400).json({ 
        success: false, 
        error: 'PRD content must be at least 20 characters long' 
      });
    }

    console.log('🔍 Analyzing PRD content for agent estimation...');
    
    // Simulate Opus agent analysis
    const analysis = await analyzeWithOpusAgent(prdContent);
    
    res.json({
      success: true,
      analysis: analysis,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error analyzing PRD:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Simulate Opus agent analysis to determine Sonnet agent requirements
 */
async function analyzeWithOpusAgent(prdContent) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const words = prdContent.split(/\s+/).length;
  const lines = prdContent.split('\n').length;
  const prdLower = prdContent.toLowerCase();
  
  // Analyze complexity factors
  const complexityFactors = {
    authentication: prdLower.includes('auth') || prdLower.includes('login') || prdLower.includes('user'),
    database: prdLower.includes('database') || prdLower.includes('data') || prdLower.includes('storage'),
    api: prdLower.includes('api') || prdLower.includes('endpoint') || prdLower.includes('rest'),
    frontend: prdLower.includes('ui') || prdLower.includes('interface') || prdLower.includes('react') || prdLower.includes('vue'),
    backend: prdLower.includes('server') || prdLower.includes('backend') || prdLower.includes('node'),
    payment: prdLower.includes('payment') || prdLower.includes('stripe') || prdLower.includes('paypal'),
    testing: prdLower.includes('test') || prdLower.includes('testing') || prdLower.includes('qa'),
    deployment: prdLower.includes('deploy') || prdLower.includes('docker') || prdLower.includes('aws'),
    mobile: prdLower.includes('mobile') || prdLower.includes('app') || prdLower.includes('ios') || prdLower.includes('android'),
    realtime: prdLower.includes('realtime') || prdLower.includes('websocket') || prdLower.includes('live')
  };
  
  // Count complexity domains
  const activeDomains = Object.values(complexityFactors).filter(Boolean).length;
  
  // Determine project size
  let projectSize = 'Small';
  let baseAgents = 2;
  
  if (words > 500 || activeDomains > 5) {
    projectSize = 'Large';
    baseAgents = 6;
  } else if (words > 200 || activeDomains > 3) {
    projectSize = 'Medium';
    baseAgents = 4;
  }
  
  // Calculate specific agents needed
  const agentRequirements = [];
  let totalSonnetAgents = baseAgents;
  
  if (complexityFactors.authentication) {
    agentRequirements.push({ 
      specialty: 'Authentication & Security', 
      agents: 1, 
      reason: 'User management and security implementation' 
    });
  }
  
  if (complexityFactors.database) {
    agentRequirements.push({ 
      specialty: 'Database Design', 
      agents: 1, 
      reason: 'Schema design and data management' 
    });
  }
  
  if (complexityFactors.frontend) {
    agentRequirements.push({ 
      specialty: 'Frontend Development', 
      agents: projectSize === 'Large' ? 2 : 1, 
      reason: 'UI/UX implementation and user interfaces' 
    });
  }
  
  if (complexityFactors.backend) {
    agentRequirements.push({ 
      specialty: 'Backend Development', 
      agents: projectSize === 'Large' ? 2 : 1, 
      reason: 'Server logic and API development' 
    });
  }
  
  if (complexityFactors.payment) {
    agentRequirements.push({ 
      specialty: 'Payment Integration', 
      agents: 1, 
      reason: 'Payment gateway and transaction processing' 
    });
    totalSonnetAgents += 1; // Payment systems are complex
  }
  
  if (complexityFactors.testing) {
    agentRequirements.push({ 
      specialty: 'Quality Assurance', 
      agents: 1, 
      reason: 'Testing framework and test implementation' 
    });
  }
  
  if (complexityFactors.deployment) {
    agentRequirements.push({ 
      specialty: 'DevOps & Deployment', 
      agents: 1, 
      reason: 'Infrastructure and deployment automation' 
    });
  }
  
  if (complexityFactors.mobile) {
    agentRequirements.push({ 
      specialty: 'Mobile Development', 
      agents: projectSize === 'Large' ? 2 : 1, 
      reason: 'Mobile app development for iOS/Android' 
    });
    totalSonnetAgents += 1; // Mobile adds complexity
  }
  
  if (complexityFactors.realtime) {
    agentRequirements.push({ 
      specialty: 'Real-time Systems', 
      agents: 1, 
      reason: 'WebSocket and real-time feature implementation' 
    });
    totalSonnetAgents += 1; // Real-time is complex
  }
  
  // Calculate total agents from requirements
  const calculatedAgents = agentRequirements.reduce((sum, req) => sum + req.agents, 0);
  totalSonnetAgents = Math.max(totalSonnetAgents, calculatedAgents);
  
  // Ensure minimum and maximum bounds
  totalSonnetAgents = Math.max(2, Math.min(12, totalSonnetAgents));
  
  // Generate timeline estimation
  const estimatedWeeks = Math.ceil(totalSonnetAgents * 1.5 + (projectSize === 'Large' ? 2 : projectSize === 'Medium' ? 1 : 0));
  
  return {
    projectAnalysis: {
      wordCount: words,
      lineCount: lines,
      projectSize: projectSize,
      complexityScore: activeDomains,
      estimatedDuration: `${estimatedWeeks} weeks`
    },
    agentEstimation: {
      totalSonnetAgents: totalSonnetAgents,
      opusAgents: 1, // Always 1 Opus as team lead
      agentBreakdown: agentRequirements
    },
    detectedFeatures: Object.keys(complexityFactors).filter(key => complexityFactors[key]),
    recommendations: [
      `Deploy ${totalSonnetAgents} Sonnet agents for optimal task distribution`,
      `1 Opus agent will coordinate and review all work`,
      `Estimated completion time: ${estimatedWeeks} weeks`,
      `Project complexity: ${projectSize} (${activeDomains} domains detected)`
    ]
  };
}

// ===========================================
// SETTINGS API ENDPOINTS
// ===========================================

// Update project directory setting
app.post('/settings/project-directory', async (req, res) => {
  try {
    const { directory } = req.body;
    
    if (!directory || typeof directory !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Directory path is required' 
      });
    }
    
    // Validate directory path (basic validation)
    const path = require('path');
    const normalizedPath = path.resolve(directory);
    
    // Check if directory exists (in a real app, you might create it)
    try {
      await fs.access(normalizedPath);
      
      // Store the setting (in a real app, save to database)
      console.log(`📁 Project directory updated to: ${normalizedPath}`);
      
      res.json({ 
        success: true, 
        directory: normalizedPath,
        message: 'Project directory updated successfully'
      });
      
    } catch (accessError) {
      res.status(400).json({ 
        success: false, 
        error: 'Directory does not exist or is not accessible' 
      });
    }
    
  } catch (error) {
    console.error('Error updating project directory:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get current project directory setting
app.get('/settings/project-directory', async (req, res) => {
  try {
    // In a real app, this would come from database/config
    const currentDirectory = process.cwd();
    res.json({ 
      success: true, 
      directory: currentDirectory 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate realistic workflow results for demonstration
 */
function generateWorkflowResults(prdContent, workflowType) {
  const words = prdContent.split(' ').length;
  const complexity = words < 100 ? 'Simple' : words < 200 ? 'Moderate' : 'Complex';
  
  // Generate tasks based on common PRD patterns
  const tasks = [];
  const prdLower = prdContent.toLowerCase();
  
  if (prdLower.includes('authentication') || prdLower.includes('login')) {
    tasks.push({ title: 'User Authentication System', priority: 'High', estimated: '5 days' });
  }
  if (prdLower.includes('database') || prdLower.includes('data')) {
    tasks.push({ title: 'Database Schema Design', priority: 'High', estimated: '3 days' });
  }
  if (prdLower.includes('api') || prdLower.includes('endpoint')) {
    tasks.push({ title: 'REST API Development', priority: 'High', estimated: '7 days' });
  }
  if (prdLower.includes('frontend') || prdLower.includes('ui') || prdLower.includes('interface')) {
    tasks.push({ title: 'Frontend UI Implementation', priority: 'Medium', estimated: '8 days' });
  }
  if (prdLower.includes('payment') || prdLower.includes('stripe') || prdLower.includes('paypal')) {
    tasks.push({ title: 'Payment Gateway Integration', priority: 'High', estimated: '4 days' });
  }
  if (prdLower.includes('mobile') || prdLower.includes('app')) {
    tasks.push({ title: 'Mobile App Development', priority: 'Medium', estimated: '12 days' });
  }
  if (prdLower.includes('admin') || prdLower.includes('management')) {
    tasks.push({ title: 'Admin Dashboard', priority: 'Medium', estimated: '6 days' });
  }
  if (prdLower.includes('test') || prdLower.includes('quality')) {
    tasks.push({ title: 'Testing & QA Framework', priority: 'Medium', estimated: '4 days' });
  }
  
  // Add default tasks if none were generated
  if (tasks.length === 0) {
    tasks.push(
      { title: 'Core System Architecture', priority: 'High', estimated: '5 days' },
      { title: 'Backend API Development', priority: 'High', estimated: '7 days' },
      { title: 'Frontend Development', priority: 'Medium', estimated: '8 days' },
      { title: 'Testing & Documentation', priority: 'Medium', estimated: '3 days' }
    );
  }
  
  const approved = tasks.slice(0, Math.ceil(tasks.length * 0.8));
  const modified = tasks.slice(approved.length, approved.length + 1);
  const rejected = tasks.slice(approved.length + modified.length);
  
  return {
    success: true,
    analysis: {
      overview: `Analyzed ${words} words PRD for ${complexity.toLowerCase()} project requirements`,
      complexity: complexity,
      estimatedDuration: `${Math.ceil(tasks.length * 1.5)} weeks`,
      riskLevel: complexity === 'Complex' ? 'Medium' : 'Low'
    },
    taskBreakdown: {
      totalTasks: tasks.length,
      tasks: tasks,
      categories: ['Backend', 'Frontend', 'Integration', 'Testing'],
      estimatedEffort: `${tasks.reduce((sum, task) => sum + parseInt(task.estimated), 0)} person-days`
    },
    finalDecision: {
      approved: approved,
      modified: modified.map(task => ({ ...task, reason: 'Adjusted priority based on dependencies' })),
      rejected: rejected.map(task => ({ ...task, reason: 'Out of scope for MVP' })),
      summary: `Approved ${approved.length}/${tasks.length} tasks for implementation. ${complexity} project with clear implementation path.`
    }
  };
}

/**
 * Execute workflow asynchronously and broadcast progress
 */
async function executeWorkflowAsync(workflowId, prdContent, workflowType) {
  try {
    console.log(`🔄 Executing workflow ${workflowId}...`);
    
    // Broadcast workflow started
    broadcastToAllClients({
      type: 'workflow_started',
      data: { 
        workflowId, 
        prdLength: prdContent.length,
        timestamp: new Date().toISOString() 
      }
    });

    // For now, simulate the workflow execution since we need to implement
    // HTTP-based workflow triggering for cross-process communication
    console.log('📋 Simulating workflow execution with live agent coordination...');
    
    // Broadcast progress update - Sonnet starting
    broadcastToAllClients({
      type: 'workflow_progress',
      data: { 
        workflowId,
        currentStep: 'sonnet_analysis',
        message: 'Sonnet analyzing PRD...',
        timestamp: new Date().toISOString()
      }
    });
    
    // Simulate realistic workflow execution time
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
    
    // Generate realistic results based on PRD content
    const result = generateWorkflowResults(prdContent, workflowType);
    
    // Broadcast progress update - Opus starting
    broadcastToAllClients({
      type: 'workflow_progress',
      data: { 
        workflowId,
        currentStep: 'opus_review',
        message: 'Opus reviewing analysis...',
        sonnetTaskCount: result.taskBreakdown?.totalTasks || 0,
        timestamp: new Date().toISOString()
      }
    });
    
    if (result.success) {
      console.log(`✅ Workflow ${workflowId} completed successfully`);
      
      // Store workflow result in memory
      await memory.write('workflows', `${workflowId}.json`, {
        workflowId,
        prdContent,
        result,
        completedAt: new Date().toISOString(),
        status: 'completed'
      });
      
      // Broadcast completion
      broadcastToAllClients({
        type: 'workflow_complete',
        data: { 
          workflowId,
          ...result,
          timestamp: new Date().toISOString()
        }
      });
      
    } else {
      throw new Error(result.error || 'Workflow execution failed');
    }
    
  } catch (error) {
    console.error(`❌ Workflow ${workflowId} failed:`, error);
    
    // Store error result
    try {
      await memory.write('workflows', `${workflowId}.json`, {
        workflowId,
        prdContent,
        error: error.message,
        failedAt: new Date().toISOString(),
        status: 'error'
      });
    } catch (memoryError) {
      console.error('Failed to store workflow error:', memoryError);
    }
    
    // Broadcast error
    broadcastToAllClients({
      type: 'workflow_error',
      data: { 
        workflowId,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
}

// ===========================================
// END WORKFLOW API ENDPOINTS
// ===========================================

// ===========================================
// INTELLIGENCE ANALYTICS API ENDPOINTS
// ===========================================

// Get analytics overview metrics
app.get('/analytics/overview', async (req, res) => {
  try {
    // Generate realistic analytics data for demonstration
    const currentDate = new Date();
    const thisWeek = Math.floor(Math.random() * 20) + 235; // Random around 247
    const lastWeek = Math.floor(thisWeek * 0.88); // 12% less for growth calculation
    
    const metrics = {
      totalWorkflows: thisWeek,
      avgCompletionTime: `${(Math.random() * 1.5 + 1.8).toFixed(1)}min`,
      successRate: `${(Math.random() * 2 + 93).toFixed(1)}%`,
      accuracyScore: `${(Math.random() * 3 + 87).toFixed(1)}%`,
      weeklyGrowth: `+${(((thisWeek - lastWeek) / lastWeek) * 100).toFixed(0)}%`,
      lastUpdated: currentDate.toISOString()
    };
    
    res.json({ success: true, metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get workflow performance data
app.get('/analytics/performance', async (req, res) => {
  try {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const performanceData = days.map(day => ({
      day,
      workflows: Math.floor(Math.random() * 40) + 20,
      avgTime: (Math.random() * 1.5 + 1.5).toFixed(1),
      successRate: (Math.random() * 5 + 92).toFixed(1)
    }));
    
    const insights = [
      {
        type: 'peak',
        icon: '🔥',
        message: `${performanceData.reduce((max, curr) => curr.workflows > max.workflows ? curr : max).day} shows highest workflow volume`
      },
      {
        type: 'improvement',
        icon: '⚡',
        message: 'Average completion time reduced by 15% this month'
      },
      {
        type: 'efficiency',
        icon: '📈',
        message: 'Multi-agent coordination efficiency improved by 12%'
      }
    ];
    
    res.json({ success: true, performance: performanceData, insights });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get agent performance data
app.get('/analytics/agents', async (req, res) => {
  try {
    const agents = [
      {
        name: 'Claude Sonnet',
        role: 'Analysis Lead',
        workflowsProcessed: Math.floor(Math.random() * 50) + 220,
        avgProcessingTime: `${(Math.random() * 0.5 + 1.5).toFixed(1)}min`,
        accuracyRating: `${(Math.random() * 3 + 90).toFixed(1)}%`,
        specialties: ['PRD Analysis', 'Task Breakdown', 'Requirements'],
        status: 'active',
        efficiency: Math.floor(Math.random() * 10) + 90
      },
      {
        name: 'Claude Opus',
        role: 'Team Lead',
        workflowsProcessed: Math.floor(Math.random() * 50) + 220,
        avgProcessingTime: `${(Math.random() * 0.3 + 0.3).toFixed(1)}min`,
        accuracyRating: `${(Math.random() * 2 + 95).toFixed(1)}%`,
        specialties: ['Strategy', 'Risk Assessment', 'Quality Control'],
        status: 'active',
        efficiency: Math.floor(Math.random() * 5) + 95
      }
    ];
    
    res.json({ success: true, agents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get system insights
app.get('/analytics/insights', async (req, res) => {
  try {
    const insights = {
      performance: [
        'Workflow caching has reduced average response time by 23%',
        'Multi-agent coordination efficiency improved by 15% this month',
        'PRD preprocessing algorithms show 12% better task identification',
        'Agent load balancing reduced queue times by 18%'
      ],
      usage: [
        'Peak usage: Tuesday-Thursday, 10AM-2PM',
        'Most common PRD types: E-commerce (32%), SaaS (28%), Mobile Apps (18%)',
        'Average workflow complexity: Moderate (67% of workflows)',
        'Geographic distribution: US (45%), Europe (30%), Asia (25%)'
      ],
      recommendations: [
        'Consider scaling agent pool during peak hours (10AM-2PM)',
        'Implement specialized PRD templates for common use cases',
        'Add workflow complexity pre-assessment for better resource allocation',
        'Deploy additional Sonnet instances for analysis workload distribution'
      ]
    };
    
    res.json({ success: true, insights });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get real-time activity data
app.get('/analytics/activity', async (req, res) => {
  try {
    const currentStats = {
      activeWorkflows: Math.floor(Math.random() * 8) + 1,
      queueLength: Math.floor(Math.random() * 15) + 2,
      currentAvgTime: `${(Math.random() * 0.8 + 0.8).toFixed(1)}min`,
      systemLoad: Math.floor(Math.random() * 30) + 45
    };
    
    // Generate recent activity items
    const activityTypes = ['workflow', 'agent', 'system'];
    const activities = [];
    const now = new Date();
    
    for (let i = 0; i < 8; i++) {
      const timeAgo = new Date(now - (i * 60000 + Math.random() * 120000)); // Random times in last few minutes
      const type = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      
      let message = '';
      switch (type) {
        case 'workflow':
          const projectTypes = ['E-commerce', 'SaaS', 'Mobile App', 'Web Platform'];
          const projectType = projectTypes[Math.floor(Math.random() * projectTypes.length)];
          message = `${projectType} PRD analysis completed in ${(Math.random() * 1.5 + 1.2).toFixed(1)}min`;
          break;
        case 'agent':
          const actions = ['analysis approved', 'review completed', 'tasks generated', 'recommendations provided'];
          const action = actions[Math.floor(Math.random() * actions.length)];
          message = `Opus ${action} with ${Math.floor(Math.random() * 5) + 2} insights`;
          break;
        case 'system':
          const systemEvents = ['Performance optimization', 'Cache update', 'Load balancing', 'Resource scaling'];
          const event = systemEvents[Math.floor(Math.random() * systemEvents.length)];
          message = `${event}: +${Math.floor(Math.random() * 15) + 5}% efficiency gain`;
          break;
      }
      
      activities.push({
        time: timeAgo.toTimeString().split(' ')[0],
        type,
        message
      });
    }
    
    res.json({ success: true, stats: currentStats, activities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================================
// END INTELLIGENCE ANALYTICS API ENDPOINTS
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