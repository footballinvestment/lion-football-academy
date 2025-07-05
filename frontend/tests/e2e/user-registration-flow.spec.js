const { test, expect } = require('@playwright/test');

test.describe('Complete User Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('should complete full registration flow for new player', async ({ page }) => {
    // Step 1: Navigate to registration page
    await page.click('text=Register');
    await expect(page).toHaveURL(/.*\/register/);
    
    // Step 2: Fill out registration form
    const playerData = {
      name: 'John Test Player',
      email: `player.${Date.now()}@test.com`,
      password: 'TestPassword123!',
      role: 'player'
    };
    
    await page.fill('[data-testid="name-input"]', playerData.name);
    await page.fill('[data-testid="email-input"]', playerData.email);
    await page.fill('[data-testid="password-input"]', playerData.password);
    await page.fill('[data-testid="confirm-password-input"]', playerData.password);
    await page.selectOption('[data-testid="role-select"]', playerData.role);
    
    // Step 3: Accept terms and conditions
    await page.check('[data-testid="terms-checkbox"]');
    
    // Step 4: Submit registration
    await page.click('[data-testid="register-submit"]');
    
    // Step 5: Verify successful registration
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Registration successful');
    
    // Step 6: Verify automatic login and redirect to dashboard
    await page.waitForURL(/.*\/player\/dashboard/);
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText(`Welcome, ${playerData.name}`);
    
    // Step 7: Verify player-specific navigation is visible
    await expect(page.locator('text=My Stats')).toBeVisible();
    await expect(page.locator('text=Trainings')).toBeVisible();
    await expect(page.locator('text=Matches')).toBeVisible();
    
    // Step 8: Verify profile information is correct
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Profile');
    await expect(page.locator('[data-testid="profile-name"]')).toHaveValue(playerData.name);
    await expect(page.locator('[data-testid="profile-email"]')).toHaveValue(playerData.email);
    await expect(page.locator('[data-testid="profile-role"]')).toContainText('Player');
  });

  test('should complete registration flow for coach with team assignment', async ({ page }) => {
    // Navigate to registration
    await page.click('text=Register');
    
    const coachData = {
      name: 'Sarah Test Coach',
      email: `coach.${Date.now()}@test.com`,
      password: 'CoachPassword123!',
      role: 'coach'
    };
    
    // Fill registration form
    await page.fill('[data-testid="name-input"]', coachData.name);
    await page.fill('[data-testid="email-input"]', coachData.email);
    await page.fill('[data-testid="password-input"]', coachData.password);
    await page.fill('[data-testid="confirm-password-input"]', coachData.password);
    await page.selectOption('[data-testid="role-select"]', coachData.role);
    
    // Coach-specific fields
    await page.fill('[data-testid="coaching-experience"]', '5 years');
    await page.fill('[data-testid="certifications"]', 'UEFA B License');
    
    await page.check('[data-testid="terms-checkbox"]');
    await page.click('[data-testid="register-submit"]');
    
    // Verify registration success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await page.waitForURL(/.*\/coach\/dashboard/);
    
    // Verify coach-specific features
    await expect(page.locator('text=My Teams')).toBeVisible();
    await expect(page.locator('text=Create Training')).toBeVisible();
    await expect(page.locator('text=Team Analytics')).toBeVisible();
  });

  test('should complete registration flow for parent with child linking', async ({ page }) => {
    await page.click('text=Register');
    
    const parentData = {
      name: 'Michael Test Parent',
      email: `parent.${Date.now()}@test.com`,
      password: 'ParentPassword123!',
      role: 'parent'
    };
    
    // Fill registration form
    await page.fill('[data-testid="name-input"]', parentData.name);
    await page.fill('[data-testid="email-input"]', parentData.email);
    await page.fill('[data-testid="password-input"]', parentData.password);
    await page.fill('[data-testid="confirm-password-input"]', parentData.password);
    await page.selectOption('[data-testid="role-select"]', parentData.role);
    
    // Parent-specific fields
    await page.fill('[data-testid="phone-number"]', '+36 30 123 4567');
    await page.fill('[data-testid="emergency-contact"]', '+36 30 987 6543');
    
    await page.check('[data-testid="terms-checkbox"]');
    await page.click('[data-testid="register-submit"]');
    
    // Verify registration
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await page.waitForURL(/.*\/parent\/dashboard/);
    
    // Verify parent-specific features
    await expect(page.locator('text=My Children')).toBeVisible();
    await expect(page.locator('text=Payment History')).toBeVisible();
    await expect(page.locator('text=Communication')).toBeVisible();
  });

  test('should handle registration validation errors', async ({ page }) => {
    await page.click('text=Register');
    
    // Try to submit empty form
    await page.click('[data-testid="register-submit"]');
    
    // Check validation errors
    await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required');
    
    // Test invalid email format
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.blur('[data-testid="email-input"]');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email format');
    
    // Test weak password
    await page.fill('[data-testid="password-input"]', '123');
    await page.blur('[data-testid="password-input"]');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least 6 characters');
    
    // Test password mismatch
    await page.fill('[data-testid="password-input"]', 'ValidPassword123!');
    await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123!');
    await page.blur('[data-testid="confirm-password-input"]');
    await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText('Passwords do not match');
  });

  test('should handle duplicate email registration', async ({ page }) => {
    // First, register a user
    await page.click('text=Register');
    
    const userData = {
      name: 'First User',
      email: `duplicate.${Date.now()}@test.com`,
      password: 'TestPassword123!',
      role: 'player'
    };
    
    await page.fill('[data-testid="name-input"]', userData.name);
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.selectOption('[data-testid="role-select"]', userData.role);
    await page.check('[data-testid="terms-checkbox"]');
    
    await page.click('[data-testid="register-submit"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');
    
    // Try to register with same email
    await page.click('text=Register');
    
    await page.fill('[data-testid="name-input"]', 'Second User');
    await page.fill('[data-testid="email-input"]', userData.email); // Same email
    await page.fill('[data-testid="password-input"]', 'AnotherPassword123!');
    await page.fill('[data-testid="confirm-password-input"]', 'AnotherPassword123!');
    await page.selectOption('[data-testid="role-select"]', 'coach');
    await page.check('[data-testid="terms-checkbox"]');
    
    await page.click('[data-testid="register-submit"]');
    
    // Verify duplicate email error
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Email already exists');
  });

  test('should complete registration with accessibility features', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab'); // Focus on first interactive element
    await page.keyboard.press('Tab'); // Navigate to register link
    await page.keyboard.press('Enter'); // Activate register link
    
    await expect(page).toHaveURL(/.*\/register/);
    
    // Test form navigation with keyboard
    await page.keyboard.press('Tab'); // Name field
    await page.keyboard.type('Accessible User');
    
    await page.keyboard.press('Tab'); // Email field
    await page.keyboard.type(`accessible.${Date.now()}@test.com`);
    
    await page.keyboard.press('Tab'); // Password field
    await page.keyboard.type('AccessiblePass123!');
    
    await page.keyboard.press('Tab'); // Confirm password field
    await page.keyboard.type('AccessiblePass123!');
    
    await page.keyboard.press('Tab'); // Role select
    await page.keyboard.press('ArrowDown'); // Select player role
    
    await page.keyboard.press('Tab'); // Terms checkbox
    await page.keyboard.press('Space'); // Check terms
    
    await page.keyboard.press('Tab'); // Submit button
    await page.keyboard.press('Enter'); // Submit form
    
    // Verify successful registration
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should handle network errors during registration', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/auth/register', route => {
      route.abort('failed');
    });
    
    await page.click('text=Register');
    
    await page.fill('[data-testid="name-input"]', 'Network Test User');
    await page.fill('[data-testid="email-input"]', `network.${Date.now()}@test.com`);
    await page.fill('[data-testid="password-input"]', 'NetworkTest123!');
    await page.fill('[data-testid="confirm-password-input"]', 'NetworkTest123!');
    await page.selectOption('[data-testid="role-select"]', 'player');
    await page.check('[data-testid="terms-checkbox"]');
    
    await page.click('[data-testid="register-submit"]');
    
    // Verify network error handling
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Network error occurred');
    
    // Verify form is still editable after error
    await expect(page.locator('[data-testid="name-input"]')).toBeEnabled();
    await expect(page.locator('[data-testid="register-submit"]')).toBeEnabled();
  });
});