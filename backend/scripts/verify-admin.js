const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./src/database/academy.db');

console.log('🔑 ADMIN PASSWORD VERIFICATION');
console.log('='.repeat(40));

db.get('SELECT username, password_hash FROM users WHERE username = ?', ['admin'], (err, user) => {
  if (err) {
    console.log('❌ Database error:', err.message);
    db.close();
    return;
  }
  
  if (user) {
    console.log('✅ Admin user found');
    
    // Test both possible passwords
    const isValid1 = bcrypt.compareSync('admin123', user.password_hash);
    const isValid2 = bcrypt.compareSync('password123', user.password_hash);
    
    console.log('🔑 admin123:', isValid1 ? '✅ VALID' : '❌ Invalid');
    console.log('🔑 password123:', isValid2 ? '✅ VALID' : '❌ Invalid');
    
    if (!isValid1 && !isValid2) {
      console.log('🛠️ Updating admin password to admin123...');
      const newHash = bcrypt.hashSync('admin123', 10);
      db.run('UPDATE users SET password_hash = ? WHERE username = ?', [newHash, 'admin'], (err) => {
        console.log(err ? '❌ Failed to update' : '✅ Password updated to admin123');
        db.close();
      });
    } else {
      console.log('✅ Admin password is valid');
      db.close();
    }
  } else {
    console.log('❌ Admin user not found!');
    db.close();
  }
});