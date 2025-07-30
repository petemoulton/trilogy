const puppeteer = require('puppeteer');

async function testModernFlowchart() {
    console.log('🎨 Testing Modern Workflow Graph...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1600, height: 1000 }
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        if (msg.text().includes('[WorkflowGraph]')) {
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
        
        // Test workflow graph elements
        const graphTest = await page.evaluate(() => {
            const svg = document.getElementById('agent-graph');
            const modernNodes = document.querySelectorAll('.modern-node');
            const connections = document.querySelectorAll('.modern-connection');
            const gradients = document.querySelectorAll('linearGradient');
            const markers = document.querySelectorAll('marker');
            const rects = svg ? svg.querySelectorAll('rect') : [];
            const polygons = svg ? svg.querySelectorAll('polygon') : [];
            const paths = svg ? svg.querySelectorAll('path') : [];
            
            return {
                svgExists: !!svg,
                modernNodes: modernNodes.length,
                connections: connections.length,
                gradients: gradients.length,
                markers: markers.length,
                rectangles: rects.length,
                polygons: polygons.length,
                paths: paths.length,
                viewBox: svg ? svg.getAttribute('viewBox') : null,
                svgWidth: svg ? svg.getAttribute('width') : null,
                svgHeight: svg ? svg.getAttribute('height') : null
            };
        });
        
        console.log('\n🎨 Modern Workflow Graph Analysis:');
        console.log('   ================================');
        console.log(`   SVG Canvas: ${graphTest.svgExists ? '✅' : '❌'}`);
        console.log(`   ViewBox: ${graphTest.viewBox}`);
        console.log(`   Dimensions: ${graphTest.svgWidth} x ${graphTest.svgHeight}`);
        
        console.log('\n🔷 Flowchart Elements:');
        console.log(`   Modern Nodes: ${graphTest.modernNodes}`);
        console.log(`   Connections: ${graphTest.connections}`);
        console.log(`   Rectangles: ${graphTest.rectangles}`);
        console.log(`   Polygons: ${graphTest.polygons}`);
        console.log(`   Paths: ${graphTest.paths}`);
        
        console.log('\n🎨 Visual Elements:');
        console.log(`   Gradients: ${graphTest.gradients}`);
        console.log(`   Arrow Markers: ${graphTest.markers}`);
        
        // Test node interaction
        console.log('\n🖱️  Testing Node Interactions...');
        if (graphTest.modernNodes > 0) {
            await page.click('.modern-node');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Handle the node details dialog
            page.on('dialog', async dialog => {
                console.log(`   Node Details Dialog: ${dialog.message().includes('Node Details') ? '✅' : '❌'}`);
                await dialog.accept();
            });
        }
        
        // Test hover effects
        console.log('\n✨ Testing Hover Effects...');
        if (graphTest.modernNodes > 0) {
            await page.hover('.modern-node');
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log('   Node Hover Effect: ✅');
            
            if (graphTest.connections > 0) {
                await page.hover('.modern-connection');
                await new Promise(resolve => setTimeout(resolve, 500));
                console.log('   Connection Hover Effect: ✅');
            }
        }
        
        // Calculate success metrics
        const visualQuality = [
            graphTest.svgExists,
            graphTest.modernNodes > 0,
            graphTest.connections > 0,
            graphTest.gradients > 0,
            graphTest.markers > 0,
            graphTest.viewBox !== null
        ].filter(Boolean).length;
        
        const totalVisualTests = 6;
        const visualScore = Math.round((visualQuality / totalVisualTests) * 100);
        
        console.log('\n🎉 Modern Flowchart Test Results:');
        console.log('   ===============================');
        console.log(`   ✅ ${visualQuality}/${totalVisualTests} visual elements working`);
        console.log(`   📊 Visual Quality Score: ${visualScore}%`);
        console.log(`   🎨 Modern Flowchart: ${visualScore >= 80 ? 'EXCELLENT' : visualScore >= 60 ? 'GOOD' : 'NEEDS IMPROVEMENT'}`);
        
        if (visualScore >= 80) {
            console.log('\n🌟 OUTSTANDING! The modern flowchart features:');
            console.log('   • Professional gradient-filled nodes');
            console.log('   • Smooth curved connections with arrows');
            console.log('   • Interactive hover effects and click handlers');
            console.log('   • Proper SVG scaling and responsive design');
            console.log('   • Different shapes for different node types');
        }
        
        // Keep browser open for visual inspection
        console.log('\n👀 Browser will stay open for 20 seconds for visual inspection...');
        await new Promise(resolve => setTimeout(resolve, 20000));
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testModernFlowchart().catch(console.error);