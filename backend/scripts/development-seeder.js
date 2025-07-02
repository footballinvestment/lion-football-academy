/**
 * Development Seeder
 * Creates development plans, skill assessments, and progress tracking data
 */

const db = require('../src/database/connection');
const DataGenerators = require('./data-generators');

class DevelopmentSeeder {
    constructor() {
        this.generator = new DataGenerators();
        this.createdPlans = [];
        this.createdAssessments = [];
        this.createdProgress = [];
        this.createdMilestones = [];
    }

    /**
     * Create development data for a season
     * @param {string} season - Season (e.g., '2024-25')
     * @param {Array} players - Available players
     * @param {Array} coaches - Available coaches
     * @returns {Object} Created data summary
     */
    async seedDevelopmentDataForSeason(season, players, coaches) {
        console.log(`📈 Creating development data for season ${season}...`);
        
        try {
            // Create development plans for players
            await this.createDevelopmentPlans(season, players, coaches);
            
            // Create skill assessments
            await this.createSkillAssessments(season, players, coaches);
            
            // Create development milestones
            await this.createMilestones(season);
            
            // Record progress tracking
            await this.recordProgressTracking(season, coaches);
            
            console.log(`✅ Development data created for season ${season}`);
            return this.getSummary();
            
        } catch (error) {
            console.error(`❌ Failed to create development data for season ${season}:`, error);
            throw error;
        }
    }

    /**
     * Create development plans for players
     */
    async createDevelopmentPlans(season, players, coaches) {
        console.log('📋 Creating development plans...');
        
        const eligiblePlayers = players.filter(p => Math.random() > 0.3); // 70% of players get plans
        let totalPlans = 0;
        
        for (const player of eligiblePlayers) {
            const playerAge = this.calculatePlayerAge(player.birth_date, season);
            const numPlans = this.getNumberOfPlansForPlayer(playerAge);
            
            const availableCoaches = coaches.filter(c => 
                c.team_id === player.team_id || c.role === 'admin'
            );
            
            if (availableCoaches.length === 0) continue;
            
            for (let i = 0; i < numPlans; i++) {
                const coach = this.generator.randomFromArray(availableCoaches);
                const plan = await this.generateDevelopmentPlan(player, coach, season, playerAge);
                
                const planId = await this.insertDevelopmentPlan(plan);
                plan.id = planId;
                this.createdPlans.push(plan);
                totalPlans++;
                
                // Create associated milestones
                const milestones = this.generateMilestonesForPlan(plan);
                for (const milestone of milestones) {
                    const milestoneId = await this.insertMilestone(milestone);
                    milestone.id = milestoneId;
                    this.createdMilestones.push(milestone);
                }
            }
        }
        
        console.log(`   ✓ Created ${totalPlans} development plans`);
    }

    /**
     * Create skill assessments for players
     */
    async createSkillAssessments(season, players, coaches) {
        console.log('🎯 Creating skill assessments...');
        
        let totalAssessments = 0;
        
        for (const player of players) {
            const playerAge = this.calculatePlayerAge(player.birth_date, season);
            const position = this.getPositionFromName(player.position);
            
            const availableCoaches = coaches.filter(c => 
                c.team_id === player.team_id || c.role === 'admin'
            );
            
            if (availableCoaches.length === 0) continue;
            
            // Create assessments for different skill categories
            const skillCategories = this.getRelevantSkillCategories(position);
            
            for (const category of skillCategories) {
                // Create 2-4 assessments per category throughout the season
                const numAssessments = Math.floor(Math.random() * 3) + 2;
                
                for (let i = 0; i < numAssessments; i++) {
                    const coach = this.generator.randomFromArray(availableCoaches);
                    const assessment = this.generateSkillAssessment(
                        player, 
                        coach, 
                        category, 
                        season, 
                        playerAge,
                        i
                    );
                    
                    const assessmentId = await this.insertSkillAssessment(assessment);
                    assessment.id = assessmentId;
                    this.createdAssessments.push(assessment);
                    totalAssessments++;
                }
            }
        }
        
        console.log(`   ✓ Created ${totalAssessments} skill assessments`);
    }

    /**
     * Create milestones for development plans
     */
    async createMilestones(season) {
        console.log('🎯 Creating development milestones...');
        
        // Milestones are created with development plans
        const totalMilestones = this.createdMilestones.length;
        console.log(`   ✓ Created ${totalMilestones} milestones`);
    }

    /**
     * Record progress tracking entries
     */
    async recordProgressTracking(season, coaches) {
        console.log('📊 Recording progress tracking...');
        
        let totalProgress = 0;
        
        for (const plan of this.createdPlans) {
            // Create 3-6 progress entries throughout the season
            const numEntries = Math.floor(Math.random() * 4) + 3;
            
            for (let i = 0; i < numEntries; i++) {
                const progressEntry = this.generateProgressEntry(plan, season, i, numEntries);
                
                const progressId = await this.insertProgressTracking(progressEntry);
                progressEntry.id = progressId;
                this.createdProgress.push(progressEntry);
                totalProgress++;
                
                // Update milestone statuses based on progress
                await this.updateMilestoneStatuses(plan.id, progressEntry.progress_percentage);
            }
        }
        
        console.log(`   ✓ Created ${totalProgress} progress entries`);
    }

    // Generation methods

    generateDevelopmentPlan(player, coach, season, playerAge) {
        const planData = this.generator.generateDevelopmentPlan(player);
        
        // Calculate dates
        const startDate = this.generatePlanStartDate(season);
        const targetDate = this.generateTargetDate(startDate, planData.plan_type);
        
        return {
            player_id: player.id,
            season: season,
            plan_type: planData.plan_type,
            goal: planData.goal,
            target_date: targetDate,
            created_by: coach.id,
            status: 'active',
            priority: planData.priority,
            progress_percentage: Math.floor(Math.random() * 30) + 10, // 10-40% initial progress
            created_at: startDate,
            notes: this.generatePlanNotes(planData.plan_type, player.position)
        };
    }

    generateSkillAssessment(player, coach, category, season, playerAge, assessmentIndex) {
        const skillData = this.generator.generateSkillAssessment(category, playerAge);
        const assessmentDate = this.generateAssessmentDate(season, assessmentIndex);
        
        // Progressive improvement over time
        const improvement = assessmentIndex * 0.2; // Slight improvement in later assessments
        const currentLevel = Math.min(10, skillData.current_level + improvement);
        
        return {
            player_id: player.id,
            skill_category: category,
            skill_name: skillData.skill_name,
            current_level: Math.round(currentLevel * 10) / 10,
            target_level: skillData.target_level,
            assessment_date: assessmentDate,
            assessed_by: coach.id,
            notes: skillData.notes,
            season: season,
            improvement_areas: this.generateImprovementAreas(category),
            next_assessment_date: this.generateNextAssessmentDate(assessmentDate)
        };
    }

    generateMilestonesForPlan(plan) {
        const milestones = [];
        const numMilestones = Math.floor(Math.random() * 4) + 2; // 2-5 milestones
        
        const planStart = new Date(plan.created_at);
        const planEnd = new Date(plan.target_date);
        const timespan = planEnd.getTime() - planStart.getTime();
        
        for (let i = 0; i < numMilestones; i++) {
            const milestoneDate = new Date(planStart.getTime() + (timespan * (i + 1) / numMilestones));
            
            milestones.push({
                plan_id: plan.id,
                title: this.generateMilestoneTitle(plan.plan_type, i + 1),
                description: this.generateMilestoneDescription(plan.plan_type, i + 1),
                target_date: milestoneDate.toISOString().split('T')[0],
                status: this.getMilestoneStatus(milestoneDate, plan.progress_percentage, i + 1, numMilestones),
                completion_date: null // Will be set when milestone is completed
            });
        }
        
        return milestones;
    }

    generateProgressEntry(plan, season, entryIndex, totalEntries) {
        const seasonStart = new Date(`${season.split('-')[0]}-08-01`);
        const progressDate = new Date(seasonStart);
        progressDate.setMonth(progressDate.getMonth() + Math.floor((entryIndex + 1) * 10 / totalEntries));
        
        // Progressive improvement
        const baseProgress = (entryIndex + 1) * (80 / totalEntries); // Progress towards 80%
        const variation = (Math.random() - 0.5) * 20; // ±10% variation
        const progressPercentage = Math.max(0, Math.min(100, baseProgress + variation));
        
        return {
            plan_id: plan.id,
            progress_date: progressDate.toISOString().split('T')[0],
            progress_percentage: Math.round(progressPercentage),
            notes: this.generateProgressNotes(plan.plan_type, progressPercentage),
            updated_by: plan.created_by,
            achievements: this.generateAchievements(plan.plan_type, progressPercentage),
            challenges: this.generateChallenges(plan.plan_type, progressPercentage)
        };
    }

    // Helper methods

    calculatePlayerAge(birthDate, season) {
        const seasonYear = parseInt(season.split('-')[0]);
        const birth = new Date(birthDate);
        const seasonStart = new Date(seasonYear, 7, 1);
        
        let age = seasonStart.getFullYear() - birth.getFullYear();
        const monthDiff = seasonStart.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && seasonStart.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    getNumberOfPlansForPlayer(age) {
        if (age <= 10) return Math.floor(Math.random() * 2) + 1; // 1-2 plans
        if (age <= 14) return Math.floor(Math.random() * 3) + 2; // 2-4 plans
        return Math.floor(Math.random() * 4) + 2; // 2-5 plans
    }

    getPositionFromName(positionName) {
        return this.generator.footballPositions.find(p => p.name === positionName) || 
               this.generator.footballPositions[0];
    }

    getRelevantSkillCategories(position) {
        const allCategories = ['technical', 'tactical', 'physical', 'mental'];
        
        if (position.type === 'goalkeeper') {
            return ['technical', 'mental', 'goalkeeping'];
        }
        
        return allCategories;
    }

    generatePlanStartDate(season) {
        const seasonStart = new Date(`${season.split('-')[0]}-08-01`);
        // Random start date within first 3 months of season
        const randomDays = Math.floor(Math.random() * 90);
        seasonStart.setDate(seasonStart.getDate() + randomDays);
        return seasonStart.toISOString().split('T')[0];
    }

    generateTargetDate(startDate, planType) {
        const start = new Date(startDate);
        
        // Different plan types have different durations
        const durations = {
            skill_development: { min: 90, max: 180 }, // 3-6 months
            fitness: { min: 60, max: 120 }, // 2-4 months
            technical: { min: 120, max: 240 }, // 4-8 months
            tactical: { min: 90, max: 180 }, // 3-6 months
            mental: { min: 60, max: 150 } // 2-5 months
        };
        
        const duration = durations[planType] || durations.skill_development;
        const randomDays = Math.floor(Math.random() * (duration.max - duration.min + 1)) + duration.min;
        
        const targetDate = new Date(start);
        targetDate.setDate(targetDate.getDate() + randomDays);
        
        return targetDate.toISOString().split('T')[0];
    }

    generateAssessmentDate(season, assessmentIndex) {
        const seasonStart = new Date(`${season.split('-')[0]}-08-01`);
        // Spread assessments throughout the season
        const monthsInSeason = 10;
        const monthsPerAssessment = monthsInSeason / 4; // Assume max 4 assessments
        
        const targetMonth = Math.floor(assessmentIndex * monthsPerAssessment);
        const assessmentDate = new Date(seasonStart);
        assessmentDate.setMonth(assessmentDate.getMonth() + targetMonth);
        assessmentDate.setDate(assessmentDate.getDate() + Math.floor(Math.random() * 28));
        
        return assessmentDate.toISOString().split('T')[0];
    }

    generatePlanNotes(planType, position) {
        const notes = {
            skill_development: [
                `${position} pozícióhoz szükséges készségek fejlesztésére fókuszálva`,
                'Egyéni fejlesztési terv alapján haladás',
                'Rendszeres értékelés és visszajelzés'
            ],
            fitness: [
                'Fizikai teljesítmény javítása céljából',
                'Állóképesség és erőnlét fejlesztése',
                'Sérülésmentes tréning prioritás'
            ],
            technical: [
                'Technikai végrehajtás pontosságának növelése',
                'Labdatechnikai készségek finomítása',
                'Komplexebb mozgássorok elsajátítása'
            ],
            tactical: [
                'Taktikai tudatosság és játékértelem fejlesztése',
                'Csapatjáték és pozíciójáték javítása',
                'Döntéshozatal gyorsításának gyakorlása'
            ],
            mental: [
                'Mentális erősség és koncentráció fejlesztése',
                'Önbizalom erősítése és stressztűrés javítása',
                'Pozitív hozzáállás kialakítása'
            ]
        };
        
        const planNotes = notes[planType] || notes.skill_development;
        return this.generator.randomFromArray(planNotes);
    }

    generateImprovementAreas(category) {
        const areas = {
            technical: ['Labdavezetés', 'Passzolás', 'Lövés', 'Cselezés'],
            tactical: ['Pozíciójáték', 'Csapatmunka', 'Védekezés', 'Támadás'],
            physical: ['Gyorsaság', 'Erő', 'Állóképesség', 'Koordináció'],
            mental: ['Koncentráció', 'Önbizalom', 'Döntéshozatal', 'Motiváció'],
            goalkeeping: ['Fogás', 'Kijövések', 'Labdarúgás', 'Reflexek']
        };
        
        const categoryAreas = areas[category] || areas.technical;
        const numAreas = Math.floor(Math.random() * 3) + 1;
        const selectedAreas = [];
        
        for (let i = 0; i < numAreas; i++) {
            const area = this.generator.randomFromArray(categoryAreas);
            if (!selectedAreas.includes(area)) {
                selectedAreas.push(area);
            }
        }
        
        return selectedAreas.join(', ');
    }

    generateNextAssessmentDate(currentDate) {
        const current = new Date(currentDate);
        const nextAssessment = new Date(current);
        nextAssessment.setMonth(nextAssessment.getMonth() + Math.floor(Math.random() * 3) + 1);
        return nextAssessment.toISOString().split('T')[0];
    }

    generateMilestoneTitle(planType, milestoneNumber) {
        const titles = {
            skill_development: [
                'Alapkészségek elsajátítása',
                'Technikai finomítás',
                'Komplex mozgássorok',
                'Mester szint elérése'
            ],
            fitness: [
                'Alapfitnesz javítása',
                'Állóképesség növelése',
                'Erőnlét fejlesztése',
                'Csúcsforma elérése'
            ],
            technical: [
                'Alapmozgások tökéletesítése',
                'Sebesség növelése',
                'Pontosság javítása',
                'Automatizmus kialakítása'
            ]
        };
        
        const planTitles = titles[planType] || titles.skill_development;
        return planTitles[milestoneNumber - 1] || `${milestoneNumber}. mérföldkő`;
    }

    generateMilestoneDescription(planType, milestoneNumber) {
        return `${this.generateMilestoneTitle(planType, milestoneNumber)} - részletes végrehajtási terv alapján`;
    }

    getMilestoneStatus(milestoneDate, planProgress, milestoneIndex, totalMilestones) {
        const today = new Date();
        const milestone = new Date(milestoneDate);
        
        // Expected progress for this milestone
        const expectedProgress = (milestoneIndex / totalMilestones) * 100;
        
        if (milestone < today && planProgress >= expectedProgress) {
            return 'completed';
        } else if (milestone < today) {
            return 'overdue';
        } else {
            return 'pending';
        }
    }

    generateProgressNotes(planType, progressPercentage) {
        if (progressPercentage >= 80) {
            return 'Kiváló előrehaladás, a célok elérése várható időben';
        } else if (progressPercentage >= 60) {
            return 'Jó ütemű fejlődés, kisebb finomhangolás szükséges';
        } else if (progressPercentage >= 40) {
            return 'Mérsékelt haladás, további gyakorlás javasolt';
        } else {
            return 'Lassú fejlődés, egyéni támogatás szükséges';
        }
    }

    generateAchievements(planType, progressPercentage) {
        if (progressPercentage < 30) return null;
        
        const achievements = [
            'Technikai végrehajtás javulása',
            'Növekvő magabiztosság',
            'Jobb csapatmunka',
            'Pontosabb végrehajtás',
            'Gyorsabb döntéshozatal'
        ];
        
        return this.generator.randomFromArray(achievements);
    }

    generateChallenges(planType, progressPercentage) {
        if (progressPercentage > 70) return null;
        
        const challenges = [
            'Koncentráció fenntartása',
            'Komplex mozgássorok elsajátítása',
            'Nyomás alatti teljesítmény',
            'Következetesség javítása',
            'Motiváció fenntartása'
        ];
        
        return this.generator.randomFromArray(challenges);
    }

    // Database operations

    async insertDevelopmentPlan(planData) {
        const query = `
            INSERT INTO development_plans (
                player_id, season, plan_type, goal, target_date, created_by,
                status, priority, progress_percentage
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            planData.player_id,
            planData.season,
            planData.plan_type,
            planData.goal,
            planData.target_date,
            planData.created_by,
            planData.status,
            planData.priority,
            planData.progress_percentage
        ]);
        
        return result.lastID;
    }

    async insertSkillAssessment(assessmentData) {
        const query = `
            INSERT INTO skills_assessments (
                player_id, skill_category, skill_name, current_level, target_level,
                assessment_date, assessed_by, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            assessmentData.player_id,
            assessmentData.skill_category,
            assessmentData.skill_name,
            assessmentData.current_level,
            assessmentData.target_level,
            assessmentData.assessment_date,
            assessmentData.assessed_by,
            assessmentData.notes
        ]);
        
        return result.lastID;
    }

    async insertMilestone(milestoneData) {
        const query = `
            INSERT INTO development_milestones (
                plan_id, title, description, target_date, status
            ) VALUES (?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            milestoneData.plan_id,
            milestoneData.title,
            milestoneData.description,
            milestoneData.target_date,
            milestoneData.status
        ]);
        
        return result.lastID;
    }

    async insertProgressTracking(progressData) {
        const query = `
            INSERT INTO progress_tracking (
                plan_id, progress_date, progress_percentage, notes, updated_by
            ) VALUES (?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            progressData.plan_id,
            progressData.progress_date,
            progressData.progress_percentage,
            progressData.notes,
            progressData.updated_by
        ]);
        
        return result.lastID;
    }

    async updateMilestoneStatuses(planId, progressPercentage) {
        // Update milestone statuses based on overall plan progress
        // This is a simplified implementation
        const query = `
            UPDATE development_milestones 
            SET status = 'completed' 
            WHERE plan_id = ? AND status = 'pending' AND ? >= 75
        `;
        
        await db.run(query, [planId, progressPercentage]);
    }

    getSummary() {
        return {
            development_plans: this.createdPlans.length,
            skill_assessments: this.createdAssessments.length,
            milestones: this.createdMilestones.length,
            progress_entries: this.createdProgress.length
        };
    }

    reset() {
        this.createdPlans = [];
        this.createdAssessments = [];
        this.createdProgress = [];
        this.createdMilestones = [];
    }
}

module.exports = DevelopmentSeeder;