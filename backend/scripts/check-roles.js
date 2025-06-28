const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./src/database/academy.db');

console.log('🔍 AVAILABLE LOGIN ACCOUNTS:');
console.log('='.repeat(40));

db.all('SELECT username, role, full_name FROM users ORDER BY role, username', (err, users) => {
  if (err) {
    console.log('❌ Error:', err);
    return;
  }
  
  const roleGroups = {};
  users.forEach(user => {
    if (!roleGroups[user.role]) roleGroups[user.role] = [];
    roleGroups[user.role].push(user);
  });
  
  Object.keys(roleGroups).forEach(role => {
    console.log(`\n👤 ${role.toUpperCase()} ACCOUNTS (${roleGroups[role].length}):`);
    roleGroups[role].slice(0, 5).forEach(user => {
      console.log(`   📝 ${user.username} / password123 - ${user.full_name}`);
    });
    if (roleGroups[role].length > 5) {
      console.log(`   ... és még ${roleGroups[role].length - 5} account`);
    }
  });
  
  console.log(`\n🎯 TOTAL ACCOUNTS: ${users.length}`);
  
  // Check for missing roles
  const availableRoles = Object.keys(roleGroups);
  const expectedRoles = ['admin', 'coach', 'parent', 'player'];
  const missingRoles = expectedRoles.filter(role => !availableRoles.includes(role));
  
  if (missingRoles.length > 0) {
    console.log(`\n❌ MISSING ROLES: ${missingRoles.join(', ')}`);
  } else {
    console.log('\n✅ ALL EXPECTED ROLES PRESENT');
  }
  
  db.close();
});