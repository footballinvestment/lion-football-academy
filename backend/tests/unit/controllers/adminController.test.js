const adminController = require('../../../src/controllers/adminController');
const { User } = require('../../../src/models/User');
const { Team } = require('../../../src/models/Team');
const { Player } = require('../../../src/models/Player');

// Mock dependencies
jest.mock('../../../src/models/User');
jest.mock('../../../src/models/Team');
jest.mock('../../../src/models/Player');

describe('AdminController', () => {
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

  describe('getAllUsers', () => {
    it('should return all users for admin', async () => {
      const mockUsers = [
        testHelpers.createTestUser({ id: 1, role: 'admin' }),
        testHelpers.createTestUser({ id: 2, role: 'coach' }),
        testHelpers.createTestUser({ id: 3, role: 'player' })
      ];
      
      req.user = testHelpers.createTestUser({ role: 'admin' });
      User.findAll.mockResolvedValue(mockUsers);

      await adminController.getAllUsers(req, res, next);

      expect(User.findAll).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        users: mockUsers
      });
    });

    it('should deny access for non-admin users', async () => {
      req.user = testHelpers.createTestUser({ role: 'coach' });

      await adminController.getAllUsers(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    });

    it('should filter users by role', async () => {
      const mockCoaches = [
        testHelpers.createTestUser({ id: 1, role: 'coach' }),
        testHelpers.createTestUser({ id: 2, role: 'coach' })
      ];
      
      req.user = testHelpers.createTestUser({ role: 'admin' });
      req.query = { role: 'coach' };
      User.findByRole.mockResolvedValue(mockCoaches);

      await adminController.getAllUsers(req, res, next);

      expect(User.findByRole).toHaveBeenCalledWith('coach');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        users: mockCoaches
      });
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const mockUser = testHelpers.createTestUser();
      
      req.body = {
        name: 'New Coach',
        email: 'coach@example.com',
        role: 'coach',
        password: 'password123'
      };
      req.user = testHelpers.createTestUser({ role: 'admin' });

      User.create.mockResolvedValue(mockUser);

      await adminController.createUser(req, res, next);

      expect(User.create).toHaveBeenCalledWith({
        name: 'New Coach',
        email: 'coach@example.com',
        role: 'coach',
        password: 'password123'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User created successfully',
        user: mockUser
      });
    });

    it('should validate required fields', async () => {
      req.body = {
        name: 'New User'
        // email, role missing
      };
      req.user = testHelpers.createTestUser({ role: 'admin' });

      await adminController.createUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Name, email, and role are required'
      });
    });

    it('should validate role values', async () => {
      req.body = {
        name: 'New User',
        email: 'user@example.com',
        role: 'invalid_role'
      };
      req.user = testHelpers.createTestUser({ role: 'admin' });

      await adminController.createUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid role. Must be one of: admin, coach, player, parent'
      });
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const mockUser = testHelpers.createTestUser();
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      
      req.params = { id: 1 };
      req.body = { name: 'Updated Name', role: 'coach' };
      req.user = testHelpers.createTestUser({ role: 'admin' });

      User.findById.mockResolvedValue(mockUser);
      User.update.mockResolvedValue(updatedUser);

      await adminController.updateUser(req, res, next);

      expect(User.update).toHaveBeenCalledWith(1, {
        name: 'Updated Name',
        role: 'coach'
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User updated successfully',
        user: updatedUser
      });
    });

    it('should return 404 if user not found', async () => {
      req.params = { id: 999 };
      req.user = testHelpers.createTestUser({ role: 'admin' });

      User.findById.mockResolvedValue(null);

      await adminController.updateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const mockUser = testHelpers.createTestUser();
      
      req.params = { id: 1 };
      req.user = testHelpers.createTestUser({ role: 'admin' });

      User.findById.mockResolvedValue(mockUser);
      User.delete.mockResolvedValue(true);

      await adminController.deleteUser(req, res, next);

      expect(User.delete).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted successfully'
      });
    });

    it('should prevent admin from deleting themselves', async () => {
      req.params = { id: 1 };
      req.user = testHelpers.createTestUser({ id: 1, role: 'admin' });

      await adminController.deleteUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot delete your own account'
      });
    });
  });

  describe('getSystemStats', () => {
    it('should return system statistics', async () => {
      const mockStats = {
        total_users: 150,
        total_players: 120,
        total_coaches: 15,
        total_teams: 12,
        active_matches: 5
      };
      
      req.user = testHelpers.createTestUser({ role: 'admin' });
      
      User.count.mockResolvedValue(150);
      Player.count.mockResolvedValue(120);
      User.countByRole.mockResolvedValue(15);
      Team.count.mockResolvedValue(12);

      await adminController.getSystemStats(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        stats: expect.objectContaining({
          total_users: 150,
          total_players: 120
        })
      });
    });
  });

  describe('createTeam', () => {
    it('should create team successfully', async () => {
      const mockTeam = testHelpers.createTestTeam();
      
      req.body = {
        name: 'New Team',
        age_group: 'U16',
        coach_id: 1
      };
      req.user = testHelpers.createTestUser({ role: 'admin' });

      Team.create.mockResolvedValue(mockTeam);

      await adminController.createTeam(req, res, next);

      expect(Team.create).toHaveBeenCalledWith({
        name: 'New Team',
        age_group: 'U16',
        coach_id: 1
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Team created successfully',
        team: mockTeam
      });
    });

    it('should validate team data', async () => {
      req.body = {
        name: 'New Team'
        // age_group missing
      };
      req.user = testHelpers.createTestUser({ role: 'admin' });

      await adminController.createTeam(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Team name and age group are required'
      });
    });
  });

  describe('assignPlayerToTeam', () => {
    it('should assign player to team successfully', async () => {
      const mockPlayer = testHelpers.createTestPlayer();
      
      req.body = {
        player_id: 1,
        team_id: 1
      };
      req.user = testHelpers.createTestUser({ role: 'admin' });

      Player.findById.mockResolvedValue(mockPlayer);
      Player.assignToTeam.mockResolvedValue(true);

      await adminController.assignPlayerToTeam(req, res, next);

      expect(Player.assignToTeam).toHaveBeenCalledWith(1, 1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Player assigned to team successfully'
      });
    });
  });
});