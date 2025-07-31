#!/usr/bin/env node

/**
 * Simple Frontend Test - Just verify files are correctly configured
 */

const fs = require('fs');
const path = require('path');

async function testFrontendFiles() {
  console.log('🎨 TESTING FRONTEND FILES');
  console.log('=========================');

  const frontendPath = path.join(__dirname, 'target-app/openai-frontend');
  
  try {
    console.log('1. Checking HTML file...');
    const htmlContent = fs.readFileSync(path.join(frontendPath, 'index.html'), 'utf8');
    
    if (htmlContent.includes('<title>Todo List App')) {
      console.log('✅ HTML file exists and has correct title');
    } else {
      throw new Error('HTML file missing or incorrect');
    }

    console.log('2. Checking CSS file...');
    const cssContent = fs.readFileSync(path.join(frontendPath, 'styles.css'), 'utf8');
    
    if (cssContent.includes('.container') && cssContent.length > 1000) {
      console.log('✅ CSS file exists and has styling rules');
    } else {
      throw new Error('CSS file missing or incomplete');
    }

    console.log('3. Checking JavaScript file...');
    const jsContent = fs.readFileSync(path.join(frontendPath, 'app.js'), 'utf8');
    
    if (jsContent.includes('class TodoApp') && jsContent.includes('http://localhost:3102/api')) {
      console.log('✅ JavaScript file exists with correct API configuration');
    } else {
      throw new Error('JavaScript file missing or incorrectly configured');
    }

    console.log('4. Checking test file...');
    const testContent = fs.readFileSync(path.join(frontendPath, 'frontend-tests.js'), 'utf8');
    
    if (testContent.includes('FrontendTestSuite') && testContent.length > 1000) {
      console.log('✅ Frontend test suite exists');
    } else {
      throw new Error('Frontend test suite missing or incomplete');
    }

    console.log('\n🎉 ALL FRONTEND FILE CHECKS PASSED!');
    console.log('✅ HTML structure complete');
    console.log('✅ CSS styling ready');
    console.log('✅ JavaScript configured for port 3102 API');
    console.log('✅ Test suite available');

    return true;

  } catch (error) {
    console.error('\n❌ FRONTEND FILE CHECK FAILED:', error.message);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testFrontendFiles()
    .then(() => {
      console.log('\n🎉 FRONTEND FILE VALIDATION COMPLETE');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 FRONTEND FILE VALIDATION FAILED:', error.message);
      process.exit(1);
    });
}

module.exports = { testFrontendFiles };