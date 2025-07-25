# ✅ Trilogy System — TODO List

This checklist tracks all implementation tasks across the Trilogy AI Agent System, including agent orchestration, shared memory, versioning, VS Code extension, and MCP Chrome Agent integration.

---

## 📌 Core System Tasks

### 🔁 Shared Memory System
- [ ] Decide on memory backend (Redis, PostgreSQL, etcd)
- [ ] Define memory key namespace schema
- [ ] Implement memory locking mechanism
- [ ] Create memory read/write helper utilities

### 🧠 Claude Agents
- [ ] Setup Sonnet agent API interface
- [ ] Setup Opus agent API interface
- [ ] Define task format schema
- [ ] Implement task breakdown pipeline (Sonnet)
- [ ] Implement decision logic (Opus)
- [ ] Add feature flags for modular agent expansion

### 🧾 Logging & Versioning
- [ ] Setup Git versioning layer for `/memory/`
- [ ] Generate structured commit messages
- [ ] Log all agent actions as Markdown
- [ ] Build diff generator for memory state changes

---

## 💻 VS Code Extension

### PRD + Task Editor
- [ ] Create sidebar + panel layout
- [ ] Build PRD markdown/JSON editor
- [ ] Build task viewer + updater
- [ ] Integrate "Run Sonnet/Opus" buttons
- [ ] Add Git log viewer panel

### Backend Integration
- [ ] Local server to handle agent/memory APIs
- [ ] WebSocket support for real-time agent updates
- [ ] Environment config for memory + auth

---

## 🌐 MCP Chrome Agent

### Extension
- [ ] Content script for event tracking
- [ ] Popup UI for macro recording
- [ ] Screenshot + DOM capture utilities
- [ ] Background service worker integration

### MCP Server
- [ ] Build Express/WebSocket backend
- [ ] Implement session + command tracking
- [ ] Add macro save/play APIs
- [ ] Connect to SQLite for persistence

### Dashboard
- [ ] Build real-time session dashboard
- [ ] Macro manager interface
- [ ] Live command execution panel
- [ ] Login + role-based access UI

---

## 🔐 Security & Persistence
- [ ] Implement JWT-based authentication
- [ ] Add API key generator for agents/extensions
- [ ] Configure CORS + rate limits
- [ ] Setup SQLite for MCP data
- [ ] Add logging and telemetry hooks

---

## 🚀 MVP Milestone Tasks
- [ ] One Sonnet + one Opus agent loop working
- [ ] Single PRD file + task log
- [ ] Git commit after each agent step
- [ ] Chrome extension captures click events
- [ ] Dashboard displays active session
- [ ] VS Code extension edits PRD and runs agents

---

## 📦 Post-MVP (v2+)
- [ ] Agent-to-agent collaboration scoring
- [ ] Agent response validation engine
- [ ] Claude prompt chaining and memory indexing
- [ ] Integration with cloud storage (S3 or GCS)
- [ ] Multi-user dashboard with PRD history
