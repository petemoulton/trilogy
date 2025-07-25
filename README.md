# 🤖 Trilogy AI System

Cooperative AI agent orchestration system designed for automated product analysis, task breakdown, decision-making, audit trails, and browser automation.

## 🏗️ Architecture

- **Agents**: Claude Sonnet (analysis) + Opus (decision-making)
- **Memory**: Redis or file-based shared memory with locking
- **Logs**: Git-based version control + audit trails
- **Dashboard**: Real-time web interface
- **Browser**: Chrome extension (MCP) integration

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Main Server
```bash
npm start
# Server runs on http://localhost:8080
```

### 3. Start Chrome Extension (Optional)
```bash
cd materials/chromeext
npm start
# MCP server runs on http://localhost:3000
```

### 4. Start AI Agents
```bash
# In a new terminal
cd agents
node runner.js

# Or run full workflow
node runner.js --workflow
```

## 📊 Dashboard Access

- **Main Dashboard**: http://localhost:8080
- **Chrome MCP Dashboard**: http://localhost:3000/dashboard

## 🧠 Memory System

The system uses a structured memory namespace:

```
memory/
├── prd/active.md              # Current PRD
├── tasks/
│   ├── generated/             # Sonnet-generated tasks
│   └── final/                 # Opus-approved tasks
├── observations/              # Browser data
└── agents/                    # Agent state
```

## 🔄 Agent Workflow

1. **Sonnet Agent** analyzes PRD and generates tasks
2. **Opus Agent** reviews, filters, and finalizes roadmap
3. **Git Logging** tracks all decisions and changes
4. **Dashboard** provides real-time monitoring

## 📡 API Endpoints

- `GET /health` - System health check
- `GET /memory/:namespace/:key` - Read memory
- `POST /memory/:namespace/:key` - Write memory
- `POST /agents/trigger/:agent` - Trigger agent processing

## 🛠️ Development

### Start in Development Mode
```bash
npm run dev
# Starts both main server and Chrome extension
```

### Available Scripts
- `npm start` - Start main server
- `npm run dev` - Development mode (all services)
- `npm run server` - Server only
- `npm run chrome` - Chrome extension only
- `npm test` - Run tests

## 🔧 Configuration

### Environment Variables
- `PORT` - Main server port (default: 8080)
- `REDIS_URL` - Redis connection string (optional)

### Memory Backend
- **Redis**: Set `REDIS_URL` for distributed memory
- **File-based**: Default fallback, stores in `/memory` directory

## 📝 Logs

All agent decisions and memory changes are logged to:
- **File logs**: `/logs/*.log`
- **Git commits**: Automated version control
- **Dashboard**: Real-time log stream

## 🌐 Chrome Extension (MCP)

The included Chrome extension provides:
- DOM interaction tracking
- Macro recording/playback
- Real-time automation
- WebSocket communication

Load extension from `materials/chromeext/extension/` in Chrome Developer Mode.

## 🏃‍♂️ Full System Test

Run complete workflow test:
```bash
# 1. Start main server
npm start

# 2. In new terminal: Start agents with workflow
cd agents && node runner.js --workflow

# 3. Visit dashboard
open http://localhost:8080
```

## 🎯 Features

- ✅ Shared memory system with Redis/file backend
- ✅ AI agent communication framework
- ✅ Git-based audit logging
- ✅ Real-time web dashboard
- ✅ Chrome extension integration
- ✅ Task breakdown and prioritization
- ✅ WebSocket real-time updates

## 📚 Project Structure

```
trilogy-system/
├── agents/                 # AI agent implementations
│   ├── base-agent.js      # Base agent class
│   ├── sonnet-agent.js    # Task breakdown agent
│   ├── opus-agent.js      # Decision-making agent
│   └── runner.js          # Agent orchestration
├── server/                # Main system server
│   └── index.js          # Express + WebSocket server
├── dashboard/             # Web dashboard UI
│   └── index.html        # Dashboard interface
├── memory/                # Shared memory storage
├── logs/                  # Git-tracked audit logs
├── materials/chromeext/   # Chrome extension (MCP)
└── package.json          # Project configuration
```

## 👥 Authors

- **Akhil Sabu Varughese** - *Lead Developer* - [akhilsabuv](https://github.com/akhilsabuv)
- **Peter Moulton** - *Product Owner & Architecture*

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

Copyright (c) 2024 Akhil Sabu Varughese & Peter Moulton