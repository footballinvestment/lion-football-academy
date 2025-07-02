const db = require('./src/database/connection');
const Team = require('./src/models/Team');
const Player = require('./src/models/Player');
const Training = require('./src/models/Training');
const Announcement = require('./src/models/Announcement');

async function seedData() {
    try {
        console.log('🌱 Starting seed data creation...');

        // Create Teams
        console.log('📚 Creating teams...');
        const teams = [
            {
                name: 'U10 Oroszlánok',
                age_group: 'U10',
                season: '2024/2025',
                coach_name: 'Nagy Péter',
                team_color: 'piros'
            },
            {
                name: 'U12 Tigrisek',
                age_group: 'U12', 
                season: '2024/2025',
                coach_name: 'Kovács János',
                team_color: 'kék'
            },
            {
                name: 'U14 Sólymok',
                age_group: 'U14',
                season: '2024/2025', 
                coach_name: 'Szabó Márton',
                team_color: 'zöld'
            }
        ];

        const createdTeams = [];
        for (const team of teams) {
            const result = await Team.create(team);
            createdTeams.push(result.id);
            console.log(`✅ Created team: ${team.name}`);
        }

        // Create Players
        console.log('👦 Creating players...');
        const players = [
            // U10 Oroszlánok players
            {
                name: 'Kovács Péter',
                birth_date: '2014-03-15',
                position: 'kapus',
                dominant_foot: 'jobb',
                team_id: createdTeams[0],
                parent_name: 'Kovács László',
                parent_phone: '+36301234567',
                parent_email: 'kovacs.laszlo@email.com',
                medical_notes: 'Asztma inhaler szükséges'
            },
            {
                name: 'Nagy Tamás',
                birth_date: '2014-07-22',
                position: 'védő',
                dominant_foot: 'jobb',
                team_id: createdTeams[0],
                parent_name: 'Nagy Zoltán',
                parent_phone: '+36302345678',
                parent_email: 'nagy.zoltan@email.com',
                medical_notes: null
            },
            {
                name: 'Szabó Dániel',
                birth_date: '2014-01-10',
                position: 'középpályás',
                dominant_foot: 'bal',
                team_id: createdTeams[0],
                parent_name: 'Szabó Andrea',
                parent_phone: '+36303456789',
                parent_email: 'szabo.andrea@email.com',
                medical_notes: null
            },
            {
                name: 'Tóth Márton',
                birth_date: '2014-09-05',
                position: 'csatár',
                dominant_foot: 'jobb',
                team_id: createdTeams[0],
                parent_name: 'Tóth Gábor',
                parent_phone: '+36304567890',
                parent_email: 'toth.gabor@email.com',
                medical_notes: null
            },
            {
                name: 'Varga Ádám',
                birth_date: '2014-11-30',
                position: 'középpályás',
                dominant_foot: 'jobb',
                team_id: createdTeams[0],
                parent_name: 'Varga Katalin',
                parent_phone: '+36305678901',
                parent_email: 'varga.katalin@email.com',
                medical_notes: null
            },

            // U12 Tigrisek players
            {
                name: 'Horváth Bence',
                birth_date: '2012-04-18',
                position: 'kapus',
                dominant_foot: 'jobb',
                team_id: createdTeams[1],
                parent_name: 'Horváth Róbert',
                parent_phone: '+36306789012',
                parent_email: 'horvath.robert@email.com',
                medical_notes: null
            },
            {
                name: 'Kiss Levente',
                birth_date: '2012-08-14',
                position: 'védő',
                dominant_foot: 'bal',
                team_id: createdTeams[1],
                parent_name: 'Kiss Éva',
                parent_phone: '+36307890123',
                parent_email: 'kiss.eva@email.com',
                medical_notes: 'Szemüveg viselése szükséges'
            },
            {
                name: 'Molnár Alex',
                birth_date: '2012-02-28',
                position: 'csatár',
                dominant_foot: 'jobb',
                team_id: createdTeams[1],
                parent_name: 'Molnár István',
                parent_phone: '+36308901234',
                parent_email: 'molnar.istvan@email.com',
                medical_notes: null
            },
            {
                name: 'Lakatos Norbert',
                birth_date: '2012-06-11',
                position: 'középpályás',
                dominant_foot: 'jobb',
                team_id: createdTeams[1],
                parent_name: 'Lakatos Mária',
                parent_phone: '+36309012345',
                parent_email: 'lakatos.maria@email.com',
                medical_notes: null
            },
            {
                name: 'Papp Kristóf',
                birth_date: '2012-12-03',
                position: 'védő',
                dominant_foot: 'bal',
                team_id: createdTeams[1],
                parent_name: 'Papp József',
                parent_phone: '+36301023456',
                parent_email: 'papp.jozsef@email.com',
                medical_notes: null
            },

            // U14 Sólymok players
            {
                name: 'Farkas Máté',
                birth_date: '2010-05-25',
                position: 'kapus',
                dominant_foot: 'jobb',
                team_id: createdTeams[2],
                parent_name: 'Farkas Péter',
                parent_phone: '+36302134567',
                parent_email: 'farkas.peter@email.com',
                medical_notes: null
            },
            {
                name: 'Simon Zoltán',
                birth_date: '2010-09-17',
                position: 'védő',
                dominant_foot: 'jobb',
                team_id: createdTeams[2],
                parent_name: 'Simon Judit',
                parent_phone: '+36303245678',
                parent_email: 'simon.judit@email.com',
                medical_notes: null
            },
            {
                name: 'Balogh Viktor',
                birth_date: '2010-01-20',
                position: 'csatár',
                dominant_foot: 'bal',
                team_id: createdTeams[2],
                parent_name: 'Balogh András',
                parent_phone: '+36304356789',
                parent_email: 'balogh.andras@email.com',
                medical_notes: 'Térdsérülés múlt - óvatosság szükséges'
            },
            {
                name: 'Török Benjámin',
                birth_date: '2010-07-08',
                position: 'középpályás',
                dominant_foot: 'jobb',
                team_id: createdTeams[2],
                parent_name: 'Török Anita',
                parent_phone: '+36305467890',
                parent_email: 'torok.anita@email.com',
                medical_notes: null
            },
            {
                name: 'Antal Gergő',
                birth_date: '2010-11-12',
                position: 'védő',
                dominant_foot: 'bal',
                team_id: createdTeams[2],
                parent_name: 'Antal Tamás',
                parent_phone: '+36306578901',
                parent_email: 'antal.tamas@email.com',
                medical_notes: null
            }
        ];

        const createdPlayers = [];
        for (const player of players) {
            const result = await Player.create(player);
            createdPlayers.push(result.id);
            console.log(`✅ Created player: ${player.name}`);
        }

        // Create Training Sessions
        console.log('🏃 Creating training sessions...');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const trainings = [
            {
                date: tomorrow.toISOString().split('T')[0],
                time: '17:00',
                duration: 90,
                location: 'Főpálya',
                type: 'alapozó edzés',
                team_id: createdTeams[0],
                training_plan: 'Alapvető labdakezelés, passzolás, kapura lövés gyakorlatok'
            },
            {
                date: tomorrow.toISOString().split('T')[0],
                time: '18:30',
                duration: 90,
                location: 'Főpálya',
                type: 'taktikai edzés',
                team_id: createdTeams[1],
                training_plan: 'Formációk gyakorlása, védekezési taktikák'
            },
            {
                date: nextWeek.toISOString().split('T')[0],
                time: '16:00',
                duration: 120,
                location: 'Melléklépálya',
                type: 'kondicionális edzés',
                team_id: createdTeams[2],
                training_plan: 'Állóképesség fejlesztés, erősítő gyakorlatok, gyorsaság'
            },
            {
                date: nextWeek.toISOString().split('T')[0],
                time: '10:00',
                duration: 60,
                location: 'Terem',
                type: 'elméleti oktatás',
                team_id: createdTeams[0],
                training_plan: 'Játékszabályok, fair play, csapatszellem'
            }
        ];

        for (const training of trainings) {
            const result = await Training.create(training);
            console.log(`✅ Created training: ${training.type} for ${training.date}`);
        }

        // Create Announcements
        console.log('📢 Creating announcements...');
        const announcements = [
            {
                title: 'Új edzési időpontok',
                content: 'Figyelmébe ajánljuk, hogy a következő héttől módosulnak az edzési időpontok. Kérjük, ellenőrizzék az új beosztást!',
                category: 'edzés',
                team_id: null, // All teams
                urgent: true
            },
            {
                title: 'Tornára jelentkezés',
                content: 'A tavaszi ifjúsági tornára jelentkezés március 15-ig lehetséges. További információkért keressék az edzőket!',
                category: 'verseny',
                team_id: null,
                urgent: false
            },
            {
                title: 'U10 csapat különleges edzés',
                content: 'Az U10 Oroszlánok csapata számára extra edzést szervezünk a hétvégén. A részvétel önkéntes.',
                category: 'edzés',
                team_id: createdTeams[0],
                urgent: false
            },
            {
                title: 'Szülői értekezlet',
                content: 'Minden szülőt szeretettel várunk a következő szülői értekezletre március 20-án 18:00-kor.',
                category: 'esemény',
                team_id: null,
                urgent: true
            }
        ];

        for (const announcement of announcements) {
            const result = await Announcement.create(announcement);
            console.log(`✅ Created announcement: ${announcement.title}`);
        }

        console.log('\n🎉 Seed data created successfully!');
        console.log(`📊 Created ${createdTeams.length} teams, ${createdPlayers.length} players, ${trainings.length} trainings, and ${announcements.length} announcements`);
        
        // Display summary
        console.log('\n📋 Summary:');
        console.log('Teams:');
        teams.forEach((team, index) => {
            console.log(`  ${index + 1}. ${team.name} (${team.age_group}) - Edző: ${team.coach_name}`);
        });
        
        console.log('\n👦 Total players by team:');
        const u10Players = players.filter(p => p.team_id === createdTeams[0]).length;
        const u12Players = players.filter(p => p.team_id === createdTeams[1]).length;
        const u14Players = players.filter(p => p.team_id === createdTeams[2]).length;
        console.log(`  U10 Oroszlánok: ${u10Players} játékos`);
        console.log(`  U12 Tigrisek: ${u12Players} játékos`);
        console.log(`  U14 Sólymok: ${u14Players} játékos`);

        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error creating seed data:', error);
        process.exit(1);
    }
}

// Run seed data creation
seedData();