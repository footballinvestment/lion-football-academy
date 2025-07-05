require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./src/database/connection');
const { errorHandler } = require('./src/middleware/validation');
const notificationService = require('./src/services/notificationService');
const NotificationPreference = require('./src/models/NotificationPreference');
const { seedAdminUser } = require('./src/database/seedAdmin');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Football Academy API is running!',
        timestamp: new Date().toISOString()
    });
});

// Debug login endpoint
app.post('/api/debug-login', async (req, res) => {
    try {
        console.log('DEBUG: Request body:', req.body);
        const { email, password } = req.body;
        console.log('DEBUG: Extracted email:', email, 'password:', password ? '[PROVIDED]' : '[MISSING]');
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                message: 'Email and password are required'
            });
        }
        
        // Try to find user
        const User = require('./src/models/User');
        console.log('DEBUG: Looking for user with email:', email);
        const user = await User.findByEmail(email.toLowerCase().trim());
        console.log('DEBUG: User found:', user ? 'YES' : 'NO');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Debug successful',
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                is_active: user.is_active
            }
        });
        
    } catch (error) {
        console.error('DEBUG Login error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/profile', require('./src/routes/profile'));
app.use('/api/coaches', require('./src/routes/coaches'));
app.use('/api/parents', require('./src/routes/parents'));
app.use('/api/players', require('./src/routes/players'));
app.use('/api/teams', require('./src/routes/teams'));
app.use('/api/trainings', require('./src/routes/trainings'));
app.use('/api/announcements', require('./src/routes/announcements'));
app.use('/api/statistics', require('./src/routes/statistics'));
app.use('/api/notifications', require('./src/routes/notifications'));
app.use('/api/qr', require('./src/routes/qr'));
app.use('/api/ai', require('./src/routes/ai'));
app.use('/api/injuries', require('./src/routes/injuries'));
app.use('/api/development-plans', require('./src/routes/development-plans'));
app.use('/api/matches', require('./src/routes/matches'));
app.use('/api/billing', require('./src/routes/billing'));

app.get('/api/health', async (req, res) => {
    try {
        const result = await db.query('SELECT 1 as test');
        res.json({ 
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error',
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Global error handler
app.use(errorHandler);

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    
    // Initialize notification services
    try {
        await NotificationPreference.createTable();
        await notificationService.initialize();
        console.log('✅ Email notification system initialized');
    } catch (error) {
        console.error('❌ Failed to initialize notification system:', error);
    }

    // Seed admin user
    try {
        await seedAdminUser();
    } catch (error) {
        console.error('❌ Failed to seed admin user:', error);
    }
});