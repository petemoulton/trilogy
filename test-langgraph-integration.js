/**
 * LangGraph Integration Test Suite
 * 
 * Comprehensive testing of LangGraph PostgreSQL checkpointer integration
 * with the Trilogy AI System. Tests fault tolerance, state persistence,
 * human approval workflow, and time travel capabilities.
 */

const TrilogyLangGraphCheckpointer = require('./src/shared/coordination/langgraph-checkpointer');
const LangGraphAgentWrapper = require('./src/shared/agents/langgraph-agent-wrapper');

// Mock agent for testing
class MockAgent {
  constructor(name = 'TestAgent') {
    this.name = name;
    this.executionCount = 0;
    this.shouldFail = false;
    this.failureCount = 0;
  }

  async process(data) {
    this.executionCount++;
    
    if (this.shouldFail && this.failureCount < 2) {
      this.failureCount++;
      throw new Error(`Mock failure ${this.failureCount}`);
    }
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      result: `Processed: ${data.input}`,
      executionCount: this.executionCount,
      timestamp: new Date().toISOString()
    };
  }

  async performComplexTask(input) {
    return this.process({ input, type: 'complex' });
  }
}

// Test configuration
const testConfig = {
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'trilogy',
    user: process.env.POSTGRES_USER || 'trilogy',
    password: process.env.POSTGRES_PASSWORD || 'trilogy123'
  }
};

class LangGraphIntegrationTest {
  constructor() {
    this.testResults = [];
    this.checkpointer = null;
    this.testThreads = [];
  }

  async runAllTests() {
    console.log('🧪 Starting LangGraph Integration Test Suite...\n');
    
    try {
      await this.setupTestEnvironment();
      
      // Run test categories
      await this.testCheckpointerInitialization();
      await this.testThreadManagement();
      await this.testAgentWrapping();
      await this.testFaultTolerance();
      await this.testHumanApprovalWorkflow();
      await this.testTimeTravelDebugging();
      await this.testPerformanceMetrics();
      
      await this.cleanupTestEnvironment();
      
      this.printTestSummary();
      
    } catch (error) {
      console.error('❌ Test suite failed to complete:', error);
      this.testResults.push({
        category: 'Test Suite',
        test: 'Overall Execution',
        status: 'FAILED',
        error: error.message
      });
    }
  }

  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');
    
    this.checkpointer = new TrilogyLangGraphCheckpointer(testConfig.postgres, {
      enableTimeTravel: true,
      enableHumanApproval: true,
      maxConnections: 3,
      cleanupInterval: 60000 // 1 minute for testing
    });
    
    const initialized = await this.checkpointer.initialize();
    if (!initialized) {
      throw new Error('Failed to initialize checkpointer for testing');
    }
    
    console.log('✅ Test environment ready\n');
  }

  async cleanupTestEnvironment() {
    console.log('🧹 Cleaning up test environment...');
    
    // Clean up test threads
    for (const threadId of this.testThreads) {
      try {
        await this.checkpointer.cleanup();
      } catch (error) {
        console.warn(`Warning: Failed to cleanup thread ${threadId}`);
      }
    }
    
    if (this.checkpointer) {
      await this.checkpointer.close();
    }
    
    console.log('✅ Cleanup complete\n');
  }

  async testCheckpointerInitialization() {
    console.log('📋 Testing Checkpointer Initialization...');
    
    try {
      // Test 1: Initialization success
      const isInitialized = this.checkpointer.isInitialized;
      this.recordTest('Checkpointer Initialization', 'Initialization Status', 
        isInitialized ? 'PASSED' : 'FAILED', 
        isInitialized ? null : 'Checkpointer not initialized');
      
      // Test 2: Database connection
      const stats = await this.checkpointer.getThreadStats();
      this.recordTest('Checkpointer Initialization', 'Database Connection',
        stats ? 'PASSED' : 'FAILED',
        stats ? null : 'Failed to get thread stats');
      
      // Test 3: Checkpointer instance access
      const rawCheckpointer = this.checkpointer.getCheckpointer();
      this.recordTest('Checkpointer Initialization', 'Raw Checkpointer Access',
        rawCheckpointer ? 'PASSED' : 'FAILED',
        rawCheckpointer ? null : 'Raw checkpointer not accessible');
      
    } catch (error) {
      this.recordTest('Checkpointer Initialization', 'Exception Handling', 'FAILED', error.message);
    }
    
    console.log('✅ Checkpointer initialization tests complete\n');
  }

  async testThreadManagement() {
    console.log('🧵 Testing Thread Management...');
    
    try {
      // Test 1: Create thread
      const thread = await this.checkpointer.createThread({
        namespace: 'test',
        metadata: { testType: 'integration', timestamp: Date.now() }
      });
      
      this.testThreads.push(thread.threadId);
      this.recordTest('Thread Management', 'Thread Creation',
        thread && thread.threadId ? 'PASSED' : 'FAILED',
        thread ? null : 'Failed to create thread');
      
      // Test 2: Thread statistics
      const statsBefore = await this.checkpointer.getThreadStats();
      const hasActiveThread = statsBefore.activeThreads > 0;
      this.recordTest('Thread Management', 'Thread Statistics',
        hasActiveThread ? 'PASSED' : 'FAILED',
        hasActiveThread ? null : 'No active threads found in stats');
      
      // Test 3: Save checkpoint
      const checkpointId = await this.checkpointer.saveCheckpoint(thread.threadId, {
        testData: 'checkpoint test',
        phase: 'testing',
        timestamp: new Date().toISOString()
      });
      
      this.recordTest('Thread Management', 'Checkpoint Saving',
        checkpointId ? 'PASSED' : 'FAILED',
        checkpointId ? null : 'Failed to save checkpoint');
      
      // Test 4: Load checkpoint
      const loadedCheckpoint = await this.checkpointer.loadCheckpoint(thread.threadId);
      const checkpointLoaded = loadedCheckpoint && loadedCheckpoint.testData === 'checkpoint test';
      this.recordTest('Thread Management', 'Checkpoint Loading',
        checkpointLoaded ? 'PASSED' : 'FAILED',
        checkpointLoaded ? null : 'Checkpoint data mismatch');
      
    } catch (error) {
      this.recordTest('Thread Management', 'Exception Handling', 'FAILED', error.message);
    }
    
    console.log('✅ Thread management tests complete\n');
  }

  async testAgentWrapping() {
    console.log('🤖 Testing Agent Wrapping...');
    
    try {
      // Test 1: Create wrapped agent
      const mockAgent = new MockAgent('TestAgent');
      const wrappedAgent = new LangGraphAgentWrapper(mockAgent, this.checkpointer, {
        enableCheckpointing: true,
        enableApprovalGates: false, // Disable for basic test
        maxRetries: 2
      });
      
      this.recordTest('Agent Wrapping', 'Wrapper Creation',
        wrappedAgent ? 'PASSED' : 'FAILED',
        wrappedAgent ? null : 'Failed to create wrapped agent');
      
      // Test 2: Start thread
      const thread = await wrappedAgent.startThread({
        namespace: 'agent_test',
        metadata: { agentTest: true }
      });
      
      this.testThreads.push(thread.threadId);
      this.recordTest('Agent Wrapping', 'Thread Start',
        thread && thread.threadId ? 'PASSED' : 'FAILED',
        thread ? null : 'Failed to start agent thread');
      
      // Test 3: Execute agent method with checkpointing
      const result = await mockAgent.process({ input: 'test data' });
      const executionSuccess = result && result.success && result.result.includes('test data');
      this.recordTest('Agent Wrapping', 'Agent Execution',
        executionSuccess ? 'PASSED' : 'FAILED',
        executionSuccess ? null : 'Agent execution failed or returned unexpected result');
      
      // Test 4: Check execution stats
      const stats = wrappedAgent.getExecutionStats();
      const statsValid = stats && stats.currentThread && stats.agentType === 'MockAgent';
      this.recordTest('Agent Wrapping', 'Execution Statistics',
        statsValid ? 'PASSED' : 'FAILED',
        statsValid ? null : 'Invalid execution statistics');
      
      // Test 5: Close thread
      await wrappedAgent.closeThread();
      const finalStats = wrappedAgent.getExecutionStats();
      const threadClosed = finalStats.currentThread === null;
      this.recordTest('Agent Wrapping', 'Thread Closure',
        threadClosed ? 'PASSED' : 'FAILED',
        threadClosed ? null : 'Thread not properly closed');
      
    } catch (error) {
      this.recordTest('Agent Wrapping', 'Exception Handling', 'FAILED', error.message);
    }
    
    console.log('✅ Agent wrapping tests complete\n');
  }

  async testFaultTolerance() {
    console.log('🛡️ Testing Fault Tolerance...');
    
    try {
      // Test 1: Create failing agent
      const failingAgent = new MockAgent('FailingAgent');
      failingAgent.shouldFail = true; // Will fail first 2 attempts
      
      const wrappedAgent = new LangGraphAgentWrapper(failingAgent, this.checkpointer, {
        enableCheckpointing: true,
        maxRetries: 3,
        retryDelay: 50 // Fast retries for testing
      });
      
      const thread = await wrappedAgent.startThread({
        namespace: 'fault_test',
        metadata: { faultTest: true }
      });
      this.testThreads.push(thread.threadId);
      
      // Test 2: Execute with retries
      const startTime = Date.now();
      const result = await failingAgent.process({ input: 'retry test' });
      const endTime = Date.now();
      
      const retrySuccess = result && result.success && failingAgent.executionCount === 3;
      this.recordTest('Fault Tolerance', 'Retry Logic',
        retrySuccess ? 'PASSED' : 'FAILED',
        retrySuccess ? null : `Expected 3 executions, got ${failingAgent.executionCount}`);
      
      // Test 3: Verify retry timing
      const executionTime = endTime - startTime;
      const expectedMinTime = 100; // Base delay + retries
      const timingOk = executionTime >= expectedMinTime && executionTime < 1000;
      this.recordTest('Fault Tolerance', 'Retry Timing',
        timingOk ? 'PASSED' : 'FAILED',
        timingOk ? null : `Execution time ${executionTime}ms outside expected range`);
      
      // Test 4: Check checkpoint history includes failures
      const history = await this.checkpointer.getCheckpointHistory(thread.threadId, 10);
      const hasFailureCheckpoints = history.some(cp => cp._metadata && cp._metadata.type === 'execution_failure');
      this.recordTest('Fault Tolerance', 'Failure Checkpoints',
        hasFailureCheckpoints ? 'PASSED' : 'FAILED',
        hasFailureCheckpoints ? null : 'No failure checkpoints found in history');
      
      await wrappedAgent.closeThread();
      
    } catch (error) {
      this.recordTest('Fault Tolerance', 'Exception Handling', 'FAILED', error.message);
    }
    
    console.log('✅ Fault tolerance tests complete\n');
  }

  async testHumanApprovalWorkflow() {
    console.log('👤 Testing Human Approval Workflow...');
    
    try {
      // Test 1: Request approval
      const approvalPromise = this.checkpointer.requestApproval(
        'test_thread_123',
        { action: 'test_action', data: 'test_data' },
        { timeout: 5000 }
      );
      
      // Give some time for approval request to be registered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Test 2: Check approval queue
      const stats = await this.checkpointer.getThreadStats();
      const hasPendingApproval = stats.pendingApprovals > 0;
      this.recordTest('Human Approval', 'Approval Request',
        hasPendingApproval ? 'PASSED' : 'FAILED',
        hasPendingApproval ? null : 'No pending approvals found');
      
      // Test 3: Approve the request
      let approvalId = null;
      for (const [id, request] of this.checkpointer.approvalQueue) {
        if (request.threadId === 'test_thread_123') {
          approvalId = id;
          break;
        }
      }
      
      if (approvalId) {
        await this.checkpointer.approveAction(approvalId, 'Test approval feedback');
        
        const approval = await approvalPromise;
        const approvalWorked = approval && approval.approved === true;
        this.recordTest('Human Approval', 'Approval Processing',
          approvalWorked ? 'PASSED' : 'FAILED',
          approvalWorked ? null : 'Approval not processed correctly');
      } else {
        this.recordTest('Human Approval', 'Approval Processing', 'FAILED', 'Approval ID not found');
      }
      
      // Test 4: Test rejection workflow
      const rejectionPromise = this.checkpointer.requestApproval(
        'test_thread_456',
        { action: 'test_rejection' },
        { timeout: 5000 }
      );
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let rejectionId = null;
      for (const [id, request] of this.checkpointer.approvalQueue) {
        if (request.threadId === 'test_thread_456') {
          rejectionId = id;
          break;
        }
      }
      
      if (rejectionId) {
        await this.checkpointer.rejectAction(rejectionId, 'Test rejection reason');
        
        const rejection = await rejectionPromise;
        const rejectionWorked = rejection && rejection.approved === false;
        this.recordTest('Human Approval', 'Rejection Processing',
          rejectionWorked ? 'PASSED' : 'FAILED',
          rejectionWorked ? null : 'Rejection not processed correctly');
      } else {
        this.recordTest('Human Approval', 'Rejection Processing', 'FAILED', 'Rejection ID not found');
      }
      
    } catch (error) {
      this.recordTest('Human Approval', 'Exception Handling', 'FAILED', error.message);
    }
    
    console.log('✅ Human approval workflow tests complete\n');
  }

  async testTimeTravelDebugging() {
    console.log('⏰ Testing Time Travel Debugging...');
    
    try {
      // Test 1: Create thread with multiple checkpoints
      const thread = await this.checkpointer.createThread({
        namespace: 'timetravel_test',
        metadata: { timeTravelTest: true }
      });
      this.testThreads.push(thread.threadId);
      
      // Create multiple checkpoints
      const checkpoint1 = await this.checkpointer.saveCheckpoint(thread.threadId, {
        step: 1, data: 'first checkpoint', timestamp: Date.now()
      });
      
      await new Promise(resolve => setTimeout(resolve, 100)); // Ensure different timestamps
      
      const checkpoint2 = await this.checkpointer.saveCheckpoint(thread.threadId, {
        step: 2, data: 'second checkpoint', timestamp: Date.now()
      });
      
      this.recordTest('Time Travel', 'Multiple Checkpoints',
        checkpoint1 && checkpoint2 ? 'PASSED' : 'FAILED',
        (checkpoint1 && checkpoint2) ? null : 'Failed to create multiple checkpoints');
      
      // Test 2: Get checkpoint history
      const history = await this.checkpointer.getCheckpointHistory(thread.threadId, 10);
      const historyValid = history && history.length >= 2;
      this.recordTest('Time Travel', 'Checkpoint History',
        historyValid ? 'PASSED' : 'FAILED',
        historyValid ? null : `Expected >= 2 checkpoints, got ${history ? history.length : 0}`);
      
      // Test 3: Time travel to previous checkpoint
      if (historyValid && history.length >= 2) {
        const targetCheckpoint = history[1]; // Second oldest checkpoint
        const revertedState = await this.checkpointer.revertToCheckpoint(
          thread.threadId, 
          targetCheckpoint._metadata.checkpointId
        );
        
        const revertSuccess = revertedState && revertedState.step === 1;
        this.recordTest('Time Travel', 'Checkpoint Reversion',
          revertSuccess ? 'PASSED' : 'FAILED',
          revertSuccess ? null : 'Failed to revert to previous checkpoint');
      } else {
        this.recordTest('Time Travel', 'Checkpoint Reversion', 'SKIPPED', 'Insufficient checkpoint history');
      }
      
      // Test 4: Verify current state after reversion
      const currentState = await this.checkpointer.loadCheckpoint(thread.threadId);
      const stateCorrect = currentState && currentState.step === 1 && currentState.data === 'first checkpoint';
      this.recordTest('Time Travel', 'State Consistency',
        stateCorrect ? 'PASSED' : 'FAILED',
        stateCorrect ? null : 'State inconsistent after time travel');
      
    } catch (error) {
      this.recordTest('Time Travel', 'Exception Handling', 'FAILED', error.message);
    }
    
    console.log('✅ Time travel debugging tests complete\n');
  }

  async testPerformanceMetrics() {
    console.log('📊 Testing Performance Metrics...');
    
    try {
      // Test 1: Measure checkpoint save performance
      const thread = await this.checkpointer.createThread({
        namespace: 'performance_test',
        metadata: { performanceTest: true }
      });
      this.testThreads.push(thread.threadId);
      
      const startTime = Date.now();
      const checkpointId = await this.checkpointer.saveCheckpoint(thread.threadId, {
        performanceData: 'x'.repeat(1000), // 1KB of data
        timestamp: Date.now()
      });
      const saveTime = Date.now() - startTime;
      
      const saveWithinExpected = saveTime < 100; // Should be under 100ms
      this.recordTest('Performance', 'Checkpoint Save Speed',
        saveWithinExpected ? 'PASSED' : 'FAILED',
        saveWithinExpected ? null : `Save took ${saveTime}ms, expected < 100ms`);
      
      // Test 2: Measure checkpoint load performance
      const loadStartTime = Date.now();
      const loadedCheckpoint = await this.checkpointer.loadCheckpoint(thread.threadId);
      const loadTime = Date.now() - loadStartTime;
      
      const loadWithinExpected = loadTime < 50; // Should be under 50ms
      this.recordTest('Performance', 'Checkpoint Load Speed',
        loadWithinExpected ? 'PASSED' : 'FAILED',
        loadWithinExpected ? null : `Load took ${loadTime}ms, expected < 50ms`);
      
      // Test 3: Memory usage check
      const memoryBefore = process.memoryUsage();
      
      // Create multiple checkpoints to test memory efficiency
      for (let i = 0; i < 10; i++) {
        await this.checkpointer.saveCheckpoint(thread.threadId, {
          iteration: i,
          data: 'test data for memory check',
          timestamp: Date.now()
        });
      }
      
      const memoryAfter = process.memoryUsage();
      const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;
      const memoryReasonable = memoryIncrease < 10 * 1024 * 1024; // Less than 10MB increase
      
      this.recordTest('Performance', 'Memory Efficiency',
        memoryReasonable ? 'PASSED' : 'FAILED',
        memoryReasonable ? null : `Memory increased by ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      
      // Test 4: Thread stats performance
      const statsStartTime = Date.now();
      const stats = await this.checkpointer.getThreadStats();
      const statsTime = Date.now() - statsStartTime;
      
      const statsPerformance = statsTime < 100 && stats; // Under 100ms and returns data
      this.recordTest('Performance', 'Statistics Query Speed',
        statsPerformance ? 'PASSED' : 'FAILED',
        statsPerformance ? null : `Stats query took ${statsTime}ms or returned invalid data`);
      
    } catch (error) {
      this.recordTest('Performance', 'Exception Handling', 'FAILED', error.message);
    }
    
    console.log('✅ Performance metrics tests complete\n');
  }

  recordTest(category, test, status, error = null) {
    this.testResults.push({
      category,
      test,
      status,
      error,
      timestamp: new Date().toISOString()
    });
    
    const statusIcon = status === 'PASSED' ? '✅' : status === 'FAILED' ? '❌' : '⚠️';
    console.log(`  ${statusIcon} ${test}: ${status}${error ? ` (${error})` : ''}`);
  }

  printTestSummary() {
    console.log('\n🎯 LangGraph Integration Test Results Summary');
    console.log('='.repeat(60));
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.status === 'PASSED').length;
    const failedTests = this.testResults.filter(t => t.status === 'FAILED').length;
    const skippedTests = this.testResults.filter(t => t.status === 'SKIPPED').length;
    
    const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    
    console.log(`\nTotal Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⚠️ Skipped: ${skippedTests}`);
    console.log(`📊 Success Rate: ${successRate}%`);
    
    // Group results by category
    const categories = {};
    this.testResults.forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = [];
      }
      categories[result.category].push(result);
    });
    
    console.log('\n📋 Results by Category:');
    Object.entries(categories).forEach(([category, tests]) => {
      const categoryPassed = tests.filter(t => t.status === 'PASSED').length;
      const categoryTotal = tests.length;
      const categoryRate = Math.round((categoryPassed / categoryTotal) * 100);
      
      console.log(`\n${category}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
      tests.forEach(test => {
        const icon = test.status === 'PASSED' ? '✅' : test.status === 'FAILED' ? '❌' : '⚠️';
        console.log(`  ${icon} ${test.test}${test.error ? ` - ${test.error}` : ''}`);
      });
    });
    
    // Overall assessment
    console.log('\n🎉 Overall Assessment:');
    if (successRate >= 95) {
      console.log('🟢 EXCELLENT - LangGraph integration is production-ready');
    } else if (successRate >= 85) {
      console.log('🟡 GOOD - LangGraph integration mostly working, minor issues to address');
    } else if (successRate >= 70) {
      console.log('🟠 FAIR - LangGraph integration partially working, several issues need fixing');
    } else {
      console.log('🔴 POOR - LangGraph integration has significant issues, requires investigation');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🧪 LangGraph Integration Test Suite Complete');
  }
}

// Run tests if called directly
if (require.main === module) {
  const testSuite = new LangGraphIntegrationTest();
  testSuite.runAllTests().catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = LangGraphIntegrationTest;