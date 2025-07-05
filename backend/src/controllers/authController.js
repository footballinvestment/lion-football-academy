const bcrypt = require('bcryptjs');
const jwtUtils = require('../utils/jwt');
const User = require('../models/User');
const { blacklistToken } = require('../middleware/auth');

class AuthController {
    // User login
    static async login(req, res) {
        try {
            console.log('🔧 Backend Login Debug - req.body:', req.body);
            const { email, password } = req.body;

            // Input validation
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: 'Email and password are required'
                });
            }

            // Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: 'Invalid email format'
                });
            }

            // Find user by email
            const user = await User.findByEmail(email.toLowerCase().trim());
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication failed',
                    message: 'Invalid email or password'
                });
            }

            // Check if user is active
            if (!user.is_active) {
                return res.status(401).json({
                    success: false,
                    error: 'Account disabled',
                    message: 'Your account has been deactivated. Please contact an administrator.'
                });
            }

            // Verify password
            const isPasswordValid = await user.verifyPassword(password);
            
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication failed',
                    message: 'Invalid email or password'
                });
            }

            // Update last login
            await user.updateLastLogin();

            // Create session payload
            const sessionPayload = jwtUtils.createSessionPayload(user);
            
            // Generate token pair
            const tokens = jwtUtils.generateTokenPair(sessionPayload);

            // Create login response
            const response = jwtUtils.createLoginResponse(user, tokens);

            // Set refresh token as httpOnly cookie
            res.cookie('refreshToken', tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.status(200).json(response);

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Login failed due to server error'
            });
        }
    }

    // User logout
    static async logout(req, res) {
        try {
            const token = req.token;
            const refreshToken = req.cookies.refreshToken;

            // Add access token to blacklist
            if (token) {
                blacklistToken(token);
            }

            // Add refresh token to blacklist if provided
            if (refreshToken) {
                blacklistToken(refreshToken);
            }

            // Clear refresh token cookie
            res.clearCookie('refreshToken');

            res.status(200).json({
                success: true,
                message: 'Logged out successfully'
            });

        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Logout failed'
            });
        }
    }

    // Refresh access token
    static async refreshToken(req, res) {
        try {
            let refreshToken = req.body.refreshToken || req.cookies.refreshToken;

            if (!refreshToken) {
                return res.status(401).json({
                    success: false,
                    error: 'Refresh token required',
                    message: 'No refresh token provided'
                });
            }

            // Verify refresh token
            const verification = jwtUtils.verifyRefreshToken(refreshToken);
            
            if (!verification.valid) {
                // Clear invalid refresh token cookie
                res.clearCookie('refreshToken');
                
                return res.status(401).json({
                    success: false,
                    error: 'Invalid refresh token',
                    message: verification.error
                });
            }

            // Get user from database
            const user = await User.findById(verification.payload.userId);
            
            if (!user || !user.is_active) {
                // Clear refresh token cookie
                res.clearCookie('refreshToken');
                
                return res.status(401).json({
                    success: false,
                    error: 'User not found or inactive',
                    message: 'User account is no longer valid'
                });
            }

            // Create new session payload
            const sessionPayload = jwtUtils.createSessionPayload(user);
            
            // Generate new token pair (refresh token rotation)
            const newTokens = jwtUtils.generateTokenPair(sessionPayload);

            // Blacklist old refresh token
            blacklistToken(refreshToken);

            // Set new refresh token as cookie
            res.cookie('refreshToken', newTokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.status(200).json({
                success: true,
                message: 'Token refreshed successfully',
                tokens: {
                    accessToken: newTokens.accessToken,
                    expiresIn: jwtUtils.getTokenRemainingTime(newTokens.accessToken)
                }
            });

        } catch (error) {
            console.error('Token refresh error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Token refresh failed'
            });
        }
    }

    // Verify token
    static async verifyToken(req, res) {
        try {
            // If we reach here, the authenticate middleware has already verified the token
            const user = req.user;
            const tokenPayload = req.tokenPayload;

            res.status(200).json({
                success: true,
                message: 'Token is valid',
                user: {
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    role: user.role,
                    is_active: user.is_active,
                    email_verified: user.email_verified
                },
                tokenInfo: {
                    issuedAt: new Date(tokenPayload.iat * 1000),
                    expiresAt: new Date(tokenPayload.exp * 1000),
                    remainingTime: jwtUtils.getTokenRemainingTime(req.token)
                }
            });

        } catch (error) {
            console.error('Token verification error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Token verification failed'
            });
        }
    }

    // Get user profile
    static async getProfile(req, res) {
        try {
            const user = req.user;

            // Get additional profile information based on role
            let profileData = {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                phone: user.phone,
                role: user.role,
                is_active: user.is_active,
                email_verified: user.email_verified,
                created_at: user.created_at,
                last_login: user.last_login
            };

            // Add role-specific data
            if (user.role === 'player') {
                const database = require('../database/database');
                const playerData = await database.get(`
                    SELECT p.*, t.name as team_name 
                    FROM players p 
                    LEFT JOIN teams t ON p.team_id = t.id 
                    WHERE p.user_id = ?
                `, [user.id]);
                
                if (playerData) {
                    profileData.player = {
                        id: playerData.id,
                        team_id: playerData.team_id,
                        team_name: playerData.team_name,
                        jersey_number: playerData.jersey_number,
                        position: playerData.position,
                        date_of_birth: playerData.date_of_birth,
                        height: playerData.height,
                        weight: playerData.weight,
                        preferred_foot: playerData.preferred_foot,
                        join_date: playerData.join_date
                    };
                }
            } else if (user.role === 'coach') {
                const database = require('../database/database');
                const coachData = await database.get(`
                    SELECT c.*, t.name as team_name 
                    FROM coaches c 
                    LEFT JOIN teams t ON c.team_id = t.id 
                    WHERE c.user_id = ?
                `, [user.id]);
                
                if (coachData) {
                    profileData.coach = {
                        id: coachData.id,
                        team_id: coachData.team_id,
                        team_name: coachData.team_name,
                        certification_level: coachData.certification_level,
                        experience_years: coachData.experience_years,
                        specialization: coachData.specialization,
                        is_head_coach: coachData.is_head_coach,
                        hire_date: coachData.hire_date
                    };
                }
            } else if (user.role === 'parent') {
                const database = require('../database/database');
                const children = await database.all(`
                    SELECT p.id, p.user_id, u.first_name, u.last_name, t.name as team_name, fr.relationship_type
                    FROM family_relationships fr
                    JOIN players p ON fr.player_id = p.id
                    JOIN users u ON p.user_id = u.id
                    LEFT JOIN teams t ON p.team_id = t.id
                    WHERE fr.parent_id = ?
                `, [user.id]);
                
                profileData.children = children.map(child => ({
                    id: child.id,
                    user_id: child.user_id,
                    first_name: child.first_name,
                    last_name: child.last_name,
                    team_name: child.team_name,
                    relationship_type: child.relationship_type
                }));
            }

            res.status(200).json({
                success: true,
                message: 'Profile retrieved successfully',
                profile: profileData
            });

        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to retrieve profile'
            });
        }
    }

    // Change password
    static async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            const user = req.user;

            // Input validation
            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: 'Current password and new password are required'
                });
            }

            // Password strength validation
            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: 'New password must be at least 6 characters long'
                });
            }

            // Verify current password
            const isCurrentPasswordValid = await user.verifyPassword(currentPassword);
            
            if (!isCurrentPasswordValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Authentication failed',
                    message: 'Current password is incorrect'
                });
            }

            // Check if new password is different from current
            const isSamePassword = await user.verifyPassword(newPassword);
            if (isSamePassword) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: 'New password must be different from current password'
                });
            }

            // Update password
            await user.setPassword(newPassword);

            res.status(200).json({
                success: true,
                message: 'Password changed successfully'
            });

        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to change password'
            });
        }
    }

    // Get current user's permissions
    static async getPermissions(req, res) {
        try {
            const user = req.user;
            
            const permissions = {
                role: user.role,
                canManageUsers: user.role === 'admin',
                canManageTeams: ['admin', 'coach'].includes(user.role),
                canViewAllPlayers: ['admin', 'coach'].includes(user.role),
                canManageTrainings: ['admin', 'coach'].includes(user.role),
                canViewMatches: true,
                canManageMatches: ['admin', 'coach'].includes(user.role),
                canViewAnnouncements: true,
                canCreateAnnouncements: ['admin', 'coach'].includes(user.role),
                canViewBilling: ['admin', 'parent'].includes(user.role),
                canManageBilling: user.role === 'admin'
            };

            res.status(200).json({
                success: true,
                message: 'Permissions retrieved successfully',
                permissions
            });

        } catch (error) {
            console.error('Get permissions error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to retrieve permissions'
            });
        }
    }

    // Check if email is available
    static async checkEmailAvailability(req, res) {
        try {
            const { email } = req.query;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: 'Email parameter is required'
                });
            }

            // Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: 'Invalid email format'
                });
            }

            const existingUser = await User.findByEmail(email.toLowerCase().trim());
            
            res.status(200).json({
                success: true,
                available: !existingUser,
                message: existingUser ? 'Email is already taken' : 'Email is available'
            });

        } catch (error) {
            console.error('Check email availability error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to check email availability'
            });
        }
    }
}

module.exports = AuthController;