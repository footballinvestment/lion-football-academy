const request = require('supertest');
const app = require('../../server');
const db = require('../../src/database/connection');

describe('Trainings API Integration Tests', () => {
  let adminToken, coachToken, playerToken;
  let adminUser, coachUser, playerUser;
  let testTeam;

  beforeEach(async () => {
    // Clear test database
    await db.run('DELETE FROM users');
    await db.run('DELETE FROM trainings');
    await db.run('DELETE FROM teams');
    await db.run('DELETE FROM attendance');

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

  describe('POST /api/trainings', () => {
    it('should create training successfully as coach', async () => {
      const trainingData = {
        title: 'Passing Practice',
        description: 'Focus on short and long passes',
        date: '2024-01-15T10:00:00Z',
        team_id: testTeam.id,
        duration: 90
      };

      const response = await request(app)
        .post('/api/trainings')
        .set('Authorization', `Bearer ${coachToken}`)
        .send(trainingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Training created successfully');
      expect(response.body.training).toHaveProperty('id');
      expect(response.body.training.title).toBe(trainingData.title);
      expect(response.body.training.coach_id).toBe(coachUser.id);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/trainings')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          title: 'Passing Practice'
          // date and team_id missing
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Title, date, and team_id are required');
    });

    it('should deny access for non-coach users', async () => {
      const response = await request(app)
        .post('/api/trainings')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({
          title: 'Training',
          date: '2024-01-15T10:00:00Z',
          team_id: testTeam.id
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Coach role required.');
    });

    it('should validate date format', async () => {
      const response = await request(app)
        .post('/api/trainings')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          title: 'Training',
          date: 'invalid-date',
          team_id: testTeam.id
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid date format');
    });
  });

  describe('GET /api/trainings', () => {
    beforeEach(async () => {
      // Create test trainings
      await request(app)
        .post('/api/trainings')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          title: 'Training 1',
          date: '2024-01-15T10:00:00Z',
          team_id: testTeam.id
        });

      await request(app)
        .post('/api/trainings')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          title: 'Training 2',
          date: '2024-01-16T10:00:00Z',
          team_id: testTeam.id
        });
    });

    it('should return trainings for coach', async () => {
      const response = await request(app)
        .get('/api/trainings')
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.trainings).toHaveLength(2);
      expect(response.body.trainings[0]).toHaveProperty('id');
      expect(response.body.trainings[0]).toHaveProperty('title');
    });

    it('should return trainings for admin', async () => {
      const response = await request(app)
        .get('/api/trainings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.trainings).toHaveLength(2);
    });

    it('should filter trainings by team', async () => {
      const response = await request(app)
        .get('/api/trainings')
        .set('Authorization', `Bearer ${coachToken}`)
        .query({ team_id: testTeam.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.trainings).toHaveLength(2);
    });

    it('should filter trainings by date range', async () => {
      const response = await request(app)
        .get('/api/trainings')
        .set('Authorization', `Bearer ${coachToken}`)
        .query({
          start_date: '2024-01-15',
          end_date: '2024-01-15'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.trainings).toHaveLength(1);
      expect(response.body.trainings[0].title).toBe('Training 1');
    });
  });

  describe('GET /api/trainings/:id', () => {
    let testTraining;

    beforeEach(async () => {
      const trainingResponse = await request(app)
        .post('/api/trainings')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          title: 'Test Training',
          description: 'Training description',
          date: '2024-01-15T10:00:00Z',
          team_id: testTeam.id
        });
      testTraining = trainingResponse.body.training;
    });

    it('should return training by ID', async () => {
      const response = await request(app)
        .get(`/api/trainings/${testTraining.id}`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.training.id).toBe(testTraining.id);
      expect(response.body.training.title).toBe('Test Training');
    });

    it('should return 404 for non-existent training', async () => {
      const response = await request(app)
        .get('/api/trainings/999')
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Training not found');
    });
  });

  describe('PUT /api/trainings/:id', () => {
    let testTraining;

    beforeEach(async () => {
      const trainingResponse = await request(app)
        .post('/api/trainings')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          title: 'Test Training',
          date: '2024-01-15T10:00:00Z',
          team_id: testTeam.id
        });
      testTraining = trainingResponse.body.training;
    });

    it('should update training successfully by owner', async () => {
      const updateData = {
        title: 'Updated Training',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/trainings/${testTraining.id}`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Training updated successfully');
      expect(response.body.training.title).toBe(updateData.title);
    });

    it('should allow admin to update any training', async () => {
      const updateData = {
        title: 'Admin Updated Training'
      };

      const response = await request(app)
        .put(`/api/trainings/${testTraining.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.training.title).toBe(updateData.title);
    });

    it('should deny updating training by non-owner', async () => {
      // Create another coach
      const anotherCoachResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another Coach',
          email: 'anothercoach@example.com',
          password: 'password123',
          role: 'coach'
        });

      const response = await request(app)
        .put(`/api/trainings/${testTraining.id}`)
        .set('Authorization', `Bearer ${anotherCoachResponse.body.token}`)
        .send({ title: 'Unauthorized Update' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You can only update your own trainings');
    });
  });

  describe('DELETE /api/trainings/:id', () => {
    let testTraining;

    beforeEach(async () => {
      const trainingResponse = await request(app)
        .post('/api/trainings')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          title: 'Test Training',
          date: '2024-01-15T10:00:00Z',
          team_id: testTeam.id
        });
      testTraining = trainingResponse.body.training;
    });

    it('should delete training successfully by owner', async () => {
      const response = await request(app)
        .delete(`/api/trainings/${testTraining.id}`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Training deleted successfully');

      // Verify training is deleted
      await request(app)
        .get(`/api/trainings/${testTraining.id}`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(404);
    });

    it('should allow admin to delete any training', async () => {
      const response = await request(app)
        .delete(`/api/trainings/${testTraining.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny deletion by non-owner', async () => {
      const response = await request(app)
        .delete(`/api/trainings/${testTraining.id}`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/trainings/:id/attendance', () => {
    let testTraining, testPlayer;

    beforeEach(async () => {
      const trainingResponse = await request(app)
        .post('/api/trainings')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          title: 'Test Training',
          date: '2024-01-15T10:00:00Z',
          team_id: testTeam.id
        });
      testTraining = trainingResponse.body.training;

      // Create test player
      const playerResponse = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Player',
          email: 'testplayer@example.com',
          team_id: testTeam.id
        });
      testPlayer = playerResponse.body.player;
    });

    it('should mark attendance successfully', async () => {
      const attendanceData = {
        attendances: [
          { player_id: testPlayer.id, status: 'present' }
        ]
      };

      const response = await request(app)
        .post(`/api/trainings/${testTraining.id}/attendance`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send(attendanceData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Attendance marked successfully');
    });

    it('should validate attendance data', async () => {
      const response = await request(app)
        .post(`/api/trainings/${testTraining.id}/attendance`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Attendance data is required');
    });

    it('should deny access for non-coach users', async () => {
      const response = await request(app)
        .post(`/api/trainings/${testTraining.id}/attendance`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send({
          attendances: [{ player_id: testPlayer.id, status: 'present' }]
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});