/**
 * System Log Manager
 * Handles loading and displaying system logs
 */

class LogManager {
  constructor() {
    this.logs = [];
    this.filteredLogs = [];
    this.currentFilter = 'all';
    this.autoScroll = true;
    this.updateInterval = null;
  }

  /**
     * Initialize log viewer
     */
  async initialize() {
    console.log('📝 LogManager: Initializing...');

    // Set up event listeners
    this.setupEventListeners();

    // Start periodic updates
    this.startPeriodicUpdates();

    // Load initial logs
    await this.loadSystemLogs();
  }

  /**
     * Set up event listeners
     */
  setupEventListeners() {
    const filterSelect = document.getElementById('log-level-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.setLogFilter(e.target.value);
      });
    }
  }

  /**
     * Start periodic log updates
     */
  startPeriodicUpdates() {
    // Update every 3 seconds for logs
    this.updateInterval = setInterval(async () => {
      await this.loadSystemLogs();
    }, 3000);
  }

  /**
     * Stop periodic updates
     */
  stopPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
     * Load system logs from server
     */
  async loadSystemLogs() {
    try {
      // For now, simulate real logs with a mix of agent activity and system events
      const simulatedLogs = this.generateSimulatedLogs();

      // Add new logs only (avoid duplicates)
      const newLogs = simulatedLogs.filter(log =>
        !this.logs.some(existingLog =>
          existingLog.timestamp === log.timestamp && existingLog.message === log.message
        )
      );

      if (newLogs.length > 0) {
        this.logs = [...this.logs, ...newLogs].slice(-100); // Keep last 100 logs
        this.applyFilter();
        this.updateLogViewerUI();
      }
    } catch (error) {
      console.error('Failed to load system logs:', error);
    }
  }

  /**
     * Generate simulated logs based on system activity
     */
  generateSimulatedLogs() {
    const now = new Date();
    const logs = [];

    // Simulate some recent activity
    const logTypes = [
      { level: 'info', message: '💓 Agent heartbeat - Pool size: 2' },
      { level: 'info', message: '🔗 Agent runner connected to server' },
      { level: 'debug', message: 'Memory system: PostgreSQL connection active' },
      { level: 'info', message: '✅ Agent sonnet status: idle' },
      { level: 'info', message: '✅ Agent opus status: idle' },
      { level: 'debug', message: 'WebSocket connection established' },
      { level: 'info', message: '🚀 System health check: All services operational' }
    ];

    // Add a few random recent logs
    for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
      const logType = logTypes[Math.floor(Math.random() * logTypes.length)];
      const timestamp = new Date(now.getTime() - (Math.random() * 30000)); // Last 30 seconds

      logs.push({
        timestamp: timestamp.toISOString(),
        level: logType.level,
        message: logType.message
      });
    }

    return logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
     * Set log level filter
     */
  setLogFilter(level) {
    this.currentFilter = level;
    this.applyFilter();
    this.updateLogViewerUI();
  }

  /**
     * Apply current filter to logs
     */
  applyFilter() {
    if (this.currentFilter === 'all') {
      this.filteredLogs = [...this.logs];
    } else {
      this.filteredLogs = this.logs.filter(log => log.level === this.currentFilter);
    }
  }

  /**
     * Update log viewer UI
     */
  updateLogViewerUI() {
    const container = document.getElementById('log-viewer');
    if (!container) return;

    if (this.filteredLogs.length === 0) {
      container.innerHTML = '<div class="empty-state">No logs available</div>';
      return;
    }

    const logsHTML = this.filteredLogs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString();
      return `
                <div class="log-entry ${log.level}">
                    <span class="log-timestamp">[${timestamp}]</span>
                    <span class="log-level">[${log.level.toUpperCase()}]</span>
                    <span class="log-message">${log.message}</span>
                </div>
            `;
    }).join('');

    container.innerHTML = logsHTML;

    // Auto-scroll to bottom if enabled
    if (this.autoScroll) {
      container.scrollTop = container.scrollHeight;
    }
  }

  /**
     * Clear all logs
     */
  clearLogs() {
    this.logs = [];
    this.filteredLogs = [];
    this.updateLogViewerUI();
  }

  /**
     * Toggle auto-scroll
     */
  toggleAutoScroll() {
    this.autoScroll = !this.autoScroll;
    const button = document.getElementById('auto-scroll-btn');
    if (button) {
      button.textContent = `Auto-scroll: ${this.autoScroll ? 'ON' : 'OFF'}`;
    }
  }
}

// Global functions for HTML onclick handlers
window.clearLogs = function() {
  if (window.LogManager) {
    window.LogManager.clearLogs();
  }
};

window.toggleAutoScroll = function() {
  if (window.LogManager) {
    window.LogManager.toggleAutoScroll();
  }
};

// Global instance
window.LogManager = new LogManager();
