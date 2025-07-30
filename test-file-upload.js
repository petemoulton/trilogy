const puppeteer = require('puppeteer');
const path = require('path');

async function testFileUpload() {
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

    console.log('📋 Clicking on Projects tab...');
    await page.waitForSelector('.nav-tab');
    await page.evaluate(() => {
      const projectsTab = Array.from(document.querySelectorAll('.nav-tab')).find(tab =>
        tab.textContent.includes('Projects'));
      if (projectsTab) {
        projectsTab.click();
      }
    });

    // Wait a bit for the tab to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('🔍 Checking if upload mode button exists...');
    const uploadBtn = await page.$('#upload-mode-btn');
    if (!uploadBtn) {
      console.error('❌ Upload mode button not found!');
      return;
    }

    console.log('📁 Clicking Upload File button...');
    await page.click('#upload-mode-btn');

    // Wait for mode switch
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('🔍 Checking if upload input is visible...');
    const uploadInputVisible = await page.evaluate(() => {
      const uploadInput = document.getElementById('upload-input');
      const pasteInput = document.getElementById('paste-input');
      return {
        uploadInputActive: uploadInput?.classList.contains('active'),
        pasteInputActive: pasteInput?.classList.contains('active'),
        uploadInputDisplay: window.getComputedStyle(uploadInput).display,
        pasteInputDisplay: window.getComputedStyle(pasteInput).display
      };
    });

    console.log('📊 Mode switch status:', uploadInputVisible);

    if (!uploadInputVisible.uploadInputActive) {
      console.error('❌ Upload mode is not active after clicking button!');
    }

    console.log('🔍 Checking if drop zone exists...');
    const dropZone = await page.$('#file-drop-zone');
    if (!dropZone) {
      console.error('❌ Drop zone not found!');
      return;
    }

    console.log('🎯 Testing drop zone click...');

    // Check if WorkflowManager is loaded
    const workflowManagerStatus = await page.evaluate(() => {
      return {
        workflowManagerExists: !!window.WorkflowManager,
        workflowManagerInitialized: window.WorkflowManager?.workflowStatus !== undefined
      };
    });

    console.log('🔧 WorkflowManager Status:', workflowManagerStatus);

    // Try to click the drop zone
    await page.click('#file-drop-zone');

    console.log('⏳ Waiting to see if file dialog opens...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if file input was triggered (we can't directly test file dialog opening)
    const fileInputStatus = await page.evaluate(() => {
      const fileInput = document.getElementById('file-input');
      return {
        exists: !!fileInput,
        accept: fileInput?.accept,
        style: fileInput?.style.display
      };
    });

    console.log('📄 File input status:', fileInputStatus);

    // Try to simulate file upload programmatically for testing
    console.log('🧪 Testing file upload simulation...');

    const testFilePath = path.join(__dirname, 'test-prd.md');

    // Simulate file upload
    await page.evaluate((filePath) => {
      // Create a mock file for testing
      const content = `# Test PRD

This is a test Product Requirements Document for testing the file upload functionality.

## Requirements
- Feature 1: User authentication
- Feature 2: Dashboard interface
- Feature 3: File upload capability

## Technical Details
- Frontend: HTML/CSS/JavaScript
- Backend: Node.js
- Database: PostgreSQL

This should be enough content to test the file upload validation.`;

      const blob = new Blob([content], { type: 'text/markdown' });
      const file = new File([blob], 'test-prd.md', { type: 'text/markdown' });

      // Simulate file selection
      const fileInput = document.getElementById('file-input');
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;

      // Trigger change event
      const changeEvent = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);

      return 'File simulation completed';
    }, testFilePath);

    console.log('⏳ Waiting for file processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if the text area was populated
    const textAreaContent = await page.evaluate(() => {
      const textArea = document.getElementById('prd-text-input');
      return {
        value: textArea?.value?.substring(0, 100) + '...',
        length: textArea?.value?.length || 0
      };
    });

    console.log('📝 Text area content:', textAreaContent);

    console.log('✅ Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  testFileUpload().catch(console.error);
}

module.exports = testFileUpload;
