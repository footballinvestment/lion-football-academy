/**
 * Database Schema Update Script
 * Updates the database schema to support all advanced features
 */

const db = require('./src/database/connection');

class DatabaseSchemaUpdater {
    constructor() {
        this.updates = [];
    }

    async updateSchema() {
        console.log('🔧 UPDATING DATABASE SCHEMA');
        console.log('='.repeat(40));

        try {
            // 1. Add missing columns to existing tables
            await this.addMissingColumns();
            
            // 2. Create missing tables
            await this.createMissingTables();
            
            // 3. Create indexes for performance
            await this.createIndexes();
            
            // 4. Update matches table schema to allow external teams
            await this.updateMatchesTableForExternalTeams();
            
            console.log('\n✅ Schema update completed successfully!');
            console.log(`📊 Applied ${this.updates.length} updates`);
            
        } catch (error) {
            console.error('❌ Schema update failed:', error);
            throw error;
        }
    }

    async addMissingColumns() {
        console.log('\n📋 Adding missing columns...');

        const columnUpdates = [
            {
                table: 'teams',
                column: 'coach_id',
                type: 'INTEGER',
                constraint: 'REFERENCES users(id)'
            },
            {
                table: 'players',
                column: 'parent_id',
                type: 'INTEGER',
                constraint: 'REFERENCES users(id)'
            },
            {
                table: 'players',
                column: 'jersey_number',
                type: 'INTEGER'
            },
            {
                table: 'players',
                column: 'height_cm',
                type: 'INTEGER'
            },
            {
                table: 'players',
                column: 'weight_kg',
                type: 'INTEGER'
            }
        ];

        for (const update of columnUpdates) {
            try {
                const query = `ALTER TABLE ${update.table} ADD COLUMN ${update.column} ${update.type} ${update.constraint || ''}`;
                await db.run(query);
                this.updates.push(`Added ${update.column} to ${update.table}`);
                console.log(`   ✅ Added ${update.column} to ${update.table}`);
            } catch (error) {
                if (error.message.includes('duplicate column name')) {
                    console.log(`   ⚠️  Column ${update.column} already exists in ${update.table}`);
                } else {
                    console.log(`   ❌ Failed to add ${update.column} to ${update.table}: ${error.message}`);
                }
            }
        }
    }

    async createMissingTables() {
        console.log('\n🗄️  Creating missing tables...');

        const tables = [
            {
                name: 'injuries',
                sql: `
                    CREATE TABLE IF NOT EXISTS injuries (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        player_id INTEGER NOT NULL,
                        injury_type TEXT NOT NULL,
                        injury_severity TEXT NOT NULL DEFAULT 'minor',
                        injury_location TEXT NOT NULL,
                        injury_date DATE NOT NULL,
                        expected_recovery_date DATE,
                        actual_recovery_date DATE,
                        injury_mechanism TEXT DEFAULT 'training',
                        description TEXT NOT NULL,
                        initial_treatment TEXT,
                        follow_up_required BOOLEAN DEFAULT 0,
                        return_to_play_protocol TEXT,
                        medical_clearance_required BOOLEAN DEFAULT 1,
                        status TEXT DEFAULT 'active',
                        recovery_notes TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
                    )
                `
            },
            {
                name: 'development_plans',
                sql: `
                    CREATE TABLE IF NOT EXISTS development_plans (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        player_id INTEGER NOT NULL,
                        plan_type TEXT NOT NULL DEFAULT 'individual',
                        target_skills TEXT NOT NULL,
                        goals TEXT NOT NULL,
                        timeline TEXT NOT NULL DEFAULT '3 months',
                        priority TEXT NOT NULL DEFAULT 'medium',
                        season TEXT NOT NULL,
                        specific_objectives TEXT NOT NULL,
                        success_metrics TEXT NOT NULL,
                        coach_notes TEXT,
                        progress_percentage INTEGER DEFAULT 0,
                        status TEXT DEFAULT 'active',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
                    )
                `
            },
            {
                name: 'skills_assessments',
                sql: `
                    CREATE TABLE IF NOT EXISTS skills_assessments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        player_id INTEGER NOT NULL,
                        assessment_date DATE NOT NULL,
                        assessor_id INTEGER,
                        skills_data TEXT NOT NULL,
                        general_notes TEXT,
                        overall_score REAL,
                        technical_score REAL,
                        tactical_score REAL,
                        physical_score REAL,
                        mental_score REAL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
                        FOREIGN KEY (assessor_id) REFERENCES users(id)
                    )
                `
            },
            {
                name: 'medical_records',
                sql: `
                    CREATE TABLE IF NOT EXISTS medical_records (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        player_id INTEGER NOT NULL,
                        record_type TEXT NOT NULL DEFAULT 'health_check',
                        record_date DATE NOT NULL,
                        examiner_name TEXT,
                        findings TEXT,
                        recommendations TEXT,
                        clearance_status TEXT DEFAULT 'cleared',
                        next_checkup_date DATE,
                        notes TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
                    )
                `
            },
            {
                name: 'progress_tracking',
                sql: `
                    CREATE TABLE IF NOT EXISTS progress_tracking (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        development_plan_id INTEGER NOT NULL,
                        progress_date DATE NOT NULL,
                        progress_percentage INTEGER NOT NULL,
                        milestone_achieved TEXT,
                        notes TEXT,
                        recorded_by INTEGER,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (development_plan_id) REFERENCES development_plans(id) ON DELETE CASCADE,
                        FOREIGN KEY (recorded_by) REFERENCES users(id)
                    )
                `
            },
            {
                name: 'development_milestones',
                sql: `
                    CREATE TABLE IF NOT EXISTS development_milestones (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        development_plan_id INTEGER NOT NULL,
                        milestone_name TEXT NOT NULL,
                        milestone_description TEXT,
                        target_date DATE,
                        completion_date DATE,
                        status TEXT DEFAULT 'pending',
                        achievement_notes TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (development_plan_id) REFERENCES development_plans(id) ON DELETE CASCADE
                    )
                `
            }
        ];

        for (const table of tables) {
            try {
                await db.run(table.sql);
                this.updates.push(`Created table ${table.name}`);
                console.log(`   ✅ Created table ${table.name}`);
            } catch (error) {
                console.log(`   ❌ Failed to create table ${table.name}: ${error.message}`);
            }
        }
    }

    async createIndexes() {
        console.log('\n📊 Creating performance indexes...');

        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id)',
            'CREATE INDEX IF NOT EXISTS idx_players_parent_id ON players(parent_id)',
            'CREATE INDEX IF NOT EXISTS idx_teams_coach_id ON teams(coach_id)',
            'CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date)',
            'CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season)',
            'CREATE INDEX IF NOT EXISTS idx_injuries_player_id ON injuries(player_id)',
            'CREATE INDEX IF NOT EXISTS idx_injuries_status ON injuries(status)',
            'CREATE INDEX IF NOT EXISTS idx_development_plans_player_id ON development_plans(player_id)',
            'CREATE INDEX IF NOT EXISTS idx_skills_assessments_player_id ON skills_assessments(player_id)',
            'CREATE INDEX IF NOT EXISTS idx_medical_records_player_id ON medical_records(player_id)'
        ];

        for (const indexSql of indexes) {
            try {
                await db.run(indexSql);
                const indexName = indexSql.match(/idx_\w+/)[0];
                this.updates.push(`Created index ${indexName}`);
                console.log(`   ✅ Created index ${indexName}`);
            } catch (error) {
                console.log(`   ❌ Failed to create index: ${error.message}`);
            }
        }
    }

    async validateUpdates() {
        console.log('\n🔍 Validating schema updates...');

        // Check if all required tables exist
        const requiredTables = [
            'users', 'teams', 'players', 'trainings', 'matches',
            'attendance', 'announcements', 'player_match_performance',
            'match_events', 'team_match_statistics', 'injuries',
            'development_plans', 'skills_assessments', 'medical_records'
        ];

        let validationPassed = true;

        for (const table of requiredTables) {
            try {
                await db.query(`SELECT 1 FROM ${table} LIMIT 1`);
                console.log(`   ✅ Table ${table} validated`);
            } catch (error) {
                console.log(`   ❌ Table ${table} validation failed`);
                validationPassed = false;
            }
        }

        // Check if key columns exist
        const columnChecks = [
            { table: 'teams', column: 'coach_id' },
            { table: 'players', column: 'parent_id' }
        ];

        for (const check of columnChecks) {
            try {
                await db.query(`SELECT ${check.column} FROM ${check.table} LIMIT 1`);
                console.log(`   ✅ Column ${check.table}.${check.column} validated`);
            } catch (error) {
                console.log(`   ❌ Column ${check.table}.${check.column} validation failed`);
                validationPassed = false;
            }
        }

        return validationPassed;
    }

    async updateMatchesTableForExternalTeams() {
        console.log('\n🔄 Updating matches table for external teams...');
        
        try {
            // Add columns for team names to support external teams
            const matchColumns = [
                {
                    table: 'matches',
                    column: 'home_team_name',
                    type: 'TEXT'
                },
                {
                    table: 'matches',
                    column: 'away_team_name',
                    type: 'TEXT'
                }
            ];

            for (const update of matchColumns) {
                try {
                    const query = `ALTER TABLE ${update.table} ADD COLUMN ${update.column} ${update.type}`;
                    await db.run(query);
                    this.updates.push(`Added ${update.column} to ${update.table}`);
                    console.log(`   ✅ Added ${update.column} to ${update.table}`);
                } catch (error) {
                    if (error.message.includes('duplicate column name')) {
                        console.log(`   ⚠️  Column ${update.column} already exists in ${update.table}`);
                    } else {
                        console.log(`   ❌ Failed to add ${update.column} to ${update.table}: ${error.message}`);
                    }
                }
            }
            
            // Create external teams table for better tracking
            try {
                const externalTeamsTable = `
                    CREATE TABLE IF NOT EXISTS external_teams (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        age_group TEXT NOT NULL,
                        venue TEXT,
                        contact_info TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `;
                await db.run(externalTeamsTable);
                this.updates.push('Created external_teams table');
                console.log('   ✅ Created external_teams table');
            } catch (error) {
                console.log(`   ❌ Failed to create external_teams table: ${error.message}`);
            }
            
        } catch (error) {
            console.log(`   ❌ Failed to update matches table: ${error.message}`);
        }
    }
}

// Main execution
async function main() {
    const updater = new DatabaseSchemaUpdater();
    
    try {
        await updater.updateSchema();
        
        const isValid = await updater.validateUpdates();
        
        if (isValid) {
            console.log('\n🎉 Database schema successfully updated and validated!');
        } else {
            console.log('\n⚠️  Schema update completed but validation failed');
        }
        
    } catch (error) {
        console.error('Schema update failed:', error);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = DatabaseSchemaUpdater;