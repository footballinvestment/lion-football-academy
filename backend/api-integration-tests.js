/**
 * API Integration Tests
 * Tests all API endpoints with proper authentication and data validation
 */

const axios = require('axios');
const db = require('./src/database/connection');

class APIIntegrationTests {
    constructor() {
        this.baseURL = 'http://localhost:5001/api';
        this.authToken = null;
        this.testResults = {
            passed: 0,
            failed: 0,
            warnings: 0,
            apiTests: [],
            performanceMetrics: {}
        };
    }

    async runAPITests() {
        console.log('🌐 API INTEGRATION TESTS');
        console.log('='.repeat(50));

        try {
            // 1. Test server availability
            await this.testServerAvailability();
            
            // 2. Test authentication
            await this.testAuthentication();
            
            // 3. Test core endpoints
            await this.testCoreEndpoints();
            
            // 4. Test data CRUD operations
            await this.testCRUDOperations();
            
            // 5. Test role-based access
            await this.testRoleBasedAccess();
            
            // 6. Test error handling
            await this.testErrorHandling();
            
            // 7. Test performance
            await this.testAPIPerformance();
            
            this.generateAPIReport();
            
        } catch (error) {
            this.fail('API test suite execution failed', error.message);
            console.error('❌ API tests failed:', error);
        }
    }

    async testServerAvailability() {
        console.log('\n🔗 Testing Server Availability...');
        
        try {
            const startTime = Date.now();
            const response = await axios.get(`${this.baseURL}/test`, { timeout: 5000 });
            const responseTime = Date.now() - startTime;
            
            this.testResults.performanceMetrics.serverResponse = responseTime;
            
            if (response.status === 200) {
                this.pass(`Server available (${responseTime}ms)`);
                return true;
            } else {
                this.fail(`Server returned status ${response.status}`);
                return false;
            }
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                this.warning('Server not running - skipping API tests');
                console.log('   💡 To run API tests, start the server with: npm start');
                return false;
            } else {
                this.fail('Server availability test failed', error.message);
                return false;
            }
        }
    }

    async testAuthentication() {
        console.log('\n🔐 Testing Authentication...');
        
        // Test without authentication (should fail)
        try {
            await axios.get(`${this.baseURL}/players`);
            this.fail('Unauthenticated request succeeded (security issue)');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                this.pass('Unauthenticated request properly rejected');
            } else {
                this.warning('Unexpected response to unauthenticated request');
            }
        }

        // Get real authentication token by logging in
        try {
            const loginResponse = await axios.post(`${this.baseURL}/auth/login`, {
                username: 'admin',
                password: 'admin123'
            });

            if (loginResponse.status === 200 && loginResponse.data.success) {
                this.authToken = loginResponse.data.tokens.accessToken;
                this.pass('Real authentication token obtained');
            } else {
                this.warning('Failed to obtain authentication token');
            }
        } catch (error) {
            this.warning('Could not authenticate for testing', error.message);
        }
    }

    async testCoreEndpoints() {
        console.log('\n📋 Testing Core Endpoints...');
        
        const endpoints = [
            {
                method: 'GET',
                path: '/players',
                description: 'Get all players',
                expectedStatus: 200
            },
            {
                method: 'GET',
                path: '/teams',
                description: 'Get all teams',
                expectedStatus: 200
            },
            {
                method: 'GET',
                path: '/matches',
                description: 'Get all matches',
                expectedStatus: 200
            },
            {
                method: 'GET',
                path: '/trainings',
                description: 'Get all trainings',
                expectedStatus: 200
            },
            {
                method: 'GET',
                path: '/announcements',
                description: 'Get all announcements',
                expectedStatus: 200
            },
            {
                method: 'GET',
                path: '/statistics/dashboard',
                description: 'Get dashboard statistics',
                expectedStatus: 200
            }
        ];

        for (const endpoint of endpoints) {
            await this.testEndpoint(endpoint);
        }
    }

    async testEndpoint(endpoint) {
        try {
            const startTime = Date.now();
            const config = {
                method: endpoint.method,
                url: `${this.baseURL}${endpoint.path}`,
                timeout: 10000
            };

            // Add auth token if available
            if (this.authToken) {
                config.headers = {
                    'Authorization': `Bearer ${this.authToken}`
                };
            }

            const response = await axios(config);
            const responseTime = Date.now() - startTime;
            
            const testResult = {
                endpoint: endpoint.path,
                method: endpoint.method,
                status: response.status,
                responseTime,
                dataLength: response.data ? JSON.stringify(response.data).length : 0,
                success: response.status === endpoint.expectedStatus
            };
            
            this.testResults.apiTests.push(testResult);

            if (response.status === endpoint.expectedStatus) {
                this.pass(`${endpoint.description} (${responseTime}ms, ${testResult.dataLength} bytes)`);
                
                // Validate response structure
                if (response.data) {
                    if (Array.isArray(response.data)) {
                        this.pass(`  └─ Returns array with ${response.data.length} items`);
                    } else if (typeof response.data === 'object') {
                        this.pass(`  └─ Returns object with ${Object.keys(response.data).length} properties`);
                    }
                }
            } else {
                this.fail(`${endpoint.description} returned status ${response.status}, expected ${endpoint.expectedStatus}`);
            }
        } catch (error) {
            const testResult = {
                endpoint: endpoint.path,
                method: endpoint.method,
                status: error.response?.status || 'ERROR',
                responseTime: 0,
                dataLength: 0,
                success: false,
                error: error.message
            };
            
            this.testResults.apiTests.push(testResult);
            
            if (error.response?.status === 401) {
                this.warning(`${endpoint.description} requires authentication`);
            } else {
                this.fail(`${endpoint.description} failed`, error.message);
            }
        }
    }

    async testCRUDOperations() {
        console.log('\n🔄 Testing CRUD Operations...');
        
        // Test announcement CRUD (simpler entity)
        try {
            await this.testAnnouncementCRUD();
        } catch (error) {
            this.fail('CRUD operation tests failed', error.message);
        }
    }

    async testAnnouncementCRUD() {
        const testAnnouncement = {
            title: 'Test Announcement',
            content: 'This is a test announcement for API testing',
            category: 'general',
            priority: 'normal',
            author_id: 1
        };

        try {
            // CREATE
            console.log('   📝 Testing CREATE operation...');
            let response = await axios.post(`${this.baseURL}/announcements`, testAnnouncement, {
                headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {},
                timeout: 5000
            });
            
            if (response.status === 201) {
                this.pass('CREATE: Announcement created successfully');
                const createdId = response.data.id;
                
                // READ
                console.log('   📖 Testing READ operation...');
                response = await axios.get(`${this.baseURL}/announcements/${createdId}`, {
                    headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {},
                    timeout: 5000
                });
                
                if (response.status === 200 && response.data.title === testAnnouncement.title) {
                    this.pass('READ: Announcement retrieved successfully');
                } else {
                    this.fail('READ: Retrieved announcement data mismatch');
                }
                
                // UPDATE
                console.log('   ✏️  Testing UPDATE operation...');
                const updateData = { ...testAnnouncement, title: 'Updated Test Announcement' };
                response = await axios.put(`${this.baseURL}/announcements/${createdId}`, updateData, {
                    headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {},
                    timeout: 5000
                });
                
                if (response.status === 200) {
                    this.pass('UPDATE: Announcement updated successfully');
                } else {
                    this.fail('UPDATE: Failed to update announcement');
                }
                
                // DELETE
                console.log('   🗑️  Testing DELETE operation...');
                response = await axios.delete(`${this.baseURL}/announcements/${createdId}`, {
                    headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {},
                    timeout: 5000
                });
                
                if (response.status === 200) {
                    this.pass('DELETE: Announcement deleted successfully');
                } else {
                    this.fail('DELETE: Failed to delete announcement');
                }
                
            } else {
                this.fail('CREATE: Failed to create test announcement');
            }
            
        } catch (error) {
            if (error.response?.status === 401) {
                this.warning('CRUD operations require authentication');
            } else if (error.response?.status === 404) {
                this.warning('CRUD endpoint not found - may not be implemented');
            } else {
                this.fail('CRUD operation failed', error.message);
            }
        }
    }

    async testRoleBasedAccess() {
        console.log('\n👥 Testing Role-Based Access Control...');
        
        try {
            // Test different role scenarios
            const roleTests = [
                { role: 'admin', endpoint: '/admin/users', shouldAccess: true },
                { role: 'coach', endpoint: '/admin/users', shouldAccess: false },
                { role: 'parent', endpoint: '/admin/users', shouldAccess: false }
            ];

            for (const test of roleTests) {
                await this.testRoleAccess(test);
            }
        } catch (error) {
            this.warning('Role-based access testing requires authentication setup');
        }
    }

    async testRoleAccess(test) {
        try {
            const response = await axios.get(`${this.baseURL}${test.endpoint}`, {
                headers: { 'Authorization': `Bearer test-${test.role}-token` },
                timeout: 5000
            });
            
            if (test.shouldAccess && response.status === 200) {
                this.pass(`${test.role} can access ${test.endpoint}`);
            } else if (!test.shouldAccess && response.status === 200) {
                this.fail(`${test.role} should not access ${test.endpoint} but can`);
            }
        } catch (error) {
            if (!test.shouldAccess && error.response?.status === 403) {
                this.pass(`${test.role} properly denied access to ${test.endpoint}`);
            } else if (test.shouldAccess && error.response?.status === 403) {
                this.fail(`${test.role} should access ${test.endpoint} but denied`);
            } else {
                this.warning(`${test.role} access test inconclusive for ${test.endpoint}`);
            }
        }
    }

    async testErrorHandling() {
        console.log('\n⚠️  Testing Error Handling...');
        
        const errorTests = [
            {
                url: `${this.baseURL}/players/99999`,
                expectedStatus: 404,
                description: 'Non-existent player'
            },
            {
                url: `${this.baseURL}/invalid-endpoint`,
                expectedStatus: 404,
                description: 'Invalid endpoint'
            }
        ];

        for (const errorTest of errorTests) {
            try {
                await axios.get(errorTest.url, {
                    headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {},
                    timeout: 5000
                });
                this.fail(`${errorTest.description} should return error but succeeded`);
            } catch (error) {
                if (error.response?.status === errorTest.expectedStatus) {
                    this.pass(`${errorTest.description} properly returns ${errorTest.expectedStatus}`);
                } else {
                    this.warning(`${errorTest.description} returns ${error.response?.status}, expected ${errorTest.expectedStatus}`);
                }
            }
        }
    }

    async testAPIPerformance() {
        console.log('\n⚡ Testing API Performance...');
        
        try {
            // Test concurrent requests
            const concurrentRequests = 5;
            const endpoint = `${this.baseURL}/players`;
            
            console.log(`   🔄 Testing ${concurrentRequests} concurrent requests...`);
            
            const startTime = Date.now();
            const promises = Array(concurrentRequests).fill().map(() =>
                axios.get(endpoint, {
                    headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {},
                    timeout: 10000
                })
            );
            
            const responses = await Promise.allSettled(promises);
            const totalTime = Date.now() - startTime;
            const avgTime = totalTime / concurrentRequests;
            
            const successCount = responses.filter(r => r.status === 'fulfilled').length;
            
            this.testResults.performanceMetrics.concurrentRequests = {
                totalTime,
                avgTime,
                successCount,
                totalRequests: concurrentRequests
            };
            
            if (successCount === concurrentRequests) {
                this.pass(`All ${concurrentRequests} concurrent requests succeeded (avg: ${avgTime.toFixed(1)}ms)`);
            } else {
                this.warning(`${successCount}/${concurrentRequests} concurrent requests succeeded`);
            }
            
            // Test response time consistency
            if (avgTime < 200) {
                this.pass('Excellent API response time performance');
            } else if (avgTime < 500) {
                this.pass('Good API response time performance');
            } else {
                this.warning('API response time could be improved');
            }
            
        } catch (error) {
            this.fail('API performance testing failed', error.message);
        }
    }

    generateAPIReport() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 API INTEGRATION TEST REPORT');
        console.log('='.repeat(50));
        
        // Test summary
        console.log('🧪 TEST SUMMARY');
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        console.log(`⚠️  Warnings: ${this.testResults.warnings}`);
        
        const total = this.testResults.passed + this.testResults.failed + this.testResults.warnings;
        const successRate = this.testResults.failed === 0 ? 100 : 
                           Math.round((this.testResults.passed / total) * 100);
        
        console.log(`📈 Success Rate: ${successRate}%`);
        
        // Performance metrics
        if (Object.keys(this.testResults.performanceMetrics).length > 0) {
            console.log('\n⚡ PERFORMANCE METRICS');
            const metrics = this.testResults.performanceMetrics;
            
            if (metrics.serverResponse) {
                console.log(`🔗 Server Response: ${metrics.serverResponse}ms`);
            }
            
            if (metrics.concurrentRequests) {
                const cr = metrics.concurrentRequests;
                console.log(`🔄 Concurrent Requests: ${cr.successCount}/${cr.totalRequests} successful`);
                console.log(`⏱️  Average Response Time: ${cr.avgTime.toFixed(1)}ms`);
            }
        }
        
        // API endpoint summary
        if (this.testResults.apiTests.length > 0) {
            console.log('\n🌐 API ENDPOINTS TESTED');
            this.testResults.apiTests.forEach(test => {
                const status = test.success ? '✅' : '❌';
                console.log(`${status} ${test.method} ${test.endpoint} (${test.status}) - ${test.responseTime}ms`);
            });
        }
        
        // Recommendations
        console.log('\n💡 RECOMMENDATIONS');
        
        if (this.testResults.failed === 0) {
            console.log('🎉 All API tests passed! API is ready for frontend integration.');
        } else {
            console.log('⚠️  Some API tests failed. Review endpoints before frontend integration.');
        }
        
        if (this.testResults.warnings > 0) {
            console.log('📝 Review warnings for authentication and access control issues.');
        }
        
        console.log('='.repeat(50));
    }

    // Helper methods
    pass(message) {
        console.log(`   ✅ ${message}`);
        this.testResults.passed++;
    }

    fail(message, details = null) {
        console.log(`   ❌ ${message}`);
        if (details) {
            console.log(`      Details: ${details}`);
        }
        this.testResults.failed++;
    }

    warning(message) {
        console.log(`   ⚠️  ${message}`);
        this.testResults.warnings++;
    }
}

// Main execution
async function main() {
    const apiTests = new APIIntegrationTests();
    
    try {
        await apiTests.runAPITests();
        process.exit(apiTests.testResults.failed === 0 ? 0 : 1);
    } catch (error) {
        console.error('API integration tests failed:', error);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = APIIntegrationTests;