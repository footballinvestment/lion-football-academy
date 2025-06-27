// API Testing Suite for Football Academy Backend
// Usage: node test-api.js

const BASE_URL = 'http://localhost:5000/api';

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

class ApiTester {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async test(name, testFn) {
        try {
            process.stdout.write(`${colors.blue}Testing: ${name}${colors.reset} ... `);
            await testFn();
            console.log(`${colors.green}✅ PASSED${colors.reset}`);
            this.results.passed++;
            this.results.tests.push({ name, status: 'PASSED' });
        } catch (error) {
            console.log(`${colors.red}❌ FAILED${colors.reset}`);
            console.log(`${colors.red}   Error: ${error.message}${colors.reset}`);
            this.results.failed++;
            this.results.tests.push({ name, status: 'FAILED', error: error.message });
        }
    }

    async request(method, endpoint, data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url);
        const responseData = await response.json().catch(() => null);
        
        return {
            status: response.status,
            data: responseData,
            ok: response.ok
        };
    }

    expect(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`${message}: Expected ${expected}, got ${actual}`);
        }
    }

    expectArrayLength(array, expectedLength, message) {
        if (!Array.isArray(array)) {
            throw new Error(`${message}: Expected array, got ${typeof array}`);
        }
        if (array.length !== expectedLength) {
            throw new Error(`${message}: Expected array length ${expectedLength}, got ${array.length}`);
        }
    }

    expectProperty(object, property, message) {
        if (!object || !object.hasOwnProperty(property)) {
            throw new Error(`${message}: Expected property '${property}' to exist`);
        }
    }

    async runTests() {
        console.log(`${colors.blue}🚀 Starting API Tests for Football Academy${colors.reset}\n`);

        // Health Check
        await this.test('Health Check', async () => {
            const response = await this.request('GET', '/health');
            this.expect(response.status, 200, 'Health check status');
            this.expectProperty(response.data, 'status', 'Health response');
        });

        // Teams Tests
        await this.test('GET /teams - List all teams', async () => {
            const response = await this.request('GET', '/teams');
            this.expect(response.status, 200, 'Teams list status');
            this.expectProperty(response, 'data', 'Teams response data');
        });

        // Players Tests
        await this.test('GET /players - List all players', async () => {
            const response = await this.request('GET', '/players');
            this.expect(response.status, 200, 'Players list status');
            this.expectProperty(response, 'data', 'Players response data');
        });

        await this.test('POST /players - Create player (invalid data)', async () => {
            const invalidPlayer = { name: '', birth_date: '' };
            const response = await this.request('POST', '/players', invalidPlayer);
            this.expect(response.status, 400, 'Invalid player creation status');
            this.expectProperty(response.data, 'errors', 'Validation errors');
        });

        await this.test('POST /players - Create player (valid data)', async () => {
            const validPlayer = {
                name: 'Test Játékos API',
                birth_date: '2012-05-15',
                position: 'középpályás',
                parent_name: 'Test Szülő',
                parent_email: 'test@example.com'
            };
            const response = await this.request('POST', '/players', validPlayer);
            this.expect(response.status, 201, 'Valid player creation status');
            this.expectProperty(response.data, 'id', 'Player creation response');
            this.playerId = response.data.id; // Store for later tests
        });

        await this.test('GET /players/:id - Get specific player', async () => {
            if (!this.playerId) throw new Error('No player ID available from previous test');
            const response = await this.request('GET', `/players/${this.playerId}`);
            this.expect(response.status, 200, 'Get player status');
            this.expectProperty(response.data, 'name', 'Player response data');
        });

        await this.test('PUT /players/:id - Update player', async () => {
            if (!this.playerId) throw new Error('No player ID available from previous test');
            const updateData = {
                name: 'Test Játékos Frissítve',
                birth_date: '2012-05-15',
                position: 'támadó'
            };
            const response = await this.request('PUT', `/players/${this.playerId}`, updateData);
            this.expect(response.status, 200, 'Update player status');
            this.expectProperty(response.data, 'name', 'Updated player response');
        });

        // Trainings Tests
        await this.test('GET /trainings - List all trainings', async () => {
            const response = await this.request('GET', '/trainings');
            this.expect(response.status, 200, 'Trainings list status');
            this.expectProperty(response, 'data', 'Trainings response data');
        });

        await this.test('GET /trainings/upcoming - List upcoming trainings', async () => {
            const response = await this.request('GET', '/trainings/upcoming');
            this.expect(response.status, 200, 'Upcoming trainings status');
            this.expectProperty(response, 'data', 'Upcoming trainings response');
        });

        // Announcements Tests
        await this.test('GET /announcements - List all announcements', async () => {
            const response = await this.request('GET', '/announcements');
            this.expect(response.status, 200, 'Announcements list status');
            this.expectProperty(response, 'data', 'Announcements response data');
        });

        // Statistics Tests
        await this.test('GET /statistics/dashboard - Dashboard stats', async () => {
            const response = await this.request('GET', '/statistics/dashboard');
            this.expect(response.status, 200, 'Dashboard stats status');
            this.expectProperty(response.data, 'total_players', 'Dashboard stats data');
        });

        await this.test('GET /statistics/player-attendance - Player attendance stats', async () => {
            const response = await this.request('GET', '/statistics/player-attendance');
            this.expect(response.status, 200, 'Player attendance stats status');
            this.expectProperty(response, 'data', 'Player attendance response');
        });

        await this.test('GET /statistics/team-performance - Team performance stats', async () => {
            const response = await this.request('GET', '/statistics/team-performance');
            this.expect(response.status, 200, 'Team performance stats status');
            this.expectProperty(response, 'data', 'Team performance response');
        });

        // Validation Tests
        await this.test('POST /players - Age validation (too young)', async () => {
            const tooYoung = {
                name: 'Túl Fiatal',
                birth_date: '2022-01-01' // 2-3 years old
            };
            const response = await this.request('POST', '/players', tooYoung);
            this.expect(response.status, 400, 'Too young validation status');
            this.expectProperty(response.data, 'errors', 'Age validation errors');
        });

        await this.test('POST /players - Age validation (too old)', async () => {
            const tooOld = {
                name: 'Túl Öreg',
                birth_date: '2000-01-01' // 24 years old
            };
            const response = await this.request('POST', '/players', tooOld);
            this.expect(response.status, 400, 'Too old validation status');
            this.expectProperty(response.data, 'errors', 'Age validation errors');
        });

        await this.test('POST /players - Email validation', async () => {
            const invalidEmail = {
                name: 'Test Játékos',
                birth_date: '2012-01-01',
                parent_email: 'invalid-email'
            };
            const response = await this.request('POST', '/players', invalidEmail);
            this.expect(response.status, 400, 'Email validation status');
            this.expectProperty(response.data, 'errors', 'Email validation errors');
        });

        // Cleanup - Delete test player
        await this.test('DELETE /players/:id - Delete test player', async () => {
            if (!this.playerId) throw new Error('No player ID available for cleanup');
            const response = await this.request('DELETE', `/players/${this.playerId}`);
            this.expect(response.status, 200, 'Delete player status');
        });

        // 404 Tests
        await this.test('GET /players/99999 - Non-existent player', async () => {
            const response = await this.request('GET', '/players/99999');
            this.expect(response.status, 404, 'Non-existent player status');
        });

        await this.test('GET /nonexistent - Invalid endpoint', async () => {
            const response = await this.request('GET', '/nonexistent');
            this.expect(response.status, 404, 'Invalid endpoint status');
        });

        this.printResults();
    }

    printResults() {
        console.log('\n' + '='.repeat(50));
        console.log(`${colors.blue}📊 TEST RESULTS${colors.reset}`);
        console.log('='.repeat(50));
        
        console.log(`${colors.green}✅ Passed: ${this.results.passed}${colors.reset}`);
        console.log(`${colors.red}❌ Failed: ${this.results.failed}${colors.reset}`);
        console.log(`📋 Total: ${this.results.passed + this.results.failed}`);
        
        const successRate = Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100);
        console.log(`📈 Success Rate: ${successRate}%`);

        if (this.results.failed > 0) {
            console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
            this.results.tests
                .filter(test => test.status === 'FAILED')
                .forEach(test => {
                    console.log(`  ❌ ${test.name}: ${test.error}`);
                });
        }

        console.log('\n' + '='.repeat(50));
        
        if (successRate >= 90) {
            console.log(`${colors.green}🎉 API Tests: EXCELLENT (${successRate}%)${colors.reset}`);
        } else if (successRate >= 75) {
            console.log(`${colors.yellow}⚠️  API Tests: GOOD (${successRate}%)${colors.reset}`);
        } else {
            console.log(`${colors.red}🚨 API Tests: NEEDS ATTENTION (${successRate}%)${colors.reset}`);
        }
    }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
    console.log(`${colors.red}❌ Error: This script requires Node.js 18+ with built-in fetch support${colors.reset}`);
    console.log(`${colors.yellow}💡 Alternative: Install node-fetch package or upgrade Node.js${colors.reset}`);
    process.exit(1);
}

// Run tests
const tester = new ApiTester(BASE_URL);
tester.runTests().catch(error => {
    console.error(`${colors.red}❌ Test suite failed: ${error.message}${colors.reset}`);
    process.exit(1);
});