/**
 * Workflow Manager - Handles PRD workflow creation and execution
 */

class WorkflowManager {
    constructor() {
        this.currentWorkflow = null;
        this.workflowStatus = 'idle'; // idle, running, completed, error
        this.activeWebSocket = null;
        this.initialized = false;
    }

    /**
     * Initialize workflow manager
     */
    initialize() {
        if (this.initialized) {
            console.log('⚠️ WorkflowManager: Already initialized, skipping...');
            return;
        }
        
        console.log('🔄 WorkflowManager: Initializing...');
        
        // Set up input validation
        this.setupInputValidation();
        
        // Set up file drop functionality
        this.setupFileDropZone();
        
        // Set up WebSocket for real-time updates
        this.setupWebSocket();
        
        this.initialized = true;
        console.log('✅ WorkflowManager: Initialization complete');
    }

    /**
     * Set up input validation for enabling/disabling start button
     */
    setupInputValidation() {
        const textInput = document.getElementById('prd-text-input');
        const startBtn = document.getElementById('start-workflow-btn');
        const analyzeBtn = document.getElementById('analyze-prd-btn');
        
        if (textInput && startBtn && analyzeBtn) {
            textInput.addEventListener('input', () => {
                const hasContent = textInput.value.trim().length > 20; // Minimum 20 chars for analysis
                const hasEnoughForWorkflow = textInput.value.trim().length > 50; // Minimum 50 chars for workflow
                
                analyzeBtn.disabled = !hasContent;
                startBtn.disabled = !hasEnoughForWorkflow;
                
                if (hasEnoughForWorkflow) {
                    this.updateWorkflowStatus('✅ Ready to analyze PRD or start workflow');
                } else if (hasContent) {
                    this.updateWorkflowStatus('📝 Ready to analyze PRD (more content needed for workflow)');
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
        
        console.log('🔧 Setting up file drop zone...', { dropZone: !!dropZone, fileInput: !!fileInput });
        
        if (!dropZone) {
            console.warn('❌ Drop zone element not found! ID: file-drop-zone');
            return;
        }
        
        if (!fileInput) {
            console.warn('❌ File input element not found! ID: file-input');
            return;
        }
        
        if (dropZone && fileInput) {
            // Click to browse
            dropZone.addEventListener('click', () => {
                console.log('📁 Drop zone clicked, triggering file input...');
                fileInput.click();
            });
            
            // File selection
            fileInput.addEventListener('change', (e) => {
                console.log('📄 File input changed:', e.target.files);
                const file = e.target.files[0];
                if (file) {
                    console.log('📁 File selected:', file.name, file.type, file.size);
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
            // Validate file type (only .md and .txt files)
            const validTypes = ['.txt', '.md'];
            const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
            
            if (!validTypes.includes(fileExtension)) {
                this.updateWorkflowStatus(`❌ Invalid file type. Please upload .md or .txt files only.`);
                return;
            }
            
            // Check file size (max 5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                this.updateWorkflowStatus(`❌ File too large. Maximum size is 5MB.`);
                return;
            }
            
            this.updateWorkflowStatus('📁 Processing file...');
            
            const text = await this.readFileAsText(file);
            
            // Validate content length
            if (text.trim().length < 20) {
                this.updateWorkflowStatus(`❌ File content too short. Please provide at least 20 characters.`);
                return;
            }
            
            // Switch to paste mode and populate with file content
            this.switchInputMode('paste');
            document.getElementById('prd-text-input').value = text;
            
            // Enable start button
            document.getElementById('start-workflow-btn').disabled = false;
            this.updateWorkflowStatus(`✅ File loaded: ${file.name} (${text.length} characters)`);
            
            // Add visual feedback
            this.showUploadSuccess(file.name, text.length);
            
        } catch (error) {
            this.updateWorkflowStatus(`❌ Error reading file: ${error.message}`);
        }
    }

    /**
     * Show upload success feedback
     */
    showUploadSuccess(fileName, textLength) {
        const dropZone = document.getElementById('file-drop-zone');
        if (dropZone) {
            // Temporarily change the drop zone appearance
            dropZone.style.background = '#dcfce7';
            dropZone.style.borderColor = '#10b981';
            
            // Reset after 2 seconds
            setTimeout(() => {
                dropZone.style.background = 'var(--bg-primary)';
                dropZone.style.borderColor = 'var(--border-color)';
            }, 2000);
        }
        
        // Show a notification
        this.showNotification(`📁 ${fileName} uploaded successfully (${textLength} characters)`, 'success');
    }
    
    /**
     * Show notification message
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            animation: slideInFromRight 0.3s ease;
            max-width: 350px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;
        
        switch(type) {
            case 'success':
                notification.style.background = '#10b981';
                break;
            case 'error':
                notification.style.background = '#dc2626';
                break;
            case 'info':
            default:
                notification.style.background = '#3b82f6';
                break;
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
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
     * Switch between input modes (paste/upload)
     */
    switchInputMode(mode) {
        console.log('🔄 Switching input mode to:', mode);
        
        // Update button states
        const pasteBtn = document.getElementById('paste-mode-btn');
        const uploadBtn = document.getElementById('upload-mode-btn');
        
        if (pasteBtn && uploadBtn) {
            pasteBtn.classList.toggle('active', mode === 'paste');
            uploadBtn.classList.toggle('active', mode === 'upload');
        }
        
        // Update input mode visibility
        const pasteInput = document.getElementById('paste-input');
        const uploadInput = document.getElementById('upload-input');
        
        if (pasteInput && uploadInput) {
            pasteInput.classList.toggle('active', mode === 'paste');
            uploadInput.classList.toggle('active', mode === 'upload');
        }
        
        console.log('✅ Input mode switched to:', mode);
    }

    /**
     * Analyze PRD content to determine agent requirements
     */
    async analyzePRD() {
        try {
            const prdContent = this.getPRDContent();
            if (!prdContent || prdContent.trim().length < 20) {
                this.showNotification('❌ Please provide at least 20 characters of PRD content', 'error');
                return;
            }

            console.log('🧠 Starting PRD analysis...');
            this.updateWorkflowStatus('🔍 Opus agent analyzing PRD...');
            
            // Show loading state
            this.showAnalysisLoading();

            const response = await fetch('/api/analyze-prd', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prdContent: prdContent
                })
            });

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ PRD analysis complete:', result.analysis);
                this.displayAnalysisResults(result.analysis);
                this.updateWorkflowStatus('✅ Analysis complete! Ready to start workflow.');
                this.showNotification('🧠 PRD analysis completed successfully', 'success');
            } else {
                throw new Error(result.error || 'Analysis failed');
            }
            
        } catch (error) {
            console.error('❌ PRD analysis failed:', error);
            this.updateWorkflowStatus('❌ Analysis failed');
            this.showNotification(`❌ Analysis failed: ${error.message}`, 'error');
            this.hideAnalysisResults();
        }
    }

    /**
     * Show loading state for analysis
     */
    showAnalysisLoading() {
        const resultsDiv = document.getElementById('prd-analysis-results');
        const outputDiv = document.getElementById('analysis-output');
        
        if (resultsDiv && outputDiv) {
            resultsDiv.style.display = 'block';
            outputDiv.innerHTML = `
                <div class="analysis-loading" style="text-align: center; padding: 2rem;">
                    <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #1e293b; border-top: 4px solid #7c3aed; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                    <p style="color: #e2e8f0;">🧠 Opus agent analyzing your PRD...</p>
                    <p style="color: #94a3b8; font-size: 0.9rem;">Estimating complexity and required Sonnet agents</p>
                </div>
            `;
        }
    }

    /**
     * Display PRD analysis results
     */
    displayAnalysisResults(analysis) {
        const resultsDiv = document.getElementById('prd-analysis-results');
        const outputDiv = document.getElementById('analysis-output');
        
        if (!resultsDiv || !outputDiv) return;

        resultsDiv.style.display = 'block';
        
        const { projectAnalysis, agentEstimation, detectedFeatures, recommendations } = analysis;
        
        const resultsHTML = `
            <div class="analysis-summary" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div class="analysis-stat" style="background: #1e293b; padding: 1rem; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #7c3aed;">${agentEstimation.totalSonnetAgents}</div>
                    <div style="color: #e2e8f0; font-size: 0.9rem;">Sonnet Agents</div>
                </div>
                <div class="analysis-stat" style="background: #1e293b; padding: 1rem; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #f59e0b;">1</div>
                    <div style="color: #e2e8f0; font-size: 0.9rem;">Opus Agent (Lead)</div>
                </div>
                <div class="analysis-stat" style="background: #1e293b; padding: 1rem; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #10b981;">${projectAnalysis.estimatedDuration}</div>
                    <div style="color: #e2e8f0; font-size: 0.9rem;">Est. Duration</div>
                </div>
                <div class="analysis-stat" style="background: #1e293b; padding: 1rem; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #3b82f6;">${projectAnalysis.projectSize}</div>
                    <div style="color: #e2e8f0; font-size: 0.9rem;">Project Size</div>
                </div>
            </div>

            <div class="analysis-details" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
                <div class="analysis-section" style="background: #1e293b; padding: 1.5rem; border-radius: 8px;">
                    <h4 style="color: #e2e8f0; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        🎯 Agent Breakdown
                    </h4>
                    <div class="agent-list">
                        ${agentEstimation.agentBreakdown.map(agent => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #374151;">
                                <div>
                                    <div style="color: #e2e8f0; font-weight: 500;">${agent.specialty}</div>
                                    <div style="color: #94a3b8; font-size: 0.8rem;">${agent.reason}</div>
                                </div>
                                <div style="background: #7c3aed; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: bold;">
                                    ${agent.agents}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="analysis-section" style="background: #1e293b; padding: 1.5rem; border-radius: 8px;">
                    <h4 style="color: #e2e8f0; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        🔍 Detected Features
                    </h4>
                    <div class="features-list" style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${detectedFeatures.map(feature => `
                            <span style="background: #059669; color: white; padding: 0.25rem 0.75rem; border-radius: 16px; font-size: 0.8rem; text-transform: capitalize;">
                                ${feature.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="analysis-recommendations" style="background: #1e293b; padding: 1.5rem; border-radius: 8px; margin-top: 1.5rem;">
                <h4 style="color: #e2e8f0; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    💡 Recommendations
                </h4>
                <ul style="color: #e2e8f0; margin: 0; padding-left: 1.5rem;">
                    ${recommendations.map(rec => `<li style="margin-bottom: 0.5rem;">${rec}</li>`).join('')}
                </ul>
            </div>

            <div class="analysis-actions" style="margin-top: 1.5rem; text-align: center;">
                <button onclick="startWorkflow()" class="primary-btn" style="background: #059669;">
                    🚀 Deploy ${agentEstimation.totalSonnetAgents} Sonnet Agents & Start Workflow
                </button>
            </div>
        `;
        
        outputDiv.innerHTML = resultsHTML;
    }

    /**
     * Hide analysis results
     */
    hideAnalysisResults() {
        const resultsDiv = document.getElementById('prd-analysis-results');
        if (resultsDiv) {
            resultsDiv.style.display = 'none';
        }
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
    if (window.WorkflowManager && window.WorkflowManager.switchInputMode) {
        window.WorkflowManager.switchInputMode(mode);
    } else {
        // Fallback if WorkflowManager is not available
        console.warn('⚠️ WorkflowManager not available, using fallback switchInputMode');
        document.getElementById('paste-mode-btn')?.classList.toggle('active', mode === 'paste');
        document.getElementById('upload-mode-btn')?.classList.toggle('active', mode === 'upload');
        document.getElementById('paste-input')?.classList.toggle('active', mode === 'paste');
        document.getElementById('upload-input')?.classList.toggle('active', mode === 'upload');
    }
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

window.analyzePRD = function() {
    if (window.WorkflowManager) {
        window.WorkflowManager.analyzePRD();
    }
};

// Global instance
window.WorkflowManager = new WorkflowManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Content Loaded - initializing WorkflowManager');
    if (window.WorkflowManager) {
        window.WorkflowManager.initialize();
    }
});

// Fallback initialization in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
    // Document is still loading, DOMContentLoaded will fire
    console.log('📄 Document still loading, waiting for DOMContentLoaded');
} else {
    // Document is already loaded
    console.log('📄 Document already loaded, initializing WorkflowManager immediately');
    if (window.WorkflowManager) {
        window.WorkflowManager.initialize();
    }
}