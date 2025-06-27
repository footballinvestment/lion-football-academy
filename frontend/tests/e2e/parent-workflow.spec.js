/**
 * Parent Workflow End-to-End Tests
 * Lion Football Academy Frontend Testing Suite
 */

const { test, expect } = require('@playwright/test');

test.describe('Parent Workflow Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Login as parent
    await page.fill('[data-testid="username-input"]', 'parent_test');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await page.waitForSelector('[data-testid="parent-dashboard"]');
  });

  test.describe('Child Information Access', () => {
    test('should view child profile and basic information', async ({ page }) => {
      await page.click('[data-testid="my-child-nav-link"]');
      await page.waitForSelector('[data-testid="child-profile-page"]');
      
      // Should see child's basic information
      await expect(page.locator('[data-testid="child-name"]')).toContainText(/\w+/);
      await expect(page.locator('[data-testid="child-team"]')).toContainText(/\w+/);
      await expect(page.locator('[data-testid="child-position"]')).toContainText(/(Goalkeeper|Defender|Midfielder|Forward)/);
      await expect(page.locator('[data-testid="child-jersey-number"]')).toContainText(/\d+/);
      
      // Should see profile photo
      await expect(page.locator('[data-testid="child-photo"]')).toBeVisible();
    });

    test('should view child statistics and performance', async ({ page }) => {
      await page.click('[data-testid="my-child-nav-link"]');
      await page.click('[data-testid="statistics-tab"]');
      
      // Should see performance statistics
      await expect(page.locator('[data-testid="season-stats"]')).toBeVisible();
      await expect(page.locator('[data-testid="matches-played"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="goals-scored"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="assists"]')).toContainText(/\d+/);
      
      // Should see performance chart
      await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
      
      // Should see recent match performances
      await expect(page.locator('[data-testid="recent-matches"]')).toBeVisible();
      const matchRows = page.locator('[data-testid="match-performance-row"]');
      await expect(matchRows).toHaveCount.greaterThan(0);
    });

    test('should view child development progress', async ({ page }) => {
      await page.click('[data-testid="development-plans-nav-link"]');
      await page.waitForSelector('[data-testid="development-plans-page"]');
      
      // Should see active development plans
      await expect(page.locator('[data-testid="active-plans"]')).toBeVisible();
      
      // View detailed plan
      await page.click('[data-testid="plan-row"]:first-child');
      
      // Should see plan details
      await expect(page.locator('[data-testid="plan-title"]')).toContainText(/\w+/);
      await expect(page.locator('[data-testid="plan-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-goals"]')).toBeVisible();
      
      // Should see progress tracking
      await expect(page.locator('[data-testid="progress-timeline"]')).toBeVisible();
    });

    test('should not access other children\'s data', async ({ page }) => {
      await page.click('[data-testid="my-child-nav-link"]');
      
      // Try to manipulate URL to access another child
      await page.goto('/players/999'); // Different player ID
      
      // Should be redirected or show access denied
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
      expect(page.url()).not.toContain('/players/999');
    });
  });

  test.describe('Training and Match Information', () => {
    test('should view upcoming training sessions', async ({ page }) => {
      await page.click('[data-testid="trainings-nav-link"]');
      await page.waitForSelector('[data-testid="trainings-page"]');
      
      // Should see upcoming trainings for child's team
      await expect(page.locator('[data-testid="upcoming-trainings"]')).toBeVisible();
      
      const trainingRows = page.locator('[data-testid="training-row"]');
      if (await trainingRows.count() > 0) {
        const firstTraining = trainingRows.first();
        await expect(firstTraining).toContainText(/\d{4}-\d{2}-\d{2}/); // Date
        await expect(firstTraining).toContainText(/\d{2}:\d{2}/); // Time
        await expect(firstTraining).toContainText(/\w+/); // Location
      }
    });

    test('should view child training attendance', async ({ page }) => {
      await page.click('[data-testid="trainings-nav-link"]');
      await page.click('[data-testid="attendance-tab"]');
      
      // Should see attendance history
      await expect(page.locator('[data-testid="attendance-history"]')).toBeVisible();
      await expect(page.locator('[data-testid="attendance-rate"]')).toContainText(/%/);
      
      // Should see detailed attendance records
      const attendanceRows = page.locator('[data-testid="attendance-row"]');
      if (await attendanceRows.count() > 0) {
        await expect(attendanceRows.first()).toContainText(/(Jelen|Hiányzott)/);
      }
    });

    test('should view upcoming and past matches', async ({ page }) => {
      await page.click('[data-testid="matches-nav-link"]');
      await page.waitForSelector('[data-testid="matches-page"]');
      
      // Should see upcoming matches
      await expect(page.locator('[data-testid="upcoming-matches"]')).toBeVisible();
      
      // View past matches
      await page.click('[data-testid="past-matches-tab"]');
      await expect(page.locator('[data-testid="past-matches"]')).toBeVisible();
      
      // Should see match results
      const matchRows = page.locator('[data-testid="match-row"]');
      if (await matchRows.count() > 0) {
        const firstMatch = matchRows.first();
        await expect(firstMatch).toContainText(/\d+ - \d+/); // Score
      }
    });

    test('should view child match performance details', async ({ page }) => {
      await page.click('[data-testid="matches-nav-link"]');
      await page.click('[data-testid="past-matches-tab"]');
      
      // Click on match to view details
      if (await page.locator('[data-testid="match-row"]').count() > 0) {
        await page.click('[data-testid="match-row"]:first-child');
        
        // Should see child's performance in match
        await expect(page.locator('[data-testid="child-performance"]')).toBeVisible();
        await expect(page.locator('[data-testid="minutes-played"]')).toContainText(/\d+/);
        await expect(page.locator('[data-testid="performance-rating"]')).toBeVisible();
        
        // Should see coach comments if available
        if (await page.locator('[data-testid="coach-comments"]').isVisible()) {
          await expect(page.locator('[data-testid="coach-comments"]')).toContainText(/\w+/);
        }
      }
    });
  });

  test.describe('Communication', () => {
    test('should view announcements from coaches', async ({ page }) => {
      await page.click('[data-testid="announcements-nav-link"]');
      await page.waitForSelector('[data-testid="announcements-page"]');
      
      // Should see team announcements
      await expect(page.locator('[data-testid="team-announcements"]')).toBeVisible();
      
      const announcements = page.locator('[data-testid="announcement-item"]');
      if (await announcements.count() > 0) {
        const firstAnnouncement = announcements.first();
        await expect(firstAnnouncement).toContainText(/\w+/); // Title
        await expect(firstAnnouncement).toContainText(/\d{4}-\d{2}-\d{2}/); // Date
        
        // Click to read full announcement
        await firstAnnouncement.click();
        await expect(page.locator('[data-testid="announcement-details"]')).toBeVisible();
      }
    });

    test('should send message to coach', async ({ page }) => {
      await page.click('[data-testid="communication-nav-link"]');
      await page.waitForSelector('[data-testid="communication-page"]');
      
      // Send message to coach
      await page.click('[data-testid="compose-message-button"]');
      
      // Should only be able to message child's coach
      await page.selectOption('[data-testid="recipient-select"]', 'coach');
      
      await page.fill('[data-testid="message-subject-input"]', 'Question about training schedule');
      await page.fill('[data-testid="message-body-textarea"]', 'Dear Coach, I wanted to ask about the upcoming training schedule. Will there be any changes due to the weather? Thank you.');
      
      await page.click('[data-testid="send-message-button"]');
      
      // Verify message sent
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Üzenet sikeresen elküldve');
    });

    test('should view message history with coach', async ({ page }) => {
      await page.click('[data-testid="communication-nav-link"]');
      await page.click('[data-testid="message-history-tab"]');
      
      // Should see conversation history
      await expect(page.locator('[data-testid="message-history"]')).toBeVisible();
      
      const messages = page.locator('[data-testid="message-item"]');
      if (await messages.count() > 0) {
        // Click to view message thread
        await messages.first().click();
        await expect(page.locator('[data-testid="message-thread"]')).toBeVisible();
      }
    });
  });

  test.describe('Notifications and Updates', () => {
    test('should view notifications', async ({ page }) => {
      // Check notification bell
      const notificationBell = page.locator('[data-testid="notification-bell"]');
      if (await notificationBell.isVisible()) {
        await notificationBell.click();
        
        // Should see notification dropdown
        await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();
        
        const notifications = page.locator('[data-testid="notification-item"]');
        if (await notifications.count() > 0) {
          await expect(notifications.first()).toContainText(/\w+/);
        }
      }
    });

    test('should manage notification preferences', async ({ page }) => {
      await page.click('[data-testid="profile-nav-link"]');
      await page.click('[data-testid="notification-settings-tab"]');
      
      // Should see notification preferences
      await expect(page.locator('[data-testid="notification-preferences"]')).toBeVisible();
      
      // Update preferences
      await page.check('[data-testid="email-match-notifications"]');
      await page.check('[data-testid="email-training-notifications"]');
      await page.uncheck('[data-testid="sms-notifications"]');
      
      await page.click('[data-testid="save-preferences-button"]');
      
      // Verify preferences saved
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Beállítások sikeresen mentve');
    });
  });

  test.describe('Medical and Injury Information', () => {
    test('should view child injury history', async ({ page }) => {
      await page.click('[data-testid="medical-nav-link"]');
      await page.waitForSelector('[data-testid="medical-page"]');
      
      // Should see injury history
      await expect(page.locator('[data-testid="injury-history"]')).toBeVisible();
      
      const injuries = page.locator('[data-testid="injury-row"]');
      if (await injuries.count() > 0) {
        const firstInjury = injuries.first();
        await expect(firstInjury).toContainText(/\w+/); // Injury type
        await expect(firstInjury).toContainText(/(Minor|Moderate|Severe)/); // Severity
        
        // View injury details
        await firstInjury.click();
        await expect(page.locator('[data-testid="injury-details"]')).toBeVisible();
        await expect(page.locator('[data-testid="treatment-plan"]')).toBeVisible();
      }
    });

    test('should update emergency contact information', async ({ page }) => {
      await page.click('[data-testid="medical-nav-link"]');
      await page.click('[data-testid="emergency-contacts-tab"]');
      
      // Update emergency contact
      await page.click('[data-testid="edit-emergency-contact-button"]');
      
      await page.fill('[data-testid="contact-name-input"]', 'Updated Contact Name');
      await page.fill('[data-testid="contact-phone-input"]', '+36-20-123-4567');
      await page.selectOption('[data-testid="contact-relationship-select"]', 'Mother');
      
      await page.click('[data-testid="save-contact-button"]');
      
      // Verify contact updated
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Kapcsolattartó sikeresen frissítve');
    });

    test('should view medical clearance status', async ({ page }) => {
      await page.click('[data-testid="medical-nav-link"]');
      await page.click('[data-testid="medical-clearance-tab"]');
      
      // Should see medical clearance status
      await expect(page.locator('[data-testid="clearance-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="clearance-expiry"]')).toContainText(/\d{4}-\d{2}-\d{2}/);
      
      // Should see required documents
      await expect(page.locator('[data-testid="required-documents"]')).toBeVisible();
    });
  });

  test.describe('Calendar and Schedule', () => {
    test('should view child schedule calendar', async ({ page }) => {
      await page.click('[data-testid="calendar-nav-link"]');
      await page.waitForSelector('[data-testid="calendar-page"]');
      
      // Should see calendar with events
      await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();
      
      // Should see training and match events
      const events = page.locator('[data-testid="calendar-event"]');
      if (await events.count() > 0) {
        await expect(events.first()).toContainText(/\w+/);
        
        // Click on event to see details
        await events.first().click();
        await expect(page.locator('[data-testid="event-details"]')).toBeVisible();
      }
    });

    test('should switch between calendar views', async ({ page }) => {
      await page.click('[data-testid="calendar-nav-link"]');
      
      // Switch to week view
      await page.click('[data-testid="week-view-button"]');
      await expect(page.locator('[data-testid="week-calendar"]')).toBeVisible();
      
      // Switch to month view
      await page.click('[data-testid="month-view-button"]');
      await expect(page.locator('[data-testid="month-calendar"]')).toBeVisible();
      
      // Switch to agenda view
      await page.click('[data-testid="agenda-view-button"]');
      await expect(page.locator('[data-testid="agenda-list"]')).toBeVisible();
    });
  });

  test.describe('Photos and Media', () => {
    test('should view team photos and videos', async ({ page }) => {
      await page.click('[data-testid="media-nav-link"]');
      await page.waitForSelector('[data-testid="media-page"]');
      
      // Should see team media gallery
      await expect(page.locator('[data-testid="media-gallery"]')).toBeVisible();
      
      const mediaItems = page.locator('[data-testid="media-item"]');
      if (await mediaItems.count() > 0) {
        // View photo/video
        await mediaItems.first().click();
        await expect(page.locator('[data-testid="media-viewer"]')).toBeVisible();
        
        // Should not be able to delete media (parent permissions)
        await expect(page.locator('[data-testid="delete-media-button"]')).not.toBeVisible();
      }
    });

    test('should download media files', async ({ page }) => {
      await page.click('[data-testid="media-nav-link"]');
      
      if (await page.locator('[data-testid="media-item"]').count() > 0) {
        // Setup download listener
        const downloadPromise = page.waitForEvent('download');
        
        // Download media file
        await page.click('[data-testid="download-media-button"]:first-child');
        
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.(jpg|png|mp4|avi)$/);
      }
    });
  });

  test.describe('Payment and Billing', () => {
    test('should view billing information', async ({ page }) => {
      await page.click('[data-testid="billing-nav-link"]');
      await page.waitForSelector('[data-testid="billing-page"]');
      
      // Should see current balance and payment history
      await expect(page.locator('[data-testid="current-balance"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-history"]')).toBeVisible();
      
      // Should see upcoming payments
      await expect(page.locator('[data-testid="upcoming-payments"]')).toBeVisible();
    });

    test('should make a payment', async ({ page }) => {
      await page.click('[data-testid="billing-nav-link"]');
      
      if (await page.locator('[data-testid="outstanding-balance"]').isVisible()) {
        // Make payment
        await page.click('[data-testid="make-payment-button"]');
        
        // Fill payment form
        await page.fill('[data-testid="payment-amount-input"]', '50000');
        await page.selectOption('[data-testid="payment-method-select"]', 'card');
        
        // Note: In real tests, you'd use test card details
        await page.fill('[data-testid="card-number-input"]', '4242424242424242');
        await page.fill('[data-testid="card-expiry-input"]', '12/25');
        await page.fill('[data-testid="card-cvc-input"]', '123');
        
        await page.click('[data-testid="process-payment-button"]');
        
        // Verify payment processed
        await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
      }
    });
  });

  test.describe('Profile Management', () => {
    test('should update parent profile information', async ({ page }) => {
      await page.click('[data-testid="profile-nav-link"]');
      await page.waitForSelector('[data-testid="profile-page"]');
      
      // Update profile
      await page.click('[data-testid="edit-profile-button"]');
      
      await page.fill('[data-testid="parent-name-input"]', 'Updated Parent Name');
      await page.fill('[data-testid="parent-phone-input"]', '+36-20-987-6543');
      await page.fill('[data-testid="parent-address-input"]', 'Updated Address 123');
      
      await page.click('[data-testid="save-profile-button"]');
      
      // Verify profile updated
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Profil sikeresen frissítve');
    });

    test('should change password', async ({ page }) => {
      await page.click('[data-testid="profile-nav-link"]');
      await page.click('[data-testid="security-tab"]');
      
      // Change password
      await page.fill('[data-testid="current-password-input"]', 'password123');
      await page.fill('[data-testid="new-password-input"]', 'newpassword123');
      await page.fill('[data-testid="confirm-password-input"]', 'newpassword123');
      
      await page.click('[data-testid="change-password-button"]');
      
      // Verify password changed
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Jelszó sikeresen módosítva');
    });
  });

  test.describe('Mobile Parent Experience', () => {
    test('should work effectively on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Mobile navigation should work
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
      
      // Quick child info should be accessible
      await expect(page.locator('[data-testid="mobile-child-summary"]')).toBeVisible();
      
      // Navigation should work smoothly
      await page.click('[data-testid="mobile-schedule-link"]');
      await expect(page.locator('[data-testid="mobile-schedule-view"]')).toBeVisible();
    });

    test('should receive push notifications', async ({ page }) => {
      // Note: This would typically require a service worker and permission
      // In a real implementation, you'd test notification permissions and delivery
      
      await page.click('[data-testid="profile-nav-link"]');
      await page.click('[data-testid="notification-settings-tab"]');
      
      // Enable push notifications
      await page.check('[data-testid="push-notifications-checkbox"]');
      await page.click('[data-testid="save-preferences-button"]');
      
      // Verify notifications enabled
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Értesítési beállítások mentve');
    });
  });

  test.describe('Data Privacy and Security', () => {
    test('should only see own child data', async ({ page }) => {
      await page.click('[data-testid="my-child-nav-link"]');
      
      // Verify only shows one child (the parent's child)
      const childProfiles = page.locator('[data-testid="child-profile"]');
      await expect(childProfiles).toHaveCount(1);
      
      // Try to access another child's profile via URL manipulation
      await page.goto('/players/999/profile');
      
      // Should be denied access
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    });

    test('should have secure data transmission', async ({ page }) => {
      // Verify HTTPS is being used
      expect(page.url()).toContain('https://');
      
      // Check for security headers (this would need to be implemented in the app)
      const response = await page.goto('/');
      const securityHeaders = response.headers();
      
      // These checks would depend on your security implementation
      // expect(securityHeaders['strict-transport-security']).toBeTruthy();
      // expect(securityHeaders['x-content-type-options']).toBe('nosniff');
    });
  });
});