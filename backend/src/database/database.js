const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.db = null;
        this.isConnected = false;
    }

    async connect(dbPath = null) {
        try {
            const defaultPath = path.join(__dirname, '../../data/lfa_academy.db');
            const databasePath = dbPath || defaultPath;
            
            // Ensure directory exists
            const dir = path.dirname(databasePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            this.db = new sqlite3.Database(databasePath, (err) => {
                if (err) {
                    console.error('Error opening database:', err.message);
                    throw err;
                }
                console.log('Connected to SQLite database.');
            });

            // Enable foreign keys
            await this.run('PRAGMA foreign_keys = ON');
            
            this.isConnected = true;
            return this.db;
        } catch (error) {
            console.error('Database connection failed:', error);
            throw error;
        }
    }

    async initializeSchema() {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            // Split schema into individual statements, handling multi-line SQL and triggers
            let cleanSchema = schema.replace(/--.*$/gm, ''); // Remove comments
            
            // Handle triggers and other multi-line statements by looking for END; pattern
            const statements = [];
            let currentStatement = '';
            let inTrigger = false;
            
            cleanSchema.split('\n').forEach(line => {
                line = line.trim();
                if (!line) return;
                
                currentStatement += line + ' ';
                
                if (line.toUpperCase().includes('CREATE TRIGGER')) {
                    inTrigger = true;
                } else if (line.toUpperCase() === 'END;' && inTrigger) {
                    statements.push(currentStatement.trim());
                    currentStatement = '';
                    inTrigger = false;
                } else if (line.endsWith(';') && !inTrigger) {
                    statements.push(currentStatement.trim());
                    currentStatement = '';
                }
            });
            
            // Add any remaining statement
            if (currentStatement.trim()) {
                statements.push(currentStatement.trim());
            }
            
            // Filter out empty statements
            const validStatements = statements.filter(stmt => stmt.length > 10);

            console.log(`Executing ${validStatements.length} schema statements...`);

            for (const statement of validStatements) {
                try {
                    await this.run(statement);
                } catch (error) {
                    // Ignore "table already exists" errors
                    if (!error.message.includes('already exists')) {
                        console.error('Error executing statement:', statement);
                        throw error;
                    }
                }
            }

            console.log('Database schema initialized successfully.');
        } catch (error) {
            console.error('Schema initialization failed:', error);
            throw error;
        }
    }

    // Promisify database operations
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Transaction support
    async beginTransaction() {
        await this.run('BEGIN TRANSACTION');
    }

    async commit() {
        await this.run('COMMIT');
    }

    async rollback() {
        await this.run('ROLLBACK');
    }

    // Execute multiple operations in a transaction
    async transaction(operations) {
        try {
            await this.beginTransaction();
            
            const results = [];
            for (const operation of operations) {
                const result = await operation();
                results.push(result);
            }
            
            await this.commit();
            return results;
        } catch (error) {
            await this.rollback();
            throw error;
        }
    }

    // Health check
    async healthCheck() {
        try {
            const result = await this.get('SELECT 1 as health');
            return result && result.health === 1;
        } catch (error) {
            return false;
        }
    }

    // Get database statistics
    async getStats() {
        try {
            const tables = await this.all(`
                SELECT name, sql 
                FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
                ORDER BY name
            `);

            const stats = {
                tables: tables.length,
                tableDetails: {}
            };

            for (const table of tables) {
                const count = await this.get(`SELECT COUNT(*) as count FROM ${table.name}`);
                stats.tableDetails[table.name] = {
                    records: count.count
                };
            }

            return stats;
        } catch (error) {
            console.error('Error getting database stats:', error);
            return null;
        }
    }

    // Backup database
    async backup(backupPath) {
        return new Promise((resolve, reject) => {
            const backup = this.db.backup(backupPath);
            
            backup.step(-1, (err) => {
                if (err) {
                    reject(err);
                } else {
                    backup.finish((err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                }
            });
        });
    }

    // Close database connection
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('Database connection closed.');
                        this.isConnected = false;
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    // Seed data for testing
    async seedTestData() {
        try {
            console.log('Seeding test data...');

            // Create test users
            const users = [
                {
                    id: 'admin001',
                    email: 'admin@lfa.com',
                    password_hash: '$2b$10$test_hash_admin',
                    first_name: 'Admin',
                    last_name: 'User',
                    phone: '+36301234567',
                    role: 'admin',
                    is_active: 1,
                    email_verified: 1
                },
                {
                    id: 'coach001',
                    email: 'coach@lfa.com',
                    password_hash: '$2b$10$test_hash_coach',
                    first_name: 'John',
                    last_name: 'Smith',
                    phone: '+36301234568',
                    role: 'coach',
                    is_active: 1,
                    email_verified: 1
                },
                {
                    id: 'player001',
                    email: 'player@lfa.com',
                    password_hash: '$2b$10$test_hash_player',
                    first_name: 'Alex',
                    last_name: 'Johnson',
                    phone: '+36301234569',
                    role: 'player',
                    is_active: 1,
                    email_verified: 1
                },
                {
                    id: 'parent001',
                    email: 'parent@lfa.com',
                    password_hash: '$2b$10$test_hash_parent',
                    first_name: 'Sarah',
                    last_name: 'Johnson',
                    phone: '+36301234570',
                    role: 'parent',
                    is_active: 1,
                    email_verified: 1
                }
            ];

            // Insert users
            for (const user of users) {
                await this.run(`
                    INSERT OR IGNORE INTO users 
                    (id, email, password_hash, first_name, last_name, phone, role, is_active, email_verified)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [user.id, user.email, user.password_hash, user.first_name, user.last_name, 
                    user.phone, user.role, user.is_active, user.email_verified]);
            }

            // Create test team
            await this.run(`
                INSERT OR IGNORE INTO teams 
                (id, name, age_group, division, season, max_players, description, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, ['team001', 'U14 Lions', 'U14', 'Division 1', '2024-25', 25, 'Premier youth team', 1]);

            // Create test coach
            await this.run(`
                INSERT OR IGNORE INTO coaches 
                (id, user_id, team_id, certification_level, experience_years, specialization, is_head_coach, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, ['coach001_profile', 'coach001', 'team001', 'UEFA B', 5, 'Youth Development', 1, 1]);

            // Create test player
            await this.run(`
                INSERT OR IGNORE INTO players 
                (id, user_id, team_id, jersey_number, position, date_of_birth, height, weight, preferred_foot, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, ['player001_profile', 'player001', 'team001', 10, 'Midfielder', '2010-05-15', 165.5, 55.0, 'right', 1]);

            // Create family relationship
            await this.run(`
                INSERT OR IGNORE INTO family_relationships 
                (id, parent_id, player_id, relationship_type, is_primary_contact, can_pickup, emergency_contact)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, ['rel001', 'parent001', 'player001_profile', 'mother', 1, 1, 1]);

            console.log('Test data seeded successfully.');
        } catch (error) {
            console.error('Error seeding test data:', error);
            throw error;
        }
    }

    // Validate schema integrity
    async validateSchema() {
        try {
            console.log('Validating schema integrity...');

            // Test foreign key constraints
            const tests = [
                // Test user to player relationship
                {
                    name: 'User-Player relationship',
                    query: `
                        SELECT COUNT(*) as count 
                        FROM players p 
                        LEFT JOIN users u ON p.user_id = u.id 
                        WHERE u.id IS NULL
                    `
                },
                // Test team to player relationship
                {
                    name: 'Team-Player relationship',
                    query: `
                        SELECT COUNT(*) as count 
                        FROM players p 
                        LEFT JOIN teams t ON p.team_id = t.id 
                        WHERE p.team_id IS NOT NULL AND t.id IS NULL
                    `
                },
                // Test unique constraints
                {
                    name: 'User email uniqueness',
                    query: `
                        SELECT email, COUNT(*) as count 
                        FROM users 
                        GROUP BY email 
                        HAVING COUNT(*) > 1
                    `
                }
            ];

            const results = [];
            for (const test of tests) {
                const result = await this.get(test.query);
                results.push({
                    test: test.name,
                    passed: result.count === 0,
                    count: result.count
                });
            }

            console.log('Schema validation results:', results);
            return results;
        } catch (error) {
            console.error('Schema validation error:', error);
            throw error;
        }
    }
}

// Create singleton instance
const database = new Database();

module.exports = database;