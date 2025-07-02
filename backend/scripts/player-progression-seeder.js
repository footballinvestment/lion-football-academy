/**
 * Player Progression Seeder
 * Handles player aging, team transitions, and career development across seasons
 */

const db = require('../src/database/connection');
const DataGenerators = require('./data-generators');

class PlayerProgressionSeeder {
    constructor() {
        this.generator = new DataGenerators();
        this.promotedPlayers = [];
        this.retiredPlayers = [];
        this.newRecruits = [];
    }

    /**
     * Progress all players from one season to the next
     * @param {string} fromSeason - Current season
     * @param {string} toSeason - Next season
     * @param {Array} players - Current players
     * @param {Array} teams - Available teams
     * @returns {Object} Progression summary
     */
    async progressPlayersToNewSeason(fromSeason, toSeason, players, teams) {
        console.log(`🔄 Progressing players from ${fromSeason} to ${toSeason}...`);
        
        try {
            // Age all players and determine who needs to move teams
            const progressionPlan = this.planPlayerProgression(players, toSeason, teams);
            
            // Handle player promotions to next age group
            await this.promotePlayersToNextAgeGroup(progressionPlan.promotions, teams);
            
            // Handle retirements (players aging out of U18)
            await this.retirePlayers(progressionPlan.retirements);
            
            // Recruit new players for teams that lost players
            await this.recruitNewPlayers(progressionPlan.recruitmentNeeds, teams, toSeason);
            
            // Update remaining players for new season
            await this.updatePlayersForNewSeason(progressionPlan.staying, toSeason);
            
            // Create training schedules for new season
            await this.createTrainingSchedulesForSeason(toSeason, teams);
            
            console.log(`✅ Player progression completed for ${toSeason}`);
            return this.getProgressionSummary();
            
        } catch (error) {
            console.error(`❌ Failed to progress players to ${toSeason}:`, error);
            throw error;
        }
    }

    /**
     * Plan player progression based on age and team capacity
     */
    planPlayerProgression(players, toSeason, teams) {
        const progressionPlan = {
            promotions: [],
            retirements: [],
            staying: [],
            recruitmentNeeds: {}
        };
        
        // Group teams by age group for easy lookup
        const teamsByAge = {};
        teams.forEach(team => {
            teamsByAge[team.age_group] = team;
        });
        
        for (const player of players) {
            const currentAge = this.calculatePlayerAge(player.birth_date, toSeason);
            const currentAgeGroup = player.team?.age_group;
            const appropriateAgeGroup = this.getAppropriateAgeGroup(currentAge);
            
            if (!appropriateAgeGroup) {
                // Player is too old for any age group (over 18)
                progressionPlan.retirements.push(player);
                this.trackRecruitmentNeed(progressionPlan.recruitmentNeeds, currentAgeGroup);
            } else if (appropriateAgeGroup !== currentAgeGroup) {
                // Player needs to move to different age group
                const targetTeam = teamsByAge[appropriateAgeGroup];
                if (targetTeam) {
                    progressionPlan.promotions.push({
                        player: player,
                        fromTeam: player.team,
                        toTeam: targetTeam,
                        fromAgeGroup: currentAgeGroup,
                        toAgeGroup: appropriateAgeGroup
                    });
                    this.trackRecruitmentNeed(progressionPlan.recruitmentNeeds, currentAgeGroup);
                }
            } else {
                // Player stays in same team
                progressionPlan.staying.push(player);
            }
        }
        
        return progressionPlan;
    }

    /**
     * Promote players to next age group
     */
    async promotePlayersToNextAgeGroup(promotions, teams) {
        console.log(`📈 Promoting ${promotions.length} players to next age group...`);
        
        for (const promotion of promotions) {
            // Update player's team
            await db.run(
                'UPDATE players SET team_id = ? WHERE id = ?',
                [promotion.toTeam.id, promotion.player.id]
            );
            
            // Record the promotion in player history
            await this.recordPlayerPromotion(promotion);
            
            // Update player development level based on progression
            await this.updatePlayerSkillsOnPromotion(promotion.player, promotion.toAgeGroup);
            
            this.promotedPlayers.push(promotion);
        }
        
        console.log(`   ✓ Promoted ${promotions.length} players`);
    }

    /**
     * Retire players who are too old
     */
    async retirePlayers(retirements) {
        if (retirements.length === 0) return;
        
        console.log(`👋 Retiring ${retirements.length} players (aged out)...`);
        
        for (const player of retirements) {
            // Mark player as inactive instead of deleting
            await db.run(
                'UPDATE players SET team_id = NULL, player_status = ? WHERE id = ?',
                ['retired', player.id]
            );
            
            // Record retirement
            await this.recordPlayerRetirement(player);
            
            this.retiredPlayers.push(player);
        }
        
        console.log(`   ✓ Retired ${retirements.length} players`);
    }

    /**
     * Recruit new players to fill gaps
     */
    async recruitNewPlayers(recruitmentNeeds, teams, season) {
        console.log('🆕 Recruiting new players...');
        
        let totalRecruited = 0;
        
        for (const [ageGroup, neededCount] of Object.entries(recruitmentNeeds)) {
            const team = teams.find(t => t.age_group === ageGroup);
            if (!team || neededCount <= 0) continue;
            
            // Get current team size
            const currentSize = await this.getTeamCurrentSize(team.id);
            const maxSize = this.generator.ageGroups.find(g => g.name === ageGroup)?.teamSize || 20;
            const canRecruit = Math.min(neededCount, maxSize - currentSize);
            
            for (let i = 0; i < canRecruit; i++) {
                const newPlayer = await this.createNewRecruitedPlayer(team, season);
                this.newRecruits.push(newPlayer);
                totalRecruited++;
            }
        }
        
        console.log(`   ✓ Recruited ${totalRecruited} new players`);
    }

    /**
     * Update remaining players for new season
     */
    async updatePlayersForNewSeason(stayingPlayers, season) {
        console.log(`📝 Updating ${stayingPlayers.length} continuing players...`);
        
        for (const player of stayingPlayers) {
            // Update player attributes based on age and development
            const updates = this.calculatePlayerDevelopment(player, season);
            
            if (Object.keys(updates).length > 0) {
                const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
                const values = [...Object.values(updates), player.id];
                
                await db.run(
                    `UPDATE players SET ${updateFields} WHERE id = ?`,
                    values
                );
            }
        }
        
        console.log(`   ✓ Updated ${stayingPlayers.length} players`);
    }

    /**
     * Create training schedules for new season
     */
    async createTrainingSchedulesForSeason(season, teams) {
        console.log(`📅 Creating training schedules for ${season}...`);
        
        let totalTrainings = 0;
        
        for (const team of teams) {
            const schedule = this.generator.generateWeeklyTrainingSchedule(team.age_group);
            const trainingsPerWeek = schedule.length;
            
            // Create training sessions for the season (approximately 40 weeks)
            const seasonWeeks = 40;
            const seasonStart = new Date(`${season.split('-')[0]}-08-01`);
            
            for (let week = 0; week < seasonWeeks; week++) {
                for (let sessionIndex = 0; sessionIndex < trainingsPerWeek; sessionIndex++) {
                    const session = schedule[sessionIndex];
                    const trainingDate = new Date(seasonStart);
                    trainingDate.setDate(seasonStart.getDate() + (week * 7) + this.getDayOfWeekNumber(session.day));
                    
                    // Skip if date is in the future beyond reasonable planning
                    if (trainingDate > new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) {
                        continue;
                    }
                    
                    const trainingData = {
                        date: trainingDate.toISOString().split('T')[0],
                        time: session.time,
                        duration: session.duration,
                        location: 'Lion Football Academy Complex',
                        type: session.type,
                        team_id: team.id,
                        training_plan: this.generateTrainingPlan(session.type, team.age_group),
                        season: season
                    };
                    
                    await this.insertTraining(trainingData);
                    totalTrainings++;
                }
            }
        }
        
        console.log(`   ✓ Created ${totalTrainings} training sessions`);
    }

    // Helper methods

    calculatePlayerAge(birthDate, season) {
        const seasonYear = parseInt(season.split('-')[0]);
        const birth = new Date(birthDate);
        const seasonStart = new Date(seasonYear, 7, 1); // August 1st
        
        let age = seasonStart.getFullYear() - birth.getFullYear();
        const monthDiff = seasonStart.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && seasonStart.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    getAppropriateAgeGroup(age) {
        for (const ageGroup of this.generator.ageGroups) {
            if (age >= ageGroup.minAge && age <= ageGroup.maxAge) {
                return ageGroup.name;
            }
        }
        return null; // Too old for any age group
    }

    trackRecruitmentNeed(recruitmentNeeds, ageGroup) {
        if (ageGroup) {
            recruitmentNeeds[ageGroup] = (recruitmentNeeds[ageGroup] || 0) + 1;
        }
    }

    async recordPlayerPromotion(promotion) {
        // This would record in a player_history table if it existed
        // For now, we'll just log it
        console.log(`   📈 ${promotion.player.name}: ${promotion.fromAgeGroup} → ${promotion.toAgeGroup}`);
    }

    async recordPlayerRetirement(player) {
        // Log retirement
        console.log(`   👋 ${player.name} retired (aged out)`);
    }

    async updatePlayerSkillsOnPromotion(player, newAgeGroup) {
        // Players typically improve when promoted
        // This would update skills/ratings if such tables existed
        // For now, this is a placeholder for future skill tracking
    }

    async getTeamCurrentSize(teamId) {
        const result = await db.query(
            'SELECT COUNT(*) as count FROM players WHERE team_id = ? AND player_status = ?',
            [teamId, 'active']
        );
        return result[0]?.count || 0;
    }

    async createNewRecruitedPlayer(team, season) {
        const gender = Math.random() > 0.15 ? 'male' : 'female';
        const playerName = this.generator.generateHungarianName(gender);
        const position = this.generator.generatePosition(team.age_group);
        const birthDate = this.generator.generateBirthDate(team.age_group, season);
        
        const playerData = {
            name: playerName,
            birth_date: birthDate,
            position: position.name,
            dominant_foot: this.generator.randomFromArray(['jobb', 'bal', 'mindkettő']),
            team_id: team.id,
            player_status: 'active',
            season_joined: season,
            parent_name: `${playerName} szülője`,
            parent_phone: this.generator.generatePhoneNumber(),
            parent_email: this.generator.generateEmail(playerName),
            medical_notes: this.generateMedicalNotes()
        };
        
        const playerId = await this.insertPlayer(playerData);
        playerData.id = playerId;
        
        return playerData;
    }

    calculatePlayerDevelopment(player, season) {
        const updates = {};
        
        // Players naturally develop over time
        // This would include skill improvements, physical development, etc.
        // For now, we'll just update basic info if needed
        
        return updates;
    }

    generateTrainingPlan(trainingType, ageGroup) {
        const plans = {
            'Technikai edzés': [
                'Labdavezetés fejlesztése',
                'Passzolási gyakorlatok',
                'Első érintés tökéletesítése',
                'Cselezési technikák'
            ],
            'Taktikai edzés': [
                'Pozíciójáték gyakorlása',
                'Csapatmozgások koordinálása',
                'Védekezési formációk',
                'Támadási kombinációk'
            ],
            'Fizikai felkészítés': [
                'Állóképesség fejlesztése',
                'Gyorsasági gyakorlatok',
                'Erősítő gyakorlatok',
                'Koordinációs feladatok'
            ]
        };
        
        const planOptions = plans[trainingType] || plans['Technikai edzés'];
        const selectedPlan = this.generator.randomFromArray(planOptions);
        
        return `${selectedPlan} - ${ageGroup} korosztály számára optimalizált edzés`;
    }

    getDayOfWeekNumber(dayName) {
        const days = {
            'Hétfő': 1,
            'Kedd': 2,
            'Szerda': 3,
            'Csütörtök': 4,
            'Péntek': 5,
            'Szombat': 6,
            'Vasárnap': 0
        };
        return days[dayName] || 1;
    }

    generateMedicalNotes() {
        const notes = [
            null, null, null, // Most players have no medical notes
            'Asztma - inhalátor szükséges',
            'Allergiás a mogyoróra',
            'Szemüveget visel',
            'Korábbi bokasérülés'
        ];
        return this.generator.randomFromArray(notes);
    }

    // Database operations

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

    async insertTraining(trainingData) {
        const query = `
            INSERT INTO trainings (
                date, time, duration, location, type, team_id, training_plan
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            trainingData.date,
            trainingData.time,
            trainingData.duration,
            trainingData.location,
            trainingData.type,
            trainingData.team_id,
            trainingData.training_plan
        ]);
        
        return result.lastID;
    }

    getProgressionSummary() {
        return {
            promoted: this.promotedPlayers.length,
            retired: this.retiredPlayers.length,
            recruited: this.newRecruits.length,
            promotions: this.promotedPlayers.map(p => ({
                player: p.player.name,
                from: p.fromAgeGroup,
                to: p.toAgeGroup
            })),
            retirements: this.retiredPlayers.map(p => p.name),
            new_recruits: this.newRecruits.map(p => `${p.name} (${p.position})`)
        };
    }

    reset() {
        this.promotedPlayers = [];
        this.retiredPlayers = [];
        this.newRecruits = [];
    }
}

module.exports = PlayerProgressionSeeder;