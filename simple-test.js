const DependencyManager = require('./src/shared/coordination/dependency-manager');

// Simple mock memory that doesn't persist
class SimpleMemory {
    constructor() {
        this.memoryPath = '/tmp';
    }
    
    async write(namespace, key, data) {
        console.log(`[Memory] Write: ${namespace}/${key}`);
        return true;
    }
    
    async read(namespace, key) {
        return null; // Always return null for simplicity
    }
}

function simpleBroadcast(data) {
    console.log(`[Broadcast] ${data.type}: ${data.taskId} -> ${data.newStatus}`);
}

async function simpleTest() {
    try {
        console.log('Creating DependencyManager...');
        const memory = new SimpleMemory();
        const depManager = new DependencyManager(memory, simpleBroadcast);
        
        console.log('Initializing...');
        await depManager.initializeDependencySystem();
        
        console.log('Registering task...');
        // Don't await the registration - it returns a promise that resolves when task completes
        depManager.registerTask('test-task', [], 'test-agent');
        
        console.log('Task registered. Checking status...');
        const status = depManager.getSystemStatus();
        console.log('System status:', status);
        
        console.log('✅ Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

simpleTest();