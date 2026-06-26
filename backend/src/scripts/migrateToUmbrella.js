/**
 * Migration: Wrap all standalone projects in umbrella projects.
 *
 * For each project where parentProject is null and projectType is not 'umbrella':
 * 1. Create an umbrella project with the same name
 * 2. Set the existing project's parentProject to the new umbrella
 * 3. Copy the existing project's members to the umbrella
 *
 * Run: node src/scripts/migrateToUmbrella.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const Project = require('../models/Project');

async function migrate() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/gresio';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const standalone = await Project.find({
    parentProject: null,
    projectType: { $ne: 'umbrella' },
    isActive: true,
  }).lean();

  console.log(`Found ${standalone.length} standalone projects to migrate`);

  let created = 0;
  let skipped = 0;

  for (const proj of standalone) {
    try {
      // Check if already has an umbrella (safety)
      const existingUmbrella = await Project.findOne({
        name: proj.name,
        projectType: 'umbrella',
        domain: proj.domain,
        isActive: true,
      }).lean();

      if (existingUmbrella) {
        // Just link to existing umbrella
        await Project.updateOne({ _id: proj._id }, { parentProject: existingUmbrella._id });
        console.log(`  Linked "${proj.name}" to existing umbrella`);
        created++;
        continue;
      }

      // Create umbrella
      const umbrella = await Project.create({
        name: proj.name,
        domain: proj.domain,
        description: proj.description || `Umbrella for ${proj.name}`,
        projectType: 'umbrella',
        phase: 'discovery',
        status: proj.status || 'on_track',
        progress: proj.progress || 0,
        deadline: proj.deadline,
        client: proj.client,
        members: proj.members || [],
        settings: { ...proj.settings, enableAutoPhaseProgression: true },
      });

      // Link the existing project as a sub-project
      await Project.updateOne({ _id: proj._id }, { parentProject: umbrella._id });
      console.log(`  Created umbrella "${umbrella.name}" → wrapped "${proj.name}" (${proj._id})`);
      created++;
    } catch (err) {
      console.error(`  Failed on "${proj.name}": ${err.message}`);
      skipped++;
    }
  }

  console.log(`\nDone. ${created} projects wrapped, ${skipped} skipped.`);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
