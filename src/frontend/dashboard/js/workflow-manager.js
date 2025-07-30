/**
 * Workflow Manager - Handles PRD workflow creation and execution
 */

class WorkflowManager {
    constructor() {
        this.currentWorkflow = null;
        this.workflowStatus = 'idle'; // idle, running, completed, error
        this.activeWebSocket = null;
    }

    /**
     * Initialize workflow manager
     */
    initialize() {
        console.log('🔄 WorkflowManager: Initializing...');
        
        // Set up input validation
        this.setupInputValidation();
        
        // Set up file drop functionality
        this.setupFileDropZone();
        
        // Set up WebSocket for real-time updates
        this.setupWebSocket();
    }

    /**
     * Set up input validation for enabling/disabling start button
     */
    setupInputValidation() {
        const textInput = document.getElementById('prd-text-input');
        const startBtn = document.getElementById('start-workflow-btn');
        
        if (textInput && startBtn) {
            textInput.addEventListener('input', () => {
                const hasContent = textInput.value.trim().length > 50; // Minimum 50 chars
                startBtn.disabled = !hasContent;
                
                if (hasContent) {
                    this.updateWorkflowStatus('✅ Ready to start workflow');
                } else {
                    this.updateWorkflowStatus('');
                }
            });
        }
    }

    /**
     * Set up file drop zone functionality
     */
    setupFileDropZone() {
        const dropZone = document.getElementById('file-drop-zone');
        const fileInput = document.getElementById('file-input');
        
        if (dropZone && fileInput) {
            // Click to browse
            dropZone.addEventListener('click', () => {
                fileInput.click();
            });
            
            // File selection
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleFileUpload(file);
                }
            });
            
            // Drag and drop
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
            
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragover');
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                
                const file = e.dataTransfer.files[0];
                if (file) {
                    this.handleFileUpload(file);
                }
            });
        }
    }

    /**
     * Handle file upload and convert to text
     */
    async handleFileUpload(file) {
        try {
            this.updateWorkflowStatus('📁 Processing file...');
            
            const text = await this.readFileAsText(file);
            
            // Switch to paste mode and populate with file content
            this.switchInputMode('paste');
            document.getElementById('prd-text-input').value = text;
            
            // Enable start button
            document.getElementById('start-workflow-btn').disabled = false;
            this.updateWorkflowStatus(`✅ File loaded: ${file.name} (${text.length} characters)`);
            
        } catch (error) {
            this.updateWorkflowStatus(`❌ Error reading file: ${error.message}`);
        }
    }

    /**
     * Read file as text
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Set up WebSocket connection for real-time workflow updates
     */
    setupWebSocket() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            this.activeWebSocket = new WebSocket(wsUrl);
            
            this.activeWebSocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                
                if (data.type === 'workflow_progress') {
                    this.updateWorkflowProgress(data.data);
                } else if (data.type === 'workflow_complete') {
                    this.handleWorkflowComplete(data.data);
                } else if (data.type === 'workflow_error') {
                    this.handleWorkflowError(data.data);
                }
            };
            
        } catch (error) {
            console.warn('WebSocket connection failed:', error);
        }
    }

    /**
     * Start workflow execution
     */
    async startWorkflow() {
        try {
            // get PRD content
            const prdContent = this.getPRDContent();
            if (!prdContent || prdContent.length < 50) {
                alert('Please provide a PRD with at least 50 characters.');
                return;
            }

            // Update UI to show workflow is starting
            this.showWorkflowInProgress();
            this.workflowStatus = 'running';
            
            // Make API call to start workflow
            const response = await fetch('/workflows/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prdContent: prdContent,
                    workflowType: 'standard' // sonnet -> opus
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.currentWorkflow = result.workflowId;
                console.log('🚀 Workflow started:', this.currentWorkflow);
            } else {
                throw new Error(result.error || 'Failed to start workflow');
            }
            
        } catch (error) {
            console.error('❌ Workflow start failed:', error);
            this.handleWorkflowError({ error: error.message });
        }
    }

    /**
     * Get PRD content from current input mode
     */
    getPRDContent() {
        const pasteInput = document.getElementById('paste-input');
        if (pasteInput && pasteInput.classList.contains('active')) {
            return document.getElementById('prd-text-input').value.trim();
        }
        
        // File upload mode - content should already be in paste input
        return document.getElementById('prd-text-input').value.trim();
    }

    /**
     * Show workflow in progress UI
     */
    showWorkflowInProgress() {
        document.getElementById('workflow-creator').style.display = 'none';
        document.getElementById('active-workflow').style.display = 'block';
        document.getElementById('workflow-results').style.display = 'none';
        
        // Initialize progress display
        const progressHTML = `
            <div class="progress-step active">
                <div class="progress-spinner"></div>
                <div>
                    <strong>Step 1: Sonnet Analysis</strong>
                    <div style="font-size: 0.9rem; color: var(--text-secondary);">Analyzing PRD and breaking down requirements...</div>
                </div>
            </div>
            <div class="progress-step">
                <div style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">⏳</div>
                <div>
                    <strong>Step 2: Opus Review</strong>
                    <div style="font-size: 0.9rem; color: var(--text-secondary);">Waiting for Sonnet analysis...</div>
                </div>
            </div>
        `;
        
        document.getElementById('workflow-progress').innerHTML = progressHTML;
    }

    /**
     * Update workflow progress display
     */
    updateWorkflowProgress(progressData) {
        // This will be called via WebSocket when the backend sends progress updates
        console.log('📊 Workflow progress:', progressData);
        
        if (progressData.currentStep === 'opus_review') {
            const progressHTML = `
                <div class="progress-step completed">
                    <div style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; color: #10b981;">✅</div>
                    <div>
                        <strong>Step 1: Sonnet Analysis</strong>
                        <div style="font-size: 0.9rem; color: #10b981;">Complete - ${progressData.sonnetTaskCount || 0} tasks identified</div>
                    </div>
                </div>
                <div class="progress-step active">
                    <div class="progress-spinner"></div>
                    <div>
                        <strong>Step 2: Opus Review</strong>
                        <div style="font-size: 0.9rem; color: var(--text-secondary);">Reviewing and finalizing task breakdown...</div>
                    </div>
                </div>
            `;
            
            document.getElementById('workflow-progress').innerHTML = progressHTML;
        }
    }

    /**
     * Handle workflow completion
     */
    async handleWorkflowComplete(resultData) {
        console.log('✅ Workflow complete:', resultData);
        
        // Fetch detailed results from API
        if (this.currentWorkflow) {
            await this.fetchWorkflowResults(this.currentWorkflow);
        } else {
            // Fallback to provided data
            this.displayWorkflowResults(resultData);
        }
    }

    /**
     * Fetch and display workflow results
     */
    async fetchWorkflowResults(workflowId) {
        try {
            const response = await fetch(`/workflows/${workflowId}/results`);
            const resultData = await response.json();
            
            if (resultData.success) {
                this.displayWorkflowResults(resultData);
            } else {
                this.handleWorkflowError({ error: 'Failed to fetch workflow results' });
            }
        } catch (error) {
            console.error('❌ Failed to fetch workflow results:', error);
            this.handleWorkflowError({ error: 'Failed to fetch workflow results' });
        }
    }

    /**
     * Display workflow results
     */
    displayWorkflowResults(resultData) {
        console.log('📊 Workflow results:', resultData);
        
        this.workflowStatus = 'completed';
        
        // Hide progress, show results
        document.getElementById('active-workflow').style.display = 'none';
        document.getElementById('workflow-results').style.display = 'block';
        
        const outputContainer = document.getElementById('workflow-output');
        
        // Format results for display using new API structure
        const resultsHTML = `
            <div class="result-section">
                <h4>📊 Sonnet Analysis</h4>
                <p><strong>Summary:</strong> ${resultData.analysis?.sonnetAnalysis?.summary || 'Analysis completed successfully'}</p>
                <p><strong>Complexity:</strong> ${resultData.analysis?.sonnetAnalysis?.complexity || 'Moderate'}</p>
                <p><strong>Timeline:</strong> ${resultData.analysis?.sonnetAnalysis?.estimatedTimeline || 'TBD'}</p>
                <p><strong>Tasks Identified:</strong> ${resultData.analysis?.sonnetAnalysis?.tasksIdentified || 0}</p>
            </div>
            
            <div class="result-section">
                <h4>📋 Task Breakdown</h4>
                <div class="task-grid" style="display: grid; gap: 0.75rem;">
                    ${(resultData.tasks || []).map(task => `
                        <div class="task-item" style="background: var(--bg-secondary); padding: 0.75rem; border-radius: 6px; border-left: 3px solid ${task.priority === 'High' ? '#ef4444' : task.priority === 'Medium' ? '#f59e0b' : '#10b981'};">
                            <div style="font-weight: 600;">${task.title}</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
                                Priority: ${task.priority} • Estimated: ${task.estimated}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="result-section">
                <h4>✅ Opus Review</h4>
                <p><strong>Summary:</strong> ${resultData.analysis?.opusReview?.summary || 'Review completed'}</p>
                <p><strong>Risk Assessment:</strong> ${resultData.analysis?.opusReview?.riskAssessment || 'TBD'}</p>
                <div><strong>Recommendations:</strong></div>
                <ul class="recommendation-list">
                    ${(resultData.analysis?.opusReview?.recommendations || []).map(rec => 
                        `<li style="margin: 0.25rem 0;">• ${rec}</li>`
                    ).join('')}
                </ul>
            </div>
            
            <div class="result-section">
                <h4>📈 Project Summary</h4>
                <p><strong>Workflow ID:</strong> ${resultData.workflowId}</p>
                <p><strong>Completed At:</strong> ${new Date(resultData.completedAt).toLocaleString()}</p>
                <p style="color: #10b981; font-weight: 600;">✅ Ready for project implementation</p>
            </div>
        `;
        
        outputContainer.innerHTML = resultsHTML;
    }

    /**
     * Handle workflow error
     */
    handleWorkflowError(errorData) {
        console.error('❌ Workflow error:', errorData);
        
        this.workflowStatus = 'error';
        
        // Show error state
        document.getElementById('active-workflow').style.display = 'none';
        document.getElementById('workflow-results').style.display = 'block';
        
        const outputContainer = document.getElementById('workflow-output');
        outputContainer.innerHTML = `
            <div class="result-section" style="border-left: 4px solid #ef4444; padding-left: 1rem;">
                <h4 style="color: #ef4444;">❌ Workflow Error</h4>
                <p>${errorData.error || 'An unexpected error occurred during workflow execution.'}</p>
                <p style="font-size: 0.9rem; color: var(--text-secondary);">Please try again or check the system logs for more details.</p>
            </div>
        `;
    }

    /**
     * Cancel running workflow
     */
    async cancelWorkflow() {
        if (this.currentWorkflow) {
            try {
                await fetch(`/workflows/${this.currentWorkflow}/cancel`, { method: 'POST' });
            } catch (error) {
                console.warn('Failed to cancel workflow:', error);
            }
        }
        
        this.startNewWorkflow();
    }

    /**
     * Start new workflow (reset UI)
     */
    startNewWorkflow() {
        this.currentWorkflow = null;
        this.workflowStatus = 'idle';
        
        // Reset UI
        document.getElementById('workflow-creator').style.display = 'block';
        document.getElementById('active-workflow').style.display = 'none';
        document.getElementById('workflow-results').style.display = 'none';
        
        // Clear inputs
        document.getElementById('prd-text-input').value = '';
        document.getElementById('start-workflow-btn').disabled = true;
        this.updateWorkflowStatus('');
    }

    /**
     * Save workflow results as a project
     */
    async saveWorkflowResults() {
        // TODO: Implement project saving
        alert('Save functionality will be implemented in the next update!');
    }

    /**
     * Update workflow status indicator
     */
    updateWorkflowStatus(message) {
        const indicator = document.getElementById('workflow-status');
        if (indicator) {
            indicator.textContent = message;
        }
    }

    /**
     * Clear input and reset form
     */
    clearInput() {
        document.getElementById('prd-text-input').value = '';
        document.getElementById('start-workflow-btn').disabled = true;
        this.updateWorkflowStatus('');
    }

    /**
     * Reset to new workflow state
     */
    resetToNewWorkflow() {
        this.currentWorkflow = null;
        this.workflowStatus = 'idle';
        
        // Show workflow creator, hide results
        document.getElementById('workflow-creator').style.display = 'block';
        document.getElementById('active-workflow').style.display = 'none';
        document.getElementById('workflow-results').style.display = 'none';
        
        // Clear input
        this.clearInput();
    }

    /**
     * Save workflow results as project
     */
    saveAsProject() {
        // This would integrate with the project management system
        alert('Workflow results saved as project! (Feature coming soon)');
        console.log('💾 Saving workflow results as project');
    }
}

// Global functions for HTML onclick handlers
window.switchInputMode = function(mode) {
    // Update button states
    document.getElementById('paste-mode-btn').classList.toggle('active', mode === 'paste');
    document.getElementById('upload-mode-btn').classList.toggle('active', mode === 'upload');
    
    // Update input mode visibility
    document.getElementById('paste-input').classList.toggle('active', mode === 'paste');
    document.getElementById('upload-input').classList.toggle('active', mode === 'upload');
};

window.startWorkflow = function() {
    if (window.WorkflowManager) {
        window.WorkflowManager.startWorkflow();
    }
};

window.cancelWorkflow = function() {
    if (window.WorkflowManager) {
        window.WorkflowManager.cancelWorkflow();
    }
};

window.startNewWorkflow = function() {
    if (window.WorkflowManager) {
        window.WorkflowManager.startNewWorkflow();
    }
};

window.clearWorkflowInput = function() {
    document.getElementById('prd-text-input').value = '';
    document.getElementById('start-workflow-btn').disabled = true;
    if (window.WorkflowManager) {
        window.WorkflowManager.updateWorkflowStatus('');
    }
};

window.saveWorkflowResults = function() {
    if (window.WorkflowManager) {
        window.WorkflowManager.saveWorkflowResults();
    }
};

// Global instance
window.WorkflowManager = new WorkflowManager();