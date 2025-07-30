/**
 * Tab Manager - Tab switching and content management
 * Handles all tab navigation, content loading, and state management
 */

class TabManager {
    constructor() {
        this.validTabs = ['overview', 'projects', 'agents', 'intelligence', 'logs', 'settings'];
        this.activeTab = 'overview';
        console.log('[Trilogy] Tab Manager initialized');
    }

    /**
     * Switch to a specific tab
     * @param {Event} event - Click event from tab
     * @param {string} tabName - Name of tab to switch to
     */
    showTab(event, tabName) {
        if (!this.validTabs.includes(tabName)) {
            console.error(`[Trilogy] Invalid tab name: ${tabName}`);
            return;
        }

        console.log(`[Trilogy] Switching to tab: ${tabName}`);
        
        // Update active tab styling
        this.updateTabStyling(event);
        
        // Switch tab content
        this.switchTabContent(tabName);
        
        // Update global state
        window.currentTab = tabName;
        this.activeTab = tabName;
        
        // Load tab-specific data
        this.loadTabData(tabName);
    }

    /**
     * Update tab styling to show active state
     * @param {Event} event - Click event from tab
     */
    updateTabStyling(event) {
        // Remove active class from all tabs
        const tabs = document.querySelectorAll('.nav-tab');
        tabs.forEach(function(tab) {
            tab.classList.remove('active');
        });
        
        // Add active class to clicked tab
        if (event && event.target) {
            event.target.classList.add('active');
        }
    }

    /**
     * Switch tab content visibility
     * @param {string} tabName - Name of tab to show
     */
    switchTabContent(tabName) {
        // Hide all tab contents
        const contents = document.querySelectorAll('.tab-content');
        contents.forEach(function(content) {
            content.classList.remove('active');
        });
        
        // Show selected tab content
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) {
            selectedTab.classList.add('active');
        } else {
            console.error(`[Trilogy] Tab content not found: ${tabName}`);
        }
    }

    /**
     * Load data based on active tab
     * @param {string} tabName - Name of tab to load data for
     */
    loadTabData(tabName) {
        console.log(`[Trilogy] Loading data for tab: ${tabName}`);
        
        switch (tabName) {
            case 'projects':
                this.loadProjectsTab();
                break;
                
            case 'overview':
                this.loadOverviewTab();
                break;
                
            case 'agents':
                this.loadAgentsTab();
                break;
                
            case 'intelligence':
                this.loadIntelligenceTab();
                break;
                
            case 'logs':
                this.loadLogsTab();
                break;
                
            case 'settings':
                this.loadSettingsTab();
                break;
                
            default:
                console.warn(`[Trilogy] No data loader for tab: ${tabName}`);
        }
    }

    /**
     * Load projects tab data
     */
    loadProjectsTab() {
        if (window.DataManager) {
            window.DataManager.loadProjectsData();
        }
        
        // Initialize workflow manager if not already done
        if (window.WorkflowManager) {
            window.WorkflowManager.initialize();
        }
    }

    /**
     * Load overview tab data
     */
    loadOverviewTab() {
        if (window.UIComponents) {
            window.UIComponents.updateActivityFeed(`Tab switched to: overview`);
        }
        
        // Load projects data for overview metrics
        if (window.DataManager) {
            window.DataManager.loadProjectsData();
        }
    }

    /**
     * Load agents tab data
     */
    loadAgentsTab() {
        if (window.UIComponents) {
            window.UIComponents.updateActivityFeed(`Tab switched to: agents`);
        }
        
        // Initialize agent pool manager if not already done
        if (window.AgentPoolManager) {
            window.AgentPoolManager.initialize();
        }
    }

    /**
     * Load intelligence tab data (placeholder)
     */
    loadIntelligenceTab() {
        if (window.UIComponents) {
            window.UIComponents.updateActivityFeed(`Tab switched to: intelligence`);
        }
        
        // TODO: Implement intelligence analytics data loading
        console.log('[Trilogy] Intelligence tab data loading - placeholder');
    }

    /**
     * Load logs tab data
     */
    loadLogsTab() {
        if (window.UIComponents) {
            window.UIComponents.updateActivityFeed(`Tab switched to: logs`);
        }
        
        // Initialize log manager if not already done
        if (window.LogManager) {
            window.LogManager.initialize();
        }
    }

    /**
     * Load settings tab data (placeholder)
     */
    loadSettingsTab() {
        if (window.UIComponents) {
            window.UIComponents.updateActivityFeed(`Tab switched to: settings`);
        }
        
        // TODO: Implement settings data loading
        console.log('[Trilogy] Settings tab data loading - placeholder');
    }

    /**
     * Get current active tab
     * @returns {string} Name of currently active tab
     */
    getActiveTab() {
        return this.activeTab;
    }

    /**
     * Get all valid tab names
     * @returns {Array} Array of valid tab names
     */
    getValidTabs() {
        return [...this.validTabs];
    }

    /**
     * Check if tab name is valid
     * @param {string} tabName - Tab name to validate
     * @returns {boolean} True if tab name is valid
     */
    isValidTab(tabName) {
        return this.validTabs.includes(tabName);
    }

    /**
     * Refresh current tab data
     */
    refreshCurrentTab() {
        console.log(`[Trilogy] Refreshing current tab: ${this.activeTab}`);
        this.loadTabData(this.activeTab);
    }
}

// Create global instance
window.TabManager = new TabManager();