const { test, expect } = require('@playwright/test');

test.describe('Coach Training Session Creation', () => {
  const coachUser = {
    email: 'coach@lfa.test',
    password: 'CoachPassword123!',
    name: 'Coach User'
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Login as coach
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', coachUser.email);
    await page.fill('[data-testid="password-input"]', coachUser.password);
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL('**/coach/dashboard');
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText(coachUser.name);
  });

  test('should create a complete training session successfully', async ({ page }) => {
    // Navigate to training creation
    await page.click('text=Trainings');
    await expect(page).toHaveURL(/.*\/coach\/trainings/);
    
    // Click create training button
    await page.click('[data-testid="create-training-btn"]');
    await expect(page.locator('[data-testid="training-form"]')).toBeVisible();
    
    // Fill training details
    const trainingData = {
      title: 'Advanced Passing Techniques',
      description: 'Focus on short passes, long passes, and through balls. Emphasize accuracy and timing.',
      date: '2024-02-20',
      time: '16:00',
      duration: '90',
      location: 'Main Training Field',
      maxParticipants: '20'
    };
    
    await page.fill('[data-testid="training-title"]', trainingData.title);
    await page.fill('[data-testid="training-description"]', trainingData.description);
    await page.fill('[data-testid="training-date"]', trainingData.date);
    await page.fill('[data-testid="training-time"]', trainingData.time);
    await page.fill('[data-testid="training-duration"]', trainingData.duration);
    await page.fill('[data-testid="training-location"]', trainingData.location);
    await page.fill('[data-testid="max-participants"]', trainingData.maxParticipants);
    
    // Select team
    await page.selectOption('[data-testid="team-select"]', { label: 'U16 Lions' });
    
    // Select training type
    await page.selectOption('[data-testid="training-type"]', 'technical');
    
    // Add training objectives
    await page.click('[data-testid="add-objective-btn"]');
    await page.fill('[data-testid="objective-0"]', 'Improve passing accuracy by 15%');
    
    await page.click('[data-testid="add-objective-btn"]');
    await page.fill('[data-testid="objective-1"]', 'Master through ball technique');
    
    // Add equipment needed
    await page.click('[data-testid="add-equipment-btn"]');
    await page.fill('[data-testid="equipment-0"]', '20 cones');
    
    await page.click('[data-testid="add-equipment-btn"]');
    await page.fill('[data-testid="equipment-1"]', '5 footballs');
    
    // Set weather conditions consideration
    await page.check('[data-testid="weather-dependent"]');
    await page.fill('[data-testid="weather-notes"]', 'Cancel if heavy rain, modify for light rain');
    
    // Submit training creation
    await page.click('[data-testid="create-training-submit"]');
    
    // Verify successful creation
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Training session created successfully');
    
    // Verify redirect to training list
    await expect(page).toHaveURL(/.*\/coach\/trainings/);
    
    // Verify training appears in list
    await expect(page.locator('[data-testid="training-list"]')).toContainText(trainingData.title);
    
    // Click on created training to view details
    await page.click(`[data-testid="training-${trainingData.title.replace(/\s/g, '-').toLowerCase()}"]`);
    
    // Verify all details are correctly saved
    await expect(page.locator('[data-testid="training-detail-title"]')).toContainText(trainingData.title);
    await expect(page.locator('[data-testid="training-detail-description"]')).toContainText(trainingData.description);
    await expect(page.locator('[data-testid="training-detail-date"]')).toContainText('February 20, 2024');
    await expect(page.locator('[data-testid="training-detail-time"]')).toContainText('4:00 PM');
    await expect(page.locator('[data-testid="training-detail-duration"]')).toContainText('90 minutes');
    
    // Verify objectives are displayed
    await expect(page.locator('[data-testid="objective-list"]')).toContainText('Improve passing accuracy by 15%');
    await expect(page.locator('[data-testid="objective-list"]')).toContainText('Master through ball technique');
    
    // Verify equipment list
    await expect(page.locator('[data-testid="equipment-list"]')).toContainText('20 cones');
    await expect(page.locator('[data-testid="equipment-list"]')).toContainText('5 footballs');
  });

  test('should create training with recurring schedule', async ({ page }) => {
    await page.click('text=Trainings');
    await page.click('[data-testid="create-training-btn"]');
    
    // Fill basic training details
    await page.fill('[data-testid="training-title"]', 'Weekly Fitness Training');
    await page.fill('[data-testid="training-description"]', 'Regular fitness and conditioning session');
    await page.fill('[data-testid="training-date"]', '2024-02-19');
    await page.fill('[data-testid="training-time"]', '18:00');
    await page.fill('[data-testid="training-duration"]', '60');
    
    await page.selectOption('[data-testid="team-select"]', { label: 'U16 Lions' });
    await page.selectOption('[data-testid="training-type"]', 'fitness');
    
    // Enable recurring schedule
    await page.check('[data-testid="recurring-enabled"]');
    
    // Set recurrence pattern
    await page.selectOption('[data-testid="recurrence-pattern"]', 'weekly');
    await page.fill('[data-testid="recurrence-count"]', '8'); // 8 weeks
    
    // Select specific days for weekly recurrence
    await page.check('[data-testid="recurrence-monday"]');
    await page.check('[data-testid="recurrence-wednesday"]');
    
    await page.click('[data-testid="create-training-submit"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('8 training sessions created successfully');
    
    // Verify multiple sessions appear in calendar view
    await page.click('[data-testid="calendar-view-btn"]');
    
    // Check that training appears on multiple Mondays and Wednesdays
    await expect(page.locator('[data-testid="calendar"]')).toContainText('Weekly Fitness Training');
    
    // Count the number of training sessions
    const trainingInstances = await page.locator('[data-testid*="training-instance-"]').count();
    expect(trainingInstances).toBe(16); // 8 weeks × 2 days per week
  });

  test('should handle training validation errors', async ({ page }) => {
    await page.click('text=Trainings');
    await page.click('[data-testid="create-training-btn"]');
    
    // Try to submit empty form
    await page.click('[data-testid="create-training-submit"]');
    
    // Check validation errors
    await expect(page.locator('[data-testid="title-error"]')).toContainText('Title is required');
    await expect(page.locator('[data-testid="date-error"]')).toContainText('Date is required');
    await expect(page.locator('[data-testid="time-error"]')).toContainText('Time is required');
    await expect(page.locator('[data-testid="team-error"]')).toContainText('Team selection is required');
    
    // Test invalid date (past date)
    await page.fill('[data-testid="training-date"]', '2020-01-01');
    await page.blur('[data-testid="training-date"]');
    await expect(page.locator('[data-testid="date-error"]')).toContainText('Date cannot be in the past');
    
    // Test invalid duration
    await page.fill('[data-testid="training-duration"]', '300'); // 5 hours
    await page.blur('[data-testid="training-duration"]');
    await expect(page.locator('[data-testid="duration-error"]')).toContainText('Duration must be between 30 and 180 minutes');
    
    // Test title too long
    await page.fill('[data-testid="training-title"]', 'A'.repeat(101));
    await page.blur('[data-testid="training-title"]');
    await expect(page.locator('[data-testid="title-error"]')).toContainText('Title must be no more than 100 characters');
  });

  test('should create training with player invitations', async ({ page }) => {
    await page.click('text=Trainings');
    await page.click('[data-testid="create-training-btn"]');
    
    // Fill basic details
    await page.fill('[data-testid="training-title"]', 'Goalkeeper Training');
    await page.fill('[data-testid="training-date"]', '2024-02-21');
    await page.fill('[data-testid="training-time"]', '17:00');
    await page.fill('[data-testid="training-duration"]', '75');
    
    await page.selectOption('[data-testid="team-select"]', { label: 'U16 Lions' });
    await page.selectOption('[data-testid="training-type"]', 'technical');
    
    // Expand player invitation section
    await page.click('[data-testid="player-invitations-toggle"]');
    
    // Select specific players
    await page.check('[data-testid="invite-player-1"]'); // John Goalkeeper
    await page.check('[data-testid="invite-player-5"]'); // Mike Backup GK
    
    // Add personal notes for players
    await page.fill('[data-testid="player-note-1"]', 'Focus on diving technique');
    await page.fill('[data-testid="player-note-5"]', 'Work on distribution');
    
    // Set RSVP deadline
    await page.fill('[data-testid="rsvp-deadline"]', '2024-02-19');
    
    await page.click('[data-testid="create-training-submit"]');
    
    // Verify creation success
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Training created and invitations sent');
    
    // Verify notifications were sent
    await expect(page.locator('[data-testid="notification-info"]')).toContainText('2 players notified');
  });

  test('should create training with assessment criteria', async ({ page }) => {
    await page.click('text=Trainings');
    await page.click('[data-testid="create-training-btn"]');
    
    // Fill basic details
    await page.fill('[data-testid="training-title"]', 'Skills Assessment Training');
    await page.fill('[data-testid="training-date"]', '2024-02-22');
    await page.fill('[data-testid="training-time"]', '16:30');
    await page.fill('[data-testid="training-duration"]', '120');
    
    await page.selectOption('[data-testid="team-select"]', { label: 'U16 Lions' });
    await page.selectOption('[data-testid="training-type"]', 'assessment');
    
    // Enable assessment mode
    await page.check('[data-testid="assessment-enabled"]');
    
    // Add assessment criteria
    await page.click('[data-testid="add-criteria-btn"]');
    await page.fill('[data-testid="criteria-0-name"]', 'Passing Accuracy');
    await page.selectOption('[data-testid="criteria-0-type"]', 'percentage');
    await page.fill('[data-testid="criteria-0-weight"]', '30');
    
    await page.click('[data-testid="add-criteria-btn"]');
    await page.fill('[data-testid="criteria-1-name"]', 'Ball Control');
    await page.selectOption('[data-testid="criteria-1-type"]', 'rating');
    await page.fill('[data-testid="criteria-1-weight"]', '25');
    
    await page.click('[data-testid="add-criteria-btn"]');
    await page.fill('[data-testid="criteria-2-name"]', 'Tactical Awareness');
    await page.selectOption('[data-testid="criteria-2-type"]', 'rating');
    await page.fill('[data-testid="criteria-2-weight"]', '45');
    
    // Set overall assessment weight in player development
    await page.fill('[data-testid="development-weight"]', '20');
    
    await page.click('[data-testid="create-training-submit"]');
    
    // Verify assessment training creation
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Assessment training created successfully');
    
    // Navigate to training details
    await page.click('[data-testid="training-skills-assessment-training"]');
    
    // Verify assessment criteria are displayed
    await expect(page.locator('[data-testid="assessment-criteria"]')).toContainText('Passing Accuracy (30%)');
    await expect(page.locator('[data-testid="assessment-criteria"]')).toContainText('Ball Control (25%)');
    await expect(page.locator('[data-testid="assessment-criteria"]')).toContainText('Tactical Awareness (45%)');
  });

  test('should duplicate existing training session', async ({ page }) => {
    // First, navigate to existing training
    await page.click('text=Trainings');
    
    // Find an existing training and click options
    await page.click('[data-testid="training-options-1"]');
    await page.click('[data-testid="duplicate-training"]');
    
    // Verify form is pre-filled with existing data
    await expect(page.locator('[data-testid="training-title"]')).toHaveValue('Copy of Advanced Passing Techniques');
    
    // Modify the date and time
    await page.fill('[data-testid="training-date"]', '2024-02-25');
    await page.fill('[data-testid="training-time"]', '10:00');
    
    // Add a note about the duplication
    await page.fill('[data-testid="training-notes"]', 'Duplicate of successful passing session from last week');
    
    await page.click('[data-testid="create-training-submit"]');
    
    // Verify successful duplication
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Training duplicated successfully');
    
    // Verify both original and duplicate exist
    await expect(page.locator('[data-testid="training-list"]')).toContainText('Advanced Passing Techniques');
    await expect(page.locator('[data-testid="training-list"]')).toContainText('Copy of Advanced Passing Techniques');
  });

  test('should handle training conflicts and suggestions', async ({ page }) => {
    await page.click('text=Trainings');
    await page.click('[data-testid="create-training-btn"]');
    
    // Fill details that conflict with existing training
    await page.fill('[data-testid="training-title"]', 'Conflicting Training');
    await page.fill('[data-testid="training-date"]', '2024-02-20'); // Same date as existing training
    await page.fill('[data-testid="training-time"]', '16:00'); // Same time
    await page.fill('[data-testid="training-duration"]', '90');
    
    await page.selectOption('[data-testid="team-select"]', { label: 'U16 Lions' }); // Same team
    
    // Try to submit
    await page.click('[data-testid="create-training-submit"]');
    
    // Verify conflict detection
    await expect(page.locator('[data-testid="conflict-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="conflict-message"]')).toContainText('Training conflict detected');
    
    // Check suggested alternative times
    await expect(page.locator('[data-testid="suggested-times"]')).toBeVisible();
    
    // Click on a suggested time
    await page.click('[data-testid="suggestion-0"]');
    
    // Verify time is automatically updated
    await expect(page.locator('[data-testid="training-time"]')).toHaveValue('18:00');
    
    // Submit with resolved conflict
    await page.click('[data-testid="create-training-submit"]');
    
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Training session created successfully');
  });

  test('should save training as draft', async ({ page }) => {
    await page.click('text=Trainings');
    await page.click('[data-testid="create-training-btn"]');
    
    // Fill partial information
    await page.fill('[data-testid="training-title"]', 'Draft Training Session');
    await page.fill('[data-testid="training-description"]', 'This is a work in progress');
    await page.selectOption('[data-testid="team-select"]', { label: 'U16 Lions' });
    
    // Save as draft instead of publishing
    await page.click('[data-testid="save-draft-btn"]');
    
    // Verify draft saved
    await expect(page.locator('[data-testid="draft-saved-message"]')).toContainText('Draft saved successfully');
    
    // Navigate to drafts section
    await page.click('[data-testid="drafts-tab"]');
    
    // Verify draft appears in drafts list
    await expect(page.locator('[data-testid="drafts-list"]')).toContainText('Draft Training Session');
    await expect(page.locator('[data-testid="draft-status"]')).toContainText('Draft');
    
    // Edit draft
    await page.click('[data-testid="edit-draft-draft-training-session"]');
    
    // Complete the training details
    await page.fill('[data-testid="training-date"]', '2024-02-26');
    await page.fill('[data-testid="training-time"]', '15:00');
    await page.fill('[data-testid="training-duration"]', '60');
    
    // Publish the draft
    await page.click('[data-testid="publish-training-btn"]');
    
    // Verify publication
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Training published successfully');
    
    // Verify it moves from drafts to published trainings
    await page.click('[data-testid="published-tab"]');
    await expect(page.locator('[data-testid="training-list"]')).toContainText('Draft Training Session');
  });

  test('should create training with media attachments', async ({ page }) => {
    await page.click('text=Trainings');
    await page.click('[data-testid="create-training-btn"]');
    
    // Fill basic details
    await page.fill('[data-testid="training-title"]', 'Video Analysis Training');
    await page.fill('[data-testid="training-date"]', '2024-02-27');
    await page.fill('[data-testid="training-time"]', '14:00');
    await page.fill('[data-testid="training-duration"]', '90');
    
    await page.selectOption('[data-testid="team-select"]', { label: 'U16 Lions' });
    
    // Add media attachments
    await page.click('[data-testid="media-section-toggle"]');
    
    // Upload training video
    const videoFile = 'test-files/training-video.mp4';
    await page.setInputFiles('[data-testid="video-upload"]', videoFile);
    
    // Upload training diagram
    const diagramFile = 'test-files/training-diagram.png';
    await page.setInputFiles('[data-testid="image-upload"]', diagramFile);
    
    // Add YouTube video link
    await page.fill('[data-testid="youtube-link"]', 'https://youtube.com/watch?v=example');
    
    // Add training plan PDF
    const pdfFile = 'test-files/training-plan.pdf';
    await page.setInputFiles('[data-testid="document-upload"]', pdfFile);
    
    await page.click('[data-testid="create-training-submit"]');
    
    // Verify successful creation with media
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Training created with 4 attachments');
    
    // View training details to verify media
    await page.click('[data-testid="training-video-analysis-training"]');
    
    // Verify media attachments are displayed
    await expect(page.locator('[data-testid="training-video"]')).toBeVisible();
    await expect(page.locator('[data-testid="training-diagram"]')).toBeVisible();
    await expect(page.locator('[data-testid="youtube-embed"]')).toBeVisible();
    await expect(page.locator('[data-testid="training-plan-pdf"]')).toBeVisible();
  });
});