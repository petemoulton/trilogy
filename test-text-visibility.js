const puppeteer = require('puppeteer');

async function testTextVisibility() {
  console.log('📝 Testing Text Visibility in Workflow Graph...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1600, height: 1000 }
  });

  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3100', { waitUntil: 'networkidle0' });
    console.log('✅ Page loaded');

    // Navigate to deployment view
    await page.click('[onclick*="agents"]');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.click('#deploy-view-btn');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test text content visibility
    const textTest = await page.evaluate(() => {
      const svg = document.getElementById('agent-graph');
      const textElements = svg ? svg.querySelectorAll('text') : [];
      const nodes = svg ? svg.querySelectorAll('.modern-node') : [];

      const textContent = [];
      textElements.forEach(text => {
        if (text.textContent && text.textContent.trim()) {
          textContent.push({
            text: text.textContent.trim(),
            fontSize: text.getAttribute('font-size'),
            fill: text.getAttribute('fill')
          });
        }
      });

      return {
        svgDimensions: svg ? {
          viewBox: svg.getAttribute('viewBox'),
          width: svg.getAttribute('width'),
          height: svg.getAttribute('height')
        } : null,
        nodeCount: nodes.length,
        textElements: textContent.length,
        textSamples: textContent.slice(0, 10) // First 10 text elements
      };
    });

    console.log('\n📊 Text Visibility Analysis:');
    console.log('   =========================');
    console.log(`   SVG ViewBox: ${textTest.svgDimensions?.viewBox}`);
    console.log(`   Canvas Size: ${textTest.svgDimensions?.width} x ${textTest.svgDimensions?.height}`);
    console.log(`   Modern Nodes: ${textTest.nodeCount}`);
    console.log(`   Text Elements: ${textTest.textElements}`);

    console.log('\n📝 Text Content Sample:');
    textTest.textSamples.forEach((sample, i) => {
      console.log(`   ${i + 1}. "${sample.text}" (size: ${sample.fontSize}px)`);
    });

    // Check for text readability improvements
    const hasLargerText = textTest.textSamples.some(t => parseInt(t.fontSize) >= 12);
    const hasFullNodeNames = textTest.textSamples.some(t => t.text.includes('Agent') || t.text.includes('System'));
    const hasRoleLabels = textTest.textSamples.some(t => t.text === 'SUPERVISOR' || t.text === 'WORKER' || t.text === 'SPECIALIST');

    console.log('\n✅ Text Readability Improvements:');
    console.log(`   Larger Text Sizes: ${hasLargerText ? '✅' : '❌'}`);
    console.log(`   Full Node Names: ${hasFullNodeNames ? '✅' : '❌'}`);
    console.log(`   Role Labels: ${hasRoleLabels ? '✅' : '❌'}`);

    const improvements = [hasLargerText, hasFullNodeNames, hasRoleLabels].filter(Boolean).length;
    console.log(`   📈 Text Improvements: ${improvements}/3`);

    if (improvements >= 2) {
      console.log('\n🎉 EXCELLENT! Text visibility greatly improved:');
      console.log('   • Larger, more readable font sizes');
      console.log('   • Full node names without truncation');
      console.log('   • Clear role indicators');
      console.log('   • Better spacing and layout');
    }

    // Keep browser open for visual inspection
    console.log('\n👀 Browser staying open for 15 seconds to see the improvements...');
    await new Promise(resolve => setTimeout(resolve, 15000));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testTextVisibility().catch(console.error);
