const puppeteer = require('puppeteer');

async function testResponsiveAgentPool() {
    console.log('📱 Testing Responsive Agent Pool & Configuration...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null // Let us control viewport manually
    });
    
    const page = await browser.newPage();
    
    // Test different viewport sizes
    const viewports = [
        { name: 'Mobile Small', width: 320, height: 568 },
        { name: 'Mobile Large', width: 414, height: 896 },
        { name: 'Tablet Portrait', width: 768, height: 1024 },
        { name: 'Tablet Landscape', width: 1024, height: 768 },
        { name: 'Desktop Small', width: 1200, height: 800 },
        { name: 'Desktop Large', width: 1440, height: 900 },
        { name: 'Desktop XL', width: 1920, height: 1080 }
    ];
    
    // Enable console logging
    page.on('console', msg => {
        if (msg.text().includes('[AgentPool]')) {
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
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\n📱 Testing Responsiveness Across Different Screen Sizes:');
        console.log('   ====================================================');
        
        const results = [];
        
        for (const viewport of viewports) {
            console.log(`\n🔍 Testing ${viewport.name} (${viewport.width}x${viewport.height}):`);
            
            await page.setViewport({
                width: viewport.width,
                height: viewport.height
            });
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Test agent pool layout
            const layoutTest = await page.evaluate(() => {
                const agentPool = document.querySelector('.agent-pool-section');
                const agentGrid = document.querySelector('.agents-grid');
                const agentCards = document.querySelectorAll('.agent-card');
                const configPanel = document.querySelector('.deployment-summary');
                
                if (!agentPool) return { error: 'Agent pool section not found' };
                
                const poolStyles = window.getComputedStyle(agentPool);
                const gridStyles = agentGrid ? window.getComputedStyle(agentGrid) : null;
                
                // Get grid layout info
                const gridColumns = gridStyles ? gridStyles.gridTemplateColumns : 'none';
                const gridGap = gridStyles ? gridStyles.gap : 'none';
                
                // Check card responsiveness
                const cardInfo = [];
                agentCards.forEach((card, index) => {
                    if (index < 3) { // Check first 3 cards
                        const cardStyles = window.getComputedStyle(card);
                        cardInfo.push({
                            width: cardStyles.width,
                            flexBasis: cardStyles.flexBasis,
                            margin: cardStyles.margin,
                            padding: cardStyles.padding
                        });
                    }
                });
                
                return {
                    agentPoolVisible: agentPool.offsetHeight > 0,
                    agentPoolWidth: agentPool.offsetWidth,
                    agentPoolHeight: agentPool.offsetHeight,
                    gridColumns: gridColumns,
                    gridGap: gridGap,
                    agentCardsCount: agentCards.length,
                    cardInfo: cardInfo,
                    configPanelVisible: configPanel ? configPanel.offsetHeight > 0 : false,
                    overflow: poolStyles.overflowX !== 'visible' ? poolStyles.overflowX : 'none'
                };
            });
            
            if (layoutTest.error) {
                console.log(`   ❌ ${layoutTest.error}`);
                results.push({ viewport: viewport.name, score: 0 });
                continue;
            }
            
            // Analyze layout quality
            const layoutQuality = [];
            
            // Check if agent pool is visible
            layoutQuality.push(layoutTest.agentPoolVisible);
            console.log(`   Agent Pool Visible: ${layoutTest.agentPoolVisible ? '✅' : '❌'}`);
            
            // Check if cards are properly laid out
            const hasCards = layoutTest.agentCardsCount > 0;
            layoutQuality.push(hasCards);
            console.log(`   Agent Cards (${layoutTest.agentCardsCount}): ${hasCards ? '✅' : '❌'}`);
            
            // Check grid responsiveness
            const hasResponsiveGrid = layoutTest.gridColumns !== 'none' && layoutTest.gridColumns !== 'auto';
            layoutQuality.push(hasResponsiveGrid);
            console.log(`   Responsive Grid: ${hasResponsiveGrid ? '✅' : '❌'}`);
            console.log(`   Grid Template: ${layoutTest.gridColumns}`);
            
            // Check for proper spacing
            const hasProperSpacing = layoutTest.gridGap !== 'none' && layoutTest.gridGap !== '0px';
            layoutQuality.push(hasProperSpacing);
            console.log(`   Grid Spacing: ${hasProperSpacing ? '✅' : '❌'} (${layoutTest.gridGap})`);
            
            // Check configuration panel visibility (should be visible on larger screens)
            const configAppropriate = viewport.width >= 768 ? layoutTest.configPanelVisible : true;
            layoutQuality.push(configAppropriate);
            console.log(`   Config Panel: ${layoutTest.configPanelVisible ? '✅' : '❌'}`);
            
            // Check for horizontal overflow (should be handled)
            const noOverflow = layoutTest.overflow === 'none' || layoutTest.overflow === 'hidden';
            layoutQuality.push(noOverflow);
            console.log(`   No H-Overflow: ${noOverflow ? '✅' : '❌'}`);
            
            const score = Math.round((layoutQuality.filter(Boolean).length / layoutQuality.length) * 100);
            console.log(`   📊 Layout Score: ${score}%`);
            
            results.push({
                viewport: viewport.name,
                width: viewport.width,
                score: score,
                details: layoutTest
            });
        }
        
        // Calculate overall responsiveness score
        const averageScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
        const excellentViewports = results.filter(r => r.score >= 80).length;
        const goodViewports = results.filter(r => r.score >= 60).length;
        
        console.log('\n🏆 Responsive Agent Pool Test Results:');
        console.log('   ===================================');
        console.log(`   📊 Average Score: ${averageScore}%`);
        console.log(`   ✅ Excellent (≥80%): ${excellentViewports}/${results.length} viewports`);
        console.log(`   👍 Good (≥60%): ${goodViewports}/${results.length} viewports`);
        
        // Detailed breakdown
        console.log('\n📱 Viewport Performance Breakdown:');
        results.forEach(result => {
            const status = result.score >= 80 ? '🌟' : result.score >= 60 ? '👍' : '⚠️';
            console.log(`   ${status} ${result.viewport}: ${result.score}%`);
        });
        
        if (averageScore >= 80) {
            console.log('\n🎉 EXCELLENT! Agent Pool is highly responsive:');
            console.log('   • Mobile-first design working perfectly');
            console.log('   • Proper grid layouts for all screen sizes');
            console.log('   • No horizontal overflow issues');
            console.log('   • Configuration panel adapts appropriately');
            console.log('   • Cards scale and reflow properly');
        } else if (averageScore >= 60) {
            console.log('\n👍 GOOD! Agent Pool is mostly responsive with minor issues');
        } else {
            console.log('\n⚠️  NEEDS IMPROVEMENT! Responsive design has significant issues');
        }
        
        // Test specific mobile interactions  
        console.log('\n📱 Testing Mobile Touch Interactions...');
        await page.setViewport({ width: 375, height: 667 }); // iPhone size
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const touchTest = await page.evaluate(() => {
            const agentCards = document.querySelectorAll('.agent-card');
            const firstCard = agentCards[0];
            
            if (!firstCard) return { error: 'No agent cards found' };
            
            // Simulate click interaction instead of TouchEvent
            const event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                clientX: firstCard.offsetLeft + 50,
                clientY: firstCard.offsetTop + 50
            });
            
            firstCard.dispatchEvent(event);
            
            return {
                cardAccessible: firstCard.hasAttribute('tabindex'),
                cardAriaLabel: firstCard.hasAttribute('aria-label'), 
                cardRole: firstCard.hasAttribute('role'),
                cardClickable: firstCard.style.cursor === 'pointer' || window.getComputedStyle(firstCard).cursor === 'pointer'
            };
        });
        
        if (!touchTest.error) {
            console.log('   Touch Accessibility:');
            console.log(`   • Keyboard Accessible: ${touchTest.cardAccessible ? '✅' : '❌'}`);
            console.log(`   • ARIA Labels: ${touchTest.cardAriaLabel ? '✅' : '❌'}`);
            console.log(`   • Semantic Roles: ${touchTest.cardRole ? '✅' : '❌'}`);
            console.log(`   • Touch Targets: ${touchTest.cardClickable ? '✅' : '❌'}`);
        }
        
        // Keep browser open for visual inspection
        console.log('\n👀 Browser staying open for 10 seconds for visual inspection...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testResponsiveAgentPool().catch(console.error);