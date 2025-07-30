const puppeteer = require('puppeteer');
const path = require('path');

async function testSettingsTab() {
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
        
        console.log('⚙️ Clicking on Settings tab...');
        await page.waitForSelector('.nav-tab');
        await page.evaluate(() => {
            const settingsTab = Array.from(document.querySelectorAll('.nav-tab')).find(tab => 
                tab.textContent.includes('Settings'));
            if (settingsTab) {
                settingsTab.click();
            }
        });
        
        // Wait for the settings tab to load
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('🔍 Checking if Project Settings section exists...');
        const projectSettingsSection = await page.evaluate(() => {
            const sections = Array.from(document.querySelectorAll('.setting-section h3'));
            return sections.some(h3 => h3.textContent.includes('Project Settings'));
        });
        
        if (!projectSettingsSection) {
            console.error('❌ Project Settings section not found!');
            return;
        }
        
        console.log('✅ Project Settings section found');
        
        console.log('🔍 Checking project directory setting...');
        const projectDirInfo = await page.evaluate(() => {
            const currentDirElement = document.getElementById('current-project-dir');
            const selectBtn = document.getElementById('select-project-dir');
            const autoCreateCheckbox = document.getElementById('auto-create-folders');
            
            return {
                currentDir: currentDirElement?.textContent || 'Not found',
                selectBtnExists: !!selectBtn,
                autoCreateExists: !!autoCreateCheckbox,
                autoCreateChecked: autoCreateCheckbox?.checked || false
            };
        });
        
        console.log('📊 Project Directory Settings:', projectDirInfo);
        
        if (!projectDirInfo.selectBtnExists) {
            console.error('❌ Select Directory button not found!');
            return;
        }
        
        console.log('📁 Testing directory selection...');
        
        // Set up dialog handler for the prompt
        page.on('dialog', async dialog => {
            console.log('💬 Dialog appeared:', dialog.message());
            const newPath = '/Users/asv/Desktop/Projects/test-directory';
            await dialog.accept(newPath);
        });
        
        // Click the select directory button
        await page.click('#select-project-dir');
        
        // Wait for the update to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('🔍 Checking if directory was updated...');
        const updatedDirInfo = await page.evaluate(() => {
            const currentDirElement = document.getElementById('current-project-dir');
            return {
                currentDir: currentDirElement?.textContent || 'Not found',
                localStorage: localStorage.getItem('projectDirectory')
            };
        });
        
        console.log('📊 Updated Directory Info:', updatedDirInfo);
        
        console.log('🧪 Testing auto-create folders checkbox...');
        const checkboxBefore = await page.evaluate(() => {
            return document.getElementById('auto-create-folders')?.checked;
        });
        
        console.log('☑️ Checkbox state before:', checkboxBefore);
        
        // Toggle the checkbox
        await page.click('#auto-create-folders');
        
        const checkboxAfter = await page.evaluate(() => {
            return document.getElementById('auto-create-folders')?.checked;
        });
        
        console.log('☑️ Checkbox state after:', checkboxAfter);
        
        if (checkboxBefore !== checkboxAfter) {
            console.log('✅ Checkbox toggle working correctly');
        } else {
            console.log('⚠️ Checkbox toggle might not be working');
        }
        
        console.log('🔍 Testing dark mode toggle for comparison...');
        const darkModeBtn = await page.$('#dark-mode-toggle');
        if (darkModeBtn) {
            await page.click('#dark-mode-toggle');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const darkModeActive = await page.evaluate(() => {
                return document.body.classList.contains('dark-mode');
            });
            
            console.log('🌙 Dark mode active:', darkModeActive);
        }
        
        console.log('📋 Testing all settings sections...');
        const allSections = await page.evaluate(() => {
            const sections = Array.from(document.querySelectorAll('.setting-section h3'));
            return sections.map(h3 => h3.textContent.trim());
        });
        
        console.log('📊 All settings sections found:', allSections);
        
        const expectedSections = ['Appearance', 'Project Settings', 'System'];
        const missingSections = expectedSections.filter(section => 
            !allSections.some(found => found.includes(section)));
        
        if (missingSections.length === 0) {
            console.log('✅ All expected settings sections are present');
        } else {
            console.log('❌ Missing sections:', missingSections);
        }
        
        console.log('✅ Settings tab test completed!');
        
        // Test notification system
        console.log('🔔 Testing notification system...');
        await page.evaluate(() => {
            showSettingsNotification('Test notification from Puppeteer', 'info');
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const notificationExists = await page.$('.notification, [style*="position: fixed"]');
        if (notificationExists) {
            console.log('✅ Notification system working');
        } else {
            console.log('⚠️ Notification might not be visible');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        // Don't close immediately to allow inspection
        console.log('🔍 Browser will remain open for inspection. Close manually when done.');
        // await browser.close();
    }
}

if (require.main === module) {
    testSettingsTab().catch(console.error);
}

module.exports = testSettingsTab;