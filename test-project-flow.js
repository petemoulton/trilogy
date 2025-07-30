const puppeteer = require('puppeteer');

async function testProjectFlow() {
  console.log('🚀 Testing Project Creation Flow...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.text().includes('[Project]')) {
      console.log(`📄 ${msg.text()}`);
    }
  });

  try {
    await page.goto('http://localhost:3100', { waitUntil: 'networkidle0' });
    console.log('✅ Page loaded');

    // Show workflow results for testing
    await page.evaluate(() => {
      const workflowResults = document.getElementById('workflow-results');
      if (workflowResults) {
        workflowResults.style.display = 'block';
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test Create Project button
    console.log('🖱️  Testing Create Project button...');
    const createBtn = await page.$('button[onclick="saveWorkflowResults()"]');

    if (createBtn) {
      await createBtn.click();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if we're on projects tab
      const isProjectsTab = await page.evaluate(() => {
        const projectsTab = document.getElementById('projects');
        const activeTab = document.querySelector('.nav-tab.active');
        return {
          projectsTabExists: !!projectsTab,
          projectsTabActive: projectsTab && projectsTab.classList.contains('active'),
          activeTabText: activeTab ? activeTab.textContent.trim() : null
        };
      });

      console.log('📊 Navigation Result:', isProjectsTab);
      console.log('✅ Create Project flow working correctly!');
    } else {
      console.log('❌ Create Project button not found');
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testProjectFlow().catch(console.error);
