/**
 * Dashboard Core - Main initialization and coordination logic
 * Handles dashboard startup, URL parameters, and global coordination
 */

class DashboardCore {
  constructor() {
    this.initialized = false;
    console.log('[Trilogy] Dashboard Core initialized');
  }

  /**
     * Initialize the dashboard
     * Sets up initial state, URL parameters, and loads initial data
     */
  init() {
    if (this.initialized) {
      console.warn('[Trilogy] Dashboard already initialized');
      return;
    }

    console.log('[Trilogy] Initializing dashboard');

    // Set initialization timestamp
    const initTimeElement = document.getElementById('init-time');
    if (initTimeElement) {
      initTimeElement.textContent = new Date().toLocaleTimeString();
    }

    // Load initial data for overview tab
    if (window.TabManager) {
      window.TabManager.loadTabData('overview');
    }

    // Handle URL parameters for direct tab access
    this.handleUrlParameters();

    this.initialized = true;
    console.log('[Trilogy] Dashboard initialization complete');
  }

  /**
     * Handle URL parameters for direct tab navigation
     * Supports ?tab=tabname for deep linking
     */
  handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');

    if (tabParam) {
      const validTabs = ['overview', 'projects', 'agents', 'intelligence', 'logs', 'settings'];
      if (validTabs.includes(tabParam)) {
        console.log(`[Trilogy] Loading tab from URL parameter: ${tabParam}`);
        this.showTabByName(tabParam);
      } else {
        console.warn(`[Trilogy] Invalid tab parameter: ${tabParam}`);
      }
    }
  }

  /**
     * Show tab by name (for URL parameter support)
     * @param {string} tabName - Name of the tab to show
     */
  showTabByName(tabName) {
    const tabElements = document.querySelectorAll('.nav-tab');
    tabElements.forEach((tab) => {
      if (tab.textContent.toLowerCase().includes(tabName)) {
        tab.click();
      }
    });
  }

  /**
     * Get current initialization status
     * @returns {boolean} Whether dashboard is initialized
     */
  isInitialized() {
    return this.initialized;
  }
}

// Initialize dashboard when DOM is ready
function initializeDashboard() {
  console.log('[Trilogy] DOM ready - initializing dashboard');

  // Create global dashboard instance
  window.Dashboard = new DashboardCore();
  window.Dashboard.init();
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
  initializeDashboard();
}
