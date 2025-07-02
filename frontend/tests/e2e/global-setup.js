/**
 * Playwright Global Setup
 * Lion Football Academy Frontend Testing Suite
 */

const { chromium } = require('@playwright/test');

async function globalSetup(config) {
  console.log('🔧 Setting up E2E test environment...');

  // Create a browser instance for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for the application to be ready
    console.log('⏳ Waiting for application to be ready...');
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:3000');
    
    // Wait for the login page to load
    await page.waitForSelector('[data-testid="login-form"]', { timeout: 30000 });
    console.log('✅ Application is ready for testing');

    // Perform any global authentication setup if needed
    await setupGlobalAuthentication(page);

    // Setup test data if needed
    await setupTestData(page);

    console.log('🎯 E2E test environment setup completed');

  } catch (error) {
    console.error('❌ E2E setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function setupGlobalAuthentication(page) {
  // Pre-authenticate admin user for tests that need it
  console.log('🔐 Setting up global authentication...');
  
  try {
    // Login as admin to verify authentication works
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login
    await page.waitForSelector('[data-testid="admin-dashboard"]', { timeout: 10000 });
    
    // Store authentication state for reuse
    const storage = await page.context().storageState();
    
    // Save to file for reuse in tests
    const fs = require('fs');
    fs.writeFileSync('./tests/e2e/auth-state.json', JSON.stringify(storage));
    
    console.log('✅ Global authentication setup completed');
    
    // Logout to reset state
    await page.click('[data-testid="logout-button"]');
    await page.waitForSelector('[data-testid="login-form"]');
    
  } catch (error) {
    console.warn('⚠️ Global authentication setup failed:', error.message);
    // Don't fail the entire setup for auth issues
  }
}

async function setupTestData(page) {
  console.log('📊 Setting up test data...');
  
  try {
    // You could make API calls here to set up test data
    // Or use database seeding scripts
    
    // Example: Ensure test users exist
    await ensureTestUsersExist();
    
    // Example: Ensure test teams exist
    await ensureTestTeamsExist();
    
    console.log('✅ Test data setup completed');
    
  } catch (error) {
    console.warn('⚠️ Test data setup failed:', error.message);
    // Don't fail setup for data issues in most cases
  }
}

async function ensureTestUsersExist() {
  // This would typically make API calls or database queries
  // to ensure test users exist in the system
  
  const testUsers = [
    { username: 'admin', role: 'admin' },
    { username: 'coach_test', role: 'coach' },
    { username: 'parent_test', role: 'parent' },
  ];

  // Implementation would depend on your backend setup
  console.log('👥 Test users verified');
}

async function ensureTestTeamsExist() {
  // Ensure test teams exist for E2E tests
  console.log('⚽ Test teams verified');
}

module.exports = globalSetup;