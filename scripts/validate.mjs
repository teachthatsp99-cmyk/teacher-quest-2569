import fs from 'node:fs';
import vm from 'node:vm';

const failures = [];
const fail = message => failures.push(message);
const normalize = value => String(value || '').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
const length = value => [...String(value || '')].length;

const dataSource = fs.readFileSync('data.js','utf8');
const citationSource = fs.readFileSync('citation-index.js','utf8');
const context = {window:{}};
vm.createContext(context);
vm.runInContext(citationSource,context,{filename:'citation-index.js'});
vm.runInContext(dataSource,context,{filename:'data.js'});
const data = context.window.GAME_DATA;
const citationIndex = context.window.TEACHER_QUEST_CITATION_INDEX || {};

if(!data) fail('GAME_DATA was not created');
if(data?.version !== '4.4.0') fail(`expected data version 4.4.0, got ${data?.version}`);
if(!Array.isArray(data?.modules) || data.modules.length !== 21) fail(`expected 21 modules, got ${data?.modules?.length}`);
if(!Array.isArray(data?.questions) || data.questions.length !== 400) fail(`expected exactly 400 questions, got ${data?.questions?.length}`);

const modules = data?.modules || [];
const questions = data?.questions || [];
const moduleIds = new Set(modules.map(module => module.id));
const moduleIcons = new Set(modules.map(module => module.icon));
const categories = new Set(['สถานการณ์','ความรู้และหลักการ','วิเคราะห์และประเมิน','ข้อมูลปัจจุบันและดิจิทัล','กฎหมายและวิชาชีพ']);
const difficulties = new Set(['ง่าย','กลาง','ยาก']);
const ids = new Set();
const stems = new Set();
const answerDistribution = [0,0,0,0];
const difficultyDistribution = {ง่าย:0,กลาง:0,ยาก:0};
const moduleDifficulty = new Map(modules.map(module => [module.id,new Set()]));
let uniqueCorrectLongest = 0;
let absoluteCueDistractors = 0;
let correctOptionLength = 0;
let distractorOptionLength = 0;
let maximumOptionLength = 0;
let longestAnswerRun = 0;
let answerRun = 0;
let previousAnswer = null;
const absoluteCue = /ทุกกรณี|เท่านั้น|เพียงอย่างเดียว|ไม่ต้อง|ทั้งหมด/;

for(const module of modules){
  if(!module.id || !module.title || !module.summary || !module.boss) fail(`module ${module.id || '(missing id)'} is incomplete`);
  if(!/^https:\/\//.test(module.official || '')) fail(`module ${module.id} has no HTTPS official source`);
}
if(moduleIcons.size !== modules.length) fail(`module fallback icons are not unique: ${moduleIcons.size}/${modules.length}`);
if(modules.some(module => module.icon === '♿')) fail('legacy wheelchair glyph must be replaced by the inclusive pixel-art icon');

for(const question of questions){
  if(ids.has(question.id)) fail(`duplicate question id ${question.id}`);
  ids.add(question.id);
  if(!moduleIds.has(question.module)) fail(`question ${question.id} has unknown module ${question.module}`);
  if(!difficulties.has(question.difficulty)) fail(`question ${question.id} has invalid difficulty ${question.difficulty}`);
  if(!categories.has(question.category)) fail(`question ${question.id} has invalid category ${question.category}`);
  if(!Array.isArray(question.options) || question.options.length !== 4) fail(`question ${question.id} does not have 4 options`);
  if(!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) fail(`question ${question.id} has invalid answer index`);
  if(!normalize(question.question)) fail(`question ${question.id} has empty text`);
  if(!normalize(question.explanation)) fail(`question ${question.id} has empty explanation`);
  if(!normalize(question.source)) fail(`question ${question.id} has no source label`);
  if(!normalize(question.sourceDocument)) fail(`question ${question.id} has no source document label`);
  if(!normalize(question.sourceLocator)) fail(`question ${question.id} has no source locator`);
  if(!/^https:\/\//.test(question.sourceUrl || '')) fail(`question ${question.id} has no HTTPS source URL`);
  if(typeof question.sourceDirect !== 'boolean') fail(`question ${question.id} has no sourceDirect flag`);
  if(!['official-current','exact-reference','page-reference','topic-reference','applied-reference'].includes(question.verificationStatus)) fail(`question ${question.id} has invalid verification status`);
  if(question.verificationStatus === 'official-current' && !question.sourceDirect) fail(`question ${question.id} claims an official direct source without a direct link`);
  if(question.verificationStatus === 'page-reference' && (!Number.isInteger(question.sourcePage) || question.sourcePage < 1 || !/^หน้า \d+ •/.test(question.sourceLocator))) fail(`question ${question.id} has an invalid page-level citation`);
  if(!['time-sensitive','law-watch','stable'].includes(question.freshnessClass)) fail(`question ${question.id} has invalid freshness class`);
  if(!['current','review-soon','review-required'].includes(question.freshnessStatus)) fail(`question ${question.id} has invalid freshness status`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(question.lastReviewedOn || '') || !/^\d{4}-\d{2}-\d{2}$/.test(question.reviewDueOn || '')) fail(`question ${question.id} has invalid review dates`);
  if(String(question.reviewDueOn) <= String(question.lastReviewedOn)) fail(`question ${question.id} review deadline must follow its review date`);

  const stem = normalize(question.question);
  if(stems.has(stem)) fail(`duplicate question stem at id ${question.id}`);
  stems.add(stem);
  const normalizedOptions = question.options.map(normalize);
  if(new Set(normalizedOptions).size !== 4) fail(`question ${question.id} contains duplicate options`);

  answerDistribution[question.answer]++;
  difficultyDistribution[question.difficulty]++;
  moduleDifficulty.get(question.module)?.add(question.difficulty);
  answerRun = question.answer === previousAnswer ? answerRun + 1 : 1;
  previousAnswer = question.answer;
  longestAnswerRun = Math.max(longestAnswerRun,answerRun);

  const optionLengths = question.options.map(length);
  correctOptionLength += optionLengths[question.answer];
  distractorOptionLength += optionLengths.reduce((sum,value) => sum + value,0) - optionLengths[question.answer];
  maximumOptionLength = Math.max(maximumOptionLength,...optionLengths);
  const maximum = Math.max(...optionLengths);
  if(optionLengths[question.answer] === maximum && optionLengths.filter(value => value === maximum).length === 1) uniqueCorrectLongest++;
  absoluteCueDistractors += question.options.filter((option,index) => index !== question.answer && absoluteCue.test(option)).length;
}

if(answerDistribution.some(count => count !== 100)) fail(`answer positions are not balanced: ${answerDistribution.join('/')}`);
if(JSON.stringify(difficultyDistribution) !== JSON.stringify({ง่าย:80,กลาง:200,ยาก:120})) fail(`difficulty distribution changed: ${JSON.stringify(difficultyDistribution)}`);
for(const [moduleId,values] of moduleDifficulty){
  if(values.size !== 3) fail(`module ${moduleId} does not cover all difficulty levels`);
  const moduleQuestionCount = questions.filter(question => question.module === moduleId).length;
  const expectedCount = moduleId === 'culture' ? 12 : moduleId === 'english' ? 8 : 20;
  if(moduleQuestionCount !== expectedCount) fail(`module ${moduleId} has ${moduleQuestionCount} questions instead of ${expectedCount}`);
}
if(longestAnswerRun > 2) fail(`answer position repeats ${longestAnswerRun} times in a row`);
if(uniqueCorrectLongest / Math.max(questions.length,1) > .25) fail(`correct answer is uniquely longest too often: ${uniqueCorrectLongest}/${questions.length}`);
if(absoluteCueDistractors > 20) fail(`too many absolute cue words remain in distractors: ${absoluteCueDistractors}`);
const averageCorrectLength = correctOptionLength / Math.max(questions.length,1);
const averageDistractorLength = distractorOptionLength / Math.max(questions.length * 3,1);
if(Math.abs(averageCorrectLength-averageDistractorLength) > 3) fail(`option lengths are imbalanced: correct ${averageCorrectLength.toFixed(2)} vs distractor ${averageDistractorLength.toFixed(2)}`);
if(maximumOptionLength > 120) fail(`an option is too verbose: ${maximumOptionLength} characters`);
for(const filler of ['เพื่อจำกัดความเสี่ยงที่อาจเกิดขึ้น','ตามขั้นตอนที่สถานศึกษากำหนดไว้','ในภาพรวมในสถานการณ์ส่วนใหญ่']){
  if(dataSource.includes(filler)) fail(`legacy filler phrase remains: ${filler}`);
}

if(data?.sources?.length !== modules.length) fail(`expected one source card per module, got ${data?.sources?.length}`);
if(data?.questionBankAudit?.sourceCoverage?.length !== modules.length) fail('question bank audit does not cover all modules');
if(data?.questionBankAudit?.uploadedDocumentCount !== 27) fail(`expected 27 uploaded documents, got ${data?.questionBankAudit?.uploadedDocumentCount}`);
if(data?.questionBankAudit?.uniqueDocumentCount !== 25) fail(`expected 25 unique uploaded documents, got ${data?.questionBankAudit?.uniqueDocumentCount}`);
if(data?.questionBankAudit?.sourceInventory?.length !== 27) fail('source inventory does not list all 27 uploaded documents');
if((data?.questionBankAudit?.verifiedCount || 0) + (data?.questionBankAudit?.referenceBackedCount || 0) !== questions.length) fail('verification counts do not cover the full bank');
if(Object.keys(citationIndex).length !== 207) fail(`expected 207 page-level citation index entries, got ${Object.keys(citationIndex).length}`);
if(data?.questionBankAudit?.pageReferenceCount !== 207) fail(`expected 207 page references, got ${data?.questionBankAudit?.pageReferenceCount}`);
if(data?.questionBankAudit?.exactReferenceCount !== 4 || data?.questionBankAudit?.appliedReferenceCount !== 8 || data?.questionBankAudit?.topicReferenceCount !== 101) fail('citation status totals changed unexpectedly');
if(data?.questionBankAudit?.pinpointReferenceCount !== 291) fail(`expected 291 pinpoint references, got ${data?.questionBankAudit?.pinpointReferenceCount}`);
if((data?.questionBankAudit?.timeSensitiveCount || 0)+(data?.questionBankAudit?.lawWatchCount || 0)+(data?.questionBankAudit?.stableCount || 0)!==questions.length) fail('freshness classes do not cover the full bank');
if(data?.questionBankAudit?.timeSensitiveCount !== 48 || data?.questionBankAudit?.lawWatchCount !== 153 || data?.questionBankAudit?.stableCount !== 199) fail('freshness class totals changed unexpectedly');
if(data?.questionBankAudit?.reviewPolicy?.['time-sensitive']?.days !== 30 || data?.questionBankAudit?.reviewPolicy?.['law-watch']?.days !== 120 || data?.questionBankAudit?.reviewPolicy?.stable?.days !== 365) fail('review cadence is incomplete');

const html = fs.readFileSync('index.html','utf8');
for(const asset of ['favicon.svg','fonts.css','styles.css','polish.css','v4.css','adventure.css','online.css','raid.css','economy.css','citations.css','content-review.css','citation-index.js','data.js','economy-core.js','content-review-core.js','online-config.js','online.js','world-core.js','adventure.js','app.js','v4.js']){
  if(!html.includes(asset)) fail(`index.html does not reference ${asset}`);
  if(!fs.existsSync(asset)) fail(`${asset} does not exist`);
}
for(const asset of ['database.rules.json','FIREBASE_ONLINE_SETUP.md','CONTENT_REVIEW.md']) if(!fs.existsSync(asset)) fail(`${asset} does not exist`);
for(const retired of ['cloud-sync.js','firebase-config.js','v4-cleanup.js','FIREBASE_SETUP.md','firestore.rules']){
  if(fs.existsSync(retired)) fail(`retired file still exists: ${retired}`);
  if(html.includes(retired)) fail(`index.html still references retired file ${retired}`);
}

const app = fs.readFileSync('app.js','utf8');
const adventure = fs.readFileSync('adventure.js','utf8');
const online = fs.readFileSync('online.js','utf8');
const economy = fs.readFileSync('economy-core.js','utf8');
const contentReview = fs.readFileSync('content-review-core.js','utf8');
const v4 = fs.readFileSync('v4.js','utf8');
for(const feature of ['startBattle','beginExam','renderReview','renderAdventure','modalFocusables','teacherquest:local-state','MODULE_PIXEL_ART','data-battle-action','ROUND_COUNTS','returnView','updateAuthGate','authGateGoogle','renderRaid','submitRaidAnswer','teacherQuestRaidDebug','RAID_EMOTES','renderShop','teacherQuestEconomyDebug','ECONOMY.consume','openAdminTestPanel','adminTestBtn','adventureChatForm','openVoiceConsent','adventureVoiceTalk','updateVoiceHud','renderContentReview','openContentReviewDraft','teacherQuestContentReviewDebug','presenceStatusText']){
  if(!app.includes(feature)) fail(`app.js is missing ${feature}`);
}
for(const feature of ['createTeacherQuestAdventure','requestAnimationFrame','data-move','data-jump','data-emote','teacherQuestAdventureDebug','collides','onStartModule','teacherquest:cloud-progress','setTapTarget','tapTarget','MAP_REGISTRY','treeOpacity','drawWorldLabels','drawMiniAvatar','drawFog','startJump','startAction','switchMap','training-grove','law-archive','future-campus','MODULE_MAPS','active-choice','setZoneMessages','drawChatBubble','revealCurrentMap','activeMap.id===ACADEMY_MAP_ID?"plaza":activeMap.id']){
  if(!adventure.includes(feature)) fail(`adventure.js is missing ${feature}`);
}
for(const feature of ['signInWithPopup','GoogleAuthProvider','visitorClaims','onDisconnect','updatePresence','POSITION_INTERVAL','MAX_ZONE_PLAYERS','avatarMarkup','saveProgress','buildProgressBundle','signin-required','attachPromise','clearCounterSubscriptions','runTransaction(profileRef','reconnect','createRaid','joinRaid','attackRaid','sendRaidEmote','RAID_MAX_PLAYERS','diagnosePermissions','raidRoomPayload','getIdTokenResult(true)','sendProximityMessage','zoneChat','cleanChatText','admins/','enableProximityVoice','disableProximityVoice','setVoiceTalking','voiceSignals','getUserMedia','RTCPeerConnection','FIREBASE_RULES_REVISION','setPresenceHealth','world-read','world-write']){
  if(!online.includes(feature)) fail(`online.js is missing ${feature}`);
}
if(online.includes('signInAnonymously')) fail('online.js must not create anonymous accounts when Google login is required');
if(!(html.indexOf('citation-index.js') < html.indexOf('data.js') && html.indexOf('data.js') < html.indexOf('economy-core.js') && html.indexOf('economy-core.js') < html.indexOf('content-review-core.js') && html.indexOf('content-review-core.js') < html.indexOf('online.js') && html.indexOf('online-config.js') < html.indexOf('online.js') && html.indexOf('online.js') < html.indexOf('world-core.js') && html.indexOf('world-core.js') < html.indexOf('adventure.js') && html.indexOf('adventure.js') < html.indexOf('app.js'))) fail('citation/economy/content-review/online/world/adventure scripts are not loaded in dependency order');
try{
  const economyContext={window:{}};
  vm.createContext(economyContext);
  vm.runInContext(economy,economyContext,{filename:'economy-core.js'});
  const core=economyContext.window.TeacherQuestEconomyCore;
  const starter=core?.defaults?.();
  const bought=core?.purchase?.(starter,100,'fifty');
  const used=core?.consume?.(bought?.economy,'fifty');
  const emote=core?.purchase?.(used?.economy,bought?.coins,'emote-cheer');
  const equipped=core?.equip?.(emote?.economy,'emote-cheer');
  if(core?.catalog?.length!==10 || starter?.inventory?.hint!==2) fail('economy starter inventory or catalog is invalid');
  if(!bought?.ok || bought.coins!==82 || used?.economy?.inventory?.fifty!==2) fail('economy purchase/consume flow is invalid');
  if(!emote?.ok || !equipped?.ok || equipped.economy.equipped.emote!=='cheer') fail('economy permanent unlock/equip flow is invalid');
}catch(error){ fail(`economy-core.js is invalid: ${error.message}`); }
try{
  const reviewContext={window:{}};
  vm.createContext(reviewContext);
  vm.runInContext(contentReview,reviewContext,{filename:'content-review-core.js'});
  const core=reviewContext.window.TeacherQuestContentReview;
  const summary=core?.summarize?.(questions,'2026-07-18');
  const currentQueue=core?.buildQueue?.(questions,{freshness:'time-sensitive'},'2026-07-18');
  const draft=core?.validateDraft?.({questionId:351,status:'confirmed-current',sourceUrl:'https://example.go.th/source',reviewedOn:'2026-07-18'});
  const pack=core?.buildUpdatePack?.({351:draft?.draft},{bankVersion:data.version,evidenceReviewedOn:data.questionBankAudit.evidenceReviewedOn});
  if(summary?.total!==400 || summary?.timeSensitive!==48 || summary?.evidenceGap!==109) fail('content review summary is invalid');
  if(currentQueue?.length!==48 || currentQueue[0]?.freshnessClass!=='time-sensitive') fail('content review priority queue is invalid');
  if(!draft?.ok || pack?.drafts?.length!==1 || pack?.containsPlayerData!==false || pack?.policy!=='human-approval-required') fail('content review draft/export flow is invalid');
  if(/api[_-]?key|private[_-]?key|client[_-]?secret/i.test(contentReview)) fail('content review client must not contain service secrets');
}catch(error){ fail(`content-review-core.js is invalid: ${error.message}`); }
try{
  const worldContext={window:{}};
  vm.createContext(worldContext);
  vm.runInContext(fs.readFileSync('world-core.js','utf8'),worldContext,{filename:'world-core.js'});
  const worldCore=worldContext.window.TeacherQuestWorldCore;
  const registry=worldCore?.createMapRegistry?.([{id:'academy-plaza',title:'โลกครูเควสต์',width:2048,height:1536,spawn:{x:1024,y:812}},{id:'training-grove',title:'ป่าฝึก',width:2048,height:1536,spawn:{x:1024,y:930}},{id:'law-archive',title:'โลกกฎหมาย',width:2048,height:1536,spawn:{x:1024,y:930}},{id:'future-campus',title:'โลกอนาคต',width:2048,height:1536,spawn:{x:1024,y:930}}]);
  const migrated=registry?.normalizePosition?.({x:1200,y:900,direction:'left'});
  if(worldCore?.version!==4 || registry?.defaultMapId!=='academy-plaza' || registry?.ids?.length!==4) fail('world core registry is not initialized at version 4 with four maps');
  if(migrated?.mapId!=='academy-plaza' || migrated?.version!==4 || migrated?.x!==1200 || migrated?.direction!=='left') fail('world core cannot migrate the legacy single-map position');
  const bounded=registry?.normalizePosition?.({mapId:'missing-map',x:-50,y:99999,direction:'invalid'});
  if(bounded?.mapId!=='academy-plaza' || bounded?.x!==40 || bounded?.y!==1504 || bounded?.direction!=='down') fail('world core does not clamp or recover invalid position data');
  const codec=registry?.exploration?.('academy-plaza');
  const explored=new Set();
  codec?.reveal?.(explored,1024,812,190);
  const encoded=codec?.encode?.(explored);
  const decoded=codec?.decode?.(encoded);
  if(!explored.size || decoded?.size!==explored.size || encoded?.length!==192) fail('world core exploration bitset cannot round-trip the fog state');
}catch(error){ fail(`world-core.js is invalid: ${error.message}`); }
try{
  const rules=JSON.parse(fs.readFileSync('database.rules.json','utf8'));
  const rulesText=JSON.stringify(rules);
  for(const path of ['profiles','admins','visitorClaims','online','progress','world','zoneChat','voiceSignals','raids']) if(!rulesText.includes(`"${path}"`)) fail(`database rules are missing ${path}`);
  if(!rulesText.includes('auth.uid === $uid')) fail('database rules do not enforce per-user writes');
  if(!rulesText.includes("auth.token.firebase.identities['google.com'] != null")) fail('database rules do not require a linked Google identity');
  if(!rulesText.includes("newData.val() >= data.val() - 40")) fail('raid rules do not cap one attack at 40 damage');
  if(!rulesText.includes("newData.val() === 'gg'")) fail('raid rules do not restrict emotes to a safe allowlist');
  if(!rulesText.includes("$zone === 'training-grove'")) fail('database rules do not allow the Phase 2 training map presence zone');
  if(!rulesText.includes("$zone === 'law-archive'") || !rulesText.includes("$zone === 'future-campus'")) fail('database rules do not allow the Phase 6 thematic map presence zones');
  if(!rulesText.includes("newData.child('text').val().length <= 80")) fail('proximity chat rules do not cap message length');
  if(!rulesText.includes("auth.uid === $toUid") || !rulesText.includes("auth.uid === $fromUid")) fail('voice signaling rules do not isolate sender and recipient');
  if(!rulesText.includes("newData.child('sdp').val().length <= 12000")) fail('voice signaling rules do not cap SDP payloads');
  if(rules.rules?.admins?.['$uid']?.['.write']!==false) fail('client code must not grant or change Test Admin roles');
  if(!rulesText.includes("newData.val() === 'crown'")) fail('database rules do not allow the Phase 3 accessory allowlist');
  if(!rulesText.includes("newData.val() === 'spin'")) fail('database rules do not allow the Phase 3 action allowlist');
  if(!rulesText.includes("newData.val() === 'english'")) fail('database rules do not allow the split English raid module');
  const raidMeta=rules.rules?.raids?.['$room']?.meta || {};
  const raidStartedAtRule=raidMeta.startedAt?.['.validate'] || '';
  const raidBossHpRule=raidMeta.bossHp?.['.validate'] || '';
  if(!raidStartedAtRule.includes("newData.parent().child('status').val() === 'active'")) fail('raid rules must validate the post-write active status during an atomic start');
  if(!raidBossHpRule.includes("newData.parent().child('bossMax')")) fail('raid creation must validate bossHp against the post-write bossMax sibling');
  if(raidBossHpRule.includes("root.child('raids').child($room).child('meta').child('bossMax')")) fail('raid creation still compares bossHp with the pre-write room');
  const expressions=[];
  const collectRuleExpressions=value=>{
    if(!value || typeof value!=='object') return;
    for(const [key,child] of Object.entries(value)){
      if(key.startsWith('.') && typeof child==='string') expressions.push(child);
      collectRuleExpressions(child);
    }
  };
  collectRuleExpressions(rules);
  const supportedRuleMethods=new Set(['child','exists','getPriority','hasChild','hasChildren','isBoolean','isNumber','isString','matches','parent','val']);
  for(const expression of expressions){
    for(const match of expression.matchAll(/\.([A-Za-z_$][\w$]*)\s*\(/g)){
      if(!supportedRuleMethods.has(match[1])) fail(`database rules use unsupported method ${match[1]}()`);
    }
  }
}catch(error){ fail(`database.rules.json is invalid: ${error.message}`); }
const onlineConfig=fs.readFileSync('online-config.js','utf8');
if(/service_account|private_key|BEGIN PRIVATE KEY/i.test(onlineConfig)) fail('online config contains a private credential marker');
for(const value of ['teacher-quest-2569.firebaseapp.com','teacher-quest-2569-default-rtdb.asia-southeast1.firebasedatabase.app','localHosts.has(location.hostname)?null:productionConfig']){
  if(!onlineConfig.includes(value)) fail(`online config is missing ${value}`);
}
for(const feature of ['balancedSample','verificationStatus','sourceUrl','freshnessClass','reviewDueOn','SMART DRILL']){
  if(!v4.includes(feature) && !dataSource.includes(feature)) fail(`V4/data is missing ${feature}`);
}

if(failures.length){
  for(const message of failures) console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}else{
  console.log(`PASS: ${questions.length} questions across ${modules.length} modules and ${categories.size} categories`);
  console.log(`PASS: answer positions ${answerDistribution.join('/')} • difficulty ${difficultyDistribution.ง่าย}/${difficultyDistribution.กลาง}/${difficultyDistribution.ยาก}`);
  console.log(`PASS: uniquely-longest correct options ${uniqueCorrectLongest}/${questions.length} • average lengths ${averageCorrectLength.toFixed(2)}/${averageDistractorLength.toFixed(2)} • absolute cue distractors ${absoluteCueDistractors}`);
  console.log('PASS: sources, verification labels, assets, accessibility hooks and retired-file checks are valid');
}
