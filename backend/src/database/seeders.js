const db = require('./connection');

/**
 * Database Seeder System
 * Organized data seeding for development and testing
 */
class Seeder {
    constructor() {
        this.seedTable = 'seed_executions';
        this.init();
    }

    /**
     * Initialize seeder system
     */
    async init() {
        try {
            await this.createSeedTable();
        } catch (error) {
            console.error('Failed to initialize seeder system:', error.message);
        }
    }

    /**
     * Create seed tracking table
     */
    async createSeedTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS ${this.seedTable} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                seed_name VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                records_created INTEGER DEFAULT 0,
                success BOOLEAN DEFAULT 1
            )
        `;
        
        await db.run(query);
    }

    /**
     * Check if seed has been executed
     * @param {string} seedName - Seed name
     * @returns {Promise<boolean>} True if executed
     */
    async isSeedExecuted(seedName) {
        try {
            const query = `
                SELECT COUNT(*) as count 
                FROM ${this.seedTable} 
                WHERE seed_name = ? AND success = 1
            `;
            const result = await db.query(query, [seedName]);
            return result[0].count > 0;
        } catch (error) {
            console.error('Failed to check seed status:', error.message);
            return false;
        }
    }

    /**
     * Record seed execution
     * @param {string} seedName - Seed name
     * @param {number} recordsCreated - Number of records created
     * @param {boolean} success - Whether seed succeeded
     */
    async recordSeed(seedName, recordsCreated, success = true) {
        try {
            const query = `
                INSERT OR REPLACE INTO ${this.seedTable} 
                (seed_name, records_created, success)
                VALUES (?, ?, ?)
            `;
            await db.run(query, [seedName, recordsCreated, success]);
        } catch (error) {
            console.error('Failed to record seed:', error.message);
        }
    }

    /**
     * Seed teams data
     * @returns {Promise<number>} Number of teams created
     */
    async seedTeams() {
        const seedName = 'teams';
        
        if (await this.isSeedExecuted(seedName)) {
            console.log('Teams seed already executed');
            return 0;
        }

        try {
            console.log('Seeding teams...');
            
            const teams = [
                {
                    name: 'Lions U8',
                    age_group: 'U8',
                    season: '2024-25',
                    coach_name: 'John Smith',
                    team_color: '#FF6B35'
                },
                {
                    name: 'Lions U10',
                    age_group: 'U10',
                    season: '2024-25',
                    coach_name: 'Sarah Johnson',
                    team_color: '#004E98'
                },
                {
                    name: 'Lions U12',
                    age_group: 'U12',
                    season: '2024-25',
                    coach_name: 'Mike Brown',
                    team_color: '#009F3D'
                },
                {
                    name: 'Lions U14',
                    age_group: 'U14',
                    season: '2024-25',
                    coach_name: 'Lisa Davis',
                    team_color: '#8B1538'
                },
                {
                    name: 'Lions U16',
                    age_group: 'U16',
                    season: '2024-25',
                    coach_name: 'Robert Wilson',
                    team_color: '#FF9500'
                }
            ];

            let created = 0;
            for (const team of teams) {
                const query = `
                    INSERT INTO teams (name, age_group, season, coach_name, team_color)
                    VALUES (?, ?, ?, ?, ?)
                `;
                await db.run(query, [team.name, team.age_group, team.season, team.coach_name, team.team_color]);
                created++;
            }

            await this.recordSeed(seedName, created);
            console.log(`✓ Created ${created} teams`);
            return created;
        } catch (error) {
            await this.recordSeed(seedName, 0, false);
            console.error('Failed to seed teams:', error.message);
            throw error;
        }
    }

    /**
     * Seed sample players
     * @returns {Promise<number>} Number of players created
     */
    async seedPlayers() {
        const seedName = 'players';
        
        if (await this.isSeedExecuted(seedName)) {
            console.log('Players seed already executed');
            return 0;
        }

        try {
            console.log('Seeding players...');
            
            // Get team IDs
            const teams = await db.query('SELECT id, age_group FROM teams ORDER BY id');
            
            const playerTemplates = [
                { name: 'Alex Thompson', position: 'Forward', dominant_foot: 'right' },
                { name: 'Jamie Wilson', position: 'Midfielder', dominant_foot: 'left' },
                { name: 'Sam Rodriguez', position: 'Defender', dominant_foot: 'right' },
                { name: 'Casey Johnson', position: 'Goalkeeper', dominant_foot: 'right' },
                { name: 'Morgan Lee', position: 'Forward', dominant_foot: 'both' },
                { name: 'Taylor Brown', position: 'Midfielder', dominant_foot: 'left' },
                { name: 'Jordan Davis', position: 'Defender', dominant_foot: 'right' },
                { name: 'Riley Garcia', position: 'Forward', dominant_foot: 'right' }
            ];

            let created = 0;
            for (const team of teams) {
                // Create 6-8 players per team
                const numPlayers = Math.floor(Math.random() * 3) + 6;
                
                for (let i = 0; i < numPlayers; i++) {
                    const template = playerTemplates[i % playerTemplates.length];
                    const ageGroup = parseInt(team.age_group.replace('U', ''));
                    const birthYear = new Date().getFullYear() - ageGroup + Math.floor(Math.random() * 2);
                    const birthDate = `${birthYear}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;
                    
                    const query = `
                        INSERT INTO players (
                            name, birth_date, position, dominant_foot, team_id,
                            parent_name, parent_phone, parent_email
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    
                    await db.run(query, [
                        `${template.name} ${i + 1}`,
                        birthDate,
                        template.position,
                        template.dominant_foot,
                        team.id,
                        `Parent of ${template.name} ${i + 1}`,
                        `555-0${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
                        `parent${created + 1}@example.com`
                    ]);
                    created++;
                }
            }

            await this.recordSeed(seedName, created);
            console.log(`✓ Created ${created} players`);
            return created;
        } catch (error) {
            await this.recordSeed(seedName, 0, false);
            console.error('Failed to seed players:', error.message);
            throw error;
        }
    }

    /**
     * Seed training sessions
     * @returns {Promise<number>} Number of training sessions created
     */
    async seedTrainings() {
        const seedName = 'trainings';
        
        if (await this.isSeedExecuted(seedName)) {
            console.log('Trainings seed already executed');
            return 0;
        }

        try {
            console.log('Seeding training sessions...');
            
            const teams = await db.query('SELECT id FROM teams');
            const trainingTypes = ['Technical Skills', 'Physical Conditioning', 'Tactical Training', 'Match Preparation', 'Friendly Match'];
            
            let created = 0;
            for (const team of teams) {
                // Create training sessions for the past 4 weeks and next 2 weeks
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 28);
                
                for (let week = 0; week < 6; week++) {
                    // 2 trainings per week
                    for (let session = 0; session < 2; session++) {
                        const trainingDate = new Date(startDate);
                        trainingDate.setDate(startDate.getDate() + (week * 7) + (session * 3));
                        
                        const type = trainingTypes[Math.floor(Math.random() * trainingTypes.length)];
                        const duration = 60 + Math.floor(Math.random() * 60); // 60-120 minutes
                        
                        const query = `
                            INSERT INTO trainings (
                                date, time, duration, location, type, team_id, training_plan
                            ) VALUES (?, ?, ?, ?, ?, ?, ?)
                        `;
                        
                        await db.run(query, [
                            trainingDate.toISOString().split('T')[0],
                            session === 0 ? '16:00' : '18:00',
                            duration,
                            'Main Training Ground',
                            type,
                            team.id,
                            `${type} session focusing on fundamental skills and team coordination`
                        ]);
                        created++;
                    }
                }
            }

            await this.recordSeed(seedName, created);
            console.log(`✓ Created ${created} training sessions`);
            return created;
        } catch (error) {
            await this.recordSeed(seedName, 0, false);
            console.error('Failed to seed trainings:', error.message);
            throw error;
        }
    }

    /**
     * Seed matches
     * @returns {Promise<number>} Number of matches created
     */
    async seedMatches() {
        const seedName = 'matches';
        
        if (await this.isSeedExecuted(seedName)) {
            console.log('Matches seed already executed');
            return 0;
        }

        try {
            console.log('Seeding matches...');
            
            const teams = await db.query('SELECT id FROM teams');
            const matchTypes = ['friendly', 'league', 'cup'];
            const venues = ['Home Ground', 'Riverside Stadium', 'City Sports Complex', 'Academy Field'];
            
            let created = 0;
            
            // Create matches between teams
            for (let i = 0; i < teams.length; i++) {
                for (let j = i + 1; j < teams.length; j++) {
                    // Each pair plays 2 matches (home and away)
                    for (let match = 0; match < 2; match++) {
                        const matchDate = new Date();
                        matchDate.setDate(matchDate.getDate() - Math.floor(Math.random() * 60) + 30);
                        
                        const homeTeamId = match === 0 ? teams[i].id : teams[j].id;
                        const awayTeamId = match === 0 ? teams[j].id : teams[i].id;
                        
                        const isFinished = matchDate < new Date();
                        const homeScore = isFinished ? Math.floor(Math.random() * 5) : 0;
                        const awayScore = isFinished ? Math.floor(Math.random() * 5) : 0;
                        
                        const query = `
                            INSERT INTO matches (
                                home_team_id, away_team_id, match_date, match_time,
                                venue, match_type, season, home_score, away_score,
                                match_status, match_duration
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;
                        
                        await db.run(query, [
                            homeTeamId,
                            awayTeamId,
                            matchDate.toISOString().split('T')[0],
                            '10:00',
                            venues[Math.floor(Math.random() * venues.length)],
                            matchTypes[Math.floor(Math.random() * matchTypes.length)],
                            '2024-25',
                            homeScore,
                            awayScore,
                            isFinished ? 'finished' : 'scheduled',
                            90
                        ]);
                        created++;
                    }
                }
            }

            await this.recordSeed(seedName, created);
            console.log(`✓ Created ${created} matches`);
            return created;
        } catch (error) {
            await this.recordSeed(seedName, 0, false);
            console.error('Failed to seed matches:', error.message);
            throw error;
        }
    }

    /**
     * Seed development plans
     * @returns {Promise<number>} Number of development plans created
     */
    async seedDevelopmentPlans() {
        const seedName = 'development_plans';
        
        if (await this.isSeedExecuted(seedName)) {
            console.log('Development plans seed already executed');
            return 0;
        }

        try {
            console.log('Seeding development plans...');
            
            const players = await db.query('SELECT id FROM players LIMIT 20'); // Seed for first 20 players
            const planTypes = ['technical', 'physical', 'tactical', 'mental'];
            const users = await db.query('SELECT id FROM users WHERE role = "coach" OR role = "admin" LIMIT 1');
            
            if (users.length === 0) {
                console.log('No coach/admin users found, skipping development plans seed');
                return 0;
            }
            
            const createdBy = users[0].id;
            let created = 0;
            
            for (const player of players) {
                // Create 1-2 development plans per player
                const numPlans = Math.floor(Math.random() * 2) + 1;
                
                for (let i = 0; i < numPlans; i++) {
                    const planType = planTypes[Math.floor(Math.random() * planTypes.length)];
                    const currentLevel = Math.floor(Math.random() * 5) + 3; // 3-7
                    const targetLevel = Math.min(currentLevel + Math.floor(Math.random() * 3) + 1, 10);
                    
                    const deadline = new Date();
                    deadline.setMonth(deadline.getMonth() + Math.floor(Math.random() * 6) + 3);
                    
                    const query = `
                        INSERT INTO development_plans (
                            player_id, season, plan_type, current_level, target_level,
                            goals, action_steps, deadline, completion_percentage, created_by
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    
                    await db.run(query, [
                        player.id,
                        '2024-25',
                        planType,
                        currentLevel,
                        targetLevel,
                        `Improve ${planType} skills from level ${currentLevel} to ${targetLevel}`,
                        `1. Regular practice sessions\n2. Focused drills\n3. Progress monitoring\n4. Feedback sessions`,
                        deadline.toISOString().split('T')[0],
                        Math.floor(Math.random() * 60) + 20, // 20-80% completion
                        createdBy
                    ]);
                    created++;
                }
            }

            await this.recordSeed(seedName, created);
            console.log(`✓ Created ${created} development plans`);
            return created;
        } catch (error) {
            await this.recordSeed(seedName, 0, false);
            console.error('Failed to seed development plans:', error.message);
            throw error;
        }
    }

    /**
     * Seed users (coaches, admins)
     * @returns {Promise<number>} Number of users created
     */
    async seedUsers() {
        const seedName = 'users';
        
        if (await this.isSeedExecuted(seedName)) {
            console.log('Users seed already executed');
            return 0;
        }

        try {
            console.log('Seeding users...');
            
            const users = [
                {
                    username: 'admin',
                    email: 'admin@lfa.com',
                    password_hash: '$2b$10$example_hash_would_go_here',
                    full_name: 'System Administrator',
                    role: 'admin'
                },
                {
                    username: 'coach1',
                    email: 'john.smith@lfa.com',
                    password_hash: '$2b$10$example_hash_would_go_here',
                    full_name: 'John Smith',
                    role: 'coach'
                },
                {
                    username: 'coach2',
                    email: 'sarah.johnson@lfa.com',
                    password_hash: '$2b$10$example_hash_would_go_here',
                    full_name: 'Sarah Johnson',
                    role: 'coach'
                }
            ];

            let created = 0;
            for (const user of users) {
                const query = `
                    INSERT OR IGNORE INTO users (
                        username, email, password_hash, full_name, role, active
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `;
                
                const result = await db.run(query, [
                    user.username,
                    user.email,
                    user.password_hash,
                    user.full_name,
                    user.role,
                    1
                ]);
                
                if (result.changes > 0) {
                    created++;
                }
            }

            await this.recordSeed(seedName, created);
            console.log(`✓ Created ${created} users`);
            return created;
        } catch (error) {
            await this.recordSeed(seedName, 0, false);
            console.error('Failed to seed users:', error.message);
            throw error;
        }
    }

    /**
     * Run all seeds
     * @returns {Promise<Object>} Summary of seeding results
     */
    async runAllSeeds() {
        try {
            console.log('Starting database seeding...');
            
            const results = {
                users: await this.seedUsers(),
                teams: await this.seedTeams(),
                players: await this.seedPlayers(),
                trainings: await this.seedTrainings(),
                matches: await this.seedMatches(),
                development_plans: await this.seedDevelopmentPlans()
            };
            
            const totalRecords = Object.values(results).reduce((sum, count) => sum + count, 0);
            
            console.log('\n📊 Seeding Summary:');
            console.log(`Users: ${results.users}`);
            console.log(`Teams: ${results.teams}`);
            console.log(`Players: ${results.players}`);
            console.log(`Trainings: ${results.trainings}`);
            console.log(`Matches: ${results.matches}`);
            console.log(`Development Plans: ${results.development_plans}`);
            console.log(`Total Records: ${totalRecords}`);
            
            return results;
        } catch (error) {
            console.error('Seeding failed:', error.message);
            throw error;
        }
    }

    /**
     * Clear all seed data
     * @returns {Promise<void>}
     */
    async clearAllSeeds() {
        try {
            console.log('Clearing seed data...');
            
            // Order matters due to foreign key constraints
            const tables = [
                'development_plans',
                'match_events',
                'player_match_performance',
                'team_match_statistics',
                'season_statistics',
                'matches',
                'attendance',
                'trainings',
                'players',
                'teams'
            ];
            
            // Don't clear users table as it may contain real admin accounts
            
            for (const table of tables) {
                await db.run(`DELETE FROM ${table}`);
                console.log(`✓ Cleared ${table}`);
            }
            
            // Clear seed tracking
            await db.run(`DELETE FROM ${this.seedTable}`);
            
            console.log('✓ All seed data cleared');
        } catch (error) {
            console.error('Failed to clear seed data:', error.message);
            throw error;
        }
    }

    /**
     * Get seeding status
     * @returns {Promise<Object>} Seeding status summary
     */
    async getStatus() {
        try {
            const query = `
                SELECT seed_name, executed_at, records_created, success
                FROM ${this.seedTable}
                ORDER BY executed_at DESC
            `;
            
            const seeds = await db.query(query);
            const totalRecords = seeds.reduce((sum, seed) => sum + (seed.success ? seed.records_created : 0), 0);
            
            return {
                total_seeds: seeds.length,
                successful_seeds: seeds.filter(s => s.success).length,
                total_records_created: totalRecords,
                executed_seeds: seeds
            };
        } catch (error) {
            console.error('Failed to get seeding status:', error.message);
            return null;
        }
    }
}

// Export singleton instance
const seederInstance = new Seeder();

module.exports = {
    Seeder,
    runAllSeeds: () => seederInstance.runAllSeeds(),
    clearSeeds: () => seederInstance.clearAllSeeds(),
    status: () => seederInstance.getStatus(),
    
    // Individual seed methods
    seedUsers: () => seederInstance.seedUsers(),
    seedTeams: () => seederInstance.seedTeams(),
    seedPlayers: () => seederInstance.seedPlayers(),
    seedTrainings: () => seederInstance.seedTrainings(),
    seedMatches: () => seederInstance.seedMatches(),
    seedDevelopmentPlans: () => seederInstance.seedDevelopmentPlans()
};