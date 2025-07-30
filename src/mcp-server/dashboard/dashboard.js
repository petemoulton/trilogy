// MCP Chrome Agent Dashboard JavaScript

class MCPDashboard {
  constructor() {
    this.serverUrl = 'http://localhost:3100';
    this.refreshInterval = 5000; // 5 seconds
    this.startTime = Date.now();
    this.socket = null;
    this.isRealTimeEnabled = false;

    this.initializeEventListeners();
    this.initializeWebSocket();
    this.startDataRefresh();
    this.checkServerConnection();
  }

  // Initialize event listeners
  initializeEventListeners() {
    document.getElementById('event-filter').addEventListener('change', () => {
      this.refreshEvents();
    });

    document.getElementById('command-type').addEventListener('change', (e) => {
      const valueInput = document.getElementById('command-value');
      if (e.target.value === 'input') {
        valueInput.style.display = 'block';
        valueInput.setAttribute('required', true);
      } else {
        valueInput.style.display = 'none';
        valueInput.removeAttribute('required');
      }
    });
  }

  // Check server connection
  async checkServerConnection() {
    const statusEl = document.getElementById('connection-status');
    const statusText = document.getElementById('status-text');

    try {
      const response = await fetch(`${this.serverUrl}/health`);
      if (response.ok) {
        statusEl.className = 'connection-status connected';
        statusText.textContent = 'Connected';
        return true;
      } else {
        throw new Error('Server not responding');
      }
    } catch (error) {
      statusEl.className = 'connection-status disconnected';
      statusText.textContent = 'Disconnected';
      return false;
    }
  }

  // Initialize WebSocket connection
  initializeWebSocket() {
    try {
      this.socket = io();

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.isRealTimeEnabled = true;

        // Identify as dashboard client
        this.socket.emit('identify', { type: 'dashboard' });

        // Subscribe to real-time updates
        this.socket.emit('subscribe_updates');

        this.updateConnectionStatus('Real-time Updates Enabled');
      });

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        this.isRealTimeEnabled = false;
        this.updateConnectionStatus('Real-time Disconnected');
      });

      // Real-time event updates
      this.socket.on('event_update', (eventData) => {
        console.log('Real-time event:', eventData);
        this.addEventToList(eventData);
        this.incrementEventCount();
      });

      // Real-time session updates
      this.socket.on('sessions_update', (data) => {
        this.renderSessions(data.sessions);
        this.updateSessionSelect(data.sessions);
        document.getElementById('active-sessions').textContent = data.sessions.length;
      });

      // Real-time stats updates
      this.socket.on('stats_update', (stats) => {
        document.getElementById('active-sessions').textContent = stats.activeSessions;
        document.getElementById('total-events').textContent = stats.totalEvents;

        const uptime = Math.floor((stats.timestamp - this.startTime) / 1000);
        document.getElementById('uptime').textContent = this.formatUptime(uptime);
      });

    } catch (error) {
      console.warn('WebSocket not available, falling back to polling:', error);
      this.isRealTimeEnabled = false;
    }
  }

  // Update connection status
  updateConnectionStatus(message) {
    const statusText = document.getElementById('status-text');
    statusText.textContent = message;
  }

  // Start automatic data refresh
  startDataRefresh() {
    this.refreshAll();

    // Reduce polling frequency if real-time is enabled
    const interval = this.isRealTimeEnabled ? this.refreshInterval * 2 : this.refreshInterval;
    setInterval(() => {
      if (!this.isRealTimeEnabled) {
        this.refreshAll();
      } else {
        // Only refresh less critical data when real-time is enabled
        this.refreshStats();
      }
    }, interval);
  }

  // Refresh all data
  async refreshAll() {
    if (await this.checkServerConnection()) {
      await Promise.all([
        this.refreshStats(),
        this.refreshSessions(),
        this.refreshEvents()
      ]);
    }
  }

  // Refresh statistics
  async refreshStats() {
    try {
      const [healthResponse, sessionsResponse, logsResponse] = await Promise.all([
        fetch(`${this.serverUrl}/health`),
        fetch(`${this.serverUrl}/sessions`),
        fetch(`${this.serverUrl}/log?limit=1000`)
      ]);

      const healthData = await healthResponse.json();
      const sessionsData = await sessionsResponse.json();
      const logsData = await logsResponse.json();

      // Update stats
      document.getElementById('active-sessions').textContent = sessionsData.sessions.length;
      document.getElementById('total-events').textContent = logsData.logs.length;

      // Calculate pending commands (simplified)
      document.getElementById('pending-commands').textContent = '0';

      // Update uptime
      const uptime = Math.floor((Date.now() - this.startTime) / 1000);
      document.getElementById('uptime').textContent = this.formatUptime(uptime);

    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  }

  // Refresh sessions list
  async refreshSessions() {
    try {
      const response = await fetch(`${this.serverUrl}/sessions`);
      const data = await response.json();

      this.renderSessions(data.sessions);
      this.updateSessionSelect(data.sessions);
    } catch (error) {
      console.error('Error refreshing sessions:', error);
    }
  }

  // Refresh events list
  async refreshEvents() {
    try {
      const filter = document.getElementById('event-filter').value;
      const response = await fetch(`${this.serverUrl}/log?limit=50`);
      const data = await response.json();

      let events = data.logs;
      if (filter) {
        events = events.filter(event => event.event.type === filter);
      }

      this.renderEvents(events);
    } catch (error) {
      console.error('Error refreshing events:', error);
    }
  }

  // Render sessions
  renderSessions(sessions) {
    const container = document.getElementById('sessions-list');

    if (sessions.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-500">No active sessions</p>';
      return;
    }

    container.innerHTML = sessions.map(session => `
            <div class="session-item">
                <div class="session-header">
                    <span class="session-id">${session.sessionId.substring(0, 12)}...</span>
                    <span class="session-status active">Active</span>
                </div>
                <div class="session-url">${session.url}</div>
                <div class="session-stats">
                    <span><i class="fas fa-mouse-pointer"></i> ${session.eventCount} events</span>
                    <span><i class="fas fa-clock"></i> ${this.formatTime(session.lastActivity)}</span>
                </div>
            </div>
        `).join('');
  }

  // Render events
  renderEvents(events) {
    const container = document.getElementById('events-list');

    if (events.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-500">No events found</p>';
      return;
    }

    container.innerHTML = events.reverse().slice(0, 20).map(event => `
            <div class="event-item ${event.event.type}">
                <div class="event-header">
                    <span class="event-type">${event.event.type}</span>
                    <span class="event-time">${this.formatTime(event.timestamp)}</span>
                </div>
                <div class="event-details">
                    <strong>${event.event.tagName}</strong>
                    ${event.event.selector ? `<span class="event-selector">${event.event.selector}</span>` : ''}
                    ${event.event.text ? `<br><small>"${event.event.text.substring(0, 50)}..."</small>` : ''}
                </div>
            </div>
        `).join('');
  }

  // Update session select dropdown
  updateSessionSelect(sessions) {
    const select = document.getElementById('session-select');
    const currentValue = select.value;

    select.innerHTML = '<option value="">Select Session</option>' +
            sessions.map(session =>
              `<option value="${session.sessionId}" ${session.sessionId === currentValue ? 'selected' : ''}>
                    ${session.sessionId.substring(0, 12)}... - ${new URL(session.url).hostname}
                </option>`
            ).join('');
  }

  // Add event to list (for real-time updates)
  addEventToList(eventData) {
    const container = document.getElementById('events-list');
    const filter = document.getElementById('event-filter').value;

    // Check filter
    if (filter && eventData.event.type !== filter) {
      return;
    }

    const eventHtml = `
            <div class="event-item ${eventData.event.type}">
                <div class="event-header">
                    <span class="event-type">${eventData.event.type}</span>
                    <span class="event-time">${this.formatTime(eventData.timestamp)}</span>
                </div>
                <div class="event-details">
                    <strong>${eventData.event.tagName}</strong>
                    ${eventData.event.selector ? `<span class="event-selector">${eventData.event.selector}</span>` : ''}
                    ${eventData.event.text ? `<br><small>"${eventData.event.text.substring(0, 50)}..."</small>` : ''}
                </div>
            </div>
        `;

    // Add to top of list
    container.insertAdjacentHTML('afterbegin', eventHtml);

    // Limit to 20 items
    const items = container.children;
    if (items.length > 20) {
      container.removeChild(items[items.length - 1]);
    }
  }

  // Increment event count
  incrementEventCount() {
    const currentCount = parseInt(document.getElementById('total-events').textContent);
    document.getElementById('total-events').textContent = currentCount + 1;
  }

  // Send command
  async sendCommand() {
    const sessionId = document.getElementById('session-select').value;
    const commandType = document.getElementById('command-type').value;
    const selector = document.getElementById('command-selector').value;
    const value = document.getElementById('command-value').value;

    if (!sessionId || !selector) {
      alert('Please select a session and enter a selector');
      return;
    }

    const command = {
      type: commandType,
      selector: selector
    };

    if (commandType === 'input' && value) {
      command.value = value;
    }

    try {
      // Try WebSocket first if available
      if (this.socket && this.socket.connected) {
        this.socket.emit('send_command', {
          sessionId: sessionId,
          command: command
        });

        alert('Command sent via WebSocket!');
        document.getElementById('command-selector').value = '';
        document.getElementById('command-value').value = '';
        return;
      }

      // Fallback to HTTP
      const response = await fetch(`${this.serverUrl}/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          command: command
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`Command sent successfully! (${result.commandCount} total commands for session)`);
        document.getElementById('command-selector').value = '';
        document.getElementById('command-value').value = '';
      } else {
        alert(`Error sending command: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending command:', error);
      alert('Error sending command. Check console for details.');
    }
  }

  // Utility functions
  formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
  }

  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}

// Global functions for HTML onclick handlers
function refreshSessions() {
  dashboard.refreshSessions();
}

function refreshEvents() {
  dashboard.refreshEvents();
}

function sendCommand() {
  dashboard.sendCommand();
}

// Check authentication
function checkAuth() {
  const token = localStorage.getItem('mcp_token');
  if (!token) {
    window.location.href = '/dashboard/login.html';
    return false;
  }

  // Verify token
  fetch('/auth/verify', {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(response => {
    if (!response.ok) {
      localStorage.removeItem('mcp_token');
      localStorage.removeItem('mcp_user');
      window.location.href = '/dashboard/login.html';
    }
  }).catch(() => {
    // Allow access without authentication for demo purposes
  });

  return true;
}

// Add logout functionality
function logout() {
  localStorage.removeItem('mcp_token');
  localStorage.removeItem('mcp_user');
  window.location.href = '/dashboard/login.html';
}

// Trilogy AI System Integration
async function refreshTrilogyData() {
  const trilogyBaseUrl = 'http://localhost:8080';

  try {
    // Fetch PRD data
    const prdResponse = await fetch(`${trilogyBaseUrl}/memory/prd/crewai-orchestration.md`);
    const prdData = await prdResponse.json();

    if (prdData.success && prdData.data) {
      const title = prdData.data.split('\n')[0].replace('#', '').trim();
      document.getElementById('trilogy-prd-title').textContent = title.substring(0, 60) + '...';
    } else {
      document.getElementById('trilogy-prd-title').textContent = 'No PRD loaded';
    }

    // Fetch task data
    const tasksResponse = await fetch(`${trilogyBaseUrl}/memory/tasks/approved_tasks.json`);
    const tasksData = await tasksResponse.json();

    if (tasksData.success && tasksData.data) {
      document.getElementById('trilogy-tasks-approved').textContent = tasksData.data.approved.length || 0;
      document.getElementById('trilogy-tasks-rejected').textContent = tasksData.data.rejected.length || 0;
    }

    // Fetch health status
    const healthResponse = await fetch(`${trilogyBaseUrl}/health`);
    const healthData = await healthResponse.json();

    document.getElementById('trilogy-status').textContent =
            healthData.status === 'healthy' ? '🟢 Healthy' : '🔴 Issue';

  } catch (error) {
    console.error('Error fetching Trilogy data:', error);
    document.getElementById('trilogy-prd-title').textContent = 'Connection failed';
    document.getElementById('trilogy-status').textContent = '🔴 Offline';
  }
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
  // Check authentication (optional - comment out to disable auth)
  // if (!checkAuth()) return;

  dashboard = new MCPDashboard();

  // Load Trilogy data
  refreshTrilogyData();

  // Refresh Trilogy data every 10 seconds
  setInterval(refreshTrilogyData, 10000);

  // Show user info if logged in
  const user = JSON.parse(localStorage.getItem('mcp_user') || '{}');
  if (user.username) {
    document.getElementById('logout-btn').style.display = 'block';
  }
});
