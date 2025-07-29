/**
 * UI Components - User interface interactions and rendering
 * Handles all UI updates, rendering, and user interactions
 */

class UIComponents {
    constructor() {
        this.maxActivityItems = 10;
        console.log('[Trilogy] UI Components initialized');
    }

    /**
     * Render projects in the projects grid
     * @param {Array} projects - Array of project objects
     */
    renderProjects(projects) {
        console.log(`[Trilogy] Rendering ${projects.length} projects`);
        
        const projectsGrid = document.getElementById('projects-grid');
        if (!projectsGrid) {
            console.error('[Trilogy] projects-grid element not found!');
            return;
        }
        
        if (!projects || projects.length === 0) {
            projectsGrid.innerHTML = '<div class="empty-state">No projects found</div>';
            return;
        }
        
        let html = '';
        projects.forEach(function(project) {
            const status = project.status || 'active';
            const description = project.description || 'No description';
            
            // Generate random stats for demo (TODO: Use real data)
            const taskCount = Math.floor(Math.random() * 15) + 1;
            const agentCount = Math.floor(Math.random() * 5) + 1;
            const progress = Math.floor(Math.random() * 90) + 10;
            
            html += `
                <div class="project-card">
                    <div class="project-header">
                        <h3>${project.name}</h3>
                        <span class="status-badge ${status}">${status}</span>
                    </div>
                    <p style="color: #94a3b8; margin-bottom: 1rem;">${description}</p>
                    <div class="project-stats">
                        <span>${taskCount} tasks</span>
                        <span>•</span>
                        <span>${agentCount} agents</span>
                        <span>•</span>
                        <span>${progress}% complete</span>
                    </div>
                </div>
            `;
        });
        
        projectsGrid.innerHTML = html;
        
        // Update project count in overview
        this.updateProjectCount(projects.length);
    }

    /**
     * Update project count in the overview section
     * @param {number} count - Number of projects
     */
    updateProjectCount(count) {
        const countElement = document.getElementById('active-projects-count');
        if (countElement) {
            countElement.textContent = count;
        }
    }

    /**
     * Update activity feed with new message
     * @param {string} message - Message to add to activity feed
     */
    updateActivityFeed(message) {
        const feed = document.getElementById('activity-feed');
        if (!feed) {
            console.warn('[Trilogy] Activity feed element not found');
            return;
        }
        
        const time = new Date().toLocaleTimeString();
        const newItem = `<div class="activity-item">✅ ${message} - ${time}</div>`;
        
        // Add new item to the top
        feed.innerHTML = newItem + feed.innerHTML;
        
        // Keep only last N items to prevent memory issues
        const items = feed.querySelectorAll('.activity-item');
        if (items.length > this.maxActivityItems) {
            for (let i = this.maxActivityItems; i < items.length; i++) {
                items[i].remove();
            }
        }
    }

    /**
     * Show loading state for a container
     * @param {string} containerId - ID of container to show loading state
     * @param {string} message - Loading message
     */
    showLoading(containerId, message = 'Loading...') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="empty-state">${message}</div>`;
        }
    }

    /**
     * Show error state for a container
     * @param {string} containerId - ID of container to show error state
     * @param {string} message - Error message
     */
    showError(containerId, message = 'An error occurred') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="empty-state error">${message}</div>`;
        }
    }

    /**
     * Show empty state for a container
     * @param {string} containerId - ID of container to show empty state
     * @param {string} message - Empty state message
     */
    showEmpty(containerId, message = 'No data found') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="empty-state">${message}</div>`;
        }
    }

    /**
     * Create new project (placeholder implementation)
     */
    createNewProject() {
        // TODO: Implement actual project creation logic
        alert('Project creation coming soon!');
        this.updateActivityFeed('Project creation requested');
    }

    /**
     * Toggle element visibility
     * @param {string} elementId - ID of element to toggle
     */
    toggleElementVisibility(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = element.style.display === 'none' ? 'block' : 'none';
        }
    }

    /**
     * Update button state
     * @param {string} buttonId - ID of button to update
     * @param {string} text - New button text
     * @param {string} bgColor - New background color
     */
    updateButtonState(buttonId, text, bgColor) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.textContent = text;
            button.style.background = bgColor;
        }
    }

    /**
     * Clear activity feed
     */
    clearActivityFeed() {
        const feed = document.getElementById('activity-feed');
        if (feed) {
            feed.innerHTML = '<div class="activity-item">Activity feed cleared</div>';
        }
    }
}

// Create global instance
window.UIComponents = new UIComponents();