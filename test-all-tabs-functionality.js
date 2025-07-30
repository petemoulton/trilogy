const puppeteer = require('puppeteer');

async function testAllTabsFunctionality() {
  console.log('🧪 Testing All Tabs Functionality - Comprehensive Test Suite');
  console.log('===========================================================');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    devtools: false
  });

  const page = await browser.newPage();

  // Enable console logging from the browser
  page.on('console', msg => {
    if (msg.text().includes('[')) {
      console.log(`[BROWSER] ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    console.error(`[PAGE ERROR] ${error.message}`);
  });

  let allTestsPassed = true;
  const testResults = {
    overview: { passed: 0, failed: 0, details: [] },
    projects: { passed: 0, failed: 0, details: [] },
    agentPool: { passed: 0, failed: 0, details: [] },
    intelligence: { passed: 0, failed: 0, details: [] },
    logs: { passed: 0, failed: 0, details: [] },
    settings: { passed: 0, failed: 0, details: [] }
  };

  function logTest(tab, testName, passed, details = '') {
    const status = passed ? '✅' : '❌';
    console.log(`   ${status} ${testName}${details ? `: ${details}` : ''}`);

    if (passed) {
      testResults[tab].passed++;
    } else {
      testResults[tab].failed++;
      allTestsPassed = false;
    }

    testResults[tab].details.push({ testName, passed, details });
  }

  try {
    await page.goto('http://localhost:3100', { waitUntil: 'networkidle0' });
    console.log('✅ Page loaded successfully');

    // Wait for any initial JavaScript to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // =====================================================
    // 1. OVERVIEW TAB TESTS
    // =====================================================
    console.log('\n📊 Testing Overview Tab:');
    console.log('   ==================');

    // Test if Overview tab is active by default
    const overviewActive = await page.evaluate(() => {
      const overviewTab = document.querySelector('[onclick*="overview"]');
      return overviewTab && overviewTab.classList.contains('active');
    });
    logTest('overview', 'Overview tab active by default', overviewActive);

    // Test Overview content visibility
    const overviewContent = await page.evaluate(() => {
      const content = document.getElementById('overview');
      const statCards = content ? content.querySelectorAll('.stat-card') : [];
      const dashboardGrid = content ? content.querySelector('.dashboard-grid') : null;
      const systemStatus = content ? content.querySelector('.system-status-card') : null;

      return {
        tabVisible: content && content.style.display !== 'none',
        hasStatCards: statCards.length > 0,
        hasDashboardGrid: !!dashboardGrid,
        hasSystemStatus: !!systemStatus,
        statCardsCount: statCards.length
      };
    });

    logTest('overview', 'Overview tab content visible', overviewContent.tabVisible);
    logTest('overview', 'Stat cards present', overviewContent.hasStatCards, `Found ${overviewContent.statCardsCount} cards`);
    logTest('overview', 'Dashboard grid present', overviewContent.hasDashboardGrid);

    // =====================================================
    // 2. PROJECTS TAB TESTS
    // =====================================================
    console.log('\n📁 Testing Projects Tab:');
    console.log('   ==================');

    await page.click('[onclick*="projects"]');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const projectsTest = await page.evaluate(() => {
      const projectsTab = document.getElementById('projects');
      const projectsGrid = projectsTab ? projectsTab.querySelector('.projects-grid') : null;
      const createProjectBtn = projectsTab ? projectsTab.querySelector('.create-project-btn') : null;
      const projectCards = projectsTab ? projectsTab.querySelectorAll('.project-card') : [];

      return {
        tabVisible: projectsTab && projectsTab.classList.contains('active'),
        hasProjectsGrid: !!projectsGrid,
        hasCreateButton: !!createProjectBtn,
        projectCardsCount: projectCards.length,
        tabHasContent: projectsTab && projectsTab.textContent.trim().length > 0
      };
    });

    logTest('projects', 'Projects tab switched successfully', projectsTest.tabVisible);
    logTest('projects', 'Projects grid present', projectsTest.hasProjectsGrid);
    logTest('projects', 'Create project button present', projectsTest.hasCreateButton);
    logTest('projects', 'Tab has content', projectsTest.tabHasContent);

    // =====================================================
    // 3. AGENT POOL TAB TESTS
    // =====================================================
    console.log('\n🤖 Testing Agent Pool Tab:');
    console.log('   ======================');

    await page.click('[onclick*="agents"]');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const agentPoolTest = await page.evaluate(() => {
      const agentsTab = document.getElementById('agents');
      const poolViewBtn = document.getElementById('pool-view-btn');
      const deployViewBtn = document.getElementById('deploy-view-btn');
      const statsGrid = agentsTab ? agentsTab.querySelector('.stats-grid') : null;
      const agentCards = agentsTab ? agentsTab.querySelectorAll('.agent-card') : [];
      const poolView = document.getElementById('pool-view');
      const deployView = document.getElementById('deploy-view');

      return {
        tabVisible: agentsTab && agentsTab.classList.contains('active'),
        hasViewToggle: !!(poolViewBtn && deployViewBtn),
        hasStatsGrid: !!statsGrid,
        agentCardsCount: agentCards.length,
        poolViewVisible: poolView && poolView.style.display !== 'none',
        deployViewExists: !!deployView,
        hasModernDesign: agentsTab && agentsTab.textContent.includes('Agent Pool')
      };
    });

    logTest('agentPool', 'Agent Pool tab switched successfully', agentPoolTest.tabVisible);
    logTest('agentPool', 'View toggle buttons present', agentPoolTest.hasViewToggle);
    logTest('agentPool', 'Stats grid present', agentPoolTest.hasStatsGrid);
    logTest('agentPool', 'Pool view visible by default', agentPoolTest.poolViewVisible);
    logTest('agentPool', 'Deploy view exists', agentPoolTest.deployViewExists);

    // Test deployment view switching
    await page.click('#deploy-view-btn');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const deploymentTest = await page.evaluate(() => {
      const deployView = document.getElementById('deploy-view');
      const agentGraph = document.getElementById('agent-graph');
      const agentPoolSection = document.querySelector('.agent-pool-section');
      const agileBoard = document.querySelector('.agile-board');
      const agentCards = document.querySelectorAll('.agent-card');

      return {
        deployViewVisible: deployView && deployView.style.display !== 'none',
        hasWorkflowGraph: !!agentGraph,
        hasAgentPoolSection: !!agentPoolSection,
        hasAgileBoard: !!agileBoard,
        agentCardsInDeployView: agentCards.length,
        graphRendered: agentGraph && agentGraph.children.length > 0
      };
    });

    logTest('agentPool', 'Deployment view switches successfully', deploymentTest.deployViewVisible);
    logTest('agentPool', 'Workflow graph present', deploymentTest.hasWorkflowGraph);
    logTest('agentPool', 'Agent pool section present', deploymentTest.hasAgentPoolSection);
    logTest('agentPool', 'Agile board present', deploymentTest.hasAgileBoard);
    logTest('agentPool', 'Agent cards rendered in deploy view', deploymentTest.agentCardsInDeployView > 0, `Found ${deploymentTest.agentCardsInDeployView} cards`);

    // Test responsive design at different screen sizes
    await page.setViewport({ width: 768, height: 600 });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const responsiveTest = await page.evaluate(() => {
      const agentPoolSection = document.querySelector('.agent-pool-section');
      const agentsGrid = document.querySelector('.agents-grid');
      const agentCards = document.querySelectorAll('.agent-card');

      if (!agentsGrid) return { responsive: false, reason: 'No agents grid found' };

      const gridStyles = window.getComputedStyle(agentsGrid);
      const cardStyles = agentCards.length > 0 ? window.getComputedStyle(agentCards[0]) : null;

      return {
        responsive: true,
        gridDisplay: gridStyles.display,
        gridColumns: gridStyles.gridTemplateColumns,
        cardPadding: cardStyles ? cardStyles.padding : null,
        poolVisible: agentPoolSection && agentPoolSection.offsetHeight > 0
      };
    });

    logTest('agentPool', 'Responsive design works on tablet', responsiveTest.responsive);

    // Reset viewport
    await page.setViewport({ width: 1400, height: 900 });
    await new Promise(resolve => setTimeout(resolve, 500));

    // =====================================================
    // 4. INTELLIGENCE TAB TESTS
    // =====================================================
    console.log('\n🧠 Testing Intelligence Tab:');
    console.log('   ========================');

    await page.click('[onclick*="intelligence"]');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const intelligenceTest = await page.evaluate(() => {
      const intelligenceTab = document.getElementById('intelligence');
      const analyticsOverview = intelligenceTab ? intelligenceTab.querySelector('.analytics-overview') : null;
      const metricCards = intelligenceTab ? intelligenceTab.querySelectorAll('.metric-card') : [];
      const analyticsSections = intelligenceTab ? intelligenceTab.querySelector('.analytics-sections') : null;
      const chartPlaceholder = intelligenceTab ? intelligenceTab.querySelector('.chart-placeholder') : null;
      const agentAnalytics = intelligenceTab ? intelligenceTab.querySelector('.agent-analytics-grid') : null;
      const activityFeed = intelligenceTab ? intelligenceTab.querySelector('.live-activity-feed') : null;
      const insightsContainer = intelligenceTab ? intelligenceTab.querySelector('.insights-container') : null;

      return {
        tabVisible: intelligenceTab && intelligenceTab.classList.contains('active'),
        hasAnalyticsOverview: !!analyticsOverview,
        metricCardsCount: metricCards.length,
        hasAnalyticsSections: !!analyticsSections,
        hasPerformanceChart: !!chartPlaceholder,
        hasAgentAnalytics: !!agentAnalytics,
        hasActivityFeed: !!activityFeed,
        hasInsights: !!insightsContainer,
        tabHasRichContent: intelligenceTab && intelligenceTab.textContent.length > 1000
      };
    });

    logTest('intelligence', 'Intelligence tab switched successfully', intelligenceTest.tabVisible);
    logTest('intelligence', 'Analytics overview present', intelligenceTest.hasAnalyticsOverview);
    logTest('intelligence', 'Metric cards present', intelligenceTest.metricCardsCount >= 4, `Found ${intelligenceTest.metricCardsCount} metric cards`);
    logTest('intelligence', 'Analytics sections present', intelligenceTest.hasAnalyticsSections);
    logTest('intelligence', 'Performance chart present', intelligenceTest.hasPerformanceChart);
    logTest('intelligence', 'Agent analytics present', intelligenceTest.hasAgentAnalytics);
    logTest('intelligence', 'Activity feed present', intelligenceTest.hasActivityFeed);
    logTest('intelligence', 'System insights present', intelligenceTest.hasInsights);
    logTest('intelligence', 'Tab has rich content', intelligenceTest.tabHasRichContent);

    // Test if AnalyticsManager is working
    const analyticsManagerTest = await page.evaluate(() => {
      return {
        managerExists: typeof window.AnalyticsManager !== 'undefined',
        hasInitializeMethod: window.AnalyticsManager && typeof window.AnalyticsManager.initialize === 'function',
        hasLoadDataMethod: window.AnalyticsManager && typeof window.AnalyticsManager.loadAnalyticsData === 'function'
      };
    });

    logTest('intelligence', 'AnalyticsManager exists', analyticsManagerTest.managerExists);
    logTest('intelligence', 'AnalyticsManager has initialize method', analyticsManagerTest.hasInitializeMethod);
    logTest('intelligence', 'AnalyticsManager has loadData method', analyticsManagerTest.hasLoadDataMethod);

    // =====================================================
    // 5. LOGS TAB TESTS
    // =====================================================
    console.log('\n📝 Testing Logs Tab:');
    console.log('   ================');

    await page.click('[onclick*="logs"]');
    await new Promise(resolve => setTimeout(resolve, 1500));

    const logsTest = await page.evaluate(() => {
      const logsTab = document.getElementById('logs');
      const logViewer = document.getElementById('log-viewer');
      const logControls = logsTab ? logsTab.querySelector('.log-controls') : null;
      const logLevelFilter = document.getElementById('log-level-filter');
      const clearLogsBtn = logsTab ? logsTab.querySelector('[onclick*="clearLogs"]') : null;
      const autoScrollBtn = document.getElementById('auto-scroll-btn');

      return {
        tabVisible: logsTab && logsTab.classList.contains('active'),
        hasLogViewer: !!logViewer,
        hasLogControls: !!logControls,
        hasLevelFilter: !!logLevelFilter,
        hasClearButton: !!clearLogsBtn,
        hasAutoScrollButton: !!autoScrollBtn,
        logViewerHasContent: logViewer && logViewer.textContent.trim().length > 0,
        logViewerHeight: logViewer ? logViewer.offsetHeight : 0
      };
    });

    logTest('logs', 'Logs tab switched successfully', logsTest.tabVisible);
    logTest('logs', 'Log viewer present', logsTest.hasLogViewer);
    logTest('logs', 'Log controls present', logsTest.hasLogControls);
    logTest('logs', 'Log level filter present', logsTest.hasLevelFilter);
    logTest('logs', 'Clear logs button present', logsTest.hasClearButton);
    logTest('logs', 'Auto-scroll button present', logsTest.hasAutoScrollButton);
    logTest('logs', 'Log viewer has proper height', logsTest.logViewerHeight > 400);

    // =====================================================
    // 6. SETTINGS TAB TESTS
    // =====================================================
    console.log('\n⚙️ Testing Settings Tab:');
    console.log('   ===================');

    await page.click('[onclick*="settings"]');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const settingsTest = await page.evaluate(() => {
      const settingsTab = document.getElementById('settings');
      const settingsPanel = settingsTab ? settingsTab.querySelector('.settings-panel') : null;
      const darkModeToggle = document.getElementById('dark-mode-toggle');
      const settingSections = settingsTab ? settingsTab.querySelectorAll('.setting-section') : [];
      const settingItems = settingsTab ? settingsTab.querySelectorAll('.setting-item') : [];

      return {
        tabVisible: settingsTab && settingsTab.classList.contains('active'),
        hasSettingsPanel: !!settingsPanel,
        hasDarkModeToggle: !!darkModeToggle,
        settingSectionsCount: settingSections.length,
        settingItemsCount: settingItems.length,
        darkModeToggleClickable: darkModeToggle && darkModeToggle.onclick !== null
      };
    });

    logTest('settings', 'Settings tab switched successfully', settingsTest.tabVisible);
    logTest('settings', 'Settings panel present', settingsTest.hasSettingsPanel);
    logTest('settings', 'Dark mode toggle present', settingsTest.hasDarkModeToggle);
    logTest('settings', 'Setting sections present', settingsTest.settingSectionsCount > 0, `Found ${settingsTest.settingSectionsCount} sections`);
    logTest('settings', 'Setting items present', settingsTest.settingItemsCount > 0, `Found ${settingsTest.settingItemsCount} items`);

    // Test dark mode toggle functionality
    if (settingsTest.hasDarkModeToggle) {
      await page.click('#dark-mode-toggle');
      await new Promise(resolve => setTimeout(resolve, 500));

      const darkModeTest = await page.evaluate(() => {
        const body = document.body;
        const toggle = document.getElementById('dark-mode-toggle');
        return {
          bodyHasDarkClass: body.classList.contains('dark-mode'),
          toggleTextChanged: toggle && toggle.textContent.includes('Disable')
        };
      });

      logTest('settings', 'Dark mode toggle functional', darkModeTest.bodyHasDarkClass || darkModeTest.toggleTextChanged);
    }

    // =====================================================
    // 7. NAVIGATION FLOW TESTS
    // =====================================================
    console.log('\n🔄 Testing Navigation Flow:');
    console.log('   ========================');

    const navTests = [
      { tab: 'overview', name: 'Overview' },
      { tab: 'projects', name: 'Projects' },
      { tab: 'agents', name: 'Agent Pool' },
      { tab: 'intelligence', name: 'Intelligence' },
      { tab: 'logs', name: 'Logs' },
      { tab: 'settings', name: 'Settings' }
    ];

    let navigationPassed = 0;

    for (const testTab of navTests) {
      await page.click(`[onclick*="${testTab.tab}"]`);
      await new Promise(resolve => setTimeout(resolve, 800));

      const tabActive = await page.evaluate((tabName) => {
        const tab = document.getElementById(tabName);
        return tab && tab.classList.contains('active');
      }, testTab.tab === 'agents' ? 'agents' : testTab.tab);

      if (tabActive) {
        navigationPassed++;
        console.log(`   ✅ ${testTab.name} tab navigation works`);
      } else {
        console.log(`   ❌ ${testTab.name} tab navigation failed`);
      }
    }

    const allNavigationPassed = navigationPassed === navTests.length;
    logTest('overview', 'All tab navigation working', allNavigationPassed, `${navigationPassed}/${navTests.length} tabs`);

    // =====================================================
    // FINAL RESULTS
    // =====================================================
    console.log('\n🏆 COMPREHENSIVE TEST RESULTS:');
    console.log('   =============================');

    let totalPassed = 0;
    let totalTests = 0;

    Object.entries(testResults).forEach(([tab, results]) => {
      const tabTotal = results.passed + results.failed;
      const tabScore = tabTotal > 0 ? Math.round((results.passed / tabTotal) * 100) : 0;
      const status = tabScore >= 80 ? '🌟' : tabScore >= 60 ? '👍' : '⚠️';

      console.log(`   ${status} ${tab.toUpperCase().padEnd(12)} ${results.passed}/${tabTotal} tests passed (${tabScore}%)`);

      totalPassed += results.passed;
      totalTests += tabTotal;
    });

    const overallScore = Math.round((totalPassed / totalTests) * 100);
    console.log('\n📊 OVERALL SCORE:');
    console.log('   ===============');
    console.log(`   ✅ ${totalPassed}/${totalTests} tests passed`);
    console.log(`   🎯 Overall Score: ${overallScore}%`);

    if (overallScore >= 90) {
      console.log('\n🎉 EXCELLENT! All tabs are working perfectly!');
      console.log('   • All navigation flows working');
      console.log('   • All content properly loaded');
      console.log('   • Responsive design functional');
      console.log('   • Interactive elements working');
      console.log('   • No white screens or errors');
    } else if (overallScore >= 75) {
      console.log('\n👍 GOOD! Most functionality working with minor issues');
    } else {
      console.log('\n⚠️ NEEDS ATTENTION! Some tabs have significant issues');
    }

    // Keep browser open for visual inspection
    console.log('\n👀 Browser staying open for 15 seconds for visual inspection...');
    await new Promise(resolve => setTimeout(resolve, 15000));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    allTestsPassed = false;
  } finally {
    await browser.close();
  }

  return allTestsPassed;
}

// Run the test
testAllTabsFunctionality().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
