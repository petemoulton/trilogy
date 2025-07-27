#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testDashboards() {
  console.log('🧪 Testing both dashboards with Puppeteer...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  try {
    // Test Main Dashboard (port 8080)
    console.log('📊 Testing Main Dashboard on port 8080...');
    const page1 = await browser.newPage();
    
    try {
      await page1.goto('http://localhost:8080', { waitUntil: 'networkidle2', timeout: 10000 });
      const title1 = await page1.title();
      console.log(`✅ Main Dashboard loaded: "${title1}"`);
      
      // Check for key elements
      const systemStatus = await page1.$('#system-status');
      const agentStatus = await page1.$('#agent-status');
      const poolTotal = await page1.$('#pool-total');
      
      if (systemStatus && agentStatus && poolTotal) {
        console.log('✅ Main Dashboard: All key elements present');
        
        // Take screenshot
        await page1.screenshot({ path: '/tmp/main-dashboard.png', fullPage: true });
        console.log('📸 Main Dashboard screenshot saved to /tmp/main-dashboard.png');
      } else {
        console.log('❌ Main Dashboard: Missing key elements');
      }
      
    } catch (error) {
      console.log(`❌ Main Dashboard failed: ${error.message}`);
    }
    
    // Test MCP Dashboard (port 3000)
    console.log('\n🌐 Testing MCP Dashboard on port 3000...');
    const page2 = await browser.newPage();
    
    try {
      await page2.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2', timeout: 10000 });
      const title2 = await page2.title();
      console.log(`✅ MCP Dashboard loaded: "${title2}"`);
      
      // Check if page has content (not just error page)
      const bodyText = await page2.evaluate(() => document.body.innerText);
      if (bodyText.length > 100) {
        console.log('✅ MCP Dashboard: Content loaded successfully');
        
        // Take screenshot
        await page2.screenshot({ path: '/tmp/mcp-dashboard.png', fullPage: true });
        console.log('📸 MCP Dashboard screenshot saved to /tmp/mcp-dashboard.png');
      } else {
        console.log('❌ MCP Dashboard: Minimal content detected');
        console.log('Body text preview:', bodyText.substring(0, 200));
      }
      
    } catch (error) {
      console.log(`❌ MCP Dashboard failed: ${error.message}`);
    }
    
    // Test API endpoints
    console.log('\n🔗 Testing API endpoints...');
    const page3 = await browser.newPage();
    
    try {
      // Test main server health
      await page3.goto('http://localhost:8080/health', { waitUntil: 'networkidle2' });
      const healthResponse = await page3.evaluate(() => JSON.parse(document.body.innerText));
      console.log('✅ Main server health:', healthResponse.status);
      
      // Test agent pool status
      await page3.goto('http://localhost:8080/agents/pool/status', { waitUntil: 'networkidle2' });
      const poolResponse = await page3.evaluate(() => JSON.parse(document.body.innerText));
      console.log('✅ Agent pool status:', poolResponse.success ? 'Connected' : 'Disconnected');
      
      // Test MCP server health
      await page3.goto('http://localhost:3000/health', { waitUntil: 'networkidle2' });
      const mcpHealthResponse = await page3.evaluate(() => JSON.parse(document.body.innerText));
      console.log('✅ MCP server health:', mcpHealthResponse.status);
      
    } catch (error) {
      console.log(`❌ API endpoint test failed: ${error.message}`);
    }
    
    console.log('\n🎉 Dashboard testing complete!');
    console.log('📸 Screenshots saved to /tmp/ for visual verification');
    
  } catch (error) {
    console.error('❌ Testing failed:', error);
  } finally {
    await browser.close();
  }
}

// Check if system is running first
async function checkSystemStatus() {
  try {
    const response = await fetch('http://localhost:8080/health');
    if (response.ok) {
      console.log('✅ System is running, proceeding with tests...');
      return true;
    }
  } catch (error) {
    console.log('❌ System not running. Please start with: node start-system.js');
    return false;
  }
}

async function main() {
  const isRunning = await checkSystemStatus();
  if (isRunning) {
    await testDashboards();
  }
}

main().catch(console.error);