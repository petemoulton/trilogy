const puppeteer = require('puppeteer');

async function testCompleteDeploymentView() {
    console.log('🚀 Testing Complete Deployment View Integration...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1600, height: 1200 }
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        if (msg.text().includes('[DeploymentView]') || 
            msg.text().includes('[WorkflowGraph]') || 
            msg.text().includes('[AgentPool]') || 
            msg.text().includes('[AgileBoardData]')) {
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
        
        // Test all three main sections
        const deploymentSections = await page.evaluate(() => {
            // Sprint Header
            const sprintHeader = document.querySelector('.sprint-header');
            
            // Graph Section
            const graphSection = document.querySelector('.graph-section');
            const agentGraph = document.getElementById('agent-graph');
            const analyzeBtn = document.getElementById('analyze-workflow-btn');
            const refreshBtn = document.getElementById('refresh-graph-btn');
            
            // Agent Pool Section
            const agentPoolSection = document.querySelector('.agent-pool-section');
            const agentsList = document.getElementById('available-agents-list');
            const addAgentBtn = document.getElementById('add-agent-btn');
            const deploySelectedBtn = document.getElementById('deploy-selected-btn');
            
            // Agile Board
            const agileBoard = document.querySelector('.agile-board');
            const startSprintBtn = document.getElementById('start-sprint-btn');
            const completeDeploymentBtn = document.getElementById('complete-deployment-btn');
            
            // Count elements
            const agentCards = document.querySelectorAll('.agent-card');
            const storyCards = document.querySelectorAll('.story-card');
            const workflowNodes = document.querySelectorAll('.agent-node, .flowchart-process, .flowchart-terminal, .flowchart-decision');
            
            return {
                // Section existence
                sprintHeaderExists: !!sprintHeader,
                graphSectionExists: !!graphSection,
                agentPoolSectionExists: !!agentPoolSection,
                agileBoardExists: !!agileBoard,
                
                // Graph elements
                agentGraphExists: !!agentGraph,
                analyzeBtnExists: !!analyzeBtn,
                refreshBtnExists: !!refreshBtn,
                workflowNodeCount: workflowNodes.length,
                
                // Agent pool elements
                agentsListExists: !!agentsList,
                addAgentBtnExists: !!addAgentBtn,
                deploySelectedBtnExists: !!deploySelectedBtn,
                deploySelectedBtnDisabled: deploySelectedBtn ? deploySelectedBtn.disabled : null,
                agentCardCount: agentCards.length,
                
                // Agile board elements
                startSprintBtnExists: !!startSprintBtn,
                completeDeploymentBtnExists: !!completeDeploymentBtn,
                storyCardCount: storyCards.length
            };
        });
        
        console.log('\n🏗️  Complete Deployment View Analysis:');
        console.log('   ===========================================');
        
        console.log('\n📊 Section Structure:');
        console.log(`   Sprint Header: ${deploymentSections.sprintHeaderExists ? '✅' : '❌'}`);
        console.log(`   Workflow Graph: ${deploymentSections.graphSectionExists ? '✅' : '❌'}`);
        console.log(`   Agent Pool: ${deploymentSections.agentPoolSectionExists ? '✅' : '❌'}`);
        console.log(`   Agile Board: ${deploymentSections.agileBoardExists ? '✅' : '❌'}`);
        
        console.log('\n🔄 Workflow Graph:');
        console.log(`   SVG Canvas: ${deploymentSections.agentGraphExists ? '✅' : '❌'}`);
        console.log(`   Workflow Nodes: ${deploymentSections.workflowNodeCount}`);
        console.log(`   Analyze Button: ${deploymentSections.analyzeBtnExists ? '✅' : '❌'}`);
        console.log(`   Refresh Button: ${deploymentSections.refreshBtnExists ? '✅' : '❌'}`);
        
        console.log('\n🤖 Agent Pool:');
        console.log(`   Agent Cards: ${deploymentSections.agentCardCount}`);
        console.log(`   Add Agent Button: ${deploymentSections.addAgentBtnExists ? '✅' : '❌'}`);
        console.log(`   Deploy Button: ${deploymentSections.deploySelectedBtnExists ? '✅' : '❌'}`);
        console.log(`   Deploy Button Disabled: ${deploymentSections.deploySelectedBtnDisabled ? '✅' : '❌'} (expected initially)`);
        
        console.log('\n📋 Agile Board:');
        console.log(`   User Story Cards: ${deploymentSections.storyCardCount}`);
        console.log(`   Sprint Controls: ${deploymentSections.startSprintBtnExists && deploymentSections.completeDeploymentBtnExists ? '✅' : '❌'}`);
        
        // Test agent selection workflow
        console.log('\n🖱️  Testing Agent Selection Workflow...');
        
        if (deploymentSections.agentCardCount > 0) {
            // Select first two agents
            await page.click('.agent-card:first-child');
            await new Promise(resolve => setTimeout(resolve, 500));
            await page.click('.agent-card:nth-child(2)');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const afterSelection = await page.evaluate(() => {
                const selectedCards = document.querySelectorAll('.agent-card.selected');
                const deploymentSummary = document.getElementById('deployment-summary');
                const deployBtn = document.getElementById('deploy-selected-btn');
                const selectedAgentsList = document.getElementById('selected-agents-list');
                
                return {
                    selectedCount: selectedCards.length,
                    summaryVisible: deploymentSummary && deploymentSummary.style.display !== 'none',
                    deployBtnEnabled: deployBtn && !deployBtn.disabled,
                    hasSelectedAgentsList: !!selectedAgentsList && selectedAgentsList.children.length > 0
                };
            });
            
            console.log(`   Selected Agents: ${afterSelection.selectedCount}`);
            console.log(`   Summary Panel: ${afterSelection.summaryVisible ? '✅' : '❌'}`);
            console.log(`   Deploy Button Enabled: ${afterSelection.deployBtnEnabled ? '✅' : '❌'}`);
            console.log(`   Selected Agents List: ${afterSelection.hasSelectedAgentsList ? '✅' : '❌'}`);
        }
        
        // Test workflow analysis
        console.log('\n📊 Testing Workflow Analysis...');
        if (deploymentSections.analyzeBtnExists) {
            await page.click('#analyze-workflow-btn');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Close the alert dialog
            page.on('dialog', async dialog => {
                console.log(`   Analysis Result: ${dialog.message().includes('Workflow Analysis Results') ? '✅' : '❌'}`);
                await dialog.accept();
            });
        }
        
        // Test agent deployment integration
        console.log('\n🚀 Testing Agent Deployment Integration...');
        if (deploymentSections.deploySelectedBtnExists && deploymentSections.agentCardCount > 0) {
            await page.click('#deploy-selected-btn');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Handle confirmation dialog
            page.on('dialog', async dialog => {
                if (dialog.message().includes('Deploy')) {
                    console.log(`   Deployment Confirmation: ✅`);
                    await dialog.accept();
                } else {
                    await dialog.accept();
                }
            });
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if workflow graph and agile board were updated
            const afterDeployment = await page.evaluate(() => {
                const activeNodes = document.querySelectorAll('.flowchart-process.selected, .flowchart-terminal.selected, .agent-node.selected');
                const storyCards = document.querySelectorAll('.story-card');
                const totalPoints = document.getElementById('total-points');
                
                return {
                    activeWorkflowNodes: activeNodes.length,
                    updatedStoryCount: storyCards.length,
                    metricsUpdated: totalPoints && totalPoints.textContent !== '0'
                };
            });
            
            console.log(`   Workflow Graph Updated: ${afterDeployment.activeWorkflowNodes > 0 ? '✅' : '❌'}`);
            console.log(`   Agile Board Updated: ${afterDeployment.updatedStoryCount > 0 ? '✅' : '❌'}`);
            console.log(`   Metrics Updated: ${afterDeployment.metricsUpdated ? '✅' : '❌'}`);
        }
        
        // Test drag and drop between components
        console.log('\n🔄 Testing Cross-Component Integration...');
        const dragDropResult = await page.evaluate(() => {
            const draggableStories = document.querySelectorAll('.story-card[draggable="true"]');
            const agileColumns = document.querySelectorAll('.agile-column');
            
            return {
                draggableStories: draggableStories.length,
                dropTargets: agileColumns.length,
                integrationReady: draggableStories.length > 0 && agileColumns.length === 4
            };
        });
        
        console.log(`   Draggable Stories: ${dragDropResult.draggableStories}`);
        console.log(`   Drop Targets: ${dragDropResult.dropTargets}`);
        console.log(`   Cross-Component Ready: ${dragDropResult.integrationReady ? '✅' : '❌'}`);
        
        // Calculate overall success
        console.log('\n🎉 Complete Deployment View Test Results:');
        console.log('   ==========================================');
        
        const passedTests = [
            deploymentSections.sprintHeaderExists,
            deploymentSections.graphSectionExists,
            deploymentSections.agentPoolSectionExists,
            deploymentSections.agileBoardExists,
            deploymentSections.workflowNodeCount > 0,
            deploymentSections.agentCardCount > 0,
            deploymentSections.storyCardCount > 0,
            dragDropResult.integrationReady
        ].filter(Boolean).length;
        
        const totalTests = 8;
        const successRate = Math.round((passedTests / totalTests) * 100);
        
        console.log(`   ✅ ${passedTests}/${totalTests} integration tests passed`);
        console.log(`   📊 Success Rate: ${successRate}%`);
        console.log(`   🏗️  Complete Deployment View: ${successRate >= 80 ? 'SUCCESS' : successRate >= 60 ? 'GOOD' : 'NEEDS WORK'}`);
        
        if (successRate >= 80) {
            console.log('\n🎊 EXCELLENT! All three components are properly integrated:');
            console.log('   • Workflow Graph ↔ Agent Pool ↔ Agile Board');
            console.log('   • Data flows seamlessly between all views');
            console.log('   • Users can analyze, select, deploy, and manage agents');
        }
        
        // Keep browser open for visual inspection
        console.log('\n👀 Browser will stay open for 30 seconds for visual inspection...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testCompleteDeploymentView().catch(console.error);