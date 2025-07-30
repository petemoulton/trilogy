/**
 * Sample Data Manager - Sample data definitions and toggle functionality
 * Handles sample data mode switching and demo data
 */

class SampleDataManager {
  constructor() {
    this.sampleProjects = [
      {
        name: 'AI Content Generator',
        description: 'Automated content creation system using advanced language models',
        status: 'active'
      },
      {
        name: 'Smart Task Scheduler',
        description: 'Intelligent task allocation and scheduling system',
        status: 'active'
      },
      {
        name: 'Data Analysis Pipeline',
        description: 'Automated data processing and insight generation',
        status: 'created'
      },
      {
        name: 'Voice Assistant Integration',
        description: 'Multi-modal voice interface for system control',
        status: 'active'
      },
      {
        name: 'Security Monitoring',
        description: 'Real-time threat detection and response system',
        status: 'created'
      }
    ];

    console.log('[Trilogy] Sample Data Manager initialized');
  }

  /**
     * Toggle between sample data and live data
     * Updates UI state and switches data source
     */
  toggleSampleData() {
    console.log('[Trilogy] Toggling sample data mode');

    // Toggle global state
    window.useSampleData = !window.useSampleData;

    const toggleButton = document.getElementById('sample-data-toggle');
    if (!toggleButton) {
      console.error('[Trilogy] Sample data toggle button not found');
      return;
    }

    if (window.useSampleData) {
      // Switch to sample data mode
      this.enableSampleDataMode(toggleButton);
    } else {
      // Switch to live data mode
      this.enableLiveDataMode(toggleButton);
    }
  }

  /**
     * Enable sample data mode
     * @param {HTMLElement} toggleButton - The toggle button element
     */
  enableSampleDataMode(toggleButton) {
    // Update button appearance
    if (window.UIComponents) {
      window.UIComponents.updateButtonState(
        'sample-data-toggle',
        '📊 Use Live Data',
        '#dc2626'
      );
      window.UIComponents.updateActivityFeed('Switched to sample data mode');
    }

    // Load sample data
    if (window.UIComponents) {
      window.UIComponents.renderProjects(this.sampleProjects);
      window.UIComponents.updateProjectCount(this.sampleProjects.length);
    }

    // Refresh analytics if on intelligence tab
    if (window.currentTab === 'intelligence' && window.AnalyticsManager) {
      window.AnalyticsManager.refreshAllData();
    }

    console.log('[Trilogy] Sample data mode enabled');
  }

  /**
     * Enable live data mode
     * @param {HTMLElement} toggleButton - The toggle button element
     */
  enableLiveDataMode(toggleButton) {
    // Update button appearance
    if (window.UIComponents) {
      window.UIComponents.updateButtonState(
        'sample-data-toggle',
        '📊 Toggle Sample Data',
        '#059669'
      );
      window.UIComponents.updateActivityFeed('Switched to live data mode');
    }

    // Reload live data
    if (window.DataManager) {
      if (window.currentTab === 'projects') {
        window.DataManager.loadProjectsData();
      } else {
        // Update overview with live data
        window.DataManager.loadProjectsData();
      }
    }

    // Refresh analytics if on intelligence tab
    if (window.currentTab === 'intelligence' && window.AnalyticsManager) {
      window.AnalyticsManager.refreshAllData();
    }

    console.log('[Trilogy] Live data mode enabled');
  }

  /**
     * Get sample projects data
     * @returns {Array} Array of sample project objects
     */
  getSampleProjects() {
    return [...this.sampleProjects]; // Return copy to prevent mutation
  }

  /**
     * Add sample project
     * @param {Object} project - Project object to add
     */
  addSampleProject(project) {
    if (project && project.name) {
      this.sampleProjects.push({
        name: project.name,
        description: project.description || 'No description',
        status: project.status || 'created'
      });
      console.log(`[Trilogy] Added sample project: ${project.name}`);
    }
  }

  /**
     * Remove sample project by name
     * @param {string} projectName - Name of project to remove
     */
  removeSampleProject(projectName) {
    const index = this.sampleProjects.findIndex(p => p.name === projectName);
    if (index !== -1) {
      this.sampleProjects.splice(index, 1);
      console.log(`[Trilogy] Removed sample project: ${projectName}`);
    }
  }

  /**
     * Get current sample data mode status
     * @returns {boolean} True if in sample data mode
     */
  isInSampleMode() {
    return window.useSampleData || false;
  }

  /**
     * Reset sample data to defaults
     */
  resetSampleData() {
    this.sampleProjects = [
      {
        name: 'AI Content Generator',
        description: 'Automated content creation system using advanced language models',
        status: 'active'
      },
      {
        name: 'Smart Task Scheduler',
        description: 'Intelligent task allocation and scheduling system',
        status: 'active'
      },
      {
        name: 'Data Analysis Pipeline',
        description: 'Automated data processing and insight generation',
        status: 'created'
      },
      {
        name: 'Voice Assistant Integration',
        description: 'Multi-modal voice interface for system control',
        status: 'active'
      },
      {
        name: 'Security Monitoring',
        description: 'Real-time threat detection and response system',
        status: 'created'
      }
    ];

    console.log('[Trilogy] Sample data reset to defaults');
  }
}

// Create global instance
window.SampleDataManager = new SampleDataManager();
