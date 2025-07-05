const coachController = require('../../../src/controllers/coachController');
const { Training } = require('../../../src/models/Training');
const { Team } = require('../../../src/models/Team');
const { Match } = require('../../../src/models/Match');

// Mock dependencies
jest.mock('../../../src/models/Training');
jest.mock('../../../src/models/Team');
jest.mock('../../../src/models/Match');

describe('CoachController', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      user: null,
      params: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('getTrainings', () => {
    it('should return trainings for coach', async () => {
      const mockTrainings = [
        testHelpers.createTestTraining({ id: 1 }),
        testHelpers.createTestTraining({ id: 2 })
      ];
      
      req.user = testHelpers.createTestUser({ id: 1, role: 'coach' });
      Training.findByCoach.mockResolvedValue(mockTrainings);

      await coachController.getTrainings(req, res, next);

      expect(Training.findByCoach).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        trainings: mockTrainings
      });
    });

    it('should deny access for non-coach users', async () => {
      req.user = testHelpers.createTestUser({ role: 'player' });

      await coachController.getTrainings(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Coach role required.'
      });
    });
  });

  describe('createTraining', () => {
    it('should create training successfully', async () => {
      const mockTraining = testHelpers.createTestTraining();
      
      req.body = {
        title: 'Passing Practice',
        description: 'Focus on short and long passes',
        date: '2024-01-15T10:00:00Z',
        team_id: 1
      };
      req.user = testHelpers.createTestUser({ id: 1, role: 'coach' });

      Training.create.mockResolvedValue(mockTraining);

      await coachController.createTraining(req, res, next);

      expect(Training.create).toHaveBeenCalledWith({
        title: 'Passing Practice',
        description: 'Focus on short and long passes',
        date: '2024-01-15T10:00:00Z',
        team_id: 1,
        coach_id: 1
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Training created successfully',
        training: mockTraining
      });
    });

    it('should validate required fields', async () => {
      req.body = {
        title: 'Passing Practice'
        // date and team_id missing
      };
      req.user = testHelpers.createTestUser({ role: 'coach' });

      await coachController.createTraining(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Title, date, and team_id are required'
      });
    });
  });

  describe('updateTraining', () => {
    it('should update training successfully', async () => {
      const mockTraining = testHelpers.createTestTraining({ coach_id: 1 });
      const updatedTraining = { ...mockTraining, title: 'Updated Training' };
      
      req.params = { id: 1 };
      req.body = { title: 'Updated Training' };
      req.user = testHelpers.createTestUser({ id: 1, role: 'coach' });

      Training.findById.mockResolvedValue(mockTraining);
      Training.update.mockResolvedValue(updatedTraining);

      await coachController.updateTraining(req, res, next);

      expect(Training.update).toHaveBeenCalledWith(1, { title: 'Updated Training' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Training updated successfully',
        training: updatedTraining
      });
    });

    it('should deny access if not training owner', async () => {
      const mockTraining = testHelpers.createTestTraining({ coach_id: 2 });
      
      req.params = { id: 1 };
      req.user = testHelpers.createTestUser({ id: 1, role: 'coach' });

      Training.findById.mockResolvedValue(mockTraining);

      await coachController.updateTraining(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You can only update your own trainings'
      });
    });
  });

  describe('getTeams', () => {
    it('should return teams managed by coach', async () => {
      const mockTeams = [
        testHelpers.createTestTeam({ id: 1, coach_id: 1 }),
        testHelpers.createTestTeam({ id: 2, coach_id: 1 })
      ];
      
      req.user = testHelpers.createTestUser({ id: 1, role: 'coach' });
      Team.findByCoach.mockResolvedValue(mockTeams);

      await coachController.getTeams(req, res, next);

      expect(Team.findByCoach).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        teams: mockTeams
      });
    });
  });

  describe('scheduleMatch', () => {
    it('should schedule match successfully', async () => {
      const mockMatch = testHelpers.createTestMatch();
      
      req.body = {
        home_team_id: 1,
        away_team_id: 2,
        date: '2024-01-20T15:00:00Z',
        venue: 'Home Stadium'
      };
      req.user = testHelpers.createTestUser({ id: 1, role: 'coach' });

      Team.findByCoach.mockResolvedValue([
        testHelpers.createTestTeam({ id: 1, coach_id: 1 })
      ]);
      Match.create.mockResolvedValue(mockMatch);

      await coachController.scheduleMatch(req, res, next);

      expect(Match.create).toHaveBeenCalledWith({
        home_team_id: 1,
        away_team_id: 2,
        date: '2024-01-20T15:00:00Z',
        venue: 'Home Stadium',
        created_by: 1
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should deny scheduling for teams not managed by coach', async () => {
      req.body = {
        home_team_id: 999,
        away_team_id: 2,
        date: '2024-01-20T15:00:00Z'
      };
      req.user = testHelpers.createTestUser({ id: 1, role: 'coach' });

      Team.findByCoach.mockResolvedValue([
        testHelpers.createTestTeam({ id: 1, coach_id: 1 })
      ]);

      await coachController.scheduleMatch(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You can only schedule matches for teams you manage'
      });
    });
  });

  describe('markAttendance', () => {
    it('should mark training attendance successfully', async () => {
      const mockTraining = testHelpers.createTestTraining({ coach_id: 1 });
      
      req.params = { trainingId: 1 };
      req.body = {
        attendances: [
          { player_id: 1, status: 'present' },
          { player_id: 2, status: 'absent' }
        ]
      };
      req.user = testHelpers.createTestUser({ id: 1, role: 'coach' });

      Training.findById.mockResolvedValue(mockTraining);
      Training.markAttendance.mockResolvedValue(true);

      await coachController.markAttendance(req, res, next);

      expect(Training.markAttendance).toHaveBeenCalledWith(1, [
        { player_id: 1, status: 'present' },
        { player_id: 2, status: 'absent' }
      ]);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Attendance marked successfully'
      });
    });

    it('should validate attendance data', async () => {
      req.params = { trainingId: 1 };
      req.body = {}; // attendances missing
      req.user = testHelpers.createTestUser({ role: 'coach' });

      await coachController.markAttendance(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Attendance data is required'
      });
    });
  });
});