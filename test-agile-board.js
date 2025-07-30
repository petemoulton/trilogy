const puppeteer = require('puppeteer');

async function testAgileBoard() {
    console.log('🏃‍♂️ Testing Agile Board Implementation...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1600, height: 1000 }
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        if (msg.text().includes('[AgileBoard]') || msg.text().includes('Sprint')) {
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
        
        // Test agile board elements
        const agileBoardElements = await page.evaluate(() => {
            const sprintHeader = document.querySelector('.sprint-header');
            const agileBoard = document.querySelector('.agile-board');
            const currentSprint = document.getElementById('current-sprint');
            
            // Check columns
            const backlogColumn = document.querySelector('.backlog-column');
            const sprintColumn = document.querySelector('.sprint-column');
            const progressColumn = document.querySelector('.progress-column');
            const doneColumn = document.querySelector('.done-column');
            
            // Check story cards
            const storyCards = document.querySelectorAll('.story-card');
            const productBacklogCards = document.querySelectorAll('#backlog-stories .story-card');
            const sprintBacklogCards = document.querySelectorAll('#sprint-stories .story-card');
            const inProgressCards = document.querySelectorAll('#progress-stories .story-card');
            const doneCards = document.querySelectorAll('#done-stories .story-card');
            
            // Check sprint controls
            const startSprintBtn = document.getElementById('start-sprint-btn');
            const completeDeploymentBtn = document.getElementById('complete-deployment-btn');
            const resetSprintBtn = document.getElementById('reset-sprint-btn');
            
            // Check metrics
            const totalPoints = document.getElementById('total-points');
            const completedPoints = document.getElementById('completed-points');
            const remainingPoints = document.getElementById('remaining-points');
            const teamVelocity = document.getElementById('team-velocity');
            
            return {
                sprintHeaderExists: !!sprintHeader,
                agileBoardExists: !!agileBoard,
                currentSprintText: currentSprint ? currentSprint.textContent : null,
                
                // Columns
                backlogColumnExists: !!backlogColumn,
                sprintColumnExists: !!sprintColumn,
                progressColumnExists: !!progressColumn,
                doneColumnExists: !!doneColumn,
                
                // Story cards
                totalStoryCards: storyCards.length,
                productBacklogCards: productBacklogCards.length,
                sprintBacklogCards: sprintBacklogCards.length,
                inProgressCards: inProgressCards.length,
                doneCards: doneCards.length,
                
                // Sprint controls
                startSprintBtnExists: !!startSprintBtn,
                completeDeploymentBtnExists: !!completeDeploymentBtn,
                resetSprintBtnExists: !!resetSprintBtn,
                
                // Metrics
                totalPointsText: totalPoints ? totalPoints.textContent : null,
                completedPointsText: completedPoints ? completedPoints.textContent : null,
                remainingPointsText: remainingPoints ? remainingPoints.textContent : null,
                velocityText: teamVelocity ? teamVelocity.textContent : null
            };
        });
        
        console.log('🏃‍♂️ Agile Board Analysis:');
        console.log(`   Sprint Header: ${agileBoardElements.sprintHeaderExists ? '✅' : '❌'}`);
        console.log(`   Agile Board: ${agileBoardElements.agileBoardExists ? '✅' : '❌'}`);
        console.log(`   Current Sprint: ${agileBoardElements.currentSprintText}`);
        
        console.log('\n📋 Kanban Columns:');
        console.log(`   Product Backlog: ${agileBoardElements.backlogColumnExists ? '✅' : '❌'}`);
        console.log(`   Sprint Backlog: ${agileBoardElements.sprintColumnExists ? '✅' : '❌'}`);
        console.log(`   In Progress: ${agileBoardElements.progressColumnExists ? '✅' : '❌'}`);
        console.log(`   Done: ${agileBoardElements.doneColumnExists ? '✅' : '❌'}`);
        
        console.log('\n🎫 User Story Cards:');
        console.log(`   Total Story Cards: ${agileBoardElements.totalStoryCards}`);
        console.log(`   Product Backlog: ${agileBoardElements.productBacklogCards} cards`);
        console.log(`   Sprint Backlog: ${agileBoardElements.sprintBacklogCards} cards`);
        console.log(`   In Progress: ${agileBoardElements.inProgressCards} cards`);
        console.log(`   Done: ${agileBoardElements.doneCards} cards`);
        
        console.log('\n🎛️  Sprint Controls:');
        console.log(`   Start Sprint Button: ${agileBoardElements.startSprintBtnExists ? '✅' : '❌'}`);
        console.log(`   Complete Deployment Button: ${agileBoardElements.completeDeploymentBtnExists ? '✅' : '❌'}`);
        console.log(`   Reset Sprint Button: ${agileBoardElements.resetSprintBtnExists ? '✅' : '❌'}`);
        
        console.log('\n📊 Sprint Metrics:');
        console.log(`   Total Points: ${agileBoardElements.totalPointsText}`);
        console.log(`   Completed Points: ${agileBoardElements.completedPointsText}`);
        console.log(`   Remaining Points: ${agileBoardElements.remainingPointsText}`);
        console.log(`   Team Velocity: ${agileBoardElements.velocityText}`);
        
        // Test drag and drop functionality
        console.log('\n🖱️  Testing drag and drop functionality...');
        const dragResult = await page.evaluate(() => {
            const firstCard = document.querySelector('.story-card[draggable="true"]');
            if (firstCard) {
                // Check if drag events are properly set up
                const hasDragStart = firstCard.ondragstart !== null;
                const hasDragEnd = firstCard.ondragend !== null;
                return {
                    cardExists: true,
                    draggable: firstCard.draggable,
                    hasDragEvents: hasDragStart || hasDragEnd
                };
            }
            return { cardExists: false };
        });
        
        console.log(`   Draggable Cards: ${dragResult.cardExists ? '✅' : '❌'}`);
        console.log(`   Drag Events: ${dragResult.hasDragEvents ? '✅' : '❌'}`);
        
        // Test sprint button functionality
        console.log('\n🚀 Testing sprint management...');
        await page.click('#reset-sprint-btn');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const afterReset = await page.evaluate(() => {
            const productBacklogCards = document.querySelectorAll('#backlog-stories .story-card');
            const inProgressCards = document.querySelectorAll('#progress-stories .story-card');
            return {
                backlogCards: productBacklogCards.length,
                progressCards: inProgressCards.length
            };
        });
        
        console.log(`   After Reset - Backlog: ${afterReset.backlogCards}, Progress: ${afterReset.progressCards}`);
        
        // Test complete deployment
        if (afterReset.progressCards > 0) {
            await page.click('#complete-deployment-btn');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const afterComplete = await page.evaluate(() => {
                const doneCards = document.querySelectorAll('#done-stories .story-card');
                return { doneCards: doneCards.length };
            });
            
            console.log(`   After Complete Deployment - Done: ${afterComplete.doneCards}`);
        }
        
        console.log('\n🎉 Agile Board Test Results:');
        const passedTests = [
            agileBoardElements.sprintHeaderExists,
            agileBoardElements.agileBoardExists,
            agileBoardElements.totalStoryCards > 0,
            agileBoardElements.startSprintBtnExists,
            agileBoardElements.completeDeploymentBtnExists,
            dragResult.cardExists
        ].filter(Boolean).length;
        
        console.log(`   ✅ ${passedTests}/6 agile features working`);
        console.log(`   🏃‍♂️ Agile board implementation: ${passedTests >= 5 ? 'SUCCESS' : 'NEEDS WORK'}`);
        
        // Keep browser open for visual inspection
        console.log('\n👀 Browser will stay open for 20 seconds for visual inspection...');
        await new Promise(resolve => setTimeout(resolve, 20000));
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testAgileBoard().catch(console.error);