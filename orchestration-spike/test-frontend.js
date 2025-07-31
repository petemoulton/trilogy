#!/usr/bin/env node

/**
 * Test Frontend Server - Verify the frontend serves correctly
 */

const { spawn } = require('child_process');
const fetch = require('node-fetch');
const path = require('path');

async function testFrontend() {
  console.log('🎨 TESTING FRONTEND SERVER');
  console.log('=========================');

  const frontendPath = path.join(__dirname, 'target-app/openai-frontend');
  
  console.log('1. Starting frontend server on port 3103...');
  
  // Start a simple HTTP server for the frontend
  let serverProcess;
  try {
    serverProcess = spawn('python3', ['-m', 'http.server', '3103'], {
      cwd: frontendPath,
      stdio: 'pipe'
    });
  } catch (error) {
    console.log('Python3 not available, trying npx serve...');
    serverProcess = spawn('npx', ['serve', '-p', '3103', '.'], {
      cwd: frontendPath,
      stdio: 'pipe'
    });
  }

  let serverReady = false;
  
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('Frontend Server:', output.trim());
    if (output.includes('Serving HTTP on') || output.includes('port 3103')) {
      serverReady = true;
    }
  });

  serverProcess.stderr.on('data', (data) => {
    const error = data.toString();
    console.log('Frontend Server:', error.trim());
    if (error.includes('Serving HTTP on') || error.includes('port 3103')) {
      serverReady = true;
    }
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
    setTimeout(checkReady, 2000);
  });

  console.log('✅ Frontend server started on port 3103');

  console.log('2. Testing frontend accessibility...');

  try {
    // Test that the HTML loads
    console.log('Testing HTML page load...');
    const htmlResponse = await fetch('http://localhost:3103/');
    const htmlContent = await htmlResponse.text();
    
    if (htmlResponse.ok && htmlContent.includes('<title>Todo List App')) {
      console.log('✅ HTML page loads correctly');
    } else {
      throw new Error('HTML page failed to load');
    }

    // Test that CSS is accessible
    console.log('Testing CSS file accessibility...');
    const cssResponse = await fetch('http://localhost:3103/styles.css');
    const cssContent = await cssResponse.text();
    
    if (cssResponse.ok && cssContent.includes('TodoApp')) {
      console.log('✅ CSS file loads correctly');
    } else {
      throw new Error('CSS file failed to load');
    }

    // Test that JavaScript is accessible
    console.log('Testing JavaScript file accessibility...');
    const jsResponse = await fetch('http://localhost:3103/app.js');
    const jsContent = await jsResponse.text();
    
    if (jsResponse.ok && jsContent.includes('class TodoApp')) {
      console.log('✅ JavaScript file loads correctly');
    } else {
      throw new Error('JavaScript file failed to load');
    }

    // Check that API endpoints are configured correctly
    console.log('Testing API configuration...');
    if (jsContent.includes('http://localhost:3102/api')) {
      console.log('✅ API endpoints correctly configured for port 3102');
    } else {
      throw new Error('API endpoints not configured correctly');
    }

    console.log('\n🎉 ALL FRONTEND TESTS PASSED!');
    console.log('✅ Frontend serves on port 3103');
    console.log('✅ HTML/CSS/JS files accessible');
    console.log('✅ API configuration correct');

  } catch (error) {
    console.error('\n❌ FRONTEND TEST FAILED:', error.message);
    throw error;
  } finally {
    // Kill the server
    console.log('\n3. Stopping frontend server...');
    serverProcess.kill();
    console.log('✅ Frontend server stopped');
  }
}

// Run the test
if (require.main === module) {
  testFrontend()
    .then(() => {
      console.log('\n🎉 FRONTEND VALIDATION COMPLETE');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 FRONTEND VALIDATION FAILED:', error.message);
      process.exit(1);
    });
}

module.exports = { testFrontend };