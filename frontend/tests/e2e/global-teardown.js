/**
 * Playwright Global Teardown
 * Lion Football Academy Frontend Testing Suite
 */

async function globalTeardown(config) {
  console.log('🧹 Cleaning up E2E test environment...');

  try {
    // Clean up test data
    await cleanupTestData();

    // Clean up authentication state
    await cleanupAuthState();

    // Clean up temporary files
    await cleanupTempFiles();

    console.log('✅ E2E test environment cleanup completed');

  } catch (error) {
    console.error('❌ E2E teardown failed:', error);
    // Don't throw here as tests have already completed
  }
}

async function cleanupTestData() {
  console.log('🗑️ Cleaning up test data...');
  
  try {
    // Clean up any test data that was created
    // This could involve API calls to delete test records
    
    console.log('✅ Test data cleanup completed');
    
  } catch (error) {
    console.warn('⚠️ Test data cleanup failed:', error.message);
  }
}

async function cleanupAuthState() {
  console.log('🔐 Cleaning up authentication state...');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Remove saved auth state
    const authStatePath = path.join(__dirname, 'auth-state.json');
    if (fs.existsSync(authStatePath)) {
      fs.unlinkSync(authStatePath);
    }
    
    console.log('✅ Authentication state cleanup completed');
    
  } catch (error) {
    console.warn('⚠️ Auth state cleanup failed:', error.message);
  }
}

async function cleanupTempFiles() {
  console.log('📁 Cleaning up temporary files...');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Clean up any temporary files created during tests
    const tempDirs = [
      path.join(__dirname, '../../test-results'),
      path.join(__dirname, '../../playwright-report'),
    ];
    
    // Note: Don't delete these in CI as they contain test artifacts
    if (!process.env.CI) {
      tempDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
          // Only clean up old files, keep recent ones
          const files = fs.readdirSync(dir);
          const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
          
          files.forEach(file => {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            
            if (stats.mtime.getTime() < oneDayAgo) {
              if (stats.isDirectory()) {
                fs.rmSync(filePath, { recursive: true, force: true });
              } else {
                fs.unlinkSync(filePath);
              }
            }
          });
        }
      });
    }
    
    console.log('✅ Temporary files cleanup completed');
    
  } catch (error) {
    console.warn('⚠️ Temp files cleanup failed:', error.message);
  }
}

module.exports = globalTeardown;