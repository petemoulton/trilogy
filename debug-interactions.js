const puppeteer = require('puppeteer');

async function debugInteractions() {
  console.log('🔍 Debugging Node Interactions...');

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

    // Test tooltip setup
    const tooltipSetup = await page.evaluate(() => {
      const tooltip = window.agentDeployment?.currentTooltip;
      const container = document.getElementById('agent-graph-container');
      return {
        tooltipExists: !!tooltip,
        tooltipId: tooltip?.id,
        tooltipParent: tooltip?.parentElement?.id,
        containerExists: !!container,
        agentDeploymentExists: !!window.agentDeployment
      };
    });

    console.log('🔍 Tooltip Setup:');
    console.log(`   Tooltip exists: ${tooltipSetup.tooltipExists ? '✅' : '❌'}`);
    console.log(`   Container exists: ${tooltipSetup.containerExists ? '✅' : '❌'}`);
    console.log(`   AgentDeployment state: ${tooltipSetup.agentDeploymentExists ? '✅' : '❌'}`);

    // Test node clicking
    console.log('\\n🖱️  Testing node selection...');
    const nodeClickResult = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.agent-node');
      if (nodes.length === 0) return { error: 'No nodes found' };

      const firstNode = nodes[0];
      const agentId = firstNode.getAttribute('data-agent-id');
      const nodeName = firstNode.querySelector('.n8n-text.title')?.textContent;

      // Check if selectAgent function exists
      const selectAgentExists = typeof window.selectAgent === 'function';

      // Try to simulate click
      let clickResult = null;
      try {
        firstNode.click();
        clickResult = 'success';
      } catch (error) {
        clickResult = error.message;
      }

      // Check selection state after click
      const selectedAgents = window.agentDeployment?.selectedAgents || [];
      const isNodeSelected = firstNode.classList.contains('selected');

      return {
        nodeCount: nodes.length,
        agentId,
        nodeName,
        selectAgentExists,
        clickResult,
        selectedCount: selectedAgents.length,
        isNodeSelected,
        selectedAgentIds: selectedAgents.map(a => a.id)
      };
    });

    console.log('   Node Click Results:');
    console.log(`     Total nodes: ${nodeClickResult.nodeCount}`);
    console.log(`     First node ID: ${nodeClickResult.agentId}`);
    console.log(`     First node name: ${nodeClickResult.nodeName}`);
    console.log(`     selectAgent function: ${nodeClickResult.selectAgentExists ? '✅' : '❌'}`);
    console.log(`     Click simulation: ${nodeClickResult.clickResult}`);
    console.log(`     Selected agents: ${nodeClickResult.selectedCount}`);
    console.log(`     Node has selected class: ${nodeClickResult.isNodeSelected ? '✅' : '❌'}`);

    // Test hover behavior
    console.log('\\n🖱️  Testing hover behavior...');
    await page.hover('.agent-node');
    await new Promise(resolve => setTimeout(resolve, 500));

    const hoverResult = await page.evaluate(() => {
      const tooltip = window.agentDeployment?.currentTooltip;
      const isTooltipVisible = tooltip && tooltip.classList.contains('visible');
      const tooltipContent = tooltip ? tooltip.innerHTML : 'no tooltip';
      const handles = document.querySelectorAll('.n8n-handle');
      const visibleHandles = Array.from(handles).filter(h =>
        window.getComputedStyle(h).opacity > 0
      ).length;

      return {
        isTooltipVisible,
        tooltipContent: tooltipContent.substring(0, 100) + '...',
        totalHandles: handles.length,
        visibleHandles
      };
    });

    console.log('   Hover Results:');
    console.log(`     Tooltip visible: ${hoverResult.isTooltipVisible ? '✅' : '❌'}`);
    console.log(`     Tooltip content: ${hoverResult.tooltipContent}`);
    console.log(`     Total handles: ${hoverResult.totalHandles}`);
    console.log(`     Visible handles on hover: ${hoverResult.visibleHandles}`);

    // Test real user interaction
    console.log('\\n🖱️  Testing real user click...');
    try {
      await page.click('.agent-node', { delay: 100 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      const realClickResult = await page.evaluate(() => {
        const selectedAgents = window.agentDeployment?.selectedAgents || [];
        const selectedNodes = document.querySelectorAll('.agent-node.selected');
        const deployBtn = document.getElementById('confirm-deployment-btn');

        return {
          selectedAgentsCount: selectedAgents.length,
          selectedNodesCount: selectedNodes.length,
          deployBtnEnabled: deployBtn && !deployBtn.disabled,
          firstSelectedAgent: selectedAgents[0]?.name || 'none'
        };
      });

      console.log('   Real Click Results:');
      console.log(`     Selected agents: ${realClickResult.selectedAgentsCount}`);
      console.log(`     Selected nodes (CSS): ${realClickResult.selectedNodesCount}`);
      console.log(`     Deploy button enabled: ${realClickResult.deployBtnEnabled ? '✅' : '❌'}`);
      console.log(`     First selected: ${realClickResult.firstSelectedAgent}`);

    } catch (error) {
      console.log(`   Real click failed: ${error.message}`);
    }

    // Keep browser open for manual testing
    console.log('\\n👀 Browser staying open for 15 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 15000));

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugInteractions().catch(console.error);
