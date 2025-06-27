/**
 * Base Data Seeder
 * Creates teams, players, coaches, and users for the Lion Football Academy
 */

const db = require('../src/database/connection');
const DataGenerators = require('./data-generators');
const bcrypt = require('bcryptjs');

class BaseDataSeeder {
    constructor() {
        this.generator = new DataGenerators();
        this.createdData = {
            users: [],
            teams: [],
            players: []
        };
    }

    /**
     * Create all base data for a specific season
     * @param {string} season - Season (e.g., '2024-25')
     * @returns {Object} Created data summary
     */
    async seedBaseDateForSeason(season) {
        console.log(`🏗️  Creating base data for season ${season}...`);
        
        try {
            // Create admin and coach users first
            await this.createUsers(season);
            
            // Create teams for all age groups
            await this.createTeams(season);
            
            // Create players for each team
            await this.createPlayers(season);
            
            // Assign coaches to teams
            await this.assignCoachesToTeams();
            
            // Create parent users for players
            await this.createParentUsers();
            
            console.log(`✅ Base data created for season ${season}`);
            return this.getSummary();
            
        } catch (error) {
            console.error(`❌ Failed to create base data for season ${season}:`, error);
            throw error;
        }
    }

    /**
     * Create admin and coach users
     */
    async createUsers(season) {
        console.log('👥 Creating users (admin and coaches)...');
        
        const passwordHash = await bcrypt.hash('academy123', 10);
        
        // Create academy admin (only once)
        if (season === '2020-21') {
            const adminUser = {
                username: 'admin',
                email: 'admin@lionacademy.hu',
                password_hash: passwordHash,
                full_name: 'Akadémia Adminisztrátor',
                role: 'admin',
                active: 1
            };
            
            await this.insertUser(adminUser);
            this.createdData.users.push(adminUser);
        }
        
        // Create head coaches for each age group
        const coachData = [
            { name: 'Nagy Péter', ageGroup: 'U8', email: 'nagy.peter@lionacademy.hu' },
            { name: 'Kovács Anna', ageGroup: 'U10', email: 'kovacs.anna@lionacademy.hu' },
            { name: 'Szabó László', ageGroup: 'U12', email: 'szabo.laszlo@lionacademy.hu' },
            { name: 'Tóth Katalin', ageGroup: 'U14', email: 'toth.katalin@lionacademy.hu' },
            { name: 'Horváth Gábor', ageGroup: 'U16', email: 'horvath.gabor@lionacademy.hu' },
            { name: 'Varga Zsófia', ageGroup: 'U18', email: 'varga.zsofia@lionacademy.hu' }
        ];
        
        for (const coach of coachData) {
            const coachUser = {
                username: coach.email.split('@')[0],
                email: coach.email,
                password_hash: passwordHash,
                full_name: coach.name,
                role: 'coach',
                active: 1,
                age_group: coach.ageGroup
            };
            
            await this.insertUser(coachUser);
            this.createdData.users.push(coachUser);
        }
        
        console.log(`   ✓ Created ${this.createdData.users.length} users`);
    }

    /**
     * Create teams for all age groups
     */
    async createTeams(season) {
        console.log('🏆 Creating teams...');
        
        for (const ageGroup of this.generator.ageGroups) {
            const teamData = {
                name: `Lion ${ageGroup.name}`,
                age_group: ageGroup.name,
                season: season,
                coach_name: null, // Will be assigned later
                team_color: this.generator.generateTeamColor(),
                founded_year: 2015,
                home_venue: 'Lion Football Academy Complex',
                training_days: this.getTrainingDays(ageGroup.name),
                max_players: ageGroup.teamSize
            };
            
            const teamId = await this.insertTeam(teamData);
            teamData.id = teamId;
            this.createdData.teams.push(teamData);
        }
        
        console.log(`   ✓ Created ${this.createdData.teams.length} teams`);
    }

    /**
     * Create players for each team
     */
    async createPlayers(season) {
        console.log('⚽ Creating players...');
        
        let totalPlayers = 0;
        
        for (const team of this.createdData.teams) {
            const ageGroup = this.generator.ageGroups.find(g => g.name === team.age_group);
            const playersToCreate = ageGroup.teamSize - 2 + Math.floor(Math.random() * 4); // Some variation
            
            for (let i = 0; i < playersToCreate; i++) {
                const gender = Math.random() > 0.15 ? 'male' : 'female'; // Mostly male with some female players
                const playerName = this.generator.generateHungarianName(gender);
                const position = this.generator.generatePosition(team.age_group);
                const birthDate = this.generator.generateBirthDate(team.age_group, season);
                
                const playerData = {
                    name: playerName,
                    birth_date: birthDate,
                    position: position.name,
                    dominant_foot: this.generator.randomFromArray(['jobb', 'bal', 'mindkettő']),
                    team_id: team.id,
                    jersey_number: this.generateJerseyNumber(team.id, position.type),
                    height: this.generateHeight(team.age_group),
                    weight: this.generateWeight(team.age_group),
                    medical_notes: this.generateMedicalNotes(),
                    player_status: 'active',
                    season_joined: season,
                    previous_club: this.generatePreviousClub(),
                    parent_name: `${playerName} szülője`,
                    parent_phone: this.generator.generatePhoneNumber(),
                    parent_email: this.generator.generateEmail(playerName),
                    emergency_contact: this.generator.generatePhoneNumber(),
                    address: this.generateAddress()
                };
                
                const playerId = await this.insertPlayer(playerData);
                playerData.id = playerId;
                this.createdData.players.push(playerData);
                totalPlayers++;
            }
        }
        
        console.log(`   ✓ Created ${totalPlayers} players`);
    }

    /**
     * Assign coaches to teams
     */
    async assignCoachesToTeams() {
        console.log('👨‍🏫 Assigning coaches to teams...');
        
        for (const team of this.createdData.teams) {
            const coach = this.createdData.users.find(u => 
                u.role === 'coach' && u.age_group === team.age_group
            );
            
            if (coach) {
                // Update team with coach name
                await db.run(
                    'UPDATE teams SET coach_name = ? WHERE id = ?',
                    [coach.full_name, team.id]
                );
                
                // Update coach with team assignment
                await db.run(
                    'UPDATE users SET team_id = ? WHERE id = ?',
                    [team.id, coach.id]
                );
                
                team.coach_name = coach.full_name;
                coach.team_id = team.id;
            }
        }
        
        console.log('   ✓ Coaches assigned to teams');
    }

    /**
     * Create parent users for players
     */
    async createParentUsers() {
        console.log('👨‍👩‍👧‍👦 Creating parent users...');
        
        const passwordHash = await bcrypt.hash('parent123', 10);
        let createdParents = 0;
        
        // Create parent accounts for random selection of players
        const playersWithParents = this.createdData.players.filter(() => Math.random() > 0.3);
        
        for (const player of playersWithParents) {
            const parentName = player.parent_name;
            const username = this.generateUsernameFromEmail(player.parent_email);
            
            const parentUser = {
                username: username,
                email: player.parent_email,
                password_hash: passwordHash,
                full_name: parentName,
                role: 'parent',
                team_id: player.team_id,
                player_id: player.id,
                active: 1
            };
            
            try {
                await this.insertUser(parentUser);
                createdParents++;
            } catch (error) {
                // Skip if user already exists (duplicate email)
                if (!error.message.includes('UNIQUE constraint')) {
                    throw error;
                }
            }
        }
        
        console.log(`   ✓ Created ${createdParents} parent users`);
    }

    // Helper methods

    async insertUser(userData) {
        const query = `
            INSERT OR IGNORE INTO users (
                username, email, password_hash, full_name, role, 
                team_id, player_id, active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            userData.username,
            userData.email,
            userData.password_hash,
            userData.full_name,
            userData.role,
            userData.team_id || null,
            userData.player_id || null,
            userData.active
        ]);
        
        userData.id = result.lastID;
        return result.lastID;
    }

    async insertTeam(teamData) {
        const query = `
            INSERT INTO teams (
                name, age_group, season, coach_name, team_color
            ) VALUES (?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            teamData.name,
            teamData.age_group,
            teamData.season,
            teamData.coach_name,
            teamData.team_color
        ]);
        
        return result.lastID;
    }

    async insertPlayer(playerData) {
        const query = `
            INSERT INTO players (
                name, birth_date, position, dominant_foot, team_id,
                parent_name, parent_phone, parent_email, medical_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            playerData.name,
            playerData.birth_date,
            playerData.position,
            playerData.dominant_foot,
            playerData.team_id,
            playerData.parent_name,
            playerData.parent_phone,
            playerData.parent_email,
            playerData.medical_notes
        ]);
        
        return result.lastID;
    }

    getTrainingDays(ageGroup) {
        const schedule = this.generator.generateWeeklyTrainingSchedule(ageGroup);
        return schedule.map(s => s.day).join(', ');
    }

    generateJerseyNumber(teamId, positionType) {
        // Simple jersey number assignment (would need to check uniqueness in real implementation)
        if (positionType === 'goalkeeper') {
            return Math.floor(Math.random() * 99) + 1;
        }
        return Math.floor(Math.random() * 99) + 1;
    }

    generateHeight(ageGroup) {
        const ageNum = parseInt(ageGroup.replace('U', ''));
        const baseHeight = 120 + (ageNum - 8) * 7; // Base height progression
        const variation = Math.floor(Math.random() * 20) - 10; // ±10cm variation
        return Math.max(100, baseHeight + variation);
    }

    generateWeight(ageGroup) {
        const ageNum = parseInt(ageGroup.replace('U', ''));
        const baseWeight = 25 + (ageNum - 8) * 4; // Base weight progression
        const variation = Math.floor(Math.random() * 10) - 5; // ±5kg variation
        return Math.max(20, baseWeight + variation);
    }

    generateMedicalNotes() {
        const notes = [
            null, // Most players have no medical notes
            null,
            null,
            'Asztma - inhalátor szükséges',
            'Allergiás a mogyoróra',
            'Szemüveget visel',
            'Korábbi bokasérülés',
            'Enyhe szívzörej - ellenőrizve'
        ];
        return this.generator.randomFromArray(notes);
    }

    generatePreviousClub() {
        const clubs = [
            null, // Many players start at the academy
            null,
            null,
            'Helyi SC',
            'Városi Sportklub',
            'Ifjúsági SE',
            'Községi FC',
            'Utánpótlás Egyesület'
        ];
        return this.generator.randomFromArray(clubs);
    }

    generateAddress() {
        const cities = this.generator.hungarianCities;
        const streets = [
            'Fő utca', 'Kossuth utca', 'Petőfi utca', 'Ady Endre utca',
            'Szabadság tér', 'Váci út', 'Bajcsy-Zsilinszky utca',
            'Rákóczi út', 'József Attila utca', 'Széchenyi tér'
        ];
        
        const city = this.generator.randomFromArray(cities);
        const street = this.generator.randomFromArray(streets);
        const houseNumber = Math.floor(Math.random() * 200) + 1;
        
        return `${city}, ${street} ${houseNumber}.`;
    }

    generateUsernameFromEmail(email) {
        return email.split('@')[0].replace(/\./g, '').toLowerCase();
    }

    getSummary() {
        return {
            users: this.createdData.users.length,
            teams: this.createdData.teams.length,
            players: this.createdData.players.length,
            coaches_assigned: this.createdData.teams.filter(t => t.coach_name).length
        };
    }

    /**
     * Get created data for use by other seeders
     */
    getCreatedData() {
        return this.createdData;
    }

    /**
     * Clear created data tracking
     */
    reset() {
        this.createdData = {
            users: [],
            teams: [],
            players: []
        };
    }
}

module.exports = BaseDataSeeder;