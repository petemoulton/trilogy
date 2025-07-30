const puppeteer = require('puppeteer');

async function testAnalysisSimple() {
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true,
        slowMo: 500
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            console.log('🖥️ Browser Console:', msg.text());
        });
        
        page.on('pageerror', error => {
            console.error('🚨 Page Error:', error.message);
        });
        
        console.log('🌐 Navigating to dashboard...');
        await page.goto('http://localhost:3100', { waitUntil: 'networkidle0' });
        
        console.log('📋 Switching to Projects tab...');
        await page.evaluate(() => {
            const projectsTab = Array.from(document.querySelectorAll('.nav-tab')).find(tab => 
                tab.textContent.includes('Projects'));
            if (projectsTab) {
                projectsTab.click();
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('📝 Adding test PRD content...');
        const testPRD = 'E-commerce platform with user authentication, database design, payment integration, mobile app, and testing framework';
        
        await page.type('#prd-text-input', testPRD);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('🔍 Checking button states...');
        const buttonStates = await page.evaluate(() => {
            return {
                analyzeBtn: {
                    disabled: document.getElementById('analyze-prd-btn')?.disabled,
                    visible: !!document.getElementById('analyze-prd-btn')
                },
                startBtn: {
                    disabled: document.getElementById('start-workflow-btn')?.disabled,
                    visible: !!document.getElementById('start-workflow-btn')
                }
            };
        });
        
        console.log('📊 Button States:', buttonStates);
        
        if (!buttonStates.analyzeBtn.visible) {
            console.error('❌ Analyze button not found!');
            return;
        }
        
        if (buttonStates.analyzeBtn.disabled) {
            console.error('❌ Analyze button is disabled!');
            return;
        }
        
        console.log('🧠 Clicking Analyze PRD button...');
        await page.click('#analyze-prd-btn');
        
        console.log('⏳ Waiting for analysis results...');
        
        try {
            // Wait for either results or error
            await page.waitForFunction(() => {
                const resultsDiv = document.getElementById('prd-analysis-results');
                const hasResults = resultsDiv && resultsDiv.style.display !== 'none' && resultsDiv.innerHTML.includes('Sonnet Agents');
                const hasError = document.getElementById('workflow-status')?.textContent?.includes('failed');
                return hasResults || hasError;
            }, { timeout: 10000 });
            
            // Check what we got
            const result = await page.evaluate(() => {
                const resultsDiv = document.getElementById('prd-analysis-results');
                const statusDiv = document.getElementById('workflow-status');
                
                if (statusDiv?.textContent?.includes('failed')) {
                    return {
                        success: false,
                        error: statusDiv.textContent,
                        networkError: true
                    };
                }
                
                if (resultsDiv && resultsDiv.style.display !== 'none') {
                    const sonnetAgents = document.querySelector('.analysis-stat:first-child div:first-child')?.textContent;
                    const projectSize = document.querySelector('.analysis-stat:last-child div:first-child')?.textContent;
                    const agentCount = document.querySelectorAll('.agent-list > div').length;
                    const featureCount = document.querySelectorAll('.features-list span').length;
                    
                    return {
                        success: true,
                        sonnetAgents,
                        projectSize,
                        agentBreakdownCount: agentCount,
                        detectedFeatures: featureCount
                    };
                }
                
                return { success: false, error: 'Unknown state' };
            });
            
            if (result.success) {
                console.log('✅ Analysis completed successfully!');
                console.log('📊 Results:');
                console.log(`   - Sonnet Agents: ${result.sonnetAgents}`);
                console.log(`   - Project Size: ${result.projectSize}`);
                console.log(`   - Agent Breakdown: ${result.agentBreakdownCount} specialties`);
                console.log(`   - Detected Features: ${result.detectedFeatures}`);
                
                // Test the dynamic workflow button
                const workflowButton = await page.evaluate(() => {
                    const deployBtn = Array.from(document.querySelectorAll('button')).find(btn => 
                        btn.textContent.includes('Deploy') && btn.textContent.includes('Sonnet Agents'));
                    return {
                        exists: !!deployBtn,
                        text: deployBtn?.textContent || 'Not found',
                        disabled: deployBtn?.disabled || false
                    };
                });
                
                console.log('🚀 Dynamic Workflow Button:', workflowButton);
                
                if (workflowButton.exists) {
                    console.log('✅ All functionality working correctly!');
                } else {
                    console.log('⚠️ Dynamic workflow button not found');
                }
                
            } else {
                console.error('❌ Analysis failed:', result.error);
                if (result.networkError) {
                    console.error('   This appears to be a network/API error');
                }
            }
            
        } catch (timeoutError) {
            console.error('⏰ Analysis timed out - checking what happened...');
            
            const debugInfo = await page.evaluate(() => {
                return {
                    resultsVisible: document.getElementById('prd-analysis-results')?.style.display,
                    statusText: document.getElementById('workflow-status')?.textContent,
                    anyNotifications: !!document.querySelector('[style*="position: fixed"]'),
                    analyzeButton: document.getElementById('analyze-prd-btn')?.disabled
                };
            });
            
            console.log('🔍 Debug Info:', debugInfo);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        console.log('🔍 Browser will remain open for inspection.');
        // await browser.close();
    }
}

if (require.main === module) {
    testAnalysisSimple().catch(console.error);
}

module.exports = testAnalysisSimple;