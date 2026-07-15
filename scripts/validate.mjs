import fs from 'node:fs';
import vm from 'node:vm';

const failures = [];
const fail = message => failures.push(message);
const normalize = value => String(value || '').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
const length = value => [...String(value || '')].length;

const dataSource = fs.readFileSync('data.js','utf8');
const context = {window:{}};
vm.createContext(context);
vm.runInContext(dataSource,context,{filename:'data.js'});
const data = context.window.GAME_DATA;

if(!data) fail('GAME_DATA was not created');
if(data?.version !== '4.1.0') fail(`expected data version 4.1.0, got ${data?.version}`);
if(!Array.isArray(data?.modules) || data.modules.length !== 16) fail(`expected 16 modules, got ${data?.modules?.length}`);
if(!Array.isArray(data?.questions) || data.questions.length !== 400) fail(`expected exactly 400 questions, got ${data?.questions?.length}`);

const modules = data?.modules || [];
const questions = data?.questions || [];
const moduleIds = new Set(modules.map(module => module.id));
const categories = new Set(['สถานการณ์','ความรู้และหลักการ','วิเคราะห์และประเมิน','ข้อมูลปัจจุบันและดิจิทัล','กฎหมายและวิชาชีพ']);
const difficulties = new Set(['ง่าย','กลาง','ยาก']);
const ids = new Set();
const stems = new Set();
const answerDistribution = [0,0,0,0];
const difficultyDistribution = {ง่าย:0,กลาง:0,ยาก:0};
const moduleDifficulty = new Map(modules.map(module => [module.id,new Set()]));
let uniqueCorrectLongest = 0;
let absoluteCueDistractors = 0;
let longestAnswerRun = 0;
let answerRun = 0;
let previousAnswer = null;
const absoluteCue = /ทุกกรณี|เท่านั้น|เพียงอย่างเดียว|ไม่ต้อง|เสมอ|ทั้งหมด/;

for(const module of modules){
  if(!module.id || !module.title || !module.summary || !module.boss) fail(`module ${module.id || '(missing id)'} is incomplete`);
  if(!/^https:\/\//.test(module.official || '')) fail(`module ${module.id} has no HTTPS official source`);
}

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
  if(!/^https:\/\//.test(question.sourceUrl || '')) fail(`question ${question.id} has no HTTPS source URL`);
  if(!['official-current','reference-backed'].includes(question.verificationStatus)) fail(`question ${question.id} has invalid verification status`);

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
  const maximum = Math.max(...optionLengths);
  if(optionLengths[question.answer] === maximum && optionLengths.filter(value => value === maximum).length === 1) uniqueCorrectLongest++;
  absoluteCueDistractors += question.options.filter((option,index) => index !== question.answer && absoluteCue.test(option)).length;
}

if(answerDistribution.some(count => count !== 100)) fail(`answer positions are not balanced: ${answerDistribution.join('/')}`);
if(JSON.stringify(difficultyDistribution) !== JSON.stringify({ง่าย:80,กลาง:200,ยาก:120})) fail(`difficulty distribution changed: ${JSON.stringify(difficultyDistribution)}`);
for(const [moduleId,values] of moduleDifficulty){
  if(values.size !== 3) fail(`module ${moduleId} does not cover all difficulty levels`);
}
if(longestAnswerRun > 2) fail(`answer position repeats ${longestAnswerRun} times in a row`);
if(uniqueCorrectLongest / Math.max(questions.length,1) > .55) fail(`correct answer is uniquely longest too often: ${uniqueCorrectLongest}/${questions.length}`);
if(absoluteCueDistractors > 20) fail(`too many absolute cue words remain in distractors: ${absoluteCueDistractors}`);

if(data?.sources?.length !== modules.length) fail(`expected one source card per module, got ${data?.sources?.length}`);
if(data?.questionBankAudit?.sourceCoverage?.length !== modules.length) fail('question bank audit does not cover all modules');
if((data?.questionBankAudit?.verifiedCount || 0) + (data?.questionBankAudit?.referenceBackedCount || 0) !== questions.length) fail('verification counts do not cover the full bank');

const html = fs.readFileSync('index.html','utf8');
for(const asset of ['favicon.svg','fonts.css','styles.css','polish.css','v4.css','data.js','app.js','v4.js']){
  if(!html.includes(asset)) fail(`index.html does not reference ${asset}`);
  if(!fs.existsSync(asset)) fail(`${asset} does not exist`);
}
for(const retired of ['cloud-sync.js','firebase-config.js','v4-cleanup.js','FIREBASE_SETUP.md','firestore.rules']){
  if(fs.existsSync(retired)) fail(`retired file still exists: ${retired}`);
  if(html.includes(retired)) fail(`index.html still references retired file ${retired}`);
}

const app = fs.readFileSync('app.js','utf8');
const v4 = fs.readFileSync('v4.js','utf8');
for(const feature of ['startBattle','beginExam','renderReview','modalFocusables','teacherquest:local-state']){
  if(!app.includes(feature)) fail(`app.js is missing ${feature}`);
}
for(const feature of ['balancedSample','verificationStatus','sourceUrl','SMART DRILL']){
  if(!v4.includes(feature) && !dataSource.includes(feature)) fail(`V4/data is missing ${feature}`);
}

if(failures.length){
  for(const message of failures) console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}else{
  console.log(`PASS: ${questions.length} questions across ${modules.length} modules and ${categories.size} categories`);
  console.log(`PASS: answer positions ${answerDistribution.join('/')} • difficulty ${difficultyDistribution.ง่าย}/${difficultyDistribution.กลาง}/${difficultyDistribution.ยาก}`);
  console.log(`PASS: uniquely-longest correct options ${uniqueCorrectLongest}/${questions.length} • absolute cue distractors ${absoluteCueDistractors}`);
  console.log('PASS: sources, verification labels, assets, accessibility hooks and retired-file checks are valid');
}
