const puppeteer = require('puppeteer');

async function testFlowchartDeployment() {
    console.log('🚀 Testing New Flowchart Deployment UI...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1600, height: 1000 }
    });
    
    const page = await browser.newPage();
    
    try {
        await page.goto('http://localhost:3100', { waitUntil: 'networkidle0' });
        console.log('✅ Page loaded');
        
        // Go to agents tab and deployment view
        console.log('🖱️  Navigating to deployment view...');
        await page.click('[onclick*="agents"]');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await page.click('#deploy-view-btn');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check flowchart elements
        const flowchartInfo = await page.evaluate(() => {
            const svg = document.getElementById('agent-graph');
            const nodes = svg ? svg.querySelectorAll('.agent-node') : [];
            const connections = svg ? svg.querySelectorAll('.agent-connection') : [];
            const processBoxes = svg ? svg.querySelectorAll('.flowchart-process') : [];
            const terminals = svg ? svg.querySelectorAll('.flowchart-terminal') : [];
            const decisions = svg ? svg.querySelectorAll('.flowchart-decision') : [];
            const labels = document.querySelectorAll('.flowchart-label');
            
            const nodeTypes = Array.from(nodes).map(node => ({
                id: node.getAttribute('data-agent-id'),
                classes: node.className.baseVal || node.className
            }));
            
            return {
                svgExists: !!svg,
                totalNodes: nodes.length,
                connections: connections.length,
                processBoxes: processBoxes.length,
                terminals: terminals.length,
                decisions: decisions.length,
                labels: labels.length,
                nodeTypes
            };
        });
        
        console.log('📊 Flowchart Analysis:');
        console.log(`   SVG exists: ${flowchartInfo.svgExists}`);
        console.log(`   Total nodes: ${flowchartInfo.totalNodes}`);
        console.log(`   Process boxes: ${flowchartInfo.processBoxes}`);
        console.log(`   Terminal nodes: ${flowchartInfo.terminals}`);
        console.log(`   Decision diamonds: ${flowchartInfo.decisions}`);
        console.log(`   Connections: ${flowchartInfo.connections}`);
        console.log(`   Stage labels: ${flowchartInfo.labels}`);
        console.log('   Node types:', flowchartInfo.nodeTypes);
        
        // Test agent selection
        if (flowchartInfo.processBoxes > 0) {
            console.log('🖱️  Testing agent selection...');
            await page.click('.flowchart-process');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const selectionResult = await page.evaluate(() => {
                const selectedList = document.getElementById('selected-agents-list');
                const deployBtn = document.getElementById('confirm-deployment-btn');
                const selectedNodes = document.querySelectorAll('.agent-node.selected');
                const selectedProcesses = document.querySelectorAll('.flowchart-process.selected');
                
                return {
                    hasSelection: selectedList && !selectedList.innerHTML.includes('No agents selected'),
                    deployEnabled: deployBtn && !deployBtn.disabled,
                    selectedNodes: selectedNodes.length,
                    selectedProcesses: selectedProcesses.length
                };
            });
            
            console.log('✅ Selection Test:', selectionResult);
        }
        
        // Test tooltip
        console.log('🖱️  Testing tooltip...');
        const processBox = await page.$('.flowchart-process');
        if (processBox) {
            await processBox.hover();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const tooltipVisible = await page.evaluate(() => {
                const tooltip = document.getElementById('agent-tooltip');
                return tooltip && tooltip.classList.contains('visible');
            });
            
            console.log(`✅ Tooltip working: ${tooltipVisible}`);
        }
        
        console.log('\n🎉 Flowchart UI test completed!');
        console.log('   Check browser for visual verification of the new flowchart design');
        
        // Keep browser open for visual inspection
        await new Promise(resolve => setTimeout(resolve, 10000));
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testFlowchartDeployment().catch(console.error);