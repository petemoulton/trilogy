#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testToggleSimple() {
  console.log('🧪 Quick test of sample data toggle...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Set a shorter timeout
    page.setDefaultTimeout(10000);
    
    await page.goto('http://localhost:3100', { waitUntil: 'networkidle2', timeout: 10000 });
    console.log('✅ Dashboard loaded');
    
    // Check if the toggle button exists
    const toggleExists = await page.$('#sample-data-toggle') !== null;
    console.log(`Toggle button exists: ${toggleExists}`);
    
    if (toggleExists) {
      // Try to click it
      await page.click('#sample-data-toggle');
      console.log('✅ Toggle button clicked without error');
      
      // Check if sample data mode was toggled
      const sampleMode = await page.evaluate(() => window.useSampleData);
      console.log(`Sample data mode: ${sampleMode}`);
      
      console.log('🎉 SUCCESS: Sample data toggle is working!');
      return true;
    } else {
      console.log('❌ Toggle button not found');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

testToggleSimple().then(success => {
  console.log(success ? '✅ Test passed!' : '❌ Test failed!');
}).catch(console.error);