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

-- Performance optimizations - Indexek
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

-- Composite indexes for common queries
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
END;

-- HASZNÁLATI ESETEK ÉS DOKUMENTÁCIÓ
-- 
-- 1. MÉRKŐZÉSEK KEZELÉSE (matches)
--    - Célja: Mérkőzések alapadatainak tárolása (hazai/vendég csapat, eredmény, időpont)
--    - Típusok: friendly (barátságos), league (bajnoki), cup (kupa), tournament (torna)
--    - Státuszok: scheduled, ongoing, finished, cancelled, postponed
--    - Szezonális csoportosítás és eredménykövetés
--
-- 2. JÁTÉKOS TELJESÍTMÉNY (player_match_performance)
--    - Részletes mérkőzés statisztikák játékosonként
--    - Gólok, gólpasszok, játékidő, értékelések
--    - Fizikai adatok: megtett távolság, sebességmérés
--    - Edző és játékos önértékelés rendszer
--
-- 3. MÉRKŐZÉS ESEMÉNYEK (match_events)
--    - Időzített események követése (gólok, lapok, cserék)
--    - Assziszt adatok és játékoskapcsolatok
--    - Sérülések és különleges események
--
-- 4. CSAPAT STATISZTIKÁK (team_match_statistics)
--    - Csapat szintű teljesítménymutatók
--    - Labdabirtoklás, lövések, passzmunka
--    - Taktikai elemzés és formációkövetés
--
-- 5. SZEZONÁLIS ÖSSZESÍTŐK (season_statistics)
--    - Automatikus aggregáció triggerekkel
--    - Játékos karrierstatisztikák
--    - Pozíciók és teljesítménytrendek
--
-- TIPIKUS LEKÉRDEZÉSI MINTÁK:
-- - Góllövő listák és asszisztadók
-- - Csapat ligatabella és eredmények
-- - Játékos szezonális teljesítmény
-- - Mérkőzés részletes elemzések