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

-- Performance optimizations - Indexek
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

-- HASZNÁLATI ESETEK ÉS DOKUMENTÁCIÓ
-- 
-- 1. EGYÉNI FEJLESZTÉSI TERVEK (development_plans)
--    - Célja: Játékosok személyre szabott fejlesztési terveinek kezelése
--    - Típusok: technical (technikai), physical (fizikai), tactical (taktikai), mental (mentális), academic (tanulmányi)
--    - Szintek: 1-10 skálán jelenlegi és cél szintek meghatározása
--    - Státusz követés: active, completed, paused, cancelled
--
-- 2. KÉPESSÉGEK ÉRTÉKELÉSE (skills_assessments)
--    - Rendszeres képesség felmérések dokumentálása
--    - Kategóriánkénti bontás (pl. labdakezelés, gyorsaság, kitartás)
--    - 1-10 pontos értékelési rendszer
--    - Fejlesztési javaslatok rögzítése
--
-- 3. FEJLESZTÉSI MÉRFÖLDKÖVEK (development_milestones)
--    - Konkrét célok és határidők meghatározása
--    - Teljesítés követése és dokumentálása
--    - Eredmények és tapasztalatok rögzítése
--
-- 4. FOLYAMATOS HALADÁS KÖVETÉSE (progress_tracking)
--    - Heti/havi előrehaladás dokumentálása
--    - Kihívások és megoldások rögzítése
--    - Játékos önértékelés és szülői visszajelzés
--    - Edzői értékelés és következő lépések
--
-- TIPIKUS LEKÉRDEZÉSI MINTÁK:
-- - Aktív tervek játékosonként és szezonra
-- - Képességek fejlődése időben
-- - Mérföldkövek teljesítési aránya
-- - Csapat szintű fejlesztési statisztikák