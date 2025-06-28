const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const auditDatabase = async () => {
  console.log('🔍 Lion Football Academy - Database Audit');
  console.log('='.repeat(50));
  
  const dbPath = path.join(__dirname, '..', 'src', 'database', 'academy.db');
  const db = new sqlite3.Database(dbPath);
  
  const checkTable = (tableName) => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT COUNT(*) as count FROM ${tableName}`, (err, result) => {
        if (err) {
          console.log(`❌ ${tableName}: Table not found or error`);
          resolve(0);
        } else {
          const count = result[0].count;
          console.log(`📊 ${tableName}: ${count} records`);
          resolve(count);
        }
      });
    });
  };
  
  const getSampleData = (tableName, limit = 3) => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM ${tableName} LIMIT ${limit}`, (err, rows) => {
        if (err) {
          resolve([]);
        } else {
          resolve(rows);
        }
      });
    });
  };
  
  // Check all main tables
  const tables = ['users', 'players', 'teams', 'matches', 'trainings', 'medical_records', 'development_plans'];
  const counts = {};
  
  console.log('\n📋 CURRENT DATABASE STATUS:');
  console.log('-'.repeat(30));
  
  for (const table of tables) {
    counts[table] = await checkTable(table);
  }
  
  console.log('\n🔍 DETAILED ANALYSIS:');
  console.log('-'.repeat(30));
  
  // Users analysis
  if (counts.users > 0) {
    const users = await getSampleData('users');
    console.log(`👥 Users (${counts.users}):`);
    users.forEach(u => console.log(`   - ${u.username} (${u.role})`));
  }
  
  // Players analysis  
  if (counts.players > 0) {
    const players = await getSampleData('players');
    console.log(`⚽ Players (${counts.players}):`);
    players.forEach(p => console.log(`   - ${p.name} (${p.position})`));
  }
  
  // Teams analysis
  if (counts.teams > 0) {
    const teams = await getSampleData('teams');
    console.log(`🏆 Teams (${counts.teams}):`);
    teams.forEach(t => console.log(`   - ${t.name} (${t.age_group})`));
  }
  
  // Matches analysis
  if (counts.matches > 0) {
    const matches = await getSampleData('matches');
    console.log(`⚽ Matches (${counts.matches}):`);
    matches.forEach(m => console.log(`   - ${m.date}: ${m.home_team_id} vs ${m.away_team}`));
  } else {
    console.log(`❌ Matches (0): NO MATCHES FOUND - NEEDS SEEDING`);
  }
  
  // Trainings analysis
  if (counts.trainings > 0) {
    const trainings = await getSampleData('trainings');
    console.log(`🏃 Trainings (${counts.trainings}):`);
    trainings.forEach(t => console.log(`   - ${t.date} ${t.time}: ${t.type} (${t.training_plan})`));
  } else {
    console.log(`❌ Trainings (0): NO TRAININGS FOUND - NEEDS SEEDING`);
  }
  
  console.log('\n🎯 SEEDING RECOMMENDATIONS:');
  console.log('-'.repeat(30));
  
  const needsSeeding = [];
  
  if (counts.matches === 0) needsSeeding.push('matches');
  if (counts.trainings === 0) needsSeeding.push('trainings');
  if (counts.medical_records === 0) needsSeeding.push('medical_records');
  if (counts.development_plans === 0) needsSeeding.push('development_plans');
  
  if (needsSeeding.length > 0) {
    console.log(`🌱 SEED NEEDED: ${needsSeeding.join(', ')}`);
    console.log(`✅ KEEP EXISTING: users, players, teams`);
  } else {
    console.log('✅ ALL TABLES POPULATED - NO SEEDING NEEDED');
  }
  
  db.close();
  return needsSeeding;
};

auditDatabase().catch(console.error);