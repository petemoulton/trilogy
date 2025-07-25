# Trilogy AI Agent System — Product Requirements Document (PRD)

**Title:** Trilogy AI Agent System  
**Version:** 1.0  
**Date:** 2025-07-25  
**Owner:** Peter Moulton  
**Status:** Draft  

---

## 🧭 Overview

Trilogy is a cooperative AI agent orchestration system designed for automated product analysis, task breakdown, decision-making, audit trails, and browser automation. The system operates through multi-agent Claude models (Sonnet & Opus), shared memory, version-controlled outputs, a VS Code interface for editing and monitoring, and an integrated Chrome extension (MCP) for real-time user interaction tracking and automation.

---

## 🎯 Objectives

- Enable Claude-based agents to analyze PRDs and break down actionable tasks
- Ensure traceable, auditable workflows through Git-logged steps
- Provide a live-editable interface via VS Code for human-agent collaboration
- Automate browser workflows and macro recording via the MCP Chrome Agent
- Enable visual and reactive control over the agent system

---

## 🔧 Core Features

### F1. Shared Memory System
- **Tech:** Redis (default), with option for PostgreSQL or etcd
- **Purpose:** Structured read/write memory for all agents
- **Notes:** Use namespaces and locking to avoid race conditions

### F2. Task Breakdown Engine
- **Agent:** Claude Sonnet
- **Output:** Structured list of tasks with feasibility, dependencies, and blockers
- **Storage:** `/memory/tasks/generated/`

### F3. Decision-Making Core
- **Agent:** Claude Opus
- **Role:** Consolidate proposed tasks, filter by feasibility, generate final roadmap
- **Output Location:** `/memory/tasks/final/`

### F4. Versioned Output Logging
- **System:** Git-based version control
- **Artifacts:** JSON task state + Markdown log
- **Commit Format:** `feat(agent): action on task-X`

### F5. Natural Language Audit Trail
- **Format:** Markdown logs with:
  - Agent name
  - Input summary
  - Decision rationale
  - Diff log or memory update

### F6. Visual PRD Editor (VS Code Extension)
- **UI:** Sidebar and panel interface
- **Modes:**
  - Form-driven editing
  - Raw Markdown/JSON
  - Agent trigger buttons
  - Log viewer

---

## 🌐 MCP Chrome Agent

### Description:
Browser-based companion extension for real-time interaction tracking, macro recording, and automation control.

### Key Components:

#### C1. Chrome Extension
- **Scripts:** `content.js`, `popup.js`, `background.js`
- **Features:**
  - DOM change monitoring
  - Macro record/playback
  - Screenshot capture
  - JWT-authenticated WebSocket channel

#### C2. MCP Server
- **Stack:** Node.js + Express + WebSocket + SQLite
- **Functions:**
  - Store click/interaction logs
  - Serve macro commands to extension
  - Authenticate users
  - Dashboard UI for manual inspection

#### C3. Real-Time Dashboard
- Live session overview
- Macro management
- Command control center

---

## 🔁 Data & API Flow

| Source | Action | Destination |
|--------|--------|-------------|
| VS Code | PRD edits | `/memory/prd/active.md` |
| Sonnet Agent | Task breakdown | `/memory/tasks/generated/` |
| Opus Agent | Final decision | `/memory/tasks/final/` |
| Logging Service | Log + commit | `/logs/` + Git |
| Chrome Extension | DOM/clicks/macros | `/memory/observations/` |
| Dashboard | Control commands | `/commands/` via WebSocket |

---

## ⚙️ Architecture Components

- **Agents:** Claude Sonnet (analysis) + Opus (decision-making)
- **Memory:** Redis or PostgreSQL, namespace-locked
- **Logs:** Git-based version control + Markdown trails
- **Editor:** VS Code extension (editable PRD, logs, tasks)
- **Browser:** Chrome extension + Node backend + dashboard
- **Security:** JWT, rate limiting, API key support
- **Persistence:** SQLite for MCP; Git and memory persistence for agent state

---

## 🧪 MVP Plan

- Single PRD editor (VS Code)
- One Sonnet agent
- One Opus agent
- Flat file-based memory with Git versioning
- Working MCP Chrome extension with DOM tracking + macro playback

---

## 🚧 Risks & Mitigations

| Risk | Solution |
|------|----------|
| Race conditions in memory | Use Redis locking (SETNX + TTL) or RDBMS transactions |
| Complexity creep | Feature-flag modular agents, MVP first |
| Data security | JWT auth, scoped write access, CORS validation |
| Memory bloat | TTLs, memory namespaces, Git GC |

---

## 📁 Directory Structure

```
trilogy-system/
├── extension/              # MCP Chrome extension
├── server/                 # MCP backend server
├── agents/                 # Sonnet + Opus logic
├── logs/                   # Git-tracked audit trail
├── vscode-extension/       # VS Code frontend
├── dashboard/              # Web UI dashboard
├── memory/                 # Current memory state
└── README.md
```

---

## 🗓️ Milestones

1. ✅ Define PRD and memory schema
2. 🔄 Build agent runners and shared memory
3. 🧠 Implement Sonnet → Opus loop
4. 🧪 Integrate Git-based logging
5. 💻 Build VS Code extension
6. 🌐 Connect MCP Chrome agent
7. 📦 Launch MVP

---

## 📌 Glossary

- **Claude Opus/Sonnet:** AI agents for reasoning and task planning
- **PRD:** Product Requirements Document
- **MCP:** Model Control Protocol — browser-side automation layer
- **Memory:** The system's current working state (Redis or file-based)
- **Logs:** Traceable steps in agent decision making
- **Macro:** Sequence of recorded user browser interactions

