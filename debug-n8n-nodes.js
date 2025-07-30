const puppeteer = require('puppeteer');

async function debugN8nNodes() {
    console.log('🔍 Debugging n8n Node Rendering...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1600, height: 1000 }
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        console.log(`[BROWSER] ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
        console.error(`[PAGE ERROR] ${error.message}`);
    });
    
    try {
        await page.goto('http://localhost:3100', { waitUntil: 'networkidle0' });
        console.log('✅ Page loaded');
        
        // Navigate to agents tab
        await page.click('[onclick*="agents"]');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Switch to deployment view
        await page.click('#deploy-view-btn');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Debug the workflow nodes data and function calls
        const debugInfo = await page.evaluate(() => {
            // Check if functions exist
            const hasFunctions = {
                drawN8nNodes: typeof window.drawN8nNodes === 'function',
                drawN8nNode: typeof window.drawN8nNode === 'function',
                initializeAgentGraph: typeof window.initializeAgentGraph === 'function'
            };
            
            // Check workflow nodes data
            const workflowData = window.agentDeployment?.agentHierarchy;
            
            // Check SVG state
            const svg = document.getElementById('agent-graph');
            const svgChildren = svg ? Array.from(svg.children).map(child => ({
                tagName: child.tagName,
                className: child.className.baseVal || child.className,
                id: child.id
            })) : [];
            
            // Try to manually call drawN8nNodes if it exists
            let manualCallResult = null;
            if (svg && workflowData && typeof window.drawN8nNodes === 'function') {
                try {
                    console.log('Manually calling drawN8nNodes...');
                    window.drawN8nNodes(svg, workflowData);
                    manualCallResult = 'success';
                } catch (error) {
                    manualCallResult = error.message;
                }
            }
            
            return {
                hasFunctions,
                workflowDataExists: !!workflowData,
                workflowDataKeys: workflowData ? Object.keys(workflowData) : [],
                svgExists: !!svg,
                svgChildren,
                manualCallResult
            };
        });
        
        console.log('🔍 Debug Results:');
        console.log('   Functions Available:');
        Object.entries(debugInfo.hasFunctions).forEach(([func, exists]) => {
            console.log(`     ${func}: ${exists ? '✅' : '❌'}`);
        });
        
        console.log(`   Workflow Data: ${debugInfo.workflowDataExists ? '✅' : '❌'}`);
        if (debugInfo.workflowDataExists) {
            console.log(`     Keys: ${debugInfo.workflowDataKeys.join(', ')}`);
        }
        
        console.log(`   SVG Element: ${debugInfo.svgExists ? '✅' : '❌'}`);
        console.log(`   SVG Children: ${debugInfo.svgChildren.length}`);
        debugInfo.svgChildren.forEach((child, i) => {
            if (i < 5) { // Show first 5 children
                console.log(`     ${i + 1}. ${child.tagName} (${child.className})`);
            }
        });
        
        console.log(`   Manual Call Result: ${debugInfo.manualCallResult}`);
        
        // Check for nodes after manual call
        const finalNodeCount = await page.evaluate(() => {
            const svg = document.getElementById('agent-graph');
            const nodes = svg ? svg.querySelectorAll('.agent-node') : [];
            return nodes.length;
        });
        
        console.log(`   Final Node Count: ${finalNodeCount}`);
        
        // Keep browser open for inspection
        await new Promise(resolve => setTimeout(resolve, 15000));
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    } finally {
        await browser.close();
    }
}

debugN8nNodes().catch(console.error);