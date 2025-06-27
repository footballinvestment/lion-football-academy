const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthService {
    static getJWTSecret() {
        return process.env.JWT_SECRET || 'your_jwt_secret_key_here';
    }

    static generateToken(user) {
        const payload = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            team_id: user.team_id,
            player_id: user.player_id
        };

        const options = {
            expiresIn: '24h', // Token expires in 24 hours
            issuer: 'football-academy',
            subject: user.id.toString()
        };

        return jwt.sign(payload, this.getJWTSecret(), options);
    }

    static generateRefreshToken(user) {
        const payload = {
            id: user.id,
            type: 'refresh'
        };

        const options = {
            expiresIn: '7d', // Refresh token expires in 7 days
            issuer: 'football-academy',
            subject: user.id.toString()
        };

        return jwt.sign(payload, this.getJWTSecret(), options);
    }

    static verifyToken(token) {
        try {
            const options = {
                issuer: 'football-academy'
            };
            
            return jwt.verify(token, this.getJWTSecret(), options);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token expired');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            } else {
                throw new Error('Token verification failed');
            }
        }
    }

    static async login(username, password) {
        try {
            // Authenticate user
            const user = await User.authenticate(username, password);
            
            if (!user) {
                throw new Error('Invalid username or password');
            }

            if (!user.active) {
                throw new Error('Account is deactivated');
            }

            // Generate tokens
            const accessToken = this.generateToken(user);
            const refreshToken = this.generateRefreshToken(user);

            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                    team_id: user.team_id,
                    player_id: user.player_id,
                    team_name: user.team_name,
                    player_name: user.player_name
                },
                tokens: {
                    accessToken,
                    refreshToken,
                    expiresIn: '24h'
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async register(userData) {
        try {
            const { username, email, password, full_name, role, team_id, player_id } = userData;

            // Check if username already exists
            const existingUser = await User.findByUsername(username);
            if (existingUser) {
                throw new Error('Username already exists');
            }

            // Check if email already exists
            const existingEmail = await User.findByEmail(email);
            if (existingEmail) {
                throw new Error('Email already exists');
            }

            // Validate role
            const validRoles = ['admin', 'coach', 'parent'];
            if (!validRoles.includes(role)) {
                throw new Error('Invalid role');
            }

            // Create user
            const result = await User.create({
                username,
                email,
                password,
                full_name,
                role,
                team_id,
                player_id
            });

            // Get created user
            const user = await User.findById(result.id);
            
            // Generate tokens
            const accessToken = this.generateToken(user);
            const refreshToken = this.generateRefreshToken(user);

            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                    team_id: user.team_id,
                    player_id: user.player_id,
                    team_name: user.team_name,
                    player_name: user.player_name
                },
                tokens: {
                    accessToken,
                    refreshToken,
                    expiresIn: '24h'
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async refreshAccessToken(refreshToken) {
        try {
            const decoded = this.verifyToken(refreshToken);
            
            if (decoded.type !== 'refresh') {
                throw new Error('Invalid refresh token');
            }

            // Get user
            const user = await User.findById(decoded.id);
            if (!user || !user.active) {
                throw new Error('User not found or inactive');
            }

            // Generate new access token
            const newAccessToken = this.generateToken(user);

            return {
                success: true,
                accessToken: newAccessToken,
                expiresIn: '24h'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async changePassword(userId, oldPassword, newPassword) {
        try {
            const user = await User.findByIdWithPassword(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Verify old password
            const isValidOldPassword = await User.verifyPassword(oldPassword, user.password_hash);
            if (!isValidOldPassword) {
                throw new Error('Invalid old password');
            }

            // Update password
            await User.updatePassword(userId, newPassword);

            return {
                success: true,
                message: 'Password updated successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async getUserFromToken(token) {
        try {
            const decoded = this.verifyToken(token);
            const user = await User.findById(decoded.id);
            
            if (!user || !user.active) {
                throw new Error('User not found or inactive');
            }

            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                    team_id: user.team_id,
                    player_id: user.player_id,
                    team_name: user.team_name,
                    player_name: user.player_name
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    static logout() {
        // JWT tokens are stateless, so logout is handled on the client side
        // by removing the token from storage
        return {
            success: true,
            message: 'Logged out successfully'
        };
    }
}

module.exports = AuthService;