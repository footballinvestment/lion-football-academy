const fs = require('fs');
const path = require('path');
const db = require('./connection');

/**
 * Database Migration System
 * Handles schema updates and version management
 */
class Migration {
    constructor() {
        this.migrationsPath = __dirname;
        this.migrationTable = 'schema_migrations';
        this.init();
    }

    /**
     * Initialize migration system
     */
    async init() {
        try {
            await this.createMigrationTable();
        } catch (error) {
            console.error('Failed to initialize migration system:', error.message);
        }
    }

    /**
     * Create migration tracking table
     */
    async createMigrationTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS ${this.migrationTable} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version VARCHAR(255) NOT NULL UNIQUE,
                filename VARCHAR(255) NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                checksum VARCHAR(64),
                execution_time_ms INTEGER,
                success BOOLEAN DEFAULT 1
            )
        `;
        
        await db.run(query);
    }

    /**
     * Get executed migrations
     * @returns {Promise<Array>} List of executed migrations
     */
    async getExecutedMigrations() {
        try {
            const query = `
                SELECT version, filename, executed_at, success 
                FROM ${this.migrationTable} 
                ORDER BY executed_at ASC
            `;
            return await db.query(query);
        } catch (error) {
            console.error('Failed to get executed migrations:', error.message);
            return [];
        }
    }

    /**
     * Check if migration has been executed
     * @param {string} version - Migration version
     * @returns {Promise<boolean>} True if executed
     */
    async isMigrationExecuted(version) {
        try {
            const query = `
                SELECT COUNT(*) as count 
                FROM ${this.migrationTable} 
                WHERE version = ? AND success = 1
            `;
            const result = await db.query(query, [version]);
            return result[0].count > 0;
        } catch (error) {
            console.error('Failed to check migration status:', error.message);
            return false;
        }
    }

    /**
     * Record migration execution
     * @param {string} version - Migration version
     * @param {string} filename - Migration filename
     * @param {number} executionTime - Execution time in milliseconds
     * @param {boolean} success - Whether migration succeeded
     * @param {string} checksum - Optional file checksum
     */
    async recordMigration(version, filename, executionTime, success = true, checksum = null) {
        try {
            const query = `
                INSERT INTO ${this.migrationTable} 
                (version, filename, execution_time_ms, success, checksum)
                VALUES (?, ?, ?, ?, ?)
            `;
            await db.run(query, [version, filename, executionTime, success, checksum]);
        } catch (error) {
            console.error('Failed to record migration:', error.message);
        }
    }

    /**
     * Execute SQL file
     * @param {string} filePath - Path to SQL file
     * @returns {Promise<void>}
     */
    async executeSqlFile(filePath) {
        try {
            const sql = fs.readFileSync(filePath, 'utf8');
            
            // Split by semicolon and execute each statement
            const statements = sql
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
            
            for (const statement of statements) {
                if (statement.trim()) {
                    await db.run(statement);
                }
            }
        } catch (error) {
            throw new Error(`Failed to execute SQL file ${filePath}: ${error.message}`);
        }
    }

    /**
     * Run specific migration
     * @param {string} version - Migration version
     * @param {string} filename - Migration filename
     */
    async runMigration(version, filename) {
        const startTime = Date.now();
        let success = false;
        
        try {
            console.log(`Running migration ${version}: ${filename}`);
            
            const filePath = path.join(this.migrationsPath, filename);
            
            if (!fs.existsSync(filePath)) {
                throw new Error(`Migration file not found: ${filePath}`);
            }
            
            await this.executeSqlFile(filePath);
            
            success = true;
            const executionTime = Date.now() - startTime;
            
            await this.recordMigration(version, filename, executionTime, success);
            
            console.log(`✓ Migration ${version} completed in ${executionTime}ms`);
        } catch (error) {
            const executionTime = Date.now() - startTime;
            await this.recordMigration(version, filename, executionTime, false);
            
            console.error(`✗ Migration ${version} failed:`, error.message);
            throw error;
        }
    }

    /**
     * Run all pending migrations
     * @returns {Promise<void>}
     */
    async runPendingMigrations() {
        try {
            const migrations = [
                { version: '001', filename: 'schema.sql' },
                { version: '002', filename: 'schema-extensions.sql' }
            ];
            
            for (const migration of migrations) {
                const isExecuted = await this.isMigrationExecuted(migration.version);
                
                if (!isExecuted) {
                    await this.runMigration(migration.version, migration.filename);
                } else {
                    console.log(`⏭ Migration ${migration.version} already executed`);
                }
            }
            
            console.log('All migrations completed successfully');
        } catch (error) {
            console.error('Migration failed:', error.message);
            throw error;
        }
    }

    /**
     * Create new migration file
     * @param {string} name - Migration name
     * @param {string} content - Migration SQL content
     * @returns {Promise<string>} Created migration filename
     */
    async createMigration(name, content) {
        try {
            const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
            const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
            const filePath = path.join(this.migrationsPath, filename);
            
            const migrationContent = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- Description: ${name}

${content}
`;
            
            fs.writeFileSync(filePath, migrationContent);
            
            console.log(`Migration created: ${filename}`);
            return filename;
        } catch (error) {
            console.error('Failed to create migration:', error.message);
            throw error;
        }
    }

    /**
     * Rollback last migration (basic implementation)
     * @returns {Promise<void>}
     */
    async rollbackLastMigration() {
        try {
            const query = `
                SELECT version, filename 
                FROM ${this.migrationTable} 
                WHERE success = 1 
                ORDER BY executed_at DESC 
                LIMIT 1
            `;
            
            const lastMigration = await db.query(query);
            
            if (lastMigration.length === 0) {
                console.log('No migrations to rollback');
                return;
            }
            
            const migration = lastMigration[0];
            console.log(`Rolling back migration ${migration.version}: ${migration.filename}`);
            
            // Mark migration as rolled back
            const updateQuery = `
                UPDATE ${this.migrationTable} 
                SET success = 0 
                WHERE version = ?
            `;
            
            await db.run(updateQuery, [migration.version]);
            
            console.log(`⏪ Migration ${migration.version} rolled back`);
            console.log('Note: You may need to manually restore the database state');
        } catch (error) {
            console.error('Rollback failed:', error.message);
            throw error;
        }
    }

    /**
     * Get migration status
     * @returns {Promise<Object>} Migration status summary
     */
    async getStatus() {
        try {
            const executed = await this.getExecutedMigrations();
            const successful = executed.filter(m => m.success);
            const failed = executed.filter(m => !m.success);
            
            return {
                total_executed: executed.length,
                successful: successful.length,
                failed: failed.length,
                last_migration: successful.length > 0 ? successful[successful.length - 1] : null,
                failed_migrations: failed
            };
        } catch (error) {
            console.error('Failed to get migration status:', error.message);
            return null;
        }
    }

    /**
     * Apply schema extensions
     * @returns {Promise<void>}
     */
    async applySchemaExtensions() {
        try {
            console.log('Applying schema extensions...');
            
            const extensionsPath = path.join(this.migrationsPath, 'schema-extensions.sql');
            
            if (fs.existsSync(extensionsPath)) {
                const isExecuted = await this.isMigrationExecuted('002');
                
                if (!isExecuted) {
                    await this.runMigration('002', 'schema-extensions.sql');
                } else {
                    console.log('Schema extensions already applied');
                }
            } else {
                console.log('No schema extensions file found');
            }
        } catch (error) {
            console.error('Failed to apply schema extensions:', error.message);
            throw error;
        }
    }

    /**
     * Backup database before migration
     * @returns {Promise<string>} Backup file path
     */
    async createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
            const backupPath = path.join(this.migrationsPath, `backup_${timestamp}.db`);
            
            // This is a simple implementation - in production you'd want proper SQLite backup
            console.log(`Creating backup: ${backupPath}`);
            
            // For SQLite, you could use .backup command or copy the file
            const originalDbPath = path.join(this.migrationsPath, 'academy.db');
            
            if (fs.existsSync(originalDbPath)) {
                fs.copyFileSync(originalDbPath, backupPath);
                console.log(`✓ Backup created: ${backupPath}`);
            } else {
                console.log('No database file found to backup');
            }
            
            return backupPath;
        } catch (error) {
            console.error('Failed to create backup:', error.message);
            throw error;
        }
    }

    /**
     * Verify database integrity
     * @returns {Promise<boolean>} True if database is healthy
     */
    async verifyIntegrity() {
        try {
            console.log('Verifying database integrity...');
            
            // Check basic table existence
            const tables = [
                'users', 'teams', 'players', 'trainings', 'attendance',
                'matches', 'player_match_performance', 'match_events',
                'development_plans', 'skills_assessments', 'injuries'
            ];
            
            for (const table of tables) {
                const query = `SELECT COUNT(*) as count FROM ${table}`;
                try {
                    await db.query(query);
                    console.log(`✓ Table ${table} is accessible`);
                } catch (error) {
                    console.error(`✗ Table ${table} is not accessible:`, error.message);
                    return false;
                }
            }
            
            console.log('✓ Database integrity check passed');
            return true;
        } catch (error) {
            console.error('Database integrity check failed:', error.message);
            return false;
        }
    }
}

// Export singleton instance
const migrationInstance = new Migration();

module.exports = {
    Migration,
    runMigrations: () => migrationInstance.runPendingMigrations(),
    createMigration: (name, content) => migrationInstance.createMigration(name, content),
    rollback: () => migrationInstance.rollbackLastMigration(),
    status: () => migrationInstance.getStatus(),
    applyExtensions: () => migrationInstance.applySchemaExtensions(),
    backup: () => migrationInstance.createBackup(),
    verify: () => migrationInstance.verifyIntegrity()
};