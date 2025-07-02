const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const smartSeed = async () => {
  console.log('🌱 Smart Seeding - Only Missing Data');
  console.log('='.repeat(50));
  
  const dbPath = path.join(__dirname, '..', 'src', 'database', 'academy.db');
  const db = new sqlite3.Database(dbPath);
  
  // Check what exists first
  const checkExists = (table) => {
    return new Promise((resolve) => {
      db.get(`SELECT COUNT(*) as count FROM ${table}`, (err, result) => {
        resolve(err ? 0 : result.count);
      });
    });
  };
  
  const matchesCount = await checkExists('matches');
  const trainingsCount = await checkExists('trainings');
  
  console.log(`📊 Current matches: ${matchesCount}`);
  console.log(`📊 Current trainings: ${trainingsCount}`);
  
  // Only seed matches if empty
  if (matchesCount === 0) {
    console.log('🏆 Adding sample matches...');
    
    const matches = [
      `INSERT INTO matches (home_team_id, away_team, date, time, home_score, away_score, status) VALUES 
       (1, 'Városi U8 csapat', '2024-06-15 10:00', '10:00', 3, 2, 'befejezett'),
       (2, 'Sportclub U10', '2024-06-20 11:00', '11:00', 1, 1, 'befejezett'),
       (3, 'Akadémia U12', '2024-06-25 12:00', '12:00', 4, 0, 'befejezett'),
       (1, 'Külső U8', '2024-07-01 10:00', '10:00', NULL, NULL, 'tervezett'),
       (2, 'Városi U10', '2024-07-05 11:00', '11:00', NULL, NULL, 'tervezett'),
       (3, 'Sportklub U12', '2024-07-10 12:00', '12:00', NULL, NULL, 'tervezett')`
    ];
    
    db.run(matches[0], (err) => {
      if (err) {
        console.log('❌ Matches seeding failed:', err.message);
      } else {
        console.log('✅ Matches seeded successfully');
      }
    });
  } else {
    console.log('✅ Matches already exist - skipping');
  }
  
  // Only seed trainings if empty
  if (trainingsCount === 0) {
    console.log('🏃 Adding sample trainings...');
    
    const trainings = [
      `INSERT INTO trainings (team_id, date, time, duration, location, type, training_plan) VALUES 
       (1, '2024-06-28', '16:00', 60, 'Pálya A', 'Technika', 'Alapok, labdakezelés'),
       (2, '2024-06-28', '17:15', 75, 'Pálya B', 'Taktika', 'Passzolás, pozíciójáték'),
       (3, '2024-06-29', '16:00', 90, 'Pálya A', 'Védelem', 'Taktika, védelem'),
       (1, '2024-07-01', '16:00', 60, 'Pálya A', 'Támadás', 'Lövések, befejezés'),
       (2, '2024-07-02', '17:15', 75, 'Pálya B', 'Kondíció', 'Fizikai felkészítés'),
       (3, '2024-07-03', '16:00', 90, 'Pálya A', 'Mérkőzés-felkészítés', 'Mérkőzés felkészítés')`
    ];
    
    db.run(trainings[0], (err) => {
      if (err) {
        console.log('❌ Trainings seeding failed:', err.message);
      } else {
        console.log('✅ Trainings seeded successfully');
      }
    });
  } else {
    console.log('✅ Trainings already exist - skipping');
  }
  
  setTimeout(() => {
    db.close();
    console.log('\n🎯 Smart seeding completed!');
    console.log('♻️ Restart your backend server to see new data');
  }, 1000);
};

smartSeed().catch(console.error);