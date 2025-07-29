#!/usr/bin/env node

/**
 * Trilogy System Startup Script
 * Starts server first, then agents in proper sequence
 */

const { spawn } = require('child_process');
const http = require('http');

console.log('🚀 Starting Trilogy AI System...');

let serverProcess;
let agentProcess;
let mcpProcess;

// Cleanup function
function cleanup() {
  console.log('\n🔄 Shutting down system...');
  
  if (agentProcess) {
    agentProcess.kill('SIGTERM');
  }
  
  if (mcpProcess) {
    mcpProcess.kill('SIGTERM');
  }
  
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  
  setTimeout(() => {
    console.log('✅ System shutdown complete');
    process.exit(0);
  }, 2000);
}

// Handle shutdown signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Function to check if server is ready
function checkServerHealth(retries = 30) {
  return new Promise((resolve, reject) => {
    const check = (attempt) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3100,
        path: '/health',
        method: 'GET',
        timeout: 1000
      }, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else if (attempt < retries) {
          setTimeout(() => check(attempt + 1), 1000);
        } else {
          reject(new Error('Server health check failed'));
        }
      });
      
      req.on('error', (err) => {
        if (attempt < retries) {
          setTimeout(() => check(attempt + 1), 1000);
        } else {
          reject(err);
        }
      });
      
      req.end();
    };
    
    check(1);
  });
}

async function startSystem() {
  try {
    // Step 1: Start the server
    console.log('📡 Starting server...');
    serverProcess = spawn('node', ['src/backend/server/index.js'], {
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    serverProcess.stdout.on('data', (data) => {
      process.stdout.write(`[SERVER] ${data}`);
    });
    
    serverProcess.stderr.on('data', (data) => {
      process.stderr.write(`[SERVER] ${data}`);
    });
    
    serverProcess.on('exit', (code) => {
      console.log(`Server exited with code ${code}`);
      if (code !== 0) {
        cleanup();
      }
    });
    
    // Step 2: Wait for server to be ready
    console.log('⏳ Waiting for server to be ready...');
    await checkServerHealth();
    console.log('✅ Server is ready');
    
    // Step 3: Start the MCP server
    console.log('🌐 Starting MCP server...');
    mcpProcess = spawn('node', ['src/mcp-server/server.js'], {
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    mcpProcess.stdout.on('data', (data) => {
      process.stdout.write(`[MCP] ${data}`);
    });
    
    mcpProcess.stderr.on('data', (data) => {
      process.stderr.write(`[MCP] ${data}`);
    });
    
    mcpProcess.on('exit', (code) => {
      console.log(`MCP server exited with code ${code}`);
      if (code !== 0) {
        cleanup();
      }
    });
    
    // Wait a moment for MCP server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Start the agents
    console.log('🤖 Starting agents...');
    agentProcess = spawn('node', ['src/shared/agents/runner.js'], {
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    agentProcess.stdout.on('data', (data) => {
      process.stdout.write(`[AGENTS] ${data}`);
    });
    
    agentProcess.stderr.on('data', (data) => {
      process.stderr.write(`[AGENTS] ${data}`);
    });
    
    agentProcess.on('exit', (code) => {
      console.log(`Agents exited with code ${code}`);
      if (code !== 0) {
        cleanup();
      }
    });
    
    // Wait longer for agents to connect and attach
    setTimeout(async () => {
      try {
        // Test agent pool API to ensure runners are attached
        const response = await fetch('http://localhost:3100/agents/pool/status');
        const data = await response.json();
        
        console.log('\n🎉 Trilogy System Started Successfully!');
        console.log('📊 Dashboard: http://localhost:3100');
        console.log('🌐 MCP Dashboard: http://localhost:3000/dashboard');
        console.log('🔗 API Health: http://localhost:3100/health');
        console.log('🤖 Agent Pool: http://localhost:3100/agents/pool/status');
        console.log(`🏊 Agent Pool Status: ${data.success ? 'Connected' : 'Disconnected'}`);
        console.log('\n💡 Try spawning an agent:');
        console.log('curl -X POST http://localhost:3100/agents/pool/spawn -H "Content-Type: application/json" -d \'{"role":"test-specialist","capabilities":["testing"]}\'');
        console.log('\nPress Ctrl+C to shutdown');
      } catch (error) {
        console.log('\n⚠️ System started but agent pool may not be ready');
        console.log('🔗 Dashboard: http://localhost:3100');
        console.log('🌐 MCP Dashboard: http://localhost:3000/dashboard');
        console.log('\nPress Ctrl+C to shutdown');
      }
    }, 5000); // Wait 5 seconds for full initialization
    
  } catch (error) {
    console.error('❌ Failed to start system:', error.message);
    cleanup();
  }
}

startSystem();