// Background service worker for MCP Chrome Agent

const MCP_SERVER_URL = 'http://localhost:3101';
const activeSessions = new Map();

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('MCP Chrome Agent extension installed');
});

// Handle tab updates - create sessions for new pages
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      // Create session for this tab
      const response = await fetch(`${MCP_SERVER_URL}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tabId: tabId,
          url: tab.url
        })
      });

      if (response.ok) {
        const { sessionId } = await response.json();
        activeSessions.set(tabId, sessionId);

        // Store session in tab's storage
        await chrome.storage.local.set({
          [`session_${tabId}`]: sessionId
        });

        console.log(`Session created for tab ${tabId}: ${sessionId}`);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }
});

// Handle tab removal - cleanup sessions
chrome.tabs.onRemoved.addListener(async (tabId) => {
  activeSessions.delete(tabId);
  await chrome.storage.local.remove(`session_${tabId}`);
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CLICK_EVENT') {
    handleClickEvent(message.data, sender.tab);
  } else if (message.type === 'DOM_SNAPSHOT') {
    handleDomSnapshot(message.data, sender.tab);
  } else if (message.type === 'GET_SESSION_ID') {
    const sessionId = activeSessions.get(sender.tab.id);
    sendResponse({ sessionId });
  } else if (message.type === 'CAPTURE_SCREENSHOT') {
    handleScreenshotCapture(sender.tab, sendResponse);
    return true; // Keep message channel open for async response
  }

  return true; // Keep message channel open for async response
});

// Send click event to MCP server
async function handleClickEvent(eventData, tab) {
  const sessionId = activeSessions.get(tab.id);

  try {
    const response = await fetch(`${MCP_SERVER_URL}/click-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        event: eventData,
        url: tab.url,
        timestamp: Date.now()
      })
    });

    if (response.ok) {
      console.log('Click event sent successfully');
    }
  } catch (error) {
    console.error('Failed to send click event:', error);
  }
}

// Send DOM snapshot to MCP server
async function handleDomSnapshot(domData, tab) {
  const sessionId = activeSessions.get(tab.id);

  try {
    const response = await fetch(`${MCP_SERVER_URL}/full-dom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        html: domData.html,
        url: tab.url,
        timestamp: Date.now()
      })
    });

    if (response.ok) {
      console.log('DOM snapshot sent successfully');
    }
  } catch (error) {
    console.error('Failed to send DOM snapshot:', error);
  }
}

// Poll for commands from MCP server
async function pollForCommands() {
  for (const [tabId, sessionId] of activeSessions.entries()) {
    try {
      const response = await fetch(`${MCP_SERVER_URL}/commands?sessionId=${sessionId}`);

      if (response.ok) {
        const { commands } = await response.json();

        if (commands && commands.length > 0) {
          // Send commands to content script
          chrome.tabs.sendMessage(tabId, {
            type: 'EXECUTE_COMMANDS',
            commands: commands
          });
        }
      }
    } catch (error) {
      console.error(`Failed to poll commands for session ${sessionId}:`, error);
    }
  }
}

// Start polling for commands every 3 seconds
setInterval(pollForCommands, 3000);

// Handle screenshot capture
async function handleScreenshotCapture(tab, sendResponse) {
  try {
    // Capture screenshot of the active tab
    const screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
      quality: 90
    });

    // Send screenshot to server
    const sessionId = activeSessions.get(tab.id);
    const response = await fetch(`${MCP_SERVER_URL}/screenshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        screenshot: screenshotDataUrl,
        url: tab.url,
        timestamp: Date.now(),
        title: tab.title
      })
    });

    if (response.ok) {
      console.log('Screenshot captured and sent successfully');
      sendResponse({ success: true, screenshotDataUrl });
    } else {
      throw new Error('Failed to send screenshot to server');
    }
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Test server connection on startup
async function testServerConnection() {
  try {
    const response = await fetch(`${MCP_SERVER_URL}/health`);
    if (response.ok) {
      console.log('MCP server connection successful');
    }
  } catch (error) {
    console.warn('MCP server not reachable - make sure server.js is running');
  }
}

testServerConnection();
