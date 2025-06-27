# Match Statistics System - Usage Documentation

## Overview
The Match Statistics System provides comprehensive tracking and analysis of football matches, player performance, team statistics, and automated seasonal reporting.

## Database Schema Components

### 1. Matches (`matches`)
**Purpose**: Core match information including teams, scores, and match metadata.

**Key Features**:
- Home/away team tracking with score recording
- Match types: friendly, league, cup, tournament
- Match status: scheduled, ongoing, finished, cancelled, postponed
- Season-based organization
- Venue and referee information

**Common Use Cases**:
```sql
-- Create a new league match
INSERT INTO matches (
    home_team_id, away_team_id, match_date, match_time, 
    match_type, season, venue, created_by
) VALUES (
    1, 2, '2024-11-15', '15:00', 'league', '2024/25', 
    'Camp Nou', 1
);

-- Update match result
UPDATE matches 
SET home_score = 3, away_score = 1, match_status = 'finished' 
WHERE id = 1;

-- Get upcoming matches
SELECT m.*, ht.name as home_team, at.name as away_team
FROM matches m
JOIN teams ht ON m.home_team_id = ht.id
JOIN teams at ON m.away_team_id = at.id
WHERE m.match_status = 'scheduled' 
AND m.match_date >= DATE('now')
ORDER BY m.match_date, m.match_time;
```

### 2. Player Match Performance (`player_match_performance`)
**Purpose**: Detailed individual player statistics for each match.

**Key Features**:
- Playing time tracking (starter, substitution minutes)
- Performance metrics (goals, assists, cards, shots, passes)
- Physical data (distance covered, top speed)
- Rating system (coach and player self-assessment)
- Position tracking

**Common Use Cases**:
```sql
-- Record player performance
INSERT INTO player_match_performance (
    match_id, player_id, team_id, position, minutes_played, 
    starter, goals, assists, shots_total, shots_on_target,
    passes_completed, passes_attempted, performance_rating,
    coach_notes
) VALUES (
    1, 5, 1, 'Forward', 90, 1, 2, 1, 6, 4, 
    45, 52, 8.5, 'Excellent performance, clinical finishing'
);

-- Get player's match history
SELECT 
    m.match_date,
    ht.name as home_team,
    at.name as away_team,
    pmp.goals,
    pmp.assists,
    pmp.minutes_played,
    pmp.performance_rating
FROM player_match_performance pmp
JOIN matches m ON pmp.match_id = m.id
JOIN teams ht ON m.home_team_id = ht.id
JOIN teams at ON m.away_team_id = at.id
WHERE pmp.player_id = 5
ORDER BY m.match_date DESC;

-- Calculate player efficiency metrics
SELECT 
    p.name,
    COUNT(pmp.match_id) as matches,
    SUM(pmp.goals) as total_goals,
    SUM(pmp.assists) as total_assists,
    AVG(pmp.performance_rating) as avg_rating,
    ROUND(SUM(pmp.goals) * 1.0 / COUNT(pmp.match_id), 2) as goals_per_match,
    ROUND(SUM(pmp.shots_on_target) * 100.0 / NULLIF(SUM(pmp.shots_total), 0), 1) as shot_accuracy
FROM players p
JOIN player_match_performance pmp ON p.id = pmp.player_id
JOIN matches m ON pmp.match_id = m.id
WHERE m.match_status = 'finished'
GROUP BY p.id, p.name
ORDER BY total_goals DESC;
```

### 3. Match Events (`match_events`)
**Purpose**: Timeline of significant match events with precise timing.

**Key Features**:
- Event types: goal, assist, yellow_card, red_card, substitution_in, substitution_out, injury, penalty, own_goal
- Minute-by-minute tracking
- Player associations and assist tracking
- Substitution pair recording

**Common Use Cases**:
```sql
-- Record a goal with assist
INSERT INTO match_events (
    match_id, player_id, team_id, event_type, event_minute, 
    assisted_by_player_id, event_description
) VALUES (
    1, 5, 1, 'goal', 23, 7, 'Beautiful curled shot into top corner'
);

-- Record a substitution
INSERT INTO match_events (
    match_id, player_id, team_id, event_type, event_minute, 
    substituted_player_id
) VALUES (
    1, 12, 1, 'substitution_in', 67, 5
);

-- Get match timeline
SELECT 
    me.event_minute,
    me.event_type,
    p.name as player,
    t.name as team,
    me.event_description,
    ap.name as assisted_by
FROM match_events me
JOIN players p ON me.player_id = p.id
JOIN teams t ON me.team_id = t.id
LEFT JOIN players ap ON me.assisted_by_player_id = ap.id
WHERE me.match_id = 1
ORDER BY me.event_minute;
```

### 4. Team Match Statistics (`team_match_statistics`)
**Purpose**: Aggregate team performance metrics for tactical analysis.

**Key Features**:
- Possession percentage and ball control metrics
- Shooting statistics (total shots, on target)
- Set piece tracking (corners, free kicks, throw-ins)
- Formation and tactical notes
- Defensive metrics (fouls, offsides)

**Common Use Cases**:
```sql
-- Record team statistics
INSERT INTO team_match_statistics (
    match_id, team_id, possession_percentage, shots_total, 
    shots_on_target, corners, fouls, passes_completed, 
    passes_attempted, formation, tactical_notes
) VALUES (
    1, 1, 68, 14, 8, 7, 12, 456, 523, 
    '4-3-3', 'High pressing worked well, dominated midfield'
);

-- Compare team performance in a match
SELECT 
    t.name as team,
    tms.possession_percentage,
    tms.shots_total,
    tms.shots_on_target,
    ROUND(tms.shots_on_target * 100.0 / tms.shots_total, 1) as shot_accuracy,
    tms.passes_completed,
    tms.passes_attempted,
    ROUND(tms.passes_completed * 100.0 / tms.passes_attempted, 1) as pass_accuracy,
    tms.formation
FROM team_match_statistics tms
JOIN teams t ON tms.team_id = t.id
WHERE tms.match_id = 1;
```

### 5. Season Statistics (`season_statistics`)
**Purpose**: Automated aggregation of player performance across a season.

**Key Features**:
- Automatic updates via database triggers
- Season-long totals and averages
- Position tracking and versatility metrics
- Physical performance summaries

**Common Use Cases**:
```sql
-- Get current season player rankings
SELECT 
    p.name,
    ss.matches_played,
    ss.goals,
    ss.assists,
    ss.average_rating,
    ROUND(ss.goals * 1.0 / ss.matches_played, 2) as goals_per_match,
    ROUND(ss.minutes_played / ss.matches_played, 0) as avg_minutes
FROM season_statistics ss
JOIN players p ON ss.player_id = p.id
WHERE ss.season = '2024/25'
ORDER BY ss.goals DESC, ss.assists DESC;

-- Compare player development across seasons
SELECT 
    p.name,
    ss.season,
    ss.goals,
    ss.assists,
    ss.average_rating,
    ss.matches_played
FROM season_statistics ss
JOIN players p ON ss.player_id = p.id
WHERE p.id = 5
ORDER BY ss.season DESC;
```

## Predefined Views for Easy Access

### 1. Top Scorers (`top_scorers`)
```sql
-- Get current top scorers
SELECT * FROM top_scorers LIMIT 10;
```

### 2. Team Performance (`team_performance`)
```sql
-- Get league table-style team rankings
SELECT * FROM team_performance ORDER BY wins DESC, goals_for DESC;
```

### 3. Match Results (`match_results`)
```sql
-- Get recent match results
SELECT * FROM match_results WHERE match_status = 'finished' LIMIT 10;
```

### 4. Player Season Performance (`player_season_performance`)
```sql
-- Get comprehensive player season statistics
SELECT * FROM player_season_performance 
WHERE season = '2024/25' 
ORDER BY goals DESC;
```

## Advanced Analytics Queries

### Player Performance Analysis
```sql
-- Find most consistent performers (low standard deviation in ratings)
SELECT 
    p.name,
    COUNT(pmp.match_id) as matches,
    AVG(pmp.performance_rating) as avg_rating,
    MIN(pmp.performance_rating) as min_rating,
    MAX(pmp.performance_rating) as max_rating,
    ROUND(
        SQRT(
            AVG(pmp.performance_rating * pmp.performance_rating) - 
            AVG(pmp.performance_rating) * AVG(pmp.performance_rating)
        ), 2
    ) as rating_std_dev
FROM players p
JOIN player_match_performance pmp ON p.id = pmp.player_id
JOIN matches m ON pmp.match_id = m.id
WHERE m.match_status = 'finished'
GROUP BY p.id, p.name
HAVING matches >= 5
ORDER BY rating_std_dev ASC;
```

### Team Tactical Analysis
```sql
-- Analyze formation effectiveness
SELECT 
    tms.formation,
    COUNT(*) as matches_played,
    AVG(tms.possession_percentage) as avg_possession,
    AVG(tms.shots_total) as avg_shots,
    SUM(CASE WHEN (m.home_team_id = tms.team_id AND m.home_score > m.away_score) OR 
                  (m.away_team_id = tms.team_id AND m.away_score > m.home_score) THEN 1 ELSE 0 END) as wins,
    ROUND(
        SUM(CASE WHEN (m.home_team_id = tms.team_id AND m.home_score > m.away_score) OR 
                      (m.away_team_id = tms.team_id AND m.away_score > m.home_score) THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1
    ) as win_percentage
FROM team_match_statistics tms
JOIN matches m ON tms.match_id = m.id
WHERE m.match_status = 'finished' AND tms.formation IS NOT NULL
GROUP BY tms.formation
ORDER BY win_percentage DESC;
```

### Match Impact Analysis
```sql
-- Find game-changing moments (goals scored in different time periods)
SELECT 
    CASE 
        WHEN event_minute <= 15 THEN 'Early (0-15 min)'
        WHEN event_minute <= 30 THEN 'First Half Early (16-30 min)'
        WHEN event_minute <= 45 THEN 'First Half Late (31-45 min)'
        WHEN event_minute <= 60 THEN 'Second Half Early (46-60 min)'
        WHEN event_minute <= 75 THEN 'Second Half Mid (61-75 min)'
        ELSE 'Second Half Late (76+ min)'
    END as time_period,
    COUNT(*) as goals_scored,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM match_events WHERE event_type = 'goal'), 1) as percentage
FROM match_events
WHERE event_type = 'goal'
GROUP BY 
    CASE 
        WHEN event_minute <= 15 THEN 'Early (0-15 min)'
        WHEN event_minute <= 30 THEN 'First Half Early (16-30 min)'
        WHEN event_minute <= 45 THEN 'First Half Late (31-45 min)'
        WHEN event_minute <= 60 THEN 'Second Half Early (46-60 min)'
        WHEN event_minute <= 75 THEN 'Second Half Mid (61-75 min)'
        ELSE 'Second Half Late (76+ min)'
    END
ORDER BY goals_scored DESC;
```

## Performance Optimizations

### Indexes
The schema includes comprehensive indexing for optimal query performance:
- Single column indexes on frequently queried fields
- Composite indexes for common query patterns
- Date-based indexes for temporal queries
- Foreign key indexes for join optimization

### Triggers
Automatic season statistics updates ensure data consistency:
- `update_season_stats_after_match`: Updates when new performance data is inserted
- `update_season_stats_after_match_update`: Updates when performance data is modified

## Best Practices

### Data Entry
1. **Match Creation**: Create matches before recording performance data
2. **Status Management**: Update match status as matches progress
3. **Performance Recording**: Enter player performance immediately after matches
4. **Event Timing**: Record events with accurate minute timestamps

### Data Integrity
1. **Validation**: Use CHECK constraints for data validation
2. **Relationships**: Maintain proper foreign key relationships
3. **Triggers**: Let automatic triggers handle aggregations
4. **Consistency**: Ensure team assignments match match participants

### Query Performance
1. **Use Views**: Leverage predefined views for common queries
2. **Index Usage**: Structure queries to utilize existing indexes
3. **Date Ranges**: Use date indexes for temporal queries
4. **Aggregations**: Consider pre-computed season statistics for performance

This comprehensive match statistics system enables football academies to track detailed performance metrics, analyze tactical patterns, and identify player development trends through sophisticated data analysis capabilities.