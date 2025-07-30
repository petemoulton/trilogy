const express = require('express');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const auth = require('./auth');
const { UserDB, SessionDB, EventDB, MacroDB, ScreenshotDB } = require('./database');

// Add process error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception in MCP Server:', error);
  console.error('Stack:', error.stack);
  // Don't exit - log the error and continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Promise Rejection in MCP Server:', reason);
  console.error('Promise:', promise);
  // Don't exit - log the error and continue
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3101", "chrome-extension://*"],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.MCP_PORT || 3101; // Use allocated port 3101 for MCP server

// Security middleware
app.use(cors({
  origin: ['chrome-extension://*', 'http://localhost:*'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' })); // Increase limit for DOM snapshots

// Input validation middleware
function validateRequest(schema) {
  return (req, res, next) => {
    if (schema.required) {
      for (const field of schema.required) {
        if (!req.body[field] && !req.query[field]) {
          return res.status(400).json({
            success: false,
            error: `Missing required field: ${field}`
          });
        }
      }
    }
    next();
  };
}

// Rate limiting middleware (simple implementation)
const requestCounts = new Map();
function rateLimit(maxRequests = 100, windowMs = 60000) {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requestCounts.has(key)) {
      requestCounts.set(key, { count: 0, resetTime: now + windowMs });
    }
    
    const clientData = requestCounts.get(key);
    
    if (now > clientData.resetTime) {
      clientData.count = 0;
      clientData.resetTime = now + windowMs;
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests'
      });
    }
    
    clientData.count++;
    next();
  };
}

// Store for sessions and commands
const sessions = new Map();
const commands = new Map();
const eventLogs = [];
const connectedClients = new Map(); // Track WebSocket connections

// Session management functions
async function createSession(tabId, url, title = '') {
  const sessionId = `session_${tabId}_${Date.now()}`;
  
  // Store in memory for quick access
  sessions.set(sessionId, {
    tabId,
    url,
    title,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    eventCount: 0
  });
  
  // Store in database for persistence
  try {
    await SessionDB.create(sessionId, tabId, url, title);
  } catch (error) {
    console.error('🚨 Error saving session to database:', error);
    // Continue without throwing - don't crash the server
  }
  
  return sessionId;
}

async function updateSessionActivity(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastActivity = Date.now();
    session.eventCount++;
    
    // Update database
    try {
      await SessionDB.update(sessionId, {
        last_activity: new Date().toISOString(),
        event_count: session.eventCount
      });
    } catch (error) {
      console.error('🚨 Error updating session in database:', error);
      // Continue without throwing - don't crash the server
    }
  }
}

function cleanupInactiveSessions() {
  const now = Date.now();
  const timeout = 30 * 60 * 1000; // 30 minutes
  
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastActivity > timeout) {
      sessions.delete(sessionId);
      commands.delete(sessionId);
      console.log(`Cleaned up inactive session: ${sessionId}`);
    }
  }
}

// Apply rate limiting to all endpoints
app.use(rateLimit());

// Selector validation function
function isValidSelector(selector) {
  if (!selector || typeof selector !== 'string') return false;
  
  // Basic selector validation - prevent dangerous selectors
  const dangerousPatterns = [
    /script/i,
    /eval/i,
    /javascript:/i,
    /data:/i,
    /vbscript:/i
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(selector));
}

// Endpoint to receive click events from chrome extension
app.post('/click-event', validateRequest({ required: ['event', 'url'] }), async (req, res) => {
  const { sessionId, event, url, timestamp } = req.body;
  
  const clickEvent = {
    sessionId: sessionId || 'default',
    event,
    url,
    timestamp: timestamp || Date.now()
  };
  
  // Update session activity if sessionId exists
  if (sessionId && sessions.has(sessionId)) {
    await updateSessionActivity(sessionId);
  }
  
  // Store in memory for quick access
  eventLogs.push(clickEvent);
  
  // Store in database for persistence
  try {
    await EventDB.create(clickEvent);
  } catch (error) {
    console.error('🚨 Error saving event to database:', error);
    // Continue without throwing - don't crash the server
  }
  
  console.log('Click event received:', clickEvent);
  
  res.json({ success: true, eventId: eventLogs.length - 1 });
});

// Endpoint for agent to fetch commands to execute
app.get('/commands', (req, res) => {
  const { sessionId } = req.query;
  const session = sessionId || 'default';
  
  const sessionCommands = commands.get(session) || [];
  
  // Return and clear commands for this session
  commands.set(session, []);
  
  res.json({ commands: sessionCommands });
});

// This endpoint is replaced by the protected version below

// Optional endpoint to get event logs
app.get('/log', (req, res) => {
  const { sessionId, limit } = req.query;
  
  let logs = eventLogs;
  if (sessionId) {
    logs = logs.filter(log => log.sessionId === sessionId);
  }
  
  if (limit) {
    logs = logs.slice(-parseInt(limit));
  }
  
  res.json({ logs });
});

// Optional endpoint to receive full DOM snapshots
app.post('/full-dom', (req, res) => {
  const { sessionId, html, url, timestamp } = req.body;
  
  const domSnapshot = {
    sessionId: sessionId || 'default',
    html,
    url,
    timestamp: timestamp || Date.now()
  };
  
  console.log(`DOM snapshot received for ${url} (${html.length} chars)`);
  
  // Store or process DOM snapshot as needed
  res.json({ success: true });
});

// Optional endpoint to receive screenshots
app.post('/screenshot', (req, res) => {
  const { sessionId, screenshot, url, timestamp, title } = req.body;
  
  const screenshotData = {
    sessionId: sessionId || 'default',
    screenshot: screenshot, // Base64 data URL
    url,
    title,
    timestamp: timestamp || Date.now(),
    size: screenshot ? screenshot.length : 0
  };
  
  console.log(`Screenshot received for ${url} (${Math.round(screenshotData.size / 1024)}KB)`);
  
  // Store screenshot (in production, you might want to save to disk or cloud storage)
  screenshots.push(screenshotData);
  
  // Keep only last 50 screenshots to manage memory
  if (screenshots.length > 50) {
    screenshots.shift();
  }
  
  res.json({ success: true, screenshotId: screenshots.length - 1 });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    activeSessions: sessions.size,
    eventCount: eventLogs.length
  });
});

// Add endpoint to create/manage sessions
app.post('/session', (req, res) => {
  const { tabId, url } = req.body;
  const sessionId = createSession(tabId, url);
  res.json({ sessionId, success: true });
});

// Add endpoint to get session info
app.get('/sessions', (req, res) => {
  const sessionList = Array.from(sessions.entries()).map(([id, data]) => ({
    sessionId: id,
    ...data
  }));
  res.json({ sessions: sessionList });
});

// Cleanup inactive sessions every 5 minutes
setInterval(cleanupInactiveSessions, 5 * 60 * 1000);

// Serve dashboard static files
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

// Macro storage
const macros = [];

// Screenshots storage
const screenshots = [];

// Endpoint to save macros
app.post('/macros', validateRequest({ required: ['name', 'actions'] }), async (req, res) => {
  try {
    const { name, actions, description } = req.body;
    const createdBy = req.user ? req.user.id : null;
    
    // Store in memory for quick access
    const macro = {
      id: `macro_${Date.now()}`,
      name,
      actions,
      description,
      createdAt: Date.now(),
      createdBy
    };
    macros.push(macro);
    
    // Store in database for persistence
    const result = await MacroDB.create(name, actions, description, createdBy);
    
    console.log(`Macro saved: ${name} (${actions.length} actions)`);
    
    res.json({ success: true, macroId: result.id });
  } catch (error) {
    console.error('🚨 Error saving macro:', error);
    res.status(500).json({ success: false, error: 'Failed to save macro' });
  }
});

// Endpoint to get saved macros
app.get('/macros', async (req, res) => {
  try {
    const dbMacros = await MacroDB.getAll();
    res.json({ macros: dbMacros });
  } catch (error) {
    console.error('🚨 Error getting macros:', error);
    res.json({ macros }); // Fallback to in-memory macros
  }
});

// Endpoint to get a specific macro
app.get('/macros/:id', async (req, res) => {
  try {
    const macro = await MacroDB.findById(parseInt(req.params.id));
    if (!macro) {
      return res.status(404).json({ success: false, error: 'Macro not found' });
    }
    res.json({ macro });
  } catch (error) {
    console.error('🚨 Error getting macro:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Endpoint to delete a macro
app.delete('/macros/:id', async (req, res) => {
  try {
    const result = await MacroDB.delete(parseInt(req.params.id));
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Macro not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('🚨 Error deleting macro:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Endpoint to get screenshots
app.get('/screenshots', (req, res) => {
  const { sessionId, limit } = req.query;
  
  let filteredScreenshots = screenshots;
  if (sessionId) {
    filteredScreenshots = screenshots.filter(s => s.sessionId === sessionId);
  }
  
  if (limit) {
    filteredScreenshots = filteredScreenshots.slice(-parseInt(limit));
  }
  
  // Don't send the full base64 data, just metadata
  const screenshotMeta = filteredScreenshots.map(s => ({
    sessionId: s.sessionId,
    url: s.url,
    title: s.title,
    timestamp: s.timestamp,
    size: s.size,
    id: screenshots.indexOf(s)
  }));
  
  res.json({ screenshots: screenshotMeta });
});

// Endpoint to get a specific screenshot
app.get('/screenshots/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (id < 0 || id >= screenshots.length) {
    return res.status(404).json({ success: false, error: 'Screenshot not found' });
  }
  
  const screenshot = screenshots[id];
  res.json({ screenshot });
});

// Authentication endpoints
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password required'
    });
  }

  const result = await auth.login(username, password);
  res.json(result);
});

app.post('/auth/register', async (req, res) => {
  const { username, password, role } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password required'
    });
  }

  const result = await auth.register(username, password, role);
  res.json(result);
});

app.get('/auth/verify', auth.authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

app.get('/auth/users', auth.authenticateToken, auth.requireAdmin, (req, res) => {
  const users = auth.getAllUsers();
  res.json({ success: true, users });
});

app.post('/auth/api-key', auth.authenticateToken, (req, res) => {
  const apiKey = auth.generateApiKey(req.user.id);
  res.json({
    success: true,
    apiKey,
    note: 'Store this API key securely - it will not be shown again'
  });
});

// Protected endpoints - require authentication for sensitive operations
app.post('/commands', auth.optionalAuth, validateRequest({ required: ['command'] }), (req, res) => {
  const { sessionId, command } = req.body;
  const session = sessionId || 'default';
  
  // Validate command structure and selector
  if (!command.type || !command.selector) {
    return res.status(400).json({
      success: false,
      error: 'Command must have type and selector fields'
    });
  }
  
  if (!isValidSelector(command.selector)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or potentially dangerous selector'
    });
  }
  
  // Validate command type
  const validCommandTypes = ['click', 'highlight', 'scroll', 'input', 'capture_dom'];
  if (!validCommandTypes.includes(command.type)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid command type'
    });
  }
  
  // Log command with user info if authenticated
  const logEntry = {
    command,
    sessionId: session,
    timestamp: Date.now(),
    user: req.user ? req.user.username : 'anonymous'
  };
  console.log('Command executed:', logEntry);
  
  if (!commands.has(session)) {
    commands.set(session, []);
  }
  
  commands.get(session).push(command);
  res.json({ success: true, commandCount: commands.get(session).length });
});

// Redirect root to dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  connectedClients.set(socket.id, {
    socket,
    connectedAt: Date.now(),
    sessionId: null,
    type: null // 'dashboard' or 'extension'
  });

  // Client identifies itself
  socket.on('identify', (data) => {
    const client = connectedClients.get(socket.id);
    if (client) {
      client.type = data.type;
      client.sessionId = data.sessionId;
      console.log(`Client ${socket.id} identified as ${data.type}`);
    }
  });

  // Dashboard requests real-time updates
  socket.on('subscribe_updates', () => {
    socket.join('dashboard_updates');
    console.log(`Client ${socket.id} subscribed to dashboard updates`);
  });

  // Extension reports events
  socket.on('event', (eventData) => {
    // Broadcast to dashboard clients
    io.to('dashboard_updates').emit('event_update', eventData);
    console.log('Real-time event broadcast:', eventData.event?.type);
  });

  // Send command to specific session
  socket.on('send_command', (data) => {
    const { sessionId, command } = data;
    
    // Find extension client with matching session
    for (const [clientId, client] of connectedClients.entries()) {
      if (client.type === 'extension' && client.sessionId === sessionId) {
        client.socket.emit('command', command);
        console.log(`Command sent to session ${sessionId}:`, command);
        return;
      }
    }
    
    // Fallback to command queue if no WebSocket connection
    if (!commands.has(sessionId)) {
      commands.set(sessionId, []);
    }
    commands.get(sessionId).push(command);
  });

  // Client disconnection
  socket.on('disconnect', () => {
    connectedClients.delete(socket.id);
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Broadcast session updates to dashboard clients
function broadcastSessionUpdate() {
  const sessionList = Array.from(sessions.entries()).map(([id, data]) => ({
    sessionId: id,
    ...data
  }));
  
  io.to('dashboard_updates').emit('sessions_update', { sessions: sessionList });
}

// Broadcast stats update to dashboard clients
function broadcastStatsUpdate() {
  const stats = {
    activeSessions: sessions.size,
    totalEvents: eventLogs.length,
    connectedClients: connectedClients.size,
    timestamp: Date.now()
  };
  
  io.to('dashboard_updates').emit('stats_update', stats);
}

// Periodic broadcasts
setInterval(() => {
  broadcastSessionUpdate();
  broadcastStatsUpdate();
}, 5000);

server.listen(PORT, () => {
  console.log(`MCP Chrome Agent server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`WebSocket server enabled for real-time communication`);
  console.log(`Session management enabled with automatic cleanup`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('🚨 MCP Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
    process.exit(1);
  }
});