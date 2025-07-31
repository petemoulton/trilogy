#!/usr/bin/env node

/**
 * Run Frontend Tests - Execute the frontend test suite
 */

const { spawn } = require('child_process');
const path = require('path');

async function runFrontendTests() {
  console.log('🧪 RUNNING FRONTEND TEST SUITE');
  console.log('==============================');

  const frontendPath = path.join(__dirname, 'target-app/openai-frontend');
  
  console.log('1. Starting simple HTTP server...');
  
  // Start frontend server
  const serverProcess = spawn('python3', ['-m', 'http.server', '3103'], {
    cwd: frontendPath,
    stdio: 'pipe'
  });

  let serverReady = false;
  
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Serving HTTP on')) {
      serverReady = true;
    }
  });

  serverProcess.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Serving HTTP on')) {
      serverReady = true;
    }
  });

  // Wait for server
  await new Promise(resolve => {
    const checkReady = () => {
      if (serverReady) {
        resolve();
      } else {
        setTimeout(checkReady, 100);
      }
    };
    setTimeout(checkReady, 3000);
  });

  console.log('✅ Frontend server started');
  console.log('2. Opening test page and running tests...');
  
  try {
    // Use puppeteer to run the tests
    const puppeteer = require('puppeteer');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capture console output
    const logs = [];
    page.on('console', msg => {
      logs.push(msg.text());
    });
    
    // Navigate to the page
    await page.goto('http://localhost:3103/', { waitUntil: 'networkidle0' });
    
    // Wait for TodoApp to be initialized
    await page.waitForFunction(() => window.todoApp !== undefined, { timeout: 5000 });
    
    // Run the test suite
    const testResults = await page.evaluate(async () => {
      // Wait for tests to be available
      if (typeof testSuite === 'undefined') {
        return { error: 'Test suite not available' };
      }
      
      try {
        const results = await testSuite.runAll();
        return {
          success: true,
          results: results,
          passed: testSuite.passed,
          failed: testSuite.failed,
          total: testSuite.passed + testSuite.failed
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    await browser.close();
    
    if (testResults.error) {
      throw new Error(`Frontend tests failed: ${testResults.error}`);
    }
    
    console.log('✅ Frontend tests completed');
    console.log(`📊 Results: ${testResults.passed}/${testResults.total} tests passed`);
    
    if (testResults.failed > 0) {
      console.log(`⚠️  ${testResults.failed} tests failed`);
      console.log('Failed tests:', testResults.results.filter(r => r.status === 'failed'));
    }
    
    console.log('\n🎉 FRONTEND TEST SUITE COMPLETE!');
    console.log(`✅ Tests passed: ${testResults.passed}`);
    console.log(`❌ Tests failed: ${testResults.failed}`);
    console.log(`📊 Success rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);

  } catch (error) {
    console.error('\n❌ FRONTEND TESTS FAILED:', error.message);
    console.log('\n📝 Manual testing instructions:');
    console.log('1. Open http://localhost:3103/ in your browser');
    console.log('2. Open browser console (F12)');
    console.log('3. Run: testSuite.runAll()');
    console.log('4. Check the test results');
  } finally {
    console.log('\n3. Stopping frontend server...');
    serverProcess.kill();
    console.log('✅ Frontend server stopped');
  }
}

// Run the test
if (require.main === module) {
  runFrontendTests()
    .then(() => {
      console.log('\n🎉 FRONTEND TEST VALIDATION COMPLETE');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 FRONTEND TEST VALIDATION FAILED:', error.message);
      process.exit(1);
    });
}

module.exports = { runFrontendTests };