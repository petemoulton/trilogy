const puppeteer = require('puppeteer');

async function testIntelligenceTab() {
    console.log('🚀 Testing Intelligence Tab functionality...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1280, height: 720 }
    });
    
    const page = await browser.newPage();
    
    // Listen for console events
    page.on('console', msg => {
        if (msg.type() === 'log' && msg.text().includes('[Intelligence]')) {
            console.log(`📄 ${msg.text()}`);
        }
    });
    
    page.on('pageerror', error => {
        console.log('❌ Page Error:', error.message);
    });
    
    try {
        // Navigate to the application
        console.log('📡 Navigating to http://localhost:3100...');
        await page.goto('http://localhost:3100', { waitUntil: 'networkidle0' });
        
        // Wait for the page to load
        await page.waitForSelector('.nav-tabs', { timeout: 10000 });
        console.log('✅ Page loaded successfully');
        
        // Click on Intelligence tab
        console.log('🖱️  Clicking Intelligence tab...');
        await page.click('[onclick*="intelligence"]');
        
        // Wait for intelligence data to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if data loaded successfully
        const intelligenceData = await page.evaluate(() => {
            return {
                totalCommits: document.getElementById('total-commits')?.textContent || 'N/A',
                activeContributors: document.getElementById('active-contributors')?.textContent || 'N/A',
                totalBranches: document.getElementById('total-branches')?.textContent || 'N/A',
                weeklyCommits: document.getElementById('weekly-commits')?.textContent || 'N/A',
                hasCommitChart: document.getElementById('commit-types-chart')?.innerHTML?.includes('chart-item') || false,
                hasContributors: document.getElementById('contributors-list')?.innerHTML?.includes('contributor-item') || false,
                hasRecentActivity: document.getElementById('recent-activity')?.innerHTML?.includes('activity-item') || false,
                lastUpdated: document.getElementById('intelligence-last-updated')?.textContent || 'N/A'
            };
        });
        
        console.log('📊 Intelligence Tab Data:');
        console.log(`   Total Commits: ${intelligenceData.totalCommits}`);
        console.log(`   Active Contributors: ${intelligenceData.activeContributors}`);
        console.log(`   Total Branches: ${intelligenceData.totalBranches}`);
        console.log(`   Weekly Commits: ${intelligenceData.weeklyCommits}`);
        console.log(`   Has Commit Chart: ${intelligenceData.hasCommitChart}`);
        console.log(`   Has Contributors: ${intelligenceData.hasContributors}`);
        console.log(`   Has Recent Activity: ${intelligenceData.hasRecentActivity}`);
        console.log(`   ${intelligenceData.lastUpdated}`);
        
        // Test refresh button
        console.log('🔄 Testing refresh button...');
        await page.click('#refresh-intelligence');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('✅ Intelligence tab test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testIntelligenceTab().catch(console.error);