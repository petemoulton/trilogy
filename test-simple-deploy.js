const puppeteer = require('puppeteer');

async function testSimpleDeployment() {
  console.log('🚀 Simple Agent Deployment Test...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3100', { waitUntil: 'networkidle0' });
    console.log('✅ Page loaded');

    // Go directly to agents tab
    console.log('🖱️  Clicking Agents tab...');
    await page.click('[onclick*="agents"]');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Click deployment view
    console.log('🖱️  Switching to deployment view...');
    await page.click('#deploy-view-btn');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if graph is loaded
    const graphInfo = await page.evaluate(() => {
      const svg = document.getElementById('agent-graph');
      const nodes = svg ? svg.querySelectorAll('.agent-node') : [];
      const nodeData = Array.from(nodes).map(node => ({
        id: node.getAttribute('data-agent-id'),
        class: node.className.baseVal || node.className
      }));

      return {
        svgExists: !!svg,
        nodeCount: nodes.length,
        nodes: nodeData
      };
    });

    console.log('📊 Graph Status:', graphInfo);

    if (graphInfo.nodeCount > 0) {
      console.log('🖱️  Trying to click first agent node...');
      await page.click('.agent-node');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const selectionStatus = await page.evaluate(() => {
        const selectedList = document.getElementById('selected-agents-list');
        const deployBtn = document.getElementById('confirm-deployment-btn');
        return {
          hasSelection: selectedList && !selectedList.innerHTML.includes('No agents selected'),
          deployEnabled: deployBtn && !deployBtn.disabled
        };
      });

      console.log('✅ Selection Status:', selectionStatus);
    }

    console.log('✅ Test completed - check browser for visual verification');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Keep browser open for manual inspection

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testSimpleDeployment().catch(console.error);
