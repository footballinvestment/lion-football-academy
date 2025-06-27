/**
 * Injury Seeder
 * Creates realistic injury records and medical data
 */

const db = require('../src/database/connection');
const DataGenerators = require('./data-generators');

class InjurySeeder {
    constructor() {
        this.generator = new DataGenerators();
        this.createdInjuries = [];
        this.createdMedicalRecords = [];
        this.createdTreatments = [];
    }

    /**
     * Create injury and medical data for a season
     * @param {string} season - Season (e.g., '2024-25')
     * @param {Array} players - Available players
     * @param {Array} matches - Season matches
     * @param {Array} trainings - Season trainings
     * @returns {Object} Created data summary
     */
    async seedInjuryDataForSeason(season, players, matches, trainings) {
        console.log(`🏥 Creating injury and medical data for season ${season}...`);
        
        try {
            // Create training-related injuries
            await this.createTrainingInjuries(season, players, trainings);
            
            // Create match-related injuries
            await this.createMatchInjuries(season, players, matches);
            
            // Create medical records for all players
            await this.createMedicalRecords(season, players);
            
            // Create treatment records for injuries
            await this.createTreatmentRecords(season);
            
            // Mark some injuries as recovered
            await this.markInjuriesAsRecovered(season);
            
            console.log(`✅ Injury and medical data created for season ${season}`);
            return this.getSummary();
            
        } catch (error) {
            console.error(`❌ Failed to create injury data for season ${season}:`, error);
            throw error;
        }
    }

    /**
     * Create training-related injuries
     */
    async createTrainingInjuries(season, players, trainings) {
        console.log('🏃‍♂️ Creating training-related injuries...');
        
        let totalInjuries = 0;
        
        // Injury rate: approximately 5% of training sessions result in minor injuries
        const injuryProbability = 0.05;
        
        for (const training of trainings) {
            if (Math.random() > injuryProbability) continue;
            
            // Get players from the training team
            const teamPlayers = players.filter(p => p.team_id === training.team_id);
            if (teamPlayers.length === 0) continue;
            
            const injuredPlayer = this.generator.randomFromArray(teamPlayers);
            const playerAge = this.calculatePlayerAge(injuredPlayer.birth_date, season);
            const position = this.getPositionFromName(injuredPlayer.position);
            
            const injury = this.generator.generateInjury(position, 'training');
            
            const injuryData = {
                player_id: injuredPlayer.id,
                team_id: injuredPlayer.team_id,
                injury_type: injury.injury_type,
                injury_severity: injury.injury_severity,
                body_part: injury.body_part,
                injury_date: training.date,
                injury_location: training.location,
                injury_circumstances: `Edzés közben történt sérülés - ${training.type}`,
                description: injury.description,
                expected_recovery_days: injury.expected_recovery_days,
                status: 'active',
                season: season,
                medical_attention_required: this.requiresMedicalAttention(injury.injury_severity),
                return_to_play_protocol: this.generateReturnToPlayProtocol(injury),
                prevention_notes: this.generatePreventionNotes(injury)
            };
            
            const injuryId = await this.insertInjury(injuryData);
            injuryData.id = injuryId;
            this.createdInjuries.push(injuryData);
            totalInjuries++;
        }
        
        console.log(`   ✓ Created ${totalInjuries} training injuries`);
    }

    /**
     * Create match-related injuries
     */
    async createMatchInjuries(season, players, matches) {
        console.log('⚽ Creating match-related injuries...');
        
        let totalInjuries = 0;
        const finishedMatches = matches.filter(m => m.match_status === 'finished');
        
        // Match injury rate: approximately 8% of matches result in injuries
        const injuryProbability = 0.08;
        
        for (const match of finishedMatches) {
            if (Math.random() > injuryProbability) continue;
            
            // Determine which team's player gets injured
            const teams = [match.home_team_id, match.away_team_id].filter(Boolean);
            if (teams.length === 0) continue;
            
            const injuredTeamId = this.generator.randomFromArray(teams);
            const teamPlayers = players.filter(p => p.team_id === injuredTeamId);
            if (teamPlayers.length === 0) continue;
            
            const injuredPlayer = this.generator.randomFromArray(teamPlayers);
            const position = this.getPositionFromName(injuredPlayer.position);
            
            const injury = this.generator.generateInjury(position, 'match');
            
            const injuryData = {
                player_id: injuredPlayer.id,
                team_id: injuredPlayer.team_id,
                injury_type: injury.injury_type,
                injury_severity: injury.injury_severity,
                body_part: injury.body_part,
                injury_date: match.match_date,
                injury_location: match.venue,
                injury_circumstances: `Mérkőzés közben történt sérülés - ${match.match_type}`,
                description: injury.description,
                expected_recovery_days: injury.expected_recovery_days,
                status: 'active',
                season: season,
                match_id: match.id,
                injury_minute: Math.floor(Math.random() * match.match_duration) + 1,
                medical_attention_required: this.requiresMedicalAttention(injury.injury_severity),
                return_to_play_protocol: this.generateReturnToPlayProtocol(injury),
                prevention_notes: this.generatePreventionNotes(injury)
            };
            
            const injuryId = await this.insertInjury(injuryData);
            injuryData.id = injuryId;
            this.createdInjuries.push(injuryData);
            totalInjuries++;
        }
        
        console.log(`   ✓ Created ${totalInjuries} match injuries`);
    }

    /**
     * Create medical records for players
     */
    async createMedicalRecords(season, players) {
        console.log('📋 Creating medical records...');
        
        let totalRecords = 0;
        
        for (const player of players) {
            const playerAge = this.calculatePlayerAge(player.birth_date, season);
            
            // Each player gets 2-5 medical records per season
            const numRecords = Math.floor(Math.random() * 4) + 2;
            
            for (let i = 0; i < numRecords; i++) {
                const recordType = this.selectMedicalRecordType(playerAge, i);
                const recordDate = this.generateMedicalRecordDate(season, i, numRecords);
                
                const medicalRecord = {
                    player_id: player.id,
                    record_type: recordType,
                    record_date: recordDate,
                    medical_professional: this.generateMedicalProfessional(),
                    findings: this.generateMedicalFindings(recordType, playerAge),
                    recommendations: this.generateMedicalRecommendations(recordType),
                    follow_up_required: this.requiresFollowUp(recordType),
                    follow_up_date: this.generateFollowUpDate(recordDate, recordType),
                    season: season,
                    clearance_status: this.generateClearanceStatus(recordType),
                    notes: this.generateMedicalNotes(recordType, player)
                };
                
                const recordId = await this.insertMedicalRecord(medicalRecord);
                medicalRecord.id = recordId;
                this.createdMedicalRecords.push(medicalRecord);
                totalRecords++;
            }
        }
        
        console.log(`   ✓ Created ${totalRecords} medical records`);
    }

    /**
     * Create treatment records for injuries
     */
    async createTreatmentRecords(season) {
        console.log('💊 Creating treatment records...');
        
        let totalTreatments = 0;
        
        for (const injury of this.createdInjuries) {
            // Number of treatments based on injury severity
            const numTreatments = this.getTreatmentCount(injury.injury_severity);
            
            for (let i = 0; i < numTreatments; i++) {
                const treatmentDate = this.generateTreatmentDate(injury.injury_date, i, numTreatments);
                
                const treatment = {
                    injury_id: injury.id,
                    treatment_date: treatmentDate,
                    treatment_type: this.selectTreatmentType(injury.injury_type, i),
                    provider: this.generateTreatmentProvider(),
                    description: this.generateTreatmentDescription(injury.injury_type, i),
                    effectiveness: this.generateTreatmentEffectiveness(i, numTreatments),
                    cost: this.generateTreatmentCost(injury.injury_severity),
                    notes: this.generateTreatmentNotes(injury, i),
                    next_treatment_date: i < numTreatments - 1 ? 
                        this.generateTreatmentDate(injury.injury_date, i + 1, numTreatments) : null
                };
                
                const treatmentId = await this.insertTreatmentRecord(treatment);
                treatment.id = treatmentId;
                this.createdTreatments.push(treatment);
                totalTreatments++;
            }
        }
        
        console.log(`   ✓ Created ${totalTreatments} treatment records`);
    }

    /**
     * Mark some injuries as recovered
     */
    async markInjuriesAsRecovered(season) {
        console.log('✅ Marking recovered injuries...');
        
        let recoveredCount = 0;
        
        for (const injury of this.createdInjuries) {
            const injuryDate = new Date(injury.injury_date);
            const expectedRecoveryDate = new Date(injuryDate);
            expectedRecoveryDate.setDate(expectedRecoveryDate.getDate() + injury.expected_recovery_days);
            
            const today = new Date();
            
            // Mark as recovered if expected recovery date has passed
            if (expectedRecoveryDate < today) {
                const actualRecoveryDays = injury.expected_recovery_days + 
                    Math.floor((Math.random() - 0.5) * injury.expected_recovery_days * 0.3);
                
                const recoveryDate = new Date(injuryDate);
                recoveryDate.setDate(recoveryDate.getDate() + Math.max(1, actualRecoveryDays));
                
                const returnToPlayDate = new Date(recoveryDate);
                returnToPlayDate.setDate(returnToPlayDate.getDate() + Math.floor(Math.random() * 7) + 3);
                
                await this.markInjuryAsRecovered(
                    injury.id, 
                    recoveryDate.toISOString().split('T')[0],
                    returnToPlayDate.toISOString().split('T')[0]
                );
                
                recoveredCount++;
            }
        }
        
        console.log(`   ✓ Marked ${recoveredCount} injuries as recovered`);
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

    getPositionFromName(positionName) {
        return this.generator.footballPositions.find(p => p.name === positionName) || 
               this.generator.footballPositions[0];
    }

    requiresMedicalAttention(severity) {
        const requiresAttention = {
            'minor': Math.random() > 0.7,
            'moderate': Math.random() > 0.3,
            'severe': true,
            'critical': true
        };
        
        return requiresAttention[severity] || false;
    }

    generateReturnToPlayProtocol(injury) {
        const protocols = {
            'muscle_strain': 'Fokozatos terhelés, nyújtás, erősítés',
            'ligament_sprain': 'Immobilizáció, fizikoterápia, funkcionális tesztek',
            'bone_fracture': 'Gyógyulás követése, fokozatos mobilizáció',
            'joint_injury': 'Mozgásterjedelem helyreállítása, stabilizáció',
            'head_injury': 'Neurológiai vizsgálat, fokozatos visszatérés',
            'cut_laceration': 'Sebgyógyulás ellenőrzése, fertőzés megelőzése',
            'bruise_contusion': 'Duzzadás csökkentése, mozgás fenntartása',
            'overuse_injury': 'Pihentetés, biomechanikai korrekció'
        };
        
        return protocols[injury.injury_type] || 'Egyéni protokoll szükséges';
    }

    generatePreventionNotes(injury) {
        const prevention = {
            'muscle_strain': 'Megfelelő bemelegítés, nyújtás, fokozatos terhelés',
            'ligament_sprain': 'Propriocepciós tréning, erősítés, stabil cipő',
            'bone_fracture': 'Védőfelszerelés használata, biztonságos környezet',
            'joint_injury': 'Erősítő gyakorlatok, megfelelő technika',
            'head_injury': 'Fejvédő használata, fair play szabályok',
            'cut_laceration': 'Körültekintő játék, védőfelszerelés',
            'bruise_contusion': 'Védőfelszerelés, megfelelő távolságtartás',
            'overuse_injury': 'Fokozatos terhelés, pihenőnapok betartása'
        };
        
        return prevention[injury.injury_type] || 'Általános óvintézkedések';
    }

    selectMedicalRecordType(age, recordIndex) {
        const types = [
            'health_check',    // Annual health check
            'medical_clearance', // Sports participation clearance
            'vaccination',     // Vaccination records
            'fitness_test',    // Fitness assessment
            'allergy',         // Allergy documentation
            'medication',      // Medication records
            'medical_history'  // General medical history
        ];
        
        // First record is usually health check
        if (recordIndex === 0) return 'health_check';
        
        // Age-specific likelihood
        if (age <= 10 && Math.random() > 0.7) return 'vaccination';
        
        return this.generator.randomFromArray(types);
    }

    generateMedicalRecordDate(season, recordIndex, totalRecords) {
        const seasonStart = new Date(`${season.split('-')[0]}-08-01`);
        const seasonEnd = new Date(`${parseInt(season.split('-')[0]) + 1}-06-30`);
        
        // Spread records throughout the season
        const seasonDuration = seasonEnd.getTime() - seasonStart.getTime();
        const recordDate = new Date(seasonStart.getTime() + 
            (recordIndex / totalRecords) * seasonDuration);
        
        return recordDate.toISOString().split('T')[0];
    }

    generateMedicalProfessional() {
        const professionals = [
            'Dr. Nagy Péter (háziorvos)',
            'Dr. Kovács Anna (sportorvos)',
            'Dr. Szabó László (ortopéd)',
            'Dr. Tóth Katalin (gyermekgyógyász)',
            'Dr. Horváth Gábor (kardiológus)',
            'Varga Zsófia (fizioterapeuta)',
            'Molnár Attila (dietetikus)'
        ];
        
        return this.generator.randomFromArray(professionals);
    }

    generateMedicalFindings(recordType, age) {
        const findings = {
            health_check: [
                'Egészséges, sportolásra alkalmas',
                'Általános állapot jó',
                'Enyhe túlsúly észlelhető',
                'Kiváló fizikai kondíció'
            ],
            medical_clearance: [
                'Sporttevékenységre alkalmas',
                'Korlátozott terhelés javasolt',
                'Teljes sportolási engedély'
            ],
            vaccination: [
                'Védőoltások naprakészek',
                'Emlékeztető oltás szükséges',
                'Oltási terv kiegészítése'
            ],
            fitness_test: [
                'Átlagos fizikai teljesítmény',
                'Kiváló aerob kapacitás',
                'Erőnlét fejlesztendő',
                'Koordináció kiváló'
            ]
        };
        
        const typefindings = findings[recordType] || findings.health_check;
        return this.generator.randomFromArray(typefindings);
    }

    generateMedicalRecommendations(recordType) {
        const recommendations = {
            health_check: [
                'Évente kontroll vizsgálat',
                'Egészséges táplálkozás fenntartása',
                'Megfelelő pihenés biztosítása'
            ],
            medical_clearance: [
                'Sportolás folytatható',
                '6 hónapos újravizsgálat',
                'Korlátozott tevékenység'
            ],
            vaccination: [
                'Következő oltás időpontja',
                'Védőoltások frissítése',
                'Utazási oltások mérlegelése'
            ],
            fitness_test: [
                'Állóképesség fejlesztése',
                'Erősítő gyakorlatok',
                'Koordinációs tréning'
            ]
        };
        
        const typeRecs = recommendations[recordType] || recommendations.health_check;
        return this.generator.randomFromArray(typeRecs);
    }

    requiresFollowUp(recordType) {
        const followUpTypes = ['medical_clearance', 'allergy', 'medication'];
        return followUpTypes.includes(recordType) || Math.random() > 0.7;
    }

    generateFollowUpDate(recordDate, recordType) {
        if (!this.requiresFollowUp(recordType)) return null;
        
        const date = new Date(recordDate);
        const daysToAdd = recordType === 'medication' ? 30 : 
                         recordType === 'allergy' ? 90 : 180;
        
        date.setDate(date.getDate() + daysToAdd);
        return date.toISOString().split('T')[0];
    }

    generateClearanceStatus(recordType) {
        if (recordType === 'medical_clearance') {
            return this.generator.randomFromArray(['cleared', 'conditional', 'restricted']);
        }
        return 'cleared';
    }

    generateMedicalNotes(recordType, player) {
        const notes = [
            `${player.name} - ${recordType} vizsgálat`,
            'Korábbi sérülések figyelembevétele',
            'Családi anamnézis rendben',
            'Különös figyelmet igénylő terület nincs'
        ];
        
        return this.generator.randomFromArray(notes);
    }

    getTreatmentCount(severity) {
        const counts = {
            'minor': Math.floor(Math.random() * 3) + 1,    // 1-3 treatments
            'moderate': Math.floor(Math.random() * 4) + 3, // 3-6 treatments
            'severe': Math.floor(Math.random() * 6) + 5,   // 5-10 treatments
            'critical': Math.floor(Math.random() * 8) + 8  // 8-15 treatments
        };
        
        return counts[severity] || 2;
    }

    generateTreatmentDate(injuryDate, treatmentIndex, totalTreatments) {
        const injury = new Date(injuryDate);
        
        // Spread treatments over recovery period
        const daysBetweenTreatments = Math.floor(30 / totalTreatments);
        const treatmentDate = new Date(injury);
        treatmentDate.setDate(treatmentDate.getDate() + (treatmentIndex * daysBetweenTreatments) + 1);
        
        return treatmentDate.toISOString().split('T')[0];
    }

    selectTreatmentType(injuryType, treatmentIndex) {
        const treatmentProgression = {
            'muscle_strain': ['Pihentetés, jég', 'Fizikoterápia', 'Erősítő gyakorlatok'],
            'ligament_sprain': ['Immobilizáció', 'Fizikoterápia', 'Mozgásterápia'],
            'bone_fracture': ['Rögzítés', 'Röntgen kontroll', 'Rehabilitáció'],
            'joint_injury': ['Gyulladáscsökkentés', 'Mozgásterápia', 'Erősítés'],
            'head_injury': ['Megfigyelés', 'Neurológiai vizsgálat', 'Fokozatos visszatérés'],
            'cut_laceration': ['Sebellátás', 'Kötéscseré', 'Varratszedés'],
            'bruise_contusion': ['Hűtés', 'Fájdalomcsillapítás', 'Mobilizáció'],
            'overuse_injury': ['Pihentetés', 'Biomechanikai analízis', 'Fokozatos terhelés']
        };
        
        const progression = treatmentProgression[injuryType] || 
                           ['Alapellátás', 'Fizikoterápia', 'Rehabilitáció'];
        
        return progression[Math.min(treatmentIndex, progression.length - 1)];
    }

    generateTreatmentProvider() {
        const providers = [
            'Akadémia orvos',
            'Dr. Nagy Péter',
            'Varga Zsófia fizioterapeuta',
            'Megyei kórház',
            'Szakrendelés',
            'Magánklinika',
            'Rehabilitációs központ'
        ];
        
        return this.generator.randomFromArray(providers);
    }

    generateTreatmentDescription(injuryType, treatmentIndex) {
        const descriptions = {
            'muscle_strain': ['RICE kezelés', 'Manuális terápia', 'Nyújtás és erősítés'],
            'ligament_sprain': ['Gipszelés', 'Ultrahang terápia', 'Stabilizációs gyakorlatok'],
            'bone_fracture': ['Repozíció', 'Kontroll röntgen', 'Terhelés fokozása']
        };
        
        const injuryDescriptions = descriptions[injuryType] || 
                                  ['Alapkezelés', 'Terápia folytatása', 'Zárókezelés'];
        
        return injuryDescriptions[Math.min(treatmentIndex, injuryDescriptions.length - 1)];
    }

    generateTreatmentEffectiveness(treatmentIndex, totalTreatments) {
        // Treatment effectiveness typically improves over time
        const baseEffectiveness = 50;
        const improvement = (treatmentIndex / totalTreatments) * 40;
        const randomVariation = (Math.random() - 0.5) * 20;
        
        return Math.round(Math.max(10, Math.min(100, baseEffectiveness + improvement + randomVariation)));
    }

    generateTreatmentCost(severity) {
        const baseCosts = {
            'minor': 5000,
            'moderate': 15000,
            'severe': 30000,
            'critical': 50000
        };
        
        const baseCost = baseCosts[severity] || 10000;
        const variation = (Math.random() - 0.5) * baseCost * 0.3;
        
        return Math.round(baseCost + variation);
    }

    generateTreatmentNotes(injury, treatmentIndex) {
        const notes = [
            `${injury.body_part} sérülés kezelése`,
            'Jó együttműködés a beteggel',
            'Tervezett gyógyulás',
            'Fokozatos javulás tapasztalható'
        ];
        
        return this.generator.randomFromArray(notes);
    }

    // Database operations

    async insertInjury(injuryData) {
        const query = `
            INSERT INTO injuries (
                player_id, team_id, injury_type, injury_severity, body_part,
                injury_date, injury_location, description, expected_recovery_days,
                status, season
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            injuryData.player_id,
            injuryData.team_id,
            injuryData.injury_type,
            injuryData.injury_severity,
            injuryData.body_part,
            injuryData.injury_date,
            injuryData.injury_location,
            injuryData.description,
            injuryData.expected_recovery_days,
            injuryData.status,
            injuryData.season
        ]);
        
        return result.lastID;
    }

    async insertMedicalRecord(recordData) {
        const query = `
            INSERT INTO medical_records (
                player_id, record_type, record_date, medical_professional,
                findings, recommendations, follow_up_required, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            recordData.player_id,
            recordData.record_type,
            recordData.record_date,
            recordData.medical_professional,
            recordData.findings,
            recordData.recommendations,
            recordData.follow_up_required ? 1 : 0,
            recordData.notes
        ]);
        
        return result.lastID;
    }

    async insertTreatmentRecord(treatmentData) {
        // This would insert into a treatment_records table if it existed
        // For now, we'll simulate it
        return Math.floor(Math.random() * 10000) + 1;
    }

    async markInjuryAsRecovered(injuryId, recoveryDate, returnToPlayDate) {
        const query = `
            UPDATE injuries 
            SET status = 'recovered', recovery_date = ?, return_to_play_date = ?
            WHERE id = ?
        `;
        
        await db.run(query, [recoveryDate, returnToPlayDate, injuryId]);
    }

    getSummary() {
        return {
            injuries: this.createdInjuries.length,
            medical_records: this.createdMedicalRecords.length,
            treatments: this.createdTreatments.length,
            training_injuries: this.createdInjuries.filter(i => !i.match_id).length,
            match_injuries: this.createdInjuries.filter(i => i.match_id).length,
            recovered_injuries: this.createdInjuries.filter(i => i.status === 'recovered').length
        };
    }

    reset() {
        this.createdInjuries = [];
        this.createdMedicalRecords = [];
        this.createdTreatments = [];
    }
}

module.exports = InjurySeeder;