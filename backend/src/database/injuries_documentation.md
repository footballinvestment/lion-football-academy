# Injuries Database Schema Documentation

## Table: `injuries`

Comprehensive injury tracking system for football academy players.

### Primary Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique injury record identifier |
| `player_id` | INTEGER | NOT NULL, FK to players(id) | Reference to the injured player |

### Injury Classification

| Field | Type | Constraints | Description | Examples |
|-------|------|-------------|-------------|----------|
| `injury_type` | VARCHAR(100) | NOT NULL | Type/category of injury | 'Ankle Sprain', 'Hamstring Strain', 'Concussion', 'ACL Tear' |
| `injury_severity` | VARCHAR(20) | NOT NULL, CHECK ('minor', 'moderate', 'severe') | Medical severity classification | 'minor' = 1-7 days, 'moderate' = 1-4 weeks, 'severe' = 1+ months |
| `injury_location` | VARCHAR(100) | NOT NULL | Anatomical location of injury | 'Left Ankle', 'Right Hamstring', 'Head', 'Lower Back' |

### Temporal Information

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `injury_date` | DATE | NOT NULL | Date when the injury occurred |
| `expected_recovery_date` | DATE | NULL | Medical estimate for recovery completion |
| `actual_recovery_date` | DATE | NULL | Actual date when player fully recovered |
| `return_to_play_date` | DATE | NULL | Date when player returned to full training/games |

### Medical Information

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `description` | TEXT | NULL | Detailed description of how injury occurred and symptoms |
| `treatment_plan` | TEXT | NULL | Prescribed treatment and recovery protocol |
| `medical_notes` | TEXT | NULL | Additional medical observations and progress notes |
| `rehabilitation_exercises` | TEXT | NULL | Specific exercises and rehabilitation program |

### Medical Staff

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `doctor_name` | VARCHAR(100) | NULL | Name of treating physician |
| `physiotherapist_name` | VARCHAR(100) | NULL | Assigned physiotherapist or sports therapist |

### Follow-up and Monitoring

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `follow_up_required` | BOOLEAN | DEFAULT 1 | Whether additional follow-up appointments are needed |

### Audit Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last modification timestamp |
| `created_by` | INTEGER | FK to users(id) | User who created the injury record |

## Indexes

- `idx_injuries_player_id`: Fast lookups by player
- `idx_injuries_date`: Query by injury date range
- `idx_injuries_severity`: Filter by severity level
- `idx_injuries_type`: Group by injury type
- `idx_injuries_recovery_status`: Find active vs recovered injuries

## Foreign Key Relationships

- `player_id` → `players(id)` ON DELETE CASCADE
- `created_by` → `users(id)` ON DELETE SET NULL

## Views (Available in injuries_schema.sql)

### `active_injuries`
Shows all injuries that haven't fully recovered yet (actual_recovery_date IS NULL).

### `injury_statistics`
Provides aggregated statistics by injury type and severity:
- Total cases per injury type/severity
- Average recovery time variance
- Average recovery duration

## Business Rules

1. **Severity Classification:**
   - `minor`: Expected recovery 1-7 days
   - `moderate`: Expected recovery 1-4 weeks  
   - `severe`: Expected recovery 1+ months

2. **Recovery Tracking:**
   - `expected_recovery_date`: Medical professional's estimate
   - `actual_recovery_date`: When symptoms fully resolved
   - `return_to_play_date`: When player resumed full activity

3. **Data Integrity:**
   - Player must exist in players table
   - Injury date cannot be in the future
   - Recovery dates should be after injury date
   - Severity must be one of the three defined values

## Usage Examples

```sql
-- Find all active injuries for a team
SELECT i.*, p.name as player_name 
FROM injuries i 
JOIN players p ON i.player_id = p.id 
WHERE p.team_id = 1 AND i.actual_recovery_date IS NULL;

-- Get injury history for a specific player
SELECT * FROM injuries 
WHERE player_id = 123 
ORDER BY injury_date DESC;

-- Find players with recurring hamstring issues
SELECT p.name, COUNT(*) as hamstring_injuries
FROM injuries i
JOIN players p ON i.player_id = p.id
WHERE i.injury_type LIKE '%Hamstring%'
GROUP BY p.id, p.name
HAVING COUNT(*) > 1;
```