const { test, expect } = require('@playwright/test');

test.describe('Role-Based Login Scenarios', () => {
  const testUsers = {
    admin: {
      email: 'admin@lfa.test',
      password: 'AdminPassword123!',
      name: 'Admin User',
      expectedDashboard: '/admin/dashboard',
      expectedFeatures: ['User Management', 'System Statistics', 'Global Settings']
    },
    coach: {
      email: 'coach@lfa.test',
      password: 'CoachPassword123!',
      name: 'Coach User',
      expectedDashboard: '/coach/dashboard',
      expectedFeatures: ['My Teams', 'Create Training', 'Player Statistics']
    },
    player: {
      email: 'player@lfa.test',
      password: 'PlayerPassword123!',
      name: 'Player User',
      expectedDashboard: '/player/dashboard',
      expectedFeatures: ['My Stats', 'Training Schedule', 'Match Results']
    },
    parent: {
      email: 'parent@lfa.test',
      password: 'ParentPassword123!',
      name: 'Parent User',
      expectedDashboard: '/parent/dashboard',
      expectedFeatures: ['My Children', 'Payment History', 'Communication']
    }
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should login as admin and access admin features', async ({ page }) => {
    const admin = testUsers.admin;
    
    // Navigate to login
    await page.click('text=Login');
    await expect(page).toHaveURL(/.*\/login/);
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', admin.email);
    await page.fill('[data-testid="password-input"]', admin.password);
    
    // Submit login
    await page.click('[data-testid="login-submit"]');
    
    // Verify successful login and redirect
    await page.waitForURL(`**${admin.expectedDashboard}`);
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText(admin.name);
    
    // Verify admin-specific navigation
    await expect(page.locator('text=User Management')).toBeVisible();
    await expect(page.locator('text=System Statistics')).toBeVisible();
    await expect(page.locator('text=Teams')).toBeVisible();
    await expect(page.locator('text=Players')).toBeVisible();
    
    // Test admin-only features
    await page.click('text=User Management');
    await expect(page).toHaveURL(/.*\/admin\/users/);
    
    // Verify admin can see user list
    await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-user-btn"]')).toBeVisible();
    
    // Test user creation capability
    await page.click('[data-testid="create-user-btn"]');
    await expect(page.locator('[data-testid="user-form"]')).toBeVisible();
    
    // Verify role selection includes all roles
    const roleOptions = await page.locator('[data-testid="role-select"] option').allTextContents();
    expect(roleOptions).toEqual(expect.arrayContaining(['Admin', 'Coach', 'Player', 'Parent']));
  });

  test('should login as coach and access coach features', async ({ page }) => {
    const coach = testUsers.coach;
    
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', coach.email);
    await page.fill('[data-testid="password-input"]', coach.password);
    await page.click('[data-testid="login-submit"]');
    
    // Verify coach dashboard
    await page.waitForURL(`**${coach.expectedDashboard}`);
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText(coach.name);
    
    // Verify coach-specific navigation
    await expect(page.locator('text=My Teams')).toBeVisible();
    await expect(page.locator('text=Trainings')).toBeVisible();
    await expect(page.locator('text=Matches')).toBeVisible();
    await expect(page.locator('text=QR Check-in')).toBeVisible();
    
    // Verify coach cannot access admin features
    await expect(page.locator('text=User Management')).not.toBeVisible();
    await expect(page.locator('text=System Statistics')).not.toBeVisible();
    
    // Test coach-specific features
    await page.click('text=My Teams');
    await expect(page).toHaveURL(/.*\/coach\/teams/);
    await expect(page.locator('[data-testid="teams-list"]')).toBeVisible();
    
    // Test training creation
    await page.click('text=Trainings');
    await expect(page.locator('[data-testid="create-training-btn"]')).toBeVisible();
    
    await page.click('[data-testid="create-training-btn"]');
    await expect(page.locator('[data-testid="training-form"]')).toBeVisible();
    
    // Verify coach can only select their teams
    await page.click('[data-testid="team-select"]');
    const teamOptions = await page.locator('[data-testid="team-select"] option').allTextContents();
    expect(teamOptions.length).toBeGreaterThan(0);
  });

  test('should login as player and access player features', async ({ page }) => {
    const player = testUsers.player;
    
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', player.email);
    await page.fill('[data-testid="password-input"]', player.password);
    await page.click('[data-testid="login-submit"]');
    
    // Verify player dashboard
    await page.waitForURL(`**${player.expectedDashboard}`);
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText(player.name);
    
    // Verify player-specific navigation
    await expect(page.locator('text=My Stats')).toBeVisible();
    await expect(page.locator('text=Trainings')).toBeVisible();
    await expect(page.locator('text=Matches')).toBeVisible();
    await expect(page.locator('text=Development Plans')).toBeVisible();
    
    // Verify player cannot access admin/coach features
    await expect(page.locator('text=My Teams')).not.toBeVisible();
    await expect(page.locator('text=User Management')).not.toBeVisible();
    await expect(page.locator('text=Create Training')).not.toBeVisible();
    
    // Test player-specific features
    await page.click('text=My Stats');
    await expect(page).toHaveURL(/.*\/player\/stats/);
    await expect(page.locator('[data-testid="stats-dashboard"]')).toBeVisible();
    
    // Verify stats components
    await expect(page.locator('[data-testid="training-attendance"]')).toBeVisible();
    await expect(page.locator('[data-testid="match-performance"]')).toBeVisible();
    await expect(page.locator('[data-testid="skill-progress"]')).toBeVisible();
    
    // Test QR code generation for attendance
    await page.click('text=QR Code');
    await expect(page.locator('[data-testid="player-qr-code"]')).toBeVisible();
    await expect(page.locator('[data-testid="qr-instructions"]')).toContainText('Show this QR code');
  });

  test('should login as parent and access parent features', async ({ page }) => {
    const parent = testUsers.parent;
    
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', parent.email);
    await page.fill('[data-testid="password-input"]', parent.password);
    await page.click('[data-testid="login-submit"]');
    
    // Verify parent dashboard
    await page.waitForURL(`**${parent.expectedDashboard}`);
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText(parent.name);
    
    // Verify parent-specific navigation
    await expect(page.locator('text=My Children')).toBeVisible();
    await expect(page.locator('text=Matches')).toBeVisible();
    await expect(page.locator('text=Billing')).toBeVisible();
    await expect(page.locator('text=Communication')).toBeVisible();
    
    // Verify parent cannot access restricted features
    await expect(page.locator('text=Trainings')).not.toBeVisible();
    await expect(page.locator('text=My Teams')).not.toBeVisible();
    await expect(page.locator('text=User Management')).not.toBeVisible();
    
    // Test parent-specific features
    await page.click('text=My Children');
    await expect(page).toHaveURL(/.*\/parent\/children/);
    await expect(page.locator('[data-testid="children-list"]')).toBeVisible();
    
    // Test billing access
    await page.click('text=Billing');
    await expect(page).toHaveURL(/.*\/parent\/billing/);
    await expect(page.locator('[data-testid="payment-history"]')).toBeVisible();
    await expect(page.locator('[data-testid="outstanding-invoices"]')).toBeVisible();
  });

  test('should handle invalid login credentials', async ({ page }) => {
    await page.click('text=Login');
    
    // Test with non-existent user
    await page.fill('[data-testid="email-input"]', 'nonexistent@test.com');
    await page.fill('[data-testid="password-input"]', 'WrongPassword123!');
    await page.click('[data-testid="login-submit"]');
    
    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
    
    // Verify user stays on login page
    await expect(page).toHaveURL(/.*\/login/);
    
    // Test with correct email but wrong password
    await page.fill('[data-testid="email-input"]', testUsers.player.email);
    await page.fill('[data-testid="password-input"]', 'WrongPassword123!');
    await page.click('[data-testid="login-submit"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
  });

  test('should handle login form validation', async ({ page }) => {
    await page.click('text=Login');
    
    // Try to submit empty form
    await page.click('[data-testid="login-submit"]');
    
    // Check validation errors
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required');
    
    // Test invalid email format
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.blur('[data-testid="email-input"]');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email format');
    
    // Test with valid email but no password
    await page.fill('[data-testid="email-input"]', 'valid@email.com');
    await page.click('[data-testid="login-submit"]');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required');
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    const coach = testUsers.coach;
    
    // Login as coach
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', coach.email);
    await page.fill('[data-testid="password-input"]', coach.password);
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL(`**${coach.expectedDashboard}`);
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify user is still logged in
    await expect(page).toHaveURL(`**${coach.expectedDashboard}`);
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText(coach.name);
  });

  test('should logout and clear session', async ({ page }) => {
    const player = testUsers.player;
    
    // Login
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', player.email);
    await page.fill('[data-testid="password-input"]', player.password);
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL(`**${player.expectedDashboard}`);
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');
    
    // Verify logout
    await expect(page).toHaveURL('http://localhost:3000/');
    await expect(page.locator('text=Login')).toBeVisible();
    await expect(page.locator('text=Register')).toBeVisible();
    
    // Verify cannot access protected routes
    await page.goto('http://localhost:3000/player/dashboard');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should handle concurrent logins from different roles', async ({ browser }) => {
    // Create multiple browser contexts for different users
    const adminContext = await browser.newContext();
    const coachContext = await browser.newContext();
    
    const adminPage = await adminContext.newPage();
    const coachPage = await coachContext.newPage();
    
    // Login as admin in first context
    await adminPage.goto('http://localhost:3000');
    await adminPage.click('text=Login');
    await adminPage.fill('[data-testid="email-input"]', testUsers.admin.email);
    await adminPage.fill('[data-testid="password-input"]', testUsers.admin.password);
    await adminPage.click('[data-testid="login-submit"]');
    
    // Login as coach in second context
    await coachPage.goto('http://localhost:3000');
    await coachPage.click('text=Login');
    await coachPage.fill('[data-testid="email-input"]', testUsers.coach.email);
    await coachPage.fill('[data-testid="password-input"]', testUsers.coach.password);
    await coachPage.click('[data-testid="login-submit"]');
    
    // Verify both sessions are independent
    await expect(adminPage.locator('text=User Management')).toBeVisible();
    await expect(coachPage.locator('text=My Teams')).toBeVisible();
    
    // Verify coach cannot access admin features even with concurrent session
    await coachPage.goto('http://localhost:3000/admin/users');
    await expect(coachPage.locator('[data-testid="access-denied"]')).toBeVisible();
    
    await adminContext.close();
    await coachContext.close();
  });

  test('should handle remember me functionality', async ({ page }) => {
    const player = testUsers.player;
    
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', player.email);
    await page.fill('[data-testid="password-input"]', player.password);
    
    // Check remember me option
    await page.check('[data-testid="remember-me"]');
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL(`**${player.expectedDashboard}`);
    
    // Close and reopen browser (simulate browser restart)
    await page.context().close();
    const newContext = await page.context().browser().newContext();
    const newPage = await newContext.newPage();
    
    await newPage.goto('http://localhost:3000');
    
    // Should still be logged in due to remember me
    await expect(newPage).toHaveURL(`**${player.expectedDashboard}`);
    
    await newContext.close();
  });
});