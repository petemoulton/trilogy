const puppeteer = require('puppeteer');

async function testN8nStyleInterface() {
    console.log('🎨 Testing n8n-Style Interface Implementation...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1600, height: 1000 }
    });
    
    const page = await browser.newPage();
    
    try {
        await page.goto('http://localhost:3100', { waitUntil: 'networkidle0' });
        console.log('✅ Page loaded');
        
        // Navigate to agents tab
        console.log('🖱️  Navigating to agents tab...');
        await page.click('[onclick*="agents"]');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Switch to deployment view
        console.log('🖱️  Switching to deployment view...');
        await page.click('#deploy-view-btn');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test n8n-style elements
        const n8nElements = await page.evaluate(() => {
            const svg = document.getElementById('agent-graph');
            const n8nNodes = svg ? svg.querySelectorAll('.n8n-node') : [];
            const n8nConnections = svg ? svg.querySelectorAll('.n8n-connection') : [];
            const n8nHandles = svg ? svg.querySelectorAll('.n8n-handle') : [];
            const n8nGrid = svg ? svg.querySelectorAll('.n8n-grid') : [];
            const agentNodes = svg ? svg.querySelectorAll('.agent-node') : [];
            
            // Get node details
            const nodeDetails = Array.from(agentNodes).map(node => ({
                id: node.getAttribute('data-agent-id'),
                class: node.className.baseVal || node.className,
                hasIcon: !!node.querySelector('.n8n-text.icon'),
                hasTitle: !!node.querySelector('.n8n-text.title'),
                hasStatus: !!node.querySelector('.n8n-text.status'),
                hasInputHandle: !!node.querySelector('.n8n-handle.input'),
                hasOutputHandle: !!node.querySelector('.n8n-handle.output')
            }));
            
            return {
                svgExists: !!svg,
                n8nNodes: n8nNodes.length,
                n8nConnections: n8nConnections.length,
                n8nHandles: n8nHandles.length,
                n8nGrid: n8nGrid.length,
                agentNodes: agentNodes.length,
                nodeDetails
            };
        });
        
        console.log('🎨 n8n-Style Interface Analysis:');
        console.log(`   SVG Canvas: ${n8nElements.svgExists ? '✅' : '❌'}`);
        console.log(`   n8n Nodes: ${n8nElements.n8nNodes} (${n8nElements.n8nNodes > 0 ? '✅' : '❌'})`);
        console.log(`   n8n Connections: ${n8nElements.n8nConnections} (${n8nElements.n8nConnections > 0 ? '✅' : '❌'})`);
        console.log(`   Connection Handles: ${n8nElements.n8nHandles} (${n8nElements.n8nHandles > 0 ? '✅' : '❌'})`);
        console.log(`   Background Grid: ${n8nElements.n8nGrid} lines (${n8nElements.n8nGrid > 0 ? '✅' : '❌'})`);
        console.log(`   Agent Nodes: ${n8nElements.agentNodes}`);
        
        // Test node structure
        console.log('\\n🔍 Node Structure Analysis:');
        n8nElements.nodeDetails.forEach((node, i) => {
            if (i < 3) { // Show first 3 nodes
                console.log(`   Node ${i + 1} (${node.id}):`);
                console.log(`     - Icon: ${node.hasIcon ? '✅' : '❌'}`);
                console.log(`     - Title: ${node.hasTitle ? '✅' : '❌'}`);
                console.log(`     - Status: ${node.hasStatus ? '✅' : '❌'}`);
                console.log(`     - Input Handle: ${node.hasInputHandle ? '✅' : '❌'}`);
                console.log(`     - Output Handle: ${node.hasOutputHandle ? '✅' : '❌'}`);
            }
        });
        
        // Test node interaction
        if (n8nElements.agentNodes > 0) {
            console.log('\\n🖱️  Testing node interaction...');
            await page.click('.agent-node');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const interactionResult = await page.evaluate(() => {
                const selectedNodes = document.querySelectorAll('.agent-node.selected');
                const selectedList = document.getElementById('selected-agents-list');
                return {
                    hasSelection: selectedNodes.length > 0,
                    selectionListUpdated: selectedList && !selectedList.innerHTML.includes('No agents selected')
                };
            });
            
            console.log(`   Node Selection: ${interactionResult.hasSelection ? '✅' : '❌'}`);
            console.log(`   Selection UI Update: ${interactionResult.selectionListUpdated ? '✅' : '❌'}`);
        }
        
        // Test connection hover effects
        if (n8nElements.n8nConnections > 0) {
            console.log('\\n🖱️  Testing connection hover effects...');
            await page.hover('.n8n-connection');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const hoverResult = await page.evaluate(() => {
                const hoveredConnection = document.querySelector('.n8n-connection:hover');
                return {
                    connectionHovered: !!hoveredConnection
                };
            });
            
            console.log(`   Connection Hover: ${hoverResult.connectionHovered ? '✅' : '❌'}`);
        }
        
        console.log('\\n🎉 n8n-Style Interface Test Results:');
        const passedTests = [
            n8nElements.svgExists,
            n8nElements.n8nNodes > 0,
            n8nElements.n8nConnections > 0,
            n8nElements.n8nHandles > 0,
            n8nElements.n8nGrid > 0
        ].filter(Boolean).length;
        
        console.log(`   ✅ ${passedTests}/5 core features implemented`);
        console.log(`   🎨 Modern n8n-style workflow interface: ${passedTests >= 4 ? 'SUCCESS' : 'NEEDS WORK'}`);
        
        // Keep browser open for visual inspection
        console.log('\\n👀 Browser will stay open for 10 seconds for visual inspection...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testN8nStyleInterface().catch(console.error);