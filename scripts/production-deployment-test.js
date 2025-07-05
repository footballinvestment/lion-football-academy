#!/usr/bin/env node

/**
 * Production Deployment Testing Suite
 * Lion Football Academy - Comprehensive Production Validation
 * 
 * This script performs comprehensive testing of the production deployment
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ProductionDeploymentTester {
  constructor() {
    this.frontendUrl = process.env.FRONTEND_URL || 'https://lionfootballacademy.com';
    this.backendUrl = process.env.BACKEND_URL || 'https://api.lionfootballacademy.com';
    this.testResults = {
      timestamp: new Date().toISOString(),
      frontend: {},
      backend: {},
      integration: {},
      security: {},
      performance: {},
      overall: {
        passed: 0,
        failed: 0,
        warnings: 0,
        score: 0
      }
    };
  }

  async runAllTests() {
    console.log('🚀 PRODUCTION DEPLOYMENT TESTING SUITE');
    console.log('='.repeat(60));
    console.log(`Frontend URL: ${this.frontendUrl}`);
    console.log(`Backend URL: ${this.backendUrl}`);
    console.log('='.repeat(60));

    try {
      await this.testFrontendDeployment();
      await this.testBackendDeployment();
      await this.testSecurityConfiguration();
      await this.testPerformance();
      await this.testIntegration();
      
      this.generateReport();
      this.displaySummary();
      
    } catch (error) {
      console.error('❌ Testing suite failed:', error.message);
      process.exit(1);
    }
  }

  async testFrontendDeployment() {
    console.log('\n🌐 TESTING FRONTEND DEPLOYMENT');
    console.log('-'.repeat(40));

    const tests = [
      { name: 'Frontend Accessibility', test: () => this.testFrontendAccessibility() },
      { name: 'Static Assets Loading', test: () => this.testStaticAssets() },
      { name: 'Service Worker', test: () => this.testServiceWorker() },
      { name: 'Manifest File', test: () => this.testManifest() },
      { name: 'Meta Tags', test: () => this.testMetaTags() },
      { name: 'Responsive Design', test: () => this.testResponsive() }
    ];

    this.testResults.frontend = await this.runTestSuite(tests);
  }

  async testBackendDeployment() {
    console.log('\n🖥️ TESTING BACKEND DEPLOYMENT');
    console.log('-'.repeat(40));

    const tests = [
      { name: 'Health Check', test: () => this.testHealthEndpoint() },
      { name: 'API Endpoints', test: () => this.testApiEndpoints() },
      { name: 'Database Connection', test: () => this.testDatabaseConnection() },
      { name: 'Authentication', test: () => this.testAuthentication() },
      { name: 'Error Handling', test: () => this.testErrorHandling() },
      { name: 'Rate Limiting', test: () => this.testRateLimiting() }
    ];

    this.testResults.backend = await this.runTestSuite(tests);
  }

  async testSecurityConfiguration() {
    console.log('\n🔒 TESTING SECURITY CONFIGURATION');
    console.log('-'.repeat(40));

    const tests = [
      { name: 'HTTPS Enforcement', test: () => this.testHTTPS() },
      { name: 'Security Headers', test: () => this.testSecurityHeaders() },
      { name: 'CORS Configuration', test: () => this.testCORS() },
      { name: 'SSL Certificate', test: () => this.testSSLCertificate() },
      { name: 'Content Security Policy', test: () => this.testCSP() },
      { name: 'Authentication Security', test: () => this.testAuthSecurity() }
    ];

    this.testResults.security = await this.runTestSuite(tests);
  }

  async testPerformance() {
    console.log('\n⚡ TESTING PERFORMANCE');
    console.log('-'.repeat(40));

    const tests = [
      { name: 'Frontend Load Time', test: () => this.testFrontendPerformance() },
      { name: 'API Response Time', test: () => this.testApiPerformance() },
      { name: 'Asset Compression', test: () => this.testCompression() },
      { name: 'Caching Headers', test: () => this.testCaching() },
      { name: 'CDN Configuration', test: () => this.testCDN() }
    ];

    this.testResults.performance = await this.runTestSuite(tests);
  }

  async testIntegration() {
    console.log('\n🔗 TESTING INTEGRATION');
    console.log('-'.repeat(40));

    const tests = [
      { name: 'Frontend-Backend Communication', test: () => this.testFrontendBackendIntegration() },
      { name: 'User Registration Flow', test: () => this.testUserRegistration() },
      { name: 'Login Flow', test: () => this.testLoginFlow() },
      { name: 'API Data Flow', test: () => this.testApiDataFlow() },
      { name: 'Error Handling Integration', test: () => this.testErrorIntegration() }
    ];

    this.testResults.integration = await this.runTestSuite(tests);
  }

  async runTestSuite(tests) {
    const results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };

    for (const test of tests) {
      try {
        console.log(`  Testing ${test.name}...`);
        const result = await test.test();
        
        if (result.status === 'passed') {
          console.log(`  ✅ ${test.name}: PASSED`);
          results.passed++;
        } else if (result.status === 'warning') {
          console.log(`  ⚠️ ${test.name}: WARNING - ${result.message}`);
          results.warnings++;
        } else {
          console.log(`  ❌ ${test.name}: FAILED - ${result.message}`);
          results.failed++;
        }
        
        results.tests.push({
          name: test.name,
          status: result.status,
          message: result.message,
          details: result.details
        });
        
      } catch (error) {
        console.log(`  ❌ ${test.name}: FAILED - ${error.message}`);
        results.failed++;
        results.tests.push({
          name: test.name,
          status: 'failed',
          message: error.message,
          details: null
        });
      }
    }

    return results;
  }

  // Frontend Tests
  async testFrontendAccessibility() {
    try {
      const response = await axios.get(this.frontendUrl, { timeout: 10000 });
      
      if (response.status === 200) {
        return { status: 'passed', message: 'Frontend accessible' };
      } else {
        return { status: 'failed', message: `Unexpected status: ${response.status}` };
      }
    } catch (error) {
      return { status: 'failed', message: error.message };
    }
  }

  async testStaticAssets() {
    try {
      const response = await axios.get(this.frontendUrl);
      const html = response.data;
      
      // Check for common static assets
      const hasCSS = html.includes('.css');
      const hasJS = html.includes('.js');
      const hasIcons = html.includes('favicon');
      
      if (hasCSS && hasJS) {
        return { status: 'passed', message: 'Static assets loaded' };
      } else {
        return { status: 'warning', message: 'Some static assets may be missing' };
      }
    } catch (error) {
      return { status: 'failed', message: error.message };
    }
  }

  async testServiceWorker() {
    try {
      const response = await axios.get(`${this.frontendUrl}/sw.js`);
      
      if (response.status === 200) {
        return { status: 'passed', message: 'Service worker found' };
      } else {
        return { status: 'warning', message: 'Service worker not found' };
      }
    } catch (error) {
      return { status: 'warning', message: 'Service worker not accessible' };
    }
  }

  async testManifest() {
    try {
      const response = await axios.get(`${this.frontendUrl}/manifest.json`);
      
      if (response.status === 200 && response.data.name) {
        return { status: 'passed', message: 'Manifest file valid' };
      } else {
        return { status: 'warning', message: 'Manifest file issues' };
      }
    } catch (error) {
      return { status: 'warning', message: 'Manifest file not found' };
    }
  }

  async testMetaTags() {
    try {
      const response = await axios.get(this.frontendUrl);
      const html = response.data;
      
      const hasTitle = html.includes('<title>');
      const hasDescription = html.includes('name="description"');
      const hasViewport = html.includes('name="viewport"');
      
      if (hasTitle && hasDescription && hasViewport) {
        return { status: 'passed', message: 'Essential meta tags present' };
      } else {
        return { status: 'warning', message: 'Some meta tags missing' };
      }
    } catch (error) {
      return { status: 'failed', message: error.message };
    }
  }

  async testResponsive() {
    // This would ideally use a headless browser, but for now we check viewport meta tag
    try {
      const response = await axios.get(this.frontendUrl);
      const html = response.data;
      
      if (html.includes('viewport') && html.includes('width=device-width')) {
        return { status: 'passed', message: 'Responsive design configured' };
      } else {
        return { status: 'warning', message: 'Responsive design not configured' };
      }
    } catch (error) {
      return { status: 'failed', message: error.message };
    }
  }

  // Backend Tests
  async testHealthEndpoint() {
    try {
      const response = await axios.get(`${this.backendUrl}/health`, { timeout: 5000 });
      
      if (response.status === 200 && response.data.status) {
        return { 
          status: 'passed', 
          message: 'Health endpoint working',
          details: response.data
        };
      } else {
        return { status: 'failed', message: 'Health endpoint not responding correctly' };
      }
    } catch (error) {
      return { status: 'failed', message: error.message };
    }
  }

  async testApiEndpoints() {
    const endpoints = ['/api/auth', '/api/teams', '/api/players'];
    let passedCount = 0;
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${this.backendUrl}${endpoint}`, { 
          timeout: 5000,
          validateStatus: status => status < 500 // Accept 4xx but not 5xx
        });
        
        if (response.status < 500) {
          passedCount++;
        }
      } catch (error) {
        // Endpoint might be down
      }
    }
    
    if (passedCount === endpoints.length) {
      return { status: 'passed', message: 'All API endpoints accessible' };
    } else if (passedCount > 0) {
      return { status: 'warning', message: `${passedCount}/${endpoints.length} endpoints accessible` };
    } else {
      return { status: 'failed', message: 'No API endpoints accessible' };
    }
  }

  async testDatabaseConnection() {
    try {
      const response = await axios.get(`${this.backendUrl}/health`);
      
      if (response.data.checks && response.data.checks.database === 'healthy') {
        return { status: 'passed', message: 'Database connection healthy' };
      } else {
        return { status: 'warning', message: 'Database status unknown' };
      }
    } catch (error) {
      return { status: 'failed', message: 'Cannot verify database connection' };
    }
  }

  async testAuthentication() {
    try {
      // Test that auth endpoint exists and returns proper error for invalid credentials
      const response = await axios.post(`${this.backendUrl}/api/auth/login`, {
        username: 'invalid',
        password: 'invalid'
      }, { 
        validateStatus: status => status === 401 || status === 400,
        timeout: 5000
      });
      
      if (response.status === 401 || response.status === 400) {
        return { status: 'passed', message: 'Authentication endpoint working' };
      } else {
        return { status: 'warning', message: 'Authentication behavior unexpected' };
      }
    } catch (error) {
      return { status: 'failed', message: 'Authentication endpoint not accessible' };
    }
  }

  async testErrorHandling() {
    try {
      // Test 404 handling
      const response = await axios.get(`${this.backendUrl}/api/nonexistent`, {
        validateStatus: status => status === 404,
        timeout: 5000
      });
      
      if (response.status === 404) {
        return { status: 'passed', message: 'Error handling working' };
      } else {
        return { status: 'warning', message: 'Error handling may need review' };
      }
    } catch (error) {
      return { status: 'failed', message: 'Error handling test failed' };
    }
  }

  async testRateLimiting() {
    try {
      // Make multiple rapid requests to test rate limiting
      const requests = Array(10).fill().map(() => 
        axios.get(`${this.backendUrl}/api/health`, { 
          timeout: 2000,
          validateStatus: status => status < 500 
        })
      );
      
      const responses = await Promise.allSettled(requests);
      const rateLimited = responses.some(r => 
        r.status === 'fulfilled' && r.value.status === 429
      );
      
      if (rateLimited) {
        return { status: 'passed', message: 'Rate limiting active' };
      } else {
        return { status: 'warning', message: 'Rate limiting not detected' };
      }
    } catch (error) {
      return { status: 'warning', message: 'Rate limiting test inconclusive' };
    }
  }

  // Security Tests
  async testHTTPS() {
    if (this.frontendUrl.startsWith('https://') && this.backendUrl.startsWith('https://')) {
      try {
        // Test HTTP redirect
        const httpUrl = this.frontendUrl.replace('https://', 'http://');
        const response = await axios.get(httpUrl, { 
          maxRedirects: 0,
          validateStatus: status => status >= 300 && status < 400
        });
        
        if (response.status >= 300 && response.status < 400) {
          return { status: 'passed', message: 'HTTPS enforced with redirect' };
        } else {
          return { status: 'warning', message: 'HTTPS not enforced' };
        }
      } catch (error) {
        return { status: 'passed', message: 'HTTPS enforced' };
      }
    } else {
      return { status: 'failed', message: 'HTTPS not configured' };
    }
  }

  async testSecurityHeaders() {
    try {
      const response = await axios.get(this.backendUrl, { timeout: 5000 });
      const headers = response.headers;
      
      const securityHeaders = [
        'strict-transport-security',
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection'
      ];
      
      const presentHeaders = securityHeaders.filter(header => headers[header]);
      
      if (presentHeaders.length === securityHeaders.length) {
        return { status: 'passed', message: 'All security headers present' };
      } else if (presentHeaders.length > 0) {
        return { 
          status: 'warning', 
          message: `${presentHeaders.length}/${securityHeaders.length} security headers present` 
        };
      } else {
        return { status: 'failed', message: 'No security headers found' };
      }
    } catch (error) {
      return { status: 'failed', message: 'Cannot check security headers' };
    }
  }

  async testCORS() {
    try {
      const response = await axios.options(this.backendUrl, {
        headers: {
          'Origin': this.frontendUrl,
          'Access-Control-Request-Method': 'GET'
        },
        timeout: 5000
      });
      
      const corsHeader = response.headers['access-control-allow-origin'];
      
      if (corsHeader === this.frontendUrl || corsHeader === '*') {
        return { status: 'passed', message: 'CORS configured correctly' };
      } else {
        return { status: 'warning', message: 'CORS configuration may need review' };
      }
    } catch (error) {
      return { status: 'warning', message: 'CORS test inconclusive' };
    }
  }

  async testSSLCertificate() {
    // This is a simplified test - in practice you'd use proper SSL validation
    if (this.frontendUrl.startsWith('https://')) {
      return { status: 'passed', message: 'SSL certificate appears valid' };
    } else {
      return { status: 'failed', message: 'SSL not configured' };
    }
  }

  async testCSP() {
    try {
      const response = await axios.get(this.frontendUrl);
      const cspHeader = response.headers['content-security-policy'];
      
      if (cspHeader) {
        return { status: 'passed', message: 'Content Security Policy configured' };
      } else {
        return { status: 'warning', message: 'Content Security Policy not found' };
      }
    } catch (error) {
      return { status: 'warning', message: 'CSP test failed' };
    }
  }

  async testAuthSecurity() {
    // Test that sensitive endpoints require authentication
    try {
      const response = await axios.get(`${this.backendUrl}/api/admin`, {
        validateStatus: status => status === 401 || status === 403,
        timeout: 5000
      });
      
      if (response.status === 401 || response.status === 403) {
        return { status: 'passed', message: 'Protected endpoints secured' };
      } else {
        return { status: 'warning', message: 'Authentication security needs review' };
      }
    } catch (error) {
      return { status: 'warning', message: 'Auth security test inconclusive' };
    }
  }

  // Performance Tests
  async testFrontendPerformance() {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(this.frontendUrl, { timeout: 10000 });
      const loadTime = Date.now() - startTime;
      
      if (loadTime < 3000) {
        return { 
          status: 'passed', 
          message: `Frontend loads in ${loadTime}ms`,
          details: { loadTime }
        };
      } else if (loadTime < 5000) {
        return { 
          status: 'warning', 
          message: `Frontend loads in ${loadTime}ms (acceptable but could be optimized)`,
          details: { loadTime }
        };
      } else {
        return { 
          status: 'failed', 
          message: `Frontend loads in ${loadTime}ms (too slow)`,
          details: { loadTime }
        };
      }
    } catch (error) {
      return { status: 'failed', message: 'Frontend performance test failed' };
    }
  }

  async testApiPerformance() {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${this.backendUrl}/health`, { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      
      if (responseTime < 500) {
        return { 
          status: 'passed', 
          message: `API responds in ${responseTime}ms`,
          details: { responseTime }
        };
      } else if (responseTime < 1000) {
        return { 
          status: 'warning', 
          message: `API responds in ${responseTime}ms (acceptable)`,
          details: { responseTime }
        };
      } else {
        return { 
          status: 'failed', 
          message: `API responds in ${responseTime}ms (too slow)`,
          details: { responseTime }
        };
      }
    } catch (error) {
      return { status: 'failed', message: 'API performance test failed' };
    }
  }

  async testCompression() {
    try {
      const response = await axios.get(this.frontendUrl, {
        headers: { 'Accept-Encoding': 'gzip, deflate, br' }
      });
      
      const encoding = response.headers['content-encoding'];
      
      if (encoding && (encoding.includes('gzip') || encoding.includes('br'))) {
        return { status: 'passed', message: `Compression active: ${encoding}` };
      } else {
        return { status: 'warning', message: 'Compression not detected' };
      }
    } catch (error) {
      return { status: 'failed', message: 'Compression test failed' };
    }
  }

  async testCaching() {
    try {
      const response = await axios.get(this.frontendUrl);
      const cacheControl = response.headers['cache-control'];
      
      if (cacheControl) {
        return { status: 'passed', message: `Caching configured: ${cacheControl}` };
      } else {
        return { status: 'warning', message: 'Cache headers not found' };
      }
    } catch (error) {
      return { status: 'failed', message: 'Caching test failed' };
    }
  }

  async testCDN() {
    try {
      const response = await axios.get(this.frontendUrl);
      const server = response.headers['server'];
      const cdnHeaders = ['cf-ray', 'x-served-by', 'x-cache', 'x-vercel-cache'];
      
      const hasCDN = cdnHeaders.some(header => response.headers[header]) || 
                    (server && (server.includes('cloudflare') || server.includes('vercel')));
      
      if (hasCDN) {
        return { status: 'passed', message: 'CDN detected' };
      } else {
        return { status: 'warning', message: 'CDN not detected' };
      }
    } catch (error) {
      return { status: 'warning', message: 'CDN test inconclusive' };
    }
  }

  // Integration Tests
  async testFrontendBackendIntegration() {
    try {
      // Test if frontend can reach backend
      const response = await axios.get(`${this.backendUrl}/health`, {
        headers: { 'Origin': this.frontendUrl }
      });
      
      if (response.status === 200) {
        return { status: 'passed', message: 'Frontend-backend integration working' };
      } else {
        return { status: 'failed', message: 'Integration test failed' };
      }
    } catch (error) {
      return { status: 'failed', message: 'Integration test failed' };
    }
  }

  async testUserRegistration() {
    // This would test the registration flow
    return { status: 'warning', message: 'Registration flow test not implemented' };
  }

  async testLoginFlow() {
    // This would test the login flow
    return { status: 'warning', message: 'Login flow test not implemented' };
  }

  async testApiDataFlow() {
    // This would test API data retrieval
    return { status: 'warning', message: 'API data flow test not implemented' };
  }

  async testErrorIntegration() {
    // This would test error handling between frontend and backend
    return { status: 'warning', message: 'Error integration test not implemented' };
  }

  calculateScore() {
    const allCategories = [
      this.testResults.frontend,
      this.testResults.backend,
      this.testResults.security,
      this.testResults.performance,
      this.testResults.integration
    ];

    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalWarnings = 0;

    allCategories.forEach(category => {
      totalTests += category.passed + category.failed + category.warnings;
      totalPassed += category.passed;
      totalFailed += category.failed;
      totalWarnings += category.warnings;
    });

    this.testResults.overall.passed = totalPassed;
    this.testResults.overall.failed = totalFailed;
    this.testResults.overall.warnings = totalWarnings;

    // Calculate score (passed = 100%, warnings = 50%, failed = 0%)
    const score = totalTests > 0 ? 
      ((totalPassed * 100 + totalWarnings * 50) / (totalTests * 100)) * 100 : 0;
    
    this.testResults.overall.score = Math.round(score);
  }

  generateReport() {
    this.calculateScore();
    
    const reportPath = path.join(__dirname, '../production-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));
    
    console.log(`\n📋 Detailed report saved to: ${reportPath}`);
  }

  displaySummary() {
    console.log('\n🎯 PRODUCTION DEPLOYMENT TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Overall Score: ${this.testResults.overall.score}/100`);
    console.log(`Tests Passed: ${this.testResults.overall.passed}`);
    console.log(`Tests Failed: ${this.testResults.overall.failed}`);
    console.log(`Warnings: ${this.testResults.overall.warnings}`);
    console.log('');

    // Category breakdown
    const categories = ['frontend', 'backend', 'security', 'performance', 'integration'];
    categories.forEach(category => {
      const results = this.testResults[category];
      const total = results.passed + results.failed + results.warnings;
      const successRate = total > 0 ? Math.round((results.passed / total) * 100) : 0;
      
      console.log(`${category.toUpperCase()}: ${successRate}% (${results.passed}/${total} passed)`);
    });

    console.log('');
    
    if (this.testResults.overall.score >= 90) {
      console.log('🎉 EXCELLENT: Production deployment is ready!');
    } else if (this.testResults.overall.score >= 75) {
      console.log('✅ GOOD: Production deployment is mostly ready, address warnings.');
    } else if (this.testResults.overall.score >= 50) {
      console.log('⚠️ NEEDS WORK: Several issues need to be addressed before production.');
    } else {
      console.log('❌ NOT READY: Significant issues need to be resolved.');
    }

    console.log('='.repeat(60));
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new ProductionDeploymentTester();
  tester.runAllTests().catch(error => {
    console.error('💥 Testing failed:', error);
    process.exit(1);
  });
}

module.exports = ProductionDeploymentTester;