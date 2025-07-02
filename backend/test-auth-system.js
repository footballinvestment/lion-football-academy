/**
 * Test Authentication System
 * Tests login, token generation, and API access
 */

const axios = require('axios');
const { seedAdminUser } = require('./src/database/seedAdmin');

class AuthSystemTester {
    constructor() {
        this.baseURL = 'http://localhost:5001/api';
        this.authToken = null;
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async runTests() {
        console.log('🔐 AUTHENTICATION SYSTEM TESTS');
        console.log('='.repeat(50));

        try {
            // 1. Seed admin user
            await this.seedAdminUser();
            
            // 2. Test login
            await this.testLogin();
            
            // 3. Test token validation
            await this.testTokenValidation();
            
            // 4. Test protected endpoints
            await this.testProtectedEndpoints();
            
            // 5. Test role-based access
            await this.testRoleBasedAccess();
            
            this.generateReport();
            
        } catch (error) {
            this.fail('Authentication test suite failed', error.message);
            console.error('❌ Auth tests failed:', error);
        }
    }

    async seedAdminUser() {
        console.log('\n👤 Seeding Admin User...');
        
        try {
            await seedAdminUser();
            this.pass('Admin user seeded successfully');
        } catch (error) {
            this.fail('Failed to seed admin user', error.message);
        }
    }

    async testLogin() {
        console.log('\n🔑 Testing Login...');
        
        try {
            // Test with correct credentials
            const loginData = {
                username: 'admin',
                password: 'admin123'
            };

            const response = await axios.post(`${this.baseURL}/auth/login`, loginData);
            
            if (response.status === 200 && response.data.success) {
                this.authToken = response.data.tokens.accessToken;
                this.pass(`Login successful - Token: ${this.authToken.substring(0, 20)}...`);
                
                // Validate response structure
                if (response.data.user && response.data.user.role === 'admin') {
                    this.pass('Login response contains valid user data');
                } else {
                    this.fail('Login response missing user data');
                }
                
                if (response.data.tokens && response.data.tokens.accessToken) {
                    this.pass('Login response contains access token');
                } else {
                    this.fail('Login response missing access token');
                }
                
            } else {
                this.fail('Login request failed');
            }
            
        } catch (error) {
            this.fail('Login failed', error.response?.data?.message || error.message);
            
            // Test with wrong credentials
            try {
                await axios.post(`${this.baseURL}/auth/login`, {
                    username: 'admin',
                    password: 'wrongpassword'
                });
                this.fail('Login with wrong password should fail');
            } catch (wrongPassError) {
                if (wrongPassError.response?.status === 401) {
                    this.pass('Login with wrong password properly rejected');
                } else {
                    this.fail('Login with wrong password returned unexpected status');
                }
            }
        }
    }

    async testTokenValidation() {
        console.log('\n🎫 Testing Token Validation...');
        
        if (!this.authToken) {
            this.fail('No auth token available for validation test');
            return;
        }

        try {
            const response = await axios.get(`${this.baseURL}/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.status === 200 && response.data.success) {
                this.pass('Token validation successful');
                
                if (response.data.user && response.data.user.role === 'admin') {
                    this.pass('Token contains valid user information');
                } else {
                    this.fail('Token validation response missing user data');
                }
            } else {
                this.fail('Token validation failed');
            }
            
        } catch (error) {
            this.fail('Token validation failed', error.response?.data?.message || error.message);
        }

        // Test with invalid token
        try {
            await axios.get(`${this.baseURL}/auth/verify`, {
                headers: {
                    'Authorization': `Bearer invalid-token`
                }
            });
            this.fail('Invalid token should be rejected');
        } catch (error) {
            if (error.response?.status === 401) {
                this.pass('Invalid token properly rejected');
            } else {
                this.fail('Invalid token returned unexpected status');
            }
        }
    }

    async testProtectedEndpoints() {
        console.log('\n🛡️  Testing Protected Endpoints...');
        
        const endpoints = [
            { method: 'GET', path: '/players', description: 'Get players' },
            { method: 'GET', path: '/teams', description: 'Get teams' },
            { method: 'GET', path: '/matches', description: 'Get matches' },
            { method: 'GET', path: '/statistics/dashboard', description: 'Get dashboard stats' }
        ];

        for (const endpoint of endpoints) {
            try {
                // Test without authentication
                try {
                    await axios({
                        method: endpoint.method,
                        url: `${this.baseURL}${endpoint.path}`
                    });
                    this.fail(`${endpoint.description} should require authentication`);
                } catch (error) {
                    if (error.response?.status === 401) {
                        this.pass(`${endpoint.description} properly requires authentication`);
                    } else {
                        this.fail(`${endpoint.description} returned unexpected status without auth`);
                    }
                }

                // Test with authentication
                if (this.authToken) {
                    const response = await axios({
                        method: endpoint.method,
                        url: `${this.baseURL}${endpoint.path}`,
                        headers: {
                            'Authorization': `Bearer ${this.authToken}`
                        }
                    });
                    
                    if (response.status === 200) {
                        this.pass(`${endpoint.description} accessible with authentication`);
                    } else {
                        this.fail(`${endpoint.description} returned unexpected status with auth`);
                    }
                }
                
            } catch (error) {
                this.fail(`${endpoint.description} test failed`, error.message);
            }
        }
    }

    async testRoleBasedAccess() {
        console.log('\n👥 Testing Role-Based Access...');
        
        if (!this.authToken) {
            this.fail('No auth token available for role testing');
            return;
        }

        try {
            // Test admin-only endpoint
            const response = await axios.get(`${this.baseURL}/auth/profile`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.status === 200 && response.data.user.role === 'admin') {
                this.pass('Admin can access profile endpoint');
            } else {
                this.fail('Profile endpoint access failed');
            }
            
        } catch (error) {
            this.fail('Role-based access test failed', error.message);
        }
    }

    generateReport() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 AUTHENTICATION TEST REPORT');
        console.log('='.repeat(50));
        
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        
        const total = this.testResults.passed + this.testResults.failed;
        const successRate = total > 0 ? Math.round((this.testResults.passed / total) * 100) : 0;
        
        console.log(`📈 Success Rate: ${successRate}%`);
        
        if (this.testResults.failed === 0) {
            console.log('\n🎉 All authentication tests passed! API is ready for use.');
        } else {
            console.log('\n⚠️  Some authentication tests failed. Review issues above.');
        }
        
        console.log('='.repeat(50));
    }

    pass(message) {
        console.log(`   ✅ ${message}`);
        this.testResults.passed++;
        this.testResults.tests.push({ status: 'pass', message });
    }

    fail(message, details = null) {
        console.log(`   ❌ ${message}`);
        if (details) {
            console.log(`      Details: ${details}`);
        }
        this.testResults.failed++;
        this.testResults.tests.push({ status: 'fail', message, details });
    }
}

// Main execution
async function main() {
    const tester = new AuthSystemTester();
    
    try {
        await tester.runTests();
        process.exit(tester.testResults.failed === 0 ? 0 : 1);
    } catch (error) {
        console.error('Authentication test execution failed:', error);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = AuthSystemTester;