const request = require('supertest');
const app = require('../../server');
const db = require('../../src/database/connection');

describe('Players API Integration Tests', () => {
  let adminToken, coachToken, playerToken;
  let adminUser, coachUser, playerUser;
  let testTeam;

  beforeEach(async () => {
    // Clear test database
    await db.run('DELETE FROM users');
    await db.run('DELETE FROM players');
    await db.run('DELETE FROM teams');
    await db.run('DELETE FROM coaches');

    // Create test users
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
  });

  afterAll(async () => {
    await db.close();
  });

  describe('GET /api/players', () => {
    beforeEach(async () => {
      // Create test players
      await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Player 1',
          email: 'testplayer1@example.com',
          team_id: testTeam.id,
          position: 'forward'
        });

      await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Player 2',
          email: 'testplayer2@example.com',
          team_id: testTeam.id,
          position: 'midfielder'
        });
    });

    it('should return all players for admin', async () => {
      const response = await request(app)
        .get('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.players).toHaveLength(3); // 2 created + 1 from user registration
    });

    it('should return team players for coach', async () => {
      const response = await request(app)
        .get('/api/players')
        .set('Authorization', `Bearer ${coachToken}`)
        .query({ team_id: testTeam.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.players).toHaveLength(2);
    });

    it('should deny access for unauthorized roles', async () => {
      const response = await request(app)
        .get('/api/players')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/players')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No token provided');
    });
  });

  describe('POST /api/players', () => {
    it('should create player successfully as admin', async () => {
      const playerData = {
        name: 'New Player',
        email: 'newplayer@example.com',
        team_id: testTeam.id,
        position: 'goalkeeper'
      };

      const response = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(playerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Player created successfully');
      expect(response.body.player).toHaveProperty('id');
      expect(response.body.player.position).toBe(playerData.position);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Player'
          // email missing
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Name and email are required');
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          name: 'New Player',
          email: 'newplayer@example.com'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied');
    });
  });

  describe('GET /api/players/:id', () => {
    let testPlayer;

    beforeEach(async () => {
      const playerResponse = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Player',
          email: 'testplayer@example.com',
          team_id: testTeam.id,
          position: 'defender'
        });
      testPlayer = playerResponse.body.player;
    });

    it('should return player by ID', async () => {
      const response = await request(app)
        .get(`/api/players/${testPlayer.id}`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.player.id).toBe(testPlayer.id);
      expect(response.body.player.position).toBe('defender');
    });

    it('should return 404 for non-existent player', async () => {
      const response = await request(app)
        .get('/api/players/999')
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Player not found');
    });
  });

  describe('PUT /api/players/:id', () => {
    let testPlayer;

    beforeEach(async () => {
      const playerResponse = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Player',
          email: 'testplayer@example.com',
          team_id: testTeam.id,
          position: 'defender'
        });
      testPlayer = playerResponse.body.player;
    });

    it('should update player successfully', async () => {
      const updateData = {
        position: 'midfielder',
        jersey_number: 10
      };

      const response = await request(app)
        .put(`/api/players/${testPlayer.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Player updated successfully');
      expect(response.body.player.position).toBe(updateData.position);
    });

    it('should allow coach to update their team players', async () => {
      const updateData = {
        position: 'midfielder'
      };

      const response = await request(app)
        .put(`/api/players/${testPlayer.id}`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny player from updating others', async () => {
      const response = await request(app)
        .put(`/api/players/${testPlayer.id}`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ position: 'forward' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/players/:id', () => {
    let testPlayer;

    beforeEach(async () => {
      const playerResponse = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Player',
          email: 'testplayer@example.com',
          team_id: testTeam.id,
          position: 'defender'
        });
      testPlayer = playerResponse.body.player;
    });

    it('should delete player successfully as admin', async () => {
      const response = await request(app)
        .delete(`/api/players/${testPlayer.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Player deleted successfully');

      // Verify player is deleted
      await request(app)
        .get(`/api/players/${testPlayer.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should deny deletion for non-admin users', async () => {
      const response = await request(app)
        .delete(`/api/players/${testPlayer.id}`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied');
    });
  });

  describe('GET /api/players/:id/stats', () => {
    let testPlayer;

    beforeEach(async () => {
      const playerResponse = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Player',
          email: 'testplayer@example.com',
          team_id: testTeam.id,
          position: 'forward'
        });
      testPlayer = playerResponse.body.player;
    });

    it('should return player statistics', async () => {
      const response = await request(app)
        .get(`/api/players/${testPlayer.id}/stats`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toHaveProperty('trainings_attended');
      expect(response.body.stats).toHaveProperty('matches_played');
      expect(response.body.stats).toHaveProperty('goals_scored');
    });
  });
});