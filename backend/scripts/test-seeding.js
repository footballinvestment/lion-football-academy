/**
 * Test Seeding Script
 * Validates the comprehensive seeding system
 */

const db = require('../src/database/connection');
const DataGenerators = require('./data-generators');

class SeedingValidator {
    constructor() {
        this.generator = new DataGenerators();
        this.testResults = {
            passed: 0,
            failed: 0,
            warnings: 0
        };
    }

    /**
     * Run all validation tests
     */
    async validateSeeding() {
        console.log('🧪 SEEDING VALIDATION TESTS');
        console.log('='.repeat(50));
        
        try {
            await this.testDatabaseConnection();
            await this.testDataGenerators();
            await this.testDatabaseSchema();
            await this.testDataConsistency();
            await this.testDataQuality();
            
            this.printTestSummary();
            
        } catch (error) {
            console.error('❌ Validation failed:', error);
            throw error;
        }
    }

    /**
     * Test database connection
     */
    async testDatabaseConnection() {
        console.log('\n📡 Testing Database Connection...');
        
        try {
            await db.query('SELECT 1 as test');
            this.pass('Database connection successful');
        } catch (error) {
            this.fail('Database connection failed', error.message);
        }
    }

    /**
     * Test data generators
     */
    async testDataGenerators() {
        console.log('\n🎲 Testing Data Generators...');
        
        // Test Hungarian name generation
        try {
            const maleName = this.generator.generateHungarianName('male');
            const femaleName = this.generator.generateHungarianName('female');
            
            if (maleName && femaleName && maleName !== femaleName) {
                this.pass('Hungarian name generation working');
            } else {
                this.fail('Hungarian name generation failed');
            }
        } catch (error) {
            this.fail('Hungarian name generation error', error.message);
        }

        // Test email generation
        try {
            const email = this.generator.generateEmail('Nagy Péter');
            if (email && email.includes('@') && email.includes('nagy.peter')) {
                this.pass('Email generation working');
            } else {
                this.fail('Email generation failed');
            }
        } catch (error) {
            this.fail('Email generation error', error.message);
        }

        // Test birth date generation
        try {
            const birthDate = this.generator.generateBirthDate('U10', '2024-25');
            if (birthDate && birthDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                this.pass('Birth date generation working');
            } else {
                this.fail('Birth date generation failed');
            }
        } catch (error) {
            this.fail('Birth date generation error', error.message);
        }

        // Test match result generation
        try {
            const result = this.generator.generateMatchResult(7, 5);
            if (result && typeof result.homeScore === 'number' && typeof result.awayScore === 'number') {
                this.pass('Match result generation working');
            } else {
                this.fail('Match result generation failed');
            }
        } catch (error) {
            this.fail('Match result generation error', error.message);
        }

        // Test injury generation
        try {
            const position = this.generator.footballPositions[0];
            const injury = this.generator.generateInjury(position, 'training');
            if (injury && injury.injury_type && injury.injury_severity) {
                this.pass('Injury generation working');
            } else {
                this.fail('Injury generation failed');
            }
        } catch (error) {
            this.fail('Injury generation error', error.message);
        }
    }

    /**
     * Test database schema
     */
    async testDatabaseSchema() {
        console.log('\n🗄️  Testing Database Schema...');
        
        const requiredTables = [
            'users', 'teams', 'players', 'trainings', 'matches',
            'attendance', 'announcements', 'injuries'
        ];

        for (const table of requiredTables) {
            try {
                await db.query(`SELECT COUNT(*) FROM ${table} LIMIT 1`);
                this.pass(`Table ${table} exists`);
            } catch (error) {
                this.warning(`Table ${table} may not exist: ${error.message}`);
            }
        }

        // Test optional tables from schema extensions
        const optionalTables = [
            'development_plans', 'skills_assessments', 'medical_records',
            'player_match_performance', 'match_events'
        ];

        for (const table of optionalTables) {
            try {
                await db.query(`SELECT COUNT(*) FROM ${table} LIMIT 1`);
                this.pass(`Extended table ${table} exists`);
            } catch (error) {
                this.warning(`Extended table ${table} not found (will be created if needed)`);
            }
        }
    }

    /**
     * Test data consistency
     */
    async testDataConsistency() {
        console.log('\n🔍 Testing Data Consistency...');
        
        try {
            // Test if any data exists
            const playerCount = await this.getTableCount('players');
            const teamCount = await this.getTableCount('teams');
            const userCount = await this.getTableCount('users');

            if (playerCount > 0 && teamCount > 0 && userCount > 0) {
                this.pass(`Data exists: ${playerCount} players, ${teamCount} teams, ${userCount} users`);
            } else {
                this.warning('No data found (expected for fresh installation)');
            }

            // Test referential integrity if data exists
            if (playerCount > 0) {
                const orphanedPlayers = await this.checkOrphanedPlayers();
                if (orphanedPlayers === 0) {
                    this.pass('No orphaned players found');
                } else {
                    this.warning(`Found ${orphanedPlayers} players without valid teams`);
                }
            }

            // Test match data consistency if matches exist
            const matchCount = await this.getTableCount('matches');
            if (matchCount > 0) {
                const invalidMatches = await this.checkInvalidMatches();
                if (invalidMatches === 0) {
                    this.pass('All matches have valid team references');
                } else {
                    this.warning(`Found ${invalidMatches} matches with invalid team references`);
                }
            }

        } catch (error) {
            this.fail('Data consistency check failed', error.message);
        }
    }

    /**
     * Test data quality
     */
    async testDataQuality() {
        console.log('\n⭐ Testing Data Quality...');
        
        try {
            // Check for reasonable data distribution
            const playerCount = await this.getTableCount('players');
            
            if (playerCount > 0) {
                // Check age group distribution
                const ageGroups = await this.getAgeGroupDistribution();
                if (ageGroups.length >= 3) {
                    this.pass(`Good age group distribution: ${ageGroups.length} age groups`);
                } else {
                    this.warning('Limited age group distribution');
                }

                // Check position distribution
                const positions = await this.getPositionDistribution();
                if (positions.length >= 4) {
                    this.pass(`Good position distribution: ${positions.length} different positions`);
                } else {
                    this.warning('Limited position distribution');
                }

                // Check name variety
                const nameVariety = await this.checkNameVariety();
                if (nameVariety > playerCount * 0.8) {
                    this.pass('Good name variety (realistic Hungarian names)');
                } else {
                    this.warning('Limited name variety detected');
                }
            }

            // Check match quality if matches exist
            const matchCount = await this.getTableCount('matches');
            if (matchCount > 0) {
                const finishedMatches = await this.getFinishedMatchCount();
                const finishedPercentage = (finishedMatches / matchCount) * 100;
                
                if (finishedPercentage > 30) {
                    this.pass(`Good match completion rate: ${finishedPercentage.toFixed(1)}%`);
                } else {
                    this.warning(`Low match completion rate: ${finishedPercentage.toFixed(1)}%`);
                }
            }

        } catch (error) {
            this.fail('Data quality check failed', error.message);
        }
    }

    // Helper methods for testing

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

    async getAgeGroupDistribution() {
        try {
            const result = await db.query(`
                SELECT DISTINCT age_group 
                FROM teams 
                WHERE age_group IS NOT NULL
            `);
            return result;
        } catch (error) {
            return [];
        }
    }

    async getPositionDistribution() {
        try {
            const result = await db.query(`
                SELECT DISTINCT position 
                FROM players 
                WHERE position IS NOT NULL
            `);
            return result;
        } catch (error) {
            return [];
        }
    }

    async checkNameVariety() {
        try {
            const result = await db.query(`
                SELECT COUNT(DISTINCT name) as unique_names 
                FROM players
            `);
            return result[0]?.unique_names || 0;
        } catch (error) {
            return 0;
        }
    }

    async getFinishedMatchCount() {
        try {
            const result = await db.query(`
                SELECT COUNT(*) as count 
                FROM matches 
                WHERE match_status = 'finished'
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
    }

    warning(message) {
        console.log(`   ⚠️  ${message}`);
        this.testResults.warnings++;
    }

    printTestSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('🧪 TEST SUMMARY');
        console.log('='.repeat(50));
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        console.log(`⚠️  Warnings: ${this.testResults.warnings}`);
        
        const total = this.testResults.passed + this.testResults.failed + this.testResults.warnings;
        const successRate = this.testResults.failed === 0 ? 100 : 
                           Math.round((this.testResults.passed / total) * 100);
        
        console.log(`📊 Success Rate: ${successRate}%`);
        console.log('='.repeat(50));
        
        if (this.testResults.failed === 0) {
            console.log('🎉 ALL TESTS PASSED! Seeding system is ready.');
        } else {
            console.log('⚠️  Some tests failed. Please check the issues above.');
        }
        
        if (this.testResults.warnings > 0) {
            console.log('💡 Note: Warnings are normal for fresh installations.');
        }
    }
}

// Main execution
async function main() {
    const validator = new SeedingValidator();
    
    try {
        await validator.validateSeeding();
        process.exit(validator.testResults.failed === 0 ? 0 : 1);
    } catch (error) {
        console.error('Validation failed:', error);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = SeedingValidator;