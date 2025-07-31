/**
 * Frontend Tests - Vanilla JavaScript Testing Suite
 * Multi-Provider AI Demo - Tests for OpenAI GPT-4 Frontend
 */

class FrontendTestSuite {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.results = [];
    }

    /**
     * Add a test case
     */
    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    /**
     * Run all tests
     */
    async runAll() {
        console.log('🧪 Starting Frontend Test Suite');
        console.log('=================================');
        
        this.passed = 0;
        this.failed = 0;
        this.results = [];

        for (const test of this.tests) {
            await this.runTest(test);
        }

        this.printSummary();
        return this.results;
    }

    /**
     * Run individual test
     */
    async runTest(test) {
        const startTime = performance.now();
        
        try {
            await test.testFn();
            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);
            
            console.log(`✅ ${test.name} (${duration}ms)`);
            this.passed++;
            this.results.push({
                name: test.name,
                status: 'passed',
                duration: duration
            });
        } catch (error) {
            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);
            
            console.error(`❌ ${test.name} (${duration}ms)`);
            console.error(`   Error: ${error.message}`);
            this.failed++;
            this.results.push({
                name: test.name,
                status: 'failed',
                duration: duration,
                error: error.message
            });
        }
    }

    /**
     * Print test summary
     */
    printSummary() {
        const total = this.passed + this.failed;
        const passRate = total > 0 ? Math.round((this.passed / total) * 100) : 0;
        
        console.log('\n📊 Test Summary');
        console.log('===============');
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${this.passed}`);
        console.log(`Failed: ${this.failed}`);
        console.log(`Pass Rate: ${passRate}%`);
        
        if (this.failed === 0) {
            console.log('🎉 All tests passed!');
        } else {
            console.log(`⚠️ ${this.failed} test(s) failed`);
        }
    }

    /**
     * Assert helper
     */
    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }

    /**
     * Assert equal helper
     */
    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    }

    /**
     * Assert not null helper
     */
    assertNotNull(value, message) {
        if (value === null || value === undefined) {
            throw new Error(message || 'Value should not be null');
        }
    }
}

// Initialize test suite
const testSuite = new FrontendTestSuite();

// DOM Structure Tests
testSuite.test('HTML Structure - Form Elements Exist', () => {
    const form = document.getElementById('todo-form');
    const input = document.getElementById('todo-input');
    const submitButton = form.querySelector('.add-button');
    
    testSuite.assertNotNull(form, 'Todo form should exist');
    testSuite.assertNotNull(input, 'Todo input should exist');
    testSuite.assertNotNull(submitButton, 'Submit button should exist');
    testSuite.assertEqual(form.tagName.toLowerCase(), 'form', 'Form element should be a form tag');
    testSuite.assertEqual(input.type, 'text', 'Input should be text type');
});

testSuite.test('HTML Structure - List Container Exists', () => {
    const todosList = document.getElementById('todos-list');
    const emptyState = document.getElementById('empty-state');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    testSuite.assertNotNull(todosList, 'Todos list should exist');
    testSuite.assertNotNull(emptyState, 'Empty state should exist');
    testSuite.assertNotNull(loadingIndicator, 'Loading indicator should exist');
    testSuite.assertEqual(todosList.tagName.toLowerCase(), 'ul', 'Todos list should be a ul element');
});

testSuite.test('HTML Structure - Statistics Elements Exist', () => {
    const totalCount = document.getElementById('total-count');
    const pendingCount = document.getElementById('pending-count');
    
    testSuite.assertNotNull(totalCount, 'Total count element should exist');
    testSuite.assertNotNull(pendingCount, 'Pending count element should exist');
});

testSuite.test('HTML Structure - Template Exists', () => {
    const template = document.getElementById('todo-item-template');
    
    testSuite.assertNotNull(template, 'Todo item template should exist');
    testSuite.assertEqual(template.tagName.toLowerCase(), 'template', 'Should be a template element');
    
    const content = template.content;
    const todoItem = content.querySelector('.todo-item');
    const toggleButton = content.querySelector('.todo-toggle');
    const deleteButton = content.querySelector('.delete-button');
    
    testSuite.assertNotNull(todoItem, 'Template should contain todo item');
    testSuite.assertNotNull(toggleButton, 'Template should contain toggle button');
    testSuite.assertNotNull(deleteButton, 'Template should contain delete button');
});

// CSS Styling Tests
testSuite.test('CSS Styling - Core Styles Applied', () => {
    const container = document.querySelector('.container');
    const header = document.querySelector('.header');
    const input = document.getElementById('todo-input');
    
    const containerStyles = window.getComputedStyle(container);
    const headerStyles = window.getComputedStyle(header);
    const inputStyles = window.getComputedStyle(input);
    
    testSuite.assert(parseInt(containerStyles.maxWidth) > 0, 'Container should have max-width');
    testSuite.assert(headerStyles.padding !== '0px', 'Header should have padding');
    testSuite.assert(inputStyles.padding !== '0px', 'Input should have padding');
});

testSuite.test('CSS Styling - Responsive Viewport Meta Tag', () => {
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    
    testSuite.assertNotNull(viewportMeta, 'Viewport meta tag should exist');
    testSuite.assert(
        viewportMeta.content.includes('width=device-width'),
        'Viewport should include device-width'
    );
});

// JavaScript Functionality Tests
testSuite.test('JavaScript - TodoApp Class Exists', () => {
    testSuite.assert(typeof TodoApp === 'function', 'TodoApp class should be defined');
    testSuite.assert(window.todoApp instanceof TodoApp, 'TodoApp instance should exist');
});

testSuite.test('JavaScript - App Properties Initialized', () => {
    const app = window.todoApp;
    
    testSuite.assertNotNull(app.form, 'Form reference should be initialized');
    testSuite.assertNotNull(app.input, 'Input reference should be initialized');
    testSuite.assertNotNull(app.todosList, 'Todos list reference should be initialized');
    testSuite.assert(Array.isArray(app.todos), 'Todos should be an array');
    testSuite.assert(typeof app.baseUrl === 'string', 'Base URL should be a string');
});

testSuite.test('JavaScript - Event Listeners Bound', () => {
    const form = document.getElementById('todo-form');
    const input = document.getElementById('todo-input');
    
    // Test form submission prevention
    let formSubmitted = false;
    const originalSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = () => { formSubmitted = true; };
    
    // Trigger form events
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);
    
    testSuite.assert(submitEvent.defaultPrevented, 'Form submission should be prevented');
    
    // Restore original submit
    HTMLFormElement.prototype.submit = originalSubmit;
});

testSuite.test('JavaScript - Input Validation', () => {
    const app = window.todoApp;
    const input = app.input;
    const submitButton = app.form.querySelector('.add-button');
    
    // Test empty input
    input.value = '';
    app.validateInput();
    testSuite.assert(submitButton.disabled, 'Submit button should be disabled for empty input');
    
    // Test non-empty input
    input.value = 'Test todo';
    app.validateInput();
    testSuite.assert(!submitButton.disabled, 'Submit button should be enabled for non-empty input');
    
    // Clean up
    input.value = '';
});

// API Integration Tests
testSuite.test('JavaScript - API Request Method Exists', () => {
    const app = window.todoApp;
    
    testSuite.assert(typeof app.makeApiRequest === 'function', 'makeApiRequest method should exist');
    testSuite.assert(typeof app.testApiConnection === 'function', 'testApiConnection method should exist');
});

testSuite.test('JavaScript - CRUD Methods Exist', () => {
    const app = window.todoApp;
    
    testSuite.assert(typeof app.loadTodos === 'function', 'loadTodos method should exist');
    testSuite.assert(typeof app.handleAddTodo === 'function', 'handleAddTodo method should exist');
    testSuite.assert(typeof app.toggleTodo === 'function', 'toggleTodo method should exist');
    testSuite.assert(typeof app.deleteTodo === 'function', 'deleteTodo method should exist');
});

// UI State Management Tests
testSuite.test('JavaScript - UI State Methods Exist', () => {
    const app = window.todoApp;
    
    testSuite.assert(typeof app.renderTodos === 'function', 'renderTodos method should exist');
    testSuite.assert(typeof app.showLoading === 'function', 'showLoading method should exist');
    testSuite.assert(typeof app.hideLoading === 'function', 'hideLoading method should exist');
    testSuite.assert(typeof app.showError === 'function', 'showError method should exist');
    testSuite.assert(typeof app.hideError === 'function', 'hideError method should exist');
});

testSuite.test('JavaScript - Loading State Toggle', () => {
    const app = window.todoApp;
    const loadingIndicator = app.loadingIndicator;
    
    // Test show loading
    app.showLoading();
    testSuite.assert(!loadingIndicator.classList.contains('hidden'), 'Loading should be visible');
    
    // Test hide loading
    app.hideLoading();
    testSuite.assert(loadingIndicator.classList.contains('hidden'), 'Loading should be hidden');
});

testSuite.test('JavaScript - Error State Toggle', () => {
    const app = window.todoApp;
    const errorMessage = app.errorMessage;
    
    // Test show error
    app.showError('Test error message');
    testSuite.assert(!errorMessage.classList.contains('hidden'), 'Error should be visible');
    
    const errorText = errorMessage.querySelector('.error-text');
    testSuite.assertEqual(errorText.textContent, 'Test error message', 'Error text should be set');
    
    // Test hide error
    app.hideError();
    testSuite.assert(errorMessage.classList.contains('hidden'), 'Error should be hidden');
});

// Todo Rendering Tests
testSuite.test('JavaScript - Empty State Display', () => {
    const app = window.todoApp;
    const emptyState = app.emptyState;
    const todosList = app.todosList;
    
    // Set empty todos and render
    app.todos = [];
    app.renderTodos();
    
    testSuite.assert(!emptyState.classList.contains('hidden'), 'Empty state should be visible');
    testSuite.assert(todosList.classList.contains('hidden'), 'Todos list should be hidden');
});

testSuite.test('JavaScript - Todo Item Creation', () => {
    const app = window.todoApp;
    
    const testTodo = {
        id: 'test-123',
        text: 'Test todo item',
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    const todoElement = app.createTodoElement(testTodo);
    
    testSuite.assertNotNull(todoElement, 'Todo element should be created');
    
    const todoItem = todoElement.querySelector('.todo-item');
    const todoText = todoElement.querySelector('.todo-text');
    
    testSuite.assertNotNull(todoItem, 'Todo item container should exist');
    testSuite.assertEqual(todoItem.getAttribute('data-todo-id'), 'test-123', 'Todo ID should be set');
    testSuite.assertEqual(todoText.textContent, 'Test todo item', 'Todo text should be set');
});

testSuite.test('JavaScript - Statistics Update', () => {
    const app = window.todoApp;
    
    // Test with sample todos
    app.todos = [
        { id: '1', text: 'Todo 1', completed: false },
        { id: '2', text: 'Todo 2', completed: true },
        { id: '3', text: 'Todo 3', completed: false }
    ];
    
    app.updateStats();
    
    const totalCount = app.totalCount.textContent;
    const pendingCount = app.pendingCount.textContent;
    
    testSuite.assertEqual(totalCount, '3 total', 'Total count should be correct');
    testSuite.assertEqual(pendingCount, '2 pending', 'Pending count should be correct');
    
    // Clean up
    app.todos = [];
    app.updateStats();
});

// Utility Functions Tests
testSuite.test('JavaScript - Date Formatting', () => {
    const app = window.todoApp;
    
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    
    testSuite.assert(app.formatDate(now).includes('just now') || app.formatDate(now).includes('ago'), 'Recent date should be formatted relatively');
    testSuite.assert(app.formatDate(fiveMinutesAgo).includes('m ago'), 'Minutes ago should be formatted correctly');
    testSuite.assert(app.formatDate(twoHoursAgo).includes('h ago'), 'Hours ago should be formatted correctly');
    testSuite.assert(app.formatDate(threeDaysAgo).includes('d ago'), 'Days ago should be formatted correctly');
});

// Accessibility Tests
testSuite.test('Accessibility - ARIA Labels Present', () => {
    const form = document.getElementById('todo-form');
    const input = document.getElementById('todo-input');
    const todosList = document.getElementById('todos-list');
    
    testSuite.assertNotNull(form.getAttribute('aria-label'), 'Form should have aria-label');
    testSuite.assertNotNull(input.getAttribute('aria-label'), 'Input should have aria-label');
    testSuite.assertEqual(todosList.getAttribute('role'), 'list', 'Todos list should have role="list"');
});

testSuite.test('Accessibility - Error Message ARIA', () => {
    const errorMessage = document.getElementById('error-message');
    
    testSuite.assertEqual(errorMessage.getAttribute('role'), 'alert', 'Error message should have role="alert"');
});

// Performance Tests
testSuite.test('Performance - Critical Resources Loaded', () => {
    const styles = document.querySelector('link[href="styles.css"]');
    testSuite.assertNotNull(styles, 'CSS file should be linked');
    
    testSuite.assert(typeof TodoApp === 'function', 'JavaScript should be loaded and parsed');
});

// Export test suite for external running
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FrontendTestSuite;
}

// Auto-run tests if not in Node.js environment and page is loaded
if (typeof window !== 'undefined' && document.readyState === 'complete') {
    // Delay to ensure TodoApp is initialized
    setTimeout(() => {
        console.log('📝 Frontend Tests - Ready to run');
        console.log('Call testSuite.runAll() to execute all tests');
    }, 1000);
}