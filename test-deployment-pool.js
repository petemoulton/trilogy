const puppeteer = require('puppeteer');

async function testDeploymentPool() {
    console.log('🚀 Testing New Deployment Pool Interface...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1600, height: 1000 }
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        if (msg.text().includes('[AgentGraph]') || msg.text().includes('Agent selected')) {
            console.log(`[BROWSER] ${msg.text()}`);
        }
    });
    
    try {
        await page.goto('http://localhost:3100', { waitUntil: 'networkidle0' });
        console.log('✅ Page loaded');
        
        // Navigate to deployment view
        await page.click('[onclick*="agents"]');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.click('#deploy-view-btn');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test deployment pool elements
        const poolElements = await page.evaluate(() => {
            const pool = document.querySelector('.deployment-pool');
            const header = document.querySelector('.deployment-pool-header');
            const title = document.querySelector('.pool-title h3');
            const badge = document.getElementById('agent-count-badge');
            const clearBtn = document.getElementById('clear-all-btn');
            const emptyState = document.querySelector('.empty-pool-state');
            const summary = document.getElementById('deployment-summary');
            
            return {
                poolExists: !!pool,
                headerExists: !!header,
                titleText: title ? title.textContent : null,
                badgeText: badge ? badge.textContent : null,
                clearBtnVisible: clearBtn ? clearBtn.style.display !== 'none' : false,
                emptyStateVisible: emptyState ? !emptyState.style.display : false,
                summaryVisible: summary ? summary.style.display !== 'none' : false
            };
        });
        
        console.log('🎨 Deployment Pool Analysis:');
        console.log(`   Pool container: ${poolElements.poolExists ? '✅' : '❌'}`);
        console.log(`   Header: ${poolElements.headerExists ? '✅' : '❌'}`);
        console.log(`   Title: ${poolElements.titleText}`);
        console.log(`   Count badge: ${poolElements.badgeText}`);
        console.log(`   Clear button visible: ${poolElements.clearBtnVisible ? '✅' : '❌'}`);
        console.log(`   Empty state: ${poolElements.emptyStateVisible ? '✅' : '❌'}`);
        console.log(`   Summary visible: ${poolElements.summaryVisible ? '✅' : '❌'}`);
        
        // Test selecting agents
        console.log('\\n🖱️  Testing agent selection...');
        await page.click('.agent-node');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const afterSelection = await page.evaluate(() => {
            const badge = document.getElementById('agent-count-badge');
            const clearBtn = document.getElementById('clear-all-btn');
            const emptyState = document.querySelector('.empty-pool-state');
            const summary = document.getElementById('deployment-summary');
            const cards = document.querySelectorAll('.selected-agent-card');
            const supervisorCount = document.getElementById('supervisor-count');
            const specialistCount = document.getElementById('specialist-count');
            const workerCount = document.getElementById('worker-count');
            
            return {
                badgeText: badge ? badge.textContent : null,
                clearBtnVisible: clearBtn && clearBtn.style.display !== 'none',
                emptyStateVisible: emptyState && !emptyState.style.display,
                summaryVisible: summary && summary.style.display !== 'none',
                cardCount: cards.length,
                supervisorCount: supervisorCount ? supervisorCount.textContent : null,
                specialistCount: specialistCount ? specialistCount.textContent : null,
                workerCount: workerCount ? workerCount.textContent : null
            };
        });
        
        console.log('   After Selection:');
        console.log(`     Count badge: ${afterSelection.badgeText}`);
        console.log(`     Clear button: ${afterSelection.clearBtnVisible ? '✅' : '❌'}`);
        console.log(`     Empty state hidden: ${!afterSelection.emptyStateVisible ? '✅' : '❌'}`);
        console.log(`     Summary visible: ${afterSelection.summaryVisible ? '✅' : '❌'}`);
        console.log(`     Agent cards: ${afterSelection.cardCount}`);
        console.log(`     Stats - Supervisors: ${afterSelection.supervisorCount}, Specialists: ${afterSelection.specialistCount}, Workers: ${afterSelection.workerCount}`);
        
        // Test selecting more agents
        console.log('\\n🖱️  Selecting multiple agents...');
        const nodes = await page.$$('.agent-node');
        if (nodes.length > 1) {
            await nodes[1].click();
            await new Promise(resolve => setTimeout(resolve, 500));
            await nodes[2].click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const multiSelection = await page.evaluate(() => {
                const badge = document.getElementById('agent-count-badge');
                const cards = document.querySelectorAll('.selected-agent-card');
                return {
                    badgeText: badge ? badge.textContent : null,
                    cardCount: cards.length
                };
            });
            
            console.log(`   Multi-selection: ${multiSelection.badgeText}, ${multiSelection.cardCount} cards`);
        }
        
        // Test workflow execution
        console.log('\\n🚀 Testing workflow execution...');
        const deployBtn = await page.$('#confirm-deployment-btn');
        if (deployBtn) {
            const isEnabled = await page.evaluate(btn => !btn.disabled, deployBtn);
            console.log(`   Deploy button enabled: ${isEnabled ? '✅' : '❌'}`);
            
            if (isEnabled) {
                await deployBtn.click();
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const workflowResult = await page.evaluate(() => {
                    const notifications = document.querySelectorAll('.dashboard-notification, .notification');
                    const lastNotification = notifications[notifications.length - 1];
                    return {
                        hasNotification: notifications.length > 0,
                        lastNotificationText: lastNotification ? lastNotification.textContent : null
                    };
                });
                
                console.log(`   Workflow triggered: ${workflowResult.hasNotification ? '✅' : '❌'}`);
                if (workflowResult.lastNotificationText) {
                    console.log(`   Result: ${workflowResult.lastNotificationText}`);
                }
            }
        }
        
        console.log('\\n👀 Browser staying open for 10 seconds for visual inspection...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testDeploymentPool().catch(console.error);