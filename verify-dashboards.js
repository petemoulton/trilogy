#!/usr/bin/env node

// Simple verification script for both dashboards
const https = require('https');
const http = require('http');

function testEndpoint(url, name) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`✅ ${name}: HTTP ${res.statusCode} - ${data.length} bytes`);
        resolve({ success: true, status: res.statusCode, length: data.length });
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ ${name}: ${error.message}`);
      resolve({ success: false, error: error.message });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log(`❌ ${name}: Timeout after 5 seconds`);
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

async function verifyDashboards() {
  console.log('🧪 Verifying Trilogy System Dashboards...\n');
  
  // Test main server endpoints
  console.log('📊 Testing Main Server (port 8080):');
  await testEndpoint('http://localhost:8080/health', 'Health Check');
  await testEndpoint('http://localhost:8080/', 'Main Dashboard');
  await testEndpoint('http://localhost:8080/agents/pool/status', 'Agent Pool Status');
  
  console.log('\n🌐 Testing MCP Server (port 3000):');
  await testEndpoint('http://localhost:3000/health', 'MCP Health Check');
  await testEndpoint('http://localhost:3000/dashboard', 'MCP Dashboard');
  await testEndpoint('http://localhost:3000/', 'MCP Root (should redirect)');
  
  console.log('\n🎉 Dashboard verification complete!');
  console.log('📖 Main Dashboard: http://localhost:8080');
  console.log('🌐 MCP Dashboard: http://localhost:3000/dashboard');
}

verifyDashboards().catch(console.error);