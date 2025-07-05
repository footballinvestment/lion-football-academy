-- Lion Football Academy - Production Seed Data
-- Seed: 001_production_seed.sql
-- Created: 2025-01-04
-- Description: Essential production data for initial deployment

-- Insert default admin user (password should be changed on first login)
-- Default password: Admin123! (hashed with bcrypt)
INSERT OR IGNORE INTO users (
    id, username, email, password_hash, first_name, last_name, 
    user_type, is_active, email_verified, created_at
) VALUES (
    1,
    'admin',
    'admin@lionfootballacademy.com',
    '$2b$12$LQv3c1yqBwEHxeCjX3/3KuNtdh9h.ZGMzYjOyKDa3SN4TjGX.EeVe',
    'System',
    'Administrator',
    'admin',
    1,
    1,
    CURRENT_TIMESTAMP
);

-- Insert system coach for initial setup
INSERT OR IGNORE INTO users (
    id, username, email, password_hash, first_name, last_name,
    phone, user_type, is_active, email_verified, created_at
) VALUES (
    2,
    'headcoach',
    'coach@lionfootballacademy.com',
    '$2b$12$LQv3c1yqBwEHxeCjX3/3KuNtdh9h.ZGMzYjOyKDa3SN4TjGX.EeVe',
    'Head',
    'Coach',
    '+1234567890',
    'coach',
    1,
    1,
    CURRENT_TIMESTAMP
);

-- Create initial teams structure
INSERT OR IGNORE INTO teams (
    id, name, age_group, coach_id, season, is_active, created_at
) VALUES 
(1, 'Lions U10', 'U10', 2, '2024-2025', 1, CURRENT_TIMESTAMP),
(2, 'Lions U12', 'U12', 2, '2024-2025', 1, CURRENT_TIMESTAMP),
(3, 'Lions U14', 'U14', 2, '2024-2025', 1, CURRENT_TIMESTAMP),
(4, 'Lions U16', 'U16', 2, '2024-2025', 1, CURRENT_TIMESTAMP),
(5, 'Lions U18', 'U18', 2, '2024-2025', 1, CURRENT_TIMESTAMP);

-- Create default notification preferences for admin
INSERT OR IGNORE INTO notification_preferences (
    user_id, email_notifications, sms_notifications, push_notifications,
    training_reminders, match_updates, injury_alerts, billing_reminders,
    performance_reports, team_announcements, created_at
) VALUES (
    1, 1, 0, 1, 1, 1, 1, 1, 1, 1, CURRENT_TIMESTAMP
);

-- Create default notification preferences for head coach
INSERT OR IGNORE INTO notification_preferences (
    user_id, email_notifications, sms_notifications, push_notifications,
    training_reminders, match_updates, injury_alerts, billing_reminders,
    performance_reports, team_announcements, created_at
) VALUES (
    2, 1, 1, 1, 1, 1, 1, 0, 1, 1, CURRENT_TIMESTAMP
);

-- Insert welcome announcement
INSERT OR IGNORE INTO announcements (
    id, title, content, author_id, target_audience, priority,
    is_published, publish_date, created_at
) VALUES (
    1,
    'Welcome to Lion Football Academy!',
    'Welcome to the Lion Football Academy management system. This platform will help us manage training sessions, track player development, and maintain communication between coaches, players, and parents. 

Key Features:
- Training session management and attendance tracking
- Player performance monitoring and development plans
- Match scheduling and statistics
- Parent-coach communication portal
- QR code check-in system for easy attendance

For support or questions, please contact the academy administration.

Best regards,
Lion Football Academy Team',
    1,
    'all',
    'high',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Sample training session for demonstration
INSERT OR IGNORE INTO trainings (
    id, team_id, coach_id, title, description, training_date,
    duration_minutes, location, status, created_at
) VALUES (
    1,
    1,
    2,
    'Welcome Training Session',
    'Introduction training session for new season. Focus on basic skills assessment and team building exercises.',
    DATE('now', '+3 days', '18:00'),
    90,
    'Main Training Field',
    'scheduled',
    CURRENT_TIMESTAMP
);

-- Insert sample external teams for matches
INSERT OR IGNORE INTO teams (
    id, name, age_group, coach_id, season, is_active, created_at
) VALUES 
(100, 'Eagles FC U10', 'U10', NULL, '2024-2025', 1, CURRENT_TIMESTAMP),
(101, 'Tigers United U12', 'U12', NULL, '2024-2025', 1, CURRENT_TIMESTAMP),
(102, 'Wolves Academy U14', 'U14', NULL, '2024-2025', 1, CURRENT_TIMESTAMP),
(103, 'Panthers FC U16', 'U16', NULL, '2024-2025', 1, CURRENT_TIMESTAMP),
(104, 'Falcons United U18', 'U18', NULL, '2024-2025', 1, CURRENT_TIMESTAMP);

-- Sample friendly matches
INSERT OR IGNORE INTO matches (
    id, home_team_id, away_team_id, home_team_name, away_team_name,
    match_date, location, status, match_type, created_at
) VALUES 
(1, 1, NULL, 'Lions U10', 'Eagles FC U10', 
 DATE('now', '+7 days', '10:00'), 'Home Stadium', 'scheduled', 'friendly', CURRENT_TIMESTAMP),
(2, 2, NULL, 'Lions U12', 'Tigers United U12', 
 DATE('now', '+14 days', '11:30'), 'Home Stadium', 'scheduled', 'friendly', CURRENT_TIMESTAMP),
(3, NULL, 3, 'Wolves Academy U14', 'Lions U14', 
 DATE('now', '+21 days', '13:00'), 'Away Stadium', 'scheduled', 'friendly', CURRENT_TIMESTAMP);

-- Update schema migration record
INSERT OR IGNORE INTO schema_migrations (version, description) 
VALUES ('001_seed', 'Production seed data with default admin, teams, and sample content');

-- Create indexes for better performance (if not already created)
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active);
CREATE INDEX IF NOT EXISTS idx_trainings_upcoming ON trainings(training_date) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_matches_upcoming ON matches(match_date) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(publish_date) WHERE is_published = 1;

-- Performance optimization: Analyze tables
ANALYZE users;
ANALYZE teams;
ANALYZE players;
ANALYZE trainings;
ANALYZE attendance;
ANALYZE matches;
ANALYZE announcements;