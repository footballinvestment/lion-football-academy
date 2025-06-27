/**
 * Lighthouse Performance Audit
 * Lion Football Academy Frontend Testing Suite
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  performance: 90,
  accessibility: 95,
  'best-practices': 90,
  seo: 85,
  pwa: 80,
};

// Specific metric thresholds
const METRIC_THRESHOLDS = {
  'first-contentful-paint': 1800, // 1.8s
  'largest-contentful-paint': 2500, // 2.5s
  'first-meaningful-paint': 1600, // 1.6s
  'speed-index': 3000, // 3s
  'interactive': 3800, // 3.8s
  'total-blocking-time': 200, // 200ms
  'cumulative-layout-shift': 0.1, // 0.1
};

// Pages to test
const PAGES_TO_TEST = [
  {
    url: 'http://localhost:3000',
    name: 'Login Page',
    description: 'Main login page performance',
  },
  {
    url: 'http://localhost:3000/dashboard',
    name: 'Dashboard',
    description: 'Main dashboard after login',
    requiresAuth: true,
  },
  {
    url: 'http://localhost:3000/players',
    name: 'Players List',
    description: 'Players listing page',
    requiresAuth: true,
  },
  {
    url: 'http://localhost:3000/teams',
    name: 'Teams List',
    description: 'Teams listing page',
    requiresAuth: true,
  },
  {
    url: 'http://localhost:3000/matches',
    name: 'Matches List',
    description: 'Matches listing page',
    requiresAuth: true,
  },
  {
    url: 'http://localhost:3000/statistics',
    name: 'Statistics Page',
    description: 'Statistics and analytics page',
    requiresAuth: true,
  },
];

class PerformanceAuditor {
  constructor() {
    this.results = [];
    this.chrome = null;
  }

  async launchChrome() {
    this.chrome = await chromeLauncher.launch({
      chromeFlags: [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
      ],
    });
    return this.chrome.port;
  }

  async runLighthouseAudit(url, options = {}) {
    const port = await this.launchChrome();
    
    const lighthouseOptions = {
      logLevel: 'info',
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
      port,
      ...options,
    };

    const config = {
      extends: 'lighthouse:default',
      settings: {
        maxWaitForFcp: 15 * 1000, // 15 seconds
        maxWaitForLoad: 35 * 1000, // 35 seconds
        throttlingMethod: 'simulate',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
        emulatedFormFactor: 'desktop',
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
      },
    };

    try {
      const runnerResult = await lighthouse(url, lighthouseOptions, config);
      return runnerResult.lhr;
    } catch (error) {
      console.error(`Error running Lighthouse audit for ${url}:`, error);
      throw error;
    }
  }

  async authenticateUser(page) {
    // Simulate user login for authenticated pages
    try {
      await page.goto('http://localhost:3000/login');
      await page.waitForSelector('[data-testid="username-input"]', { timeout: 5000 });
      
      await page.type('[data-testid="username-input"]', 'admin');
      await page.type('[data-testid="password-input"]', 'admin123');
      await page.click('[data-testid="login-button"]');
      
      await page.waitForSelector('[data-testid="admin-dashboard"]', { timeout: 10000 });
      return true;
    } catch (error) {
      console.warn('Authentication failed:', error.message);
      return false;
    }
  }

  async auditPage(pageConfig) {
    console.log(`\n🔍 Auditing: ${pageConfig.name}`);
    console.log(`URL: ${pageConfig.url}`);
    
    try {
      const result = await this.runLighthouseAudit(pageConfig.url);
      
      const auditResult = {
        page: pageConfig.name,
        url: pageConfig.url,
        timestamp: new Date().toISOString(),
        scores: {
          performance: Math.round(result.categories.performance.score * 100),
          accessibility: Math.round(result.categories.accessibility.score * 100),
          bestPractices: Math.round(result.categories['best-practices'].score * 100),
          seo: Math.round(result.categories.seo.score * 100),
          pwa: Math.round(result.categories.pwa.score * 100),
        },
        metrics: this.extractMetrics(result),
        opportunities: this.extractOpportunities(result),
        diagnostics: this.extractDiagnostics(result),
        passed: this.evaluateThresholds(result),
      };

      this.results.push(auditResult);
      this.logResults(auditResult);
      
      return auditResult;
    } catch (error) {
      console.error(`Failed to audit ${pageConfig.name}:`, error);
      return null;
    }
  }

  extractMetrics(result) {
    const metrics = {};
    const audits = result.audits;
    
    // Core Web Vitals and other important metrics
    const metricsToExtract = [
      'first-contentful-paint',
      'largest-contentful-paint',
      'first-meaningful-paint',
      'speed-index',
      'interactive',
      'total-blocking-time',
      'cumulative-layout-shift',
      'max-potential-fid',
    ];

    metricsToExtract.forEach(metric => {
      if (audits[metric]) {
        metrics[metric] = {
          value: audits[metric].numericValue,
          displayValue: audits[metric].displayValue,
          score: audits[metric].score,
        };
      }
    });

    return metrics;
  }

  extractOpportunities(result) {
    const opportunities = [];
    
    Object.values(result.audits).forEach(audit => {
      if (audit.details && audit.details.type === 'opportunity' && audit.numericValue > 0) {
        opportunities.push({
          id: audit.id,
          title: audit.title,
          description: audit.description,
          potentialSavings: audit.displayValue,
          numericValue: audit.numericValue,
          score: audit.score,
        });
      }
    });

    return opportunities.sort((a, b) => b.numericValue - a.numericValue);
  }

  extractDiagnostics(result) {
    const diagnostics = [];
    
    Object.values(result.audits).forEach(audit => {
      if (audit.details && audit.details.type === 'diagnostic' && audit.score !== null && audit.score < 1) {
        diagnostics.push({
          id: audit.id,
          title: audit.title,
          description: audit.description,
          displayValue: audit.displayValue,
          score: audit.score,
        });
      }
    });

    return diagnostics.sort((a, b) => a.score - b.score);
  }

  evaluateThresholds(result) {
    const scores = {
      performance: Math.round(result.categories.performance.score * 100),
      accessibility: Math.round(result.categories.accessibility.score * 100),
      bestPractices: Math.round(result.categories['best-practices'].score * 100),
      seo: Math.round(result.categories.seo.score * 100),
      pwa: Math.round(result.categories.pwa.score * 100),
    };

    const categoryResults = {};
    const metricResults = {};

    // Check category thresholds
    Object.entries(PERFORMANCE_THRESHOLDS).forEach(([category, threshold]) => {
      const score = scores[category.replace('-', '')];
      categoryResults[category] = {
        score,
        threshold,
        passed: score >= threshold,
      };
    });

    // Check metric thresholds
    Object.entries(METRIC_THRESHOLDS).forEach(([metric, threshold]) => {
      const audit = result.audits[metric];
      if (audit) {
        const value = audit.numericValue;
        metricResults[metric] = {
          value,
          threshold,
          passed: value <= threshold,
          displayValue: audit.displayValue,
        };
      }
    });

    return {
      categories: categoryResults,
      metrics: metricResults,
      overall: Object.values(categoryResults).every(r => r.passed) && 
               Object.values(metricResults).every(r => r.passed),
    };
  }

  logResults(result) {
    console.log('\n📊 Audit Results:');
    console.log('==================');
    
    // Log scores
    console.log('\n🎯 Scores:');
    Object.entries(result.scores).forEach(([category, score]) => {
      const threshold = PERFORMANCE_THRESHOLDS[category.replace(/([A-Z])/g, '-$1').toLowerCase()];
      const status = score >= threshold ? '✅' : '❌';
      console.log(`  ${status} ${category}: ${score}/100 (threshold: ${threshold})`);
    });

    // Log key metrics
    console.log('\n⚡ Key Metrics:');
    Object.entries(result.metrics).forEach(([metric, data]) => {
      const threshold = METRIC_THRESHOLDS[metric];
      if (threshold) {
        const status = data.value <= threshold ? '✅' : '❌';
        console.log(`  ${status} ${metric}: ${data.displayValue} (threshold: ${threshold}ms)`);
      }
    });

    // Log top opportunities
    if (result.opportunities.length > 0) {
      console.log('\n🚀 Top Optimization Opportunities:');
      result.opportunities.slice(0, 3).forEach((opp, index) => {
        console.log(`  ${index + 1}. ${opp.title}: ${opp.potentialSavings}`);
      });
    }

    console.log('\n' + '='.repeat(50));
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(),
      results: this.results,
      recommendations: this.generateRecommendations(),
    };

    // Save JSON report
    const jsonPath = path.join(__dirname, '../reports/performance-audit.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlPath = path.join(__dirname, '../reports/performance-audit.html');
    fs.writeFileSync(htmlPath, htmlReport);

    console.log(`\n📄 Reports generated:`);
    console.log(`  JSON: ${jsonPath}`);
    console.log(`  HTML: ${htmlPath}`);

    return report;
  }

  generateSummary() {
    const totalPages = this.results.length;
    const passedPages = this.results.filter(r => r.passed.overall).length;
    
    const avgScores = {
      performance: Math.round(this.results.reduce((sum, r) => sum + r.scores.performance, 0) / totalPages),
      accessibility: Math.round(this.results.reduce((sum, r) => sum + r.scores.accessibility, 0) / totalPages),
      bestPractices: Math.round(this.results.reduce((sum, r) => sum + r.scores.bestPractices, 0) / totalPages),
      seo: Math.round(this.results.reduce((sum, r) => sum + r.scores.seo, 0) / totalPages),
      pwa: Math.round(this.results.reduce((sum, r) => sum + r.scores.pwa, 0) / totalPages),
    };

    return {
      totalPages,
      passedPages,
      passRate: Math.round((passedPages / totalPages) * 100),
      averageScores: avgScores,
      overallPass: passedPages === totalPages,
    };
  }

  generateRecommendations() {
    const allOpportunities = this.results.flatMap(r => r.opportunities);
    const topOpportunities = allOpportunities
      .sort((a, b) => b.numericValue - a.numericValue)
      .slice(0, 5);

    return {
      priority: topOpportunities.map(opp => ({
        title: opp.title,
        impact: opp.potentialSavings,
        description: opp.description,
      })),
      general: [
        'Optimize images and use modern formats (WebP, AVIF)',
        'Implement code splitting and lazy loading',
        'Minimize and compress JavaScript and CSS',
        'Use CDN for static assets',
        'Implement service worker for caching',
        'Optimize database queries and API responses',
        'Use compression (gzip/brotli) for text assets',
      ],
    };
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Audit Report - Lion Football Academy</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 3px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #007bff; }
        .score { font-size: 2em; font-weight: bold; color: #007bff; }
        .results { margin-bottom: 40px; }
        .page-result { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 6px; }
        .scores-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 15px 0; }
        .score-item { text-align: center; padding: 10px; border-radius: 4px; }
        .score-good { background: #d4edda; color: #155724; }
        .score-ok { background: #fff3cd; color: #856404; }
        .score-poor { background: #f8d7da; color: #721c24; }
        .opportunities { margin-top: 15px; }
        .opportunity { background: #e7f3ff; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 3px solid #007bff; }
        .recommendations { background: #f8f9fa; padding: 20px; border-radius: 6px; }
        .rec-list { list-style-type: none; padding: 0; }
        .rec-list li { padding: 8px 0; border-bottom: 1px solid #eee; }
        .rec-list li:before { content: "🚀"; margin-right: 10px; }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🦁 Lion Football Academy</h1>
            <h2>Performance Audit Report</h2>
            <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>Overall Performance</h3>
                <div class="score ${report.summary.passRate >= 80 ? 'pass' : 'fail'}">${report.summary.passRate}%</div>
                <p>${report.summary.passedPages}/${report.summary.totalPages} pages passed</p>
            </div>
            <div class="summary-card">
                <h3>Average Performance Score</h3>
                <div class="score">${report.summary.averageScores.performance}</div>
                <p>Lighthouse Performance</p>
            </div>
            <div class="summary-card">
                <h3>Average Accessibility</h3>
                <div class="score">${report.summary.averageScores.accessibility}</div>
                <p>A11y Compliance</p>
            </div>
            <div class="summary-card">
                <h3>Status</h3>
                <div class="score ${report.summary.overallPass ? 'pass' : 'fail'}">
                    ${report.summary.overallPass ? '✅ PASS' : '❌ FAIL'}
                </div>
                <p>All Thresholds</p>
            </div>
        </div>

        <div class="results">
            <h2>📊 Detailed Results</h2>
            ${report.results.map(result => `
                <div class="page-result">
                    <h3>${result.page} ${result.passed.overall ? '✅' : '❌'}</h3>
                    <p><strong>URL:</strong> ${result.url}</p>
                    
                    <div class="scores-grid">
                        ${Object.entries(result.scores).map(([category, score]) => `
                            <div class="score-item ${this.getScoreClass(score)}">
                                <div><strong>${score}</strong></div>
                                <div>${category}</div>
                            </div>
                        `).join('')}
                    </div>

                    ${result.opportunities.length > 0 ? `
                        <div class="opportunities">
                            <h4>🚀 Top Opportunities:</h4>
                            ${result.opportunities.slice(0, 3).map(opp => `
                                <div class="opportunity">
                                    <strong>${opp.title}</strong>: ${opp.potentialSavings}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>

        <div class="recommendations">
            <h2>💡 Recommendations</h2>
            <h3>Priority Improvements:</h3>
            <ul class="rec-list">
                ${report.recommendations.priority.map(rec => `
                    <li><strong>${rec.title}</strong>: ${rec.impact}</li>
                `).join('')}
            </ul>
            
            <h3>General Optimizations:</h3>
            <ul class="rec-list">
                ${report.recommendations.general.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    </div>
</body>
</html>`;
  }

  getScoreClass(score) {
    if (score >= 90) return 'score-good';
    if (score >= 70) return 'score-ok';
    return 'score-poor';
  }

  async cleanup() {
    if (this.chrome) {
      await this.chrome.kill();
    }
  }
}

// Main execution function
async function runPerformanceAudit() {
  const auditor = new PerformanceAuditor();
  
  try {
    console.log('🚀 Starting Performance Audit for Lion Football Academy');
    console.log('=' * 60);

    // Ensure reports directory exists
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Run audits for all pages
    for (const pageConfig of PAGES_TO_TEST) {
      await auditor.auditPage(pageConfig);
      
      // Small delay between audits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Generate final report
    const report = await auditor.generateReport();
    
    console.log('\n🎉 Performance audit completed!');
    console.log('\n📈 Summary:');
    console.log(`  Overall Pass Rate: ${report.summary.passRate}%`);
    console.log(`  Average Performance Score: ${report.summary.averageScores.performance}/100`);
    console.log(`  Pages Tested: ${report.summary.totalPages}`);
    console.log(`  Pages Passed: ${report.summary.passedPages}`);

    // Exit with appropriate code
    process.exit(report.summary.overallPass ? 0 : 1);

  } catch (error) {
    console.error('❌ Performance audit failed:', error);
    process.exit(1);
  } finally {
    await auditor.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  runPerformanceAudit();
}

module.exports = { PerformanceAuditor, runPerformanceAudit };