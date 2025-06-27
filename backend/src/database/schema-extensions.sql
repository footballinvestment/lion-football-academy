-- =============================================================================
-- FOOTBALL ACADEMY DATABASE SCHEMA EXTENSIONS
-- Comprehensive match statistics, development plans, and injury tracking
-- =============================================================================
--
-- This file extends the base schema.sql with additional tables and enhancements
-- for comprehensive football academy management.
--
-- PREREQUISITES: 
-- - Execute schema.sql first (contains base tables: users, teams, players, etc.)
-- - This file adds missing tables and enhancements
--
-- =============================================================================

-- =============================================================================
-- MEDICAL RECORDS TABLE
-- Comprehensive health tracking beyond injuries
-- =============================================================================

-- Medical Records table for comprehensive health tracking
CREATE TABLE IF NOT EXISTS medical_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Player reference
    player_id INTEGER NOT NULL,
    
    -- Medical record type
    record_type VARCHAR(50) NOT NULL CHECK (record_type IN ('health_check', 'medical_clearance', 'vaccination', 'allergy', 'medication', 'medical_history', 'fitness_test')),
    
    -- Record details
    record_date DATE NOT NULL,
    medical_professional VARCHAR(100),                    -- Doctor/nurse name
    medical_facility VARCHAR(200),                        -- Hospital/clinic name
    
    -- Medical information
    findings TEXT,                                         -- Medical findings or results
    recommendations TEXT,                                  -- Medical recommendations
    restrictions TEXT,                                     -- Any activity restrictions
    medications_prescribed TEXT,                           -- Prescribed medications
    
    -- Health indicators
    height_cm DECIMAL(5,2),                               -- Height in centimeters
    weight_kg DECIMAL(5,2),                               -- Weight in kilograms
    body_fat_percentage DECIMAL(4,1),                     -- Body fat percentage
    blood_pressure VARCHAR(20),                           -- Blood pressure (e.g., "120/80")
    heart_rate_bpm INTEGER,                               -- Resting heart rate
    
    -- Clearance and validity
    clearance_status VARCHAR(20) CHECK (clearance_status IN ('cleared', 'conditional', 'restricted', 'not_cleared')),
    valid_until DATE,                                     -- When clearance expires
    
    -- Follow-up
    follow_up_required BOOLEAN DEFAULT 0,
    follow_up_date DATE,
    follow_up_notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    
    -- Foreign key constraints
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================================================
-- ADDITIONAL INDEXES FOR PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Medical Records indexes
CREATE INDEX IF NOT EXISTS idx_medical_records_player_id ON medical_records(player_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_date ON medical_records(record_date);
CREATE INDEX IF NOT EXISTS idx_medical_records_type ON medical_records(record_type);
CREATE INDEX IF NOT EXISTS idx_medical_records_clearance ON medical_records(clearance_status);
CREATE INDEX IF NOT EXISTS idx_medical_records_validity ON medical_records(valid_until);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_medical_records_player_type_date ON medical_records(player_id, record_type, record_date);
CREATE INDEX IF NOT EXISTS idx_medical_records_clearance_validity ON medical_records(clearance_status, valid_until);

-- =============================================================================
-- ENHANCED VIEWS FOR COMPREHENSIVE REPORTING
-- =============================================================================

-- Player Health Summary View
CREATE VIEW IF NOT EXISTS player_health_summary AS
SELECT 
    p.id as player_id,
    p.name as player_name,
    p.birth_date,
    t.name as team_name,
    
    -- Latest medical clearance
    (SELECT clearance_status 
     FROM medical_records mr 
     WHERE mr.player_id = p.id 
     AND mr.record_type = 'medical_clearance' 
     ORDER BY mr.record_date DESC LIMIT 1) as latest_clearance_status,
    
    (SELECT valid_until 
     FROM medical_records mr 
     WHERE mr.player_id = p.id 
     AND mr.record_type = 'medical_clearance' 
     ORDER BY mr.record_date DESC LIMIT 1) as clearance_expires,
    
    -- Active injuries count
    (SELECT COUNT(*) 
     FROM injuries i 
     WHERE i.player_id = p.id 
     AND i.actual_recovery_date IS NULL) as active_injuries_count,
    
    -- Latest fitness metrics
    (SELECT height_cm 
     FROM medical_records mr 
     WHERE mr.player_id = p.id 
     AND mr.height_cm IS NOT NULL 
     ORDER BY mr.record_date DESC LIMIT 1) as latest_height_cm,
    
    (SELECT weight_kg 
     FROM medical_records mr 
     WHERE mr.player_id = p.id 
     AND mr.weight_kg IS NOT NULL 
     ORDER BY mr.record_date DESC LIMIT 1) as latest_weight_kg,
    
    -- Health status indicator
    CASE 
        WHEN (SELECT COUNT(*) FROM injuries WHERE player_id = p.id AND actual_recovery_date IS NULL) > 0 THEN 'injured'
        WHEN (SELECT clearance_status FROM medical_records WHERE player_id = p.id AND record_type = 'medical_clearance' ORDER BY record_date DESC LIMIT 1) = 'not_cleared' THEN 'not_cleared'
        WHEN (SELECT clearance_status FROM medical_records WHERE player_id = p.id AND record_type = 'medical_clearance' ORDER BY record_date DESC LIMIT 1) = 'restricted' THEN 'restricted'
        WHEN (SELECT valid_until FROM medical_records WHERE player_id = p.id AND record_type = 'medical_clearance' ORDER BY record_date DESC LIMIT 1) < DATE('now') THEN 'clearance_expired'
        ELSE 'healthy'
    END as health_status
    
FROM players p
LEFT JOIN teams t ON p.team_id = t.id
ORDER BY p.name;

-- Team Health Overview
CREATE VIEW IF NOT EXISTS team_health_overview AS
SELECT 
    t.id as team_id,
    t.name as team_name,
    COUNT(p.id) as total_players,
    
    -- Health status counts
    SUM(CASE WHEN phs.health_status = 'healthy' THEN 1 ELSE 0 END) as healthy_players,
    SUM(CASE WHEN phs.health_status = 'injured' THEN 1 ELSE 0 END) as injured_players,
    SUM(CASE WHEN phs.health_status = 'restricted' THEN 1 ELSE 0 END) as restricted_players,
    SUM(CASE WHEN phs.health_status = 'not_cleared' THEN 1 ELSE 0 END) as not_cleared_players,
    SUM(CASE WHEN phs.health_status = 'clearance_expired' THEN 1 ELSE 0 END) as expired_clearance_players,
    
    -- Health percentages
    ROUND((SUM(CASE WHEN phs.health_status = 'healthy' THEN 1 ELSE 0 END) * 100.0 / COUNT(p.id)), 1) as healthy_percentage,
    ROUND((SUM(CASE WHEN phs.health_status = 'injured' THEN 1 ELSE 0 END) * 100.0 / COUNT(p.id)), 1) as injured_percentage
    
FROM teams t
LEFT JOIN players p ON t.id = p.team_id
LEFT JOIN player_health_summary phs ON p.id = phs.player_id
GROUP BY t.id, t.name
ORDER BY t.name;

-- Enhanced Top Performers View (combining match stats with development tracking)
CREATE VIEW IF NOT EXISTS enhanced_top_performers AS
SELECT 
    p.id as player_id,
    p.name as player_name,
    p.position,
    t.name as team_name,
    
    -- Match statistics
    COALESCE(SUM(pmp.goals), 0) as total_goals,
    COALESCE(SUM(pmp.assists), 0) as total_assists,
    COALESCE(COUNT(DISTINCT pmp.match_id), 0) as matches_played,
    COALESCE(ROUND(AVG(pmp.performance_rating), 1), 0) as avg_match_rating,
    
    -- Development tracking
    (SELECT COUNT(*) 
     FROM development_plans dp 
     WHERE dp.player_id = p.id 
     AND dp.status = 'active') as active_development_plans,
    
    (SELECT AVG(completion_percentage) 
     FROM development_plans dp 
     WHERE dp.player_id = p.id 
     AND dp.status IN ('active', 'completed')) as avg_development_progress,
    
    -- Latest skill assessment
    (SELECT AVG(score) 
     FROM skills_assessments sa 
     WHERE sa.player_id = p.id 
     AND sa.assessment_date >= DATE('now', '-3 months')) as recent_skill_avg,
    
    -- Health status
    phs.health_status,
    
    -- Overall performance score (combining multiple factors)
    ROUND((
        COALESCE(AVG(pmp.performance_rating), 5) * 0.4 +
        COALESCE((SELECT AVG(score) FROM skills_assessments WHERE player_id = p.id AND assessment_date >= DATE('now', '-3 months')), 5) * 0.3 +
        COALESCE((SELECT AVG(completion_percentage) FROM development_plans WHERE player_id = p.id AND status IN ('active', 'completed')), 50) / 10 * 0.3
    ), 1) as overall_performance_score
    
FROM players p
LEFT JOIN teams t ON p.team_id = t.id
LEFT JOIN player_match_performance pmp ON p.id = pmp.player_id
LEFT JOIN matches m ON pmp.match_id = m.id AND m.match_status = 'finished'
LEFT JOIN player_health_summary phs ON p.id = phs.player_id
GROUP BY p.id, p.name, p.position, t.name, phs.health_status
ORDER BY overall_performance_score DESC, total_goals DESC;

-- Development Progress Summary
CREATE VIEW IF NOT EXISTS development_progress_summary AS
SELECT 
    p.id as player_id,
    p.name as player_name,
    t.name as team_name,
    dp.season,
    dp.plan_type,
    dp.current_level,
    dp.target_level,
    dp.completion_percentage,
    dp.status,
    
    -- Progress metrics
    (SELECT COUNT(*) 
     FROM development_milestones dm 
     WHERE dm.plan_id = dp.id) as total_milestones,
    
    (SELECT COUNT(*) 
     FROM development_milestones dm 
     WHERE dm.plan_id = dp.id 
     AND dm.achieved = 1) as completed_milestones,
    
    (SELECT COUNT(*) 
     FROM progress_tracking pt 
     WHERE pt.plan_id = dp.id) as progress_entries,
    
    -- Latest progress update
    (SELECT progress_percentage 
     FROM progress_tracking pt 
     WHERE pt.plan_id = dp.id 
     ORDER BY pt.tracking_date DESC LIMIT 1) as latest_progress_update,
    
    (SELECT tracking_date 
     FROM progress_tracking pt 
     WHERE pt.plan_id = dp.id 
     ORDER BY pt.tracking_date DESC LIMIT 1) as last_update_date,
    
    -- Milestone completion rate
    CASE 
        WHEN (SELECT COUNT(*) FROM development_milestones WHERE plan_id = dp.id) > 0 
        THEN ROUND((SELECT COUNT(*) FROM development_milestones WHERE plan_id = dp.id AND achieved = 1) * 100.0 / 
                   (SELECT COUNT(*) FROM development_milestones WHERE plan_id = dp.id), 1)
        ELSE 0 
    END as milestone_completion_rate
    
FROM development_plans dp
JOIN players p ON dp.player_id = p.id
LEFT JOIN teams t ON p.team_id = t.id
ORDER BY dp.season DESC, p.name, dp.plan_type;

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC DATA MAINTENANCE
-- =============================================================================

-- Trigger to update updated_at timestamp for medical_records
CREATE TRIGGER IF NOT EXISTS update_medical_records_timestamp 
    AFTER UPDATE ON medical_records
    FOR EACH ROW
BEGIN
    UPDATE medical_records SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to automatically update development plan completion based on milestones
CREATE TRIGGER IF NOT EXISTS update_development_plan_completion
    AFTER UPDATE ON development_milestones
    FOR EACH ROW
    WHEN NEW.achieved != OLD.achieved
BEGIN
    UPDATE development_plans 
    SET completion_percentage = (
        SELECT CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((SUM(CASE WHEN achieved = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 0)
        END
        FROM development_milestones 
        WHERE plan_id = NEW.plan_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.plan_id;
END;

-- =============================================================================
-- SAMPLE QUERIES AND USAGE EXAMPLES
-- =============================================================================

-- Example queries (commented out for production use):

/*
-- 1. Get all players with expired medical clearances
SELECT * FROM player_health_summary 
WHERE health_status = 'clearance_expired' 
ORDER BY clearance_expires;

-- 2. Team health overview for all teams
SELECT * FROM team_health_overview 
ORDER BY healthy_percentage DESC;

-- 3. Top 10 performers across all metrics
SELECT * FROM enhanced_top_performers 
WHERE health_status = 'healthy' 
LIMIT 10;

-- 4. Development progress for a specific season
SELECT * FROM development_progress_summary 
WHERE season = '2024-25' 
AND completion_percentage > 75 
ORDER BY milestone_completion_rate DESC;

-- 5. Players needing medical attention
SELECT player_name, team_name, health_status, active_injuries_count
FROM player_health_summary 
WHERE health_status IN ('injured', 'not_cleared', 'clearance_expired')
ORDER BY active_injuries_count DESC;

-- 6. Skill development trends
SELECT 
    p.name,
    sa.skill_category,
    sa.skill_name,
    sa.score,
    sa.assessment_date,
    LAG(sa.score) OVER (PARTITION BY sa.player_id, sa.skill_name ORDER BY sa.assessment_date) as previous_score
FROM skills_assessments sa
JOIN players p ON sa.player_id = p.id
WHERE sa.assessment_date >= DATE('now', '-6 months')
ORDER BY p.name, sa.skill_category, sa.assessment_date;
*/

-- =============================================================================
-- SCHEMA EXTENSION COMPLETION
-- =============================================================================

-- Insert metadata about schema extensions
INSERT OR IGNORE INTO sqlite_master (type, name, tbl_name, rootpage, sql) 
VALUES ('table', 'schema_info', 'schema_info', 0, 
'-- Schema extension metadata
-- This table tracks applied schema extensions
CREATE TABLE schema_info (
    extension_name TEXT PRIMARY KEY,
    version TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
)');

-- Record this extension
INSERT OR REPLACE INTO schema_info (extension_name, version, description) 
VALUES ('comprehensive_academy_extension', '1.0', 'Medical records, enhanced views, and performance optimizations');

-- =============================================================================
-- END OF SCHEMA EXTENSIONS
-- =============================================================================