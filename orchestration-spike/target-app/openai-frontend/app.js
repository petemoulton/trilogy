/**
 * Todo List Application - Frontend JavaScript
 * Multi-Provider AI Demo - Frontend by OpenAI GPT-4 (Orchestrated by Claude Opus)
 */

class TodoApp {
    constructor() {
        this.todos = [];
        this.baseUrl = 'http://localhost:3001/api';
        
        // DOM elements
        this.form = document.getElementById('todo-form');
        this.input = document.getElementById('todo-input');
        this.todosList = document.getElementById('todos-list');
        this.emptyState = document.getElementById('empty-state');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.errorMessage = document.getElementById('error-message');
        this.totalCount = document.getElementById('total-count');
        this.pendingCount = document.getElementById('pending-count');
        
        // Template
        this.todoTemplate = document.getElementById('todo-item-template');
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        console.log('🚀 Todo App initializing...');
        this.bindEvents();
        this.loadTodos();
        
        // Test API connection
        this.testApiConnection();
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddTodo();
        });

        // Error message dismissal
        const errorDismiss = this.errorMessage.querySelector('.error-dismiss');
        errorDismiss.addEventListener('click', () => {
            this.hideError();
        });

        // Input validation
        this.input.addEventListener('input', () => {
            this.validateInput();
        });
    }

    /**
     * Validate input field
     */
    validateInput() {
        const value = this.input.value.trim();
        const submitButton = this.form.querySelector('.add-button');
        
        if (value.length === 0) {
            submitButton.disabled = true;
            submitButton.style.opacity = '0.6';
        } else {
            submitButton.disabled = false;
            submitButton.style.opacity = '1';
        }
    }

    /**
     * Test API connection
     */
    async testApiConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            if (response.ok) {
                console.log('✅ API connection successful');
            } else {
                console.warn('⚠️ API health check failed');
                this.showError('Backend API is not responding. Some features may not work.');
            }
        } catch (error) {
            console.warn('⚠️ API connection failed:', error.message);
            // Don't show error immediately - wait for user interaction
        }
    }

    /**
     * Load todos from API
     */
    async loadTodos() {
        this.showLoading();
        
        try {
            const response = await this.makeApiRequest('/todos', 'GET');
            
            if (response.success) {
                this.todos = response.data || [];
                this.renderTodos();
                console.log(`📋 Loaded ${this.todos.length} todos`);
            } else {
                throw new Error(response.error || 'Failed to load todos');
            }
        } catch (error) {
            console.error('❌ Failed to load todos:', error.message);
            this.showError('Failed to load todos. Please refresh the page.');
            this.todos = [];
            this.renderTodos();
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Add new todo
     */
    async handleAddTodo() {
        const text = this.input.value.trim();
        
        if (!text) {
            this.input.focus();
            return;
        }

        // Optimistic UI update
        const tempTodo = {
            id: `temp-${Date.now()}`,
            text,
            completed: false,
            createdAt: new Date().toISOString(),
            isTemporary: true
        };

        this.todos.push(tempTodo);
        this.renderTodos();
        this.input.value = '';
        this.validateInput();

        try {
            const response = await this.makeApiRequest('/todos', 'POST', {
                text: text
            });

            if (response.success && response.data) {
                // Replace temporary todo with real one
                const index = this.todos.findIndex(t => t.id === tempTodo.id);
                if (index !== -1) {
                    this.todos[index] = response.data;
                    this.renderTodos();
                }
                console.log('✅ Todo added successfully');
            } else {
                throw new Error(response.error || 'Failed to add todo');
            }
        } catch (error) {
            console.error('❌ Failed to add todo:', error.message);
            
            // Remove temporary todo
            this.todos = this.todos.filter(t => t.id !== tempTodo.id);
            this.renderTodos();
            
            this.showError('Failed to add todo. Please try again.');
            this.input.value = text; // Restore input
            this.input.focus();
        }
    }

    /**
     * Toggle todo completion
     */
    async toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        // Optimistic UI update
        const originalCompleted = todo.completed;
        todo.completed = !todo.completed;
        this.renderTodos();

        try {
            const response = await this.makeApiRequest(`/todos/${id}`, 'PUT', {
                completed: todo.completed
            });

            if (response.success && response.data) {
                // Update with server response
                const index = this.todos.findIndex(t => t.id === id);
                if (index !== -1) {
                    this.todos[index] = response.data;
                    this.renderTodos();
                }
                console.log(`✅ Todo ${todo.completed ? 'completed' : 'uncompleted'}`);
            } else {
                throw new Error(response.error || 'Failed to update todo');
            }
        } catch (error) {
            console.error('❌ Failed to toggle todo:', error.message);
            
            // Revert optimistic update
            todo.completed = originalCompleted;
            this.renderTodos();
            
            this.showError('Failed to update todo. Please try again.');
        }
    }

    /**
     * Delete todo
     */
    async deleteTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        // Optimistic UI update
        const originalTodos = [...this.todos];
        this.todos = this.todos.filter(t => t.id !== id);
        this.renderTodos();

        try {
            const response = await this.makeApiRequest(`/todos/${id}`, 'DELETE');

            if (response.success) {
                console.log('✅ Todo deleted successfully');
            } else {
                throw new Error(response.error || 'Failed to delete todo');
            }
        } catch (error) {
            console.error('❌ Failed to delete todo:', error.message);
            
            // Revert optimistic update
            this.todos = originalTodos;
            this.renderTodos();
            
            this.showError('Failed to delete todo. Please try again.');
        }
    }

    /**
     * Make API request with error handling
     */
    async makeApiRequest(endpoint, method = 'GET', body = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            // Handle network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Unable to connect to server. Please check your connection.');
            }
            throw error;
        }
    }

    /**
     * Render todos list
     */
    renderTodos() {
        // Clear existing todos
        this.todosList.innerHTML = '';

        if (this.todos.length === 0) {
            this.emptyState.classList.remove('hidden');
            this.todosList.classList.add('hidden');
        } else {
            this.emptyState.classList.add('hidden');
            this.todosList.classList.remove('hidden');

            // Render each todo
            this.todos.forEach(todo => {
                const todoElement = this.createTodoElement(todo);
                this.todosList.appendChild(todoElement);
            });
        }

        this.updateStats();
    }

    /**
     * Create todo DOM element
     */
    createTodoElement(todo) {
        const template = this.todoTemplate.content.cloneNode(true);
        const todoItem = template.querySelector('.todo-item');
        
        // Set data attributes
        todoItem.setAttribute('data-todo-id', todo.id);
        
        // Set completed state
        if (todo.completed) {
            todoItem.classList.add('completed');
        }

        // Set temporary state (visual indicator)
        if (todo.isTemporary) {
            todoItem.style.opacity = '0.7';
            todoItem.querySelector('.todo-toggle').disabled = true;
        }

        // Fill content
        const todoText = template.querySelector('.todo-text');
        const todoDate = template.querySelector('.todo-date');
        const toggleButton = template.querySelector('.todo-toggle');
        const deleteButton = template.querySelector('.delete-button');

        todoText.textContent = todo.text;
        
        // Format date
        if (todo.createdAt) {
            const date = new Date(todo.createdAt);
            todoDate.textContent = this.formatDate(date);
        }

        // Bind events
        toggleButton.addEventListener('click', () => {
            if (!todo.isTemporary) {
                this.toggleTodo(todo.id);
            }
        });

        deleteButton.addEventListener('click', () => {
            if (!todo.isTemporary) {
                this.deleteTodo(todo.id);
            }
        });

        return template;
    }

    /**
     * Format date for display
     */
    formatDate(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }

    /**
     * Update statistics
     */
    updateStats() {
        const total = this.todos.length;
        const pending = this.todos.filter(t => !t.completed).length;

        this.totalCount.textContent = `${total} total`;
        this.pendingCount.textContent = `${pending} pending`;
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.loadingIndicator.classList.remove('hidden');
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.loadingIndicator.classList.add('hidden');
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorText = this.errorMessage.querySelector('.error-text');
        errorText.textContent = message;
        this.errorMessage.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    /**
     * Hide error message
     */
    hideError() {
        this.errorMessage.classList.add('hidden');
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Multi-Provider Todo App Starting...');
    console.log('Frontend: OpenAI GPT-4 (via Claude Opus Orchestration)');
    console.log('Backend: Google Gemini (Pending)');
    console.log('QA: OpenAI GPT-3.5 (Pending)');
    
    window.todoApp = new TodoApp();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TodoApp;
}