// Content script for MCP Chrome Agent
// Handles DOM reading, click tracking, and command execution

let isTrackingEnabled = true;
let sessionId = null;

// Initialize content script
(function initialize() {
  console.log('MCP Chrome Agent content script loaded');

  // Get session ID from background script
  chrome.runtime.sendMessage({ type: 'GET_SESSION_ID' }, (response) => {
    if (response && response.sessionId) {
      sessionId = response.sessionId;
      console.log(`Content script initialized with session: ${sessionId}`);
    }
  });

  // Start click tracking
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupClickTracking);
  } else {
    setupClickTracking();
  }
})();

// Setup click event tracking
function setupClickTracking() {
  document.addEventListener('click', handleClick, true);
  document.addEventListener('input', handleInput, true);
  document.addEventListener('change', handleChange, true);

  console.log('Click tracking enabled');
}

// Handle click events
function handleClick(event) {
  if (!isTrackingEnabled) return;

  const target = event.target;
  const clickData = {
    type: 'click',
    tagName: target.tagName.toLowerCase(),
    id: target.id || null,
    className: target.className || null,
    text: target.textContent ? target.textContent.trim().substring(0, 100) : null,
    selector: generateSelector(target),
    coordinates: {
      x: event.clientX,
      y: event.clientY,
      pageX: event.pageX,
      pageY: event.pageY
    },
    timestamp: Date.now(),
    url: window.location.href
  };

  // Send click event to background script
  chrome.runtime.sendMessage({
    type: 'CLICK_EVENT',
    data: clickData
  });

  console.log('Click tracked:', clickData);
}

// Handle input events
function handleInput(event) {
  if (!isTrackingEnabled) return;

  const target = event.target;
  if (target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea') {
    const inputData = {
      type: 'input',
      tagName: target.tagName.toLowerCase(),
      inputType: target.type || 'text',
      id: target.id || null,
      name: target.name || null,
      selector: generateSelector(target),
      value: target.type === 'password' ? '[PASSWORD]' : target.value.substring(0, 100),
      timestamp: Date.now(),
      url: window.location.href
    };

    chrome.runtime.sendMessage({
      type: 'CLICK_EVENT',
      data: inputData
    });
  }
}

// Handle change events (for selects, checkboxes, etc.)
function handleChange(event) {
  if (!isTrackingEnabled) return;

  const target = event.target;
  const changeData = {
    type: 'change',
    tagName: target.tagName.toLowerCase(),
    id: target.id || null,
    name: target.name || null,
    selector: generateSelector(target),
    value: target.value,
    checked: target.checked || null,
    timestamp: Date.now(),
    url: window.location.href
  };

  chrome.runtime.sendMessage({
    type: 'CLICK_EVENT',
    data: changeData
  });
}

// Generate CSS selector for an element
function generateSelector(element) {
  if (element.id) {
    return `#${element.id}`;
  }

  let selector = element.tagName.toLowerCase();

  if (element.className) {
    const classes = element.className.split(' ').filter(c => c.trim());
    if (classes.length > 0) {
      selector += '.' + classes.join('.');
    }
  }

  // Add nth-child if no unique identifier
  if (!element.id && (!element.className || element.className.trim() === '')) {
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === element.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(element) + 1;
        selector += `:nth-child(${index})`;
      }
    }
  }

  return selector;
}

// Capture full DOM snapshot
function captureDOM() {
  return {
    html: document.documentElement.outerHTML,
    url: window.location.href,
    title: document.title,
    timestamp: Date.now()
  };
}

// Execute commands received from server
function executeCommand(command) {
  console.log('Executing command:', command);

  // Validate command before execution
  if (!isValidCommand(command)) {
    console.error('Invalid or unsafe command:', command);
    return;
  }

  switch (command.type) {
  case 'click':
    executeClickCommand(command);
    break;
  case 'highlight':
    executeHighlightCommand(command);
    break;
  case 'scroll':
    executeScrollCommand(command);
    break;
  case 'input':
    executeInputCommand(command);
    break;
  case 'capture_dom':
    captureDOMCommand();
    break;
  default:
    console.warn('Unknown command type:', command.type);
  }
}

// Validate command safety
function isValidCommand(command) {
  if (!command || typeof command !== 'object') return false;

  // Check required fields
  if (!command.type || !command.selector) return false;

  // Validate command type
  const validTypes = ['click', 'highlight', 'scroll', 'input', 'capture_dom'];
  if (!validTypes.includes(command.type)) return false;

  // Validate selector safety
  if (!isValidSelector(command.selector)) return false;

  // Additional validation for input commands
  if (command.type === 'input' && command.value) {
    // Prevent script injection in input values
    if (/<script|javascript:|data:|vbscript:/i.test(command.value)) {
      return false;
    }
  }

  return true;
}

// Validate selector safety (client-side)
function isValidSelector(selector) {
  if (!selector || typeof selector !== 'string') return false;

  // Prevent dangerous selectors
  const dangerousPatterns = [
    /script/i,
    /eval/i,
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /onload/i,
    /onclick/i,
    /onerror/i
  ];

  return !dangerousPatterns.some(pattern => pattern.test(selector));
}

// Execute click command
function executeClickCommand(command) {
  const element = document.querySelector(command.selector);
  if (element) {
    element.click();
    console.log(`Clicked element: ${command.selector}`);
  } else {
    console.error(`Element not found: ${command.selector}`);
  }
}

// Execute highlight command
function executeHighlightCommand(command) {
  const element = document.querySelector(command.selector);
  if (element) {
    element.style.outline = '3px solid red';
    element.style.backgroundColor = 'yellow';

    // Remove highlight after 3 seconds
    setTimeout(() => {
      element.style.outline = '';
      element.style.backgroundColor = '';
    }, 3000);

    console.log(`Highlighted element: ${command.selector}`);
  } else {
    console.error(`Element not found: ${command.selector}`);
  }
}

// Execute scroll command
function executeScrollCommand(command) {
  if (command.coordinates) {
    window.scrollTo(command.coordinates.x, command.coordinates.y);
  } else if (command.selector) {
    const element = document.querySelector(command.selector);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

// Execute input command
function executeInputCommand(command) {
  const element = document.querySelector(command.selector);
  if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
    element.value = command.value || '';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`Input set for element: ${command.selector}`);
  } else {
    console.error(`Input element not found: ${command.selector}`);
  }
}

// Capture and send DOM
function captureDOMCommand() {
  const domData = captureDOM();
  chrome.runtime.sendMessage({
    type: 'DOM_SNAPSHOT',
    data: domData
  });
}

// Listen for messages from background script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
  case 'EXECUTE_COMMANDS':
    message.commands.forEach(executeCommand);
    break;
  case 'TOGGLE_TRACKING':
    isTrackingEnabled = message.enabled;
    console.log(`Tracking ${isTrackingEnabled ? 'enabled' : 'disabled'}`);
    break;
  case 'CAPTURE_DOM':
    captureDOMCommand();
    break;
  case 'START_RECORDING':
    if (typeof macroRecorder !== 'undefined') {
      const success = macroRecorder.startRecording(message.macroName);
      sendResponse({ success });
    } else {
      sendResponse({ success: false, error: 'Macro recorder not available' });
    }
    break;
  case 'STOP_RECORDING':
    if (typeof macroRecorder !== 'undefined') {
      const macro = macroRecorder.stopRecording();
      sendResponse({ success: !!macro, macro });
    } else {
      sendResponse({ success: false, error: 'Macro recorder not available' });
    }
    break;
  case 'PLAY_MACRO':
    if (typeof macroRecorder !== 'undefined') {
      macroRecorder.playMacro(message.macro).then(success => {
        sendResponse({ success });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    } else {
      sendResponse({ success: false, error: 'Macro recorder not available' });
    }
    break;
  }

  return true;
});
