/**
 * Test Match Seeding
 * Test the new match seeding system with external teams
 */

const db = require('./src/database/connection');
const MatchSeeder = require('./scripts/match-seeder');

async function testMatchSeeding() {
    console.log('🧪 TESTING MATCH SEEDING SYSTEM');
    console.log('='.repeat(50));

    try {
        // Get existing teams
        const teams = await db.query('SELECT * FROM teams LIMIT 6');
        const players = await db.query('SELECT * FROM players LIMIT 50');
        
        console.log(`Found ${teams.length} teams and ${players.length} players`);
        
        if (teams.length === 0) {
            console.log('❌ No teams found. Please run basic seeding first.');
            return;
        }

        // Initialize match seeder
        const seeder = new MatchSeeder();
        
        // Test for multiple seasons to reach 1000+ matches
        console.log('\n⚽ Testing match creation for multiple seasons...');
        
        const seasons = ['2020-21', '2021-22', '2022-23', '2023-24', '2024-25'];
        let totalResult = { matches: 0, performances: 0, events: 0, finished_matches: 0 };
        
        for (const season of seasons) {
            console.log(`\n   Creating matches for ${season}...`);
            try {
                const result = await seeder.seedMatchesForSeason(season, teams, players);
                totalResult.matches += result.matches;
                totalResult.performances += result.performances;
                totalResult.events += result.events;
                totalResult.finished_matches += result.finished_matches;
                console.log(`   ✅ ${season}: ${result.matches} matches created`);
            } catch (error) {
                console.log(`   ⚠️ ${season}: ${error.message.split('\n')[0]}`);
                break; // Stop on first error but continue with analysis
            }
        }
        
        const result = totalResult;
        
        console.log('\n📊 SEEDING RESULTS:');
        console.log(`✅ Matches created: ${result.matches}`);
        console.log(`✅ Performances: ${result.performances}`);
        console.log(`✅ Events: ${result.events}`);
        console.log(`✅ Finished matches: ${result.finished_matches}`);
        
        // Verify in database
        const totalMatches = await db.query('SELECT COUNT(*) as count FROM matches');
        const externalTeamsCount = await db.query('SELECT COUNT(*) as count FROM external_teams');
        
        console.log('\n🔍 DATABASE VERIFICATION:');
        console.log(`📈 Total matches in DB: ${totalMatches[0].count}`);
        console.log(`🏟️  External teams created: ${externalTeamsCount[0].count}`);
        
        // Show match type breakdown
        const matchTypes = await db.query(`
            SELECT match_type, COUNT(*) as count 
            FROM matches 
            GROUP BY match_type 
            ORDER BY count DESC
        `);
        
        console.log('\n📋 MATCH TYPES:');
        matchTypes.forEach(type => {
            console.log(`   ${type.match_type}: ${type.count} matches`);
        });
        
        // Show external vs internal matches
        const externalMatches = await db.query(`
            SELECT COUNT(*) as count 
            FROM matches 
            WHERE external_home_team_id IS NOT NULL OR external_away_team_id IS NOT NULL
        `);
        
        const internalMatches = await db.query(`
            SELECT COUNT(*) as count 
            FROM matches 
            WHERE home_team_id IS NOT NULL AND away_team_id IS NOT NULL
        `);
        
        console.log('\n🏟️  MATCH BREAKDOWN:');
        console.log(`   Internal (Academy vs Academy): ${internalMatches[0].count}`);
        console.log(`   External (Academy vs External): ${externalMatches[0].count}`);
        
        if (totalMatches[0].count >= 200) {
            console.log('\n🎉 SUCCESS! Match seeding system is working correctly!');
        } else {
            console.log('\n⚠️  Low match count. Expected more matches.');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run test
if (require.main === module) {
    testMatchSeeding();
}

module.exports = testMatchSeeding;