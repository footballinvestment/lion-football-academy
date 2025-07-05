const { test, expect } = require('@playwright/test');

test.describe('QR Code Attendance Flow', () => {
  const users = {
    coach: {
      email: 'coach@lfa.test',
      password: 'CoachPassword123!',
      name: 'Coach User'
    },
    player: {
      email: 'player@lfa.test',
      password: 'PlayerPassword123!',
      name: 'Player User'
    }
  };

  let trainingSession;

  test.beforeAll(async ({ browser }) => {
    // Setup: Create a training session as coach
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('http://localhost:3000');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', users.coach.email);
    await page.fill('[data-testid="password-input"]', users.coach.password);
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL('**/coach/dashboard');
    
    // Create training session for QR testing
    await page.click('text=Trainings');
    await page.click('[data-testid="create-training-btn"]');
    
    trainingSession = {
      title: 'QR Attendance Test Training',
      date: new Date().toISOString().split('T')[0], // Today
      time: '16:00',
      duration: '90'
    };
    
    await page.fill('[data-testid="training-title"]', trainingSession.title);
    await page.fill('[data-testid="training-date"]', trainingSession.date);
    await page.fill('[data-testid="training-time"]', trainingSession.time);
    await page.fill('[data-testid="training-duration"]', trainingSession.duration);
    await page.selectOption('[data-testid="team-select"]', { label: 'U16 Lions' });
    
    await page.click('[data-testid="create-training-submit"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    await context.close();
  });

  test('should generate player QR code for attendance', async ({ page }) => {
    // Login as player
    await page.goto('http://localhost:3000');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', users.player.email);
    await page.fill('[data-testid="password-input"]', users.player.password);
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL('**/player/dashboard');
    
    // Navigate to QR code section
    await page.click('text=QR Code');
    await expect(page).toHaveURL(/.*\/player\/qr-code/);
    
    // Verify QR code is generated and displayed
    await expect(page.locator('[data-testid="player-qr-code"]')).toBeVisible();
    
    // Verify QR code contains player information
    const qrCodeElement = page.locator('[data-testid="player-qr-code"] canvas');
    await expect(qrCodeElement).toBeVisible();
    
    // Check QR code instructions
    await expect(page.locator('[data-testid="qr-instructions"]')).toContainText('Show this QR code to your coach');
    
    // Verify player info displayed
    await expect(page.locator('[data-testid="player-info"]')).toContainText(users.player.name);
    await expect(page.locator('[data-testid="player-team"]')).toContainText('U16 Lions');
    
    // Test QR code refresh functionality
    await page.click('[data-testid="refresh-qr-btn"]');
    await expect(page.locator('[data-testid="qr-refreshed-message"]')).toContainText('QR code refreshed');
    
    // Verify expiry time is displayed
    await expect(page.locator('[data-testid="qr-expiry"]')).toBeVisible();
    
    // Test QR code download
    await page.click('[data-testid="download-qr-btn"]');
    // Note: File download verification would need additional setup
  });

  test('should scan QR code and mark attendance as coach', async ({ page }) => {
    // Login as coach
    await page.goto('http://localhost:3000');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', users.coach.email);
    await page.fill('[data-testid="password-input"]', users.coach.password);
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL('**/coach/dashboard');
    
    // Navigate to QR check-in
    await page.click('text=QR Check-in');
    await expect(page).toHaveURL(/.*\/coach\/qr-checkin/);
    
    // Verify QR scanner interface
    await expect(page.locator('[data-testid="qr-scanner"]')).toBeVisible();
    await expect(page.locator('[data-testid="scanner-instructions"]')).toContainText('Point camera at player QR code');
    
    // Select training session for attendance
    await page.selectOption('[data-testid="training-session-select"]', { label: trainingSession.title });
    
    // Start camera for scanning
    await page.click('[data-testid="start-camera-btn"]');
    await expect(page.locator('[data-testid="camera-preview"]')).toBeVisible();
    
    // Mock QR code scan result (simulating successful scan)
    await page.evaluate(() => {
      // Simulate QR code scan result
      const mockQRData = {
        playerId: 'player-123',
        playerName: 'Player User',
        team: 'U16 Lions',
        timestamp: Date.now()
      };
      
      // Trigger scan result event
      window.dispatchEvent(new CustomEvent('qr-scan-result', {
        detail: { data: JSON.stringify(mockQRData) }
      }));
    });
    
    // Verify scan result processing
    await expect(page.locator('[data-testid="scan-result"]')).toBeVisible();
    await expect(page.locator('[data-testid="scanned-player-name"]')).toContainText('Player User');
    
    // Confirm attendance
    await page.click('[data-testid="confirm-attendance-btn"]');
    
    // Verify attendance marked
    await expect(page.locator('[data-testid="attendance-success"]')).toContainText('Attendance marked for Player User');
    
    // Verify player appears in attendance list
    await expect(page.locator('[data-testid="attendance-list"]')).toContainText('Player User');
    await expect(page.locator('[data-testid="attendance-status-player-123"]')).toContainText('Present');
    
    // Test haptic feedback for successful scan (if available)
    const hapticFeedback = await page.evaluate(() => {
      return navigator.vibrate ? 'available' : 'not available';
    });
    
    if (hapticFeedback === 'available') {
      // Verify haptic feedback was triggered
      await expect(page.locator('[data-testid="haptic-indicator"]')).toHaveClass(/success/);
    }
  });

  test('should handle invalid QR code scan', async ({ page }) => {
    // Login as coach
    await page.goto('http://localhost:3000');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', users.coach.email);
    await page.fill('[data-testid="password-input"]', users.coach.password);
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL('**/coach/dashboard');
    await page.click('text=QR Check-in');
    
    // Select training session
    await page.selectOption('[data-testid="training-session-select"]', { label: trainingSession.title });
    await page.click('[data-testid="start-camera-btn"]');
    
    // Simulate invalid QR code scan
    await page.evaluate(() => {
      // Trigger invalid QR scan
      window.dispatchEvent(new CustomEvent('qr-scan-result', {
        detail: { data: 'invalid-qr-data' }
      }));
    });
    
    // Verify error handling
    await expect(page.locator('[data-testid="scan-error"]')).toContainText('Invalid QR code');
    await expect(page.locator('[data-testid="error-instructions"]')).toContainText('Please scan a valid player QR code');
    
    // Verify scanner remains active for retry
    await expect(page.locator('[data-testid="camera-preview"]')).toBeVisible();
  });

  test('should handle expired QR code', async ({ page }) => {
    // Login as coach
    await page.goto('http://localhost:3000');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', users.coach.email);
    await page.fill('[data-testid="password-input"]', users.coach.password);
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL('**/coach/dashboard');
    await page.click('text=QR Check-in');
    
    await page.selectOption('[data-testid="training-session-select"]', { label: trainingSession.title });
    await page.click('[data-testid="start-camera-btn"]');
    
    // Simulate expired QR code scan
    await page.evaluate(() => {
      const expiredQRData = {
        playerId: 'player-123',
        playerName: 'Player User',
        team: 'U16 Lions',
        timestamp: Date.now() - (15 * 60 * 1000) // 15 minutes ago (expired)
      };
      
      window.dispatchEvent(new CustomEvent('qr-scan-result', {
        detail: { data: JSON.stringify(expiredQRData) }
      }));
    });
    
    // Verify expired QR code handling
    await expect(page.locator('[data-testid="scan-error"]')).toContainText('QR code has expired');
    await expect(page.locator('[data-testid="expiry-message"]')).toContainText('Please ask player to generate a new QR code');
    
    // Verify option to manually mark attendance
    await expect(page.locator('[data-testid="manual-attendance-btn"]')).toBeVisible();
    
    // Test manual attendance flow
    await page.click('[data-testid="manual-attendance-btn"]');
    await page.fill('[data-testid="manual-player-search"]', 'Player User');
    await page.click('[data-testid="search-player-btn"]');
    
    await expect(page.locator('[data-testid="found-player"]')).toContainText('Player User');
    await page.click('[data-testid="mark-manual-attendance"]');
    
    await expect(page.locator('[data-testid="manual-attendance-success"]')).toContainText('Manual attendance marked');
  });

  test('should bulk scan multiple players for attendance', async ({ page }) => {
    // Login as coach
    await page.goto('http://localhost:3000');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', users.coach.email);
    await page.fill('[data-testid="password-input"]', users.coach.password);
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL('**/coach/dashboard');
    await page.click('text=QR Check-in');
    
    // Enable bulk scan mode
    await page.check('[data-testid="bulk-scan-mode"]');
    await page.selectOption('[data-testid="training-session-select"]', { label: trainingSession.title });
    await page.click('[data-testid="start-camera-btn"]');
    
    // Simulate multiple QR code scans
    const players = [
      { id: 'player-1', name: 'John Doe' },
      { id: 'player-2', name: 'Jane Smith' },
      { id: 'player-3', name: 'Mike Johnson' }
    ];
    
    for (const player of players) {
      await page.evaluate((playerData) => {
        const qrData = {
          playerId: playerData.id,
          playerName: playerData.name,
          team: 'U16 Lions',
          timestamp: Date.now()
        };
        
        window.dispatchEvent(new CustomEvent('qr-scan-result', {
          detail: { data: JSON.stringify(qrData) }
        }));
      }, player);
      
      // Verify each player is added to bulk list
      await expect(page.locator(`[data-testid="bulk-player-${player.id}"]`)).toContainText(player.name);
    }
    
    // Verify bulk attendance count
    await expect(page.locator('[data-testid="bulk-count"]')).toContainText('3 players scanned');
    
    // Submit bulk attendance
    await page.click('[data-testid="submit-bulk-attendance"]');
    
    // Verify bulk submission success
    await expect(page.locator('[data-testid="bulk-success"]')).toContainText('Attendance marked for 3 players');
    
    // Verify all players in attendance list
    for (const player of players) {
      await expect(page.locator('[data-testid="attendance-list"]')).toContainText(player.name);
    }
  });

  test('should export attendance data', async ({ page }) => {
    // Login as coach
    await page.goto('http://localhost:3000');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', users.coach.email);
    await page.fill('[data-testid="password-input"]', users.coach.password);
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL('**/coach/dashboard');
    await page.click('text=QR Check-in');
    
    // Select training session with attendance data
    await page.selectOption('[data-testid="training-session-select"]', { label: trainingSession.title });
    
    // Navigate to attendance history
    await page.click('[data-testid="attendance-history-tab"]');
    
    // Verify attendance data is displayed
    await expect(page.locator('[data-testid="attendance-table"]')).toBeVisible();
    
    // Test export functionality
    await page.click('[data-testid="export-dropdown"]');
    
    // Export as CSV
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-csv"]');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain('attendance');
    expect(download.suggestedFilename()).toContain('.csv');
    
    // Export as PDF
    const pdfDownloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-pdf"]');
    const pdfDownload = await pdfDownloadPromise;
    
    expect(pdfDownload.suggestedFilename()).toContain('attendance');
    expect(pdfDownload.suggestedFilename()).toContain('.pdf');
  });

  test('should handle camera permissions and errors', async ({ page }) => {
    // Login as coach
    await page.goto('http://localhost:3000');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', users.coach.email);
    await page.fill('[data-testid="password-input"]', users.coach.password);
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL('**/coach/dashboard');
    await page.click('text=QR Check-in');
    
    // Mock camera permission denied
    await page.context().grantPermissions([], { origin: 'http://localhost:3000' });
    
    await page.selectOption('[data-testid="training-session-select"]', { label: trainingSession.title });
    await page.click('[data-testid="start-camera-btn"]');
    
    // Verify camera permission error handling
    await expect(page.locator('[data-testid="camera-error"]')).toContainText('Camera permission required');
    await expect(page.locator('[data-testid="permission-instructions"]')).toBeVisible();
    
    // Test fallback options
    await expect(page.locator('[data-testid="manual-attendance-option"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-upload-option"]')).toBeVisible();
    
    // Test file upload fallback
    await page.click('[data-testid="upload-qr-image"]');
    
    // Simulate QR image upload
    const qrImageFile = 'test-files/player-qr-code.png';
    await page.setInputFiles('[data-testid="qr-image-input"]', qrImageFile);
    
    // Verify image processing
    await expect(page.locator('[data-testid="image-processing"]')).toContainText('Processing QR code image');
    
    // Mock successful QR extraction from image
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('qr-image-processed', {
        detail: {
          success: true,
          data: JSON.stringify({
            playerId: 'player-123',
            playerName: 'Player User',
            team: 'U16 Lions',
            timestamp: Date.now()
          })
        }
      }));
    });
    
    await expect(page.locator('[data-testid="image-scan-success"]')).toContainText('QR code detected from image');
  });

  test('should work offline and sync when online', async ({ page }) => {
    // Login as coach
    await page.goto('http://localhost:3000');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', users.coach.email);
    await page.fill('[data-testid="password-input"]', users.coach.password);
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL('**/coach/dashboard');
    await page.click('text=QR Check-in');
    
    // Go offline
    await page.context().setOffline(true);
    
    await page.selectOption('[data-testid="training-session-select"]', { label: trainingSession.title });
    await page.click('[data-testid="start-camera-btn"]');
    
    // Verify offline mode indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-message"]')).toContainText('Working offline');
    
    // Scan QR code while offline
    await page.evaluate(() => {
      const qrData = {
        playerId: 'player-offline',
        playerName: 'Offline Player',
        team: 'U16 Lions',
        timestamp: Date.now()
      };
      
      window.dispatchEvent(new CustomEvent('qr-scan-result', {
        detail: { data: JSON.stringify(qrData) }
      }));
    });
    
    // Verify offline storage
    await expect(page.locator('[data-testid="offline-stored"]')).toContainText('Stored offline: Offline Player');
    
    // Go back online
    await page.context().setOffline(false);
    
    // Verify sync process
    await expect(page.locator('[data-testid="sync-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="sync-success"]')).toContainText('Offline data synced');
    
    // Verify attendance was synced to server
    await page.reload();
    await expect(page.locator('[data-testid="attendance-list"]')).toContainText('Offline Player');
  });
});