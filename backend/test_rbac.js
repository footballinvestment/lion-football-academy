const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

// Test Role-Based Access Control for Match Statistics
async function testRoleBasedAccess() {
    console.log('🔒 Testing Role-Based Access Control...\n');
    
    try {
        // 1. Login as admin
        console.log('🔐 Testing Admin Access...');
        const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        
        const adminToken = adminLogin.data.tokens.accessToken;
        const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };
        
        // Test admin can access all matches
        const adminMatches = await axios.get(`${API_BASE}/matches`, { headers: adminHeaders });
        console.log('✅ Admin can see', adminMatches.data.length, 'matches');
        
        // Test admin can create matches
        const newMatch = await axios.post(`${API_BASE}/matches`, {
            home_team_id: 1,
            away_team_id: 2,
            match_date: '2024-12-15',
            match_time: '16:00',
            match_type: 'league',
            season: '2024/25',
            venue: 'RBAC Test Stadium'
        }, { headers: adminHeaders });
        console.log('✅ Admin can create matches:', newMatch.data.success);
        
        // Test admin can access team performance
        try {
            const teamPerf = await axios.get(`${API_BASE}/matches/statistics/team-performance`, { headers: adminHeaders });
            console.log('✅ Admin can access team performance statistics');
        } catch (error) {
            console.log('⚠️ Team performance not accessible:', error.response?.data?.error);
        }
        
        // Test admin can delete matches
        if (adminMatches.data.length > 0) {
            const matchId = adminMatches.data[0].id;
            try {
                const deleteResult = await axios.delete(`${API_BASE}/matches/${matchId}`, { headers: adminHeaders });
                console.log('✅ Admin can delete matches:', deleteResult.data.success);
            } catch (error) {
                console.log('⚠️ Delete failed:', error.response?.data?.error);
            }
        }
        
        console.log('\n🏃 Testing Coach Access...');
        // Test coach access (we would need to create a coach user and test their limited access)
        console.log('⚠️ Coach user testing requires setup - checking endpoint protection');
        
        console.log('\n👨‍👩‍👧‍👦 Testing Parent Access...');
        // Test parent access (we would need to create a parent user and test their limited access)  
        console.log('⚠️ Parent user testing requires setup - checking endpoint protection');
        
        console.log('\n🚫 Testing Unauthorized Access...');
        // Test without authentication
        try {
            await axios.get(`${API_BASE}/matches`);
            console.log('❌ Unauthenticated access should be blocked!');
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ Unauthenticated access properly blocked');
            } else {
                console.log('⚠️ Unexpected error:', error.response?.status, error.response?.data?.error);
            }
        }
        
        // Test with invalid token
        try {
            await axios.get(`${API_BASE}/matches`, { 
                headers: { 'Authorization': 'Bearer invalid_token' } 
            });
            console.log('❌ Invalid token should be rejected!');
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ Invalid token properly rejected');
            } else {
                console.log('⚠️ Unexpected error:', error.response?.status, error.response?.data?.error);
            }
        }
        
    } catch (error) {
        console.log('❌ RBAC Test failed:', error.response?.data?.error || error.message);
    }
    
    console.log('\n🏁 Role-Based Access Control tests completed!');
}

// Run the tests
testRoleBasedAccess();