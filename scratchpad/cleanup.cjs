const mongoose = require('/Users/kkdigitalgrowth/Downloads/Medianavigatorweb/backend/node_modules/mongoose');
(async()=>{
const uri=process.env.MONGODB_URI;
await mongoose.connect(uri);
const db=mongoose.connection.db;
const user=await db.collection('users').findOne({email:'test@user.in'});
if(!user){ console.log('no user'); process.exit(0); }
await db.collection('contentanalyses').deleteMany({userId:user._id, mediaId:'youtube_dQw4w9WgXcQ'});
await db.collection('contentitems').deleteMany({userId:user._id, legacyId:'youtube_dQw4w9WgXcQ'});
const deletedAccounts=await db.collection('connectedaccounts').deleteMany({userId:user._id});
console.log('deleted accounts', deletedAccounts.deletedCount);
await mongoose.disconnect();
})().catch(e=>{console.error(e);process.exit(1);});
