const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/gresio').then(async () => {
  const db = mongoose.connection.db;
  const d = 'admin@gresio.com';
  const colls = ['projects','tasks','sprints','testcases','bugs','worklogs','notifications','activities'];
  let t=0;
  for (const c of colls) {
    const r = await db.collection(c).updateMany(
      { '$or': [ { domain: '' }, { domain: null }, { domain: { '$exists': false } } ] },
      { '$set': { domain: d } }
    );
    if (r.modifiedCount > 0) { console.log(c+': '+r.modifiedCount+' updated'); t+=r.modifiedCount; }
  }
  console.log('Total: '+t);
  mongoose.disconnect();
}).catch(e => { console.error(e); process.exit(1); });
