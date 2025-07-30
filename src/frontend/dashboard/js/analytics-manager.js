/**
 * Analytics Manager - Intelligence Analytics data management
 * Handles real-time data loading, display updates, and metric calculations
 */

class AnalyticsManager {
    constructor() {
        this.updateInterval = null;
        this.activityInterval = null;
        this.isInitialized = false;
        console.log('[Trilogy] Analytics Manager initialized');
    }

    /**
     * Initialize analytics dashboard
     */
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('[Trilogy] Initializing Intelligence Analytics...');
        
        try {
            // Load initial data
            await this.loadOverviewMetrics();
            await this.loadPerformanceData();
            await this.loadAgentData();
            await this.loadSystemInsights();
            await this.loadActivityData();
            
            // Start real-time updates
            this.startRealTimeUpdates();
            
            this.isInitialized = true;
            console.log('✅ Intelligence Analytics initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize analytics:', error);
        }
    }

    /**
     * Load overview metrics
     */
    async loadOverviewMetrics() {
        try {
            // Check if sample data mode is enabled
            if (!window.useSampleData) {
                this.showEmptyState();
                return;
            }
            
            const response = await fetch('/analytics/overview');
            const data = await response.json();
            
            if (data.success) {
                this.updateOverviewCards(data.metrics);
            }
        } catch (error) {
            console.error('Failed to load overview metrics:', error);
            this.showEmptyState();
        }
    }

    /**
     * Update overview metric cards
     */
    updateOverviewCards(metrics) {
        // Update metric values
        const elements = {
            'total-workflows': metrics.totalWorkflows,
            'avg-completion-time': metrics.avgCompletionTime,
            'success-rate': metrics.successRate,
            'accuracy-score': metrics.accuracyScore
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                
                // Add subtle animation for updates
                element.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                }, 200);
            }
        });
    }

    /**
     * Load performance data and update chart
     */
    async loadPerformanceData() {
        try {
            // Check if sample data mode is enabled
            if (!window.useSampleData) {
                return; // Empty state already shown in loadOverviewMetrics
            }
            
            const response = await fetch('/analytics/performance');
            const data = await response.json();
            
            if (data.success) {
                this.updatePerformanceChart(data.performance);
                this.updatePerformanceInsights(data.insights);
            }
        } catch (error) {
            console.error('Failed to load performance data:', error);
        }
    }

    /**
     * Update performance chart
     */
    updatePerformanceChart(performanceData) {
        const chartBars = document.querySelectorAll('.chart-bar');
        
        performanceData.forEach((data, index) => {
            if (chartBars[index]) {
                const bar = chartBars[index];
                const height = Math.max(20, (data.workflows / 60) * 100); // Scale to max 60 workflows
                bar.style.height = `${height}%`;
                
                // Add hover tooltip data
                bar.setAttribute('title', 
                    `${data.day}: ${data.workflows} workflows, ${data.avgTime}min avg, ${data.successRate}% success`
                );
            }
        });
    }

    /**
     * Update performance insights
     */
    updatePerformanceInsights(insights) {
        const insightsContainer = document.querySelector('.performance-insights');
        if (insightsContainer && insights.length > 0) {
            const insightsHTML = insights.map(insight => `
                <div class="insight-item">
                    <span class="insight-icon">${insight.icon}</span>
                    <div>
                        <strong>${insight.type === 'peak' ? 'Peak Performance' : 
                                 insight.type === 'improvement' ? 'Speed Improvement' : 
                                 'Efficiency Gain'}:</strong> ${insight.message}
                    </div>
                </div>
            `).join('');
            
            insightsContainer.innerHTML = insightsHTML;
        }
    }

    /**
     * Load and display agent performance data
     */
    async loadAgentData() {
        try {
            // Check if sample data mode is enabled
            if (!window.useSampleData) {
                return; // Empty state already shown in loadOverviewMetrics
            }
            
            const response = await fetch('/analytics/agents');
            const data = await response.json();
            
            if (data.success) {
                this.updateAgentCards(data.agents);
            }
        } catch (error) {
            console.error('Failed to load agent data:', error);
        }
    }

    /**
     * Update agent performance cards
     */
    updateAgentCards(agents) {
        const agentGrid = document.querySelector('.agent-analytics-grid');
        if (!agentGrid) return;

        const agentCardsHTML = agents.map(agent => `
            <div class="agent-performance-card">
                <div class="agent-header">
                    <span class="agent-name">${agent.name}</span>
                    <span class="agent-role">${agent.role}</span>
                </div>
                <div class="agent-metrics">
                    <div class="agent-metric">
                        <span class="metric-label">Workflows Processed</span>
                        <span class="metric-value">${agent.workflowsProcessed}</span>
                    </div>
                    <div class="agent-metric">
                        <span class="metric-label">Avg Processing Time</span>
                        <span class="metric-value">${agent.avgProcessingTime}</span>
                    </div>
                    <div class="agent-metric">
                        <span class="metric-label">Accuracy Rating</span>
                        <span class="metric-value">${agent.accuracyRating}</span>
                    </div>
                </div>
                <div class="agent-specialties">
                    ${agent.specialties.map(specialty => 
                        `<span class="specialty-tag">${specialty}</span>`
                    ).join('')}
                </div>
            </div>
        `).join('');

        agentGrid.innerHTML = agentCardsHTML;
    }

    /**
     * Load and display system insights
     */
    async loadSystemInsights() {
        try {
            // Check if sample data mode is enabled
            if (!window.useSampleData) {
                return; // Empty state already shown in loadOverviewMetrics
            }
            
            const response = await fetch('/analytics/insights');
            const data = await response.json();
            
            if (data.success) {
                this.updateSystemInsights(data.insights);
            }
        } catch (error) {
            console.error('Failed to load system insights:', error);
        }
    }

    /**
     * Update system insights display
     */
    updateSystemInsights(insights) {
        const categories = [
            { key: 'performance', title: '🎯 Performance Optimizations', color: '#10b981' },
            { key: 'usage', title: '📈 Usage Patterns', color: '#3b82f6' },
            { key: 'recommendations', title: '⚠️ Recommendations', color: '#f59e0b' }
        ];

        categories.forEach(category => {
            const container = document.querySelector(`.insight-category h4[style*="${category.color}"]`);
            if (container && container.parentElement) {
                const listContainer = container.parentElement.querySelector('.insight-list');
                if (listContainer && insights[category.key]) {
                    listContainer.innerHTML = insights[category.key].map(insight => 
                        `<li>${insight}</li>`
                    ).join('');
                }
            }
        });
    }

    /**
     * Load and display real-time activity
     */
    async loadActivityData() {
        try {
            // Check if sample data mode is enabled
            if (!window.useSampleData) {
                return; // Empty state already shown in loadOverviewMetrics
            }
            
            const response = await fetch('/analytics/activity');
            const data = await response.json();
            
            if (data.success) {
                this.updateActivityStats(data.stats);
                this.updateActivityFeed(data.activities);
            }
        } catch (error) {
            console.error('Failed to load activity data:', error);
        }
    }

    /**
     * Update activity statistics
     */
    updateActivityStats(stats) {
        const statElements = {
            'active-workflows': stats.activeWorkflows,
            'queue-length': stats.queueLength,
            'processing-time': stats.currentAvgTime
        };

        Object.entries(statElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    /**
     * Update activity feed
     */
    updateActivityFeed(activities) {
        const feedContainer = document.getElementById('intelligence-activity-feed');
        if (!feedContainer) return;

        const activityHTML = activities.map(activity => `
            <div class="activity-item">
                <span class="activity-time">${activity.time}</span>
                <span class="activity-type ${activity.type}">${activity.type.toUpperCase()}</span>
                <span class="activity-message">${activity.message}</span>
            </div>
        `).join('');

        feedContainer.innerHTML = activityHTML;
    }

    /**
     * Start real-time updates
     */
    startRealTimeUpdates() {
        // Update overview metrics every 30 seconds
        this.updateInterval = setInterval(async () => {  
            if (window.useSampleData) {
                await this.loadOverviewMetrics();
            }
        }, 30000);

        // Update activity feed every 15 seconds
        this.activityInterval = setInterval(async () => {
            if (window.useSampleData) {
                await this.loadActivityData();
            }
        }, 15000);

        console.log('🔄 Real-time analytics updates started');
    }

    /**
     * Stop real-time updates
     */
    stopRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        if (this.activityInterval) {
            clearInterval(this.activityInterval);
            this.activityInterval = null;
        }

        console.log('⏹️ Real-time analytics updates stopped');
    }

    /**
     * Refresh all analytics data
     */
    async refreshAllData() {
        console.log('🔄 Refreshing all analytics data...');
        
        await Promise.all([
            this.loadOverviewMetrics(),
            this.loadPerformanceData(),
            this.loadAgentData(),
            this.loadSystemInsights(),
            this.loadActivityData()
        ]);
        
        console.log('✅ Analytics data refresh complete');
    }

    /**
     * Show empty state when sample data is disabled
     */
    showEmptyState() {
        console.log('[Trilogy] Showing analytics empty state (sample data disabled)');
        
        // Clear overview metrics
        const elements = {
            'total-workflows': '--',
            'avg-completion-time': '--',
            'success-rate': '--',
            'accuracy-score': '--'
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });

        // Clear agent cards
        const agentGrid = document.querySelector('.agent-analytics-grid');
        if (agentGrid) {
            agentGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <p>📊 Intelligence Analytics requires sample data mode</p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">Enable sample data toggle to view AI performance metrics</p>
                </div>
            `;
        }

        // Clear activity stats
        const statElements = {
            'active-workflows': '--',
            'queue-length': '--',
            'processing-time': '--'
        };

        Object.entries(statElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });

        // Clear activity feed
        const feedContainer = document.getElementById('intelligence-activity-feed');
        if (feedContainer) {
            feedContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <p>🔌 No live data available</p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">Enable sample data to see activity feed</p>
                </div>
            `;
        }

        // Clear insights
        const categories = [
            { selector: '.insight-category h4[style*="#10b981"]' },
            { selector: '.insight-category h4[style*="#3b82f6"]' },
            { selector: '.insight-category h4[style*="#f59e0b"]' }
        ];

        categories.forEach(category => {
            const container = document.querySelector(category.selector);
            if (container && container.parentElement) {
                const listContainer = container.parentElement.querySelector('.insight-list');
                if (listContainer) {
                    listContainer.innerHTML = '<li style="text-align: center; color: var(--text-secondary); font-style: italic;">No insights available in live mode</li>';
                }
            }
        });

        // Clear chart bars to empty state
        const chartBars = document.querySelectorAll('.chart-bar');
        chartBars.forEach(bar => {
            bar.style.height = '5%';
            bar.setAttribute('title', 'No data available');
        });

        // Clear performance insights
        const insightsContainer = document.querySelector('.performance-insights');
        if (insightsContainer) {
            insightsContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <p>📈 Performance insights require sample data</p>
                </div>
            `;
        }
    }

    /**
     * Cleanup method
     */
    cleanup() {
        this.stopRealTimeUpdates();
        this.isInitialized = false;
        console.log('[Trilogy] Analytics Manager cleaned up');
    }
}

// Create global instance
window.AnalyticsManager = new AnalyticsManager();