import fs from 'node:fs';
import vm from 'node:vm';

const fail = message => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const dataSource = fs.readFileSync('data.js', 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(dataSource, context, { filename: 'data.js' });
const data = context.window.GAME_DATA;
if (!data) fail('GAME_DATA was not created');
if (!Array.isArray(data?.modules) || data.modules.length !== 16) fail(`expected 16 modules, got ${data?.modules?.length}`);
if (!Array.isArray(data?.questions) || data.questions.length < 150) fail(`expected at least 150 questions, got ${data?.questions?.length}`);
const moduleIds = new Set(data?.modules?.map(m => m.id));
const ids = new Set();
for (const [index, question] of (data?.questions || []).entries()) {
  if (ids.has(question.id)) fail(`duplicate question id ${question.id}`);
  ids.add(question.id);
  if (!moduleIds.has(question.module)) fail(`question ${question.id} has unknown module ${question.module}`);
  if (!Array.isArray(question.options) || question.options.length !== 4) fail(`question ${question.id} does not have 4 options`);
  if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) fail(`question ${question.id} has invalid answer index`);
  if (!question.question?.trim()) fail(`question ${question.id} has empty text`);
  if (!question.explanation?.trim()) fail(`question ${question.id} has empty explanation`);
}
const html = fs.readFileSync('index.html', 'utf8');
for (const asset of ['styles.css', 'data.js', 'app.js']) {
  if (!html.includes(asset)) fail(`index.html does not reference ${asset}`);
  if (!fs.existsSync(asset)) fail(`${asset} does not exist`);
}
const app = fs.readFileSync('app.js', 'utf8');
for (const feature of ['startBattle', 'beginExam', 'startMusic', 'renderReview', 'validate']) {
  if (!app.includes(feature)) fail(`app.js is missing ${feature}`);
}
if (!process.exitCode) {
  console.log(`PASS: ${data.questions.length} questions across ${data.modules.length} modules`);
  console.log('PASS: IDs, answer indexes, option counts, module references and assets are valid');
}
