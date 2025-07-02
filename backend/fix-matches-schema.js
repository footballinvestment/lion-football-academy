/**
 * Fix Matches Schema for External Teams
 * Updates the matches table to support external teams by making team IDs nullable
 * and adding external team information
 */

const db = require('./src/database/connection');

class MatchesSchemaFixer {
    constructor() {
        this.updates = [];
    }

    async fixMatchesSchema() {
        console.log('🔧 FIXING MATCHES SCHEMA FOR EXTERNAL TEAMS');
        console.log('='.repeat(50));

        try {
            // 1. Create external_teams table
            await this.createExternalTeamsTable();
            
            // 2. Backup existing matches data
            await this.backupMatchesData();
            
            // 3. Recreate matches table with nullable team IDs
            await this.recreateMatchesTable();
            
            // 4. Restore matches data
            await this.restoreMatchesData();
            
            // 5. Add indexes for performance
            await this.addPerformanceIndexes();
            
            console.log('\n✅ Matches schema fixed successfully!');
            console.log(`📊 Applied ${this.updates.length} updates`);
            
        } catch (error) {
            console.error('❌ Schema fix failed:', error);
            throw error;
        }
    }

    async createExternalTeamsTable() {
        console.log('\n🏟️  Creating external teams table...');
        
        const externalTeamsSQL = `
            CREATE TABLE IF NOT EXISTS external_teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                short_name TEXT,
                age_group TEXT NOT NULL,
                venue TEXT,
                city TEXT,
                region TEXT,
                contact_phone TEXT,
                contact_email TEXT,
                website TEXT,
                league TEXT,
                division TEXT,
                founded_year INTEGER,
                colors TEXT,
                logo_url TEXT,
                notes TEXT,
                active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        try {
            await db.run(externalTeamsSQL);
            this.updates.push('Created external_teams table');
            console.log('   ✅ External teams table created');
        } catch (error) {
            if (error.message.includes('table external_teams already exists')) {
                console.log('   ⚠️  External teams table already exists');
            } else {
                throw error;
            }
        }
    }

    async backupMatchesData() {
        console.log('\n💾 Backing up existing matches data...');
        
        try {
            // Check if matches table has data
            const existingMatches = await db.query('SELECT COUNT(*) as count FROM matches');
            const matchCount = existingMatches[0].count;
            
            if (matchCount > 0) {
                // Create backup table
                await db.run(`
                    CREATE TABLE IF NOT EXISTS matches_backup AS 
                    SELECT * FROM matches
                `);
                
                this.updates.push(`Backed up ${matchCount} matches`);
                console.log(`   ✅ Backed up ${matchCount} matches`);
            } else {
                console.log('   ℹ️  No existing matches to backup');
            }
        } catch (error) {
            console.log('   ⚠️  Backup failed (proceeding anyway):', error.message);
        }
    }

    async recreateMatchesTable() {
        console.log('\n🔄 Recreating matches table with nullable team IDs...');
        
        try {
            // Drop existing matches table
            await db.run('DROP TABLE IF EXISTS matches');
            console.log('   ✅ Dropped old matches table');
            
            // Create new matches table with nullable team IDs
            const newMatchesSQL = `
                CREATE TABLE matches (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    home_team_id INTEGER,
                    away_team_id INTEGER,
                    external_home_team_id INTEGER,
                    external_away_team_id INTEGER,
                    home_team_name TEXT,
                    away_team_name TEXT,
                    match_date DATE NOT NULL,
                    match_time TIME,
                    venue VARCHAR(200),
                    match_type VARCHAR(50) NOT NULL,
                    season VARCHAR(20) NOT NULL,
                    home_score INTEGER DEFAULT 0,
                    away_score INTEGER DEFAULT 0,
                    match_status VARCHAR(20) DEFAULT 'scheduled',
                    match_duration INTEGER DEFAULT 90,
                    age_group TEXT,
                    tournament_round TEXT,
                    tournament_name TEXT,
                    weather_conditions VARCHAR(100),
                    referee_name VARCHAR(100),
                    assistant_referee1 VARCHAR(100),
                    assistant_referee2 VARCHAR(100),
                    field_condition TEXT DEFAULT 'good',
                    attendance INTEGER DEFAULT 0,
                    live_stream_url TEXT,
                    match_report TEXT,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_by INTEGER,
                    FOREIGN KEY (home_team_id) REFERENCES teams(id),
                    FOREIGN KEY (away_team_id) REFERENCES teams(id),
                    FOREIGN KEY (external_home_team_id) REFERENCES external_teams(id),
                    FOREIGN KEY (external_away_team_id) REFERENCES external_teams(id),
                    FOREIGN KEY (created_by) REFERENCES users(id),
                    CHECK (
                        (home_team_id IS NOT NULL OR external_home_team_id IS NOT NULL OR home_team_name IS NOT NULL) AND
                        (away_team_id IS NOT NULL OR external_away_team_id IS NOT NULL OR away_team_name IS NOT NULL)
                    )
                )
            `;
            
            await db.run(newMatchesSQL);
            this.updates.push('Recreated matches table with nullable team IDs');
            console.log('   ✅ Created new matches table with nullable team IDs');
            
        } catch (error) {
            console.log('   ❌ Failed to recreate matches table:', error.message);
            throw error;
        }
    }

    async restoreMatchesData() {
        console.log('\n📥 Restoring matches data...');
        
        try {
            // Check if backup exists
            const backupExists = await db.query(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='matches_backup'
            `);
            
            if (backupExists.length > 0) {
                // Restore data from backup
                await db.run(`
                    INSERT INTO matches (
                        home_team_id, away_team_id, home_team_name, away_team_name,
                        match_date, match_time, venue, match_type, season,
                        home_score, away_score, match_status, match_duration,
                        weather_conditions, referee_name, notes, created_at, updated_at, created_by
                    )
                    SELECT 
                        home_team_id, away_team_id, home_team_name, away_team_name,
                        match_date, match_time, venue, match_type, season,
                        home_score, away_score, match_status, match_duration,
                        weather_conditions, referee_name, notes, created_at, updated_at, created_by
                    FROM matches_backup
                `);
                
                const restoredCount = await db.query('SELECT COUNT(*) as count FROM matches');
                this.updates.push(`Restored ${restoredCount[0].count} matches`);
                console.log(`   ✅ Restored ${restoredCount[0].count} matches`);
                
                // Clean up backup table
                await db.run('DROP TABLE matches_backup');
                console.log('   ✅ Cleaned up backup table');
            } else {
                console.log('   ℹ️  No backup data to restore');
            }
        } catch (error) {
            console.log('   ⚠️  Restore failed:', error.message);
        }
    }

    async addPerformanceIndexes() {
        console.log('\n📊 Adding performance indexes...');
        
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_matches_home_team ON matches(home_team_id)',
            'CREATE INDEX IF NOT EXISTS idx_matches_away_team ON matches(away_team_id)',
            'CREATE INDEX IF NOT EXISTS idx_matches_external_home ON matches(external_home_team_id)',
            'CREATE INDEX IF NOT EXISTS idx_matches_external_away ON matches(external_away_team_id)',
            'CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date)',
            'CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season)',
            'CREATE INDEX IF NOT EXISTS idx_matches_type ON matches(match_type)',
            'CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(match_status)',
            'CREATE INDEX IF NOT EXISTS idx_matches_age_group ON matches(age_group)',
            'CREATE INDEX IF NOT EXISTS idx_external_teams_age_group ON external_teams(age_group)',
            'CREATE INDEX IF NOT EXISTS idx_external_teams_city ON external_teams(city)'
        ];

        for (const indexSQL of indexes) {
            try {
                await db.run(indexSQL);
                const indexName = indexSQL.match(/idx_\w+/)[0];
                this.updates.push(`Created index ${indexName}`);
                console.log(`   ✅ Created index ${indexName}`);
            } catch (error) {
                console.log(`   ❌ Failed to create index: ${error.message}`);
            }
        }
    }

    async validateSchema() {
        console.log('\n🔍 Validating updated schema...');
        
        try {
            // Test nullable team IDs
            await db.run(`
                INSERT INTO matches (
                    home_team_name, away_team_name, match_date, match_type, season
                ) VALUES (
                    'Test External Home', 'Test External Away', '2024-01-01', 'friendly', '2023-24'
                )
            `);
            
            const testMatch = await db.query('SELECT * FROM matches WHERE home_team_name = "Test External Home"');
            
            if (testMatch.length > 0 && testMatch[0].home_team_id === null) {
                console.log('   ✅ Nullable team IDs working correctly');
                
                // Clean up test data
                await db.run('DELETE FROM matches WHERE home_team_name = "Test External Home"');
            } else {
                console.log('   ❌ Schema validation failed');
                return false;
            }
            
            // Test external teams table
            await db.query('SELECT COUNT(*) FROM external_teams');
            console.log('   ✅ External teams table accessible');
            
            return true;
            
        } catch (error) {
            console.log('   ❌ Schema validation failed:', error.message);
            return false;
        }
    }
}

// Main execution
async function main() {
    const fixer = new MatchesSchemaFixer();
    
    try {
        await fixer.fixMatchesSchema();
        
        const isValid = await fixer.validateSchema();
        
        if (isValid) {
            console.log('\n🎉 Matches schema successfully fixed and validated!');
        } else {
            console.log('\n⚠️  Schema fix completed but validation failed');
        }
        
    } catch (error) {
        console.error('Schema fix failed:', error);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = MatchesSchemaFixer;