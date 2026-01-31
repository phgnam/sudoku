const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const REPORT_DIR = path.join(__dirname, '../plans/reports/ui-tests-' + new Date().toISOString().slice(0, 10).replace(/-/g, ''));
const SCREENSHOTS_DIR = path.join(REPORT_DIR, 'screenshots');

const pages = [
  { name: 'home-light', url: '/', theme: 'light', viewport: { width: 1280, height: 800 } },
  { name: 'home-dark', url: '/', theme: 'dark', viewport: { width: 1280, height: 800 } },
  { name: 'home-mobile', url: '/', theme: 'light', viewport: { width: 375, height: 667 } },
  { name: 'game-light', url: '/game', theme: 'light', viewport: { width: 1280, height: 800 } },
  { name: 'game-dark', url: '/game', theme: 'dark', viewport: { width: 1280, height: 800 } },
  { name: 'game-mobile', url: '/game', theme: 'light', viewport: { width: 375, height: 667 } },
  { name: 'competitive-light', url: '/competitive', theme: 'light', viewport: { width: 1280, height: 800 } },
  { name: 'competitive-dark', url: '/competitive', theme: 'dark', viewport: { width: 1280, height: 800 } },
  { name: 'competitive-mobile', url: '/competitive', theme: 'light', viewport: { width: 375, height: 667 } },
  { name: 'login-light', url: '/auth/login', theme: 'light', viewport: { width: 1280, height: 800 } },
  { name: 'signup-light', url: '/auth/signup', theme: 'light', viewport: { width: 1280, height: 800 } },
  { name: 'dashboard-light', url: '/dashboard', theme: 'light', viewport: { width: 1280, height: 800 } },
];

async function captureScreenshots() {
  // Ensure directories exist
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  
  const browser = await chromium.launch({ headless: true });
  const results = [];
  
  for (const pageConfig of pages) {
    console.log(`Capturing: ${pageConfig.name}...`);
    const context = await browser.newContext({
      viewport: pageConfig.viewport,
      colorScheme: pageConfig.theme,
    });
    
    // Set dark mode preference in localStorage if needed
    if (pageConfig.theme === 'dark') {
      await context.addInitScript(() => {
        localStorage.setItem('ui-store', JSON.stringify({ colorMode: 'dark' }));
      });
    }
    
    const page = await context.newPage();
    
    // Set up console error listener BEFORE navigation to capture errors during page load
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    try {
      await page.goto(`http://localhost:3000${pageConfig.url}`, {
        waitUntil: 'networkidle',
        timeout: 15000
      });
      await page.waitForTimeout(1000); // Wait for animations

      const screenshotPath = path.join(SCREENSHOTS_DIR, `${pageConfig.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      // Get page info
      const title = await page.title();
      const url = page.url();

      // Check accessibility
      const a11yIssues = await page.evaluate(() => {
        const issues = [];
        // Check for images without alt
        document.querySelectorAll('img:not([alt])').forEach(img => {
          issues.push(`Image missing alt: ${img.src}`);
        });
        // Check for buttons without accessible name
        document.querySelectorAll('button').forEach(btn => {
          if (!btn.textContent?.trim() && !btn.getAttribute('aria-label')) {
            issues.push('Button missing accessible name');
          }
        });
        // Check for links without href
        document.querySelectorAll('a:not([href])').forEach(a => {
          issues.push(`Link missing href: ${a.textContent}`);
        });
        return issues;
      });
      
      results.push({
        name: pageConfig.name,
        url: pageConfig.url,
        theme: pageConfig.theme,
        viewport: pageConfig.viewport,
        screenshot: `screenshots/${pageConfig.name}.png`,
        title,
        success: true,
        a11yIssues,
        consoleErrors
      });
      
    } catch (error) {
      results.push({
        name: pageConfig.name,
        url: pageConfig.url,
        error: error.message,
        success: false
      });
    }
    
    await context.close();
  }
  
  await browser.close();
  
  // Save results
  fs.writeFileSync(
    path.join(REPORT_DIR, 'test-results.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log(`\nScreenshots saved to: ${SCREENSHOTS_DIR}`);
  console.log(`Results: ${results.filter(r => r.success).length}/${results.length} pages captured successfully`);
  
  return results;
}

captureScreenshots().catch(console.error);

