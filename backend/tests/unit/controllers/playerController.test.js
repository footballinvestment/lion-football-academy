const playerController = require('../../../src/controllers/playerController');
const { Player } = require('../../../src/models/Player');
const { User } = require('../../../src/models/User');

// Mock dependencies
jest.mock('../../../src/models/Player');
jest.mock('../../../src/models/User');

describe('PlayerController', () => {
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

  describe('getPlayers', () => {
    it('should return all players for admin/coach', async () => {
      const mockPlayers = [
        testHelpers.createTestPlayer({ id: 1 }),
        testHelpers.createTestPlayer({ id: 2 })
      ];
      
      req.user = testHelpers.createTestUser({ role: 'admin' });
      Player.findAll.mockResolvedValue(mockPlayers);

      await playerController.getPlayers(req, res, next);

      expect(Player.findAll).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        players: mockPlayers
      });
    });

    it('should return filtered players by team', async () => {
      const mockPlayers = [testHelpers.createTestPlayer({ team_id: 1 })];
      
      req.user = testHelpers.createTestUser({ role: 'coach' });
      req.query = { team_id: 1 };
      Player.findByTeam.mockResolvedValue(mockPlayers);

      await playerController.getPlayers(req, res, next);

      expect(Player.findByTeam).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        players: mockPlayers
      });
    });

    it('should deny access for unauthorized roles', async () => {
      req.user = testHelpers.createTestUser({ role: 'parent' });

      await playerController.getPlayers(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied'
      });
    });
  });

  describe('getPlayerById', () => {
    it('should return player by ID', async () => {
      const mockPlayer = testHelpers.createTestPlayer();
      
      req.params = { id: 1 };
      req.user = testHelpers.createTestUser({ role: 'coach' });
      Player.findById.mockResolvedValue(mockPlayer);

      await playerController.getPlayerById(req, res, next);

      expect(Player.findById).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        player: mockPlayer
      });
    });

    it('should return 404 if player not found', async () => {
      req.params = { id: 999 };
      req.user = testHelpers.createTestUser({ role: 'coach' });
      Player.findById.mockResolvedValue(null);

      await playerController.getPlayerById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Player not found'
      });
    });
  });

  describe('createPlayer', () => {
    it('should create player successfully', async () => {
      const mockUser = testHelpers.createTestUser();
      const mockPlayer = testHelpers.createTestPlayer();
      
      req.body = {
        name: 'New Player',
        email: 'player@example.com',
        team_id: 1,
        position: 'forward'
      };
      req.user = testHelpers.createTestUser({ role: 'admin' });

      User.create.mockResolvedValue(mockUser);
      Player.create.mockResolvedValue(mockPlayer);

      await playerController.createPlayer(req, res, next);

      expect(User.create).toHaveBeenCalledWith({
        name: 'New Player',
        email: 'player@example.com',
        role: 'player',
        password: expect.any(String)
      });
      expect(Player.create).toHaveBeenCalledWith({
        user_id: mockUser.id,
        team_id: 1,
        position: 'forward'
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should validate required fields', async () => {
      req.body = {
        name: 'New Player'
        // email missing
      };
      req.user = testHelpers.createTestUser({ role: 'admin' });

      await playerController.createPlayer(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Name and email are required'
      });
    });

    it('should deny access for non-admin users', async () => {
      req.user = testHelpers.createTestUser({ role: 'player' });

      await playerController.createPlayer(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied'
      });
    });
  });

  describe('updatePlayer', () => {
    it('should update player successfully', async () => {
      const mockPlayer = testHelpers.createTestPlayer();
      const updatedPlayer = { ...mockPlayer, position: 'goalkeeper' };
      
      req.params = { id: 1 };
      req.body = { position: 'goalkeeper' };
      req.user = testHelpers.createTestUser({ role: 'admin' });

      Player.findById.mockResolvedValue(mockPlayer);
      Player.update.mockResolvedValue(updatedPlayer);

      await playerController.updatePlayer(req, res, next);

      expect(Player.update).toHaveBeenCalledWith(1, { position: 'goalkeeper' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Player updated successfully',
        player: updatedPlayer
      });
    });
  });

  describe('deletePlayer', () => {
    it('should delete player successfully', async () => {
      const mockPlayer = testHelpers.createTestPlayer();
      
      req.params = { id: 1 };
      req.user = testHelpers.createTestUser({ role: 'admin' });

      Player.findById.mockResolvedValue(mockPlayer);
      Player.delete.mockResolvedValue(true);
      User.delete.mockResolvedValue(true);

      await playerController.deletePlayer(req, res, next);

      expect(Player.delete).toHaveBeenCalledWith(1);
      expect(User.delete).toHaveBeenCalledWith(mockPlayer.user_id);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Player deleted successfully'
      });
    });

    it('should deny access for non-admin users', async () => {
      req.params = { id: 1 };
      req.user = testHelpers.createTestUser({ role: 'coach' });

      await playerController.deletePlayer(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied'
      });
    });
  });

  describe('getPlayerStats', () => {
    it('should return player statistics', async () => {
      const mockStats = {
        trainings_attended: 15,
        matches_played: 8,
        goals_scored: 3,
        assists: 2
      };
      
      req.params = { id: 1 };
      req.user = testHelpers.createTestUser({ role: 'coach' });
      Player.getStats.mockResolvedValue(mockStats);

      await playerController.getPlayerStats(req, res, next);

      expect(Player.getStats).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        stats: mockStats
      });
    });
  });
});