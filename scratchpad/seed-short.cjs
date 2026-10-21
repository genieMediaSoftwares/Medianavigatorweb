const mongoose = require('/Users/kkdigitalgrowth/Downloads/Medianavigatorweb/backend/node_modules/mongoose');
(async()=>{
const uri=process.env.MONGODB_URI;
await mongoose.connect(uri);
const user=await mongoose.connection.db.collection('users').findOne({email:'test@user.in'});
const acc=await mongoose.connection.db.collection('connectedaccounts').findOne({userId:user._id,platform:'youtube'});
if(!acc){ console.error('no account'); process.exit(1);}
const vid='dQw4w9WgXcQ';
const normalized={id:`youtube_${vid}`,legacyId:`youtube_${vid}`,platform:'youtube',contentType:'video',title:'Long test video',caption:'Test caption',publishedAt:new Date().toISOString(),views:100,reach:0,likes:10,comments:2,shares:0,engagementRate:12,unavailableMetrics:['reach','shares','saves'],durationSeconds:212,providerMediaId:vid,thumbnailUrl:`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,mediaUrl:null,videoUrl:null,syncedAt:new Date().toISOString()};
await mongoose.connection.db.collection('contentitems').updateOne(
{userId:user._id,legacyId:`youtube_${vid}`},
{$set:{userId:user._id,connectedAccountId:acc._id,platform:'youtube',providerMediaId:vid,legacyId:`youtube_${vid}`,contentType:'video',contentTypeBasis:'provider',title:'Long test video',caption:'Test caption',thumbnailUrl:`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,publishedAt:new Date(),views:100,reach:0,likes:10,comments:2,shares:0,engagementRate:12,unavailableMetrics:['reach','shares','saves'],durationSeconds:212,normalized,syncedAt:new Date(),updatedAt:new Date()},$setOnInsert:{createdAt:new Date()}},
{upsert:true});
console.log('ok'); await mongoose.disconnect();
})().catch(e=>{console.error(e);process.exit(1);});
