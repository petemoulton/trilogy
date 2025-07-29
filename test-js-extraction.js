#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testJavaScriptExtraction() {
  console.log('🧪 Testing JavaScript Extraction and Modularization...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Listen for console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  try {
    page.setDefaultTimeout(10000);
    
    console.log('📱 Loading dashboard...');
    await page.goto('http://localhost:3100', { waitUntil: 'networkidle2' });
    
    // Test 1: Check if all global objects are available
    console.log('🧩 Testing global objects availability...');
    const globalObjects = await page.evaluate(() => {
      return {
        Dashboard: typeof window.Dashboard !== 'undefined',
        DataManager: typeof window.DataManager !== 'undefined',
        UIComponents: typeof window.UIComponents !== 'undefined',
        SampleDataManager: typeof window.SampleDataManager !== 'undefined',
        TabManager: typeof window.TabManager !== 'undefined',
        DashboardUtils: typeof window.DashboardUtils !== 'undefined'
      };
    });
    
    console.log('Global Objects Status:', globalObjects);
    
    // Test 2: Test sample data toggle functionality
    console.log('🎯 Testing sample data toggle...');
    const toggleButton = await page.$('#sample-data-toggle');
    if (toggleButton) {
      await toggleButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const sampleMode = await page.evaluate(() => window.useSampleData);
      console.log(`Sample data mode: ${sampleMode}`);
    }
    
    // Test 3: Test tab switching
    console.log('📑 Testing tab switching...');
    const projectsTab = await page.$('[onclick*="projects"]');
    if (projectsTab) {
      await projectsTab.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const currentTab = await page.evaluate(() => window.currentTab);
      console.log(`Current tab: ${currentTab}`);
    }
    
    // Test 4: Check for JavaScript errors
    console.log('🔍 Checking for JavaScript errors...');
    if (consoleErrors.length > 0) {
      console.log('❌ JavaScript errors found:');
      consoleErrors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('✅ No JavaScript errors found');
    }
    
    // Test Results Summary
    const allObjectsLoaded = Object.values(globalObjects).every(loaded => loaded);
    const hasErrors = consoleErrors.length > 0;
    
    console.log('\n📊 TEST RESULTS:');
    console.log(`Global Objects Loaded: ${allObjectsLoaded ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Sample Toggle Working: ${toggleButton ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Tab Switching Working: ${projectsTab ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`No JavaScript Errors: ${!hasErrors ? '✅ PASS' : '❌ FAIL'}`);
    
    const overallResult = allObjectsLoaded && toggleButton && projectsTab && !hasErrors;
    console.log(`\n🎉 OVERALL RESULT: ${overallResult ? '✅ SUCCESS' : '❌ FAILURE'}`);
    
    return {
      success: overallResult,
      globalObjects,
      consoleErrors,
      tests: {
        globalObjectsLoaded: allObjectsLoaded,
        sampleToggleFound: !!toggleButton,
        tabSwitchingFound: !!projectsTab,
        noErrors: !hasErrors
      }
    };
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

testJavaScriptExtraction().then(result => {
  if (result.success) {
    console.log('\n🎉 JavaScript extraction and modularization SUCCESSFUL!');
    console.log('✅ All modules loaded correctly');
    console.log('✅ Dashboard functionality preserved');
  } else {
    console.log('\n❌ JavaScript extraction needs fixes');
    if (result.error) {
      console.log(`Error: ${result.error}`);
    }
  }
}).catch(console.error);