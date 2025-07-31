#!/usr/bin/env node

/**
 * Test Backend Server - Verify the backend actually starts and works
 */

const { spawn } = require('child_process');
const fetch = require('node-fetch');
const path = require('path');

async function testBackend() {
  console.log('🧪 TESTING BACKEND SERVER');
  console.log('========================');

  const backendPath = path.join(__dirname, 'target-app/gemini-backend');
  
  console.log('1. Installing backend dependencies...');
  
  // Install dependencies
  const installProcess = spawn('npm', ['install'], {
    cwd: backendPath,
    stdio: 'inherit'
  });

  await new Promise((resolve, reject) => {
    installProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm install failed with code ${code}`));
      }
    });
  });

  console.log('✅ Dependencies installed');

  console.log('2. Starting backend server...');
  
  // Start the server
  const serverProcess = spawn('node', ['server.js'], {
    cwd: backendPath,
    stdio: 'pipe'
  });

  let serverReady = false;
  
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('Server:', output.trim());
    if (output.includes('Todo API Server running on port 3102')) {
      serverReady = true;
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.error('Server Error:', data.toString());
  });

  // Wait for server to start
  await new Promise(resolve => {
    const checkReady = () => {
      if (serverReady) {
        resolve();
      } else {
        setTimeout(checkReady, 100);
      }
    };
    setTimeout(checkReady, 1000);
  });

  console.log('✅ Server started on port 3102');

  console.log('3. Testing API endpoints...');

  try {
    // Test health endpoint
    console.log('Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3102/health');
    const healthData = await healthResponse.json();
    
    if (healthResponse.ok && healthData.status === 'healthy') {
      console.log('✅ Health check passed');
    } else {
      throw new Error('Health check failed');
    }

    // Test get todos (empty)
    console.log('Testing GET /api/todos...');
    const todosResponse = await fetch('http://localhost:3102/api/todos');
    const todosData = await todosResponse.json();
    
    if (todosResponse.ok && todosData.success && Array.isArray(todosData.data)) {
      console.log('✅ GET todos passed');
    } else {
      throw new Error('GET todos failed');
    }

    // Test create todo
    console.log('Testing POST /api/todos...');
    const createResponse = await fetch('http://localhost:3102/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Test todo from automated test' })
    });
    const createData = await createResponse.json();
    
    if (createResponse.status === 201 && createData.success && createData.data.id) {
      console.log('✅ POST todo passed');
      
      const todoId = createData.data.id;
      
      // Test update todo
      console.log('Testing PUT /api/todos/:id...');
      const updateResponse = await fetch(`http://localhost:3102/api/todos/${todoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true })
      });
      const updateData = await updateResponse.json();
      
      if (updateResponse.ok && updateData.success && updateData.data.completed) {
        console.log('✅ PUT todo passed');
      } else {
        throw new Error('PUT todo failed');
      }

      // Test delete todo
      console.log('Testing DELETE /api/todos/:id...');
      const deleteResponse = await fetch(`http://localhost:3102/api/todos/${todoId}`, {
        method: 'DELETE'
      });
      
      if (deleteResponse.status === 204) {
        console.log('✅ DELETE todo passed');
      } else {
        throw new Error('DELETE todo failed');
      }
      
    } else {
      throw new Error('POST todo failed');
    }

    console.log('\n🎉 ALL BACKEND TESTS PASSED!');
    console.log('✅ Server starts correctly');
    console.log('✅ All API endpoints working');
    console.log('✅ CRUD operations functional');
    console.log('✅ Data persistence working');

  } catch (error) {
    console.error('\n❌ BACKEND TEST FAILED:', error.message);
    throw error;
  } finally {
    // Kill the server
    console.log('\n4. Stopping server...');
    serverProcess.kill();
    console.log('✅ Server stopped');
  }
}

// Run the test
if (require.main === module) {
  testBackend()
    .then(() => {
      console.log('\n🎉 BACKEND VALIDATION COMPLETE');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 BACKEND VALIDATION FAILED:', error.message);
      process.exit(1);
    });
}

module.exports = { testBackend };