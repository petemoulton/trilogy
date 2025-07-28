// Macro Recording Module for MCP Chrome Agent

class MacroRecorder {
    constructor() {
        this.isRecording = false;
        this.recordedActions = [];
        this.startTime = null;
        this.currentMacro = null;
        
        this.setupEventListeners();
    }

    // Start recording a new macro
    startRecording(macroName = `Macro_${Date.now()}`) {
        if (this.isRecording) {
            console.warn('Already recording a macro');
            return false;
        }

        this.isRecording = true;
        this.recordedActions = [];
        this.startTime = Date.now();
        this.currentMacro = {
            name: macroName,
            createdAt: this.startTime,
            actions: []
        };

        console.log(`Started recording macro: ${macroName}`);
        this.notifyRecordingState(true);
        return true;
    }

    // Stop recording
    stopRecording() {
        if (!this.isRecording) {
            console.warn('Not currently recording');
            return null;
        }

        this.isRecording = false;
        this.currentMacro.actions = this.recordedActions;
        this.currentMacro.duration = Date.now() - this.startTime;

        const completedMacro = { ...this.currentMacro };
        this.currentMacro = null;
        this.recordedActions = [];

        console.log(`Stopped recording macro: ${completedMacro.name}`);
        console.log(`Recorded ${completedMacro.actions.length} actions`);
        
        this.notifyRecordingState(false);
        this.saveMacro(completedMacro);
        
        return completedMacro;
    }

    // Record an action
    recordAction(actionData) {
        if (!this.isRecording) return;

        const action = {
            ...actionData,
            timestamp: Date.now(),
            relativeTime: Date.now() - this.startTime
        };

        this.recordedActions.push(action);
        console.log('Recorded action:', action);
    }

    // Setup event listeners for recording
    setupEventListeners() {
        // Override the existing click handler to also record actions
        const originalHandleClick = window.handleClick;
        
        window.addEventListener('click', (event) => {
            if (this.isRecording) {
                const target = event.target;
                this.recordAction({
                    type: 'click',
                    tagName: target.tagName.toLowerCase(),
                    id: target.id || null,
                    className: target.className || null,
                    text: target.textContent ? target.textContent.trim().substring(0, 100) : null,
                    selector: this.generateSelector(target),
                    coordinates: {
                        x: event.clientX,
                        y: event.clientY,
                        pageX: event.pageX,
                        pageY: event.pageY
                    },
                    url: window.location.href
                });
            }
        }, true);

        // Record input events
        window.addEventListener('input', (event) => {
            if (!this.isRecording) return;
            
            const target = event.target;
            if (target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea') {
                this.recordAction({
                    type: 'input',
                    tagName: target.tagName.toLowerCase(),
                    inputType: target.type || 'text',
                    id: target.id || null,
                    name: target.name || null,
                    selector: this.generateSelector(target),
                    value: target.type === 'password' ? '[PASSWORD]' : target.value,
                    url: window.location.href
                });
            }
        }, true);

        // Record form submissions
        window.addEventListener('submit', (event) => {
            if (!this.isRecording) return;
            
            const form = event.target;
            this.recordAction({
                type: 'submit',
                tagName: 'form',
                id: form.id || null,
                className: form.className || null,
                selector: this.generateSelector(form),
                action: form.action || null,
                method: form.method || 'get',
                url: window.location.href
            });
        }, true);

        // Record navigation
        let lastUrl = window.location.href;
        setInterval(() => {
            if (this.isRecording && window.location.href !== lastUrl) {
                this.recordAction({
                    type: 'navigate',
                    fromUrl: lastUrl,
                    toUrl: window.location.href,
                    title: document.title
                });
                lastUrl = window.location.href;
            }
        }, 1000);

        // Record scroll events (throttled)
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (!this.isRecording) return;
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.recordAction({
                    type: 'scroll',
                    scrollX: window.scrollX,
                    scrollY: window.scrollY,
                    url: window.location.href
                });
            }, 500);
        });
    }

    // Generate CSS selector
    generateSelector(element) {
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

    // Save macro to storage
    async saveMacro(macro) {
        try {
            // Get existing macros
            const result = await chrome.storage.local.get(['macros']);
            const macros = result.macros || [];
            
            // Add new macro
            macros.push(macro);
            
            // Save back to storage
            await chrome.storage.local.set({ macros: macros });
            
            console.log(`Macro saved: ${macro.name}`);
            
            // Also send to server for persistence
            this.sendMacroToServer(macro);
        } catch (error) {
            console.error('Error saving macro:', error);
        }
    }

    // Send macro to server
    async sendMacroToServer(macro) {
        try {
            const response = await fetch('http://localhost:3101/macros', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(macro)
            });
            
            if (response.ok) {
                console.log('Macro sent to server successfully');
            }
        } catch (error) {
            console.error('Error sending macro to server:', error);
        }
    }

    // Get saved macros
    async getSavedMacros() {
        try {
            const result = await chrome.storage.local.get(['macros']);
            return result.macros || [];
        } catch (error) {
            console.error('Error getting saved macros:', error);
            return [];
        }
    }

    // Play back a macro
    async playMacro(macro, options = {}) {
        if (this.isRecording) {
            console.error('Cannot play macro while recording');
            return false;
        }

        const { speed = 1, skipWait = false } = options;
        
        console.log(`Playing macro: ${macro.name} (${macro.actions.length} actions)`);
        
        for (let i = 0; i < macro.actions.length; i++) {
            const action = macro.actions[i];
            const nextAction = macro.actions[i + 1];
            
            // Execute action
            await this.executeAction(action);
            
            // Wait before next action (unless it's the last action)
            if (!skipWait && nextAction) {
                const waitTime = (nextAction.relativeTime - action.relativeTime) / speed;
                if (waitTime > 0) {
                    await this.sleep(waitTime);
                }
            }
        }
        
        console.log(`Finished playing macro: ${macro.name}`);
        return true;
    }

    // Execute a recorded action
    async executeAction(action) {
        switch (action.type) {
            case 'click':
                await this.executeClick(action);
                break;
            case 'input':
                await this.executeInput(action);
                break;
            case 'submit':
                await this.executeSubmit(action);
                break;
            case 'navigate':
                await this.executeNavigate(action);
                break;
            case 'scroll':
                await this.executeScroll(action);
                break;
            default:
                console.warn('Unknown action type:', action.type);
        }
    }

    // Execute click action
    async executeClick(action) {
        const element = document.querySelector(action.selector);
        if (element) {
            element.click();
            console.log(`Clicked: ${action.selector}`);
        } else {
            console.error(`Element not found: ${action.selector}`);
        }
    }

    // Execute input action
    async executeInput(action) {
        const element = document.querySelector(action.selector);
        if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
            if (action.value !== '[PASSWORD]') {
                element.value = action.value;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`Input set: ${action.selector}`);
            } else {
                console.log(`Skipped password input: ${action.selector}`);
            }
        } else {
            console.error(`Input element not found: ${action.selector}`);
        }
    }

    // Execute submit action
    async executeSubmit(action) {
        const element = document.querySelector(action.selector);
        if (element && element.tagName === 'FORM') {
            element.submit();
            console.log(`Form submitted: ${action.selector}`);
        } else {
            console.error(`Form not found: ${action.selector}`);
        }
    }

    // Execute navigate action
    async executeNavigate(action) {
        if (action.toUrl !== window.location.href) {
            window.location.href = action.toUrl;
            console.log(`Navigated to: ${action.toUrl}`);
        }
    }

    // Execute scroll action
    async executeScroll(action) {
        window.scrollTo(action.scrollX, action.scrollY);
        console.log(`Scrolled to: ${action.scrollX}, ${action.scrollY}`);
    }

    // Utility function for delays
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Notify about recording state
    notifyRecordingState(isRecording) {
        // Send message to popup/background
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({
                type: 'RECORDING_STATE_CHANGED',
                isRecording: isRecording
            });
        }
        
        // Visual indicator on page
        this.showRecordingIndicator(isRecording);
    }

    // Show visual recording indicator
    showRecordingIndicator(show) {
        let indicator = document.getElementById('mcp-recording-indicator');
        
        if (show) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'mcp-recording-indicator';
                indicator.style.cssText = `
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    background: #ef4444;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    font-weight: bold;
                    z-index: 10000;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    animation: pulse 1.5s infinite;
                `;
                indicator.innerHTML = '🔴 RECORDING';
                document.body.appendChild(indicator);
                
                // Add pulse animation
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.7; }
                    }
                `;
                document.head.appendChild(style);
            }
        } else {
            if (indicator) {
                indicator.remove();
            }
        }
    }
}

// Initialize macro recorder
const macroRecorder = new MacroRecorder();

// Export for use by other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MacroRecorder;
}