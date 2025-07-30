# 🚀 Trilogy AI System - Quick Deployment

Deploy the entire Trilogy AI System with a single command!

## ⚡ One-Command Deployment

```bash
./deploy.sh
```

That's it! The script will:
- ✅ Check all prerequisites (Node.js 18+, Docker, npm)
- ✅ Install all dependencies
- ✅ Start PostgreSQL database in Docker
- ✅ Launch the complete Trilogy AI System
- ✅ Verify all services are healthy
- ✅ Automatically open dashboards in your browser

## 🌐 What Gets Deployed

After running `./deploy.sh`, you'll have:

### Main Dashboard (http://localhost:3100)
- System Overview & Health Monitoring
- Project Management (auto-detects 13 projects)
- Agent Pool Management with Pool & Deployment views
- Intelligence Analytics Dashboard
- Real-time Logs & System Monitoring
- Configuration Settings

### MCP Dashboard (http://localhost:3101/dashboard)
- Chrome Extension Integration
- WebSocket Communication
- Session Management
- Real-time Event Tracking

### Core Services
- **PostgreSQL Database**: Persistent memory storage
- **Agent Pool**: 2 AI agents (Sonnet & Opus) ready for work
- **Intelligence Engine**: Learning and pattern recognition
- **WebSocket Server**: Real-time communication
- **API Endpoints**: RESTful services for all components

## 🛑 Stopping the System

```bash
./stop.sh
```

Or manually:
```bash
kill $(cat trilogy.pid)
docker stop trilogy-postgres
```

## 📋 System Requirements

- **Node.js**: Version 18 or higher
- **Docker**: Must be running
- **npm**: Latest version
- **Operating System**: macOS, Linux, or Windows

## 🔧 Troubleshooting

### If deployment fails:
1. Ensure Docker is running: `docker info`
2. Check Node.js version: `node --version` (must be 18+)
3. Check logs: `tail -f trilogy-deployment.log`
4. Clean restart: `./stop.sh && ./deploy.sh`

### Common Issues:
- **Port conflicts**: Make sure ports 3100, 3101, 3102, and 5432 are available
- **Docker not running**: Start Docker Desktop/daemon
- **Permission errors**: Ensure deploy.sh is executable: `chmod +x deploy.sh`

## 🎯 Quick Test

After deployment, test the system:

```bash
# Check system health
curl http://localhost:3100/health

# Check agent pool
curl http://localhost:3100/agents/pool/status

# Spawn a test agent
curl -X POST http://localhost:3100/agents/pool/spawn \
  -H "Content-Type: application/json" \
  -d '{"role":"test-specialist","capabilities":["testing"]}'
```

## 📊 Monitoring

- **Main Logs**: `tail -f trilogy-deployment.log`
- **PostgreSQL**: `docker logs trilogy-postgres`
- **Health Check**: Visit http://localhost:3100/health
- **Agent Status**: Visit http://localhost:3100/agents/pool/status

## ✨ Features Available

- **Multi-Agent Coordination**: Sonnet + Opus working together
- **Project Auto-Discovery**: Automatically finds and manages projects
- **Real-time Monitoring**: Live system metrics and agent status
- **Chrome Extension Support**: Browser automation capabilities
- **Persistent Memory**: PostgreSQL-backed intelligent memory system
- **WebSocket Communication**: Real-time updates across all components

---

**🎉 Your Trilogy AI System is now deployed and ready for intelligent task orchestration!**