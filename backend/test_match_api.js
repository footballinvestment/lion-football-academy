const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

// Test the Match Statistics API endpoints
async function testMatchStatisticsAPI() {
    console.log('🚀 Testing Match Statistics API...\n');
    
    try {
        // 1. Test server health
        console.log('📊 Testing server health...');
        const healthResponse = await axios.get(`${API_BASE}/health`);
        console.log('✅ Health check:', healthResponse.data.status);
        
        // 2. Test authentication (we need a token for protected routes)
        console.log('\n🔐 Testing authentication...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        
        if (loginResponse.data.tokens) {
            console.log('✅ Login successful');
            const token = loginResponse.data.tokens.accessToken;
            const headers = { 'Authorization': `Bearer ${token}` };
            
            // 3. Test GET /api/matches - List matches
            console.log('\n📋 Testing GET /api/matches...');
            try {
                const matchesResponse = await axios.get(`${API_BASE}/matches`, { headers });
                console.log('✅ Matches list:', matchesResponse.data.length, 'matches');
            } catch (error) {
                console.log('⚠️ No matches found or error:', error.response?.data?.error || error.message);
            }
            
            // 4. Test POST /api/matches - Create match (need team IDs first)
            console.log('\n📝 Testing POST /api/matches...');
            try {
                // Get teams first
                const teamsResponse = await axios.get(`${API_BASE}/teams`, { headers });
                const teams = teamsResponse.data;
                
                if (teams.length >= 2) {
                    const matchData = {
                        home_team_id: teams[0].id,
                        away_team_id: teams[1].id,
                        match_date: '2024-12-01',
                        match_time: '15:00',
                        match_type: 'friendly',
                        season: '2024/25',
                        venue: 'Test Stadium'
                    };
                    
                    const createResponse = await axios.post(`${API_BASE}/matches`, matchData, { headers });
                    console.log('✅ Match created:', createResponse.data.match?.id);
                    
                    const matchId = createResponse.data.match?.id;
                    
                    if (matchId) {
                        // 5. Test GET /api/matches/:id - Get specific match
                        console.log('\n🔍 Testing GET /api/matches/:id...');
                        const matchResponse = await axios.get(`${API_BASE}/matches/${matchId}`, { headers });
                        console.log('✅ Match details retrieved:', matchResponse.data.id);
                        
                        // 6. Test PUT /api/matches/:id/score - Update score
                        console.log('\n⚽ Testing PUT /api/matches/:id/score...');
                        const scoreResponse = await axios.put(`${API_BASE}/matches/${matchId}/score`, {
                            home_score: 2,
                            away_score: 1
                        }, { headers });
                        console.log('✅ Score updated:', scoreResponse.data.message);
                        
                        // 7. Test GET players for performance recording
                        const playersResponse = await axios.get(`${API_BASE}/players`, { headers });
                        const players = playersResponse.data;
                        
                        if (players.length > 0) {
                            // 8. Test POST /api/matches/:id/performance - Record player performance
                            console.log('\n📈 Testing POST /api/matches/:id/performance...');
                            const performanceData = {
                                player_id: players[0].id,
                                team_id: teams[0].id,
                                position: 'Forward',
                                minutes_played: 90,
                                starter: true,
                                goals: 1,
                                assists: 0,
                                performance_rating: 8.5,
                                coach_notes: 'Excellent performance in test match'
                            };
                            
                            const perfResponse = await axios.post(`${API_BASE}/matches/${matchId}/performance`, performanceData, { headers });
                            console.log('✅ Player performance recorded:', perfResponse.data.message);
                            
                            // 9. Test POST /api/matches/:id/events - Add match event
                            console.log('\n⚡ Testing POST /api/matches/:id/events...');
                            const eventData = {
                                player_id: players[0].id,
                                team_id: teams[0].id,
                                event_type: 'goal',
                                event_minute: 23,
                                event_description: 'Beautiful strike from outside the box'
                            };
                            
                            const eventResponse = await axios.post(`${API_BASE}/matches/${matchId}/events`, eventData, { headers });
                            console.log('✅ Match event added:', eventResponse.data.message);
                            
                            // 10. Test GET /api/matches/:id/events - Get match events
                            console.log('\n🎯 Testing GET /api/matches/:id/events...');
                            const eventsResponse = await axios.get(`${API_BASE}/matches/${matchId}/events`, { headers });
                            console.log('✅ Match events retrieved:', eventsResponse.data.length, 'events');
                            
                            // 11. Test GET /api/matches/:id/performance - Get player performance
                            console.log('\n📊 Testing GET /api/matches/:id/performance...');
                            const perfGetResponse = await axios.get(`${API_BASE}/matches/${matchId}/performance`, { headers });
                            console.log('✅ Player performance retrieved:', perfGetResponse.data.length, 'records');
                        }
                        
                        // 12. Test statistics endpoints
                        console.log('\n📈 Testing GET /api/matches/statistics/top-scorers...');
                        try {
                            const scorersResponse = await axios.get(`${API_BASE}/matches/statistics/top-scorers`, { headers });
                            console.log('✅ Top scorers retrieved:', scorersResponse.data.length, 'players');
                        } catch (error) {
                            console.log('⚠️ Top scorers error:', error.response?.data?.error || error.message);
                        }
                    }
                } else {
                    console.log('⚠️ Need at least 2 teams to create a match');
                }
            } catch (error) {
                console.log('❌ Match creation error:', error.response?.data?.error || error.message);
            }
            
        } else {
            console.log('❌ Login failed');
        }
        
    } catch (error) {
        console.log('❌ Test failed:', error.response?.data?.error || error.message);
    }
    
    console.log('\n🏁 Test completed!');
}

// Run the tests
testMatchStatisticsAPI();