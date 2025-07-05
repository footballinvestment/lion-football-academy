const authMiddleware = require('../../../src/middleware/auth');
const jwt = require('jsonwebtoken');
const { User } = require('../../../src/models/User');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../../src/models/User');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', async () => {
      const mockUser = testHelpers.createTestUser();
      const mockToken = 'valid-jwt-token';
      
      req.headers.authorization = `Bearer ${mockToken}`;
      
      jwt.verify.mockReturnValue({ userId: mockUser.id });
      User.findById.mockResolvedValue(mockUser);

      await authMiddleware.authenticateToken(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, process.env.JWT_SECRET);
      expect(User.findById).toHaveBeenCalledWith(mockUser.id);
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No token provided'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject token with non-existent user', async () => {
      const mockToken = 'valid-jwt-token';
      
      req.headers.authorization = `Bearer ${mockToken}`;
      
      jwt.verify.mockReturnValue({ userId: 999 });
      User.findById.mockResolvedValue(null);

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle expired token', async () => {
      req.headers.authorization = 'Bearer expired-token';
      
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token expired'
      });
    });
  });

  describe('requireRole', () => {
    it('should allow access for correct role', async () => {
      req.user = testHelpers.createTestUser({ role: 'admin' });
      
      const middleware = authMiddleware.requireRole(['admin']);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow access for multiple allowed roles', async () => {
      req.user = testHelpers.createTestUser({ role: 'coach' });
      
      const middleware = authMiddleware.requireRole(['admin', 'coach']);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for incorrect role', async () => {
      req.user = testHelpers.createTestUser({ role: 'player' });
      
      const middleware = authMiddleware.requireRole(['admin']);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Required role: admin'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access when no user is set', async () => {
      req.user = null;
      
      const middleware = authMiddleware.requireRole(['admin']);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow access for admin users', async () => {
      req.user = testHelpers.createTestUser({ role: 'admin' });
      
      await authMiddleware.requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for non-admin users', async () => {
      req.user = testHelpers.createTestUser({ role: 'coach' });
      
      await authMiddleware.requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Admin role required.'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireCoach', () => {
    it('should allow access for coach users', async () => {
      req.user = testHelpers.createTestUser({ role: 'coach' });
      
      await authMiddleware.requireCoach(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow access for admin users', async () => {
      req.user = testHelpers.createTestUser({ role: 'admin' });
      
      await authMiddleware.requireCoach(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for player users', async () => {
      req.user = testHelpers.createTestUser({ role: 'player' });
      
      await authMiddleware.requireCoach(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Coach role required.'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should set user if valid token provided', async () => {
      const mockUser = testHelpers.createTestUser();
      const mockToken = 'valid-jwt-token';
      
      req.headers.authorization = `Bearer ${mockToken}`;
      
      jwt.verify.mockReturnValue({ userId: mockUser.id });
      User.findById.mockResolvedValue(mockUser);

      await authMiddleware.optionalAuth(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it('should continue without user if no token provided', async () => {
      await authMiddleware.optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('should continue without user if invalid token provided', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authMiddleware.optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('checkOwnership', () => {
    it('should allow access for resource owner', async () => {
      req.user = testHelpers.createTestUser({ id: 1 });
      req.params = { userId: '1' };
      
      const middleware = authMiddleware.checkOwnership('userId');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow access for admin', async () => {
      req.user = testHelpers.createTestUser({ id: 2, role: 'admin' });
      req.params = { userId: '1' };
      
      const middleware = authMiddleware.checkOwnership('userId');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for non-owner', async () => {
      req.user = testHelpers.createTestUser({ id: 2, role: 'player' });
      req.params = { userId: '1' };
      
      const middleware = authMiddleware.checkOwnership('userId');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('rateLimiter', () => {
    it('should allow requests within limit', async () => {
      req.ip = '127.0.0.1';
      
      const middleware = authMiddleware.rateLimiter({ maxRequests: 5, windowMs: 60000 });
      
      // Make 3 requests
      await middleware(req, res, next);
      await middleware(req, res, next);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(3);
    });

    it('should block requests exceeding limit', async () => {
      req.ip = '127.0.0.1';
      
      const middleware = authMiddleware.rateLimiter({ maxRequests: 2, windowMs: 60000 });
      
      // Make 3 requests (should block the 3rd)
      await middleware(req, res, next);
      await middleware(req, res, next);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Too many requests. Please try again later.'
      });
    });
  });
});