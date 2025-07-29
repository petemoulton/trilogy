/**
 * Data Manager - API calls and data management
 * Centralizes all API interactions and data processing
 */

class DataManager {
    constructor() {
        this.cache = new Map();
        this.cacheTTL = 30000; // 30 seconds cache
        console.log('[Trilogy] Data Manager initialized');
    }

    /**
     * Load projects data from API
     * @returns {Promise<Array>} Array of projects or null on error
     */
    async loadProjectsData() {
        console.log('[Trilogy] Loading projects...');
        
        const projectsGrid = document.getElementById('projects-grid');
        if (!projectsGrid) {
            console.error('[Trilogy] projects-grid element not found!');
            return null;
        }
        
        // Show loading state
        projectsGrid.innerHTML = '<div class="empty-state">Loading projects...</div>';
        
        try {
            const response = await fetch('/api/projects');
            const data = await response.json();
            
            console.log('[Trilogy] API response:', data);
            
            if (data.success && data.data && data.data.length > 0) {
                console.log(`[Trilogy] API returned ${data.data.length} projects`);
                
                // Store in global state and cache
                window.projectsData = data.data;
                this.setCacheData('projects', data.data);
                
                // Update UI
                if (window.UIComponents) {
                    window.UIComponents.renderProjects(data.data);
                    window.UIComponents.updateActivityFeed(`Loaded ${data.data.length} projects successfully`);
                }
                
                return data.data;
            } else {
                console.log('[Trilogy] No projects found in API response');
                projectsGrid.innerHTML = '<div class="empty-state">No projects found</div>';
                
                if (window.UIComponents) {
                    window.UIComponents.updateActivityFeed('No projects found');
                }
                
                return [];
            }
        } catch (error) {
            console.error('[Trilogy] Error loading projects:', error);
            projectsGrid.innerHTML = '<div class="empty-state">Error loading projects</div>';
            
            if (window.UIComponents) {
                window.UIComponents.updateActivityFeed(`Error loading projects: ${error.message}`);
            }
            
            return null;
        }
    }

    /**
     * Force reload projects data (bypasses cache)
     */
    async forceLoadProjects() {
        console.log('[Trilogy] Force loading projects...');
        
        // Clear cache
        this.cache.delete('projects');
        
        if (window.UIComponents) {
            window.UIComponents.updateActivityFeed('Force loading projects from API');
        }
        
        return await this.loadProjectsData();
    }

    /**
     * Get cached data if available and not expired
     * @param {string} key - Cache key
     * @returns {any|null} Cached data or null if expired/not found
     */
    getCacheData(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        return null;
    }

    /**
     * Set data in cache with timestamp
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     */
    setCacheData(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache.clear();
        console.log('[Trilogy] Cache cleared');
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
            ttl: this.cacheTTL
        };
    }
}

// Create global instance
window.DataManager = new DataManager();