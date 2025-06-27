-- Football Academy Database Schema

-- Users table for authentication and authorization
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'parent')),
    team_id INTEGER,
    player_id INTEGER,
    active BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age_group TEXT NOT NULL,
    season TEXT,
    coach_name TEXT,
    team_color TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    position TEXT,
    dominant_foot TEXT,
    team_id INTEGER,
    parent_name TEXT,
    parent_phone TEXT,
    parent_email TEXT,
    medical_notes TEXT,
    profile_image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE TABLE trainings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    duration INTEGER,
    location TEXT,
    type TEXT NOT NULL,
    team_id INTEGER,
    training_plan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE TABLE attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    training_id INTEGER,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    late_minutes INTEGER DEFAULT 0,
    absence_reason TEXT,
    performance_rating INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (training_id) REFERENCES trainings(id)
);

CREATE TABLE announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    team_id INTEGER,
    urgent BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- QR Code tokens for training check-ins
CREATE TABLE training_qr_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    training_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (training_id) REFERENCES trainings(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Injuries table for comprehensive injury tracking
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

-- Performance indexes for injuries
CREATE INDEX idx_injuries_player_id ON injuries(player_id);
CREATE INDEX idx_injuries_date ON injuries(injury_date);
CREATE INDEX idx_injuries_severity ON injuries(injury_severity);
CREATE INDEX idx_injuries_type ON injuries(injury_type);
CREATE INDEX idx_injuries_recovery_status ON injuries(actual_recovery_date);

-- Individual Development Plans Database Schema
-- This schema supports comprehensive player development tracking and planning

-- Individual Development Plans tábla
CREATE TABLE development_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    season VARCHAR(20) NOT NULL,
    plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('technical', 'physical', 'tactical', 'mental', 'academic')),
    current_level INTEGER CHECK (current_level BETWEEN 1 AND 10),
    target_level INTEGER CHECK (target_level BETWEEN 1 AND 10),
    goals TEXT NOT NULL,
    action_steps TEXT NOT NULL,
    resources_needed TEXT,
    deadline DATE,
    progress_notes TEXT,
    coach_notes TEXT,
    parent_feedback TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL,
    reviewed_by INTEGER,
    review_date DATE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- Skills Assessment tábla - Részletes képesség értékelések
CREATE TABLE skills_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    assessment_date DATE NOT NULL,
    assessed_by INTEGER NOT NULL,
    skill_category VARCHAR(50) NOT NULL,
    skill_name VARCHAR(100) NOT NULL,
    score INTEGER CHECK (score BETWEEN 1 AND 10),
    notes TEXT,
    improvement_suggestions TEXT,
    next_assessment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (assessed_by) REFERENCES users(id)
);

-- Development Milestones tábla - Fejlesztési mérföldkövek
CREATE TABLE development_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    milestone_title VARCHAR(200) NOT NULL,
    description TEXT,
    target_date DATE,
    completion_date DATE,
    achieved BOOLEAN DEFAULT 0,
    achievement_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES development_plans(id) ON DELETE CASCADE
);

-- Progress Tracking tábla - Folyamatos fejlődés követése
CREATE TABLE progress_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    tracking_date DATE NOT NULL,
    progress_percentage INTEGER CHECK (progress_percentage BETWEEN 0 AND 100),
    activities_completed TEXT,
    challenges_faced TEXT,
    next_week_goals TEXT,
    coach_feedback TEXT,
    player_self_assessment INTEGER CHECK (player_self_assessment BETWEEN 1 AND 10),
    parent_input TEXT,
    recorded_by INTEGER NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES development_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- Performance optimizations - Development Plans Indexek
CREATE INDEX idx_development_plans_player_id ON development_plans(player_id);
CREATE INDEX idx_development_plans_season ON development_plans(season);
CREATE INDEX idx_development_plans_type ON development_plans(plan_type);
CREATE INDEX idx_development_plans_status ON development_plans(status);
CREATE INDEX idx_skills_assessments_player_date ON skills_assessments(player_id, assessment_date);
CREATE INDEX idx_milestones_plan_id ON development_milestones(plan_id);
CREATE INDEX idx_progress_tracking_plan_date ON progress_tracking(plan_id, tracking_date);

-- Composite indexes for common queries
CREATE INDEX idx_development_plans_player_season_type ON development_plans(player_id, season, plan_type);
CREATE INDEX idx_skills_assessments_category_player ON skills_assessments(skill_category, player_id);
CREATE INDEX idx_milestones_target_date ON development_milestones(target_date);
CREATE INDEX idx_progress_tracking_date_player ON progress_tracking(tracking_date, plan_id);

-- Match Statistics Database Schema
-- Comprehensive system for tracking match results, player performance, and team statistics

-- Matches tábla (mérkőzések)
CREATE TABLE matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    home_team_id INTEGER NOT NULL,
    away_team_id INTEGER NOT NULL,
    match_date DATE NOT NULL,
    match_time TIME,
    venue VARCHAR(200),
    match_type VARCHAR(50) NOT NULL CHECK (match_type IN ('friendly', 'league', 'cup', 'tournament')),
    season VARCHAR(20) NOT NULL,
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    match_status VARCHAR(20) DEFAULT 'scheduled' CHECK (match_status IN ('scheduled', 'ongoing', 'finished', 'cancelled', 'postponed')),
    match_duration INTEGER DEFAULT 90, -- percek
    weather_conditions VARCHAR(100),
    referee_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (home_team_id) REFERENCES teams(id),
    FOREIGN KEY (away_team_id) REFERENCES teams(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Player Match Performance tábla (játékos mérkőzés teljesítmény)
CREATE TABLE player_match_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    position VARCHAR(50),
    minutes_played INTEGER DEFAULT 0,
    starter BOOLEAN DEFAULT 0,
    substituted_in_minute INTEGER,
    substituted_out_minute INTEGER,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    yellow_cards INTEGER DEFAULT 0,
    red_cards INTEGER DEFAULT 0,
    shots_total INTEGER DEFAULT 0,
    shots_on_target INTEGER DEFAULT 0,
    passes_completed INTEGER DEFAULT 0,
    passes_attempted INTEGER DEFAULT 0,
    tackles_won INTEGER DEFAULT 0,
    tackles_attempted INTEGER DEFAULT 0,
    distance_covered_km DECIMAL(4,2),
    top_speed_kmh DECIMAL(5,2),
    performance_rating DECIMAL(3,1) CHECK (performance_rating BETWEEN 1.0 AND 10.0),
    coach_notes TEXT,
    player_self_rating DECIMAL(3,1) CHECK (player_self_rating BETWEEN 1.0 AND 10.0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    UNIQUE(match_id, player_id)
);

-- Match Events tábla (mérkőzés események)
CREATE TABLE match_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    player_id INTEGER,
    team_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('goal', 'assist', 'yellow_card', 'red_card', 'substitution_in', 'substitution_out', 'injury', 'penalty', 'own_goal')),
    event_minute INTEGER NOT NULL,
    event_description TEXT,
    assisted_by_player_id INTEGER,
    substituted_player_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (assisted_by_player_id) REFERENCES players(id),
    FOREIGN KEY (substituted_player_id) REFERENCES players(id)
);

-- Team Match Statistics tábla (csapat mérkőzés statisztikák)
CREATE TABLE team_match_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    possession_percentage INTEGER CHECK (possession_percentage BETWEEN 0 AND 100),
    shots_total INTEGER DEFAULT 0,
    shots_on_target INTEGER DEFAULT 0,
    corners INTEGER DEFAULT 0,
    fouls INTEGER DEFAULT 0,
    offsides INTEGER DEFAULT 0,
    passes_completed INTEGER DEFAULT 0,
    passes_attempted INTEGER DEFAULT 0,
    crosses_completed INTEGER DEFAULT 0,
    crosses_attempted INTEGER DEFAULT 0,
    free_kicks INTEGER DEFAULT 0,
    throw_ins INTEGER DEFAULT 0,
    goalkeeper_saves INTEGER DEFAULT 0,
    formation VARCHAR(20),
    tactical_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    UNIQUE(match_id, team_id)
);

-- Season Statistics Summary tábla (szezonális összesítő)
CREATE TABLE season_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    season VARCHAR(20) NOT NULL,
    team_id INTEGER NOT NULL,
    matches_played INTEGER DEFAULT 0,
    minutes_played INTEGER DEFAULT 0,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    yellow_cards INTEGER DEFAULT 0,
    red_cards INTEGER DEFAULT 0,
    average_rating DECIMAL(3,1),
    positions_played TEXT, -- JSON array of positions
    total_distance_km DECIMAL(6,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    UNIQUE(player_id, season)
);

-- Goal Scorers View (góllövő lista)
CREATE VIEW top_scorers AS
SELECT 
    p.id,
    p.name,
    p.team_id,
    t.name as team_name,
    SUM(pmp.goals) as total_goals,
    SUM(pmp.assists) as total_assists,
    COUNT(DISTINCT pmp.match_id) as matches_played,
    ROUND(AVG(pmp.performance_rating), 1) as avg_rating
FROM players p
JOIN player_match_performance pmp ON p.id = pmp.player_id
JOIN teams t ON p.team_id = t.id
JOIN matches m ON pmp.match_id = m.id
WHERE m.match_status = 'finished'
GROUP BY p.id, p.name, p.team_id, t.name
ORDER BY total_goals DESC, total_assists DESC;

-- Team Performance View (csapat teljesítmény)
CREATE VIEW team_performance AS
SELECT 
    t.id,
    t.name,
    COUNT(DISTINCT m.id) as matches_played,
    SUM(CASE WHEN (m.home_team_id = t.id AND m.home_score > m.away_score) OR 
                  (m.away_team_id = t.id AND m.away_score > m.home_score) THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN m.home_score = m.away_score THEN 1 ELSE 0 END) as draws,
    SUM(CASE WHEN (m.home_team_id = t.id AND m.home_score < m.away_score) OR 
                  (m.away_team_id = t.id AND m.away_score < m.home_score) THEN 1 ELSE 0 END) as losses,
    SUM(CASE WHEN m.home_team_id = t.id THEN m.home_score ELSE m.away_score END) as goals_for,
    SUM(CASE WHEN m.home_team_id = t.id THEN m.away_score ELSE m.home_score END) as goals_against
FROM teams t
LEFT JOIN matches m ON (t.id = m.home_team_id OR t.id = m.away_team_id) AND m.match_status = 'finished'
GROUP BY t.id, t.name
ORDER BY wins DESC, goals_for DESC;

-- Match Result Summary View (mérkőzés eredmény összesítő)
CREATE VIEW match_results AS
SELECT 
    m.id,
    m.match_date,
    m.match_type,
    m.season,
    ht.name as home_team,
    at.name as away_team,
    m.home_score,
    m.away_score,
    m.match_status,
    m.venue,
    CASE 
        WHEN m.home_score > m.away_score THEN ht.name
        WHEN m.away_score > m.home_score THEN at.name
        ELSE 'Draw'
    END as winner
FROM matches m
JOIN teams ht ON m.home_team_id = ht.id
JOIN teams at ON m.away_team_id = at.id
ORDER BY m.match_date DESC;

-- Player Season Performance View (játékos szezon teljesítmény)
CREATE VIEW player_season_performance AS
SELECT 
    p.id,
    p.name,
    ss.season,
    t.name as team_name,
    ss.matches_played,
    ss.minutes_played,
    ss.goals,
    ss.assists,
    ss.yellow_cards,
    ss.red_cards,
    ss.average_rating,
    ROUND(ss.goals * 1.0 / NULLIF(ss.matches_played, 0), 2) as goals_per_match,
    ROUND(ss.minutes_played * 1.0 / NULLIF(ss.matches_played, 0), 0) as avg_minutes_per_match
FROM season_statistics ss
JOIN players p ON ss.player_id = p.id
JOIN teams t ON ss.team_id = t.id
ORDER BY ss.season DESC, ss.goals DESC;

-- Performance optimizations - Match Statistics Indexek
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_teams ON matches(home_team_id, away_team_id);
CREATE INDEX idx_matches_season ON matches(season);
CREATE INDEX idx_matches_status ON matches(match_status);
CREATE INDEX idx_matches_type ON matches(match_type);
CREATE INDEX idx_player_performance_match ON player_match_performance(match_id);
CREATE INDEX idx_player_performance_player ON player_match_performance(player_id);
CREATE INDEX idx_player_performance_rating ON player_match_performance(performance_rating);
CREATE INDEX idx_player_performance_goals ON player_match_performance(goals);
CREATE INDEX idx_match_events_match ON match_events(match_id);
CREATE INDEX idx_match_events_player ON match_events(player_id);
CREATE INDEX idx_match_events_type ON match_events(event_type);
CREATE INDEX idx_match_events_minute ON match_events(event_minute);
CREATE INDEX idx_team_statistics_match ON team_match_statistics(match_id);
CREATE INDEX idx_team_statistics_team ON team_match_statistics(team_id);
CREATE INDEX idx_season_statistics_player ON season_statistics(player_id);
CREATE INDEX idx_season_statistics_season ON season_statistics(season);
CREATE INDEX idx_season_statistics_team ON season_statistics(team_id);

-- Composite indexes for common match statistics queries
CREATE INDEX idx_matches_team_season ON matches(home_team_id, season);
CREATE INDEX idx_matches_season_status ON matches(season, match_status);
CREATE INDEX idx_player_performance_player_season ON player_match_performance(player_id, match_id);
CREATE INDEX idx_match_events_match_type ON match_events(match_id, event_type);

-- Trigger: Automatikus season statistics frissítés
CREATE TRIGGER update_season_stats_after_match
AFTER INSERT ON player_match_performance
BEGIN
    INSERT OR REPLACE INTO season_statistics (
        player_id, season, team_id, matches_played, minutes_played, 
        goals, assists, yellow_cards, red_cards, average_rating,
        total_distance_km, updated_at
    )
    SELECT 
        NEW.player_id,
        (SELECT season FROM matches WHERE id = NEW.match_id),
        NEW.team_id,
        COUNT(DISTINCT pmp.match_id),
        SUM(pmp.minutes_played),
        SUM(pmp.goals),
        SUM(pmp.assists),
        SUM(pmp.yellow_cards),
        SUM(pmp.red_cards),
        ROUND(AVG(pmp.performance_rating), 1),
        SUM(pmp.distance_covered_km),
        CURRENT_TIMESTAMP
    FROM player_match_performance pmp
    JOIN matches m ON pmp.match_id = m.id
    WHERE pmp.player_id = NEW.player_id 
    AND m.season = (SELECT season FROM matches WHERE id = NEW.match_id)
    AND m.match_status = 'finished';
END;

-- Trigger: Frissítés season statistics módosításkor
CREATE TRIGGER update_season_stats_after_match_update
AFTER UPDATE ON player_match_performance
BEGIN
    INSERT OR REPLACE INTO season_statistics (
        player_id, season, team_id, matches_played, minutes_played, 
        goals, assists, yellow_cards, red_cards, average_rating,
        total_distance_km, updated_at
    )
    SELECT 
        NEW.player_id,
        (SELECT season FROM matches WHERE id = NEW.match_id),
        NEW.team_id,
        COUNT(DISTINCT pmp.match_id),
        SUM(pmp.minutes_played),
        SUM(pmp.goals),
        SUM(pmp.assists),
        SUM(pmp.yellow_cards),
        SUM(pmp.red_cards),
        ROUND(AVG(pmp.performance_rating), 1),
        SUM(pmp.distance_covered_km),
        CURRENT_TIMESTAMP
    FROM player_match_performance pmp
    JOIN matches m ON pmp.match_id = m.id
    WHERE pmp.player_id = NEW.player_id 
    AND m.season = (SELECT season FROM matches WHERE id = NEW.match_id)
    AND m.match_status = 'finished';
END;-- =============================================================================
-- BILLING & PAYMENT SYSTEM DATABASE SCHEMA
-- Comprehensive financial management for Lion Football Academy
-- =============================================================================

-- Subscription Plans tábla (tandíj csomagok)
CREATE TABLE subscription_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_name VARCHAR(100) NOT NULL,
    plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('monthly', 'quarterly', 'annual', 'one_time')),
    age_group VARCHAR(50), -- U8, U10, U12, U14, U16, U18, Adult
    training_level VARCHAR(50) CHECK (training_level IN ('beginner', 'intermediate', 'advanced', 'elite')),
    price_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'HUF',
    training_sessions_per_week INTEGER DEFAULT 2,
    includes_equipment BOOLEAN DEFAULT 0,
    includes_tournaments BOOLEAN DEFAULT 0,
    includes_camps BOOLEAN DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Subscriptions tábla (diák előfizetések)
CREATE TABLE student_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
    monthly_price DECIMAL(10,2) NOT NULL,
    discount_applied DECIMAL(5,2) DEFAULT 0.00,
    discount_reason TEXT,
    auto_renew BOOLEAN DEFAULT 1,
    payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    billing_contact_name VARCHAR(200),
    billing_contact_email VARCHAR(200),
    billing_contact_phone VARCHAR(50),
    billing_address TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Invoices tábla (számlák)
CREATE TABLE invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    subscription_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'HUF',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('draft', 'sent', 'pending', 'paid', 'overdue', 'cancelled')),
    payment_terms TEXT,
    late_fee_applied DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    pdf_file_path VARCHAR(500),
    email_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (subscription_id) REFERENCES student_subscriptions(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Invoice Line Items tábla (számla tételek)
CREATE TABLE invoice_line_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('subscription', 'equipment', 'tournament', 'camp', 'late_fee', 'discount', 'other')),
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Payments tábla (kifizetések)
CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    payment_date DATE NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'HUF',
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('bank_transfer', 'cash', 'card', 'online', 'mobile_payment', 'other')),
    transaction_id VARCHAR(200),
    bank_reference VARCHAR(200),
    payment_status VARCHAR(20) DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    gateway_response TEXT,
    processing_fee DECIMAL(10,2) DEFAULT 0.00,
    net_amount DECIMAL(10,2),
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    refund_date DATE,
    refund_reason TEXT,
    notes TEXT,
    recorded_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- Scholarships tábla (ösztöndíjak)
CREATE TABLE scholarships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scholarship_name VARCHAR(200) NOT NULL,
    scholarship_type VARCHAR(50) NOT NULL CHECK (scholarship_type IN ('need_based', 'merit_based', 'talent_based', 'family_discount', 'sibling_discount', 'loyalty_discount')),
    player_id INTEGER NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value DECIMAL(10,2) NOT NULL,
    max_discount_amount DECIMAL(10,2),
    valid_from DATE NOT NULL,
    valid_until DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'revoked')),
    criteria_description TEXT,
    performance_requirements TEXT,
    review_frequency VARCHAR(50) CHECK (review_frequency IN ('monthly', 'quarterly', 'annually', 'none')),
    last_review_date DATE,
    next_review_date DATE,
    awarded_by INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (awarded_by) REFERENCES users(id)
);

-- Payment Reminders tábla (fizetési emlékeztetők)
CREATE TABLE payment_reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('gentle', 'firm', 'final', 'overdue')),
    reminder_date DATE NOT NULL,
    days_overdue INTEGER DEFAULT 0,
    message_template TEXT,
    sent_via VARCHAR(50) CHECK (sent_via IN ('email', 'sms', 'phone', 'letter', 'in_person')),
    sent_at TIMESTAMP,
    response_received BOOLEAN DEFAULT 0,
    response_notes TEXT,
    next_action_date DATE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Financial Reports Cache tábla (pénzügyi jelentések cache)
CREATE TABLE financial_reports_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type VARCHAR(100) NOT NULL,
    report_period VARCHAR(50) NOT NULL, -- 2024-01, 2024-Q1, 2024, etc.
    filter_criteria TEXT, -- JSON
    report_data TEXT, -- JSON
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    generated_by INTEGER,
    FOREIGN KEY (generated_by) REFERENCES users(id)
);

-- =============================================================================
-- VIEWS: Pénzügyi jelentésekhez
-- =============================================================================

-- Outstanding Invoices View (ki nem fizetett számlák)
CREATE VIEW outstanding_invoices AS
SELECT 
    i.id,
    i.invoice_number,
    i.player_id,
    p.name as player_name,
    t.name as team_name,
    i.issue_date,
    i.due_date,
    i.total_amount,
    COALESCE(SUM(pay.amount_paid), 0) as amount_paid,
    (i.total_amount - COALESCE(SUM(pay.amount_paid), 0)) as amount_outstanding,
    CASE 
        WHEN i.due_date < DATE('now') AND i.status != 'paid' THEN 'overdue'
        WHEN i.status = 'paid' THEN 'paid'
        ELSE 'pending'
    END as payment_status,
    (julianday('now') - julianday(i.due_date)) as days_overdue
FROM invoices i
JOIN players p ON i.player_id = p.id
JOIN teams t ON p.team_id = t.id
LEFT JOIN payments pay ON i.id = pay.invoice_id AND pay.payment_status = 'completed'
GROUP BY i.id, i.invoice_number, i.player_id, p.name, t.name, i.issue_date, i.due_date, i.total_amount, i.status
HAVING amount_outstanding > 0
ORDER BY days_overdue DESC, i.due_date ASC;

-- Monthly Revenue View (havi bevételek)
CREATE VIEW monthly_revenue AS
SELECT 
    strftime('%Y-%m', pay.payment_date) as month,
    COUNT(DISTINCT pay.invoice_id) as invoices_paid,
    COUNT(DISTINCT i.player_id) as unique_students,
    SUM(pay.amount_paid) as total_revenue,
    AVG(pay.amount_paid) as avg_payment,
    SUM(CASE WHEN pay.payment_method = 'bank_transfer' THEN pay.amount_paid ELSE 0 END) as bank_transfer_revenue,
    SUM(CASE WHEN pay.payment_method = 'cash' THEN pay.amount_paid ELSE 0 END) as cash_revenue,
    SUM(CASE WHEN pay.payment_method = 'card' THEN pay.amount_paid ELSE 0 END) as card_revenue
FROM payments pay
JOIN invoices i ON pay.invoice_id = i.id
WHERE pay.payment_status = 'completed'
GROUP BY strftime('%Y-%m', pay.payment_date)
ORDER BY month DESC;

-- Student Payment History View (diák fizetési történet)
CREATE VIEW student_payment_history AS
SELECT 
    p.id as player_id,
    p.name as player_name,
    t.name as team_name,
    COUNT(DISTINCT i.id) as total_invoices,
    COUNT(DISTINCT pay.id) as total_payments,
    SUM(i.total_amount) as total_billed,
    SUM(CASE WHEN pay.payment_status = 'completed' THEN pay.amount_paid ELSE 0 END) as total_paid,
    (SUM(i.total_amount) - SUM(CASE WHEN pay.payment_status = 'completed' THEN pay.amount_paid ELSE 0 END)) as balance_outstanding,
    AVG(julianday(pay.payment_date) - julianday(i.due_date)) as avg_payment_delay_days,
    MAX(pay.payment_date) as last_payment_date,
    s.status as subscription_status,
    sp.plan_name as current_plan
FROM players p
LEFT JOIN teams t ON p.team_id = t.id
LEFT JOIN invoices i ON p.id = i.player_id
LEFT JOIN payments pay ON i.id = pay.invoice_id
LEFT JOIN student_subscriptions s ON p.id = s.player_id AND s.status = 'active'
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
GROUP BY p.id, p.name, t.name, s.status, sp.plan_name
ORDER BY balance_outstanding DESC;

-- =============================================================================
-- INDEXEK a teljesítményhez
-- =============================================================================

CREATE INDEX idx_student_subscriptions_player ON student_subscriptions(player_id);
CREATE INDEX idx_student_subscriptions_plan ON student_subscriptions(plan_id);
CREATE INDEX idx_student_subscriptions_status ON student_subscriptions(status);
CREATE INDEX idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX idx_invoices_player ON invoices(player_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_method ON payments(payment_method);
CREATE INDEX idx_scholarships_player ON scholarships(player_id);
CREATE INDEX idx_scholarships_status ON scholarships(status);
CREATE INDEX idx_scholarships_dates ON scholarships(valid_from, valid_until);
CREATE INDEX idx_reminders_invoice ON payment_reminders(invoice_id);
CREATE INDEX idx_reminders_date ON payment_reminders(reminder_date);

-- =============================================================================
-- TRIGGEREK automatikus folyamatokhoz
-- =============================================================================

-- Trigger: Automatikus számla szám generálás
CREATE TRIGGER generate_invoice_number
AFTER INSERT ON invoices
FOR EACH ROW
WHEN NEW.invoice_number IS NULL OR NEW.invoice_number = ''
BEGIN
    UPDATE invoices 
    SET invoice_number = printf('INV-%04d-%06d', 
        strftime('%Y', NEW.created_at), 
        NEW.id
    )
    WHERE id = NEW.id;
END;

-- Trigger: Automatikus payment number generálás
CREATE TRIGGER generate_payment_number
AFTER INSERT ON payments
FOR EACH ROW
WHEN NEW.payment_number IS NULL OR NEW.payment_number = ''
BEGIN
    UPDATE payments 
    SET payment_number = printf('PAY-%04d-%06d', 
        strftime('%Y', NEW.created_at), 
        NEW.id
    )
    WHERE id = NEW.id;
END;

-- Trigger: Invoice status automatikus frissítés payment után
CREATE TRIGGER update_invoice_status_on_payment
AFTER INSERT ON payments
FOR EACH ROW
WHEN NEW.payment_status = 'completed'
BEGIN
    UPDATE invoices 
    SET status = CASE 
        WHEN (
            SELECT SUM(amount_paid) 
            FROM payments 
            WHERE invoice_id = NEW.invoice_id AND payment_status = 'completed'
        ) >= total_amount THEN 'paid'
        ELSE 'pending'
    END,
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.invoice_id;
END;

-- Trigger: Scholarship alkalmazása subscription-re
CREATE TRIGGER apply_scholarship_discount
AFTER INSERT ON scholarships
FOR EACH ROW
WHEN NEW.status = 'active'
BEGIN
    UPDATE student_subscriptions 
    SET discount_applied = CASE 
        WHEN NEW.discount_type = 'percentage' THEN NEW.discount_value
        ELSE (NEW.discount_value / monthly_price) * 100
    END,
    discount_reason = NEW.scholarship_name,
    updated_at = CURRENT_TIMESTAMP
    WHERE player_id = NEW.player_id AND status = 'active';
END;