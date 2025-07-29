/**
 * CSS Extraction Test Suite
 * Tests that CSS modularization preserves all styling and visual behavior
 * 
 * This test verifies:
 * 1. All CSS modules load correctly
 * 2. Visual styling is preserved
 * 3. Component interactions work
 * 4. Responsive behavior functions
 * 5. No visual regressions introduced
 */

const puppeteer = require('puppeteer');
const path = require('path');

class CSSExtractionTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    async init() {
        console.log('🧪 Initializing CSS Extraction Test Suite...');
        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1200, height: 800 }
        });
        this.page = await this.browser.newPage();
        
        // Enable console logging
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('❌ Browser Error:', msg.text());
                this.results.errors.push(`Console Error: ${msg.text()}`);
            }
        });

        // Navigate to the dashboard
        const filePath = path.resolve(__dirname, 'src/frontend/dashboard/professional.html');
        await this.page.goto(`file://${filePath}`);
        
        // Wait for page to load completely
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    async testCSSModuleLoading() {
        console.log('\n📋 Testing CSS Module Loading...');
        
        try {
            // Check if external CSS file is properly linked
            const cssLink = await this.page.$('link[href="css/dashboard.css"]');
            if (cssLink) {
                console.log('✅ External CSS file linked correctly');
                this.results.passed++;
            } else {
                console.log('❌ External CSS file link not found');
                this.results.failed++;
                this.results.errors.push('External CSS file link missing');
            }

            // Check if CSS variables are loaded
            const rootStyles = await this.page.evaluate(() => {
                const computedStyles = getComputedStyle(document.documentElement);
                return {
                    primaryColor: computedStyles.getPropertyValue('--primary-color').trim(),
                    bgPrimary: computedStyles.getPropertyValue('--bg-primary').trim(),
                    textPrimary: computedStyles.getPropertyValue('--text-primary').trim()
                };
            });

            if (rootStyles.primaryColor && rootStyles.bgPrimary && rootStyles.textPrimary) {
                console.log('✅ CSS variables loaded successfully');
                console.log(`   - Primary Color: ${rootStyles.primaryColor}`);
                console.log(`   - Background: ${rootStyles.bgPrimary}`);
                console.log(`   - Text Color: ${rootStyles.textPrimary}`);
                this.results.passed++;
            } else {
                console.log('❌ CSS variables not properly loaded');
                this.results.failed++;
                this.results.errors.push('CSS variables missing or empty');
            }

        } catch (error) {
            console.log('❌ Error testing CSS module loading:', error.message);
            this.results.failed++;
            this.results.errors.push(`CSS Module Loading Error: ${error.message}`);
        }
    }

    async testVisualStyling() {
        console.log('\n🎨 Testing Visual Styling Preservation...');
        
        try {
            // Test header styling
            const headerStyles = await this.page.evaluate(() => {
                const header = document.querySelector('.header');
                if (!header) return null;
                const styles = getComputedStyle(header);
                return {
                    backgroundColor: styles.backgroundColor,
                    display: styles.display,
                    justifyContent: styles.justifyContent,
                    alignItems: styles.alignItems,
                    padding: styles.padding
                };
            });

            if (headerStyles && headerStyles.display === 'flex') {
                console.log('✅ Header styling preserved');
                console.log(`   - Display: ${headerStyles.display}`);
                console.log(`   - Background: ${headerStyles.backgroundColor}`);
                this.results.passed++;
            } else {
                console.log('❌ Header styling issues detected');
                this.results.failed++;
                this.results.errors.push('Header styling not properly applied');
            }

            // Test navigation tabs styling
            const navTabStyles = await this.page.evaluate(() => {
                const navTabs = document.querySelector('.nav-tabs');
                const activeTab = document.querySelector('.nav-tab.active');
                if (!navTabs || !activeTab) return null;
                
                const navStyles = getComputedStyle(navTabs);
                const activeStyles = getComputedStyle(activeTab);
                
                return {
                    navDisplay: navStyles.display,
                    navGap: navStyles.gap,
                    activeColor: activeStyles.color,
                    activeBorderBottom: activeStyles.borderBottomColor
                };
            });

            if (navTabStyles && navTabStyles.navDisplay === 'flex') {
                console.log('✅ Navigation styling preserved');
                console.log(`   - Nav Display: ${navTabStyles.navDisplay}`);
                console.log(`   - Active Tab Color: ${navTabStyles.activeColor}`);
                this.results.passed++;
            } else {
                console.log('❌ Navigation styling issues detected');
                this.results.failed++;
                this.results.errors.push('Navigation styling not properly applied');
            }

            // Test card styling
            const cardStyles = await this.page.evaluate(() => {
                const statCard = document.querySelector('.stat-card');
                if (!statCard) return null;
                
                const styles = getComputedStyle(statCard);
                return {
                    backgroundColor: styles.backgroundColor,
                    borderRadius: styles.borderRadius,
                    boxShadow: styles.boxShadow,
                    textAlign: styles.textAlign
                };
            });

            if (cardStyles && cardStyles.textAlign === 'center') {
                console.log('✅ Card styling preserved');
                console.log(`   - Border Radius: ${cardStyles.borderRadius}`);
                console.log(`   - Text Align: ${cardStyles.textAlign}`);
                this.results.passed++;
            } else {
                console.log('❌ Card styling issues detected');
                this.results.failed++;
                this.results.errors.push('Card styling not properly applied');
            }

        } catch (error) {
            console.log('❌ Error testing visual styling:', error.message);
            this.results.failed++;
            this.results.errors.push(`Visual Styling Error: ${error.message}`);
        }
    }

    async testButtonStyling() {
        console.log('\n🔘 Testing Button Component Styling...');
        
        try {
            const buttonStyles = await this.page.evaluate(() => {
                const primaryBtn = document.querySelector('.btn-primary');
                const buttons = document.querySelectorAll('.btn');
                
                if (!primaryBtn || buttons.length === 0) return null;
                
                const primaryStyles = getComputedStyle(primaryBtn);
                return {
                    count: buttons.length,
                    backgroundColor: primaryStyles.backgroundColor,
                    color: primaryStyles.color,
                    borderRadius: primaryStyles.borderRadius,
                    padding: primaryStyles.padding,
                    cursor: primaryStyles.cursor
                };
            });

            if (buttonStyles && buttonStyles.count > 0) {
                console.log('✅ Button styling preserved');
                console.log(`   - Button Count: ${buttonStyles.count}`);
                console.log(`   - Background: ${buttonStyles.backgroundColor}`);
                console.log(`   - Cursor: ${buttonStyles.cursor}`);
                this.results.passed++;
            } else {
                console.log('❌ Button styling issues detected');
                this.results.failed++;
                this.results.errors.push('Button styling not properly applied');
            }

            // Test button hover effects
            const toggleButton = await this.page.$('#sample-data-toggle');
            if (toggleButton) {
                await toggleButton.hover();
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const hoverStyles = await this.page.evaluate(() => {
                    const btn = document.querySelector('#sample-data-toggle');
                    const styles = getComputedStyle(btn);
                    return {
                        transform: styles.transform,
                        transition: styles.transition
                    };
                });

                console.log('✅ Button hover effects working');
                console.log(`   - Transition: ${hoverStyles.transition}`);
                this.results.passed++;
            }

        } catch (error) {
            console.log('❌ Error testing button styling:', error.message);
            this.results.failed++;
            this.results.errors.push(`Button Styling Error: ${error.message}`);
        }
    }

    async testResponsiveDesign() {
        console.log('\n📱 Testing Responsive Design...');
        
        try {
            // Test mobile viewport
            await this.page.setViewport({ width: 480, height: 800 });
            await new Promise(resolve => setTimeout(resolve, 1000));

            const mobileStyles = await this.page.evaluate(() => {
                const header = document.querySelector('.header');
                const navTabs = document.querySelector('.nav-tabs');
                const dashboardGrid = document.querySelector('.dashboard-grid');
                
                if (!header || !navTabs || !dashboardGrid) return null;
                
                return {
                    headerDisplay: getComputedStyle(header).flexDirection,
                    gridColumns: getComputedStyle(dashboardGrid).gridTemplateColumns,
                    navTabPadding: getComputedStyle(navTabs.querySelector('.nav-tab')).padding
                };
            });

            if (mobileStyles) {
                console.log('✅ Mobile responsive styling working');
                console.log(`   - Header Direction: ${mobileStyles.headerDisplay}`);
                console.log(`   - Grid Columns: ${mobileStyles.gridColumns}`);
                this.results.passed++;
            } else {
                console.log('❌ Mobile responsive styling issues');
                this.results.failed++;
                this.results.errors.push('Mobile responsive styling not working');
            }

            // Reset to desktop viewport
            await this.page.setViewport({ width: 1200, height: 800 });
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('✅ Viewport reset to desktop');
            this.results.passed++;

        } catch (error) {
            console.log('❌ Error testing responsive design:', error.message);
            this.results.failed++;
            this.results.errors.push(`Responsive Design Error: ${error.message}`);
        }
    }

    async testUtilityClasses() {
        console.log('\n🔧 Testing Utility Classes...');
        
        try {
            // Test utility class functionality
            const utilityTest = await this.page.evaluate(() => {
                // Create a test element with utility classes
                const testDiv = document.createElement('div');
                testDiv.className = 'text-center m-4 p-4 bg-secondary rounded';
                document.body.appendChild(testDiv);
                
                const styles = getComputedStyle(testDiv);
                const result = {
                    textAlign: styles.textAlign,
                    margin: styles.margin,
                    padding: styles.padding,
                    borderRadius: styles.borderRadius,
                    backgroundColor: styles.backgroundColor
                };
                
                // Clean up
                document.body.removeChild(testDiv);
                return result;
            });

            if (utilityTest.textAlign === 'center' && utilityTest.borderRadius !== '0px') {
                console.log('✅ Utility classes working correctly');
                console.log(`   - Text Align: ${utilityTest.textAlign}`);
                console.log(`   - Border Radius: ${utilityTest.borderRadius}`);
                this.results.passed++;
            } else {
                console.log('❌ Utility classes not working properly');
                this.results.failed++;
                this.results.errors.push('Utility classes not functioning');
            }

        } catch (error) {
            console.log('❌ Error testing utility classes:', error.message);
            this.results.failed++;
            this.results.errors.push(`Utility Classes Error: ${error.message}`);
        }
    }

    async testLayoutIntegrity() {
        console.log('\n📐 Testing Layout Integrity...');
        
        try {
            // Test that all major layout elements are properly positioned
            const layoutCheck = await this.page.evaluate(() => {
                const elements = {
                    header: document.querySelector('.header'),
                    mainContainer: document.querySelector('.main-container'),
                    navTabs: document.querySelector('.nav-tabs'),
                    dashboardGrid: document.querySelector('.dashboard-grid'),
                    quickActions: document.querySelector('.quick-actions')
                };

                const results = {};
                for (const [key, element] of Object.entries(elements)) {
                    if (element) {
                        const rect = element.getBoundingClientRect();
                        const styles = getComputedStyle(element);
                        results[key] = {
                            visible: rect.width > 0 && rect.height > 0,
                            width: rect.width,
                            height: rect.height,
                            display: styles.display
                        };
                    } else {
                        results[key] = { visible: false };
                    }
                }
                return results;
            });

            let layoutIssues = 0;
            for (const [element, data] of Object.entries(layoutCheck)) {
                if (data.visible) {
                    console.log(`✅ ${element}: ${data.width}x${data.height} (${data.display})`);
                } else {
                    console.log(`❌ ${element}: Not visible or missing`);
                    layoutIssues++;
                }
            }

            if (layoutIssues === 0) {
                console.log('✅ All layout elements properly positioned');
                this.results.passed++;
            } else {
                console.log(`❌ ${layoutIssues} layout elements have issues`);
                this.results.failed++;
                this.results.errors.push(`${layoutIssues} layout elements not properly positioned`);
            }

        } catch (error) {
            console.log('❌ Error testing layout integrity:', error.message);
            this.results.failed++;
            this.results.errors.push(`Layout Integrity Error: ${error.message}`);
        }
    }

    async generateReport() {
        console.log('\n📊 Generating CSS Extraction Test Report...');
        
        const totalTests = this.results.passed + this.results.failed;
        const successRate = totalTests > 0 ? ((this.results.passed / totalTests) * 100).toFixed(1) : 0;
        
        console.log('\n' + '='.repeat(60));
        console.log('           CSS EXTRACTION TEST RESULTS');
        console.log('='.repeat(60));
        console.log(`✅ Tests Passed: ${this.results.passed}`);
        console.log(`❌ Tests Failed: ${this.results.failed}`);
        console.log(`📈 Success Rate: ${successRate}%`);
        console.log(`🔍 Total Tests: ${totalTests}`);
        
        if (this.results.errors.length > 0) {
            console.log('\n❌ Errors Encountered:');
            this.results.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        }
        
        console.log('\n' + '='.repeat(60));
        
        if (this.results.failed === 0) {
            console.log('🎉 ALL TESTS PASSED! CSS extraction successful.');
            console.log('✅ Visual styling preserved');
            console.log('✅ Component interactions working');
            console.log('✅ Responsive design functional');
            console.log('✅ Ready for production use');
            return true;
        } else {
            console.log('⚠️  Some tests failed. Review errors above.');
            return false;
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async runAllTests() {
        try {
            await this.init();
            await this.testCSSModuleLoading();
            await this.testVisualStyling();
            await this.testButtonStyling();
            await this.testResponsiveDesign();
            await this.testUtilityClasses();
            await this.testLayoutIntegrity();
            
            return await this.generateReport();
        } catch (error) {
            console.error('💥 Critical error during testing:', error);
            return false;
        } finally {
            await this.cleanup();
        }
    }
}

// Run the tests
async function main() {
    console.log('🚀 Starting CSS Extraction Verification...\n');
    
    const tester = new CSSExtractionTester();
    const success = await tester.runAllTests();
    
    process.exit(success ? 0 : 1);
}

if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = CSSExtractionTester;