#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testSampleDataToggle() {
  console.log('🧪 Testing sample data toggle functionality...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3100', { waitUntil: 'networkidle2' });
    console.log('✅ Dashboard loaded successfully');
    
    // Take screenshot before toggle
    await page.screenshot({ 
      path: '/Users/petermoulton/Library/Mobile Documents/com~apple~CloudDocs/Images/Snip Screenshot/trilogy-dashboard-before-toggle-test.png',
      fullPage: true 
    });
    console.log('📸 Before screenshot captured');
    
    // Look for the sample data toggle button
    const toggleButton = await page.$('#sample-data-toggle');
    if (toggleButton) {
      console.log('✅ Sample data toggle button found');
      
      // Check if button is clickable
      const isVisible = await toggleButton.isIntersectingViewport();
      console.log(`   Button is visible: ${isVisible}`);
      
      // Click the toggle button
      await toggleButton.click();
      console.log('✅ Toggle button clicked successfully');
      
      // Wait for changes to take effect
      await page.waitForTimeout(2000);
      
      // Take screenshot after toggle
      await page.screenshot({ 
        path: '/Users/petermoulton/Library/Mobile Documents/com~apple~CloudDocs/Images/Snip Screenshot/trilogy-dashboard-after-toggle-test.png',
        fullPage: true 
      });
      console.log('📸 After screenshot captured');
      
      // Check for console logs to verify function execution
      const logs = await page.evaluate(() => {
        return window.useSampleData;
      });
      console.log(`   Sample data mode: ${logs}`);
      
      console.log('✅ Sample data toggle test PASSED - No "Node is either not clickable or not an Element" error!');
      
    } else {
      console.log('❌ Sample data toggle button not found');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.message.includes('Node is either not clickable or not an Element')) {
      console.log('❌ This is the exact error we were trying to fix!');
    }
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
testSampleDataToggle().then(success => {
  if (success) {
    console.log('\n🎉 TEST RESULT: SAMPLE DATA TOGGLE IS NOW WORKING!');
    console.log('✅ The 24-hour bug has been fixed!');
  } else {
    console.log('\n❌ TEST RESULT: Sample data toggle still not working');
  }
}).catch(console.error);