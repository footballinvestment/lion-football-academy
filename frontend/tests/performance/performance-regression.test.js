const { test, expect } = require('@playwright/test');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

test.describe('Performance Regression Tests', () => {
  const PERFORMANCE_THRESHOLDS = {
    FCP: 1500,  // First Contentful Paint < 1.5s
    LCP: 2500,  // Largest Contentful Paint < 2.5s
    TTI: 3000,  // Time to Interactive < 3.0s
    CLS: 0.1,   // Cumulative Layout Shift < 0.1
    FID: 100,   // First Input Delay < 100ms
    TBT: 300,   // Total Blocking Time < 300ms
    Performance: 90,  // Lighthouse Performance Score > 90
    Accessibility: 95, // Lighthouse Accessibility Score > 95
    BestPractices: 90, // Lighthouse Best Practices > 90
    SEO: 90     // Lighthouse SEO Score > 90
  };

  let chrome;
  let lighthouse_results;

  test.beforeAll(async () => {
    // Launch Chrome for Lighthouse
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage']
    });
  });

  test.afterAll(async () => {
    if (chrome) {
      await chrome.kill();
    }
  });

  test('should meet performance targets on homepage', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Run Lighthouse audit
    const options = {
      logLevel: 'info',
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      port: chrome.port
    };
    
    const runnerResult = await lighthouse('http://localhost:3000', options);
    lighthouse_results = runnerResult.lhr;
    
    // Performance category checks
    const performanceScore = lighthouse_results.categories.performance.score * 100;
    expect(performanceScore).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.Performance);
    
    // Core Web Vitals
    const fcp = lighthouse_results.audits['first-contentful-paint'].numericValue;
    expect(fcp).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.FCP);
    
    const lcp = lighthouse_results.audits['largest-contentful-paint'].numericValue;
    expect(lcp).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.LCP);
    
    const tti = lighthouse_results.audits['interactive'].numericValue;
    expect(tti).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.TTI);
    
    const cls = lighthouse_results.audits['cumulative-layout-shift'].numericValue;
    expect(cls).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.CLS);
    
    const tbt = lighthouse_results.audits['total-blocking-time'].numericValue;
    expect(tbt).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.TBT);
    
    // Accessibility score
    const accessibilityScore = lighthouse_results.categories.accessibility.score * 100;
    expect(accessibilityScore).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.Accessibility);
    
    // Best practices score
    const bestPracticesScore = lighthouse_results.categories['best-practices'].score * 100;
    expect(bestPracticesScore).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.BestPractices);
    
    // SEO score
    const seoScore = lighthouse_results.categories.seo.score * 100;
    expect(seoScore).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.SEO);
  });

  test('should maintain performance on admin dashboard', async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'admin@lfa.test');
    await page.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL('**/admin/dashboard');
    
    // Measure page metrics
    const perfMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const metrics = {};
          
          for (const entry of entries) {
            if (entry.entryType === 'paint') {
              metrics[entry.name] = entry.startTime;
            }
            if (entry.entryType === 'largest-contentful-paint') {
              metrics.lcp = entry.startTime;
            }
          }
          
          resolve(metrics);
        }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
        
        // Fallback timeout
        setTimeout(() => resolve({}), 5000);
      });
    });
    
    // Verify dashboard-specific performance
    if (perfMetrics['first-contentful-paint']) {
      expect(perfMetrics['first-contentful-paint']).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.FCP);
    }
    
    if (perfMetrics.lcp) {
      expect(perfMetrics.lcp).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.LCP);
    }
    
    // Test interaction responsiveness
    const startTime = Date.now();
    await page.click('[data-testid="users-menu"]');
    await page.waitForSelector('[data-testid="users-dropdown"]');
    const interactionDelay = Date.now() - startTime;
    
    expect(interactionDelay).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.FID);
  });

  test('should load player statistics efficiently', async ({ page }) => {
    // Login as coach
    await page.goto('http://localhost:3000');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'coach@lfa.test');
    await page.fill('[data-testid="password-input"]', 'CoachPassword123!');
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL('**/coach/dashboard');
    
    // Navigate to statistics page
    const navigationStart = Date.now();
    await page.click('text=Statistics');
    await page.waitForSelector('[data-testid="statistics-dashboard"]');
    const navigationTime = Date.now() - navigationStart;
    
    // Verify navigation performance
    expect(navigationTime).toBeLessThanOrEqual(2000); // < 2 seconds
    
    // Test chart rendering performance
    const chartRenderStart = Date.now();
    await page.waitForSelector('[data-testid="performance-chart"]');
    const chartRenderTime = Date.now() - chartRenderStart;
    
    expect(chartRenderTime).toBeLessThanOrEqual(1000); // < 1 second
    
    // Test data loading performance
    const dataLoadStart = Date.now();
    await page.selectOption('[data-testid="player-filter"]', 'all-players');
    await page.waitForSelector('[data-testid="updated-stats"]');
    const dataLoadTime = Date.now() - dataLoadStart;
    
    expect(dataLoadTime).toBeLessThanOrEqual(1500); // < 1.5 seconds
  });

  test('should handle large data sets efficiently', async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'admin@lfa.test');
    await page.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL('**/admin/dashboard');
    
    // Navigate to players list (potentially large dataset)
    await page.click('text=Players');
    await page.waitForSelector('[data-testid="players-table"]');
    
    // Test table virtualization performance
    const scrollStart = Date.now();
    await page.evaluate(() => {
      const table = document.querySelector('[data-testid="players-table"]');
      table.scrollTop = table.scrollHeight;
    });
    
    await page.waitForTimeout(100); // Allow scroll to complete
    const scrollTime = Date.now() - scrollStart;
    
    expect(scrollTime).toBeLessThanOrEqual(200); // Smooth scrolling
    
    // Test search performance
    const searchStart = Date.now();
    await page.fill('[data-testid="player-search"]', 'John');
    await page.waitForSelector('[data-testid="search-results"]');
    const searchTime = Date.now() - searchStart;
    
    expect(searchTime).toBeLessThanOrEqual(500); // Fast search
    
    // Test sorting performance
    const sortStart = Date.now();
    await page.click('[data-testid="sort-by-name"]');
    await page.waitForSelector('[data-testid="sorted-table"]');
    const sortTime = Date.now() - sortStart;
    
    expect(sortTime).toBeLessThanOrEqual(300); // Fast sorting
  });

  test('should maintain performance during heavy interactions', async ({ page }) => {
    // Login as coach
    await page.goto('http://localhost:3000');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'coach@lfa.test');
    await page.fill('[data-testid="password-input"]', 'CoachPassword123!');
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL('**/coach/dashboard');
    
    // Navigate to QR scanner (camera-intensive)
    await page.click('text=QR Check-in');
    await page.waitForSelector('[data-testid="qr-scanner"]');
    
    // Test camera initialization performance
    const cameraStart = Date.now();
    await page.click('[data-testid="start-camera-btn"]');
    await page.waitForSelector('[data-testid="camera-preview"]');
    const cameraTime = Date.now() - cameraStart;
    
    expect(cameraTime).toBeLessThanOrEqual(3000); // Camera start < 3s
    
    // Test rapid interactions
    const interactions = [];
    for (let i = 0; i < 10; i++) {
      const interactionStart = Date.now();
      await page.click('[data-testid="toggle-torch"]');
      await page.waitForTimeout(50);
      const interactionTime = Date.now() - interactionStart;
      interactions.push(interactionTime);
    }
    
    const averageInteractionTime = interactions.reduce((a, b) => a + b, 0) / interactions.length;
    expect(averageInteractionTime).toBeLessThanOrEqual(100); // Responsive interactions
  });

  test('should optimize bundle size and loading', async ({ page }) => {
    // Monitor network activity
    const responses = [];
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        size: response.headers()['content-length'],
        type: response.headers()['content-type']
      });
    });
    
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Analyze JavaScript bundles
    const jsBundles = responses.filter(r => 
      r.type && r.type.includes('javascript') && r.url.includes('static/js')
    );
    
    // Check main bundle size
    const mainBundle = jsBundles.find(b => b.url.includes('main.'));
    if (mainBundle && mainBundle.size) {
      const bundleSizeKB = parseInt(mainBundle.size) / 1024;
      expect(bundleSizeKB).toBeLessThanOrEqual(250); // < 250KB main bundle
    }
    
    // Check total JS size
    const totalJSSize = jsBundles.reduce((total, bundle) => {
      return total + (parseInt(bundle.size) || 0);
    }, 0);
    
    const totalJSSizeKB = totalJSSize / 1024;
    expect(totalJSSizeKB).toBeLessThanOrEqual(500); // < 500KB total JS
    
    // Check CSS bundle size
    const cssBundles = responses.filter(r => 
      r.type && r.type.includes('css')
    );
    
    const totalCSSSize = cssBundles.reduce((total, bundle) => {
      return total + (parseInt(bundle.size) || 0);
    }, 0);
    
    const totalCSSSizeKB = totalCSSSize / 1024;
    expect(totalCSSSizeKB).toBeLessThanOrEqual(100); // < 100KB CSS
  });

  test('should perform well on mobile devices', async ({ browser }) => {
    // Create mobile context
    const mobileContext = await browser.newContext({
      ...require('playwright').devices['iPhone 12']
    });
    
    const mobilePage = await mobileContext.newPage();
    
    // Simulate slow 3G network
    await mobileContext.setExtraHTTPHeaders({
      'Downlink': '1.5',
      'RTT': '300'
    });
    
    const loadStart = Date.now();
    await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - loadStart;
    
    // Mobile load time should be reasonable even on slow connection
    expect(loadTime).toBeLessThanOrEqual(8000); // < 8s on slow 3G
    
    // Test mobile interactions
    await mobilePage.click('text=Login');
    await mobilePage.fill('[data-testid="email-input"]', 'player@lfa.test');
    await mobilePage.fill('[data-testid="password-input"]', 'PlayerPassword123!');
    
    const loginStart = Date.now();
    await mobilePage.click('[data-testid="login-submit"]');
    await mobilePage.waitForURL('**/player/dashboard');
    const loginTime = Date.now() - loginStart;
    
    expect(loginTime).toBeLessThanOrEqual(3000); // Mobile login < 3s
    
    // Test touch interactions
    const touchStart = Date.now();
    await mobilePage.tap('[data-testid="stats-card"]');
    await mobilePage.waitForSelector('[data-testid="stats-detail"]');
    const touchTime = Date.now() - touchStart;
    
    expect(touchTime).toBeLessThanOrEqual(200); // Responsive touch
    
    await mobileContext.close();
  });

  test('should maintain memory usage within limits', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Monitor memory usage
    const initialMemory = await page.evaluate(() => {
      return performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null;
    });
    
    if (initialMemory) {
      // Navigate through multiple pages to test for memory leaks
      const pages = [
        { path: 'login', action: () => page.click('text=Login') },
        { path: 'register', action: () => page.click('text=Register') },
        { path: 'home', action: () => page.click('text=Lion Football Academy') }
      ];
      
      for (const pageNav of pages) {
        await pageNav.action();
        await page.waitForTimeout(1000);
        
        // Force garbage collection if available
        await page.evaluate(() => {
          if (window.gc) {
            window.gc();
          }
        });
      }
      
      const finalMemory = await page.evaluate(() => {
        return performance.memory ? {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        } : null;
      });
      
      if (finalMemory) {
        const memoryIncrease = finalMemory.used - initialMemory.used;
        const memoryIncreaseKB = memoryIncrease / 1024;
        
        // Memory increase should be reasonable
        expect(memoryIncreaseKB).toBeLessThanOrEqual(5000); // < 5MB increase
        
        // Should not use more than 50% of available heap
        const memoryUsagePercent = (finalMemory.used / finalMemory.limit) * 100;
        expect(memoryUsagePercent).toBeLessThanOrEqual(50);
      }
    }
  });

  test('should generate performance report', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Collect all performance metrics
    const performanceReport = await page.evaluate(() => {
      const paintEntries = performance.getEntriesByType('paint');
      const navigationEntry = performance.getEntriesByType('navigation')[0];
      const resourceEntries = performance.getEntriesByType('resource');
      
      return {
        paintMetrics: paintEntries.reduce((acc, entry) => {
          acc[entry.name] = entry.startTime;
          return acc;
        }, {}),
        navigationTiming: {
          domContentLoaded: navigationEntry.domContentLoadedEventEnd - navigationEntry.domContentLoadedEventStart,
          loadComplete: navigationEntry.loadEventEnd - navigationEntry.loadEventStart,
          totalLoadTime: navigationEntry.loadEventEnd - navigationEntry.fetchStart
        },
        resourceCounts: {
          total: resourceEntries.length,
          js: resourceEntries.filter(r => r.name.includes('.js')).length,
          css: resourceEntries.filter(r => r.name.includes('.css')).length,
          images: resourceEntries.filter(r => r.name.match(/\.(jpg|jpeg|png|gif|webp)$/)).length
        },
        memoryUsage: performance.memory ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
        } : null
      };
    });
    
    // Log performance report for CI/CD pipeline
    console.log('Performance Report:', JSON.stringify(performanceReport, null, 2));
    
    // Verify report contains expected metrics
    expect(performanceReport.paintMetrics).toBeDefined();
    expect(performanceReport.navigationTiming).toBeDefined();
    expect(performanceReport.resourceCounts.total).toBeGreaterThan(0);
  });
});