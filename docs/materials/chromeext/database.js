// Database module for MCP Chrome Agent using SQLite

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const DB_PATH = path.join(__dirname, 'mcp_data.db');

// Initialize database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database:', DB_PATH);
    initializeTables();
  }
});

// Initialize database tables
function initializeTables() {
  const tables = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )`,

    // Sessions table
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      tab_id INTEGER,
      url TEXT,
      title TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      event_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1
    )`,

    // Events table
    `CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      event_type TEXT NOT NULL,
      tag_name TEXT,
      selector TEXT,
      element_text TEXT,
      coordinates_x INTEGER,
      coordinates_y INTEGER,
      page_url TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    // Commands table
    `CREATE TABLE IF NOT EXISTS commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      command_type TEXT NOT NULL,
      selector TEXT,
      value TEXT,
      coordinates_x INTEGER,
      coordinates_y INTEGER,
      executed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      executed_at DATETIME,
      user_id INTEGER,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    // Macros table
    `CREATE TABLE IF NOT EXISTS macros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      actions TEXT, -- JSON string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      usage_count INTEGER DEFAULT 0,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`,

    // Screenshots table
    `CREATE TABLE IF NOT EXISTS screenshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      url TEXT,
      title TEXT,
      file_path TEXT, -- Path to stored screenshot file
      size INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )`,

    // DOM snapshots table
    `CREATE TABLE IF NOT EXISTS dom_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      url TEXT,
      title TEXT,
      html_content TEXT, -- Compressed HTML content
      size INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )`
  ];

  // Create tables
  tables.forEach((sql, index) => {
    db.run(sql, (err) => {
      if (err) {
        console.error(`Error creating table ${index + 1}:`, err.message);
      } else {
        console.log(`Table ${index + 1} created successfully`);
      }
    });
  });

  // Create indexes for better performance
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id)',
    'CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_commands_session ON commands(session_id)',
    'CREATE INDEX IF NOT EXISTS idx_commands_executed ON commands(executed)',
    'CREATE INDEX IF NOT EXISTS idx_screenshots_session ON screenshots(session_id)',
    'CREATE INDEX IF NOT EXISTS idx_dom_snapshots_session ON dom_snapshots(session_id)'
  ];

  indexes.forEach((sql, index) => {
    db.run(sql, (err) => {
      if (err) {
        console.error(`Error creating index ${index + 1}:`, err.message);
      }
    });
  });
}

// User operations
const UserDB = {
  create: (username, passwordHash, role = 'user') => {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)';
      db.run(sql, [username, passwordHash, role], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, username, role });
      });
    });
  },

  findByUsername: (username) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE username = ?';
      db.get(sql, [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  findById: (id) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT id, username, role, created_at, last_login FROM users WHERE id = ?';
      db.get(sql, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  updateLastLogin: (id) => {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
      db.run(sql, [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  },

  getAll: () => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT id, username, role, created_at, last_login FROM users ORDER BY created_at DESC';
      db.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Session operations
const SessionDB = {
  create: (sessionId, tabId, url, title) => {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO sessions (id, tab_id, url, title) VALUES (?, ?, ?, ?)';
      db.run(sql, [sessionId, tabId, url, title], (err) => {
        if (err) reject(err);
        else resolve({ id: sessionId, tabId, url, title });
      });
    });
  },

  update: (sessionId, updates) => {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      const sql = `UPDATE sessions SET ${fields} WHERE id = ?`;

      db.run(sql, [...values, sessionId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  },

  getActive: () => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM sessions WHERE is_active = 1 ORDER BY last_activity DESC';
      db.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  deactivate: (sessionId) => {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE sessions SET is_active = 0 WHERE id = ?';
      db.run(sql, [sessionId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// Event operations
const EventDB = {
  create: (eventData) => {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO events 
        (session_id, event_type, tag_name, selector, element_text, coordinates_x, coordinates_y, page_url, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        eventData.sessionId,
        eventData.event.type,
        eventData.event.tagName,
        eventData.event.selector,
        eventData.event.text,
        eventData.event.coordinates?.x,
        eventData.event.coordinates?.y,
        eventData.url,
        eventData.userId
      ];

      db.run(sql, values, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    });
  },

  getBySession: (sessionId, limit = 100) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM events WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?';
      db.all(sql, [sessionId, limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  getRecent: (limit = 50) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM events ORDER BY timestamp DESC LIMIT ?';
      db.all(sql, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  getStats: () => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as total_events,
          COUNT(DISTINCT session_id) as unique_sessions,
          event_type,
          COUNT(*) as event_count
        FROM events 
        WHERE timestamp >= datetime('now', '-24 hours')
        GROUP BY event_type
      `;

      db.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Macro operations
const MacroDB = {
  create: (name, actions, description, createdBy) => {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO macros (name, actions, description, created_by) VALUES (?, ?, ?, ?)';
      db.run(sql, [name, JSON.stringify(actions), description, createdBy], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    });
  },

  getAll: () => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM macros ORDER BY created_at DESC';
      db.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => ({
          ...row,
          actions: JSON.parse(row.actions)
        })));
      });
    });
  },

  findById: (id) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM macros WHERE id = ?';
      db.get(sql, [id], (err, row) => {
        if (err) reject(err);
        else if (row) {
          resolve({
            ...row,
            actions: JSON.parse(row.actions)
          });
        } else {
          resolve(null);
        }
      });
    });
  },

  incrementUsage: (id) => {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE macros SET usage_count = usage_count + 1 WHERE id = ?';
      db.run(sql, [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM macros WHERE id = ?';
      db.run(sql, [id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }
};

// Screenshot operations
const ScreenshotDB = {
  create: (sessionId, url, title, filePath, size) => {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO screenshots (session_id, url, title, file_path, size) VALUES (?, ?, ?, ?, ?)';
      db.run(sql, [sessionId, url, title, filePath, size], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    });
  },

  getBySession: (sessionId, limit = 50) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM screenshots WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?';
      db.all(sql, [sessionId, limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  getRecent: (limit = 20) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM screenshots ORDER BY timestamp DESC LIMIT ?';
      db.all(sql, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Close database connection gracefully
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});

module.exports = {
  db,
  UserDB,
  SessionDB,
  EventDB,
  MacroDB,
  ScreenshotDB
};
