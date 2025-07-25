# 🧠 MCP Chrome Agent

A comprehensive Model Control Protocol (MCP) implementation for browser automation, monitoring, and macro recording using a Chrome extension and Node.js server with real-time dashboard.

## 🚀 Features

### Core Functionality
- **Real-time Click Tracking**: Captures all user interactions (clicks, inputs, form changes)
- **DOM Monitoring**: Full page snapshots and element tracking
- **Command Execution**: Remote control of browser elements (click, highlight, scroll, input)
- **Session Management**: Track multiple browser tabs independently

### Advanced Features
- **📊 Real-time Dashboard**: Modern web interface with live updates via WebSocket
- **🎬 Macro Recording**: Record and playback user interactions
- **📸 Screenshot Capture**: Automatic screenshot taking with server storage
- **🔐 Authentication System**: JWT-based user authentication with role management
- **💾 Data Persistence**: SQLite database for storing all data
- **⚡ Real-time Communication**: WebSocket support for instant updates

### Security & Performance
- **Security Validation**: Input sanitization and command validation
- **Rate Limiting**: Protection against excessive requests
- **CORS Protection**: Secure cross-origin resource sharing
- **API Key Support**: Long-term authentication for extensions

## Architecture

### Components

1. **🖥️ MCP Server** (`server.js`) - Express.js HTTP/WebSocket server that handles:
   - Click event collection and storage
   - Real-time command distribution via WebSocket
   - Session management with database persistence
   - DOM snapshot and screenshot storage
   - User authentication and authorization
   - Macro management and execution

2. **🌐 Chrome Extension** (`extension/`) - Browser extension with:
   - Content script for page interaction and macro recording
   - Background service worker for communication
   - Popup interface for manual control and macro management
   - Real-time WebSocket communication

3. **📊 Real-time Dashboard** (`dashboard/`) - Modern web interface with:
   - Live session monitoring
   - Real-time event streaming
   - Command center for remote control
   - Macro management interface
   - User authentication portal

4. **🗄️ Database Layer** (`database.js`) - SQLite persistence with:
   - User management and authentication
   - Session tracking and analytics
   - Event logging and history
   - Macro storage and versioning
   - Screenshot metadata storage

5. **📋 API Schemas** (`schemas.json`) - Contract definitions
6. **🔐 Authentication** (`auth.js`) - JWT-based security system

## Quick Start

### 1. Start the MCP Server

```bash
npm install
node server.js
```

Server will run on `http://localhost:3000` with:
- **Dashboard**: `http://localhost:3000/dashboard`
- **Authentication**: `http://localhost:3000/dashboard/login.html`
- **API Health**: `http://localhost:3000/health`

### 2. Load Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` directory

### 3. Access the Dashboard

1. Visit `http://localhost:3000/dashboard`
2. Login with default credentials:
   - **Username**: `admin`
   - **Password**: `admin123`
3. Start monitoring browser activity in real-time!

### 4. Test the System

```bash
node test-server.js
```

## 🎮 Usage Guide

### Recording Macros
1. Click the extension icon in Chrome
2. Enter a macro name
3. Click "Start Recording"
4. Perform actions on the webpage
5. Click "Stop Recording"
6. Play back recorded macros anytime!

### Real-time Monitoring
1. Open the dashboard
2. Navigate to any website in Chrome
3. Watch live events appear in real-time
4. Monitor active sessions and statistics

### Remote Control
1. Use the Command Center in the dashboard
2. Send commands to any active browser session:
   - **Click**: Click on elements
   - **Highlight**: Highlight elements
   - **Input**: Enter text into forms
   - **Scroll**: Scroll to positions
   - **Capture DOM**: Take page snapshots

### Screenshots
1. Click the extension popup
2. Click "Take Screenshot"
3. View preview window
4. Screenshots are stored on the server

## API Endpoints

### Core API Endpoints

**Session Management**
- `GET /health` - Server status and metrics
- `POST /session` - Create new browser session
- `GET /sessions` - List all active sessions

**Event & Command System**
- `POST /click-event` - Receive click events from extension
- `GET /commands` - Fetch commands for execution (polling)
- `POST /commands` - Add new commands for session (requires auth)
- `POST /full-dom` - Receive DOM snapshots
- `GET /log` - Retrieve event logs

**Authentication Endpoints**
- `POST /auth/login` - User login (returns JWT token)
- `POST /auth/register` - User registration
- `GET /auth/verify` - Verify JWT token
- `POST /auth/api-key` - Generate API key for extensions
- `GET /auth/users` - List users (admin only)

**Macro Management**
- `GET /macros` - List all saved macros
- `POST /macros` - Save new macro
- `GET /macros/:id` - Get specific macro
- `DELETE /macros/:id` - Delete macro

**Media Endpoints**
- `POST /screenshot` - Receive screenshots from extension
- `GET /screenshots` - List screenshot metadata
- `GET /screenshots/:id` - Get specific screenshot data

### Example Usage

#### Send a Command

```javascript
fetch('http://localhost:3000/commands', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'session_123_1234567890',
    command: {
      type: 'highlight',
      selector: '#my-button'
    }
  })
});
```

#### Get Click Events

```javascript
fetch('http://localhost:3000/log?sessionId=session_123_1234567890&limit=10')
  .then(response => response.json())
  .then(data => console.log(data.logs));
```

## Command Types

### Click Command
```json
{
  "type": "click",
  "selector": "#submit-button"
}
```

### Highlight Command
```json
{
  "type": "highlight",
  "selector": ".important-element"
}
```

### Input Command
```json
{
  "type": "input",
  "selector": "input[name='username']",
  "value": "testuser"
}
```

### Scroll Command
```json
{
  "type": "scroll",
  "coordinates": { "x": 0, "y": 500 }
}
```

### Capture DOM Command
```json
{
  "type": "capture_dom",
  "selector": "body"
}
```

## Security Features

- **Input Validation**: All requests validated against JSON schemas
- **Selector Sanitization**: Dangerous selectors blocked (script, eval, etc.)
- **Rate Limiting**: 100 requests per minute per IP
- **CORS Protection**: Only allows chrome-extension and localhost origins
- **Command Validation**: Server and client-side command safety checks

## Event Data Structure

### Click Events
```json
{
  "sessionId": "session_123_1234567890",
  "event": {
    "type": "click",
    "tagName": "button",
    "id": "submit-btn",
    "className": "btn btn-primary",
    "text": "Submit Form",
    "selector": "#submit-btn",
    "coordinates": { "x": 150, "y": 300, "pageX": 150, "pageY": 300 },
    "timestamp": 1638360000000,
    "url": "https://example.com/form"
  },
  "url": "https://example.com/form",
  "timestamp": 1638360000000
}
```

## Development

### File Structure
```
chromeext/
├── server.js              # MCP HTTP server
├── test-server.js          # Test script
├── schemas.json            # JSON API schemas
├── package.json            # Node.js dependencies
└── extension/              # Chrome extension
    ├── manifest.json       # Extension manifest
    ├── background.js       # Service worker
    ├── content.js          # Page interaction script
    ├── popup.html          # Extension popup UI
    └── popup.js            # Popup functionality
```

### Testing

1. **Server Tests**: `node test-server.js`
2. **Manual Testing**: Use the extension popup to capture DOM and toggle tracking
3. **Browser Testing**: Open any webpage and check console logs for click tracking

### Debugging

- **Server Logs**: Check terminal where `node server.js` is running
- **Extension Logs**: Open Chrome DevTools → Extensions → MCP Chrome Agent → inspect views
- **Content Script Logs**: Open Chrome DevTools on any page → Console

## 🛡️ Security Features

- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: All inputs validated and sanitized
- **Rate Limiting**: 100 requests per minute per IP
- **CORS Protection**: Restricted to chrome-extension and localhost origins
- **Command Validation**: Dangerous selectors and commands blocked
- **SQL Injection Protection**: Parameterized database queries

## 📁 Project Structure

```
chromeext/
├── server.js              # Main HTTP/WebSocket server
├── auth.js                 # JWT authentication system
├── database.js             # SQLite database layer
├── test-server.js          # Automated test suite
├── schemas.json            # JSON API schemas
├── mcp_data.db            # SQLite database (auto-generated)
├── package.json            # Node.js dependencies
├── extension/              # Chrome extension
│   ├── manifest.json       # Extension manifest
│   ├── background.js       # Service worker
│   ├── content.js          # Page interaction script
│   ├── recorder.js         # Macro recording module
│   ├── popup.html          # Extension popup UI
│   └── popup.js            # Popup functionality
└── dashboard/              # Web dashboard
    ├── index.html          # Main dashboard
    ├── login.html          # Authentication page
    ├── style.css           # Dashboard styles
    └── dashboard.js        # Dashboard functionality
```

## 🎯 Use Cases

1. **🤖 Web Automation**: Programmatically control web pages and workflows
2. **📊 User Behavior Analysis**: Track and analyze interaction patterns
3. **🧪 Automated Testing**: Record and replay UI test scenarios
4. **📈 Real-time Monitoring**: Monitor webpage activity and performance
5. **♿ Accessibility**: Assistive technology and accessibility testing
6. **🎓 Training & Documentation**: Record workflows for training purposes
7. **🔍 QA & Debugging**: Debug user interaction issues
8. **📱 Cross-browser Testing**: Test functionality across different scenarios

## 🚀 Advanced Configuration

### Environment Variables
```bash
PORT=3000                    # Server port
JWT_SECRET=your-secret-key   # JWT signing secret
NODE_ENV=production          # Environment mode
```

### Database Configuration
The system uses SQLite by default. The database is automatically created at `mcp_data.db` with proper indexes and relationships.

### WebSocket Events
- `event_update` - Real-time event broadcasting
- `sessions_update` - Active sessions updates
- `stats_update` - Server statistics updates
- `command` - Command execution requests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**🧠 MCP Chrome Agent** - Revolutionizing browser automation and monitoring with real-time capabilities, comprehensive macro recording, and enterprise-grade security.