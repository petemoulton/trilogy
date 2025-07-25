-- Trilogy AI System Database Initialization Script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create database if it doesn't exist (this would be run by docker-entrypoint)
-- CREATE DATABASE trilogy;

-- Switch to trilogy database context
\c trilogy;

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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE INDEX IF NOT EXISTS idx_memory_updated_at ON memory_store(updated_at);
CREATE INDEX IF NOT EXISTS idx_memory_locks_expires ON memory_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_namespace ON system_logs(namespace);
CREATE INDEX IF NOT EXISTS idx_logs_agent ON system_logs(agent_name);

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
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

-- Insert some initial data
INSERT INTO system_logs (level, message, metadata) 
VALUES ('info', 'Database initialized', '{"component": "init_script"}')
ON CONFLICT DO NOTHING;

-- Grant permissions (if needed)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO trilogy;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO trilogy;

-- Create views for common queries
CREATE OR REPLACE VIEW memory_stats AS
SELECT 
    namespace,
    COUNT(*) as key_count,
    MAX(updated_at) as last_updated
FROM memory_store 
GROUP BY namespace;

CREATE OR REPLACE VIEW task_summary AS
SELECT 
    status,
    priority,
    category,
    COUNT(*) as count,
    SUM(estimated_hours) as total_hours
FROM tasks 
GROUP BY status, priority, category;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Trilogy AI System database initialized successfully!';
END $$;