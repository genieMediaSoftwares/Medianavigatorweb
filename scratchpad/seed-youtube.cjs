const mongoose = require('/Users/kkdigitalgrowth/Downloads/Medianavigatorweb/backend/node_modules/mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await mongoose.connection.db.collection('users').findOne({ email: 'test@user.in' });
  const ca = await mongoose.connection.db.collection('connectedaccounts').findOne({userId:user._id, platform:'youtube'});
  if(!ca){
    const r = await mongoose.connection.db.collection('connectedaccounts').insertOne({
      userId: user._id, platform: 'youtube', providerAccountId: 'UC_test', handle: 'TestChannel', displayName: 'Test Channel',
      active: true, status: 'sync_complete', credentialsEnc: null, createdAt: new Date(), updatedAt: new Date()
    });
    console.log('account created', r.insertedId);
  }
  const account = await mongoose.connection.db.collection('connectedaccounts').findOne({userId:user._id, platform:'youtube'});
  const vid = 'dQw4w9WgXcQ';
  const normalized = { id: `youtube_${vid}`, legacyId: `youtube_${vid}`, platform: 'youtube', contentType: 'video', title: 'Seed test video', caption: 'Test caption', publishedAt: new Date().toISOString(), views:100, reach:0, likes:10, comments:2, shares:0, engagementRate:12, unavailableMetrics:['reach','shares','saves'], durationSeconds:212, providerMediaId:vid, thumbnailUrl:`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`, mediaUrl:null, videoUrl:null, syncedAt:new Date().toISOString() };
  const inserted = await mongoose.connection.db.collection('contentitems').updateOne(
    { userId: user._id, legacyId: `youtube_${vid}`},
    { $set: { userId:user._id, connectedAccountId:account._id, platform:'youtube', providerMediaId:vid, legacyId:`youtube_${vid}`, contentType:'video', contentTypeBasis:'provider', title:'Seed test video', caption:'Test caption', thumbnailUrl:`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`, publishedAt:new Date(), views:100,reach:0,likes:10,comments:2,shares:0,engagementRate:12,unavailableMetrics:['reach','shares','saves'],durationSeconds:212,normalized,syncedAt:new Date(),updatedAt:new Date()}, $setOnInsert:{createdAt:new Date()}}, {upsert:true});
  console.log('seeded result', inserted);
  await mongoose.disconnect();
})().catch(e=>{console.error(e);process.exit(1);});
