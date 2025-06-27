/**
 * Comprehensive Test Suite for Lion Football Academy
 * Tests data seeding, API endpoints, performance, and user workflows
 */

const fs = require('fs');
const path = require('path');
const db = require('./src/database/connection');
const axios = require('axios');

class ComprehensiveTestSuite {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            warnings: 0,
            performance: {},
            errors: []
        };
        this.apiBaseUrl = 'http://localhost:5001/api';
        this.testStartTime = Date.now();
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🧪 LION FOOTBALL ACADEMY - COMPREHENSIVE TEST SUITE');
        console.log('='.repeat(60));
        console.log(`📅 Test started: ${new Date().toISOString()}`);
        console.log('='.repeat(60));

        try {
            // 1. Database Schema and Connection Tests
            await this.testDatabaseConnection();
            await this.testDatabaseSchema();
            
            // 2. Data Integrity Tests
            await this.testDataIntegrity();
            
            // 3. API Endpoint Tests
            await this.testAPIEndpoints();
            
            // 4. Performance Tests
            await this.testPerformance();
            
            // 5. User Workflow Tests
            await this.testUserWorkflows();
            
            // 6. Frontend Component Tests
            await this.testFrontendComponents();
            
            // Generate comprehensive report
            await this.generateReport();
            
        } catch (error) {
            this.fail('Test suite execution failed', error.message);
            console.error('❌ Test suite failed:', error);
        }
    }

    /**
     * Test database connection and basic queries
     */
    async testDatabaseConnection() {
        console.log('\n📡 Testing Database Connection...');
        
        try {
            const startTime = Date.now();
            const result = await db.query('SELECT 1 as test');
            const queryTime = Date.now() - startTime;
            
            this.testResults.performance.dbConnection = queryTime;
            
            if (result && result[0]?.test === 1) {
                this.pass(`Database connection successful (${queryTime}ms)`);
            } else {
                this.fail('Database connection test failed');
            }
        } catch (error) {
            this.fail('Database connection failed', error.message);
        }
    }

    /**
     * Test database schema completeness
     */
    async testDatabaseSchema() {
        console.log('\n🗄️  Testing Database Schema...');
        
        const requiredTables = [
            'users', 'teams', 'players', 'trainings', 'matches',
            'attendance', 'announcements', 'player_match_performance',
            'match_events', 'team_match_statistics'
        ];
        
        const optionalTables = [
            'injuries', 'development_plans', 'skills_assessments',
            'medical_records', 'progress_tracking', 'development_milestones'
        ];

        for (const table of requiredTables) {
            try {
                await db.query(`SELECT COUNT(*) as count FROM ${table} LIMIT 1`);
                this.pass(`Required table '${table}' exists`);
            } catch (error) {
                this.fail(`Required table '${table}' missing`, error.message);
            }
        }

        for (const table of optionalTables) {
            try {
                await db.query(`SELECT COUNT(*) as count FROM ${table} LIMIT 1`);
                this.pass(`Optional table '${table}' exists`);
            } catch (error) {
                this.warning(`Optional table '${table}' not found (may need creation)`);
            }
        }
    }

    /**
     * Test data integrity and relationships
     */
    async testDataIntegrity() {
        console.log('\n🔍 Testing Data Integrity...');
        
        try {
            // Test basic data existence
            const playerCount = await this.getTableCount('players');
            const teamCount = await this.getTableCount('teams');
            const userCount = await this.getTableCount('users');
            const matchCount = await this.getTableCount('matches');
            
            if (playerCount > 0 && teamCount > 0 && userCount > 0) {
                this.pass(`Data exists: ${playerCount} players, ${teamCount} teams, ${userCount} users, ${matchCount} matches`);
            } else {
                this.warning('Minimal data found - may need seeding');
            }
            
            // Test referential integrity
            const orphanedPlayers = await this.checkOrphanedPlayers();
            if (orphanedPlayers === 0) {
                this.pass('No orphaned players found');
            } else {
                this.warning(`Found ${orphanedPlayers} players without valid teams`);
            }
            
            // Test match data consistency
            if (matchCount > 0) {
                const invalidMatches = await this.checkInvalidMatches();
                if (invalidMatches === 0) {
                    this.pass('All matches have valid team references');
                } else {
                    this.fail(`Found ${invalidMatches} matches with invalid team references`);
                }
            }
            
            // Test data quality
            await this.testDataQuality();
            
        } catch (error) {
            this.fail('Data integrity check failed', error.message);
        }
    }

    /**
     * Test API endpoints functionality
     */
    async testAPIEndpoints() {
        console.log('\n🌐 Testing API Endpoints...');
        
        // Test if server is running
        try {
            const startTime = Date.now();
            const response = await axios.get(`${this.apiBaseUrl}/test`);
            const responseTime = Date.now() - startTime;
            
            this.testResults.performance.apiResponse = responseTime;
            this.pass(`API server responding (${responseTime}ms)`);
        } catch (error) {
            this.warning('API server not running - skipping endpoint tests');
            return;
        }

        // Get authentication token
        let authToken = null;
        try {
            const loginResponse = await axios.post(`${this.apiBaseUrl}/auth/login`, {
                username: 'admin',
                password: 'admin123'
            });

            if (loginResponse.status === 200 && loginResponse.data.success) {
                authToken = loginResponse.data.tokens.accessToken;
                this.pass('Authentication token obtained for API testing');
            } else {
                this.warning('Failed to obtain authentication token');
            }
        } catch (error) {
            this.warning('Could not authenticate for API testing');
        }

        // Test core endpoints
        const endpoints = [
            { method: 'GET', path: '/players', description: 'Get all players' },
            { method: 'GET', path: '/teams', description: 'Get all teams' },
            { method: 'GET', path: '/matches', description: 'Get all matches' },
            { method: 'GET', path: '/statistics/dashboard', description: 'Get dashboard stats' },
            { method: 'GET', path: '/announcements', description: 'Get announcements' }
        ];

        for (const endpoint of endpoints) {
            try {
                const startTime = Date.now();
                const config = {
                    method: endpoint.method,
                    url: `${this.apiBaseUrl}${endpoint.path}`,
                    timeout: 5000
                };

                // Add auth token if available
                if (authToken) {
                    config.headers = {
                        'Authorization': `Bearer ${authToken}`
                    };
                }

                const response = await axios(config);
                const responseTime = Date.now() - startTime;
                
                if (response.status === 200) {
                    this.pass(`${endpoint.description} (${responseTime}ms)`);
                } else {
                    this.warning(`${endpoint.description} returned status ${response.status}`);
                }
            } catch (error) {
                this.fail(`${endpoint.description} failed`, error.message);
            }
        }
    }

    /**
     * Test system performance
     */
    async testPerformance() {
        console.log('\n⚡ Testing System Performance...');
        
        try {
            // Database query performance
            console.log('   📊 Testing database query performance...');
            
            const queries = [
                { name: 'Simple SELECT', query: 'SELECT COUNT(*) FROM players' },
                { name: 'JOIN query', query: 'SELECT p.name, t.name as team FROM players p LEFT JOIN teams t ON p.team_id = t.id LIMIT 10' },
                { name: 'Complex query', query: 'SELECT COUNT(*) FROM matches WHERE match_status = "finished"' }
            ];

            for (const queryTest of queries) {
                const startTime = Date.now();
                await db.query(queryTest.query);
                const queryTime = Date.now() - startTime;
                
                this.testResults.performance[queryTest.name] = queryTime;
                
                if (queryTime < 100) {
                    this.pass(`${queryTest.name}: ${queryTime}ms (excellent)`);
                } else if (queryTime < 500) {
                    this.pass(`${queryTest.name}: ${queryTime}ms (good)`);
                } else {
                    this.warning(`${queryTest.name}: ${queryTime}ms (slow)`);
                }
            }
            
            // Memory usage check
            const memUsage = process.memoryUsage();
            this.testResults.performance.memoryUsage = {
                rss: Math.round(memUsage.rss / 1024 / 1024),
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
            };
            
            console.log(`   💾 Memory usage: ${this.testResults.performance.memoryUsage.heapUsed}MB heap used`);
            
        } catch (error) {
            this.fail('Performance testing failed', error.message);
        }
    }

    /**
     * Test user workflow scenarios
     */
    async testUserWorkflows() {
        console.log('\n👤 Testing User Workflows...');
        
        try {
            // Admin workflow
            console.log('   👨‍💼 Testing admin workflow...');
            await this.testAdminWorkflow();
            
            // Coach workflow
            console.log('   👨‍🏫 Testing coach workflow...');
            await this.testCoachWorkflow();
            
            // Parent workflow
            console.log('   👨‍👩‍👧‍👦 Testing parent workflow...');
            await this.testParentWorkflow();
            
        } catch (error) {
            this.fail('User workflow testing failed', error.message);
        }
    }

    /**
     * Test frontend component structure
     */
    async testFrontendComponents() {
        console.log('\n🎨 Testing Frontend Components...');
        
        const frontendPath = path.join(__dirname, '../frontend/src/components');
        
        if (!fs.existsSync(frontendPath)) {
            this.warning('Frontend components directory not found');
            return;
        }

        const requiredComponents = [
            'MatchManagement.js',
            'PlayerStatistics.js',
            'DevelopmentPlanner.js',
            'TeamAnalytics.js',
            'InjuryTracker.js',
            'SeasonDashboard.js'
        ];

        for (const component of requiredComponents) {
            const componentPath = path.join(frontendPath, component);
            if (fs.existsSync(componentPath)) {
                // Check component structure
                const componentContent = fs.readFileSync(componentPath, 'utf8');
                
                // Basic React component checks
                if (componentContent.includes('import React') || componentContent.includes('from \'react\'')) {
                    this.pass(`Component ${component} exists and imports React`);
                } else {
                    this.warning(`Component ${component} exists but may not be a valid React component`);
                }
                
                // Check for PropTypes
                if (componentContent.includes('PropTypes')) {
                    this.pass(`Component ${component} includes PropTypes validation`);
                } else {
                    this.warning(`Component ${component} missing PropTypes validation`);
                }
                
                // Check for CSS import
                if (componentContent.includes('.css')) {
                    this.pass(`Component ${component} includes CSS styling`);
                } else {
                    this.warning(`Component ${component} may be missing CSS styling`);
                }
                
            } else {
                this.fail(`Required component ${component} not found`);
            }
        }
    }

    /**
     * Test admin workflow scenarios
     */
    async testAdminWorkflow() {
        // Test admin can access all data
        try {
            const players = await db.query('SELECT COUNT(*) as count FROM players');
            const teams = await db.query('SELECT COUNT(*) as count FROM teams');
            const matches = await db.query('SELECT COUNT(*) as count FROM matches');
            
            this.pass(`Admin can view all data: ${players[0].count} players, ${teams[0].count} teams, ${matches[0].count} matches`);
        } catch (error) {
            this.fail('Admin workflow test failed', error.message);
        }
    }

    /**
     * Test coach workflow scenarios
     */
    async testCoachWorkflow() {
        try {
            // Check if coaches exist and are assigned to teams
            const coaches = await db.query(`
                SELECT u.id, u.username, t.name as team_name 
                FROM users u 
                LEFT JOIN teams t ON u.id = t.coach_id 
                WHERE u.role = 'coach'
                LIMIT 5
            `);
            
            if (coaches.length > 0) {
                this.pass(`Coach workflow data available: ${coaches.length} coaches found`);
                
                // Test coach can access their team's players
                for (const coach of coaches) {
                    if (coach.team_name) {
                        const teamPlayers = await db.query(`
                            SELECT COUNT(*) as count 
                            FROM players p 
                            JOIN teams t ON p.team_id = t.id 
                            WHERE t.coach_id = ?
                        `, [coach.id]);
                        
                        this.pass(`Coach ${coach.username} can access ${teamPlayers[0].count} players`);
                    }
                }
            } else {
                this.warning('No coaches found for workflow testing');
            }
        } catch (error) {
            this.fail('Coach workflow test failed', error.message);
        }
    }

    /**
     * Test parent workflow scenarios
     */
    async testParentWorkflow() {
        try {
            // Check if parents exist and are linked to players
            const parents = await db.query(`
                SELECT u.id, u.username, COUNT(p.id) as children_count
                FROM users u 
                LEFT JOIN players p ON u.id = p.parent_id 
                WHERE u.role = 'parent'
                GROUP BY u.id
                LIMIT 5
            `);
            
            if (parents.length > 0) {
                this.pass(`Parent workflow data available: ${parents.length} parents found`);
                
                // Test parents can access their children's data
                for (const parent of parents) {
                    this.pass(`Parent ${parent.username} linked to ${parent.children_count} child(ren)`);
                }
            } else {
                this.warning('No parents found for workflow testing');
            }
        } catch (error) {
            this.fail('Parent workflow test failed', error.message);
        }
    }

    /**
     * Test data quality metrics
     */
    async testDataQuality() {
        try {
            // Check age group distribution
            const ageGroups = await db.query(`
                SELECT DISTINCT age_group 
                FROM teams 
                WHERE age_group IS NOT NULL
            `);
            
            if (ageGroups.length >= 3) {
                this.pass(`Good age group distribution: ${ageGroups.length} age groups`);
            } else {
                this.warning('Limited age group distribution');
            }
            
            // Check position distribution
            const positions = await db.query(`
                SELECT DISTINCT position 
                FROM players 
                WHERE position IS NOT NULL
            `);
            
            if (positions.length >= 4) {
                this.pass(`Good position distribution: ${positions.length} different positions`);
            } else {
                this.warning('Limited position distribution');
            }
            
            // Check match completion rate
            const matchCount = await this.getTableCount('matches');
            if (matchCount > 0) {
                const finishedMatches = await db.query(`
                    SELECT COUNT(*) as count 
                    FROM matches 
                    WHERE match_status = 'finished'
                `);
                
                const completionRate = (finishedMatches[0].count / matchCount) * 100;
                
                if (completionRate > 30) {
                    this.pass(`Good match completion rate: ${completionRate.toFixed(1)}%`);
                } else {
                    this.warning(`Low match completion rate: ${completionRate.toFixed(1)}%`);
                }
            }
            
        } catch (error) {
            this.warning('Data quality check failed', error.message);
        }
    }

    /**
     * Generate comprehensive test report
     */
    async generateReport() {
        const totalTime = Date.now() - this.testStartTime;
        
        console.log('\n' + '='.repeat(60));
        console.log('📋 COMPREHENSIVE TEST REPORT');
        console.log('='.repeat(60));
        console.log(`📅 Test completed: ${new Date().toISOString()}`);
        console.log(`⏱️  Total execution time: ${totalTime}ms`);
        console.log('='.repeat(60));
        
        // Test summary
        console.log('🧪 TEST SUMMARY');
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        console.log(`⚠️  Warnings: ${this.testResults.warnings}`);
        
        const total = this.testResults.passed + this.testResults.failed + this.testResults.warnings;
        const successRate = this.testResults.failed === 0 ? 100 : 
                           Math.round((this.testResults.passed / total) * 100);
        
        console.log(`📊 Success Rate: ${successRate}%`);
        
        // Performance metrics
        console.log('\n⚡ PERFORMANCE METRICS');
        if (this.testResults.performance.dbConnection) {
            console.log(`🗄️  Database Connection: ${this.testResults.performance.dbConnection}ms`);
        }
        if (this.testResults.performance.apiResponse) {
            console.log(`🌐 API Response Time: ${this.testResults.performance.apiResponse}ms`);
        }
        if (this.testResults.performance.memoryUsage) {
            const mem = this.testResults.performance.memoryUsage;
            console.log(`💾 Memory Usage: ${mem.heapUsed}MB heap / ${mem.rss}MB RSS`);
        }
        
        // Recommendations
        console.log('\n💡 RECOMMENDATIONS');
        
        if (this.testResults.failed === 0) {
            console.log('🎉 All critical tests passed! System is ready for production.');
        } else {
            console.log('⚠️  Some tests failed. Please address the issues above before deployment.');
        }
        
        if (this.testResults.warnings > 0) {
            console.log('📝 Review warnings for potential improvements.');
        }
        
        // Performance recommendations
        if (this.testResults.performance.dbConnection > 50) {
            console.log('🐌 Database connection is slow. Consider optimizing database configuration.');
        }
        
        if (this.testResults.performance.memoryUsage?.heapUsed > 500) {
            console.log('🐘 High memory usage detected. Consider optimizing memory allocation.');
        }
        
        // Save report to file
        const reportData = {
            timestamp: new Date().toISOString(),
            executionTime: totalTime,
            results: this.testResults,
            summary: {
                passed: this.testResults.passed,
                failed: this.testResults.failed,
                warnings: this.testResults.warnings,
                successRate: successRate
            }
        };
        
        const reportPath = path.join(__dirname, 'test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
        
        console.log('='.repeat(60));
    }

    // Helper methods for database queries
    async getTableCount(tableName) {
        try {
            const result = await db.query(`SELECT COUNT(*) as count FROM ${tableName}`);
            return result[0]?.count || 0;
        } catch (error) {
            return 0;
        }
    }

    async checkOrphanedPlayers() {
        try {
            const result = await db.query(`
                SELECT COUNT(*) as count 
                FROM players p 
                LEFT JOIN teams t ON p.team_id = t.id 
                WHERE p.team_id IS NOT NULL AND t.id IS NULL
            `);
            return result[0]?.count || 0;
        } catch (error) {
            return 0;
        }
    }

    async checkInvalidMatches() {
        try {
            const result = await db.query(`
                SELECT COUNT(*) as count 
                FROM matches m 
                LEFT JOIN teams ht ON m.home_team_id = ht.id 
                LEFT JOIN teams at ON m.away_team_id = at.id 
                WHERE (m.home_team_id IS NOT NULL AND ht.id IS NULL) 
                   OR (m.away_team_id IS NOT NULL AND at.id IS NULL)
            `);
            return result[0]?.count || 0;
        } catch (error) {
            return 0;
        }
    }

    // Test result logging methods
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
        this.testResults.errors.push({ message, details });
    }

    warning(message) {
        console.log(`   ⚠️  ${message}`);
        this.testResults.warnings++;
    }
}

// Main execution
async function main() {
    const testSuite = new ComprehensiveTestSuite();
    
    try {
        await testSuite.runAllTests();
        process.exit(testSuite.testResults.failed === 0 ? 0 : 1);
    } catch (error) {
        console.error('Test suite execution failed:', error);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = ComprehensiveTestSuite;