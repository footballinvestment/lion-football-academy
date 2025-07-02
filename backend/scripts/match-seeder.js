/**
 * Match Seeder
 * Creates realistic match fixtures, results, and performance data
 */

const db = require('../src/database/connection');
const DataGenerators = require('./data-generators');
const ExternalTeamsSeeder = require('./external-teams-seeder');

class MatchSeeder {
    constructor() {
        this.generator = new DataGenerators();
        this.externalSeeder = new ExternalTeamsSeeder();
        this.createdMatches = [];
        this.createdPerformances = [];
        this.createdEvents = [];
        this.externalTeams = {};
    }

    /**
     * Create match data for a season
     * @param {string} season - Season (e.g., '2024-25')
     * @param {Array} teams - Available teams
     * @param {Array} players - Available players
     * @returns {Object} Created data summary
     */
    async seedMatchesForSeason(season, teams, players) {
        console.log(`⚽ Creating matches for season ${season}...`);
        
        try {
            // Initialize external teams if not already done
            if (Object.keys(this.externalTeams).length === 0) {
                console.log('🏟️  Initializing external teams...');
                await this.loadExternalTeams();
            }
            
            // Create league fixtures (academy vs academy)
            await this.createLeagueFixtures(season, teams);
            
            // Create friendly matches (mix of internal and external)
            await this.createFriendlyMatches(season, teams);
            
            // Create cup matches
            await this.createCupMatches(season, teams);
            
            // Create external tournament matches
            await this.createExternalTournamentMatches(season, teams);
            
            // Generate match results and statistics
            await this.generateMatchResults(season, teams, players);
            
            // Create match events (disabled temporarily)
            // await this.generateMatchEvents(season);
            
            // Create team match statistics (disabled temporarily)
            // await this.generateTeamStatistics(season);
            
            console.log(`✅ Matches created for season ${season}`);
            return this.getSummary();
            
        } catch (error) {
            console.error(`❌ Failed to create matches for season ${season}:`, error);
            throw error;
        }
    }

    /**
     * Create league fixtures (round-robin within age groups)
     */
    async createLeagueFixtures(season, teams) {
        console.log('🏆 Creating league fixtures...');
        
        // Group teams by age group
        const teamsByAge = {};
        teams.forEach(team => {
            if (!teamsByAge[team.age_group]) {
                teamsByAge[team.age_group] = [];
            }
            teamsByAge[team.age_group].push(team);
        });
        
        let totalMatches = 0;
        
        for (const [ageGroup, ageTeams] of Object.entries(teamsByAge)) {
            if (ageTeams.length < 2) continue; // Need at least 2 teams
            
            // Create external teams for more realistic league
            const externalTeams = this.createExternalTeams(ageGroup, season);
            const allTeams = [...ageTeams, ...externalTeams];
            
            // Create round-robin fixtures
            const fixtures = this.generateRoundRobinFixtures(allTeams, season, ageGroup);
            
            for (const fixture of fixtures) {
                await this.insertMatch(fixture);
                this.createdMatches.push(fixture);
                totalMatches++;
            }
        }
        
        console.log(`   ✓ Created ${totalMatches} league matches`);
    }

    /**
     * Create friendly matches (mix of internal academy vs academy and academy vs external)
     */
    async createFriendlyMatches(season, teams) {
        console.log('🤝 Creating friendly matches...');
        
        let totalFriendlies = 0;
        
        // Group teams by age group
        const teamsByAge = {};
        teams.forEach(team => {
            if (!teamsByAge[team.age_group]) {
                teamsByAge[team.age_group] = [];
            }
            teamsByAge[team.age_group].push(team);
        });
        
        for (const [ageGroup, ageTeams] of Object.entries(teamsByAge)) {
            const externalTeams = this.externalTeams[ageGroup] || [];
            
            for (const team of ageTeams) {
                // Create 5-8 friendly matches per team
                const numFriendlies = Math.floor(Math.random() * 4) + 5; // 5-8 matches
                
                for (let i = 0; i < numFriendlies; i++) {
                    let friendlyMatch;
                    
                    // 60% chance vs external team, 40% vs other academy teams
                    const vsExternal = Math.random() > 0.4 && externalTeams.length > 0;
                    
                    if (vsExternal) {
                        // Match against external team
                        const externalTeam = this.generator.randomFromArray(externalTeams);
                        const isHome = Math.random() > 0.5;
                        
                        friendlyMatch = this.createExternalFixture(
                            team, externalTeam, isHome, season, ageGroup, 'friendly'
                        );
                    } else {
                        // Match against another academy team (if available)
                        const otherAcademyTeams = ageTeams.filter(t => t.id !== team.id);
                        if (otherAcademyTeams.length > 0) {
                            const opponent = this.generator.randomFromArray(otherAcademyTeams);
                            const isHome = Math.random() > 0.5;
                            
                            friendlyMatch = this.createInternalFixture(
                                team, opponent, isHome, season, ageGroup, 'friendly'
                            );
                        } else {
                            // Fall back to external if no internal opponents
                            if (externalTeams.length > 0) {
                                const externalTeam = this.generator.randomFromArray(externalTeams);
                                const isHome = Math.random() > 0.5;
                                
                                friendlyMatch = this.createExternalFixture(
                                    team, externalTeam, isHome, season, ageGroup, 'friendly'
                                );
                            }
                        }
                    }
                    
                    if (friendlyMatch) {
                        await this.insertMatch(friendlyMatch);
                        this.createdMatches.push(friendlyMatch);
                        totalFriendlies++;
                    }
                }
            }
        }
        
        console.log(`   ✓ Created ${totalFriendlies} friendly matches`);
    }

    createInternalFixture(homeTeam, awayTeam, isHomeFirst, season, ageGroup, matchType) {
        const matchDate = this.generateMatchDate(season, matchType);
        
        const fixture = {
            home_team_id: isHomeFirst ? homeTeam.id : awayTeam.id,
            away_team_id: isHomeFirst ? awayTeam.id : homeTeam.id,
            external_home_team_id: null,
            external_away_team_id: null,
            home_team_name: isHomeFirst ? homeTeam.name : awayTeam.name,
            away_team_name: isHomeFirst ? awayTeam.name : homeTeam.name,
            match_date: matchDate.date,
            match_time: matchDate.time,
            venue: 'Lion Football Academy Complex',
            match_type: matchType,
            season: season,
            match_status: this.getMatchStatus(matchDate.date),
            age_group: ageGroup,
            match_duration: this.getMatchDuration(ageGroup),
            weather_conditions: this.generateWeatherConditions(),
            referee: this.generateReferee(),
            field_condition: 'excellent',
            attendance: Math.floor(Math.random() * 80) + 30
        };

        return fixture;
    }

    /**
     * Create cup matches
     */
    async createCupMatches(season, teams) {
        console.log('🏆 Creating cup matches...');
        
        // Group teams by age
        const teamsByAge = {};
        teams.forEach(team => {
            if (!teamsByAge[team.age_group]) {
                teamsByAge[team.age_group] = [];
            }
            teamsByAge[team.age_group].push(team);
        });
        
        let totalCupMatches = 0;
        
        for (const [ageGroup, ageTeams] of Object.entries(teamsByAge)) {
            if (ageTeams.length < 2) continue;
            
            // Add external teams for cup competition
            const externalTeams = this.createExternalTeams(ageGroup, season, 4);
            const allTeams = [...ageTeams, ...externalTeams];
            
            // Create knockout tournament
            const cupMatches = this.generateKnockoutTournament(allTeams, season, ageGroup);
            
            for (const match of cupMatches) {
                await this.insertMatch(match);
                this.createdMatches.push(match);
                totalCupMatches++;
            }
        }
        
        console.log(`   ✓ Created ${totalCupMatches} cup matches`);
    }

    /**
     * Generate match results and player performances
     */
    async generateMatchResults(season, teams, players) {
        console.log('📊 Generating match results and player performances...');
        
        const finishedMatches = this.createdMatches.filter(m => m.match_status === 'finished');
        let totalPerformances = 0;
        
        for (const match of finishedMatches) {
            // Determine team strengths
            const homeStrength = this.calculateTeamStrength(match.home_team_id, teams);
            const awayStrength = this.calculateTeamStrength(match.away_team_id, teams);
            
            // Generate match result
            const result = this.generator.generateMatchResult(homeStrength, awayStrength);
            
            // Update match with result
            await this.updateMatchResult(match.id, result);
            
            // Generate player performances
            if (match.home_team_id) {
                const homePlayers = players.filter(p => p.team_id === match.home_team_id);
                const homePerformances = await this.generatePlayerPerformances(
                    match, homePlayers, result.homeScore > result.awayScore, result.awayScore === 0
                );
                totalPerformances += homePerformances.length;
            }
            
            if (match.away_team_id) {
                const awayPlayers = players.filter(p => p.team_id === match.away_team_id);
                const awayPerformances = await this.generatePlayerPerformances(
                    match, awayPlayers, result.awayScore > result.homeScore, result.homeScore === 0
                );
                totalPerformances += awayPerformances.length;
            }
        }
        
        console.log(`   ✓ Generated results for ${finishedMatches.length} matches`);
        console.log(`   ✓ Created ${totalPerformances} player performances`);
    }

    /**
     * Generate match events (goals, cards, substitutions)
     */
    async generateMatchEvents(season) {
        console.log('🎯 Generating match events...');
        
        const finishedMatches = this.createdMatches.filter(m => m.match_status === 'finished');
        let totalEvents = 0;
        
        for (const match of finishedMatches) {
            const events = this.generateEventsForMatch(match);
            
            for (const event of events) {
                await this.insertMatchEvent(event);
                this.createdEvents.push(event);
                totalEvents++;
            }
        }
        
        console.log(`   ✓ Created ${totalEvents} match events`);
    }

    /**
     * Generate team match statistics
     */
    async generateTeamStatistics(season) {
        console.log('📈 Generating team statistics...');
        
        const finishedMatches = this.createdMatches.filter(m => m.match_status === 'finished');
        let totalTeamStats = 0;
        
        for (const match of finishedMatches) {
            // Generate statistics for both teams
            if (match.home_team_id) {
                const homeStats = this.generateTeamMatchStats(match, 'home');
                await this.insertTeamMatchStats(homeStats);
                totalTeamStats++;
            }
            
            if (match.away_team_id) {
                const awayStats = this.generateTeamMatchStats(match, 'away');
                await this.insertTeamMatchStats(awayStats);
                totalTeamStats++;
            }
        }
        
        console.log(`   ✓ Created ${totalTeamStats} team statistics records`);
    }

    // Helper methods for external teams and fixture generation

    async loadExternalTeams() {
        try {
            // First check if external teams exist, if not create them
            const existingCount = await db.query('SELECT COUNT(*) as count FROM external_teams');
            
            if (existingCount[0].count === 0) {
                console.log('   🏗️  Creating external teams...');
                await this.externalSeeder.seedExternalTeams();
            }
            
            // Load external teams by age group
            const ageGroups = ['U8', 'U10', 'U12', 'U14', 'U16', 'U18'];
            
            for (const ageGroup of ageGroups) {
                const teams = await this.externalSeeder.getExternalTeamsByAgeGroup(ageGroup);
                this.externalTeams[ageGroup] = teams;
            }
            
            const totalExternal = Object.values(this.externalTeams).reduce((sum, teams) => sum + teams.length, 0);
            console.log(`   ✅ Loaded ${totalExternal} external teams`);
            
        } catch (error) {
            console.error('   ❌ Failed to load external teams:', error);
            throw error;
        }
    }

    async createExternalTournamentMatches(season, teams) {
        console.log('🏆 Creating external tournament matches...');
        
        let totalMatches = 0;
        
        // Group academy teams by age
        const teamsByAge = {};
        teams.forEach(team => {
            if (!teamsByAge[team.age_group]) {
                teamsByAge[team.age_group] = [];
            }
            teamsByAge[team.age_group].push(team);
        });
        
        for (const [ageGroup, ageTeams] of Object.entries(teamsByAge)) {
            const externalTeams = this.externalTeams[ageGroup] || [];
            
            if (externalTeams.length === 0) continue;
            
            // Each academy team plays 8-12 external matches per season
            for (const academyTeam of ageTeams) {
                const numExternalMatches = Math.floor(Math.random() * 5) + 8; // 8-12 matches
                
                for (let i = 0; i < numExternalMatches; i++) {
                    const externalTeam = this.generator.randomFromArray(externalTeams);
                    const isHome = Math.random() > 0.5;
                    const matchType = Math.random() > 0.7 ? 'tournament' : 'friendly';
                    
                    const match = this.createExternalFixture(
                        academyTeam, externalTeam, isHome, season, ageGroup, matchType
                    );
                    
                    await this.insertMatch(match);
                    this.createdMatches.push(match);
                    totalMatches++;
                }
            }
        }
        
        console.log(`   ✓ Created ${totalMatches} external tournament matches`);
    }

    createExternalFixture(academyTeam, externalTeam, isAcademyHome, season, ageGroup, matchType) {
        const matchDate = this.generateMatchDate(season, matchType);
        
        const fixture = {
            home_team_id: isAcademyHome ? academyTeam.id : null,
            away_team_id: !isAcademyHome ? academyTeam.id : null,
            external_home_team_id: !isAcademyHome ? externalTeam.id : null,
            external_away_team_id: isAcademyHome ? externalTeam.id : null,
            home_team_name: isAcademyHome ? academyTeam.name : externalTeam.name,
            away_team_name: !isAcademyHome ? academyTeam.name : externalTeam.name,
            match_date: matchDate.date,
            match_time: matchDate.time,
            venue: isAcademyHome ? 'Lion Football Academy Complex' : externalTeam.venue,
            match_type: matchType,
            season: season,
            match_status: this.getMatchStatus(matchDate.date),
            age_group: ageGroup,
            match_duration: this.getMatchDuration(ageGroup),
            weather_conditions: this.generateWeatherConditions(),
            referee: this.generateReferee(),
            field_condition: 'good',
            attendance: isAcademyHome ? Math.floor(Math.random() * 100) + 20 : Math.floor(Math.random() * 50) + 10
        };

        return fixture;
    }

    generateRoundRobinFixtures(teams, season, ageGroup) {
        const fixtures = [];
        
        // Each team plays every other team once (home and away in different rounds)
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                // Home fixture
                fixtures.push(this.createFixture(teams[i], teams[j], season, ageGroup, 'league'));
                // Away fixture
                fixtures.push(this.createFixture(teams[j], teams[i], season, ageGroup, 'league'));
            }
        }
        
        return fixtures;
    }

    generateKnockoutTournament(teams, season, ageGroup) {
        const matches = [];
        let currentRound = [...teams];
        let roundNumber = 1;
        
        while (currentRound.length > 1) {
            const nextRound = [];
            
            // Pair teams for current round
            for (let i = 0; i < currentRound.length; i += 2) {
                if (i + 1 < currentRound.length) {
                    const match = this.createFixture(
                        currentRound[i], 
                        currentRound[i + 1], 
                        season, 
                        ageGroup, 
                        'cup'
                    );
                    match.tournament_round = this.getTournamentRoundName(currentRound.length, roundNumber);
                    matches.push(match);
                    
                    // Randomly determine winner for finished matches
                    if (match.match_status === 'finished') {
                        const winner = Math.random() > 0.5 ? currentRound[i] : currentRound[i + 1];
                        nextRound.push(winner);
                    }
                }
            }
            
            currentRound = nextRound;
            roundNumber++;
        }
        
        return matches;
    }

    createFixture(homeTeam, awayTeam, season, ageGroup, matchType) {
        const matchDate = this.generateMatchDate(season, matchType);
        
        return {
            home_team_id: homeTeam.id || null,
            away_team_id: awayTeam.id || null,
            home_team_name: homeTeam.name,
            away_team_name: awayTeam.name,
            match_date: matchDate.date,
            match_time: matchDate.time,
            venue: homeTeam.id ? 'Lion Football Academy Complex' : homeTeam.venue,
            match_type: matchType,
            season: season,
            match_status: this.getMatchStatus(matchDate.date),
            age_group: ageGroup,
            match_duration: this.getMatchDuration(ageGroup),
            weather_conditions: this.generateWeatherConditions(),
            referee: this.generateReferee()
        };
    }

    createExternalTeams(ageGroup, season, count = 6) {
        const externalTeams = [];
        const clubNames = [
            'Pest County FC', 'Budapest United', 'Danube Sports', 'Magyar Eagles',
            'Carpathian FC', 'Royal Budapest', 'Szent István SC', 'Fehérvár Youth',
            'Tisza FC', 'Pannonia United', 'Balaton SC', 'Hortobágy Eagles'
        ];
        
        for (let i = 0; i < count; i++) {
            externalTeams.push({
                id: null,
                name: `${this.generator.randomFromArray(clubNames)} ${ageGroup}`,
                age_group: ageGroup,
                venue: `${this.generator.randomFromArray(this.generator.hungarianCities)} Stadion`,
                is_external: true
            });
        }
        
        return externalTeams;
    }

    generateFriendlyOpponent(ageGroup) {
        const opponentNames = [
            'Local Academy', 'Regional Select', 'District Team', 'County XI',
            'City United', 'Sports School', 'Youth Center', 'Football Club'
        ];
        
        return {
            name: `${this.generator.randomFromArray(opponentNames)} ${ageGroup}`,
            venue: `${this.generator.randomFromArray(this.generator.hungarianCities)} Sports Center`
        };
    }

    generateMatchDate(season, matchType) {
        const seasonStart = new Date(`${season.split('-')[0]}-08-01`);
        const seasonEnd = new Date(`${parseInt(season.split('-')[0]) + 1}-06-30`);
        
        // Different timing for different match types
        let startDate, endDate;
        
        switch (matchType) {
            case 'league':
                startDate = new Date(seasonStart);
                startDate.setMonth(8); // September start
                endDate = new Date(seasonEnd);
                endDate.setMonth(4); // May end
                break;
            case 'cup':
                startDate = new Date(seasonStart);
                startDate.setMonth(9); // October start
                endDate = new Date(seasonEnd);
                endDate.setMonth(2); // March end
                break;
            default: // friendly
                startDate = new Date(seasonStart);
                endDate = new Date(seasonEnd);
        }
        
        const timeDiff = endDate.getTime() - startDate.getTime();
        const randomTime = Math.random() * timeDiff;
        const matchDate = new Date(startDate.getTime() + randomTime);
        
        // Set match time (weekends mostly)
        const dayOfWeek = matchDate.getDay();
        let matchTime;
        
        if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
            matchTime = this.generator.randomFromArray(['10:00', '11:00', '14:00', '15:00']);
        } else { // Weekday
            matchTime = this.generator.randomFromArray(['16:00', '17:00', '18:00']);
        }
        
        return {
            date: matchDate.toISOString().split('T')[0],
            time: matchTime
        };
    }

    getMatchStatus(matchDate) {
        const today = new Date();
        const match = new Date(matchDate);
        
        if (match < today) {
            return 'finished';
        } else if (match.getTime() - today.getTime() < 7 * 24 * 60 * 60 * 1000) {
            return 'scheduled';
        } else {
            return 'scheduled';
        }
    }

    getMatchDuration(ageGroup) {
        const ageNum = parseInt(ageGroup.replace('U', ''));
        
        if (ageNum <= 10) return 60; // 2 x 30 minutes
        if (ageNum <= 12) return 70; // 2 x 35 minutes
        if (ageNum <= 14) return 80; // 2 x 40 minutes
        return 90; // 2 x 45 minutes
    }

    calculateTeamStrength(teamId, teams) {
        if (!teamId) return Math.random() * 4 + 3; // External team strength
        
        const team = teams.find(t => t.id === teamId);
        if (!team) return 5;
        
        // Base strength on age group (older teams generally stronger)
        const ageNum = parseInt(team.age_group.replace('U', ''));
        const baseStrength = 3 + (ageNum - 8) * 0.2;
        
        // Add some random variation
        const variation = (Math.random() - 0.5) * 3;
        
        return Math.max(1, Math.min(10, baseStrength + variation));
    }

    async generatePlayerPerformances(match, players, isWinner, isCleanSheet) {
        const performances = [];
        
        // Select players for the match (typically 11 starters + 3-5 subs)
        const ageNum = parseInt(match.age_group.replace('U', ''));
        const maxPlayers = ageNum <= 10 ? 9 : 11;
        const availablePlayers = Math.min(maxPlayers, players.length);
        
        // Shuffle and select players
        const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
        const selectedPlayers = shuffledPlayers.slice(0, availablePlayers);
        
        for (let i = 0; i < selectedPlayers.length; i++) {
            const player = selectedPlayers[i];
            const isStarter = i < (ageNum <= 10 ? 7 : 11);
            const minutesPlayed = isStarter ? 
                match.match_duration - Math.floor(Math.random() * 10) : 
                Math.floor(Math.random() * 30) + 10;
            
            const position = this.generator.footballPositions.find(p => 
                p.name === player.position
            ) || this.generator.footballPositions[0];
            
            const performance = {
                match_id: match.id,
                player_id: player.id,
                team_id: player.team_id,
                position: player.position,
                minutes_played: minutesPlayed,
                goals: this.generateGoals(position, isWinner),
                assists: this.generateAssists(position),
                yellow_cards: Math.random() > 0.85 ? 1 : 0,
                red_cards: Math.random() > 0.97 ? 1 : 0,
                performance_rating: this.generator.generatePerformanceRating(position, isWinner, isCleanSheet),
                passes_completed: this.generatePasses(position, minutesPlayed),
                tackles_made: this.generateTackles(position, minutesPlayed),
                shots_taken: this.generateShots(position),
                saves_made: position.type === 'goalkeeper' ? this.generateSaves() : 0
            };
            
            await this.insertPlayerPerformance(performance);
            this.createdPerformances.push(performance);
            performances.push(performance);
        }
        
        return performances;
    }

    generateEventsForMatch(match) {
        const events = [];
        let eventId = 1;
        
        // Get match score
        const homeScore = match.home_score || 0;
        const awayScore = match.away_score || 0;
        const totalGoals = homeScore + awayScore;
        
        // Generate goal events
        for (let i = 0; i < totalGoals; i++) {
            const isHomeGoal = i < homeScore;
            const minute = Math.floor(Math.random() * match.match_duration) + 1;
            
            events.push({
                match_id: match.id,
                team_id: isHomeGoal ? match.home_team_id : match.away_team_id,
                event_type: 'goal',
                event_minute: minute,
                event_description: `Gól`,
                player_name: this.generator.generateHungarianName('male')
            });
        }
        
        // Generate card events
        const numCards = Math.floor(Math.random() * 4);
        for (let i = 0; i < numCards; i++) {
            const isHomeCard = Math.random() > 0.5;
            const cardType = Math.random() > 0.9 ? 'red_card' : 'yellow_card';
            const minute = Math.floor(Math.random() * match.match_duration) + 1;
            
            events.push({
                match_id: match.id,
                team_id: isHomeCard ? match.home_team_id : match.away_team_id,
                event_type: cardType,
                event_minute: minute,
                event_description: cardType === 'red_card' ? 'Piros lap' : 'Sárga lap',
                player_name: this.generator.generateHungarianName('male')
            });
        }
        
        return events;
    }

    generateTeamMatchStats(match, side) {
        const isHome = side === 'home';
        const teamId = isHome ? match.home_team_id : match.away_team_id;
        
        const possession = isHome ? 
            45 + Math.floor(Math.random() * 20) : 
            100 - (45 + Math.floor(Math.random() * 20));
        
        return {
            match_id: match.id,
            team_id: teamId,
            possession_percentage: possession,
            total_shots: Math.floor(Math.random() * 15) + 5,
            shots_on_target: Math.floor(Math.random() * 8) + 2,
            corners: Math.floor(Math.random() * 10),
            fouls: Math.floor(Math.random() * 15) + 5,
            offsides: Math.floor(Math.random() * 5),
            pass_accuracy: Math.floor(Math.random() * 30) + 65
        };
    }

    // Database insertion methods

    async insertMatch(matchData) {
        const query = `
            INSERT INTO matches (
                home_team_id, away_team_id, external_home_team_id, external_away_team_id,
                home_team_name, away_team_name, match_date, match_time, venue, 
                match_type, season, match_status, home_score, away_score, 
                match_duration, age_group, tournament_round, weather_conditions, 
                referee_name, field_condition, attendance
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            matchData.home_team_id || null,
            matchData.away_team_id || null,
            matchData.external_home_team_id || null,
            matchData.external_away_team_id || null,
            matchData.home_team_name,
            matchData.away_team_name,
            matchData.match_date,
            matchData.match_time,
            matchData.venue,
            matchData.match_type,
            matchData.season,
            matchData.match_status,
            matchData.home_score || null,
            matchData.away_score || null,
            matchData.match_duration,
            matchData.age_group,
            matchData.tournament_round || null,
            matchData.weather_conditions || null,
            matchData.referee || null,
            matchData.field_condition || 'good',
            matchData.attendance || 0
        ]);
        
        matchData.id = result.lastID;
        return result.lastID;
    }

    async updateMatchResult(matchId, result) {
        const query = `
            UPDATE matches 
            SET home_score = ?, away_score = ? 
            WHERE id = ?
        `;
        
        await db.run(query, [result.homeScore, result.awayScore, matchId]);
    }

    async insertPlayerPerformance(performance) {
        const query = `
            INSERT INTO player_match_performance (
                match_id, player_id, team_id, position, minutes_played,
                goals, assists, yellow_cards, red_cards, performance_rating
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            performance.match_id,
            performance.player_id,
            performance.team_id,
            performance.position,
            performance.minutes_played,
            performance.goals,
            performance.assists,
            performance.yellow_cards,
            performance.red_cards,
            performance.performance_rating
        ]);
        
        return result.lastID;
    }

    async insertMatchEvent(event) {
        const query = `
            INSERT INTO match_events (
                match_id, team_id, event_type, event_minute, event_description
            ) VALUES (?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            event.match_id,
            event.team_id,
            event.event_type,
            event.event_minute,
            event.event_description
        ]);
        
        return result.lastID;
    }

    async insertTeamMatchStats(stats) {
        const query = `
            INSERT INTO team_match_statistics (
                match_id, team_id, possession_percentage, total_shots,
                shots_on_target, corners, fouls, offsides
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            stats.match_id,
            stats.team_id,
            stats.possession_percentage,
            stats.total_shots,
            stats.shots_on_target,
            stats.corners,
            stats.fouls,
            stats.offsides
        ]);
        
        return result.lastID;
    }

    // Helper generation methods

    generateGoals(position, isWinner) {
        const goalProbability = {
            forward: isWinner ? 0.4 : 0.2,
            midfielder: isWinner ? 0.15 : 0.08,
            defender: 0.03,
            goalkeeper: 0.001
        };
        
        const prob = goalProbability[position.type] || 0.1;
        return Math.random() < prob ? 1 : 0;
    }

    generateAssists(position) {
        const assistProbability = {
            midfielder: 0.2,
            forward: 0.15,
            defender: 0.05,
            goalkeeper: 0.01
        };
        
        const prob = assistProbability[position.type] || 0.1;
        return Math.random() < prob ? 1 : 0;
    }

    generatePasses(position, minutes) {
        const basePassesPerMinute = {
            midfielder: 1.5,
            defender: 1.2,
            forward: 0.8,
            goalkeeper: 0.5
        };
        
        const rate = basePassesPerMinute[position.type] || 1.0;
        return Math.floor(minutes * rate * (0.8 + Math.random() * 0.4));
    }

    generateTackles(position, minutes) {
        const baseTacklesPerMinute = {
            defender: 0.15,
            midfielder: 0.1,
            forward: 0.03,
            goalkeeper: 0.01
        };
        
        const rate = baseTacklesPerMinute[position.type] || 0.05;
        return Math.floor(minutes * rate * (0.5 + Math.random() * 1.0));
    }

    generateShots(position) {
        const shotProbability = {
            forward: 0.6,
            midfielder: 0.3,
            defender: 0.1,
            goalkeeper: 0.01
        };
        
        const prob = shotProbability[position.type] || 0.2;
        return Math.random() < prob ? Math.floor(Math.random() * 3) + 1 : 0;
    }

    generateSaves() {
        return Math.floor(Math.random() * 8) + 1;
    }

    generateWeatherConditions() {
        const conditions = [
            'Napos', 'Felhős', 'Esős', 'Szeles', 'Hideg', 'Meleg', 'Párás'
        ];
        return this.generator.randomFromArray(conditions);
    }

    generateReferee() {
        const referees = [
            'Kiss József', 'Nagy Péter', 'Szabó András', 'Tóth László',
            'Horváth Gábor', 'Varga Zoltán', 'Kovács Tibor', 'Molnár Attila'
        ];
        return this.generator.randomFromArray(referees);
    }

    getTournamentRoundName(teamsLeft, roundNumber) {
        if (teamsLeft <= 2) return 'Döntő';
        if (teamsLeft <= 4) return 'Elődöntő';
        if (teamsLeft <= 8) return 'Negyeddöntő';
        if (teamsLeft <= 16) return 'Nyolcaddöntő';
        return `${roundNumber}. forduló`;
    }

    getSummary() {
        return {
            matches: this.createdMatches.length,
            performances: this.createdPerformances.length,
            events: this.createdEvents.length,
            finished_matches: this.createdMatches.filter(m => m.match_status === 'finished').length
        };
    }

    reset() {
        this.createdMatches = [];
        this.createdPerformances = [];
        this.createdEvents = [];
    }
}

module.exports = MatchSeeder;