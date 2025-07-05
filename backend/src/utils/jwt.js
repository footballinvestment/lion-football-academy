const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class JWTUtils {
    constructor() {
        this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'your-access-token-secret-key-change-in-production';
        this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret-key-change-in-production';
        this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
        this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
    }

    // Generate access token
    generateAccessToken(payload) {
        try {
            return jwt.sign(
                {
                    userId: payload.userId,
                    email: payload.email,
                    role: payload.role,
                    first_name: payload.first_name,
                    last_name: payload.last_name,
                    type: 'access'
                },
                this.accessTokenSecret,
                {
                    expiresIn: this.accessTokenExpiry,
                    issuer: 'lfa-backend',
                    audience: 'lfa-app'
                }
            );
        } catch (error) {
            console.error('Error generating access token:', error);
            throw new Error('Token generation failed');
        }
    }

    // Generate refresh token
    generateRefreshToken(payload) {
        try {
            const jti = crypto.randomBytes(16).toString('hex'); // Unique token ID for revocation
            
            return jwt.sign(
                {
                    userId: payload.userId,
                    email: payload.email,
                    role: payload.role,
                    type: 'refresh',
                    jti: jti
                },
                this.refreshTokenSecret,
                {
                    expiresIn: this.refreshTokenExpiry,
                    issuer: 'lfa-backend',
                    audience: 'lfa-app'
                }
            );
        } catch (error) {
            console.error('Error generating refresh token:', error);
            throw new Error('Refresh token generation failed');
        }
    }

    // Generate both tokens
    generateTokenPair(payload) {
        return {
            accessToken: this.generateAccessToken(payload),
            refreshToken: this.generateRefreshToken(payload)
        };
    }

    // Verify access token
    verifyAccessToken(token) {
        try {
            const decoded = jwt.verify(token, this.accessTokenSecret, {
                issuer: 'lfa-backend',
                audience: 'lfa-app'
            });

            if (decoded.type !== 'access') {
                throw new Error('Invalid token type');
            }

            return {
                valid: true,
                payload: decoded,
                error: null
            };
        } catch (error) {
            return {
                valid: false,
                payload: null,
                error: error.message
            };
        }
    }

    // Verify refresh token
    verifyRefreshToken(token) {
        try {
            const decoded = jwt.verify(token, this.refreshTokenSecret, {
                issuer: 'lfa-backend',
                audience: 'lfa-app'
            });

            if (decoded.type !== 'refresh') {
                throw new Error('Invalid token type');
            }

            return {
                valid: true,
                payload: decoded,
                error: null
            };
        } catch (error) {
            return {
                valid: false,
                payload: null,
                error: error.message
            };
        }
    }

    // Extract token from Authorization header
    extractTokenFromHeader(authHeader) {
        if (!authHeader) {
            return null;
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }

        return parts[1];
    }

    // Get token expiration time
    getTokenExpiration(token) {
        try {
            const decoded = jwt.decode(token);
            return decoded ? new Date(decoded.exp * 1000) : null;
        } catch (error) {
            return null;
        }
    }

    // Check if token is about to expire (within 5 minutes)
    isTokenExpiringSoon(token, bufferMinutes = 5) {
        try {
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.exp) {
                return true;
            }

            const now = Math.floor(Date.now() / 1000);
            const bufferSeconds = bufferMinutes * 60;
            
            return (decoded.exp - now) <= bufferSeconds;
        } catch (error) {
            return true;
        }
    }

    // Decode token without verification (for debugging)
    decodeToken(token) {
        try {
            return jwt.decode(token, { complete: true });
        } catch (error) {
            return null;
        }
    }

    // Generate secure random token for email verification, password reset, etc.
    generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    // Hash token for secure storage
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    // Create session payload from user data
    createSessionPayload(user) {
        return {
            userId: user.id,
            email: user.email,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            is_active: user.is_active,
            email_verified: user.email_verified
        };
    }

    // Validate token structure
    validateTokenStructure(token) {
        if (!token || typeof token !== 'string') {
            return false;
        }

        // JWT tokens have 3 parts separated by dots
        const parts = token.split('.');
        if (parts.length !== 3) {
            return false;
        }

        // Each part should be base64 encoded
        try {
            parts.forEach(part => {
                Buffer.from(part, 'base64');
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    // Get remaining token time in seconds
    getTokenRemainingTime(token) {
        try {
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.exp) {
                return 0;
            }

            const now = Math.floor(Date.now() / 1000);
            const remaining = decoded.exp - now;
            
            return Math.max(0, remaining);
        } catch (error) {
            return 0;
        }
    }

    // Create login response with tokens and user info
    createLoginResponse(user, tokens) {
        return {
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                is_active: user.is_active,
                email_verified: user.email_verified
            },
            tokens: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresIn: this.getTokenRemainingTime(tokens.accessToken)
            }
        };
    }

    // Validate role permissions
    validateRolePermissions(userRole, requiredRoles) {
        if (!userRole || !requiredRoles) {
            return false;
        }

        if (Array.isArray(requiredRoles)) {
            return requiredRoles.includes(userRole);
        }

        return userRole === requiredRoles;
    }

    // Role hierarchy for permission checking
    getRoleHierarchy() {
        return {
            'admin': 4,
            'coach': 3,
            'player': 2,
            'parent': 1
        };
    }

    // Check if user role has sufficient permissions
    hasRolePermission(userRole, requiredRole) {
        const hierarchy = this.getRoleHierarchy();
        const userLevel = hierarchy[userRole] || 0;
        const requiredLevel = hierarchy[requiredRole] || 0;
        
        return userLevel >= requiredLevel;
    }
}

// Create singleton instance
const jwtUtils = new JWTUtils();

module.exports = jwtUtils;