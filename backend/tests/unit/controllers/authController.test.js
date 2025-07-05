const authController = require('../../../src/controllers/authController');
const authService = require('../../../src/services/authService');
const { User } = require('../../../src/models/User');

// Mock dependencies
jest.mock('../../../src/services/authService');
jest.mock('../../../src/models/User');

describe('AuthController', () => {
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
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const mockUser = testHelpers.createTestUser();
      const mockToken = 'mock-jwt-token';
      
      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      authService.authenticate.mockResolvedValue({
        user: mockUser,
        token: mockToken
      });

      await authController.login(req, res, next);

      expect(authService.authenticate).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        user: mockUser,
        token: mockToken
      });
    });

    it('should handle invalid credentials', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      authService.authenticate.mockRejectedValue(
        new Error('Invalid credentials')
      );

      await authController.login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials'
      });
    });

    it('should handle missing email or password', async () => {
      req.body = {
        email: 'test@example.com'
        // password missing
      };

      await authController.login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email and password are required'
      });
    });
  });

  describe('register', () => {
    it('should register user successfully', async () => {
      const mockUser = testHelpers.createTestUser();
      const mockToken = 'mock-jwt-token';
      
      req.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'player'
      };

      authService.register.mockResolvedValue({
        user: mockUser,
        token: mockToken
      });

      await authController.register(req, res, next);

      expect(authService.register).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'player'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Registration successful',
        user: mockUser,
        token: mockToken
      });
    });

    it('should handle duplicate email registration', async () => {
      req.body = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'password123',
        role: 'player'
      };

      authService.register.mockRejectedValue(
        new Error('Email already exists')
      );

      await authController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email already exists'
      });
    });

    it('should validate required fields', async () => {
      req.body = {
        name: 'Test User'
        // email, password missing
      };

      await authController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Name, email, and password are required'
      });
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      await authController.logout(req, res, next);

      expect(res.clearCookie).toHaveBeenCalledWith('token');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful'
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser = testHelpers.createTestUser();
      req.user = mockUser;

      User.findById.mockResolvedValue(mockUser);

      await authController.getProfile(req, res, next);

      expect(User.findById).toHaveBeenCalledWith(mockUser.id);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        user: mockUser
      });
    });

    it('should handle user not found', async () => {
      req.user = { id: 999 };

      User.findById.mockResolvedValue(null);

      await authController.getProfile(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const mockUser = testHelpers.createTestUser();
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      
      req.user = mockUser;
      req.body = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      User.findById.mockResolvedValue(mockUser);
      User.update.mockResolvedValue(updatedUser);

      await authController.updateProfile(req, res, next);

      expect(User.update).toHaveBeenCalledWith(mockUser.id, {
        name: 'Updated Name',
        email: 'updated@example.com'
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser
      });
    });
  });
});