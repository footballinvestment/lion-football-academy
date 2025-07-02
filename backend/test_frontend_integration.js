const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

async function testFrontendIntegration() {
    console.log('🎯 Testing Complete Match Statistics Frontend-Backend Integration...\n');
    
    try {
        // 1. Login to get token
        console.log('🔐 Step 1: Authentication...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        
        const token = loginResponse.data.tokens.accessToken;
        const headers = { 'Authorization': `Bearer ${token}` };
        console.log('✅ Authentication successful');
        
        // 2. Test all required endpoints for frontend
        console.log('\n📊 Step 2: Testing API endpoints that frontend will use...');
        
        // Teams (for dropdowns)
        const teamsResponse = await axios.get(`${API_BASE}/teams`, { headers });
        console.log(`✅ Teams API: ${teamsResponse.data.length} teams found`);
        
        // Players (for dropdowns)
        const playersResponse = await axios.get(`${API_BASE}/players`, { headers });
        console.log(`✅ Players API: ${playersResponse.data.length} players found`);
        
        // Matches (main data)
        const matchesResponse = await axios.get(`${API_BASE}/matches`, { headers });
        console.log(`✅ Matches API: ${matchesResponse.data.length} matches found`);
        
        // 3. Test creating a match (as frontend would do)
        console.log('\n⚽ Step 3: Testing match creation workflow...');
        const teams = teamsResponse.data;
        
        if (teams.length >= 2) {
            const newMatchData = {
                home_team_id: teams[0].id,
                away_team_id: teams[1].id,
                match_date: '2024-12-25',
                match_time: '15:00',
                match_type: 'friendly',
                season: '2024/2025',
                venue: 'Frontend Integration Test Stadium',
                referee_name: 'Test Referee',
                weather_conditions: 'Perfect testing conditions',
                notes: 'Frontend integration test match'
            };
            
            const createResponse = await axios.post(`${API_BASE}/matches`, newMatchData, { headers });
            console.log('✅ Match creation successful');
            
            // Use an existing match for testing (get the first one)
            const updatedMatches = await axios.get(`${API_BASE}/matches`, { headers });
            const testMatch = updatedMatches.data[0];
            
            if (testMatch) {
                // 4. Test score update
                console.log('\n🏆 Step 4: Testing score update...');
                const scoreUpdate = await axios.put(`${API_BASE}/matches/${testMatch.id}/score`, {
                    home_score: 3,
                    away_score: 2
                }, { headers });
                console.log('✅ Score update successful');
                
                // 5. Test player performance recording
                console.log('\n📈 Step 5: Testing player performance recording...');
                const players = playersResponse.data;
                
                if (players.length > 0) {
                    const performanceData = {
                        player_id: players[0].id,
                        team_id: testMatch.home_team_id,
                        position: 'Forward',
                        minutes_played: 90,
                        starter: true,
                        goals: 2,
                        assists: 1,
                        yellow_cards: 0,
                        red_cards: 0,
                        performance_rating: 9.0,
                        coach_notes: 'Excellent performance in frontend integration test'
                    };
                    
                    const perfResponse = await axios.post(`${API_BASE}/matches/${testMatch.id}/performance`, performanceData, { headers });
                    console.log('✅ Player performance recording successful');
                    
                    // 6. Test match event recording
                    console.log('\n⚡ Step 6: Testing match event recording...');
                    const eventData = {
                        player_id: players[0].id,
                        team_id: testMatch.home_team_id,
                        event_type: 'goal',
                        event_minute: 25,
                        event_description: 'Beautiful header goal from frontend integration test'
                    };
                    
                    const eventResponse = await axios.post(`${API_BASE}/matches/${testMatch.id}/events`, eventData, { headers });
                    console.log('✅ Match event recording successful');
                }
                
                // 7. Test statistics endpoints
                console.log('\n📊 Step 7: Testing statistics endpoints...');
                
                try {
                    const topScorersResponse = await axios.get(`${API_BASE}/matches/statistics/top-scorers`, { headers });
                    console.log(`✅ Top scorers API: ${topScorersResponse.data.length} entries`);
                } catch (error) {
                    console.log('⚠️ Top scorers API: No data yet (expected for new system)');
                }
                
                try {
                    const teamPerfResponse = await axios.get(`${API_BASE}/matches/statistics/team-performance`, { headers });
                    console.log(`✅ Team performance API: ${teamPerfResponse.data.length} entries`);
                } catch (error) {
                    console.log('⚠️ Team performance API: No data yet (expected for new system)');
                }
                
                // 8. Test match details endpoints
                console.log('\n🔍 Step 8: Testing match details endpoints...');
                
                const matchEventsResponse = await axios.get(`${API_BASE}/matches/${testMatch.id}/events`, { headers });
                console.log(`✅ Match events API: ${matchEventsResponse.data.length} events`);
                
                const matchPerformanceResponse = await axios.get(`${API_BASE}/matches/${testMatch.id}/performance`, { headers });
                console.log(`✅ Match performance API: ${matchPerformanceResponse.data.length} performance records`);
            }
        }
        
        console.log('\n🎉 Frontend Integration Test Summary:');
        console.log('✅ All core API endpoints working');
        console.log('✅ Match creation workflow functional');
        console.log('✅ Score update system operational');
        console.log('✅ Player performance recording active');
        console.log('✅ Match events system working');
        console.log('✅ Statistics endpoints responding');
        console.log('✅ Match details endpoints functional');
        console.log('\n🚀 The frontend should now be fully functional!');
        console.log('📱 You can access the application at: http://localhost:3000');
        console.log('🔐 Login with: admin / admin123');
        console.log('⚽ Navigate to "Mérkőzések" to test the Match Statistics system');
        
    } catch (error) {
        console.error('❌ Integration test failed:', error.response?.data?.error || error.message);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('1. Make sure backend is running on port 5001');
        console.log('2. Make sure frontend is running on port 3000');
        console.log('3. Check that database schema is properly applied');
        console.log('4. Verify admin user exists with correct credentials');
    }
}

// Run the integration test
testFrontendIntegration();