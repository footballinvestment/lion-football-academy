#!/usr/bin/env node

/**
 * Production Database Migration and Seeding Script
 * Lion Football Academy - Deployment Migration Tool
 * 
 * This script handles database migrations and seeding for production deployment
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class DeploymentMigrator {
  constructor() {
    this.dbPath = process.env.DATABASE_URL || path.join(__dirname, '../src/database/academy.db');
    this.migrationsPath = path.join(__dirname, '../src/database/migrations');
    this.seedsPath = path.join(__dirname, '../src/database/seeds');
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      // For PostgreSQL in production, we'd use pg instead of sqlite3
      if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')) {
        console.log('🐘 Detected PostgreSQL database for production deployment');
        this.setupPostgreSQL();
        resolve();
      } else {
        console.log('📁 Using SQLite database for deployment');
        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            console.error('❌ Error opening database:', err.message);
            reject(err);
          } else {
            console.log('✅ Connected to SQLite database');
            resolve();
          }
        });
      }
    });
  }

  async setupPostgreSQL() {
    // For production PostgreSQL deployment
    console.log('🔧 Setting up PostgreSQL connection...');
    
    try {
      const { Client } = require('pg');
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      await client.connect();
      this.db = client;
      console.log('✅ Connected to PostgreSQL database');
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error.message);
      throw error;
    }
  }

  async runMigrations() {
    console.log('🔄 Running database migrations...');
    
    try {
      // Get list of migration files
      const migrationFiles = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      console.log(`📂 Found ${migrationFiles.length} migration files`);

      for (const migrationFile of migrationFiles) {
        await this.runMigration(migrationFile);
      }

      console.log('✅ All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }

  async runMigration(filename) {
    const filePath = path.join(this.migrationsPath, filename);
    const migrationSQL = fs.readFileSync(filePath, 'utf8');
    
    console.log(`⚡ Running migration: ${filename}`);
    
    return new Promise((resolve, reject) => {
      if (this.db.run) {
        // SQLite
        this.db.exec(migrationSQL, (err) => {
          if (err) {
            console.error(`❌ Migration ${filename} failed:`, err.message);
            reject(err);
          } else {
            console.log(`✅ Migration ${filename} completed`);
            resolve();
          }
        });
      } else {
        // PostgreSQL
        this.db.query(migrationSQL)
          .then(() => {
            console.log(`✅ Migration ${filename} completed`);
            resolve();
          })
          .catch((err) => {
            console.error(`❌ Migration ${filename} failed:`, err.message);
            reject(err);
          });
      }
    });
  }

  async runSeeds() {
    console.log('🌱 Running database seeds...');
    
    try {
      // Get list of seed files
      const seedFiles = fs.readdirSync(this.seedsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      console.log(`📂 Found ${seedFiles.length} seed files`);

      for (const seedFile of seedFiles) {
        await this.runSeed(seedFile);
      }

      console.log('✅ All seeds completed successfully');
    } catch (error) {
      console.error('❌ Seeding failed:', error.message);
      throw error;
    }
  }

  async runSeed(filename) {
    const filePath = path.join(this.seedsPath, filename);
    const seedSQL = fs.readFileSync(filePath, 'utf8');
    
    console.log(`🌱 Running seed: ${filename}`);
    
    return new Promise((resolve, reject) => {
      if (this.db.run) {
        // SQLite
        this.db.exec(seedSQL, (err) => {
          if (err) {
            console.error(`❌ Seed ${filename} failed:`, err.message);
            reject(err);
          } else {
            console.log(`✅ Seed ${filename} completed`);
            resolve();
          }
        });
      } else {
        // PostgreSQL
        this.db.query(seedSQL)
          .then(() => {
            console.log(`✅ Seed ${filename} completed`);
            resolve();
          })
          .catch((err) => {
            console.error(`❌ Seed ${filename} failed:`, err.message);
            reject(err);
          });
      }
    });
  }

  async verifyDatabase() {
    console.log('🔍 Verifying database structure...');
    
    const verificationQueries = [
      "SELECT COUNT(*) as user_count FROM users",
      "SELECT COUNT(*) as team_count FROM teams", 
      "SELECT COUNT(*) as training_count FROM trainings",
      "SELECT version FROM schema_migrations ORDER BY applied_at DESC LIMIT 1"
    ];

    try {
      for (const query of verificationQueries) {
        await this.runVerificationQuery(query);
      }
      
      console.log('✅ Database verification completed successfully');
    } catch (error) {
      console.error('❌ Database verification failed:', error.message);
      throw error;
    }
  }

  async runVerificationQuery(query) {
    return new Promise((resolve, reject) => {
      if (this.db.get) {
        // SQLite
        this.db.get(query, (err, row) => {
          if (err) {
            reject(err);
          } else {
            console.log(`📊 ${query}: ${JSON.stringify(row)}`);
            resolve(row);
          }
        });
      } else {
        // PostgreSQL
        this.db.query(query)
          .then((result) => {
            console.log(`📊 ${query}: ${JSON.stringify(result.rows[0])}`);
            resolve(result.rows[0]);
          })
          .catch(reject);
      }
    });
  }

  async createDefaultAdmin() {
    console.log('👤 Creating default admin user...');
    
    const bcrypt = require('bcryptjs');
    const adminPassword = process.env.ADMIN_PASSWORD || 'LionAdmin2025!';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    const adminQuery = `
      INSERT OR IGNORE INTO users (
        username, email, password_hash, first_name, last_name,
        user_type, is_active, email_verified, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const adminData = [
      'admin',
      process.env.ADMIN_EMAIL || 'admin@lionfootballacademy.com',
      hashedPassword,
      'System',
      'Administrator', 
      'admin',
      1,
      1,
      new Date().toISOString()
    ];

    return new Promise((resolve, reject) => {
      if (this.db.run) {
        // SQLite
        this.db.run(adminQuery, adminData, function(err) {
          if (err) {
            reject(err);
          } else {
            console.log('✅ Default admin created/verified');
            resolve();
          }
        });
      } else {
        // PostgreSQL - adapt query for PostgreSQL syntax
        const pgQuery = `
          INSERT INTO users (
            username, email, password_hash, first_name, last_name,
            user_type, is_active, email_verified, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (username) DO NOTHING
        `;
        
        this.db.query(pgQuery, adminData)
          .then(() => {
            console.log('✅ Default admin created/verified');
            resolve();
          })
          .catch(reject);
      }
    });
  }

  async close() {
    if (this.db) {
      if (this.db.close) {
        // SQLite
        this.db.close((err) => {
          if (err) {
            console.error('❌ Error closing database:', err.message);
          } else {
            console.log('✅ Database connection closed');
          }
        });
      } else {
        // PostgreSQL
        await this.db.end();
        console.log('✅ Database connection closed');
      }
    }
  }

  async deploy() {
    try {
      console.log('🚀 Starting Lion Football Academy database deployment...');
      console.log('='.repeat(60));
      
      await this.init();
      await this.runMigrations();
      await this.runSeeds();
      await this.createDefaultAdmin();
      await this.verifyDatabase();
      
      console.log('='.repeat(60));
      console.log('🎉 Database deployment completed successfully!');
      console.log('');
      console.log('📋 Next Steps:');
      console.log('1. Start the application server');
      console.log('2. Login with admin credentials');
      console.log('3. Change the default admin password');
      console.log('4. Create additional users and teams');
      console.log('');
      console.log('🔐 Default Admin Credentials:');
      console.log(`Username: admin`);
      console.log(`Email: ${process.env.ADMIN_EMAIL || 'admin@lionfootballacademy.com'}`);
      console.log(`Password: ${process.env.ADMIN_PASSWORD || 'LionAdmin2025!'}`);
      console.log('');
      console.log('⚠️  IMPORTANT: Change the default password immediately after first login!');
      
    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      process.exit(1);
    } finally {
      await this.close();
    }
  }
}

// Run deployment if this file is executed directly
if (require.main === module) {
  const migrator = new DeploymentMigrator();
  migrator.deploy().catch(error => {
    console.error('💥 Fatal deployment error:', error);
    process.exit(1);
  });
}

module.exports = DeploymentMigrator;