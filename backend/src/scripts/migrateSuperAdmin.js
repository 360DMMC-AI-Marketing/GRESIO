const mongoose = require('mongoose');

module.exports = async function migrateSuperAdmin() {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    const collections = await db.listCollections({ name: 'superusers' }).toArray();
    if (collections.length === 0) {
      console.log('Migration: No SuperUser collection found — nothing to migrate.');
      return;
    }

    const SuperUserModel = mongoose.model('SuperUser', new mongoose.Schema({}, { strict: false }), 'superusers');
    const superUsers = await SuperUserModel.find({}).lean();

    if (superUsers.length === 0) {
      console.log('Migration: SuperUser collection is empty — dropping.');
      await db.dropCollection('superusers');
      return;
    }

    const User = require('../models/User');
    let migrated = 0;

    for (const su of superUsers) {
      const existing = await User.findOne({ email: su.email });
      if (!existing) {
        await User.create({
          name: su.name,
          email: su.email,
          password: su.password,
          role: 'super_admin',
          domain: su.domain || '360dmmc.com',
          isActive: su.isActive !== undefined ? su.isActive : true,
          status: su.status || 'active',
          createdAt: su.createdAt || new Date(),
          updatedAt: su.updatedAt || new Date(),
        });
        migrated++;
      } else {
        existing.role = 'super_admin';
        await existing.save();
        migrated++;
      }
    }

    await db.dropCollection('superusers');
    console.log(`Migration: Migrated ${migrated} super admin(s) from SuperUser → User. Old collection dropped.`);
  } catch (e) {
    console.error('Migration error (non-fatal):', e.message);
  }
};
