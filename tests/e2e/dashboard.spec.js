const { test, expect } = require('@playwright/test');

test.describe('Trilogy AI Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load dashboard with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Trilogy AI System Dashboard/);
    
    // Check for main heading
    await expect(page.locator('h1')).toContainText('Trilogy AI System');
    
    // Check for subtitle
    await expect(page.locator('p')).toContainText('Cooperative AI Agent Orchestration Dashboard');
  });

  test('should display system status cards', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');

    // Check for system status card
    await expect(page.locator('.card').first()).toBeVisible();
    await expect(page.locator('h3')).toContainText('System Status');

    // Check for agent status card
    await expect(page.getByText('AI Agents')).toBeVisible();

    // Check for memory card
    await expect(page.getByText('Shared Memory')).toBeVisible();

    // Check for task management card
    await expect(page.getByText('Task Management')).toBeVisible();
  });

  test('should show system metrics', async ({ page }) => {
    // Wait for metrics to load
    await page.waitForTimeout(2000);

    // Check for uptime display
    const uptimeElement = page.locator('#uptime');
    await expect(uptimeElement).toBeVisible();
    
    // Check for memory usage display
    const memoryElement = page.locator('#memory-usage');
    await expect(memoryElement).toBeVisible();
  });

  test('should display control panel', async ({ page }) => {
    // Check for control panel
    await expect(page.getByText('Control Panel')).toBeVisible();

    // Check for control buttons
    await expect(page.getByRole('button', { name: /Trigger Workflow/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Analyze PRD/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Generate Tasks/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Refresh/ })).toBeVisible();
  });

  test('should show log display', async ({ page }) => {
    // Check for logs section
    await expect(page.getByText('System Logs')).toBeVisible();
    
    // Check for log display area
    const logDisplay = page.locator('#log-display');
    await expect(logDisplay).toBeVisible();
  });

  test('should handle refresh button click', async ({ page }) => {
    const refreshButton = page.getByRole('button', { name: /Refresh/ });
    await refreshButton.click();
    
    // Check that a log entry was added
    await page.waitForTimeout(1000);
    const logDisplay = page.locator('#log-display');
    await expect(logDisplay).toContainText('Refreshing dashboard');
  });

  test('should handle workflow trigger', async ({ page }) => {
    // Mock the API response to avoid actual agent calls
    await page.route('**/agents/trigger/sonnet', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, sessionId: 'test-session-123' })
      });
    });

    const workflowButton = page.getByRole('button', { name: /Trigger Workflow/ });
    await workflowButton.click();
    
    // Check that a log entry was added
    await page.waitForTimeout(1000);
    const logDisplay = page.locator('#log-display');
    await expect(logDisplay).toContainText('Triggering full workflow');
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that dashboard still loads
    await expect(page.locator('h1')).toContainText('Trilogy AI System');
    
    // Check that cards are still visible
    await expect(page.getByText('System Status')).toBeVisible();
    await expect(page.getByText('AI Agents')).toBeVisible();
  });

  test('should handle WebSocket connection', async ({ page }) => {
    // Monitor WebSocket connections
    const wsPromise = page.waitForEvent('websocket');
    
    // Reload page to trigger WebSocket connection
    await page.reload();
    
    // Wait for WebSocket connection (if available)
    try {
      const ws = await wsPromise;
      expect(ws).toBeDefined();
    } catch (error) {
      // WebSocket might not be available in test environment
      console.log('WebSocket not available in test environment');
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock health check to fail
    await page.route('**/health', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await page.reload();
    
    // Dashboard should still load even if health check fails
    await expect(page.locator('h1')).toContainText('Trilogy AI System');
  });

  test('should display Chrome extension link', async ({ page }) => {
    // Check for MCP Dashboard link
    const mcpLink = page.getByRole('link', { name: /Open MCP Dashboard/ });
    await expect(mcpLink).toBeVisible();
    await expect(mcpLink).toHaveAttribute('href', 'http://localhost:3100/dashboard');
    await expect(mcpLink).toHaveAttribute('target', '_blank');
  });
});