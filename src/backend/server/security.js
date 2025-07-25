const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

class SecurityManager {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'trilogy-default-secret-change-in-production';
    this.sessionSecret = process.env.SESSION_SECRET || 'trilogy-session-secret-change-in-production';
    this.saltRounds = 12;
  }

  // JWT Token Management
  generateToken(payload, expiresIn = '24h') {
    return jwt.sign(payload, this.jwtSecret, { 
      expiresIn,
      issuer: 'trilogy-ai-system',
      audience: 'trilogy-users'
    });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'trilogy-ai-system',
        audience: 'trilogy-users'
      });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Password Management
  async hashPassword(password) {
    return bcrypt.hash(password, this.saltRounds);
  }

  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  // Rate Limiting Configurations
  createRateLimit(windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests') {
    return rateLimit({
      windowMs,
      max,
      message: {
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          error: message,
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
    });
  }

  // API Rate Limits
  getApiRateLimit() {
    return this.createRateLimit(
      parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
      parseInt(process.env.RATE_LIMIT_MAX) || 100,
      'Too many API requests, please try again later'
    );
  }

  // Authentication Rate Limits (stricter)
  getAuthRateLimit() {
    return this.createRateLimit(
      15 * 60 * 1000, // 15 minutes
      5, // 5 attempts
      'Too many authentication attempts, please try again later'
    );
  }

  // Agent Trigger Rate Limits
  getAgentRateLimit() {
    return this.createRateLimit(
      60 * 1000, // 1 minute
      10, // 10 triggers per minute
      'Too many agent triggers, please slow down'
    );
  }

  // Input Validation and Sanitization
  validateInput(input, type) {
    if (!input) return false;

    switch (type) {
      case 'namespace':
        return /^[a-zA-Z0-9_-]+$/.test(input) && input.length <= 255;
      
      case 'key':
        return /^[a-zA-Z0-9_.-]+$/.test(input) && input.length <= 255;
      
      case 'agent':
        return ['sonnet', 'opus'].includes(input);
      
      case 'sessionId':
        return /^[a-zA-Z0-9-]{36}$/.test(input); // UUID format
      
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
      
      default:
        return false;
    }
  }

  // Sanitize strings to prevent injection
  sanitizeString(str) {
    if (typeof str !== 'string') return '';
    
    return str
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[\\]/g, '') // Remove backslashes
      .trim()
      .substring(0, 1000); // Limit length
  }

  // Memory key sanitization
  sanitizeMemoryKey(key) {
    if (typeof key !== 'string') return '';
    
    return key
      .replace(/[^a-zA-Z0-9_.-]/g, '_') // Replace invalid chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .trim()
      .substring(0, 255);
  }

  // CORS Configuration
  getCorsOptions() {
    const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:8080')
      .split(',')
      .map(origin => origin.trim());

    return {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      maxAge: 86400 // 24 hours
    };
  }

  // Security Headers Middleware
  getSecurityHeaders() {
    return (req, res, next) => {
      // Prevent clickjacking
      res.setHeader('X-Frame-Options', 'DENY');
      
      // Prevent MIME type sniffing
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // XSS Protection
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      // HTTPS Strict Transport Security
      if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      }
      
      // Content Security Policy
      res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' ws: wss:; " +
        "font-src 'self'; " +
        "object-src 'none'; " +
        "media-src 'self'; " +
        "frame-src 'none';"
      );
      
      // Remove server information
      res.removeHeader('X-Powered-By');
      
      next();
    };
  }

  // Request Validation Middleware
  validateMemoryRequest() {
    return (req, res, next) => {
      const { namespace, key } = req.params;
      
      if (!this.validateInput(namespace, 'namespace')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid namespace format'
        });
      }
      
      if (!this.validateInput(key, 'key')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid key format'
        });
      }
      
      // Sanitize parameters
      req.params.namespace = this.sanitizeString(namespace);
      req.params.key = this.sanitizeMemoryKey(key);
      
      next();
    };
  }

  // Agent Request Validation
  validateAgentRequest() {
    return (req, res, next) => {
      const { agent } = req.params;
      
      if (!this.validateInput(agent, 'agent')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid agent name'
        });
      }
      
      // Validate request body
      if (req.body && typeof req.body.input === 'object') {
        // Sanitize input data
        if (req.body.input.type) {
          req.body.input.type = this.sanitizeString(req.body.input.type);
        }
      }
      
      next();
    };
  }

  // Authentication Middleware
  requireAuth() {
    return (req, res, next) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Authentication token required'
        });
      }
      
      try {
        const decoded = this.verifyToken(token);
        req.user = decoded;
        next();
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: 'Invalid authentication token'
        });
      }
    };
  }

  // Admin Role Check
  requireAdmin() {
    return (req, res, next) => {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Administrative privileges required'
        });
      }
      next();
    };
  }

  // Log Security Events
  logSecurityEvent(event, details = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      event,
      details,
      severity: 'security'
    };
    
    console.warn(`[SECURITY] ${timestamp}: ${event}`, details);
    
    // In production, send to security monitoring system
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service (Sentry, DataDog, etc.)
    }
  }
}

module.exports = SecurityManager;