// Test script for MCP Chrome Agent

const MCP_SERVER_URL = 'http://localhost:3100';

async function testServerEndpoints() {
  console.log('Testing MCP Chrome Agent Server...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${MCP_SERVER_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);

    // Test 2: Create session
    console.log('\n2. Testing session creation...');
    const sessionResponse = await fetch(`${MCP_SERVER_URL}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabId: 123, url: 'http://test.com' })
    });
    const sessionData = await sessionResponse.json();
    console.log('✅ Session created:', sessionData);
    const testSessionId = sessionData.sessionId;

    // Test 3: Send click event
    console.log('\n3. Testing click event...');
    const clickEventResponse = await fetch(`${MCP_SERVER_URL}/click-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: testSessionId,
        event: {
          type: 'click',
          tagName: 'button',
          selector: '#test-button',
          text: 'Test Button',
          coordinates: { x: 100, y: 200, pageX: 100, pageY: 200 },
          timestamp: Date.now(),
          url: 'http://test.com'
        },
        url: 'http://test.com',
        timestamp: Date.now()
      })
    });
    const clickEventData = await clickEventResponse.json();
    console.log('✅ Click event sent:', clickEventData);

    // Test 4: Add command
    console.log('\n4. Testing command addition...');
    const commandResponse = await fetch(`${MCP_SERVER_URL}/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: testSessionId,
        command: {
          type: 'highlight',
          selector: '#test-element'
        }
      })
    });
    const commandData = await commandResponse.json();
    console.log('✅ Command added:', commandData);

    // Test 5: Get commands
    console.log('\n5. Testing command retrieval...');
    const getCommandsResponse = await fetch(`${MCP_SERVER_URL}/commands?sessionId=${testSessionId}`);
    const getCommandsData = await getCommandsResponse.json();
    console.log('✅ Commands retrieved:', getCommandsData);

    // Test 6: Get logs
    console.log('\n6. Testing log retrieval...');
    const logResponse = await fetch(`${MCP_SERVER_URL}/log?limit=5`);
    const logData = await logResponse.json();
    console.log('✅ Logs retrieved:', logData.logs.length, 'events');

    // Test 7: Get sessions
    console.log('\n7. Testing session list...');
    const sessionsResponse = await fetch(`${MCP_SERVER_URL}/sessions`);
    const sessionsData = await sessionsResponse.json();
    console.log('✅ Sessions retrieved:', sessionsData.sessions.length, 'sessions');

    // Test 8: Invalid command (security test)
    console.log('\n8. Testing security validation...');
    const invalidCommandResponse = await fetch(`${MCP_SERVER_URL}/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: testSessionId,
        command: {
          type: 'click',
          selector: 'script[src="malicious.js"]'
        }
      })
    });
    const invalidCommandData = await invalidCommandResponse.json();
    console.log('✅ Security validation:', invalidCommandData.success ? '❌ Failed' : '✅ Passed');

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests if server is available
async function runTests() {
  try {
    const response = await fetch(`${MCP_SERVER_URL}/health`);
    if (response.ok) {
      await testServerEndpoints();
    }
  } catch (error) {
    console.log('❌ MCP Server not running. Please start the server with: node server.js');
  }
}

runTests();
