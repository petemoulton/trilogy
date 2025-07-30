#!/usr/bin/env node

const puppeteer = require('puppeteer');
const path = require('path');

async function verifyDashboardsWithPuppeteer() {
  console.log('🕷️ Starting Puppeteer verification of both dashboards...');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  try {
    // Test Main Dashboard (port 8080)
    console.log('\n📊 Testing Main Dashboard (port 8080)...');
    const page1 = await browser.newPage();
    await page1.setViewport({ width: 1920, height: 1080 });

    try {
      await page1.goto('http://localhost:8080', {
        waitUntil: 'networkidle2',
        timeout: 15000
      });

      const title1 = await page1.title();
      console.log(`✅ Main Dashboard loaded: "${title1}"`);

      // Check for key elements
      const hasSystemStatus = await page1.$('#system-status') !== null;
      const hasAgentStatus = await page1.$('#agent-status') !== null;
      const hasPoolTotal = await page1.$('#pool-total') !== null;
      const hasLogDisplay = await page1.$('#log-display') !== null;

      console.log(`   - System Status indicator: ${hasSystemStatus ? '✅' : '❌'}`);
      console.log(`   - Agent Status panel: ${hasAgentStatus ? '✅' : '❌'}`);
      console.log(`   - Pool Total counter: ${hasPoolTotal ? '✅' : '❌'}`);
      console.log(`   - Log Display: ${hasLogDisplay ? '✅' : '❌'}`);

      // Take screenshot
      await page1.screenshot({
        path: '/Users/petermoulton/Library/Mobile Documents/com~apple~CloudDocs/Images/Snip Screenshot/main-dashboard-verify.png',
        fullPage: true
      });
      console.log('📸 Screenshot saved: main-dashboard-verify.png');

      // Get page content sample
      const bodyText = await page1.evaluate(() => document.body.innerText);
      console.log(`   - Page content length: ${bodyText.length} characters`);

      if (bodyText.includes('Trilogy AI System')) {
        console.log('✅ Main Dashboard: Title content verified');
      }

    } catch (error) {
      console.log(`❌ Main Dashboard failed: ${error.message}`);
    }

    // Test MCP Dashboard (port 3000)
    console.log('\n🌐 Testing MCP Dashboard (port 3000)...');
    const page2 = await browser.newPage();
    await page2.setViewport({ width: 1920, height: 1080 });

    try {
      await page2.goto('http://localhost:3000/dashboard/', {
        waitUntil: 'networkidle2',
        timeout: 15000
      });

      const title2 = await page2.title();
      console.log(`✅ MCP Dashboard loaded: "${title2}"`);

      // Get page content
      const bodyText2 = await page2.evaluate(() => document.body.innerText);
      console.log(`   - Page content length: ${bodyText2.length} characters`);

      // Take screenshot
      await page2.screenshot({
        path: '/Users/petermoulton/Library/Mobile Documents/com~apple~CloudDocs/Images/Snip Screenshot/mcp-dashboard-verify.png',
        fullPage: true
      });
      console.log('📸 Screenshot saved: mcp-dashboard-verify.png');

      if (bodyText2.length > 100) {
        console.log('✅ MCP Dashboard: Content loaded successfully');
      } else {
        console.log('⚠️ MCP Dashboard: Limited content detected');
        console.log(`   Content preview: ${bodyText2.substring(0, 200)}`);
      }

    } catch (error) {
      console.log(`❌ MCP Dashboard failed: ${error.message}`);
    }

    // Test API endpoints
    console.log('\n🔗 Testing API endpoints via browser...');
    const page3 = await browser.newPage();

    // Test agent spawning
    try {
      await page3.goto('http://localhost:8080/agents/pool/status', { waitUntil: 'networkidle2' });
      const apiResponse = await page3.evaluate(() => {
        try {
          return JSON.parse(document.body.innerText);
        } catch (e) {
          return { error: 'Not JSON' };
        }
      });

      console.log(`✅ Agent Pool API: ${apiResponse.success ? 'Connected' : 'Disconnected'}`);
      if (apiResponse.poolStats) {
        console.log(`   - Total agents: ${apiResponse.poolStats.totalAgents || 0}`);
        console.log(`   - Active agents: ${apiResponse.poolStats.activeAgents || 0}`);
      }

    } catch (error) {
      console.log(`❌ API test failed: ${error.message}`);
    }

    console.log('\n🎉 Puppeteer verification complete!');
    console.log('📸 Screenshots saved to: ~/Library/Mobile Documents/com~apple~CloudDocs/Images/Snip Screenshot/');
    console.log('📖 Main Dashboard: http://localhost:8080');
    console.log('🌐 MCP Dashboard: http://localhost:3000/dashboard');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await browser.close();
  }
}

verifyDashboardsWithPuppeteer().catch(console.error);
