const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, 'academy.db');
        this.db = null;
        this.init();
    }

    init() {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
            } else {
                console.log('Connected to SQLite database');
                this.createTables();
            }
        });
    }

    createTables() {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        this.db.exec(schema, (err) => {
            if (err) {
                console.error('Error creating tables:', err.message);
            } else {
                console.log('Database tables created successfully');
                this.applySchemaExtensions();
            }
        });
    }

    applySchemaExtensions() {
        const extensionsPath = path.join(__dirname, 'schema-extensions.sql');
        
        if (fs.existsSync(extensionsPath)) {
            const extensions = fs.readFileSync(extensionsPath, 'utf8');
            
            this.db.exec(extensions, (err) => {
                if (err) {
                    console.error('Error applying schema extensions:', err.message);
                } else {
                    console.log('Schema extensions applied successfully');
                }
            });
        }
    }

    query(sql, params = []) {
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

    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Database connection closed');
                    resolve();
                }
            });
        });
    }
}

const dbInstance = new Database();

module.exports = {
    query: (sql, params) => dbInstance.query(sql, params),
    run: (sql, params) => dbInstance.run(sql, params),
    close: () => dbInstance.close(),
    getConnection: () => ({
        all: (sql, params) => dbInstance.query(sql, params),
        get: (sql, params) => dbInstance.query(sql, params).then(rows => rows[0]),
        run: (sql, params) => dbInstance.run(sql, params)
    })
};