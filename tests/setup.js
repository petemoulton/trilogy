// Jest setup file
require('dotenv').config({ path: '.env.test' });

// Global test timeout
jest.setTimeout(30000);

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test utilities
global.testUtils = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  mockAgent: {
    id: 'test-agent-123',
    name: 'test-agent',
    status: 'active',
    lastActivity: new Date().toISOString()
  },
  mockTask: {
    id: 'TASK-001',
    title: 'Test Task',
    description: 'Test task description',
    priority: 'HIGH',
    complexity: 'MEDIUM',
    status: 'PENDING',
    category: 'Testing',
    estimatedHours: 4,
    dependencies: [],
    blockers: []
  }
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Setup and teardown for integration tests
beforeAll(async () => {
  // Any global setup needed for tests
});

afterAll(async () => {
  // Any global cleanup needed for tests
});
