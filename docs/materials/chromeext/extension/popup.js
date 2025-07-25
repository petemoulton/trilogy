// Popup script for MCP Chrome Agent

const MCP_SERVER_URL = 'http://localhost:3000';

let isTracking = true;
let currentSessionId = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await checkServerStatus();
  await getSessionInfo();
  setupEventListeners();
});

// Check if MCP server is running
async function checkServerStatus() {
  const statusEl = document.getElementById('status');
  
  try {
    const response = await fetch(`${MCP_SERVER_URL}/health`);
    if (response.ok) {
      statusEl.className = 'status connected';
      statusEl.textContent = 'Connected to MCP Server';
    } else {
      throw new Error('Server not responding');
    }
  } catch (error) {
    statusEl.className = 'status disconnected';
    statusEl.textContent = 'MCP Server Disconnected';
  }
}

// Get current session information
async function getSessionInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Get session ID from background script
    const response = await chrome.runtime.sendMessage({ type: 'GET_SESSION_ID' });
    
    if (response && response.sessionId) {
      currentSessionId = response.sessionId;
      document.getElementById('session-info').style.display = 'block';
      document.getElementById('session-id').textContent = response.sessionId.substring(0, 12) + '...';
      document.getElementById('current-url').textContent = tab.url.substring(0, 40) + '...';
    }
  } catch (error) {
    console.error('Failed to get session info:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('capture-dom').addEventListener('click', captureDom);
  document.getElementById('capture-screenshot').addEventListener('click', captureScreenshot);
  document.getElementById('toggle-tracking').addEventListener('click', toggleTracking);
  document.getElementById('start-recording').addEventListener('click', startRecording);
  document.getElementById('stop-recording').addEventListener('click', stopRecording);
  
  // Load saved macros
  loadSavedMacros();
}

// Capture DOM snapshot
async function captureDom() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Inject script to capture DOM
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.documentElement.outerHTML
    });
    
    if (results[0].result) {
      // Send DOM to background script
      await chrome.runtime.sendMessage({
        type: 'DOM_SNAPSHOT',
        data: { html: results[0].result }
      });
      
      console.log('DOM captured and sent to server');
    }
  } catch (error) {
    console.error('Failed to capture DOM:', error);
  }
}

// Capture screenshot
async function captureScreenshot() {
  try {
    // Send message to background script to capture screenshot
    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT'
    });
    
    if (response && response.success) {
      console.log('Screenshot captured successfully');
      
      // Optionally show preview
      const previewWindow = window.open('', '_blank', 'width=800,height=600');
      previewWindow.document.write(`
        <html>
          <head><title>Screenshot Preview</title></head>
          <body style="margin:0; display:flex; justify-content:center; align-items:center; background:#f0f0f0;">
            <img src="${response.screenshotDataUrl}" style="max-width:100%; max-height:100%; border:1px solid #ccc;" />
          </body>
        </html>
      `);
    } else {
      console.error('Failed to capture screenshot:', response?.error);
      alert('Failed to capture screenshot');
    }
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    alert('Failed to capture screenshot');
  }
}

// Toggle click tracking
function toggleTracking() {
  const btn = document.getElementById('toggle-tracking');
  isTracking = !isTracking;
  
  if (isTracking) {
    btn.textContent = 'Disable Tracking';
    btn.className = 'toggle-btn';
  } else {
    btn.textContent = 'Enable Tracking';
    btn.className = 'toggle-btn disabled';
  }
  
  // Send tracking state to content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'TOGGLE_TRACKING',
      enabled: isTracking
    });
  });
}

// Start macro recording
async function startRecording() {
  const macroName = document.getElementById('macro-name').value || `Macro_${Date.now()}`;
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script to start recording
    chrome.tabs.sendMessage(tab.id, {
      type: 'START_RECORDING',
      macroName: macroName
    }, (response) => {
      if (response && response.success) {
        document.getElementById('start-recording').style.display = 'none';
        document.getElementById('stop-recording').style.display = 'block';
        document.getElementById('macro-name').disabled = true;
        console.log('Recording started');
      }
    });
  } catch (error) {
    console.error('Failed to start recording:', error);
  }
}

// Stop macro recording
async function stopRecording() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script to stop recording
    chrome.tabs.sendMessage(tab.id, {
      type: 'STOP_RECORDING'
    }, (response) => {
      if (response && response.success) {
        document.getElementById('start-recording').style.display = 'block';
        document.getElementById('stop-recording').style.display = 'none';
        document.getElementById('macro-name').disabled = false;
        document.getElementById('macro-name').value = '';
        
        // Refresh macro list
        loadSavedMacros();
        console.log('Recording stopped');
      }
    });
  } catch (error) {
    console.error('Failed to stop recording:', error);
  }
}

// Load saved macros
async function loadSavedMacros() {
  try {
    const result = await chrome.storage.local.get(['macros']);
    const macros = result.macros || [];
    
    const macrosList = document.getElementById('macros-list');
    
    if (macros.length === 0) {
      macrosList.innerHTML = '<p class="no-macros">No macros saved</p>';
    } else {
      macrosList.innerHTML = macros.map(macro => `
        <div class="macro-item">
          <div>
            <div class="macro-name">${macro.name}</div>
            <div class="macro-actions">${macro.actions.length} actions</div>
          </div>
          <button class="play-btn" onclick="playMacro('${macro.name}')">
            <i class="fas fa-play"></i> Play
          </button>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Failed to load macros:', error);
  }
}

// Play a macro
async function playMacro(macroName) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Get the macro from storage
    const result = await chrome.storage.local.get(['macros']);
    const macros = result.macros || [];
    const macro = macros.find(m => m.name === macroName);
    
    if (!macro) {
      alert('Macro not found');
      return;
    }
    
    // Send message to content script to play macro
    chrome.tabs.sendMessage(tab.id, {
      type: 'PLAY_MACRO',
      macro: macro
    }, (response) => {
      if (response && response.success) {
        console.log(`Playing macro: ${macroName}`);
        window.close(); // Close popup
      } else {
        alert('Failed to play macro');
      }
    });
  } catch (error) {
    console.error('Failed to play macro:', error);
  }
}