const bcrypt = require('bcryptjs');
const db = require('./connection');

async function seedAdminUser() {
    try {
        // Check if admin user already exists
        const existingAdmin = await db.query(
            'SELECT id FROM users WHERE role = "admin" LIMIT 1'
        );

        if (existingAdmin.length > 0) {
            console.log('✅ Admin user already exists, skipping seed');
            return;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Insert admin user
        await db.run(
            `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                'admin@lionfa.com',
                hashedPassword,
                'System',
                'Administrator',
                'admin',
                true,
                new Date().toISOString(),
                new Date().toISOString()
            ]
        );

        console.log('✅ Admin user created successfully');
        console.log('   Username: admin');
        console.log('   Email: admin@lionfa.com');
        console.log('   Password: admin123');
        console.log('   Role: admin');

    } catch (error) {
        console.error('❌ Error seeding admin user:', error);
        throw error;
    }
}

module.exports = { seedAdminUser };