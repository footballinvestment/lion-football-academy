const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./src/database/academy.db');

console.log('🏃 ADDING PLAYER ROLE SUPPORT');
console.log('='.repeat(40));

// First, we need to update the users table to allow 'player' role
// SQLite doesn't support ALTER TABLE to modify CHECK constraints, so we need to recreate the table

const updateSchema = () => {
  console.log('📝 Updating users table schema to support player role...');
  
  // Create a new temporary table with updated schema
  db.run(`CREATE TABLE users_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'parent', 'player')),
    team_id INTEGER,
    player_id INTEGER,
    active BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (player_id) REFERENCES players(id)
  )`, (err) => {
    if (err) {
      console.log('❌ Error creating new table:', err.message);
      return;
    }
    
    // Copy data from old table to new table
    db.run(`INSERT INTO users_new SELECT * FROM users`, (err) => {
      if (err) {
        console.log('❌ Error copying data:', err.message);
        return;
      }
      
      // Drop old table and rename new table
      db.run(`DROP TABLE users`, (err) => {
        if (err) {
          console.log('❌ Error dropping old table:', err.message);
          return;
        }
        
        db.run(`ALTER TABLE users_new RENAME TO users`, (err) => {
          if (err) {
            console.log('❌ Error renaming table:', err.message);
            return;
          }
          
          console.log('✅ Schema updated successfully!');
          createPlayerAccounts();
        });
      });
    });
  });
};

const createPlayerAccounts = () => {
  console.log('\n🏃 Creating PLAYER accounts...');
  
  // Get some players to create accounts for
  db.all('SELECT id, name FROM players LIMIT 6', (err, players) => {
    if (err) {
      console.log('❌ Error fetching players:', err.message);
      db.close();
      return;
    }
    
    if (players && players.length > 0) {
      let completed = 0;
      
      players.forEach((player, index) => {
        const username = `player_${player.name.toLowerCase().replace(/\s+/g, '_').replace(/[áéíóöőúüű]/g, char => {
          const map = {'á':'a','é':'e','í':'i','ó':'o','ö':'o','ő':'o','ú':'u','ü':'u','ű':'u'};
          return map[char] || char;
        })}`;
        const email = `${username}@lfa.com`;
        const hashedPassword = bcrypt.hashSync('player123', 10);
        
        db.run('INSERT INTO users (username, email, password_hash, full_name, role, player_id) VALUES (?, ?, ?, ?, ?, ?)', 
          [username, email, hashedPassword, player.name, 'player', player.id], 
          (err) => {
            completed++;
            if (!err) {
              console.log(`✅ Created: ${username} / player123 - ${player.name}`);
            } else {
              console.log(`❌ Failed to create ${username}: ${err.message}`);
            }
            
            if (completed === players.length) {
              console.log('\n🎯 Player accounts creation completed!');
              verifyAccounts();
            }
          }
        );
      });
    } else {
      console.log('❌ No players found in database');
      db.close();
    }
  });
};

const verifyAccounts = () => {
  console.log('\n🔍 Verifying new accounts...');
  
  db.all('SELECT username, role, full_name FROM users WHERE role = "player"', (err, players) => {
    if (err) {
      console.log('❌ Error verifying accounts:', err.message);
    } else {
      console.log(`\n👤 PLAYER ACCOUNTS (${players.length}):`);
      players.forEach(player => {
        console.log(`   📝 ${player.username} / player123 - ${player.full_name}`);
      });
    }
    
    db.close();
    console.log('\n✅ Player role support added successfully!');
  });
};

// Start the process
updateSchema();