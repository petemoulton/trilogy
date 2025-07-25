const { Pool } = require('pg');
const fs = require('fs-extra');
const path = require('path');

class PostgreSQLMemory {
  constructor(config = {}) {
    this.config = {
      host: config.host || process.env.POSTGRES_HOST || 'localhost',
      port: config.port || process.env.POSTGRES_PORT || 5432,
      database: config.database || process.env.POSTGRES_DB || 'trilogy',
      user: config.user || process.env.POSTGRES_USER || 'trilogy',
      password: config.password || process.env.POSTGRES_PASSWORD || 'trilogy123',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
    
    this.pool = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.pool = new Pool(this.config);
      
      // Test connection
      const client = await this.pool.connect();
      client.release();
      
      await this.initializeTables();
      this.isConnected = true;
      
      console.log('✅ Connected to PostgreSQL memory system');
      return true;
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async initializeTables() {
    const createTablesSQL = `
      -- Memory storage table
      CREATE TABLE IF NOT EXISTS memory_store (
        id SERIAL PRIMARY KEY,
        namespace VARCHAR(255) NOT NULL,
        key VARCHAR(255) NOT NULL,
        value JSONB,
        content TEXT,
        content_type VARCHAR(50) DEFAULT 'json',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(namespace, key)
      );

      -- Memory locks table
      CREATE TABLE IF NOT EXISTS memory_locks (
        id SERIAL PRIMARY KEY,
        namespace VARCHAR(255) NOT NULL,
        key VARCHAR(255) NOT NULL,
        locked_by VARCHAR(255),
        locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        UNIQUE(namespace, key)
      );

      -- Agent sessions table
      CREATE TABLE IF NOT EXISTS agent_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_name VARCHAR(100) NOT NULL,
        session_data JSONB,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Task tracking table
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        priority VARCHAR(20) DEFAULT 'MEDIUM',
        complexity VARCHAR(20) DEFAULT 'MEDIUM',
        status VARCHAR(50) DEFAULT 'PENDING',
        category VARCHAR(100),
        estimated_hours INTEGER,
        dependencies JSONB DEFAULT '[]',
        blockers JSONB DEFAULT '[]',
        metadata JSONB DEFAULT '{}',
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- System logs table
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        level VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        namespace VARCHAR(255),
        key VARCHAR(255),
        agent_name VARCHAR(100),
        metadata JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_memory_namespace_key ON memory_store(namespace, key);
      CREATE INDEX IF NOT EXISTS idx_memory_locks_expires ON memory_locks(expires_at);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_logs_namespace ON system_logs(namespace);

      -- Update triggers
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_memory_store_updated_at ON memory_store;
      CREATE TRIGGER update_memory_store_updated_at 
          BEFORE UPDATE ON memory_store 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_agent_sessions_updated_at ON agent_sessions;
      CREATE TRIGGER update_agent_sessions_updated_at 
          BEFORE UPDATE ON agent_sessions 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
      CREATE TRIGGER update_tasks_updated_at 
          BEFORE UPDATE ON tasks 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    try {
      await this.pool.query(createTablesSQL);
      console.log('✅ PostgreSQL tables initialized');
    } catch (error) {
      console.error('❌ Failed to initialize tables:', error);
      throw error;
    }
  }

  async acquireLock(namespace, key, ttl = 30000, lockedBy = 'system') {
    if (!this.isConnected) return false;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Clean up expired locks
      await client.query(
        'DELETE FROM memory_locks WHERE expires_at < CURRENT_TIMESTAMP'
      );

      // Try to acquire lock
      const expiresAt = new Date(Date.now() + ttl);
      const result = await client.query(`
        INSERT INTO memory_locks (namespace, key, locked_by, expires_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (namespace, key) DO NOTHING
        RETURNING id
      `, [namespace, key, lockedBy, expiresAt]);

      await client.query('COMMIT');
      return result.rows.length > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Lock acquisition error:', error);
      return false;
    } finally {
      client.release();
    }
  }

  async releaseLock(namespace, key) {
    if (!this.isConnected) return;

    try {
      await this.pool.query(
        'DELETE FROM memory_locks WHERE namespace = $1 AND key = $2',
        [namespace, key]
      );
    } catch (error) {
      console.error('Lock release error:', error);
    }
  }

  async read(namespace, key) {
    if (!this.isConnected) return null;

    try {
      const result = await this.pool.query(
        'SELECT value, content, content_type FROM memory_store WHERE namespace = $1 AND key = $2',
        [namespace, key]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      
      if (row.content_type === 'json' && row.value) {
        return row.value;
      } else if (row.content_type === 'text' && row.content) {
        return row.content;
      }
      
      return row.value || row.content;
    } catch (error) {
      console.error(`Memory read error for ${namespace}/${key}:`, error);
      return null;
    }
  }

  async write(namespace, key, data) {
    if (!this.isConnected) {
      throw new Error('PostgreSQL not connected');
    }

    const lockAcquired = await this.acquireLock(namespace, key);
    if (!lockAcquired) {
      throw new Error(`Failed to acquire lock for ${namespace}/${key}`);
    }

    try {
      const isString = typeof data === 'string';
      const contentType = isString ? 'text' : 'json';
      
      await this.pool.query(`
        INSERT INTO memory_store (namespace, key, value, content, content_type)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (namespace, key) DO UPDATE SET
          value = EXCLUDED.value,
          content = EXCLUDED.content,
          content_type = EXCLUDED.content_type,
          updated_at = CURRENT_TIMESTAMP
      `, [
        namespace, 
        key, 
        isString ? null : JSON.stringify(data),
        isString ? data : null,
        contentType
      ]);

      // Log the write operation
      await this.logOperation(namespace, key, 'write', data);
      
      return true;
    } finally {
      await this.releaseLock(namespace, key);
    }
  }

  async list(namespace, prefix = '') {
    if (!this.isConnected) return [];

    try {
      const result = await this.pool.query(
        'SELECT key FROM memory_store WHERE namespace = $1 AND key LIKE $2',
        [namespace, `${prefix}%`]
      );

      return result.rows.map(row => row.key);
    } catch (error) {
      console.error(`Memory list error for ${namespace}:`, error);
      return [];
    }
  }

  async delete(namespace, key) {
    if (!this.isConnected) return false;

    const lockAcquired = await this.acquireLock(namespace, key);
    if (!lockAcquired) {
      throw new Error(`Failed to acquire lock for ${namespace}/${key}`);
    }

    try {
      const result = await this.pool.query(
        'DELETE FROM memory_store WHERE namespace = $1 AND key = $2',
        [namespace, key]
      );

      await this.logOperation(namespace, key, 'delete', null);
      return result.rowCount > 0;
    } finally {
      await this.releaseLock(namespace, key);
    }
  }

  async logOperation(namespace, key, operation, data) {
    try {
      const dataPreview = typeof data === 'string' 
        ? data.substring(0, 200) 
        : JSON.stringify(data || null).substring(0, 200);

      await this.pool.query(`
        INSERT INTO system_logs (level, message, namespace, key, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'info',
        `Memory ${operation}: ${namespace}/${key}`,
        namespace,
        key,
        { operation, dataPreview }
      ]);
    } catch (error) {
      console.error('Failed to log operation:', error);
    }
  }

  async getStats() {
    if (!this.isConnected) return null;

    try {
      const results = await Promise.all([
        this.pool.query('SELECT COUNT(*) as total_keys FROM memory_store'),
        this.pool.query('SELECT namespace, COUNT(*) as count FROM memory_store GROUP BY namespace'),
        this.pool.query('SELECT COUNT(*) as active_locks FROM memory_locks WHERE expires_at > CURRENT_TIMESTAMP'),
        this.pool.query('SELECT COUNT(*) as total_tasks FROM tasks'),
        this.pool.query('SELECT status, COUNT(*) as count FROM tasks GROUP BY status')
      ]);

      return {
        totalKeys: parseInt(results[0].rows[0].total_keys),
        keysByNamespace: results[1].rows,
        activeLocks: parseInt(results[2].rows[0].active_locks),
        totalTasks: parseInt(results[3].rows[0].total_tasks),
        tasksByStatus: results[4].rows
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return null;
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log('✅ PostgreSQL connection closed');
    }
  }
}

module.exports = PostgreSQLMemory;