const puppeteer = require('puppeteer');

async function testTabFunctionality() {
    console.log('🚀 Starting Puppeteer tab functionality test...');
    
    const browser = await puppeteer.launch({ 
        headless: false, // Set to true for headless mode
        defaultViewport: { width: 1280, height: 720 }
    });
    
    const page = await browser.newPage();
    
    // Listen for console events
    page.on('console', msg => {
        console.log(`📄 Console ${msg.type()}: ${msg.text()}`);
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
        
        // Wait for scripts to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check what's available in window
        const windowObjects = await page.evaluate(() => {
            return {
                showTab: typeof showTab !== 'undefined',
                windowShowTab: typeof window.showTab !== 'undefined',
                TabManager: typeof window.TabManager !== 'undefined',
                hasTabManagerClass: window.TabManager instanceof Object,
                windowKeys: Object.keys(window).filter(key => key.includes('Tab') || key.includes('Manager')),
                scripts: Array.from(document.querySelectorAll('script[src]')).map(s => s.src)
            };
        });
        console.log('🔍 Window objects:', windowObjects);
        
        // Get all tab elements
        const tabs = await page.$$('.nav-tab');
        console.log(`📋 Found ${tabs.length} tabs`);
        
        // Get tab names
        const tabNames = await page.evaluate(() => {
            const tabs = document.querySelectorAll('.nav-tab');
            return Array.from(tabs).map(tab => tab.textContent.trim());
        });
        console.log('📝 Tab names:', tabNames);
        
        // Test clicking each tab with better error handling
        for (let i = 0; i < Math.min(tabNames.length, 3); i++) { // Test first 3 tabs
            const tabName = tabNames[i];
            console.log(`\n🖱️  Testing tab: ${tabName}`);
            
            try {
                // Click the tab
                await page.click(`.nav-tab:nth-child(${i + 1})`);
                console.log(`✅ Clicked ${tabName} tab`);
                
                // Wait a moment for any animations/transitions
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Check if tab is active and content switched
                const tabState = await page.evaluate((index) => {
                    const tab = document.querySelector(`.nav-tab:nth-child(${index + 1})`);
                    const isActive = tab && tab.classList.contains('active');
                    
                    // Check if corresponding content is visible
                    const tabId = tab ? tab.getAttribute('onclick')?.match(/'(\w+)'/)?.[1] : null;
                    const content = tabId ? document.getElementById(tabId) : null;
                    const contentVisible = content && content.classList.contains('active');
                    
                    return {
                        tabActive: isActive,
                        contentVisible: contentVisible,
                        tabId: tabId
                    };
                }, i);
                
                console.log(`📊 ${tabName} - Tab active: ${tabState.tabActive}, Content visible: ${tabState.contentVisible}, ID: ${tabState.tabId}`);
                
            } catch (error) {
                console.log(`❌ Error clicking ${tabName} tab:`, error.message);
            }
        }
        
        console.log('✅ Tab functionality test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

// Capture console errors
const originalConsoleError = console.error;
const errors = [];
console.error = (...args) => {
    errors.push(args.join(' '));
    originalConsoleError.apply(console, args);
};

// Run the test
testTabFunctionality().catch(console.error);