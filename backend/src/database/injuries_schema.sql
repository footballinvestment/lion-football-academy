-- Football Academy Injuries Database Schema
-- Comprehensive injury tracking and management system

-- Injuries table for player injury records
CREATE TABLE injuries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Player reference
    player_id INTEGER NOT NULL,
    
    -- Injury classification
    injury_type VARCHAR(100) NOT NULL,                    -- e.g., 'Ankle Sprain', 'Hamstring Strain', 'Concussion'
    injury_severity VARCHAR(20) NOT NULL CHECK (injury_severity IN ('minor', 'moderate', 'severe')),
    injury_location VARCHAR(100) NOT NULL,                -- e.g., 'Left Ankle', 'Right Hamstring', 'Head'
    
    -- Temporal information
    injury_date DATE NOT NULL,                             -- When the injury occurred
    expected_recovery_date DATE,                           -- Estimated recovery date
    actual_recovery_date DATE,                             -- Actual recovery date (when healed)
    return_to_play_date DATE,                             -- When player returned to full training/games
    
    -- Medical information
    description TEXT,                                      -- Detailed injury description
    treatment_plan TEXT,                                   -- Treatment and recovery plan
    medical_notes TEXT,                                    -- Additional medical observations
    rehabilitation_exercises TEXT,                         -- Specific rehabilitation exercises
    
    -- Medical staff
    doctor_name VARCHAR(100),                             -- Treating doctor's name
    physiotherapist_name VARCHAR(100),                    -- Assigned physiotherapist
    
    -- Follow-up and monitoring
    follow_up_required BOOLEAN DEFAULT 1,                -- Whether follow-up is needed
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- Record creation time
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- Last update time
    created_by INTEGER,                                    -- User who created the record
    
    -- Foreign key constraints
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Performance indexes for common queries
CREATE INDEX idx_injuries_player_id ON injuries(player_id);
CREATE INDEX idx_injuries_date ON injuries(injury_date);
CREATE INDEX idx_injuries_severity ON injuries(injury_severity);
CREATE INDEX idx_injuries_type ON injuries(injury_type);
CREATE INDEX idx_injuries_recovery_status ON injuries(actual_recovery_date);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_injuries_timestamp 
    AFTER UPDATE ON injuries
    FOR EACH ROW
BEGIN
    UPDATE injuries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- View for active injuries (not yet recovered)
CREATE VIEW active_injuries AS
SELECT 
    i.*,
    p.name as player_name,
    p.position,
    t.name as team_name,
    u.full_name as created_by_name
FROM injuries i
JOIN players p ON i.player_id = p.id
LEFT JOIN teams t ON p.team_id = t.id
LEFT JOIN users u ON i.created_by = u.id
WHERE i.actual_recovery_date IS NULL
ORDER BY i.injury_date DESC;

-- View for injury statistics
CREATE VIEW injury_statistics AS
SELECT 
    injury_type,
    injury_severity,
    COUNT(*) as total_cases,
    AVG(CASE 
        WHEN actual_recovery_date IS NOT NULL AND expected_recovery_date IS NOT NULL 
        THEN julianday(actual_recovery_date) - julianday(expected_recovery_date)
        ELSE NULL 
    END) as avg_recovery_variance_days,
    AVG(CASE 
        WHEN actual_recovery_date IS NOT NULL 
        THEN julianday(actual_recovery_date) - julianday(injury_date)
        ELSE NULL 
    END) as avg_recovery_time_days
FROM injuries
GROUP BY injury_type, injury_severity
ORDER BY total_cases DESC;