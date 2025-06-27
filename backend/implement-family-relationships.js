/**
 * Implement Family Relationships System
 * Creates parent-child relationships for family access control
 */

const db = require('./src/database/connection');

class FamilyRelationshipsImplementer {
    constructor() {
        this.updates = [];
    }

    async implementFamilySystem() {
        console.log('👨‍👩‍👧‍👦 IMPLEMENTING FAMILY RELATIONSHIPS SYSTEM');
        console.log('='.repeat(60));

        try {
            // 1. Create parent-child relationships table
            await this.createParentChildTable();
            
            // 2. Create family notifications table
            await this.createFamilyNotificationsTable();
            
            // 3. Add family privacy settings table
            await this.createFamilyPrivacyTable();
            
            // 4. Create parent activity log table
            await this.createParentActivityTable();
            
            // 5. Add indexes for performance
            await this.addFamilyIndexes();
            
            // 6. Migrate existing parent-child relationships
            await this.migrateExistingRelationships();
            
            console.log('\n✅ Family relationships system implemented successfully!');
            console.log(`📊 Applied ${this.updates.length} updates`);
            
        } catch (error) {
            console.error('❌ Family system implementation failed:', error);
            throw error;
        }
    }

    async createParentChildTable() {
        console.log('\n👥 Creating parent-child relationships table...');
        
        const parentChildSQL = `
            CREATE TABLE IF NOT EXISTS parent_child_relationships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                parent_id INTEGER NOT NULL,
                child_id INTEGER NOT NULL,
                relationship_type TEXT DEFAULT 'parent',
                custody_type TEXT DEFAULT 'full',
                primary_contact BOOLEAN DEFAULT 0,
                emergency_contact BOOLEAN DEFAULT 1,
                can_pickup BOOLEAN DEFAULT 1,
                can_view_medical BOOLEAN DEFAULT 1,
                can_view_performance BOOLEAN DEFAULT 1,
                can_receive_notifications BOOLEAN DEFAULT 1,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER,
                active BOOLEAN DEFAULT 1,
                FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (child_id) REFERENCES players(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users(id),
                UNIQUE(parent_id, child_id)
            )
        `;

        try {
            await db.run(parentChildSQL);
            this.updates.push('Created parent_child_relationships table');
            console.log('   ✅ Parent-child relationships table created');
        } catch (error) {
            if (error.message.includes('table parent_child_relationships already exists')) {
                console.log('   ⚠️  Parent-child relationships table already exists');
            } else {
                throw error;
            }
        }
    }

    async createFamilyNotificationsTable() {
        console.log('\n📧 Creating family notifications table...');
        
        const notificationsSQL = `
            CREATE TABLE IF NOT EXISTS family_notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                parent_id INTEGER NOT NULL,
                child_id INTEGER NOT NULL,
                notification_type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                priority TEXT DEFAULT 'normal',
                read_status BOOLEAN DEFAULT 0,
                action_required BOOLEAN DEFAULT 0,
                related_table TEXT,
                related_id INTEGER,
                scheduled_for DATETIME,
                sent_at DATETIME,
                read_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (child_id) REFERENCES players(id) ON DELETE CASCADE
            )
        `;

        try {
            await db.run(notificationsSQL);
            this.updates.push('Created family_notifications table');
            console.log('   ✅ Family notifications table created');
        } catch (error) {
            if (error.message.includes('table family_notifications already exists')) {
                console.log('   ⚠️  Family notifications table already exists');
            } else {
                throw error;
            }
        }
    }

    async createFamilyPrivacyTable() {
        console.log('\n🔒 Creating family privacy settings table...');
        
        const privacySQL = `
            CREATE TABLE IF NOT EXISTS family_privacy_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                parent_id INTEGER NOT NULL,
                child_id INTEGER NOT NULL,
                share_performance_stats BOOLEAN DEFAULT 1,
                share_medical_info BOOLEAN DEFAULT 1,
                share_development_plans BOOLEAN DEFAULT 1,
                share_training_attendance BOOLEAN DEFAULT 1,
                share_match_participation BOOLEAN DEFAULT 1,
                share_injury_reports BOOLEAN DEFAULT 1,
                share_photos BOOLEAN DEFAULT 1,
                share_contact_info BOOLEAN DEFAULT 0,
                allow_coach_contact BOOLEAN DEFAULT 1,
                allow_team_communications BOOLEAN DEFAULT 1,
                data_retention_period INTEGER DEFAULT 2555, -- 7 years in days
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_by INTEGER,
                FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (child_id) REFERENCES players(id) ON DELETE CASCADE,
                FOREIGN KEY (updated_by) REFERENCES users(id),
                UNIQUE(parent_id, child_id)
            )
        `;

        try {
            await db.run(privacySQL);
            this.updates.push('Created family_privacy_settings table');
            console.log('   ✅ Family privacy settings table created');
        } catch (error) {
            if (error.message.includes('table family_privacy_settings already exists')) {
                console.log('   ⚠️  Family privacy settings table already exists');
            } else {
                throw error;
            }
        }
    }

    async createParentActivityTable() {
        console.log('\n📊 Creating parent activity log table...');
        
        const activitySQL = `
            CREATE TABLE IF NOT EXISTS parent_activity_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                parent_id INTEGER NOT NULL,
                child_id INTEGER,
                activity_type TEXT NOT NULL,
                activity_description TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                session_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (child_id) REFERENCES players(id) ON DELETE SET NULL
            )
        `;

        try {
            await db.run(activitySQL);
            this.updates.push('Created parent_activity_log table');
            console.log('   ✅ Parent activity log table created');
        } catch (error) {
            if (error.message.includes('table parent_activity_log already exists')) {
                console.log('   ⚠️  Parent activity log table already exists');
            } else {
                throw error;
            }
        }
    }

    async addFamilyIndexes() {
        console.log('\n📊 Adding family system indexes...');
        
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_parent_child_parent ON parent_child_relationships(parent_id)',
            'CREATE INDEX IF NOT EXISTS idx_parent_child_child ON parent_child_relationships(child_id)',
            'CREATE INDEX IF NOT EXISTS idx_parent_child_active ON parent_child_relationships(active)',
            'CREATE INDEX IF NOT EXISTS idx_parent_child_primary ON parent_child_relationships(primary_contact)',
            'CREATE INDEX IF NOT EXISTS idx_family_notifications_parent ON family_notifications(parent_id)',
            'CREATE INDEX IF NOT EXISTS idx_family_notifications_child ON family_notifications(child_id)',
            'CREATE INDEX IF NOT EXISTS idx_family_notifications_read ON family_notifications(read_status)',
            'CREATE INDEX IF NOT EXISTS idx_family_notifications_type ON family_notifications(notification_type)',
            'CREATE INDEX IF NOT EXISTS idx_family_privacy_parent ON family_privacy_settings(parent_id)',
            'CREATE INDEX IF NOT EXISTS idx_family_privacy_child ON family_privacy_settings(child_id)',
            'CREATE INDEX IF NOT EXISTS idx_parent_activity_parent ON parent_activity_log(parent_id)',
            'CREATE INDEX IF NOT EXISTS idx_parent_activity_child ON parent_activity_log(child_id)',
            'CREATE INDEX IF NOT EXISTS idx_parent_activity_type ON parent_activity_log(activity_type)'
        ];

        for (const indexSQL of indexes) {
            try {
                await db.run(indexSQL);
                const indexName = indexSQL.match(/idx_\w+/)[0];
                this.updates.push(`Created index ${indexName}`);
                console.log(`   ✅ Created index ${indexName}`);
            } catch (error) {
                console.log(`   ❌ Failed to create index: ${error.message}`);
            }
        }
    }

    async migrateExistingRelationships() {
        console.log('\n🔄 Migrating existing parent-child relationships...');
        
        try {
            // Find parents who have player_id set (old system)
            const existingParents = await db.query(`
                SELECT u.id as parent_id, u.player_id as child_id, u.full_name as parent_name, p.name as child_name
                FROM users u 
                LEFT JOIN players p ON u.player_id = p.id
                WHERE u.role = 'parent' AND u.player_id IS NOT NULL
            `);
            
            console.log(`   Found ${existingParents.length} existing parent-child relationships to migrate`);
            
            let migrated = 0;
            for (const relation of existingParents) {
                try {
                    // Check if relationship already exists
                    const existing = await db.query(`
                        SELECT id FROM parent_child_relationships 
                        WHERE parent_id = ? AND child_id = ?
                    `, [relation.parent_id, relation.child_id]);
                    
                    if (existing.length === 0) {
                        // Create new relationship
                        await db.run(`
                            INSERT INTO parent_child_relationships (
                                parent_id, child_id, relationship_type, primary_contact,
                                emergency_contact, can_pickup, can_view_medical, 
                                can_view_performance, can_receive_notifications
                            ) VALUES (?, ?, 'parent', 1, 1, 1, 1, 1, 1)
                        `, [relation.parent_id, relation.child_id]);
                        
                        // Create default privacy settings
                        await db.run(`
                            INSERT INTO family_privacy_settings (
                                parent_id, child_id, share_performance_stats,
                                share_medical_info, share_development_plans,
                                share_training_attendance, share_match_participation,
                                share_injury_reports, allow_coach_contact
                            ) VALUES (?, ?, 1, 1, 1, 1, 1, 1, 1)
                        `, [relation.parent_id, relation.child_id]);
                        
                        migrated++;
                        console.log(`   ✅ Migrated: ${relation.parent_name} -> ${relation.child_name}`);
                    }
                } catch (error) {
                    console.log(`   ⚠️  Failed to migrate ${relation.parent_name}: ${error.message}`);
                }
            }
            
            this.updates.push(`Migrated ${migrated} parent-child relationships`);
            console.log(`   ✅ Successfully migrated ${migrated} relationships`);
            
        } catch (error) {
            console.log('   ⚠️  Migration failed:', error.message);
        }
    }

    async validateFamilySystem() {
        console.log('\n🔍 Validating family relationships system...');
        
        try {
            // Test basic functionality
            const relationships = await db.query('SELECT COUNT(*) as count FROM parent_child_relationships');
            console.log(`   ✅ Parent-child relationships: ${relationships[0].count}`);
            
            const privacySettings = await db.query('SELECT COUNT(*) as count FROM family_privacy_settings');
            console.log(`   ✅ Privacy settings: ${privacySettings[0].count}`);
            
            // Test relationship queries
            const parentChildren = await db.query(`
                SELECT p.full_name as parent_name, pl.name as child_name, pcr.relationship_type
                FROM parent_child_relationships pcr
                JOIN users p ON pcr.parent_id = p.id
                JOIN players pl ON pcr.child_id = pl.id
                WHERE pcr.active = 1
                LIMIT 5
            `);
            
            if (parentChildren.length > 0) {
                console.log('   ✅ Sample relationships:');
                parentChildren.forEach(rel => {
                    console.log(`     ${rel.parent_name} -> ${rel.child_name} (${rel.relationship_type})`);
                });
            }
            
            return true;
            
        } catch (error) {
            console.log('   ❌ Validation failed:', error.message);
            return false;
        }
    }
}

// Main execution
async function main() {
    const implementer = new FamilyRelationshipsImplementer();
    
    try {
        await implementer.implementFamilySystem();
        
        const isValid = await implementer.validateFamilySystem();
        
        if (isValid) {
            console.log('\n🎉 Family relationships system successfully implemented and validated!');
        } else {
            console.log('\n⚠️  System implemented but validation failed');
        }
        
    } catch (error) {
        console.error('Family system implementation failed:', error);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = FamilyRelationshipsImplementer;