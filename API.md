# 📡 Trilogy AI System - API Documentation

This document describes the REST API endpoints for the Trilogy AI System.

## 🔗 Base URL

- **Development**: `http://localhost:8080`
- **Production**: `https://yourdomain.com`

## 📋 Authentication

Most endpoints require authentication via JWT token:

```http
Authorization: Bearer <your-jwt-token>
```

## 🏥 Health & Status

### GET /health

Returns system health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "memoryBackend": "postgresql",
  "postgresql": true,
  "memory": "active",
  "stats": {
    "totalKeys": 42,
    "keysByNamespace": [
      {"namespace": "tasks", "count": 15},
      {"namespace": "agents", "count": 2}
    ],
    "activeLocks": 3,
    "totalTasks": 15,
    "tasksByStatus": [
      {"status": "PENDING", "count": 8},
      {"status": "COMPLETED", "count": 7}
    ]
  }
}
```

## 💾 Memory Management

### GET /memory/:namespace/:key

Retrieve data from memory.

**Parameters:**
- `namespace` (string): Memory namespace
- `key` (string): Memory key

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Hello World",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /memory/:namespace/:key

Store data in memory.

**Parameters:**
- `namespace` (string): Memory namespace
- `key` (string): Memory key

**Request Body:**
```json
{
  "data": {
    "message": "Hello World",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response:**
```json
{
  "success": true
}
```

### DELETE /memory/:namespace/:key

Delete data from memory.

**Parameters:**
- `namespace` (string): Memory namespace
- `key` (string): Memory key

**Response:**
```json
{
  "success": true,
  "deleted": true
}
```

## 🤖 Agent Management

### POST /agents/trigger/:agent

Trigger agent processing.

**Parameters:**
- `agent` (string): Agent name (`sonnet` or `opus`)

**Request Body:**
```json
{
  "input": {
    "type": "analyze_prd",
    "prd": "# Product Requirements Document\n..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### GET /agents/sessions

List active agent sessions.

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "agent": "sonnet",
      "status": "processing",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /agents/sessions/:sessionId

Get session details.

**Parameters:**
- `sessionId` (string): Session UUID

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "agent": "sonnet",
    "status": "completed",
    "input": {
      "type": "analyze_prd",
      "prd": "..."
    },
    "output": {
      "success": true,
      "analysis": {
        "overview": "AI agent orchestration system",
        "objectives": ["Enable Claude-based agents", "..."],
        "features": ["Shared Memory System", "..."]
      }
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "completedAt": "2024-01-01T00:01:30.000Z"
  }
}
```

## 📋 Task Management

### GET /tasks

List all tasks.

**Query Parameters:**
- `status` (string): Filter by status (`PENDING`, `IN_PROGRESS`, `COMPLETED`)
- `priority` (string): Filter by priority (`HIGH`, `MEDIUM`, `LOW`)
- `category` (string): Filter by category
- `limit` (integer): Limit results (default: 50)
- `offset` (integer): Offset results (default: 0)

**Response:**
```json
{
  "success": true,
  "tasks": [
    {
      "id": "TASK-001",
      "title": "Implement Shared Memory System",
      "description": "Set up PostgreSQL-based shared memory with locking",
      "priority": "HIGH",
      "complexity": "MEDIUM",
      "status": "COMPLETED",
      "category": "Infrastructure",
      "estimatedHours": 8,
      "dependencies": [],
      "blockers": [],
      "createdBy": "sonnet",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T08:00:00.000Z"
    }
  ],
  "total": 15,
  "limit": 50,
  "offset": 0
}
```

### POST /tasks

Create a new task.

**Request Body:**
```json
{
  "title": "New Task",
  "description": "Task description",
  "priority": "HIGH",
  "complexity": "MEDIUM",
  "category": "Feature",
  "estimatedHours": 4,
  "dependencies": ["TASK-001"],
  "blockers": []
}
```

**Response:**
```json
{
  "success": true,
  "task": {
    "id": "TASK-016",
    "title": "New Task",
    "status": "PENDING",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /tasks/:taskId

Get task details.

**Parameters:**
- `taskId` (string): Task ID

**Response:**
```json
{
  "success": true,
  "task": {
    "id": "TASK-001",
    "title": "Implement Shared Memory System",
    "description": "Set up PostgreSQL-based shared memory with locking",
    "priority": "HIGH",
    "complexity": "MEDIUM",
    "status": "COMPLETED",
    "category": "Infrastructure",
    "estimatedHours": 8,
    "dependencies": [],
    "blockers": [],
    "metadata": {
      "completedHours": 6,
      "completionNotes": "Completed ahead of schedule"
    },
    "createdBy": "sonnet",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T08:00:00.000Z"
  }
}
```

### PUT /tasks/:taskId

Update task.

**Parameters:**
- `taskId` (string): Task ID

**Request Body:**
```json
{
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "metadata": {
    "startedAt": "2024-01-01T09:00:00.000Z",
    "assignedTo": "developer1"
  }
}
```

**Response:**
```json
{
  "success": true,
  "task": {
    "id": "TASK-001",
    "status": "IN_PROGRESS",
    "updatedAt": "2024-01-01T09:00:00.000Z"
  }
}
```

### DELETE /tasks/:taskId

Delete task.

**Parameters:**
- `taskId` (string): Task ID

**Response:**
```json
{
  "success": true,
  "deleted": true
}
```

## 📊 Analytics & Statistics

### GET /analytics/tasks

Get task analytics.

**Response:**
```json
{
  "success": true,
  "analytics": {
    "totalTasks": 15,
    "byStatus": {
      "PENDING": 5,
      "IN_PROGRESS": 3,
      "COMPLETED": 7
    },
    "byPriority": {
      "HIGH": 6,
      "MEDIUM": 7,
      "LOW": 2
    },
    "byCategory": {
      "Infrastructure": 4,
      "Feature": 8,
      "Testing": 3
    },
    "completionRate": 46.7,
    "averageCompletionTime": "2.5 days",
    "totalEstimatedHours": 120,
    "totalCompletedHours": 56
  }
}
```

### GET /analytics/agents

Get agent analytics.

**Response:**
```json
{
  "success": true,
  "analytics": {
    "totalSessions": 42,
    "byAgent": {
      "sonnet": 28,
      "opus": 14
    },
    "byStatus": {
      "completed": 38,
      "failed": 2,
      "in_progress": 2
    },
    "averageProcessingTime": "45 seconds",
    "successRate": 95.2,
    "tasksGenerated": 156,
    "tasksApproved": 89
  }
}
```

## 🔍 Search & Query

### GET /search

Search across tasks, memory, and logs.

**Query Parameters:**
- `q` (string): Search query
- `type` (string): Search type (`tasks`, `memory`, `logs`, `all`)
- `limit` (integer): Limit results (default: 20)

**Response:**
```json
{
  "success": true,
  "results": {
    "tasks": [
      {
        "id": "TASK-001",
        "title": "Implement Shared Memory System",
        "relevance": 0.95
      }
    ],
    "memory": [
      {
        "namespace": "agents",
        "key": "sonnet_state.json",
        "relevance": 0.87
      }
    ],
    "logs": [
      {
        "timestamp": "2024-01-01T00:00:00.000Z",
        "message": "Memory system initialized",
        "relevance": 0.76
      }
    ]
  },
  "total": 3
}
```

## 🔌 WebSocket API

Connect to WebSocket for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

### WebSocket Message Types

**Agent Trigger:**
```json
{
  "type": "agent_trigger",
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "agent": "sonnet",
    "status": "started"
  }
}
```

**Agent Response:**
```json
{
  "type": "agent_response",
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "agent": "sonnet",
    "status": "completed",
    "result": {
      "success": true,
      "analysis": {...}
    }
  }
}
```

**Memory Update:**
```json
{
  "type": "memory_update",
  "data": {
    "namespace": "tasks",
    "key": "task_001.json",
    "action": "write"
  }
}
```

## ❌ Error Responses

All API endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes

- `INVALID_INPUT` - Invalid request parameters
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `RATE_LIMITED` - Too many requests
- `SERVER_ERROR` - Internal server error
- `AGENT_ERROR` - Agent processing error
- `MEMORY_ERROR` - Memory operation error

## 🔒 Rate Limits

- **API Endpoints**: 100 requests per 15 minutes
- **Authentication**: 5 attempts per 15 minutes
- **Agent Triggers**: 10 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

## 📝 Example Usage

### JavaScript/Node.js

```javascript
const axios = require('axios');

// Configure base URL and auth
const api = axios.create({
  baseURL: 'http://localhost:8080',
  headers: {
    'Authorization': 'Bearer your-jwt-token',
    'Content-Type': 'application/json'
  }
});

// Trigger agent processing
async function analyzeProject() {
  try {
    const response = await api.post('/agents/trigger/sonnet', {
      input: {
        type: 'analyze_prd',
        prd: '# My Project Requirements...'
      }
    });
    
    console.log('Session ID:', response.data.sessionId);
    return response.data.sessionId;
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}
```

### Python

```python
import requests
import json

# Configure session
session = requests.Session()
session.headers.update({
    'Authorization': 'Bearer your-jwt-token',
    'Content-Type': 'application/json'
})

# Get system health
def get_health():
    response = session.get('http://localhost:8080/health')
    return response.json()

# Store data in memory
def store_data(namespace, key, data):
    response = session.post(
        f'http://localhost:8080/memory/{namespace}/{key}',
        json={'data': data}
    )
    return response.json()
```

### cURL

```bash
# Get health status
curl -X GET http://localhost:8080/health

# Trigger agent with authentication
curl -X POST http://localhost:8080/agents/trigger/sonnet \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "type": "analyze_prd",
      "prd": "# Project Requirements..."
    }
  }'

# Store memory data
curl -X POST http://localhost:8080/memory/test/example \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "message": "Hello World",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  }'
```