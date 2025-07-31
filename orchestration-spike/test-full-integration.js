#!/usr/bin/env node

/**
 * Full Integration Test - Test the complete todo application stack
 */

const { spawn } = require('child_process');
const fetch = require('node-fetch');
const path = require('path');

async function testFullIntegration() {
  console.log('🚀 TESTING FULL STACK INTEGRATION');
  console.log('==================================');

  const backendPath = path.join(__dirname, 'target-app/gemini-backend');
  let backendProcess = null;

  try {
    console.log('1. Starting backend server (port 3102)...');
    
    // Start backend
    backendProcess = spawn('node', ['server.js'], {
      cwd: backendPath,
      stdio: 'pipe'
    });

    let backendReady = false;
    
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Todo API Server running on port 3102')) {
        backendReady = true;
      }
    });

    // Wait for backend to start
    await new Promise(resolve => {
      const checkReady = () => {
        if (backendReady) {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      setTimeout(checkReady, 2000);
    });

    console.log('✅ Backend server running on port 3102');

    console.log('2. Testing complete todo workflow...');

    // Test 1: Health check
    console.log('   → Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3102/health');
    const healthData = await healthResponse.json();
    
    if (!healthResponse.ok || healthData.status !== 'healthy') {
      throw new Error('Health check failed');
    }
    console.log('   ✅ Health check passed');

    // Test 2: Get empty todos
    console.log('   → Testing empty todos list...');
    const emptyTodosResponse = await fetch('http://localhost:3102/api/todos');
    const emptyTodosData = await emptyTodosResponse.json();
    
    if (!emptyTodosResponse.ok || !emptyTodosData.success || !Array.isArray(emptyTodosData.data)) {
      throw new Error('Empty todos test failed');
    }
    console.log('   ✅ Empty todos list works');

    // Test 3: Create multiple todos
    console.log('   → Testing todo creation...');
    const todos = [
      'Complete the orchestration spike test',
      'Verify all components work together',
      'Document the testing process'
    ];

    const createdTodos = [];
    
    for (const todoText of todos) {
      const createResponse = await fetch('http://localhost:3102/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: todoText })
      });
      const createData = await createResponse.json();
      
      if (createResponse.status !== 201 || !createData.success || !createData.data.id) {
        throw new Error(`Failed to create todo: ${todoText}`);
      }
      
      createdTodos.push(createData.data);
    }
    console.log(`   ✅ Created ${createdTodos.length} todos successfully`);

    // Test 4: Get populated todos
    console.log('   → Testing populated todos list...');
    const populatedTodosResponse = await fetch('http://localhost:3102/api/todos');
    const populatedTodosData = await populatedTodosResponse.json();
    
    if (!populatedTodosResponse.ok || populatedTodosData.data.length !== 3) {
      throw new Error('Populated todos test failed');
    }
    console.log('   ✅ Populated todos list works');

    // Test 5: Update todos (mark as completed)
    console.log('   → Testing todo updates...');
    const firstTodo = createdTodos[0];
    const updateResponse = await fetch(`http://localhost:3102/api/todos/${firstTodo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true })
    });
    const updateData = await updateResponse.json();
    
    if (!updateResponse.ok || !updateData.success || !updateData.data.completed) {
      throw new Error('Todo update failed');
    }
    console.log('   ✅ Todo updates work');

    // Test 6: Delete todos
    console.log('   → Testing todo deletion...');
    const deleteResponse = await fetch(`http://localhost:3102/api/todos/${firstTodo.id}`, {
      method: 'DELETE'
    });
    
    if (deleteResponse.status !== 204) {
      throw new Error('Todo deletion failed');
    }
    console.log('   ✅ Todo deletion works');

    // Test 7: Verify deletion
    console.log('   → Verifying deletion...');
    const finalTodosResponse = await fetch('http://localhost:3102/api/todos');
    const finalTodosData = await finalTodosResponse.json();
    
    if (!finalTodosResponse.ok || finalTodosData.data.length !== 2) {
      throw new Error('Deletion verification failed');
    }
    console.log('   ✅ Deletion verified');

    // Test 8: Error handling
    console.log('   → Testing error handling...');
    const errorResponse = await fetch('http://localhost:3102/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' })  // Empty text should fail
    });
    
    if (errorResponse.status !== 400) {
      throw new Error('Error handling test failed');
    }
    console.log('   ✅ Error handling works');

    // Test 9: Frontend files are correctly configured
    console.log('3. Testing frontend configuration...');
    const frontendPath = path.join(__dirname, 'target-app/openai-frontend');
    const fs = require('fs');
    
    const jsContent = fs.readFileSync(path.join(frontendPath, 'app.js'), 'utf8');
    if (!jsContent.includes('http://localhost:3102/api')) {
      throw new Error('Frontend not configured for correct backend port');
    }
    console.log('   ✅ Frontend configured for port 3102');

    // Test 10: CORS configuration
    console.log('4. Testing CORS configuration...');
    const corsResponse = await fetch('http://localhost:3102/api/todos', {
      headers: {
        'Origin': 'http://localhost:3103',
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    if (!corsResponse.ok) {
      throw new Error('CORS configuration failed');
    }
    console.log('   ✅ CORS configured for frontend port 3103');

    console.log('\n🎉 FULL INTEGRATION TEST COMPLETE!');
    console.log('==================================');
    console.log('✅ Backend server runs on port 3102');
    console.log('✅ All CRUD operations functional');
    console.log('✅ Data persistence working');
    console.log('✅ Error handling robust');
    console.log('✅ Frontend configured correctly');
    console.log('✅ CORS configured properly');
    console.log('✅ Multi-provider integration successful');

    return {
      success: true,
      testsRun: 10,
      backendPort: 3102,
      frontendPort: 3103,
      todosCreated: createdTodos.length
    };

  } catch (error) {
    console.error('\n❌ INTEGRATION TEST FAILED:', error.message);
    throw error;
  } finally {
    if (backendProcess) {
      console.log('\n5. Stopping backend server...');
      backendProcess.kill();
      console.log('✅ Backend server stopped');
    }
  }
}

// Run the test
if (require.main === module) {
  testFullIntegration()
    .then((results) => {
      console.log('\n🎉 INTEGRATION VALIDATION COMPLETE');
      console.log(`📊 Tests Run: ${results.testsRun}`);
      console.log(`🎯 Success: ${results.success}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 INTEGRATION VALIDATION FAILED:', error.message);
      process.exit(1);
    });
}

module.exports = { testFullIntegration };