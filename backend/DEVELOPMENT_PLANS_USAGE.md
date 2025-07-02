# Individual Development Plans - Usage Documentation

## Overview
The Individual Development Plans (IDP) system provides comprehensive tracking and management of player development across multiple dimensions: technical, physical, tactical, mental, and academic growth.

## Database Schema Components

### 1. Development Plans (`development_plans`)
**Purpose**: Core development plans for individual players across different skill areas.

**Key Features**:
- 5 plan types: technical, physical, tactical, mental, academic
- Level tracking (1-10 scale) from current to target
- Status management: active, completed, paused, cancelled
- Progress percentage tracking (0-100%)
- Coach and parent feedback integration

**Common Use Cases**:
```sql
-- Create a technical development plan
INSERT INTO development_plans (
    player_id, season, plan_type, current_level, target_level, 
    goals, action_steps, created_by
) VALUES (
    1, '2024/25', 'technical', 6, 8,
    'Improve ball control and first touch in pressure situations',
    'Daily juggling (50+ touches), cone drills, 1v1 practice, wall passes',
    1
);

-- Get all active plans for a player
SELECT * FROM development_plans 
WHERE player_id = 1 AND status = 'active'
ORDER BY plan_type;

-- Update plan progress
UPDATE development_plans 
SET completion_percentage = 45, progress_notes = 'Significant improvement in training'
WHERE id = 1;
```

### 2. Skills Assessments (`skills_assessments`)
**Purpose**: Regular evaluation of specific skills with scoring and feedback.

**Key Features**:
- Skill categorization (technical, physical, tactical, mental)
- 1-10 scoring system
- Improvement suggestions
- Next assessment scheduling

**Common Use Cases**:
```sql
-- Record initial skills assessment
INSERT INTO skills_assessments (
    player_id, assessment_date, assessed_by, skill_category, 
    skill_name, score, notes, improvement_suggestions
) VALUES (
    1, '2024-06-25', 1, 'technical', 'Ball Control', 6,
    'Good basic skills, struggles under pressure',
    'Practice with defensive pressure, increase tempo in drills'
);

-- Track skill progression over time
SELECT 
    skill_name,
    score,
    assessment_date,
    improvement_suggestions
FROM skills_assessments 
WHERE player_id = 1 AND skill_category = 'technical'
ORDER BY skill_name, assessment_date;

-- Compare assessments across seasons
SELECT 
    skill_name,
    AVG(score) as average_score,
    MIN(score) as lowest_score,
    MAX(score) as highest_score,
    COUNT(*) as total_assessments
FROM skills_assessments 
WHERE player_id = 1 
GROUP BY skill_name
ORDER BY average_score DESC;
```

### 3. Development Milestones (`development_milestones`)
**Purpose**: Specific, measurable goals within development plans.

**Key Features**:
- Target and completion date tracking
- Achievement status monitoring
- Detailed achievement notes

**Common Use Cases**:
```sql
-- Add milestone to development plan
INSERT INTO development_milestones (
    plan_id, milestone_title, description, target_date
) VALUES (
    1, 'Master juggling 100 touches', 
    'Consistent juggling with both feet, thigh, and head', 
    '2024-08-15'
);

-- Mark milestone as achieved
UPDATE development_milestones 
SET achieved = 1, completion_date = '2024-08-10',
    achievement_notes = 'Achieved 120 touches consistently'
WHERE id = 1;

-- Get milestone progress for a plan
SELECT 
    milestone_title,
    target_date,
    completion_date,
    achieved,
    CASE 
        WHEN achieved = 1 THEN 'Completed'
        WHEN target_date < DATE('now') THEN 'Overdue'
        ELSE 'In Progress'
    END as status
FROM development_milestones
WHERE plan_id = 1
ORDER BY target_date;
```

### 4. Progress Tracking (`progress_tracking`)
**Purpose**: Regular monitoring and feedback on development plan progress.

**Key Features**:
- Weekly/monthly progress updates
- Activities completed tracking
- Challenges and solutions documentation
- Multi-stakeholder feedback (coach, player, parent)

**Common Use Cases**:
```sql
-- Record weekly progress
INSERT INTO progress_tracking (
    plan_id, tracking_date, progress_percentage, 
    activities_completed, challenges_faced, next_week_goals,
    coach_feedback, player_self_assessment, recorded_by
) VALUES (
    1, '2024-06-25', 35,
    'Completed daily juggling, attended extra training session',
    'Struggled with consistency in bad weather',
    'Focus on indoor alternatives, increase session frequency',
    'Good improvement visible, maintain motivation',
    7, 1
);

-- Get progress trend for a plan
SELECT 
    tracking_date,
    progress_percentage,
    player_self_assessment,
    coach_feedback
FROM progress_tracking
WHERE plan_id = 1
ORDER BY tracking_date;

-- Calculate average progress rate
SELECT 
    AVG(progress_percentage) as avg_progress,
    AVG(player_self_assessment) as avg_self_assessment,
    COUNT(*) as total_entries
FROM progress_tracking pt
JOIN development_plans dp ON pt.plan_id = dp.id
WHERE dp.player_id = 1 AND dp.status = 'active';
```

## Advanced Queries and Reports

### Player Development Dashboard
```sql
-- Comprehensive player development overview
SELECT 
    p.name as player_name,
    dp.plan_type,
    dp.current_level,
    dp.target_level,
    dp.completion_percentage,
    dp.status,
    COUNT(dm.id) as total_milestones,
    SUM(CASE WHEN dm.achieved = 1 THEN 1 ELSE 0 END) as completed_milestones,
    AVG(pt.progress_percentage) as avg_progress,
    MAX(pt.tracking_date) as last_update
FROM players p
JOIN development_plans dp ON p.id = dp.player_id
LEFT JOIN development_milestones dm ON dp.id = dm.plan_id
LEFT JOIN progress_tracking pt ON dp.id = pt.plan_id
WHERE p.id = 1
GROUP BY dp.id
ORDER BY dp.plan_type;
```

### Team Development Analysis
```sql
-- Team-wide development statistics
SELECT 
    t.name as team_name,
    dp.plan_type,
    COUNT(DISTINCT dp.player_id) as players_with_plans,
    AVG(dp.completion_percentage) as avg_completion,
    COUNT(CASE WHEN dp.status = 'active' THEN 1 END) as active_plans,
    COUNT(CASE WHEN dp.status = 'completed' THEN 1 END) as completed_plans
FROM teams t
JOIN players p ON t.id = p.team_id
JOIN development_plans dp ON p.id = dp.player_id
GROUP BY t.id, dp.plan_type
ORDER BY t.name, dp.plan_type;
```

### Skills Progression Report
```sql
-- Track skill improvement over time
SELECT 
    p.name as player_name,
    sa.skill_category,
    sa.skill_name,
    MIN(sa.score) as initial_score,
    MAX(sa.score) as current_score,
    MAX(sa.score) - MIN(sa.score) as improvement,
    COUNT(*) as assessments_count,
    MAX(sa.assessment_date) as last_assessment
FROM players p
JOIN skills_assessments sa ON p.id = sa.player_id
GROUP BY p.id, sa.skill_category, sa.skill_name
HAVING COUNT(*) > 1
ORDER BY improvement DESC;
```

## Best Practices

### 1. Plan Creation
- Create plans at the beginning of each season
- Set realistic but challenging target levels
- Include specific, measurable goals
- Ensure action steps are detailed and actionable

### 2. Regular Assessments
- Conduct skills assessments monthly
- Use consistent scoring criteria
- Document specific observations and suggestions
- Schedule follow-up assessments

### 3. Milestone Setting
- Break large goals into smaller milestones
- Set realistic but motivating target dates
- Make milestones specific and measurable
- Celebrate milestone achievements

### 4. Progress Tracking
- Update progress weekly or bi-weekly
- Include player self-assessment
- Document both successes and challenges
- Adjust plans based on progress and feedback

### 5. Multi-Stakeholder Involvement
- Include coach observations and feedback
- Encourage parent input and support
- Consider player's own assessment and goals
- Regular review meetings with all stakeholders

## Integration with Existing System

The development plans system integrates seamlessly with:
- **Players**: Direct player association and tracking
- **Users**: Coach and parent involvement in planning and feedback
- **Teams**: Team-based development analysis and reporting
- **Training Records**: Connection to actual training participation and performance

This comprehensive system enables football academies to provide personalized, data-driven development programs that track player growth across all dimensions of football development.