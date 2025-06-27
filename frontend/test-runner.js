#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * Lion Football Academy Frontend Testing Suite
 * 
 * This script orchestrates all testing phases:
 * - Unit tests (Jest + React Testing Library)
 * - Integration tests (API + Authentication)
 * - E2E tests (Playwright)
 * - Performance tests (Lighthouse + Bundle Analysis)
 * - Accessibility tests
 * - Visual regression tests
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Import our performance testing modules
const { runPerformanceAudit } = require('./tests/performance/lighthouse-audit');
const { runBundleAnalysis } = require('./tests/performance/bundle-analysis');

// Test configuration
const TEST_CONFIG = {
  unit: {
    command: 'npm run test:ci',
    timeout: 300000, // 5 minutes
    critical: true,
  },
  integration: {
    command: 'npm run test:integration',
    timeout: 600000, // 10 minutes
    critical: true,
  },
  e2e: {
    command: 'npm run test:e2e',
    timeout: 1200000, // 20 minutes
    critical: false,
  },
  performance: {
    lighthouse: true,
    bundleAnalysis: true,
    timeout: 900000, // 15 minutes
    critical: false,
  },
  accessibility: {
    command: 'npm run test:a11y',
    timeout: 300000, // 5 minutes
    critical: false,
  },
};

// Report configuration
const REPORT_CONFIG = {
  outputDir: './test-reports',
  formats: ['json', 'html', 'junit'],
  includeScreenshots: true,
  includeCoverage: true,
};

class TestRunner {
  constructor(options = {}) {
    this.options = {
      parallel: options.parallel !== false,
      bail: options.bail || false,
      coverage: options.coverage !== false,
      verbose: options.verbose || false,
      watch: options.watch || false,
      filter: options.filter || null,
      environment: options.environment || 'test',
      ...options,
    };

    this.results = {
      timestamp: new Date().toISOString(),
      environment: this.options.environment,
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
      },
      phases: {},
      coverage: null,
      performance: null,
      accessibility: null,
    };

    this.startTime = Date.now();
  }

  async run() {
    console.log('🚀 Starting Comprehensive Test Suite');
    console.log('=====================================');
    console.log(`Environment: ${this.options.environment}`);
    console.log(`Parallel: ${this.options.parallel}`);
    console.log(`Coverage: ${this.options.coverage}`);
    console.log(`Filter: ${this.options.filter || 'all'}`);
    console.log('');

    try {
      // Ensure reports directory exists
      this.ensureReportsDirectory();

      // Run pre-test setup
      await this.preTestSetup();

      // Run test phases
      await this.runTestPhases();

      // Generate final reports
      await this.generateReports();

      // Display summary
      this.displaySummary();

      // Determine exit code
      const exitCode = this.getExitCode();
      process.exit(exitCode);

    } catch (error) {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    }
  }

  ensureReportsDirectory() {
    const reportDir = path.resolve(REPORT_CONFIG.outputDir);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Clean previous reports
    const files = fs.readdirSync(reportDir);
    files.forEach(file => {
      if (file.endsWith('.json') || file.endsWith('.html') || file.endsWith('.xml')) {
        fs.unlinkSync(path.join(reportDir, file));
      }
    });
  }

  async preTestSetup() {
    console.log('🔧 Pre-test setup...');

    // Install dependencies if needed
    if (!fs.existsSync('./node_modules')) {
      console.log('📦 Installing dependencies...');
      execSync('npm ci', { stdio: 'inherit' });
    }

    // Build the application for E2E and performance tests
    if (this.shouldRunPhase('e2e') || this.shouldRunPhase('performance')) {
      console.log('🏗️  Building application...');
      try {
        execSync('npm run build', { stdio: 'pipe' });
        console.log('✅ Application built successfully');
      } catch (error) {
        console.error('❌ Build failed:', error.message);
        if (this.options.bail) {
          throw error;
        }
      }
    }

    // Start test servers if needed
    await this.startTestServers();

    console.log('✅ Pre-test setup completed\n');
  }

  async startTestServers() {
    // Start backend server for E2E tests
    if (this.shouldRunPhase('e2e')) {
      console.log('🖥️  Starting backend server...');
      // This would start your backend server in test mode
      // Implementation depends on your backend setup
    }

    // Start frontend dev server for some tests
    if (this.shouldRunPhase('e2e') && this.options.environment === 'development') {
      console.log('⚛️  Starting frontend dev server...');
      // Implementation for starting dev server
    }
  }

  async runTestPhases() {
    const phases = this.getPhaseOrder();
    
    if (this.options.parallel && phases.length > 1) {
      await this.runPhasesParallel(phases);
    } else {
      await this.runPhasesSequential(phases);
    }
  }

  getPhaseOrder() {
    const allPhases = ['unit', 'integration', 'e2e', 'performance', 'accessibility'];
    
    if (this.options.filter) {
      return allPhases.filter(phase => 
        this.options.filter.includes(phase) && this.shouldRunPhase(phase)
      );
    }
    
    return allPhases.filter(phase => this.shouldRunPhase(phase));
  }

  shouldRunPhase(phase) {
    if (this.options.filter) {
      return this.options.filter.includes(phase);
    }
    return true;
  }

  async runPhasesSequential(phases) {
    console.log('🔄 Running test phases sequentially...\n');

    for (const phase of phases) {
      const result = await this.runPhase(phase);
      this.results.phases[phase] = result;

      if (this.options.bail && !result.passed) {
        console.log(`❌ Bailing out due to ${phase} phase failure`);
        break;
      }
    }
  }

  async runPhasesParallel(phases) {
    console.log('⚡ Running test phases in parallel...\n');

    // Separate critical and non-critical phases
    const criticalPhases = phases.filter(phase => TEST_CONFIG[phase]?.critical);
    const nonCriticalPhases = phases.filter(phase => !TEST_CONFIG[phase]?.critical);

    // Run critical phases first (sequentially)
    for (const phase of criticalPhases) {
      const result = await this.runPhase(phase);
      this.results.phases[phase] = result;

      if (this.options.bail && !result.passed) {
        console.log(`❌ Bailing out due to critical ${phase} phase failure`);
        return;
      }
    }

    // Run non-critical phases in parallel
    if (nonCriticalPhases.length > 0) {
      const phasePromises = nonCriticalPhases.map(phase => this.runPhase(phase));
      const results = await Promise.allSettled(phasePromises);

      nonCriticalPhases.forEach((phase, index) => {
        const result = results[index];
        if (result.status === 'fulfilled') {
          this.results.phases[phase] = result.value;
        } else {
          this.results.phases[phase] = {
            phase,
            passed: false,
            duration: 0,
            error: result.reason.message,
            tests: { total: 0, passed: 0, failed: 1 },
          };
        }
      });
    }
  }

  async runPhase(phase) {
    console.log(`🧪 Running ${phase} tests...`);
    const startTime = Date.now();

    try {
      let result;

      switch (phase) {
        case 'unit':
          result = await this.runUnitTests();
          break;
        case 'integration':
          result = await this.runIntegrationTests();
          break;
        case 'e2e':
          result = await this.runE2ETests();
          break;
        case 'performance':
          result = await this.runPerformanceTests();
          break;
        case 'accessibility':
          result = await this.runAccessibilityTests();
          break;
        default:
          throw new Error(`Unknown test phase: ${phase}`);
      }

      const duration = Date.now() - startTime;
      result.duration = duration;

      console.log(`${result.passed ? '✅' : '❌'} ${phase} phase completed in ${this.formatDuration(duration)}`);
      
      if (result.tests) {
        console.log(`   Tests: ${result.tests.passed}/${result.tests.total} passed`);
      }

      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }

      console.log('');
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ ${phase} phase failed in ${this.formatDuration(duration)}`);
      console.log(`   Error: ${error.message}`);
      console.log('');

      return {
        phase,
        passed: false,
        duration,
        error: error.message,
        tests: { total: 0, passed: 0, failed: 1 },
      };
    }
  }

  async runUnitTests() {
    const config = TEST_CONFIG.unit;
    
    try {
      const output = execSync(config.command, {
        encoding: 'utf8',
        timeout: config.timeout,
        stdio: 'pipe',
      });

      // Parse Jest output for test results
      const result = this.parseJestOutput(output);
      
      // Extract coverage information
      if (this.options.coverage) {
        this.results.coverage = this.extractCoverageData();
      }

      return {
        phase: 'unit',
        passed: result.failed === 0,
        tests: result,
        coverage: this.results.coverage,
      };

    } catch (error) {
      // Jest exits with non-zero code when tests fail
      const output = error.stdout || error.message;
      const result = this.parseJestOutput(output);
      
      return {
        phase: 'unit',
        passed: false,
        tests: result,
        error: `${result.failed} unit tests failed`,
      };
    }
  }

  async runIntegrationTests() {
    const config = TEST_CONFIG.integration;
    
    try {
      const output = execSync(config.command, {
        encoding: 'utf8',
        timeout: config.timeout,
        stdio: 'pipe',
      });

      const result = this.parseJestOutput(output);
      
      return {
        phase: 'integration',
        passed: result.failed === 0,
        tests: result,
      };

    } catch (error) {
      const output = error.stdout || error.message;
      const result = this.parseJestOutput(output);
      
      return {
        phase: 'integration',
        passed: false,
        tests: result,
        error: `${result.failed} integration tests failed`,
      };
    }
  }

  async runE2ETests() {
    const config = TEST_CONFIG.e2e;
    
    try {
      const output = execSync(config.command, {
        encoding: 'utf8',
        timeout: config.timeout,
        stdio: 'pipe',
      });

      const result = this.parsePlaywrightOutput(output);
      
      return {
        phase: 'e2e',
        passed: result.failed === 0,
        tests: result,
      };

    } catch (error) {
      const output = error.stdout || error.message;
      const result = this.parsePlaywrightOutput(output);
      
      return {
        phase: 'e2e',
        passed: false,
        tests: result,
        error: `${result.failed} E2E tests failed`,
      };
    }
  }

  async runPerformanceTests() {
    const results = {
      lighthouse: null,
      bundleAnalysis: null,
    };

    let allPassed = true;

    // Run Lighthouse audit
    if (TEST_CONFIG.performance.lighthouse) {
      try {
        console.log('   🔍 Running Lighthouse audit...');
        const lighthouseResult = await runPerformanceAudit();
        results.lighthouse = lighthouseResult;
        
        if (!lighthouseResult.summary.overallPass) {
          allPassed = false;
        }
      } catch (error) {
        console.log('   ❌ Lighthouse audit failed:', error.message);
        results.lighthouse = { error: error.message };
        allPassed = false;
      }
    }

    // Run bundle analysis
    if (TEST_CONFIG.performance.bundleAnalysis) {
      try {
        console.log('   📦 Running bundle analysis...');
        const bundleResult = await runBundleAnalysis();
        results.bundleAnalysis = bundleResult;
        
        if (!bundleResult.passed) {
          allPassed = false;
        }
      } catch (error) {
        console.log('   ❌ Bundle analysis failed:', error.message);
        results.bundleAnalysis = { error: error.message };
        allPassed = false;
      }
    }

    this.results.performance = results;

    return {
      phase: 'performance',
      passed: allPassed,
      performance: results,
      tests: {
        total: 2,
        passed: allPassed ? 2 : (results.lighthouse?.summary?.overallPass ? 1 : 0) + (results.bundleAnalysis?.passed ? 1 : 0),
        failed: allPassed ? 0 : 2 - ((results.lighthouse?.summary?.overallPass ? 1 : 0) + (results.bundleAnalysis?.passed ? 1 : 0)),
      },
    };
  }

  async runAccessibilityTests() {
    // Placeholder for accessibility tests
    // You could integrate with tools like axe-core, Pa11y, etc.
    
    return {
      phase: 'accessibility',
      passed: true,
      tests: { total: 0, passed: 0, failed: 0 },
      skipped: 'Accessibility tests not implemented yet',
    };
  }

  parseJestOutput(output) {
    // Parse Jest test results from output
    const testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };

    // Look for Jest summary lines
    const summaryMatch = output.match(/Tests:\s+(\d+)\s+failed.*?(\d+)\s+passed.*?(\d+)\s+total/);
    if (summaryMatch) {
      testResults.failed = parseInt(summaryMatch[1]);
      testResults.passed = parseInt(summaryMatch[2]);
      testResults.total = parseInt(summaryMatch[3]);
    }

    // Alternative pattern
    const altMatch = output.match(/(\d+)\s+passing.*?(\d+)\s+failing/);
    if (altMatch && !summaryMatch) {
      testResults.passed = parseInt(altMatch[1]);
      testResults.failed = parseInt(altMatch[2]);
      testResults.total = testResults.passed + testResults.failed;
    }

    return testResults;
  }

  parsePlaywrightOutput(output) {
    // Parse Playwright test results from output
    const testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };

    // Look for Playwright summary
    const summaryMatch = output.match(/(\d+)\s+passed.*?(\d+)\s+failed.*?(\d+)\s+skipped/);
    if (summaryMatch) {
      testResults.passed = parseInt(summaryMatch[1]);
      testResults.failed = parseInt(summaryMatch[2]);
      testResults.skipped = parseInt(summaryMatch[3]);
      testResults.total = testResults.passed + testResults.failed + testResults.skipped;
    }

    return testResults;
  }

  extractCoverageData() {
    // Extract coverage data from coverage reports
    const coveragePath = './coverage/coverage-summary.json';
    
    if (fs.existsSync(coveragePath)) {
      try {
        const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        return {
          lines: coverageData.total.lines.pct,
          statements: coverageData.total.statements.pct,
          functions: coverageData.total.functions.pct,
          branches: coverageData.total.branches.pct,
        };
      } catch (error) {
        console.warn('⚠️  Failed to parse coverage data:', error.message);
      }
    }

    return null;
  }

  async generateReports() {
    console.log('📄 Generating test reports...');

    // Calculate final summary
    this.calculateSummary();

    // Generate JSON report
    await this.generateJSONReport();

    // Generate HTML report
    await this.generateHTMLReport();

    // Generate JUnit XML report
    await this.generateJUnitReport();

    console.log('✅ Reports generated successfully\n');
  }

  calculateSummary() {
    const summary = this.results.summary;
    
    Object.values(this.results.phases).forEach(phase => {
      if (phase.tests) {
        summary.total += phase.tests.total;
        summary.passed += phase.tests.passed;
        summary.failed += phase.tests.failed;
        summary.skipped += phase.tests.skipped || 0;
      }
    });

    summary.duration = Date.now() - this.startTime;
  }

  async generateJSONReport() {
    const reportPath = path.join(REPORT_CONFIG.outputDir, 'test-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
  }

  async generateHTMLReport() {
    const html = this.generateHTMLContent();
    const reportPath = path.join(REPORT_CONFIG.outputDir, 'test-results.html');
    fs.writeFileSync(reportPath, html);
  }

  async generateJUnitReport() {
    const xml = this.generateJUnitXML();
    const reportPath = path.join(REPORT_CONFIG.outputDir, 'junit-results.xml');
    fs.writeFileSync(reportPath, xml);
  }

  generateHTMLContent() {
    // Generate comprehensive HTML report
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Results - Lion Football Academy</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 3px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #007bff; text-align: center; }
        .metric { font-size: 2em; font-weight: bold; margin-bottom: 10px; }
        .success { color: #28a745; }
        .danger { color: #dc3545; }
        .warning { color: #ffc107; }
        .phase-results { margin-bottom: 30px; }
        .phase-card { border: 1px solid #ddd; border-radius: 6px; margin-bottom: 20px; overflow: hidden; }
        .phase-header { padding: 15px; background: #f8f9fa; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
        .phase-content { padding: 15px; }
        .status-badge { padding: 4px 12px; border-radius: 20px; color: white; font-size: 0.8em; }
        .badge-success { background: #28a745; }
        .badge-danger { background: #dc3545; }
        .badge-warning { background: #ffc107; color: #212529; }
        .coverage-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin: 5px 0; }
        .coverage-fill { height: 100%; background: linear-gradient(to right, #dc3545, #ffc107, #28a745); transition: width 0.3s ease; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🦁 Lion Football Academy</h1>
            <h2>Test Results Report</h2>
            <p>Generated: ${new Date(this.results.timestamp).toLocaleString()}</p>
            <p>Environment: ${this.results.environment}</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <div class="metric ${this.results.summary.failed === 0 ? 'success' : 'danger'}">${this.results.summary.passed}/${this.results.summary.total}</div>
                <div>Tests Passed</div>
            </div>
            <div class="summary-card">
                <div class="metric">${this.formatDuration(this.results.summary.duration)}</div>
                <div>Total Duration</div>
            </div>
            <div class="summary-card">
                <div class="metric ${this.results.summary.failed === 0 ? 'success' : 'danger'}">${this.getOverallStatus()}</div>
                <div>Overall Status</div>
            </div>
            ${this.results.coverage ? `
            <div class="summary-card">
                <div class="metric success">${this.results.coverage.lines}%</div>
                <div>Line Coverage</div>
            </div>
            ` : ''}
        </div>

        <div class="phase-results">
            <h2>📊 Phase Results</h2>
            ${Object.entries(this.results.phases).map(([phaseName, phase]) => `
                <div class="phase-card">
                    <div class="phase-header">
                        <span>${phaseName.charAt(0).toUpperCase() + phaseName.slice(1)} Tests</span>
                        <span class="status-badge ${phase.passed ? 'badge-success' : 'badge-danger'}">
                            ${phase.passed ? 'PASSED' : 'FAILED'}
                        </span>
                    </div>
                    <div class="phase-content">
                        ${phase.tests ? `
                            <p><strong>Tests:</strong> ${phase.tests.passed}/${phase.tests.total} passed</p>
                            <p><strong>Duration:</strong> ${this.formatDuration(phase.duration)}</p>
                        ` : ''}
                        ${phase.error ? `<p><strong>Error:</strong> ${phase.error}</p>` : ''}
                        ${phase.skipped ? `<p><strong>Note:</strong> ${phase.skipped}</p>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>

        ${this.results.coverage ? `
            <div class="coverage-section">
                <h2>📈 Code Coverage</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                    ${Object.entries(this.results.coverage).map(([metric, value]) => `
                        <div>
                            <strong>${metric.charAt(0).toUpperCase() + metric.slice(1)}: ${value}%</strong>
                            <div class="coverage-bar">
                                <div class="coverage-fill" style="width: ${value}%"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        ${this.results.performance ? `
            <div class="performance-section">
                <h2>⚡ Performance Results</h2>
                ${this.results.performance.lighthouse ? `
                    <h3>Lighthouse Audit</h3>
                    <p>Average Performance Score: ${this.results.performance.lighthouse.summary?.averageScores?.performance || 'N/A'}</p>
                ` : ''}
                ${this.results.performance.bundleAnalysis ? `
                    <h3>Bundle Analysis</h3>
                    <p>Total Bundle Size: ${this.results.performance.bundleAnalysis.summary?.totalSizeFormatted || 'N/A'}</p>
                ` : ''}
            </div>
        ` : ''}
    </div>
</body>
</html>`;
  }

  generateJUnitXML() {
    // Generate JUnit XML format for CI/CD integration
    const testSuites = Object.entries(this.results.phases).map(([name, phase]) => {
      const tests = phase.tests || { total: 0, passed: 0, failed: 0 };
      return `
    <testsuite name="${name}" tests="${tests.total}" failures="${tests.failed}" time="${(phase.duration || 0) / 1000}">
      ${tests.failed > 0 ? `<testcase name="${name}-tests" classname="${name}"><failure message="${phase.error || 'Tests failed'}"/></testcase>` : ''}
      ${tests.passed > 0 ? `<testcase name="${name}-tests" classname="${name}"/>` : ''}
    </testsuite>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Lion Football Academy Tests" tests="${this.results.summary.total}" failures="${this.results.summary.failed}" time="${this.results.summary.duration / 1000}">
${testSuites}
</testsuites>`;
  }

  displaySummary() {
    console.log('📊 Test Summary');
    console.log('===============');
    console.log(`Overall Status: ${this.getOverallStatus()}`);
    console.log(`Total Tests: ${this.results.summary.total}`);
    console.log(`Passed: ${this.results.summary.passed}`);
    console.log(`Failed: ${this.results.summary.failed}`);
    console.log(`Skipped: ${this.results.summary.skipped}`);
    console.log(`Duration: ${this.formatDuration(this.results.summary.duration)}`);
    
    if (this.results.coverage) {
      console.log(`Coverage: Lines ${this.results.coverage.lines}%, Functions ${this.results.coverage.functions}%`);
    }

    console.log('\nPhase Results:');
    Object.entries(this.results.phases).forEach(([phase, result]) => {
      const status = result.passed ? '✅' : '❌';
      const tests = result.tests ? `(${result.tests.passed}/${result.tests.total})` : '';
      console.log(`  ${status} ${phase}: ${result.passed ? 'PASSED' : 'FAILED'} ${tests}`);
    });

    console.log(`\n📄 Reports available in: ${path.resolve(REPORT_CONFIG.outputDir)}`);
  }

  getOverallStatus() {
    return this.results.summary.failed === 0 ? 'PASSED' : 'FAILED';
  }

  getExitCode() {
    // Exit with 0 if all critical tests passed
    const criticalPhases = Object.entries(this.results.phases).filter(([phase]) => 
      TEST_CONFIG[phase]?.critical
    );

    const criticalFailures = criticalPhases.filter(([, result]) => !result.passed);
    
    return criticalFailures.length === 0 ? 0 : 1;
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}

// CLI interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--parallel':
        options.parallel = true;
        break;
      case '--no-parallel':
        options.parallel = false;
        break;
      case '--bail':
        options.bail = true;
        break;
      case '--no-coverage':
        options.coverage = false;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--watch':
        options.watch = true;
        break;
      case '--filter':
        options.filter = args[++i].split(',');
        break;
      case '--environment':
        options.environment = args[++i];
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
🦁 Lion Football Academy Test Runner

Usage: node test-runner.js [options]

Options:
  --parallel              Run non-critical tests in parallel (default: true)
  --no-parallel          Run all tests sequentially
  --bail                 Stop on first failure
  --no-coverage          Skip coverage collection
  --verbose              Verbose output
  --watch                Watch mode (not implemented)
  --filter <phases>      Only run specific phases (comma-separated)
                         Available: unit,integration,e2e,performance,accessibility
  --environment <env>    Set test environment (default: test)
  --help                 Show this help

Examples:
  node test-runner.js                           # Run all tests
  node test-runner.js --filter unit,integration # Run only unit and integration tests
  node test-runner.js --bail --no-parallel     # Run sequentially, stop on failure
  node test-runner.js --environment staging    # Run tests against staging environment
`);
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const runner = new TestRunner(options);
  runner.run();
}

module.exports = { TestRunner };