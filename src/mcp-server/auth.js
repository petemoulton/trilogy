// Simple Authentication Module for MCP Chrome Agent

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// In-memory user storage (in production, use a database)
const users = [
  {
    id: 1,
    username: 'admin',
    passwordHash: bcrypt.hashSync('admin123', 10), // Default admin user
    role: 'admin',
    createdAt: Date.now()
  }
];

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'mcp-chrome-agent-secret-key';

// Token expiration time
const TOKEN_EXPIRY = '24h';

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    req.user = user;
    next();
  });
}

// Optional authentication middleware (allows unauthenticated access)
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
      }
    });
  }

  next();
}

// Login function
async function login(username, password) {
  try {
    const user = users.find(u => u.username === username);
    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return { success: false, error: 'Invalid username or password' };
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    };
  } catch (error) {
    return { success: false, error: 'Login failed' };
  }
}

// Register function
async function register(username, password, role = 'user') {
  try {
    // Check if user already exists
    if (users.find(u => u.username === username)) {
      return { success: false, error: 'Username already exists' };
    }

    // Validate password strength
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      id: users.length + 1,
      username,
      passwordHash,
      role,
      createdAt: Date.now()
    };

    users.push(newUser);

    const token = jwt.sign(
      {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    return {
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role
      }
    };
  } catch (error) {
    return { success: false, error: 'Registration failed' };
  }
}

// Verify token function
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.find(u => u.id === decoded.id);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    };
  } catch (error) {
    return { success: false, error: 'Invalid token' };
  }
}

// Get user by ID
function getUserById(id) {
  const user = users.find(u => u.id === id);
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt
  };
}

// Get all users (admin only)
function getAllUsers() {
  return users.map(user => ({
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt
  }));
}

// Admin middleware
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
}

// Generate API key for extensions
function generateApiKey(userId) {
  return jwt.sign(
    { id: userId, type: 'api_key' },
    JWT_SECRET,
    { expiresIn: '365d' } // API keys last longer
  );
}

module.exports = {
  authenticateToken,
  optionalAuth,
  login,
  register,
  verifyToken,
  getUserById,
  getAllUsers,
  requireAdmin,
  generateApiKey,
  JWT_SECRET
};
