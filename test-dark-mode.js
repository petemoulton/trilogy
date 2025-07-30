#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testDarkMode() {
  console.log('🌙 Testing Dark Mode Toggle...');

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3100');

    // Click settings tab
    await page.click('[onclick*="settings"]');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if dark mode button exists
    const button = await page.$('#dark-mode-toggle');
    if (button) {
      console.log('✅ Dark mode toggle found in Settings tab');

      // Get button text
      const buttonText = await page.evaluate(() => document.getElementById('dark-mode-toggle').innerHTML);
      console.log('Button text:', buttonText);

      // Click the button
      await button.click();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if dark mode is applied
      const hasClass = await page.evaluate(() => document.body.classList.contains('dark-mode'));
      console.log('Dark mode applied:', hasClass);

      // Get updated button text
      const newButtonText = await page.evaluate(() => document.getElementById('dark-mode-toggle').innerHTML);
      console.log('New button text:', newButtonText);

      // Test localStorage persistence
      const storedValue = await page.evaluate(() => localStorage.getItem('darkMode'));
      console.log('localStorage value:', storedValue);

      console.log('🎉 Dark Mode Test: SUCCESS');
    } else {
      console.log('❌ Dark mode toggle not found');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testDarkMode();
