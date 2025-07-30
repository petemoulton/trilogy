const puppeteer = require('puppeteer');

async function testFlowchartDesign() {
    console.log('🎨 Testing New Flowchart Design...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1600, height: 1000 }
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        if (msg.text().includes('[AgentGraph]')) {
            console.log(`[BROWSER] ${msg.text()}`);
        }
    });
    
    page.on('pageerror', error => {
        console.error(`[PAGE ERROR] ${error.message}`);
    });
    
    try {
        await page.goto('http://localhost:3100', { waitUntil: 'networkidle0' });
        console.log('✅ Page loaded');
        
        // Navigate to deployment view
        await page.click('[onclick*="agents"]');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.click('#deploy-view-btn');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test flowchart elements
        const flowchartElements = await page.evaluate(() => {
            const svg = document.getElementById('agent-graph');
            
            // Count different node types
            const terminals = svg ? svg.querySelectorAll('.flowchart-terminal') : [];
            const processes = svg ? svg.querySelectorAll('.flowchart-process') : [];
            const decisions = svg ? svg.querySelectorAll('.flowchart-decision') : [];
            const connections = svg ? svg.querySelectorAll('.flowchart-connection') : [];
            const labels = svg ? svg.querySelectorAll('.flowchart-text') : [];
            
            // Get node details
            const nodeDetails = [];
            const allNodes = svg ? svg.querySelectorAll('.agent-node') : [];
            Array.from(allNodes).forEach((node, i) => {
                if (i < 5) { // First 5 nodes
                    const agentId = node.getAttribute('data-agent-id');
                    const titleEl = node.querySelector('.flowchart-text.title');
                    const title = titleEl ? titleEl.textContent : 'No title';
                    const shapeEl = node.querySelector('.flowchart-terminal, .flowchart-process, .flowchart-decision');
                    const shapeType = shapeEl ? shapeEl.className.baseVal.split(' ')[0] : 'unknown';
                    
                    nodeDetails.push({
                        id: agentId,
                        title,
                        shapeType
                    });
                }
            });
            
            return {
                svgExists: !!svg,
                terminals: terminals.length,
                processes: processes.length,
                decisions: decisions.length,
                connections: connections.length,
                labels: labels.length,
                totalNodes: allNodes.length,
                nodeDetails
            };
        });
        
        console.log('🎨 Flowchart Design Analysis:');
        console.log(`   SVG Canvas: ${flowchartElements.svgExists ? '✅' : '❌'}`);
        console.log(`   Terminal nodes (start/end): ${flowchartElements.terminals} (${flowchartElements.terminals > 0 ? '✅' : '❌'})`);
        console.log(`   Process nodes (rectangles): ${flowchartElements.processes} (${flowchartElements.processes > 0 ? '✅' : '❌'})`);
        console.log(`   Decision nodes (diamonds): ${flowchartElements.decisions} (${flowchartElements.decisions > 0 ? '✅' : '❌'})`);
        console.log(`   Connections: ${flowchartElements.connections} (${flowchartElements.connections > 0 ? '✅' : '❌'})`);
        console.log(`   Text labels: ${flowchartElements.labels}`);
        console.log(`   Total nodes: ${flowchartElements.totalNodes}`);
        
        console.log('\\n🔍 Node Details:');
        flowchartElements.nodeDetails.forEach((node, i) => {
            console.log(`   ${i + 1}. ${node.title} (${node.id}) - Shape: ${node.shapeType}`);
        });
        
        // Test node interactions
        console.log('\\n🖱️  Testing flowchart interactions...');
        if (flowchartElements.totalNodes > 0) {
            await page.click('.agent-node');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const interactionResult = await page.evaluate(() => {
                const selectedNodes = document.querySelectorAll('.agent-node.selected, .flowchart-process.selected, .flowchart-decision.selected, .flowchart-terminal.selected');
                const selectedList = document.getElementById('selected-agents-list');
                const deployBtn = document.getElementById('confirm-deployment-btn');
                const countBadge = document.getElementById('agent-count-badge');
                
                return {
                    selectedNodes: selectedNodes.length,
                    deployBtnEnabled: deployBtn && !deployBtn.disabled,
                    countBadgeText: countBadge ? countBadge.textContent : null,
                    selectionUIUpdated: selectedList && !selectedList.innerHTML.includes('No Agents Selected')
                };
            });
            
            console.log('   Node Selection Results:');
            console.log(`     Selected nodes: ${interactionResult.selectedNodes}`);
            console.log(`     Deploy button enabled: ${interactionResult.deployBtnEnabled ? '✅' : '❌'}`);
            console.log(`     Count badge: ${interactionResult.countBadgeText}`);
            console.log(`     Selection UI updated: ${interactionResult.selectionUIUpdated ? '✅' : '❌'}`);
        }
        
        // Test hover effects
        console.log('\\n🖱️  Testing hover effects...');
        await page.hover('.flowchart-process, .flowchart-decision, .flowchart-terminal');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const hoverResult = await page.evaluate(() => {
            const tooltip = window.agentDeployment?.currentTooltip;
            const isTooltipVisible = tooltip && tooltip.classList.contains('visible');
            return {
                tooltipVisible: isTooltipVisible
            };
        });
        
        console.log(`   Tooltip on hover: ${hoverResult.tooltipVisible ? '✅' : '❌'}`);
        
        console.log('\\n🎉 Flowchart Design Test Results:');
        const passedTests = [
            flowchartElements.svgExists,
            flowchartElements.terminals > 0,
            flowchartElements.processes > 0,
            flowchartElements.decisions > 0,
            flowchartElements.connections > 0,
            flowchartElements.totalNodes > 0
        ].filter(Boolean).length;
        
        console.log(`   ✅ ${passedTests}/6 flowchart features working`);
        console.log(`   🎨 Professional flowchart design: ${passedTests >= 5 ? 'SUCCESS' : 'NEEDS WORK'}`);
        
        // Keep browser open for visual inspection
        console.log('\\n👀 Browser will stay open for 15 seconds for visual inspection...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testFlowchartDesign().catch(console.error);