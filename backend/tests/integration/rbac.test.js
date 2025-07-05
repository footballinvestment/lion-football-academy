const request = require('supertest');
const app = require('../../server');
const db = require('../../src/database/connection');

describe('Role-Based Access Control Tests', () => {
  let adminToken, coachToken, playerToken, parentToken;
  let adminUser, coachUser, playerUser, parentUser;
  let testTeam, testPlayer;

  beforeAll(async () => {
    // Clear test database
    await db.run('DELETE FROM users');
    await db.run('DELETE FROM players');
    await db.run('DELETE FROM teams');
    await db.run('DELETE FROM trainings');
    await db.run('DELETE FROM matches');

    // Create test users with different roles
    const adminResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin'
      });
    adminToken = adminResponse.body.token;
    adminUser = adminResponse.body.user;

    const coachResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Coach User',
        email: 'coach@example.com',
        password: 'password123',
        role: 'coach'
      });
    coachToken = coachResponse.body.token;
    coachUser = coachResponse.body.user;

    const playerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Player User',
        email: 'player@example.com',
        password: 'password123',
        role: 'player'
      });
    playerToken = playerResponse.body.token;
    playerUser = playerResponse.body.user;

    const parentResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Parent User',
        email: 'parent@example.com',
        password: 'password123',
        role: 'parent'
      });
    parentToken = parentResponse.body.token;
    parentUser = parentResponse.body.user;

    // Create test team
    const teamResponse = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Team',
        age_group: 'U16',
        coach_id: coachUser.id
      });
    testTeam = teamResponse.body.team;

    // Create test player
    const testPlayerResponse = await request(app)
      .post('/api/players')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Player',
        email: 'testplayer@example.com',
        team_id: testTeam.id,
        position: 'forward'
      });
    testPlayer = testPlayerResponse.body.player;
  });

  afterAll(async () => {
    await db.close();
  });

  describe('Admin Role Permissions', () => {
    it('should allow admin to access all user endpoints', async () => {
      // Get all users
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Create user
      await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          role: 'player'
        })
        .expect(201);

      // Update user
      await request(app)
        .put(`/api/admin/users/${playerUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);
    });

    it('should allow admin to manage teams', async () => {
      // Create team
      await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Team',
          age_group: 'U18',
          coach_id: coachUser.id
        })
        .expect(201);

      // Get all teams
      await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should allow admin to access system statistics', async () => {
      await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should allow admin to manage players', async () => {
      // Get all players
      await request(app)
        .get('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Delete player
      await request(app)
        .delete(`/api/players/${testPlayer.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Coach Role Permissions', () => {
    it('should allow coach to manage trainings', async () => {
      // Create training
      const trainingResponse = await request(app)
        .post('/api/trainings')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          title: 'Coach Training',
          date: '2024-01-15T10:00:00Z',
          team_id: testTeam.id
        })
        .expect(201);

      const trainingId = trainingResponse.body.training.id;

      // Update training
      await request(app)
        .put(`/api/trainings/${trainingId}`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send({ title: 'Updated Training' })
        .expect(200);

      // Mark attendance
      await request(app)
        .post(`/api/trainings/${trainingId}/attendance`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          attendances: [
            { player_id: playerUser.id, status: 'present' }
          ]
        })
        .expect(200);
    });

    it('should allow coach to view their teams', async () => {
      await request(app)
        .get('/api/coach/teams')
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);
    });

    it('should allow coach to view team players', async () => {
      await request(app)
        .get('/api/players')
        .set('Authorization', `Bearer ${coachToken}`)
        .query({ team_id: testTeam.id })
        .expect(200);
    });

    it('should deny coach access to admin endpoints', async () => {
      // Try to access admin user management
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(403);

      // Try to create user
      await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          name: 'Unauthorized User',
          email: 'unauthorized@example.com',
          role: 'player'
        })
        .expect(403);

      // Try to delete player
      await request(app)
        .delete(`/api/players/${playerUser.id}`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(403);
    });

    it('should deny coach from updating other coaches trainings', async () => {
      // Create another coach
      const anotherCoachResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another Coach',
          email: 'anothercoach@example.com',
          password: 'password123',
          role: 'coach'
        });

      // Create training as first coach
      const trainingResponse = await request(app)
        .post('/api/trainings')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          title: 'Private Training',
          date: '2024-01-16T10:00:00Z',
          team_id: testTeam.id
        });

      const trainingId = trainingResponse.body.training.id;

      // Try to update as another coach
      await request(app)
        .put(`/api/trainings/${trainingId}`)
        .set('Authorization', `Bearer ${anotherCoachResponse.body.token}`)
        .send({ title: 'Hacked Training' })
        .expect(403);
    });
  });

  describe('Player Role Permissions', () => {
    it('should allow player to view their profile', async () => {
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);
    });

    it('should allow player to update their own profile', async () => {
      await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ name: 'Updated Player Name' })
        .expect(200);
    });

    it('should allow player to view trainings', async () => {
      await request(app)
        .get('/api/trainings')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);
    });

    it('should allow player to view matches', async () => {
      await request(app)
        .get('/api/matches')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);
    });

    it('should deny player access to admin endpoints', async () => {
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(403);

      await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(403);
    });

    it('should deny player from creating trainings', async () => {
      await request(app)
        .post('/api/trainings')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({
          title: 'Player Training',
          date: '2024-01-17T10:00:00Z',
          team_id: testTeam.id
        })
        .expect(403);
    });

    it('should deny player from managing other players', async () => {
      // Try to get all players
      await request(app)
        .get('/api/players')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(403);

      // Try to create player
      await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({
          name: 'Unauthorized Player',
          email: 'unauthorized@example.com'
        })
        .expect(403);
    });
  });

  describe('Parent Role Permissions', () => {
    it('should allow parent to view their profile', async () => {
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
    });

    it('should allow parent to view matches', async () => {
      await request(app)
        .get('/api/matches')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
    });

    it('should allow parent to access billing', async () => {
      await request(app)
        .get('/api/billing')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
    });

    it('should deny parent access to admin endpoints', async () => {
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(403);

      await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(403);
    });

    it('should deny parent from creating trainings', async () => {
      await request(app)
        .post('/api/trainings')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          title: 'Parent Training',
          date: '2024-01-18T10:00:00Z',
          team_id: testTeam.id
        })
        .expect(403);
    });

    it('should deny parent from managing players', async () => {
      await request(app)
        .get('/api/players')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(403);

      await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          name: 'Unauthorized Player',
          email: 'unauthorized@example.com'
        })
        .expect(403);
    });
  });

  describe('Cross-Role Resource Access', () => {
    it('should prevent users from accessing other users profiles', async () => {
      // Player trying to access coach profile
      await request(app)
        .get(`/api/users/${coachUser.id}`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(403);

      // Coach trying to access admin profile
      await request(app)
        .get(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(403);
    });

    it('should allow users to access their own resources', async () => {
      // Player accessing their own profile
      await request(app)
        .get(`/api/users/${playerUser.id}`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);

      // Coach accessing their own profile
      await request(app)
        .get(`/api/users/${coachUser.id}`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);
    });

    it('should allow admin to access any user resource', async () => {
      // Admin accessing player profile
      await request(app)
        .get(`/api/users/${playerUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Admin accessing coach profile
      await request(app)
        .get(`/api/users/${coachUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Unauthenticated Access', () => {
    it('should deny access to protected endpoints without token', async () => {
      await request(app)
        .get('/api/auth/profile')
        .expect(401);

      await request(app)
        .get('/api/players')
        .expect(401);

      await request(app)
        .post('/api/trainings')
        .send({
          title: 'Unauthorized Training',
          date: '2024-01-19T10:00:00Z',
          team_id: testTeam.id
        })
        .expect(401);
    });

    it('should allow access to public endpoints', async () => {
      // Login endpoint should be accessible
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401); // 401 for wrong credentials, not 403 for access denied

      // Registration endpoint should be accessible
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Public User',
          email: 'public@example.com',
          password: 'password123',
          role: 'player'
        })
        .expect(201);
    });
  });
});