/**
 * Agent Pool Manager
 * Handles loading and displaying agent pool information
 */

class AgentPoolManager {
    constructor() {
        this.agents = [];
        this.poolStats = {};
        this.updateInterval = null;
    }

    /**
     * Initialize agent pool monitoring
     */
    async initialize() {
        console.log('🤖 AgentPoolManager: Initializing...');
        
        // Start periodic updates
        this.startPeriodicUpdates();
        
        // Load initial data
        await this.loadAgentPoolData();
    }

    /**
     * Start periodic updates of agent pool data
     */
    startPeriodicUpdates() {
        // Update every 5 seconds
        this.updateInterval = setInterval(async () => {
            await this.loadAgentPoolData();
        }, 5000);
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
     * Load agent pool data from server
     */
    async loadAgentPoolData() {
        try {
            const response = await fetch('/agents/pool/status');
            const data = await response.json();
            
            if (data.success) {
                this.poolStats = data.poolStats;
                this.agents = data.agents;
                
                // Update UI
                this.updatePoolStatsUI();
                this.updateAgentsListUI();
                this.updateCapabilitiesUI();
            }
        } catch (error) {
            console.error('Failed to load agent pool data:', error);
        }
    }

    /**
     * Update pool statistics in UI
     */
    updatePoolStatsUI() {
        const elements = {
            'total-agents': this.poolStats.totalAgents || 0,
            'active-agents': this.poolStats.activeAgents || 0,
            'idle-agents': this.poolStats.idleAgents || 0,
            'error-agents': this.poolStats.errorAgents || 0
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    /**
     * Update agents list in UI
     */
    updateAgentsListUI() {
        const container = document.getElementById('agents-list');
        if (!container) return;

        if (!this.agents || this.agents.length === 0) {
            container.innerHTML = '<div class="empty-state">No agents available</div>';
            return;
        }

        const agentsHTML = this.agents.map(agent => `
            <div class="agent-card">
                <div class="agent-info">
                    <h4>${agent.id.toUpperCase()}</h4>
                    <p><strong>Role:</strong> ${agent.role}</p>
                    <p><strong>Tasks Completed:</strong> ${agent.tasksCompleted}</p>
                    <p><strong>Spawned:</strong> ${new Date(agent.spawnedAt).toLocaleString()}</p>
                    ${agent.currentTask ? `<p><strong>Current Task:</strong> ${agent.currentTask}</p>` : ''}
                </div>
                <div class="agent-status ${agent.status}">
                    ${agent.status.toUpperCase()}
                </div>
            </div>
        `).join('');

        container.innerHTML = agentsHTML;
    }

    /**
     * Update capabilities list in UI  
     */
    updateCapabilitiesUI() {
        const container = document.getElementById('capabilities-list');
        if (!container) return;

        if (!this.poolStats.capabilities || this.poolStats.capabilities.length === 0) {
            container.innerHTML = '<div class="empty-state">No capabilities available</div>';
            return;
        }

        const capabilitiesHTML = this.poolStats.capabilities.map(capability => 
            `<span class="capability-tag">${capability}</span>`
        ).join('');

        container.innerHTML = capabilitiesHTML;
    }
}

// Global instance
window.AgentPoolManager = new AgentPoolManager();