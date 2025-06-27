/**
 * Admin Workflow End-to-End Tests
 * Lion Football Academy Frontend Testing Suite
 * Using Playwright for E2E testing
 */

const { test, expect } = require('@playwright/test');

test.describe('Admin Workflow Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Login as admin
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="admin-dashboard"]');
  });

  test.describe('User Management', () => {
    test('should create a new coach user', async ({ page }) => {
      // Navigate to admin panel
      await page.click('[data-testid="admin-nav-link"]');
      await page.waitForSelector('[data-testid="admin-panel"]');
      
      // Click on user management
      await page.click('[data-testid="user-management-tab"]');
      
      // Click create user button
      await page.click('[data-testid="create-user-button"]');
      
      // Fill user form
      await page.fill('[data-testid="user-name-input"]', 'John Coach');
      await page.fill('[data-testid="user-username-input"]', 'john.coach');
      await page.fill('[data-testid="user-email-input"]', 'john.coach@academy.com');
      await page.selectOption('[data-testid="user-role-select"]', 'coach');
      await page.fill('[data-testid="user-password-input"]', 'Coach123!');
      
      // Submit form
      await page.click('[data-testid="save-user-button"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Felhasználó sikeresen létrehozva');
      
      // Verify user appears in list
      await expect(page.locator('[data-testid="user-list"]')).toContainText('John Coach');
      await expect(page.locator('[data-testid="user-list"]')).toContainText('john.coach');
    });

    test('should edit existing user', async ({ page }) => {
      await page.click('[data-testid="admin-nav-link"]');
      await page.click('[data-testid="user-management-tab"]');
      
      // Find and edit first user
      await page.click('[data-testid="edit-user-button"]:first-child');
      
      // Update user name
      await page.fill('[data-testid="user-name-input"]', 'Updated Name');
      await page.click('[data-testid="save-user-button"]');
      
      // Verify update
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Felhasználó sikeresen frissítve');
      await expect(page.locator('[data-testid="user-list"]')).toContainText('Updated Name');
    });

    test('should delete user with confirmation', async ({ page }) => {
      await page.click('[data-testid="admin-nav-link"]');
      await page.click('[data-testid="user-management-tab"]');
      
      // Get initial user count
      const initialUsers = await page.locator('[data-testid="user-row"]').count();
      
      // Delete user
      await page.click('[data-testid="delete-user-button"]:first-child');
      
      // Confirm deletion
      await page.click('[data-testid="confirm-delete-button"]');
      
      // Verify deletion
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Felhasználó sikeresen törölve');
      
      const finalUsers = await page.locator('[data-testid="user-row"]').count();
      expect(finalUsers).toBe(initialUsers - 1);
    });
  });

  test.describe('Team Management', () => {
    test('should create a new team', async ({ page }) => {
      // Navigate to teams page
      await page.click('[data-testid="teams-nav-link"]');
      await page.waitForSelector('[data-testid="teams-page"]');
      
      // Click create team button
      await page.click('[data-testid="create-team-button"]');
      
      // Fill team form
      await page.fill('[data-testid="team-name-input"]', 'Lions U8');
      await page.selectOption('[data-testid="team-age-group-select"]', 'U8');
      await page.selectOption('[data-testid="team-coach-select"]', '2'); // Coach ID
      await page.fill('[data-testid="team-venue-input"]', 'Academy Field 2');
      await page.fill('[data-testid="team-founded-input"]', '2024');
      
      // Submit form
      await page.click('[data-testid="save-team-button"]');
      
      // Verify success and team appears
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Csapat sikeresen létrehozva');
      await expect(page.locator('[data-testid="teams-list"]')).toContainText('Lions U8');
    });

    test('should assign players to team', async ({ page }) => {
      await page.click('[data-testid="teams-nav-link"]');
      
      // Click on team to view details
      await page.click('[data-testid="team-row"]:first-child');
      
      // Click manage players
      await page.click('[data-testid="manage-players-button"]');
      
      // Add new player
      await page.click('[data-testid="add-player-button"]');
      await page.fill('[data-testid="player-name-input"]', 'New Player');
      await page.fill('[data-testid="player-birth-date-input"]', '2012-01-01');
      await page.selectOption('[data-testid="player-position-select"]', 'Forward');
      await page.fill('[data-testid="player-jersey-input"]', '9');
      
      await page.click('[data-testid="save-player-button"]');
      
      // Verify player added to team
      await expect(page.locator('[data-testid="team-players-list"]')).toContainText('New Player');
      await expect(page.locator('[data-testid="team-players-list"]')).toContainText('#9');
    });
  });

  test.describe('Match Management', () => {
    test('should schedule a new match', async ({ page }) => {
      await page.click('[data-testid="matches-nav-link"]');
      await page.waitForSelector('[data-testid="matches-page"]');
      
      // Click schedule match
      await page.click('[data-testid="schedule-match-button"]');
      
      // Fill match form
      await page.selectOption('[data-testid="home-team-select"]', '1');
      await page.selectOption('[data-testid="away-team-select"]', '2');
      await page.fill('[data-testid="match-date-input"]', '2024-02-15');
      await page.fill('[data-testid="match-time-input"]', '15:00');
      await page.fill('[data-testid="match-venue-input"]', 'Academy Field 1');
      
      await page.click('[data-testid="save-match-button"]');
      
      // Verify match scheduled
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Mérkőzés sikeresen létrehozva');
      await expect(page.locator('[data-testid="matches-list"]')).toContainText('2024-02-15');
    });

    test('should record match result', async ({ page }) => {
      await page.click('[data-testid="matches-nav-link"]');
      
      // Find scheduled match and record result
      await page.click('[data-testid="record-result-button"]:first-child');
      
      // Enter scores
      await page.fill('[data-testid="home-score-input"]', '3');
      await page.fill('[data-testid="away-score-input"]', '1');
      
      // Add player statistics
      await page.click('[data-testid="add-goal-button"]');
      await page.selectOption('[data-testid="goal-player-select"]', '1');
      await page.fill('[data-testid="goal-minute-input"]', '25');
      
      await page.click('[data-testid="save-result-button"]');
      
      // Verify result recorded
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Eredmény sikeresen rögzítve');
      await expect(page.locator('[data-testid="match-result"]')).toContainText('3 - 1');
    });
  });

  test.describe('Statistics and Analytics', () => {
    test('should view team statistics', async ({ page }) => {
      await page.click('[data-testid="statistics-nav-link"]');
      await page.waitForSelector('[data-testid="statistics-page"]');
      
      // Select team for statistics
      await page.selectOption('[data-testid="team-stats-select"]', '1');
      
      // Verify statistics display
      await expect(page.locator('[data-testid="team-stats-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="matches-played"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="wins"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="goals-for"]')).toContainText(/\d+/);
    });

    test('should view player performance', async ({ page }) => {
      await page.click('[data-testid="statistics-nav-link"]');
      
      // Switch to player statistics
      await page.click('[data-testid="player-stats-tab"]');
      
      // Select player
      await page.selectOption('[data-testid="player-stats-select"]', '1');
      
      // Verify player stats
      await expect(page.locator('[data-testid="player-stats-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="player-goals"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="player-assists"]')).toContainText(/\d+/);
    });

    test('should export statistics to PDF', async ({ page }) => {
      await page.click('[data-testid="statistics-nav-link"]');
      
      // Setup download listener
      const downloadPromise = page.waitForEvent('download');
      
      // Export statistics
      await page.click('[data-testid="export-pdf-button"]');
      
      // Verify download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('statistics');
      expect(download.suggestedFilename()).toContain('.pdf');
    });
  });

  test.describe('System Administration', () => {
    test('should access admin analytics', async ({ page }) => {
      await page.click('[data-testid="ai-analytics-nav-link"]');
      await page.waitForSelector('[data-testid="ai-analytics-page"]');
      
      // Verify analytics components
      await expect(page.locator('[data-testid="academy-overview"]')).toBeVisible();
      await expect(page.locator('[data-testid="performance-trends"]')).toBeVisible();
      await expect(page.locator('[data-testid="player-development"]')).toBeVisible();
    });

    test('should manage system settings', async ({ page }) => {
      await page.click('[data-testid="admin-nav-link"]');
      await page.click('[data-testid="system-settings-tab"]');
      
      // Update academy name
      await page.fill('[data-testid="academy-name-input"]', 'Updated Academy Name');
      
      // Update notification settings
      await page.check('[data-testid="email-notifications-checkbox"]');
      
      // Save settings
      await page.click('[data-testid="save-settings-button"]');
      
      // Verify success
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Beállítások sikeresen mentve');
    });
  });

  test.describe('QR Code Management', () => {
    test('should generate QR codes for players', async ({ page }) => {
      await page.click('[data-testid="qr-checkin-nav-link"]');
      await page.waitForSelector('[data-testid="qr-page"]');
      
      // Select player for QR generation
      await page.selectOption('[data-testid="qr-player-select"]', '1');
      
      // Generate QR code
      await page.click('[data-testid="generate-qr-button"]');
      
      // Verify QR code appears
      await expect(page.locator('[data-testid="qr-code-image"]')).toBeVisible();
      
      // Test download QR code
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-qr-button"]');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('qr-code');
    });
  });

  test.describe('Data Export and Import', () => {
    test('should export academy data', async ({ page }) => {
      await page.click('[data-testid="admin-nav-link"]');
      await page.click('[data-testid="data-management-tab"]');
      
      // Export all data
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-all-data-button"]');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('academy-data');
      expect(download.suggestedFilename()).toContain('.csv');
    });

    test('should import player data from CSV', async ({ page }) => {
      await page.click('[data-testid="admin-nav-link"]');
      await page.click('[data-testid="data-management-tab"]');
      
      // Upload CSV file
      const fileInput = page.locator('[data-testid="import-csv-input"]');
      await fileInput.setInputFiles('tests/fixtures/sample-players.csv');
      
      // Process import
      await page.click('[data-testid="process-import-button"]');
      
      // Verify import success
      await expect(page.locator('[data-testid="import-success-message"]')).toContainText('Import sikeres');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network error by going offline
      await page.context().setOffline(true);
      
      // Try to create a team
      await page.click('[data-testid="teams-nav-link"]');
      await page.click('[data-testid="create-team-button"]');
      
      await page.fill('[data-testid="team-name-input"]', 'Test Team');
      await page.click('[data-testid="save-team-button"]');
      
      // Should show network error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Hálózati hiba');
      
      // Go back online
      await page.context().setOffline(false);
    });

    test('should validate form inputs', async ({ page }) => {
      await page.click('[data-testid="teams-nav-link"]');
      await page.click('[data-testid="create-team-button"]');
      
      // Try to save without required fields
      await page.click('[data-testid="save-team-button"]');
      
      // Should show validation errors
      await expect(page.locator('[data-testid="team-name-error"]')).toContainText('Név kötelező');
      await expect(page.locator('[data-testid="team-age-group-error"]')).toContainText('Korosztály kötelező');
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check mobile navigation
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      
      // Open mobile menu
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
      
      // Navigate using mobile menu
      await page.click('[data-testid="mobile-teams-link"]');
      await expect(page.locator('[data-testid="teams-page"]')).toBeVisible();
    });

    test('should adapt tables for mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.click('[data-testid="players-nav-link"]');
      
      // Should show mobile-optimized player cards instead of table
      await expect(page.locator('[data-testid="mobile-player-cards"]')).toBeVisible();
      await expect(page.locator('[data-testid="desktop-player-table"]')).not.toBeVisible();
    });
  });
});