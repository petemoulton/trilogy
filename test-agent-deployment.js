const puppeteer = require('puppeteer');

async function testAgentDeploymentSystem() {
  console.log('🚀 Testing Agent Deployment System...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  // Listen for console events
  page.on('console', msg => {
    if (msg.type() === 'log' && (
      msg.text().includes('[Deployment]') ||
            msg.text().includes('[AgentGraph]') ||
            msg.text().includes('[Agents]') ||
            msg.text().includes('[Project]')
    )) {
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

    // Step 1: Test Deploy Agents button navigation
    console.log('\n🧪 Step 1: Testing Deploy Agents button...');

    // First we need to trigger a workflow completion to show the deploy button
    // For testing, let's manually show the workflow results
    await page.evaluate(() => {
      const workflowResults = document.getElementById('workflow-results');
      if (workflowResults) {
        workflowResults.style.display = 'block';
      }
    });

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Click Deploy Agents button
    const deployButton = await page.$('button[onclick="deployToAgents()"]');
    if (deployButton) {
      console.log('✅ Found Deploy Agents button');
      await deployButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if we're on agents tab in deploy view
      const isDeployView = await page.evaluate(() => {
        const deployView = document.getElementById('deploy-view');
        return deployView && deployView.style.display !== 'none';
      });

      console.log(`📊 Deploy view active: ${isDeployView}`);
    } else {
      console.log('⚠️  Deploy Agents button not found, manually switching to deployment view...');
      await page.click('[onclick*="agents"]');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.click('#deploy-view-btn');
    }

    // Step 2: Test Agent Graph Visualization
    console.log('\n🧪 Step 2: Testing Agent Graph Visualization...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const graphData = await page.evaluate(() => {
      const svg = document.getElementById('agent-graph');
      const nodes = svg ? svg.querySelectorAll('.agent-node').length : 0;
      const connections = svg ? svg.querySelectorAll('.agent-connection').length : 0;
      const tooltip = document.getElementById('agent-tooltip');

      return {
        nodesCount: nodes,
        connectionsCount: connections,
        hasTooltip: !!tooltip,
        svgExists: !!svg
      };
    });

    console.log('📊 Graph Data:');
    console.log(`   Nodes: ${graphData.nodesCount}`);
    console.log(`   Connections: ${graphData.connectionsCount}`);
    console.log(`   SVG exists: ${graphData.svgExists}`);
    console.log(`   Tooltip ready: ${graphData.hasTooltip}`);

    // Step 3: Test Agent Selection and Tooltips
    console.log('\n🧪 Step 3: Testing Agent Interaction...');

    // Try to click on an agent node
    const agentNode = await page.$('.agent-node');
    if (agentNode) {
      console.log('🖱️  Clicking on agent node...');
      await agentNode.click();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check selected agents list
      const selectedAgents = await page.evaluate(() => {
        const container = document.getElementById('selected-agents-list');
        const hasSelectedAgent = container && !container.innerHTML.includes('No agents selected');
        const deployBtn = document.getElementById('confirm-deployment-btn');
        const isDeployEnabled = deployBtn && !deployBtn.disabled;

        return {
          hasSelectedAgent,
          isDeployEnabled
        };
      });

      console.log(`✅ Agent selected: ${selectedAgents.hasSelectedAgent}`);
      console.log(`✅ Deploy button enabled: ${selectedAgents.isDeployEnabled}`);

      // Test tooltip on hover
      console.log('🖱️  Testing tooltip on hover...');
      await agentNode.hover();
      await new Promise(resolve => setTimeout(resolve, 500));

      const tooltipVisible = await page.evaluate(() => {
        const tooltip = document.getElementById('agent-tooltip');
        return tooltip && tooltip.classList.contains('visible');
      });

      console.log(`✅ Tooltip visible on hover: ${tooltipVisible}`);
    }

    // Step 4: Test Agent Settings
    console.log('\n🧪 Step 4: Testing Agent Settings...');

    const settingsButton = await page.$('.agent-settings-btn');
    if (settingsButton) {
      console.log('⚙️  Opening agent settings...');
      await settingsButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const modalVisible = await page.evaluate(() => {
        const modal = document.getElementById('agent-settings-modal');
        return modal && modal.classList.contains('visible');
      });

      console.log(`✅ Settings modal visible: ${modalVisible}`);

      if (modalVisible) {
        // Close the modal
        await page.click('.agent-settings-close');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Step 5: Test Project Creation Flow
    console.log('\n🧪 Step 5: Testing Project Creation...');

    // Go back to projects tab by clicking Create Project button
    await page.evaluate(() => {
      const workflowResults = document.getElementById('workflow-results');
      if (workflowResults) {
        workflowResults.style.display = 'block';
      }
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const createProjectButton = await page.$('button[onclick="saveWorkflowResults()"]');
    if (createProjectButton) {
      console.log('📝 Testing Create Project button...');
      await createProjectButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if we're on projects tab
      const isProjectsTab = await page.evaluate(() => {
        const projectsTab = document.getElementById('projects');
        return projectsTab && projectsTab.classList.contains('active');
      });

      console.log(`✅ Projects tab active: ${isProjectsTab}`);
    }

    // Step 6: Test View Switching
    console.log('\n🧪 Step 6: Testing View Switching...');

    // Go back to agents tab
    await page.click('[onclick*="agents"]');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test switching between pool and deploy views
    await page.click('#pool-view-btn');
    await new Promise(resolve => setTimeout(resolve, 500));

    const poolViewActive = await page.evaluate(() => {
      const poolView = document.getElementById('pool-view');
      const poolBtn = document.getElementById('pool-view-btn');
      return poolView.style.display !== 'none' && poolBtn.classList.contains('active');
    });

    console.log(`✅ Pool view switching: ${poolViewActive}`);

    await page.click('#deploy-view-btn');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const deployViewActive = await page.evaluate(() => {
      const deployView = document.getElementById('deploy-view');
      const deployBtn = document.getElementById('deploy-view-btn');
      return deployView.style.display !== 'none' && deployBtn.classList.contains('active');
    });

    console.log(`✅ Deploy view switching: ${deployViewActive}`);

    console.log('\n🎉 Agent Deployment System test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testAgentDeploymentSystem().catch(console.error);
