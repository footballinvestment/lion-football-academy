/**
 * Coach Workflow End-to-End Tests
 * Lion Football Academy Frontend Testing Suite
 */

const { test, expect } = require('@playwright/test');

test.describe('Coach Workflow Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Login as coach
    await page.fill('[data-testid="username-input"]', 'coach_test');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await page.waitForSelector('[data-testid="coach-dashboard"]');
  });

  test.describe('Team Management', () => {
    test('should view assigned teams', async ({ page }) => {
      await page.click('[data-testid="my-teams-nav-link"]');
      await page.waitForSelector('[data-testid="my-teams-page"]');
      
      // Should see assigned teams
      await expect(page.locator('[data-testid="assigned-teams"]')).toBeVisible();
      await expect(page.locator('[data-testid="team-card"]')).toHaveCount.greaterThan(0);
      
      // Should show team details
      const firstTeam = page.locator('[data-testid="team-card"]').first();
      await expect(firstTeam).toContainText('Lions');
      await expect(firstTeam).toContainText('U12');
    });

    test('should view team roster', async ({ page }) => {
      await page.click('[data-testid="my-teams-nav-link"]');
      
      // Click on first team
      await page.click('[data-testid="team-card"]:first-child');
      
      // Should show team roster
      await expect(page.locator('[data-testid="team-roster"]')).toBeVisible();
      await expect(page.locator('[data-testid="player-row"]')).toHaveCount.greaterThan(0);
      
      // Should show player details
      const firstPlayer = page.locator('[data-testid="player-row"]').first();
      await expect(firstPlayer).toContainText(/\w+/); // Player name
      await expect(firstPlayer).toContainText(/(Goalkeeper|Defender|Midfielder|Forward)/);
    });

    test('should update player information', async ({ page }) => {
      await page.click('[data-testid="my-teams-nav-link"]');
      await page.click('[data-testid="team-card"]:first-child');
      
      // Edit first player
      await page.click('[data-testid="edit-player-button"]:first-child');
      
      // Update player position
      await page.selectOption('[data-testid="player-position-select"]', 'Midfielder');
      await page.fill('[data-testid="player-notes-textarea"]', 'Good passing ability, needs work on shooting');
      
      await page.click('[data-testid="save-player-button"]');
      
      // Verify update
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Játékos sikeresen frissítve');
      await expect(page.locator('[data-testid="player-row"]:first-child')).toContainText('Midfielder');
    });
  });

  test.describe('Training Management', () => {
    test('should schedule training session', async ({ page }) => {
      await page.click('[data-testid="trainings-nav-link"]');
      await page.waitForSelector('[data-testid="trainings-page"]');
      
      // Click schedule training
      await page.click('[data-testid="schedule-training-button"]');
      
      // Fill training form
      await page.selectOption('[data-testid="training-team-select"]', '1');
      await page.fill('[data-testid="training-date-input"]', '2024-02-10');
      await page.fill('[data-testid="training-time-input"]', '18:00');
      await page.fill('[data-testid="training-duration-input"]', '90');
      await page.fill('[data-testid="training-location-input"]', 'Academy Field 1');
      await page.selectOption('[data-testid="training-focus-select"]', 'Technical');
      await page.fill('[data-testid="training-notes-textarea"]', 'Focus on ball control and passing accuracy');
      
      await page.click('[data-testid="save-training-button"]');
      
      // Verify training scheduled
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Edzés sikeresen ütemezve');
      await expect(page.locator('[data-testid="trainings-list"]')).toContainText('2024-02-10');
    });

    test('should record training attendance', async ({ page }) => {
      await page.click('[data-testid="trainings-nav-link"]');
      
      // Find upcoming training and record attendance
      await page.click('[data-testid="record-attendance-button"]:first-child');
      
      // Mark players as present/absent
      const playerCheckboxes = page.locator('[data-testid="player-attendance-checkbox"]');
      const count = await playerCheckboxes.count();
      
      // Mark first half as present
      for (let i = 0; i < Math.floor(count / 2); i++) {
        await playerCheckboxes.nth(i).check();
      }
      
      // Add performance notes
      await page.fill('[data-testid="training-performance-notes"]', 'Good session overall. Players showed improvement in passing drills.');
      
      await page.click('[data-testid="save-attendance-button"]');
      
      // Verify attendance saved
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Jelenlét sikeresen rögzítve');
    });

    test('should create training plan', async ({ page }) => {
      await page.click('[data-testid="trainings-nav-link"]');
      await page.click('[data-testid="training-plans-tab"]');
      
      // Create new training plan
      await page.click('[data-testid="create-plan-button"]');
      
      await page.fill('[data-testid="plan-name-input"]', 'Weekly Technical Training');
      await page.fill('[data-testid="plan-description-textarea"]', 'Focus on technical skills development');
      await page.selectOption('[data-testid="plan-duration-select"]', '4'); // 4 weeks
      
      // Add training sessions to plan
      await page.click('[data-testid="add-session-button"]');
      await page.fill('[data-testid="session-title-input"]', 'Dribbling and Ball Control');
      await page.fill('[data-testid="session-duration-input"]', '30');
      await page.fill('[data-testid="session-description-textarea"]', 'Cone dribbling exercises');
      
      await page.click('[data-testid="save-plan-button"]');
      
      // Verify plan created
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Edzésterv sikeresen létrehozva');
      await expect(page.locator('[data-testid="plans-list"]')).toContainText('Weekly Technical Training');
    });
  });

  test.describe('Match Management', () => {
    test('should view team matches', async ({ page }) => {
      await page.click('[data-testid="matches-nav-link"]');
      await page.waitForSelector('[data-testid="matches-page"]');
      
      // Should see only matches for coach's teams
      await expect(page.locator('[data-testid="team-matches"]')).toBeVisible();
      
      // Filter by team
      await page.selectOption('[data-testid="match-team-filter"]', '1');
      
      // Should show filtered matches
      const matches = page.locator('[data-testid="match-row"]');
      await expect(matches).toHaveCount.greaterThan(0);
    });

    test('should record match result and player performance', async ({ page }) => {
      await page.click('[data-testid="matches-nav-link"]');
      
      // Find completed match to record result
      await page.click('[data-testid="record-result-button"]:first-child');
      
      // Enter basic match result
      await page.fill('[data-testid="home-score-input"]', '2');
      await page.fill('[data-testid="away-score-input"]', '1');
      
      // Record player performances
      await page.click('[data-testid="player-performance-tab"]');
      
      // Rate first player performance
      const firstPlayerRow = page.locator('[data-testid="player-performance-row"]').first();
      await firstPlayerRow.locator('[data-testid="rating-star-4"]').click(); // 4-star rating
      await firstPlayerRow.locator('[data-testid="minutes-played-input"]').fill('90');
      
      // Add goals and assists
      await page.click('[data-testid="add-goal-button"]');
      await page.selectOption('[data-testid="goal-player-select"]', '1');
      await page.fill('[data-testid="goal-minute-input"]', '25');
      await page.selectOption('[data-testid="goal-type-select"]', 'Regular');
      
      await page.click('[data-testid="add-assist-button"]');
      await page.selectOption('[data-testid="assist-player-select"]', '2');
      await page.fill('[data-testid="assist-minute-input"]', '25');
      
      await page.click('[data-testid="save-match-result-button"]');
      
      // Verify result saved
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Mérkőzés eredménye sikeresen rögzítve');
    });

    test('should prepare team lineup', async ({ page }) => {
      await page.click('[data-testid="matches-nav-link"]');
      
      // Find upcoming match
      await page.click('[data-testid="prepare-lineup-button"]:first-child');
      
      // Set formation
      await page.selectOption('[data-testid="formation-select"]', '4-4-2');
      
      // Assign players to positions
      await page.dragAndDrop('[data-testid="player-1"]', '[data-testid="position-gk"]');
      await page.dragAndDrop('[data-testid="player-2"]', '[data-testid="position-lb"]');
      await page.dragAndDrop('[data-testid="player-3"]', '[data-testid="position-cb1"]');
      await page.dragAndDrop('[data-testid="player-4"]', '[data-testid="position-cb2"]');
      await page.dragAndDrop('[data-testid="player-5"]', '[data-testid="position-rb"]');
      
      // Set captain
      await page.click('[data-testid="captain-select-player-3"]');
      
      // Add tactical notes
      await page.fill('[data-testid="tactical-notes-textarea"]', 'Play high pressing, quick counter-attacks');
      
      await page.click('[data-testid="save-lineup-button"]');
      
      // Verify lineup saved
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Felállás sikeresen mentve');
    });
  });

  test.describe('Player Development', () => {
    test('should create development plan for player', async ({ page }) => {
      await page.click('[data-testid="development-plans-nav-link"]');
      await page.waitForSelector('[data-testid="development-plans-page"]');
      
      // Create new development plan
      await page.click('[data-testid="create-development-plan-button"]');
      
      // Select player
      await page.selectOption('[data-testid="plan-player-select"]', '1');
      
      // Fill plan details
      await page.fill('[data-testid="plan-title-input"]', 'Shooting Accuracy Improvement');
      await page.fill('[data-testid="plan-description-textarea"]', 'Focus on improving shooting accuracy from different positions');
      await page.fill('[data-testid="plan-target-date-input"]', '2024-06-01');
      
      // Add goals
      await page.click('[data-testid="add-goal-button"]');
      await page.fill('[data-testid="goal-description-input"]', 'Increase shooting accuracy by 15%');
      await page.selectOption('[data-testid="goal-priority-select"]', 'High');
      
      await page.click('[data-testid="add-goal-button"]');
      await page.fill('[data-testid="goal-description-input"]:last-child', 'Practice shooting drills 3 times per week');
      
      // Add specific exercises
      await page.click('[data-testid="add-exercise-button"]');
      await page.fill('[data-testid="exercise-name-input"]', 'Cone Shooting Drill');
      await page.fill('[data-testid="exercise-description-textarea"]', 'Set up 5 cones and practice shooting from different angles');
      await page.fill('[data-testid="exercise-frequency-input"]', '3');
      
      await page.click('[data-testid="save-development-plan-button"]');
      
      // Verify plan created
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Fejlesztési terv sikeresen létrehozva');
      await expect(page.locator('[data-testid="plans-list"]')).toContainText('Shooting Accuracy Improvement');
    });

    test('should track player progress', async ({ page }) => {
      await page.click('[data-testid="development-plans-nav-link"]');
      
      // Open existing development plan
      await page.click('[data-testid="plan-row"]:first-child');
      
      // Update progress
      await page.click('[data-testid="update-progress-button"]');
      
      // Update goal progress
      await page.fill('[data-testid="goal-progress-slider"]:first-child', '60');
      await page.fill('[data-testid="progress-notes-textarea"]', 'Player showing good improvement in accuracy. Continue with current exercises.');
      
      // Add assessment
      await page.click('[data-testid="add-assessment-button"]');
      await page.selectOption('[data-testid="assessment-type-select"]', 'Skill Test');
      await page.fill('[data-testid="assessment-score-input"]', '7.5');
      await page.fill('[data-testid="assessment-notes-textarea"]', 'Improved shooting accuracy in training. Ready for match situations.');
      
      await page.click('[data-testid="save-progress-button"]');
      
      // Verify progress updated
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Fejlődés sikeresen frissítve');
      await expect(page.locator('[data-testid="progress-percentage"]')).toContainText('60%');
    });

    test('should view player statistics', async ({ page }) => {
      await page.click('[data-testid="players-nav-link"]');
      
      // View player details
      await page.click('[data-testid="player-row"]:first-child');
      
      // Should show comprehensive player stats
      await expect(page.locator('[data-testid="player-stats-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="goals-stat"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="assists-stat"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="matches-played-stat"]')).toContainText(/\d+/);
      
      // View performance chart
      await page.click('[data-testid="performance-chart-tab"]');
      await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
      
      // View development progress
      await page.click('[data-testid="development-tab"]');
      await expect(page.locator('[data-testid="development-progress"]')).toBeVisible();
    });
  });

  test.describe('Communication', () => {
    test('should send message to parents', async ({ page }) => {
      await page.click('[data-testid="communication-nav-link"]');
      await page.waitForSelector('[data-testid="communication-page"]');
      
      // Create new message
      await page.click('[data-testid="compose-message-button"]');
      
      // Select recipients
      await page.selectOption('[data-testid="recipient-team-select"]', '1');
      await page.check('[data-testid="all-parents-checkbox"]');
      
      // Fill message
      await page.fill('[data-testid="message-subject-input"]', 'Training Schedule Update');
      await page.fill('[data-testid="message-body-textarea"]', 'Dear Parents, please note that next week\'s training has been moved to 6 PM. Thank you.');
      
      // Set priority
      await page.selectOption('[data-testid="message-priority-select"]', 'Normal');
      
      await page.click('[data-testid="send-message-button"]');
      
      // Verify message sent
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Üzenet sikeresen elküldve');
    });

    test('should create team announcement', async ({ page }) => {
      await page.click('[data-testid="communication-nav-link"]');
      await page.click('[data-testid="announcements-tab"]');
      
      // Create announcement
      await page.click('[data-testid="create-announcement-button"]');
      
      await page.fill('[data-testid="announcement-title-input"]', 'Match This Weekend');
      await page.fill('[data-testid="announcement-content-textarea"]', 'We have an important match this weekend. Please arrive 30 minutes early for warm-up.');
      await page.selectOption('[data-testid="announcement-team-select"]', '1');
      await page.check('[data-testid="pin-announcement-checkbox"]');
      
      await page.click('[data-testid="publish-announcement-button"]');
      
      // Verify announcement published
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Közlemény sikeresen közzétéve');
      await expect(page.locator('[data-testid="announcements-list"]')).toContainText('Match This Weekend');
    });
  });

  test.describe('Injury Management', () => {
    test('should record player injury', async ({ page }) => {
      await page.click('[data-testid="injuries-nav-link"]');
      await page.waitForSelector('[data-testid="injuries-page"]');
      
      // Record new injury
      await page.click('[data-testid="record-injury-button"]');
      
      // Fill injury form
      await page.selectOption('[data-testid="injury-player-select"]', '1');
      await page.selectOption('[data-testid="injury-type-select"]', 'Ankle Sprain');
      await page.selectOption('[data-testid="injury-severity-select"]', 'Minor');
      await page.fill('[data-testid="injury-date-input"]', '2024-01-15');
      await page.fill('[data-testid="injury-description-textarea"]', 'Player twisted ankle during training. Able to walk but experiencing pain.');
      
      // Set estimated recovery
      await page.fill('[data-testid="estimated-recovery-input"]', '2024-01-25');
      
      // Add treatment plan
      await page.fill('[data-testid="treatment-plan-textarea"]', 'Rest for 3 days, ice therapy, gradual return to training.');
      
      await page.click('[data-testid="save-injury-button"]');
      
      // Verify injury recorded
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Sérülés sikeresen rögzítve');
      await expect(page.locator('[data-testid="injuries-list"]')).toContainText('Ankle Sprain');
    });

    test('should update injury status', async ({ page }) => {
      await page.click('[data-testid="injuries-nav-link"]');
      
      // Find injury and update status
      await page.click('[data-testid="update-injury-button"]:first-child');
      
      // Update recovery progress
      await page.selectOption('[data-testid="injury-status-select"]', 'Recovering');
      await page.fill('[data-testid="recovery-notes-textarea"]', 'Player feeling better, started light jogging. No pain reported.');
      
      // Schedule return date
      await page.fill('[data-testid="return-date-input"]', '2024-01-22');
      
      await page.click('[data-testid="save-injury-update-button"]');
      
      // Verify update saved
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Sérülés státusza frissítve');
    });
  });

  test.describe('Reports and Analytics', () => {
    test('should generate team performance report', async ({ page }) => {
      await page.click('[data-testid="statistics-nav-link"]');
      
      // Select team for report
      await page.selectOption('[data-testid="report-team-select"]', '1');
      
      // Set date range
      await page.fill('[data-testid="report-start-date"]', '2024-01-01');
      await page.fill('[data-testid="report-end-date"]', '2024-01-31');
      
      // Generate report
      await page.click('[data-testid="generate-report-button"]');
      
      // Verify report generated
      await expect(page.locator('[data-testid="team-report"]')).toBeVisible();
      await expect(page.locator('[data-testid="matches-summary"]')).toContainText(/\d+ matches/);
      await expect(page.locator('[data-testid="goals-summary"]')).toContainText(/\d+ goals/);
      
      // Export report
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-report-button"]');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('team-report');
    });

    test('should view training effectiveness metrics', async ({ page }) => {
      await page.click('[data-testid="statistics-nav-link"]');
      await page.click('[data-testid="training-analytics-tab"]');
      
      // Should show training metrics
      await expect(page.locator('[data-testid="training-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="attendance-rate"]')).toContainText(/%/);
      await expect(page.locator('[data-testid="improvement-rate"]')).toContainText(/%/);
      
      // View detailed analytics
      await page.click('[data-testid="detailed-analytics-button"]');
      await expect(page.locator('[data-testid="skills-improvement-chart"]')).toBeVisible();
    });
  });

  test.describe('Mobile Coach Experience', () => {
    test('should work effectively on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Mobile navigation should work
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
      
      // Quick actions should be accessible
      await page.click('[data-testid="mobile-quick-actions"]');
      await expect(page.locator('[data-testid="quick-record-attendance"]')).toBeVisible();
      await expect(page.locator('[data-testid="quick-record-injury"]')).toBeVisible();
      
      // Team roster should adapt to mobile
      await page.click('[data-testid="mobile-my-teams-link"]');
      await expect(page.locator('[data-testid="mobile-team-cards"]')).toBeVisible();
    });
  });
});