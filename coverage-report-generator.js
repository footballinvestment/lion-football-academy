#!/usr/bin/env node

/**
 * Comprehensive Coverage Report Generator
 * Generates combined coverage reports for frontend and backend
 * Meets CODE_PILOT_INSTRUCTION_7.1 requirement of 90%+ coverage
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CoverageReportGenerator {
  constructor() {
    this.frontendPath = path.join(__dirname, 'frontend');
    this.backendPath = path.join(__dirname, 'backend');
    this.reportPath = path.join(__dirname, 'coverage-reports');
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  }

  async generateReports() {
    console.log('🧪 Starting comprehensive test coverage analysis...\n');
    
    // Create reports directory
    if (!fs.existsSync(this.reportPath)) {
      fs.mkdirSync(this.reportPath, { recursive: true });
    }

    try {
      // Run backend tests with coverage
      console.log('📊 Running backend tests with coverage...');
      await this.runBackendTests();
      
      // Run frontend tests with coverage
      console.log('📊 Running frontend tests with coverage...');
      await this.runFrontendTests();
      
      // Generate combined report
      console.log('📈 Generating combined coverage report...');
      await this.generateCombinedReport();
      
      // Generate summary report
      console.log('📋 Generating coverage summary...');
      await this.generateSummaryReport();
      
      console.log('✅ Coverage analysis complete!\n');
      
    } catch (error) {
      console.error('❌ Coverage analysis failed:', error.message);
      process.exit(1);
    }
  }

  async runBackendTests() {
    try {
      const backendCoverage = execSync(
        'npm run test:coverage',
        { 
          cwd: this.backendPath,
          encoding: 'utf8',
          stdio: 'pipe'
        }
      );
      
      console.log('✅ Backend tests completed');
      
      // Copy backend coverage to reports
      const backendCoveragePath = path.join(this.backendPath, 'coverage');
      const backendReportPath = path.join(this.reportPath, 'backend');
      
      if (fs.existsSync(backendCoveragePath)) {
        this.copyDirectory(backendCoveragePath, backendReportPath);
      }
      
      return this.parseCoverageJson(path.join(backendCoveragePath, 'coverage-summary.json'));
      
    } catch (error) {
      console.error('Backend test execution failed:', error.message);
      throw error;
    }
  }

  async runFrontendTests() {
    try {
      const frontendCoverage = execSync(
        'npm run test:coverage',
        { 
          cwd: this.frontendPath,
          encoding: 'utf8',
          stdio: 'pipe'
        }
      );
      
      console.log('✅ Frontend tests completed');
      
      // Copy frontend coverage to reports
      const frontendCoveragePath = path.join(this.frontendPath, 'coverage');
      const frontendReportPath = path.join(this.reportPath, 'frontend');
      
      if (fs.existsSync(frontendCoveragePath)) {
        this.copyDirectory(frontendCoveragePath, frontendReportPath);
      }
      
      return this.parseCoverageJson(path.join(frontendCoveragePath, 'coverage-summary.json'));
      
    } catch (error) {
      console.error('Frontend test execution failed:', error.message);
      throw error;
    }
  }

  parseCoverageJson(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const coverageData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return coverageData.total;
      }
      return null;
    } catch (error) {
      console.warn(`Could not parse coverage file: ${filePath}`);
      return null;
    }
  }

  async generateCombinedReport() {
    const backendSummary = this.parseCoverageJson(
      path.join(this.reportPath, 'backend', 'coverage-summary.json')
    );
    const frontendSummary = this.parseCoverageJson(
      path.join(this.reportPath, 'frontend', 'coverage-summary.json')
    );

    const combinedReport = {
      timestamp: new Date().toISOString(),
      projectName: 'Lion Football Academy',
      overallCoverage: this.calculateOverallCoverage(backendSummary, frontendSummary),
      backend: backendSummary,
      frontend: frontendSummary,
      requirements: {
        target: 90,
        met: false
      },
      details: {
        backendTestFiles: this.countTestFiles(path.join(this.backendPath, 'tests')),
        frontendTestFiles: this.countTestFiles(path.join(this.frontendPath, 'src/__tests__')),
        totalTestFiles: 0
      }
    };

    // Calculate total test files
    combinedReport.details.totalTestFiles = 
      combinedReport.details.backendTestFiles + combinedReport.details.frontendTestFiles;

    // Check if requirements are met
    if (combinedReport.overallCoverage) {
      combinedReport.requirements.met = Object.values(combinedReport.overallCoverage)
        .every(metric => metric.pct >= 90);
    }

    // Write combined report
    const reportFile = path.join(this.reportPath, 'combined-coverage-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(combinedReport, null, 2));

    return combinedReport;
  }

  calculateOverallCoverage(backend, frontend) {
    if (!backend || !frontend) {
      return backend || frontend;
    }

    // Combine coverage metrics from both frontend and backend
    const combined = {};
    const metrics = ['lines', 'functions', 'branches', 'statements'];

    metrics.forEach(metric => {
      const backendMetric = backend[metric] || { total: 0, covered: 0, pct: 0 };
      const frontendMetric = frontend[metric] || { total: 0, covered: 0, pct: 0 };

      const totalLines = backendMetric.total + frontendMetric.total;
      const coveredLines = backendMetric.covered + frontendMetric.covered;
      const percentage = totalLines > 0 ? (coveredLines / totalLines) * 100 : 0;

      combined[metric] = {
        total: totalLines,
        covered: coveredLines,
        skipped: (backendMetric.skipped || 0) + (frontendMetric.skipped || 0),
        pct: Math.round(percentage * 100) / 100
      };
    });

    return combined;
  }

  countTestFiles(directory) {
    if (!fs.existsSync(directory)) {
      return 0;
    }

    let count = 0;
    const files = this.getAllFiles(directory);
    
    files.forEach(file => {
      if (file.endsWith('.test.js') || file.endsWith('.test.jsx') || 
          file.endsWith('.spec.js') || file.endsWith('.spec.jsx')) {
        count++;
      }
    });

    return count;
  }

  getAllFiles(directory) {
    let files = [];
    
    try {
      const items = fs.readdirSync(directory);
      
      items.forEach(item => {
        const fullPath = path.join(directory, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          files = files.concat(this.getAllFiles(fullPath));
        } else {
          files.push(fullPath);
        }
      });
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return files;
  }

  async generateSummaryReport() {
    const combinedReportPath = path.join(this.reportPath, 'combined-coverage-report.json');
    
    if (!fs.existsSync(combinedReportPath)) {
      throw new Error('Combined coverage report not found');
    }

    const reportData = JSON.parse(fs.readFileSync(combinedReportPath, 'utf8'));
    
    // Generate HTML summary
    const htmlSummary = this.generateHTMLSummary(reportData);
    fs.writeFileSync(path.join(this.reportPath, 'coverage-summary.html'), htmlSummary);
    
    // Generate console summary
    this.generateConsoleSummary(reportData);
    
    // Generate CI/CD friendly report
    this.generateCIReport(reportData);
  }

  generateHTMLSummary(reportData) {
    const { overallCoverage, backend, frontend, requirements } = reportData;
    
    const getStatusIcon = (met) => met ? '✅' : '❌';
    const getStatusColor = (pct) => pct >= 90 ? 'green' : pct >= 75 ? 'orange' : 'red';

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Lion Football Academy - Test Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2c5530; color: white; padding: 20px; border-radius: 8px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; border-radius: 5px; min-width: 120px; text-align: center; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; }
        .danger { background: #f8d7da; border: 1px solid #f5c6cb; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
        .progress-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; transition: width 0.3s ease; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🦁 Lion Football Academy - Test Coverage Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <p>Target Coverage: 90%+ ${getStatusIcon(requirements.met)} ${requirements.met ? 'PASSED' : 'FAILED'}</p>
    </div>

    <div class="section">
        <h2>📊 Overall Coverage Summary</h2>
        <div>
            <div class="metric ${overallCoverage.lines.pct >= 90 ? 'success' : overallCoverage.lines.pct >= 75 ? 'warning' : 'danger'}">
                <h3>Lines</h3>
                <p>${overallCoverage.lines.pct}%</p>
                <p>${overallCoverage.lines.covered}/${overallCoverage.lines.total}</p>
            </div>
            <div class="metric ${overallCoverage.functions.pct >= 90 ? 'success' : overallCoverage.functions.pct >= 75 ? 'warning' : 'danger'}">
                <h3>Functions</h3>
                <p>${overallCoverage.functions.pct}%</p>
                <p>${overallCoverage.functions.covered}/${overallCoverage.functions.total}</p>
            </div>
            <div class="metric ${overallCoverage.branches.pct >= 90 ? 'success' : overallCoverage.branches.pct >= 75 ? 'warning' : 'danger'}">
                <h3>Branches</h3>
                <p>${overallCoverage.branches.pct}%</p>
                <p>${overallCoverage.branches.covered}/${overallCoverage.branches.total}</p>
            </div>
            <div class="metric ${overallCoverage.statements.pct >= 90 ? 'success' : overallCoverage.statements.pct >= 75 ? 'warning' : 'danger'}">
                <h3>Statements</h3>
                <p>${overallCoverage.statements.pct}%</p>
                <p>${overallCoverage.statements.covered}/${overallCoverage.statements.total}</p>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>🖥️ Frontend vs Backend Coverage</h2>
        <table>
            <tr>
                <th>Component</th>
                <th>Lines</th>
                <th>Functions</th>
                <th>Branches</th>
                <th>Statements</th>
            </tr>
            <tr>
                <td><strong>Frontend</strong></td>
                <td style="color: ${getStatusColor(frontend.lines.pct)}">${frontend.lines.pct}%</td>
                <td style="color: ${getStatusColor(frontend.functions.pct)}">${frontend.functions.pct}%</td>
                <td style="color: ${getStatusColor(frontend.branches.pct)}">${frontend.branches.pct}%</td>
                <td style="color: ${getStatusColor(frontend.statements.pct)}">${frontend.statements.pct}%</td>
            </tr>
            <tr>
                <td><strong>Backend</strong></td>
                <td style="color: ${getStatusColor(backend.lines.pct)}">${backend.lines.pct}%</td>
                <td style="color: ${getStatusColor(backend.functions.pct)}">${backend.functions.pct}%</td>
                <td style="color: ${getStatusColor(backend.branches.pct)}">${backend.branches.pct}%</td>
                <td style="color: ${getStatusColor(backend.statements.pct)}">${backend.statements.pct}%</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h2>📈 Test Coverage Details</h2>
        <p><strong>Total Test Files:</strong> ${reportData.details.totalTestFiles}</p>
        <p><strong>Frontend Test Files:</strong> ${reportData.details.frontendTestFiles}</p>
        <p><strong>Backend Test Files:</strong> ${reportData.details.backendTestFiles}</p>
        
        <h3>Requirements Status</h3>
        <ul>
            <li>90%+ Line Coverage: ${getStatusIcon(overallCoverage.lines.pct >= 90)} ${overallCoverage.lines.pct}%</li>
            <li>90%+ Function Coverage: ${getStatusIcon(overallCoverage.functions.pct >= 90)} ${overallCoverage.functions.pct}%</li>
            <li>90%+ Branch Coverage: ${getStatusIcon(overallCoverage.branches.pct >= 90)} ${overallCoverage.branches.pct}%</li>
            <li>90%+ Statement Coverage: ${getStatusIcon(overallCoverage.statements.pct >= 90)} ${overallCoverage.statements.pct}%</li>
        </ul>
    </div>

    <div class="section">
        <h2>🔗 Detailed Reports</h2>
        <p><a href="frontend/lcov-report/index.html">Frontend Detailed Coverage</a></p>
        <p><a href="backend/lcov-report/index.html">Backend Detailed Coverage</a></p>
    </div>
</body>
</html>`;
  }

  generateConsoleSummary(reportData) {
    const { overallCoverage, requirements } = reportData;
    
    console.log('\n🦁 LION FOOTBALL ACADEMY - COVERAGE REPORT');
    console.log('='.repeat(50));
    console.log(`Generated: ${new Date().toLocaleString()}`);
    console.log(`Target: 90%+ coverage ${requirements.met ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('\n📊 OVERALL COVERAGE:');
    console.log(`Lines:      ${overallCoverage.lines.pct}% (${overallCoverage.lines.covered}/${overallCoverage.lines.total})`);
    console.log(`Functions:  ${overallCoverage.functions.pct}% (${overallCoverage.functions.covered}/${overallCoverage.functions.total})`);
    console.log(`Branches:   ${overallCoverage.branches.pct}% (${overallCoverage.branches.covered}/${overallCoverage.branches.total})`);
    console.log(`Statements: ${overallCoverage.statements.pct}% (${overallCoverage.statements.covered}/${overallCoverage.statements.total})`);
    console.log('\n📁 TEST FILES:');
    console.log(`Frontend: ${reportData.details.frontendTestFiles}`);
    console.log(`Backend:  ${reportData.details.backendTestFiles}`);
    console.log(`Total:    ${reportData.details.totalTestFiles}`);
    console.log('\n📝 REPORT LOCATION:');
    console.log(`HTML Report: ${path.join(this.reportPath, 'coverage-summary.html')}`);
    console.log('='.repeat(50));
  }

  generateCIReport(reportData) {
    const ciReport = {
      success: reportData.requirements.met,
      coverage: reportData.overallCoverage,
      target: 90,
      message: reportData.requirements.met 
        ? 'All coverage targets met' 
        : 'Coverage targets not met',
      timestamp: reportData.timestamp
    };

    fs.writeFileSync(
      path.join(this.reportPath, 'ci-coverage-report.json'),
      JSON.stringify(ciReport, null, 2)
    );
  }

  copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);
    
    files.forEach(file => {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      const stat = fs.statSync(srcPath);
      
      if (stat.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    });
  }
}

// Run coverage report generation
if (require.main === module) {
  const generator = new CoverageReportGenerator();
  generator.generateReports().catch(error => {
    console.error('Coverage report generation failed:', error);
    process.exit(1);
  });
}

module.exports = CoverageReportGenerator;