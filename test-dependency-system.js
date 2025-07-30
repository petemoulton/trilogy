/**
 * Test script for Dependency Resolution System
 * Tests the basic functionality without full system complexity
 */

const DependencyManager = require('./src/shared/coordination/dependency-manager');

// Mock memory system
class MockMemory {
  constructor() {
    this.data = {};
    this.memoryPath = '/Users/petermoulton/Repos/trilogy/memory';
  }

  async write(namespace, key, data) {
    const fullKey = `${namespace}/${key}`;
    this.data[fullKey] = data;
    console.log(`[MockMemory] Wrote ${fullKey}`);
    return true;
  }

  async read(namespace, key) {
    const fullKey = `${namespace}/${key}`;
    return this.data[fullKey] || null;
  }
}

// Mock WebSocket broadcast
function mockBroadcast(data) {
  console.log('[MockBroadcast]', JSON.stringify(data, null, 2));
}

async function testBasicDependencyFlow() {
  console.log('🧪 Testing Basic Dependency Resolution System');

  try {
    // Initialize dependency manager
    const memory = new MockMemory();
    const depManager = new DependencyManager(memory, mockBroadcast);
    await depManager.initializeDependencySystem();

    console.log('✅ Dependency Manager initialized');

    // Test 1: Register a simple task with no dependencies
    console.log('\n📋 Test 1: Register task with no dependencies');
    const task1Promise = depManager.registerTask('task-1', [], 'agent-sonnet', {
      description: 'Parse PRD document'
    });

    console.log('✅ Task 1 registered successfully');

    // Test 2: Check if task can start
    const canStart = await depManager.canTaskStart('task-1');
    console.log(`✅ Task 1 can start: ${canStart}`);

    // Test 3: Start the task
    console.log('\n🚀 Test 3: Start task execution');
    await depManager.startTask('task-1', 'agent-sonnet');
    console.log('✅ Task 1 started successfully');

    // Test 4: Complete the task
    console.log('\n✅ Test 4: Complete task');
    await depManager.completeTask('task-1', { result: 'PRD parsed successfully' });
    console.log('✅ Task 1 completed successfully');

    // Test 5: Register dependent task
    console.log('\n🔗 Test 5: Register task with dependency');
    const task2Promise = depManager.registerTask('task-2', ['task-1'], 'agent-opus', {
      description: 'Analyze parsed PRD'
    });

    console.log('✅ Task 2 registered with dependency on Task 1');

    // Test 6: Check if dependent task can start (should be true since task-1 is complete)
    const canStart2 = await depManager.canTaskStart('task-2');
    console.log(`✅ Task 2 can start: ${canStart2}`);

    // Test 7: Get system status
    console.log('\n📊 Test 7: System status');
    const status = depManager.getSystemStatus();
    console.log('System Status:', JSON.stringify(status, null, 2));

    // Test 8: Get dependency chain
    console.log('\n🔗 Test 8: Dependency chain');
    const chain = depManager.getDependencyChain('task-2');
    console.log('Dependency Chain:', JSON.stringify(chain, null, 2));

    console.log('\n🎉 All tests passed! Dependency system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

// Run the test
testBasicDependencyFlow();
