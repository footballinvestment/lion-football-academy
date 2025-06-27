/**
 * Data Generators for Hungarian Football Academy
 * Realistic Hungarian names, locations, and football-specific data
 */

class DataGenerators {
    constructor() {
        this.hungarianMaleNames = [
            'Ádám', 'Adrián', 'Ákos', 'Albertó', 'Aladár', 'Alebárd', 'Alexander', 'András',
            'Anzelm', 'Árpád', 'Artúr', 'Attila', 'Balázs', 'Bálint', 'Barnabás', 'Bartus',
            'Béla', 'Bendegúz', 'Benő', 'Bertalan', 'Boldizsár', 'Botond', 'Budó', 'Csaba',
            'Csongor', 'Dániel', 'Dávid', 'Dénes', 'Dominik', 'Ede', 'Eduard', 'Elemér',
            'Emánuel', 'Emil', 'Endre', 'Erik', 'Ernő', 'Ervin', 'Etele', 'Fábián',
            'Ferenc', 'Flórián', 'Frigyes', 'Gábor', 'Gergely', 'Gergő', 'Gusztáv', 'Győző',
            'Gyula', 'Hajnal', 'Henrik', 'Hunor', 'Igor', 'Imre', 'István', 'Iván',
            'János', 'József', 'Károly', 'Kornél', 'Krisztián', 'László', 'Levente', 'Lóránd',
            'Loránt', 'Lőrinc', 'Márió', 'Márk', 'Márton', 'Máté', 'Mátyás', 'Mihály',
            'Miklós', 'Milán', 'Nándor', 'Norbert', 'Olivér', 'Oszkár', 'Péter', 'Patrik',
            'Richárd', 'Róbert', 'Roland', 'Sándor', 'Sebestyén', 'Simon', 'Szabolcs', 'Szilveszter',
            'Tamás', 'Tibor', 'Vince', 'Viktor', 'Vilmos', 'Zalán', 'Zoltán', 'Zsombor'
        ];

        this.hungarianFemaleNames = [
            'Adrienn', 'Ágnes', 'Alexandra', 'Alíz', 'Anikó', 'Anna', 'Annamária', 'Anett',
            'Beatrix', 'Bernadett', 'Bianka', 'Brigitta', 'Csilla', 'Diána', 'Dóra', 'Edit',
            'Emese', 'Enikő', 'Eszter', 'Éva', 'Evelin', 'Fanni', 'Flóra', 'Fruzsina',
            'Georgina', 'Gyöngyi', 'Hajnalka', 'Helga', 'Henrietta', 'Ildikó', 'Irén', 'Ita',
            'Jázmin', 'Johanna', 'Júlia', 'Julianna', 'Judit', 'Kamilla', 'Katalin', 'Kinga',
            'Klára', 'Krisztina', 'Laura', 'Lilla', 'Linda', 'Lívia', 'Luca', 'Magdolna',
            'Margit', 'Marianna', 'Márta', 'Melinda', 'Mónika', 'Nóra', 'Orsolya', 'Patrícia',
            'Petra', 'Réka', 'Renáta', 'Rita', 'Sarolta', 'Szilvia', 'Tímea', 'Tünde',
            'Vanda', 'Valéria', 'Vera', 'Veronika', 'Viktória', 'Vivien', 'Zita', 'Zsófia'
        ];

        this.hungarianSurnames = [
            'Nagy', 'Kovács', 'Tóth', 'Szabó', 'Horváth', 'Varga', 'Kiss', 'Molnár',
            'Németh', 'Farkas', 'Balogh', 'Papp', 'Takács', 'Juhász', 'Lakatos', 'Mészáros',
            'Oláh', 'Simon', 'Rácz', 'Fekete', 'Szűcs', 'Török', 'Fehér', 'Balázs',
            'Gál', 'Kis', 'Szalai', 'Kocsis', 'Orsós', 'Pintér', 'Katona', 'Gáspár',
            'Lukács', 'Jakab', 'Kovácsi', 'Vincze', 'Zoltán', 'Somogyi', 'Fülöp', 'Kerekes',
            'Halász', 'Lengyel', 'Boros', 'Fazekas', 'Kozma', 'Hajdu', 'Váradi', 'Antal',
            'Magyar', 'Győri', 'Bakos', 'Rózsa', 'Pál', 'Márton', 'Asztalos', 'Kelemen',
            'Budai', 'Biró', 'Sándor', 'Hegedűs', 'Lengyel', 'Szabados', 'Márkus', 'Faragó'
        ];

        this.hungarianCities = [
            'Budapest', 'Debrecen', 'Szeged', 'Miskolc', 'Pécs', 'Győr', 'Nyíregyháza', 'Kecskemét',
            'Székesfehérvár', 'Szombathely', 'Szolnok', 'Tatabánya', 'Kaposvár', 'Békéscsaba',
            'Érd', 'Zalaegerszeg', 'Salgótarján', 'Eger', 'Dunaújváros', 'Hódmezővásárhely',
            'Sopron', 'Veszprém', 'Baja', 'Ózd', 'Ajka', 'Dunakeszi', 'Cegléd', 'Nagykanizsa'
        ];

        this.footballPositions = [
            { name: 'Kapus', abbreviation: 'GK', type: 'goalkeeper' },
            { name: 'Jobbhátvéd', abbreviation: 'RB', type: 'defender' },
            { name: 'Középhátvéd', abbreviation: 'CB', type: 'defender' },
            { name: 'Balhátvéd', abbreviation: 'LB', type: 'defender' },
            { name: 'Védekező középpályás', abbreviation: 'CDM', type: 'midfielder' },
            { name: 'Középpályás', abbreviation: 'CM', type: 'midfielder' },
            { name: 'Támadó középpályás', abbreviation: 'CAM', type: 'midfielder' },
            { name: 'Jobbszélső', abbreviation: 'RW', type: 'forward' },
            { name: 'Balszélső', abbreviation: 'LW', type: 'forward' },
            { name: 'Csatár', abbreviation: 'ST', type: 'forward' }
        ];

        this.skillCategories = {
            technical: ['Labdavezetés', 'Első érintés', 'Passzolás', 'Lövés', 'Cselezés', 'Fejjáték'],
            tactical: ['Pozíciójáték', 'Védelem', 'Támadás', 'Átmenetek', 'Presszingelés', 'Oldalváltás'],
            physical: ['Gyorsaság', 'Erő', 'Állóképesség', 'Agilitás', 'Egyensúly', 'Koordináció'],
            mental: ['Koncentráció', 'Magabiztosság', 'Döntéshozatal', 'Vezetői készség', 'Stressz kezelés', 'Motiváció'],
            goalkeeping: ['Fogás', 'Kijövések', 'Labdarúgás', 'Dobás', 'Reflexek', 'Helyezkedés']
        };

        this.injuryTypes = [
            { type: 'muscle_strain', hun_name: 'Izomhúzódás', severity_range: [1, 3], recovery_days: [7, 21] },
            { type: 'ligament_sprain', hun_name: 'Szalagszakadás', severity_range: [2, 4], recovery_days: [14, 42] },
            { type: 'bone_fracture', hun_name: 'Csonttörés', severity_range: [3, 4], recovery_days: [28, 84] },
            { type: 'joint_injury', hun_name: 'Ízületi sérülés', severity_range: [2, 4], recovery_days: [10, 35] },
            { type: 'head_injury', hun_name: 'Fejsérülés', severity_range: [2, 4], recovery_days: [5, 21] },
            { type: 'cut_laceration', hun_name: 'Vágás', severity_range: [1, 2], recovery_days: [3, 10] },
            { type: 'bruise_contusion', hun_name: 'Zúzódás', severity_range: [1, 2], recovery_days: [3, 14] },
            { type: 'overuse_injury', hun_name: 'Túlterhelés', severity_range: [1, 3], recovery_days: [7, 28] }
        ];

        this.bodyParts = [
            'Fej', 'Nyak', 'Váll', 'Felkar', 'Könyök', 'Alkar', 'Csukló', 'Kéz',
            'Mellkas', 'Hát', 'Derék', 'Csípő', 'Comb', 'Térd', 'Lábszár', 'Boka', 'Láb'
        ];

        this.seasons = [
            '2020-21', '2021-22', '2022-23', '2023-24', '2024-25'
        ];

        this.ageGroups = [
            { name: 'U8', minAge: 6, maxAge: 8, teamSize: 10 },
            { name: 'U10', minAge: 8, maxAge: 10, teamSize: 12 },
            { name: 'U12', minAge: 10, maxAge: 12, teamSize: 14 },
            { name: 'U14', minAge: 12, maxAge: 14, teamSize: 16 },
            { name: 'U16', minAge: 14, maxAge: 16, teamSize: 18 },
            { name: 'U18', minAge: 16, maxAge: 18, teamSize: 20 }
        ];
    }

    /**
     * Generate a random Hungarian name
     * @param {string} gender - 'male' or 'female'
     * @returns {string} Full Hungarian name
     */
    generateHungarianName(gender = 'male') {
        const firstNames = gender === 'female' ? this.hungarianFemaleNames : this.hungarianMaleNames;
        const firstName = this.randomFromArray(firstNames);
        const surname = this.randomFromArray(this.hungarianSurnames);
        return `${surname} ${firstName}`;
    }

    /**
     * Generate email from name
     * @param {string} fullName 
     * @returns {string} Email address
     */
    generateEmail(fullName) {
        const nameParts = fullName.toLowerCase()
            .replace(/[áàâä]/g, 'a')
            .replace(/[éèêë]/g, 'e')
            .replace(/[íìîï]/g, 'i')
            .replace(/[óòôö]/g, 'o')
            .replace(/[úùûü]/g, 'u')
            .replace(/ő/g, 'o')
            .replace(/ű/g, 'u')
            .replace(/ç/g, 'c')
            .replace(/ň/g, 'n')
            .replace(/š/g, 's')
            .replace(/ž/g, 'z')
            .replace(/ť/g, 't')
            .replace(/ď/g, 'd')
            .replace(/ľ/g, 'l')
            .replace(/ŕ/g, 'r')
            .replace(/\s+/g, '.');
        
        const domains = ['gmail.com', 'freemail.hu', 'citromail.hu', 'index.hu', 'email.hu'];
        return `${nameParts}@${this.randomFromArray(domains)}`;
    }

    /**
     * Generate Hungarian phone number
     * @returns {string} Phone number
     */
    generatePhoneNumber() {
        const prefixes = ['06 20', '06 30', '06 70'];
        const prefix = this.randomFromArray(prefixes);
        const number = Math.floor(Math.random() * 9000000) + 1000000;
        return `${prefix} ${number.toString().substring(0, 3)} ${number.toString().substring(3)}`;
    }

    /**
     * Generate birth date for age group
     * @param {string} ageGroup - Age group (U8, U10, etc.)
     * @param {string} season - Season (2024-25, etc.)
     * @returns {string} Birth date in YYYY-MM-DD format
     */
    generateBirthDate(ageGroup, season) {
        const group = this.ageGroups.find(g => g.name === ageGroup);
        if (!group) return null;

        const seasonYear = parseInt(season.split('-')[0]);
        const ageRange = group.maxAge - group.minAge;
        const randomAge = group.minAge + Math.floor(Math.random() * (ageRange + 1));
        const birthYear = seasonYear - randomAge;
        
        const month = Math.floor(Math.random() * 12) + 1;
        const day = Math.floor(Math.random() * 28) + 1; // Safe day range
        
        return `${birthYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    /**
     * Generate realistic player position based on age
     * @param {string} ageGroup 
     * @returns {Object} Position info
     */
    generatePosition(ageGroup) {
        const ageNum = parseInt(ageGroup.replace('U', ''));
        
        // Younger players often play multiple positions
        if (ageNum <= 10) {
            const positions = ['Kapus', 'Hátvéd', 'Középpályás', 'Támadó'];
            return {
                name: this.randomFromArray(positions),
                abbreviation: this.randomFromArray(['GK', 'DEF', 'MID', 'FWD']),
                type: this.randomFromArray(['goalkeeper', 'defender', 'midfielder', 'forward'])
            };
        }
        
        return this.randomFromArray(this.footballPositions);
    }

    /**
     * Generate team color
     * @returns {string} Hex color
     */
    generateTeamColor() {
        const colors = [
            '#FF6B35', '#004E98', '#009F3D', '#8B1538', '#FF9500',
            '#2E86AB', '#A23B72', '#F18F01', '#C73E1D', '#5D737E',
            '#7209B7', '#560BAD', '#480CA8', '#3A0CA3', '#3F37C9'
        ];
        return this.randomFromArray(colors);
    }

    /**
     * Generate training schedule for a week
     * @param {string} ageGroup 
     * @returns {Array} Training sessions
     */
    generateWeeklyTrainingSchedule(ageGroup) {
        const ageNum = parseInt(ageGroup.replace('U', ''));
        const sessionsPerWeek = ageNum <= 10 ? 2 : ageNum <= 14 ? 3 : 4;
        
        const days = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];
        const times = ['16:00', '17:00', '18:00', '19:00'];
        const types = [
            'Technikai edzés', 'Taktikai edzés', 'Fizikai felkészítés', 
            'Játék edzés', 'Kapusedzés', 'Kondicionálás'
        ];
        
        const schedule = [];
        const usedDays = [];
        
        for (let i = 0; i < sessionsPerWeek; i++) {
            let day;
            do {
                day = this.randomFromArray(days);
            } while (usedDays.includes(day));
            
            usedDays.push(day);
            
            schedule.push({
                day: day,
                time: this.randomFromArray(times),
                duration: 60 + (ageNum >= 14 ? 30 : 0), // Older players train longer
                type: this.randomFromArray(types)
            });
        }
        
        return schedule.sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day));
    }

    /**
     * Generate match result based on team strengths
     * @param {number} homeStrength - Home team strength (1-10)
     * @param {number} awayStrength - Away team strength (1-10)
     * @returns {Object} Match result
     */
    generateMatchResult(homeStrength = 5, awayStrength = 5) {
        // Home advantage
        const adjustedHomeStrength = homeStrength + 0.5;
        
        // Calculate goal expectancy based on strength difference
        const strengthDiff = adjustedHomeStrength - awayStrength;
        const homeGoalExpectancy = Math.max(0.5, 2 + (strengthDiff * 0.3));
        const awayGoalExpectancy = Math.max(0.5, 2 - (strengthDiff * 0.3));
        
        // Generate goals using Poisson-like distribution
        const homeScore = this.poissonRandom(homeGoalExpectancy);
        const awayScore = this.poissonRandom(awayGoalExpectancy);
        
        return {
            homeScore: Math.min(homeScore, 8), // Cap at 8 goals
            awayScore: Math.min(awayScore, 8),
            possession: {
                home: Math.round(45 + (strengthDiff * 2) + Math.random() * 10),
                away: null // Will be calculated as 100 - home
            }
        };
    }

    /**
     * Generate player performance rating based on position and match result
     * @param {string} position 
     * @param {boolean} isWinner 
     * @param {boolean} isCleaner - Clean sheet for defenders/goalkeepers
     * @returns {number} Rating 1-10
     */
    generatePerformanceRating(position, isWinner = false, isCleanSheet = false) {
        let baseRating = 5.0 + (Math.random() * 2 - 1); // 4-6 base
        
        // Position-specific adjustments
        if (position.type === 'goalkeeper' && isCleanSheet) {
            baseRating += 1.0;
        } else if (position.type === 'defender' && isCleanSheet) {
            baseRating += 0.5;
        } else if (position.type === 'forward' && isWinner) {
            baseRating += 0.5;
        }
        
        // Team result adjustment
        if (isWinner) {
            baseRating += 0.3;
        }
        
        // Random variance
        baseRating += (Math.random() * 1 - 0.5);
        
        return Math.max(1.0, Math.min(10.0, Math.round(baseRating * 10) / 10));
    }

    /**
     * Generate skill assessment
     * @param {string} category - Skill category
     * @param {number} playerAge - Player age
     * @param {number} baseLevel - Base skill level
     * @returns {Object} Skill assessment
     */
    generateSkillAssessment(category, playerAge, baseLevel = null) {
        const skills = this.skillCategories[category] || this.skillCategories.technical;
        const skill = this.randomFromArray(skills);
        
        // Age-based skill level expectations
        let maxLevel = Math.min(10, Math.floor(playerAge / 2) + 3);
        let currentLevel = baseLevel || Math.floor(Math.random() * maxLevel) + 1;
        let targetLevel = Math.min(10, currentLevel + Math.floor(Math.random() * 3) + 1);
        
        return {
            skill_category: category,
            skill_name: skill,
            current_level: currentLevel,
            target_level: targetLevel,
            notes: this.generateSkillNotes(skill, currentLevel, targetLevel)
        };
    }

    /**
     * Generate development plan based on player profile
     * @param {Object} player - Player data
     * @returns {Object} Development plan
     */
    generateDevelopmentPlan(player) {
        const planTypes = ['skill_development', 'fitness', 'technical', 'tactical', 'mental'];
        const planType = this.randomFromArray(planTypes);
        
        const startDate = new Date();
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() + Math.floor(Math.random() * 6) + 3);
        
        return {
            plan_type: planType,
            goal: this.generatePlanGoal(planType, player.position),
            target_date: targetDate.toISOString().split('T')[0],
            priority: this.randomFromArray(['low', 'medium', 'high']),
            status: 'active',
            progress_percentage: Math.floor(Math.random() * 60) + 20
        };
    }

    /**
     * Generate injury based on position and activity
     * @param {string} position 
     * @param {string} activityType - 'training' or 'match'
     * @returns {Object} Injury data
     */
    generateInjury(position, activityType = 'training') {
        const injury = this.randomFromArray(this.injuryTypes);
        const bodyPart = this.getPositionSpecificBodyPart(position);
        
        // Match injuries tend to be more severe
        const severityModifier = activityType === 'match' ? 1 : 0;
        const minSeverity = Math.min(4, injury.severity_range[0] + severityModifier);
        const maxSeverity = Math.min(4, injury.severity_range[1] + severityModifier);
        
        const severity = Math.floor(Math.random() * (maxSeverity - minSeverity + 1)) + minSeverity;
        const severityNames = ['minor', 'moderate', 'severe', 'critical'];
        
        const recoveryDays = Math.floor(
            Math.random() * (injury.recovery_days[1] - injury.recovery_days[0] + 1)
        ) + injury.recovery_days[0];
        
        return {
            injury_type: injury.type,
            injury_severity: severityNames[severity - 1],
            body_part: bodyPart,
            description: `${injury.hun_name} - ${bodyPart}`,
            expected_recovery_days: recoveryDays,
            injury_location: activityType === 'match' ? 'Mérkőzés közben' : 'Edzés közben'
        };
    }

    // Helper methods
    randomFromArray(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    poissonRandom(lambda) {
        const L = Math.exp(-lambda);
        let k = 0;
        let p = 1;
        
        do {
            k++;
            p *= Math.random();
        } while (p > L);
        
        return k - 1;
    }

    getPositionSpecificBodyPart(position) {
        const positionBodyParts = {
            goalkeeper: ['Kéz', 'Csukló', 'Ujj', 'Térd', 'Váll'],
            defender: ['Láb', 'Boka', 'Térd', 'Fej', 'Derék'],
            midfielder: ['Lábszár', 'Comb', 'Boka', 'Térd'],
            forward: ['Comb', 'Térd', 'Boka', 'Láb', 'Lábszár']
        };
        
        const parts = positionBodyParts[position.type] || this.bodyParts;
        return this.randomFromArray(parts);
    }

    generateSkillNotes(skill, currentLevel, targetLevel) {
        const notes = [
            `${skill} készség fejlesztése szükséges`,
            `Rendszeres gyakorlással javítható`,
            `Egyéni edzésekkel gyorsítható a fejlődés`,
            `Csapatgyakorlatok során fókuszálni`,
            `Mentor játékostól tanulás ajánlott`
        ];
        return this.randomFromArray(notes);
    }

    generatePlanGoal(planType, position) {
        const goals = {
            skill_development: [
                `${position.name} pozícióhoz szükséges készségek fejlesztése`,
                'Labdabiztosság javítása',
                'Passzolási pontosság növelése'
            ],
            fitness: [
                'Állóképesség fejlesztése',
                'Gyorsaság növelése',
                'Erőnlét javítása'
            ],
            technical: [
                'Technikai végrehajtás tökéletesítése',
                'Labdavezetés fejlesztése',
                'Lövéstechnika javítása'
            ],
            tactical: [
                'Taktikai tudatosság növelése',
                'Pozíciójáték javítása',
                'Csapatmunka fejlesztése'
            ],
            mental: [
                'Önbizalom erősítése',
                'Koncentráció fejlesztése',
                'Nyomás alatti teljesítmény javítása'
            ]
        };
        
        return this.randomFromArray(goals[planType] || goals.skill_development);
    }

    /**
     * Generate realistic season progression for a player
     * @param {Object} player - Current player data
     * @param {string} newSeason - Target season
     * @returns {Object} Updated player data
     */
    progressPlayer(player, newSeason) {
        const currentAge = new Date().getFullYear() - new Date(player.birth_date).getFullYear();
        const newAge = currentAge + 1;
        
        // Check if player should move to next age group
        let newAgeGroup = player.current_age_group;
        for (const group of this.ageGroups) {
            if (newAge <= group.maxAge && newAge >= group.minAge) {
                newAgeGroup = group.name;
                break;
            }
        }
        
        return {
            ...player,
            current_age_group: newAgeGroup,
            season: newSeason,
            needs_team_change: newAgeGroup !== player.current_age_group
        };
    }
}

module.exports = DataGenerators;