/**
 * External Teams Seeder
 * Creates realistic external teams for match fixtures
 */

const db = require('../src/database/connection');
const DataGenerators = require('./data-generators');

class ExternalTeamsSeeder {
    constructor() {
        this.generator = new DataGenerators();
        this.createdTeams = [];
    }

    /**
     * Seed external teams for different age groups
     */
    async seedExternalTeams() {
        console.log('🏟️  Seeding external teams...');
        
        try {
            // Clear existing external teams
            await db.run('DELETE FROM external_teams');
            
            const ageGroups = ['U8', 'U10', 'U12', 'U14', 'U16', 'U18'];
            let totalCreated = 0;
            
            for (const ageGroup of ageGroups) {
                const teamsCreated = await this.createTeamsForAgeGroup(ageGroup);
                totalCreated += teamsCreated;
            }
            
            console.log(`✅ Created ${totalCreated} external teams`);
            return this.createdTeams;
            
        } catch (error) {
            console.error('❌ Failed to seed external teams:', error);
            throw error;
        }
    }

    async createTeamsForAgeGroup(ageGroup) {
        const teamCount = 15; // 15 external teams per age group
        let created = 0;
        
        for (let i = 0; i < teamCount; i++) {
            const team = this.generateExternalTeam(ageGroup);
            
            try {
                const result = await this.insertExternalTeam(team);
                team.id = result.lastID;
                this.createdTeams.push(team);
                created++;
            } catch (error) {
                console.error(`Failed to create team ${team.name}:`, error.message);
            }
        }
        
        console.log(`   ✓ Created ${created} ${ageGroup} external teams`);
        return created;
    }

    generateExternalTeam(ageGroup) {
        const teamTypes = [
            'FC', 'SC', 'SE', 'TC', 'Club', 'United', 'Athletic', 'Sports', 'Academy', 'Eagles',
            'Lions', 'Tigers', 'Bears', 'Wolves', 'Hawks', 'Falcons', 'Rangers', 'Warriors'
        ];

        const hungarianCities = [
            'Budapest', 'Debrecen', 'Szeged', 'Miskolc', 'Pécs', 'Győr', 'Nyíregyháza', 'Kecskemét',
            'Székesfehérvár', 'Szombathely', 'Szolnok', 'Tatabánya', 'Kaposvár', 'Békéscsaba',
            'Zalaegerszeg', 'Sopron', 'Eger', 'Nagykanizsa', 'Dunaújváros', 'Hódmezővásárhely',
            'Salgótarján', 'Cegléd', 'Baja', 'Veszprém', 'Ózd', 'Mosonmagyaróvár', 'Orosháza',
            'Kiskunfélegyháza', 'Jászberény', 'Komló', 'Siófok', 'Pápa', 'Hajdúböszörmény',
            'Keszthely', 'Csongrád', 'Mátészalka', 'Kazincbarcika', 'Gyula', 'Törökszentmiklós'
        ];

        const regions = [
            'Pest megye', 'Hajdú-Bihar megye', 'Csongrád-Csanád megye', 'Borsod-Abaúj-Zemplén megye',
            'Baranya megye', 'Győr-Moson-Sopron megye', 'Szabolcs-Szatmár-Bereg megye', 'Bács-Kiskun megye',
            'Fejér megye', 'Vas megye', 'Jász-Nagykun-Szolnok megye', 'Komárom-Esztergom megye',
            'Somogy megye', 'Békés megye', 'Zala megye', 'Heves megye', 'Tolna megye', 'Nógrád megye'
        ];

        const leagues = [
            'MLSZ Pest Megye I. osztály', 'MLSZ Pest Megye II. osztály', 'Megyei I. osztály',
            'Megyei II. osztály', 'Regionális bajnokság', 'Városi bajnokság', 'Ifjúsági liga',
            'Akadémiai bajnokság', 'Szabadidős liga'
        ];

        const city = this.generator.randomFromArray(hungarianCities);
        const teamType = this.generator.randomFromArray(teamTypes);
        const isFC = Math.random() > 0.5;
        
        const baseName = isFC ? 
            `${city} ${teamType}` : 
            `${this.generator.randomFromArray(['Városi', 'Megyei', 'Sportegyesület', 'Ifjúsági'])} ${city}`;
            
        const teamName = `${baseName} ${ageGroup}`;
        const shortName = isFC ? 
            `${city.substring(0, 3).toUpperCase()}${teamType.substring(0, 2).toUpperCase()}` :
            `${city.substring(0, 4).toUpperCase()}`;

        const colors = this.generator.randomFromArray([
            'Piros-Fehér', 'Kék-Fehér', 'Zöld-Fehér', 'Sárga-Kék', 'Fekete-Fehér',
            'Piros-Kék', 'Zöld-Sárga', 'Narancssárga-Fekete', 'Lila-Fehér', 'Bordó-Arany'
        ]);

        return {
            name: teamName,
            short_name: shortName,
            age_group: ageGroup,
            venue: `${city} Sportpálya`,
            city: city,
            region: this.generator.randomFromArray(regions),
            contact_phone: this.generateHungarianPhone(),
            contact_email: `info@${shortName.toLowerCase()}.hu`,
            website: `www.${shortName.toLowerCase()}.hu`,
            league: this.generator.randomFromArray(leagues),
            division: Math.random() > 0.7 ? 'I. osztály' : 'II. osztály',
            founded_year: Math.floor(Math.random() * 30) + 1990, // 1990-2020
            colors: colors,
            logo_url: null,
            notes: `Alapítva: ${Math.floor(Math.random() * 30) + 1990}. Székhelye: ${city}.`,
            active: 1
        };
    }

    generateHungarianPhone() {
        const areaCodes = ['1', '20', '30', '70', '72', '76', '82', '84', '87', '88'];
        const areaCode = this.generator.randomFromArray(areaCodes);
        const number = Math.floor(Math.random() * 9000000) + 1000000; // 7 digit number
        return `+36-${areaCode}-${number}`;
    }

    async insertExternalTeam(team) {
        const query = `
            INSERT INTO external_teams (
                name, short_name, age_group, venue, city, region,
                contact_phone, contact_email, website, league, division,
                founded_year, colors, notes, active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        return await db.run(query, [
            team.name,
            team.short_name,
            team.age_group,
            team.venue,
            team.city,
            team.region,
            team.contact_phone,
            team.contact_email,
            team.website,
            team.league,
            team.division,
            team.founded_year,
            team.colors,
            team.notes,
            team.active,
            new Date().toISOString(),
            new Date().toISOString()
        ]);
    }

    async getExternalTeamsByAgeGroup(ageGroup) {
        const query = `
            SELECT * FROM external_teams 
            WHERE age_group = ? AND active = 1 
            ORDER BY name
        `;
        return await db.query(query, [ageGroup]);
    }

    async getAllExternalTeams() {
        const query = `
            SELECT * FROM external_teams 
            WHERE active = 1 
            ORDER BY age_group, name
        `;
        return await db.query(query);
    }

    getSummary() {
        const summary = {
            total: this.createdTeams.length,
            byAgeGroup: {}
        };

        this.createdTeams.forEach(team => {
            if (!summary.byAgeGroup[team.age_group]) {
                summary.byAgeGroup[team.age_group] = 0;
            }
            summary.byAgeGroup[team.age_group]++;
        });

        return summary;
    }
}

module.exports = ExternalTeamsSeeder;