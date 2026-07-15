(()=>{
"use strict";

const D = window.GAME_DATA;
const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const view = $("#view");
const modal = $("#modal");
const modalBody = $("#modalBody");
const toast = $("#toast");
const modalBackground = [$(".topbar"),$(".app-shell")].filter(Boolean);
const STORAGE = "teacherQuest2569_v3";
const letters = ["ก","ข","ค","ง"];
const clone = value => JSON.parse(JSON.stringify(value));
const today = () => new Date().toLocaleDateString("sv-SE");
const shuffle = items => items.slice().sort(() => Math.random() - 0.5);
const clamp = (number,min,max) => Math.max(min,Math.min(max,number));
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
})[char]);
const questionType = question => question.category || question.type;
const sourceMarkup = question => {
  const verification = question.verified
    ? ` • ตรวจข้อมูลปัจจุบัน ${esc(question.verifiedAt)}`
    : " • มีแหล่งอ้างอิงหลักสำหรับทบทวน";
  const link = question.sourceUrl
    ? ` <a href="${esc(question.sourceUrl)}" target="_blank" rel="noopener" aria-label="เปิดแหล่งอ้างอิงของข้อ ${question.id}">เปิดต้นทาง ↗</a>`
    : "";
  return `แหล่งทบทวน: ${esc(question.source)}${verification}${link}`;
};

const defaults = {
  xp:0,
  coins:0,
  maxCombo:0,
  records:{},
  bookmarks:[],
  examHistory:[],
  daily:{date:today(),count:0},
  settings:{music:true,sound:true,volume:.35,reduced:false},
  lastModule:"all"
};

let state = loadState();
let battle = null;
let exam = null;
let examTimer = null;
let toastTimer = null;
let audioContext = null;
let musicTimer = null;
let modalPreviousFocus = null;

function mergeDeep(base, incoming){
  const output = Array.isArray(base) ? base.slice() : {...base};
  Object.keys(incoming || {}).forEach(key => {
    const a = base?.[key];
    const b = incoming[key];
    output[key] = a && typeof a === "object" && !Array.isArray(a) && b && typeof b === "object" && !Array.isArray(b)
      ? mergeDeep(a,b)
      : b;
  });
  return output;
}

function loadState(){
  try{
    return mergeDeep(defaults,JSON.parse(localStorage.getItem(STORAGE) || "{}"));
  }catch(error){
    console.warn("Could not load progress",error);
    return clone(defaults);
  }
}

function saveState(){
  localStorage.setItem(STORAGE,JSON.stringify(state));
  updateHud();
}

function refreshState(){
  state = loadState();
  resetDaily();
  updateHud();
}

function resetDaily(){
  if(state.daily.date !== today()) state.daily = {date:today(),count:0};
}

function level(){ return Math.floor(state.xp / 100) + 1; }
function rankName(){
  const value = level();
  if(value >= 20) return "ปรมาจารย์แห่งสนามสอบ";
  if(value >= 12) return "อัศวินวิชาชีพ";
  if(value >= 6) return "นักรบความรู้";
  return "ผู้ฝึกหัด";
}

function totalStats(){
  const records = Object.values(state.records);
  const attempts = records.reduce((sum,item) => sum + item.attempts,0);
  const correct = records.reduce((sum,item) => sum + item.correct,0);
  const weak = D.questions.filter(question => {
    const record = state.records[question.id];
    return !record || record.correct / record.attempts < .7;
  }).length;
  return {
    attempted:records.length,
    attempts,
    correct,
    accuracy:attempts ? Math.round(correct / attempts * 100) : 0,
    weak
  };
}

function moduleById(id){ return D.modules.find(item => item.id === id); }
function moduleStats(id){
  const questions = D.questions.filter(question => question.module === id);
  let attempts = 0;
  let correct = 0;
  let done = 0;
  questions.forEach(question => {
    const record = state.records[question.id];
    if(record){
      done++;
      attempts += record.attempts;
      correct += record.correct;
    }
  });
  return {total:questions.length,done,accuracy:attempts ? Math.round(correct / attempts * 100) : 0};
}

function recordAnswer(question,isCorrect){
  const record = state.records[question.id] || {attempts:0,correct:0,lastWrong:false};
  record.attempts++;
  if(isCorrect) record.correct++;
  record.lastWrong = !isCorrect;
  record.lastAt = Date.now();
  state.records[question.id] = record;
  state.daily.count++;
  state.xp += isCorrect ? 8 : 2;
  state.coins += isCorrect ? 3 : 1;
  saveState();
}

function validateData(){
  const errors = [];
  if(!D || !Array.isArray(D.questions)) return ["ไม่พบคลังข้อสอบ"];
  const ids = new Set();
  D.questions.forEach((question,index) => {
    if(ids.has(question.id)) errors.push(`รหัสซ้ำ ${question.id}`);
    ids.add(question.id);
    if(!Array.isArray(question.options) || question.options.length !== 4) errors.push(`ข้อ ${index+1} ตัวเลือกไม่ครบ`);
    if(!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) errors.push(`ข้อ ${index+1} เฉลยผิดรูปแบบ`);
    if(!D.modules.some(item => item.id === question.module)) errors.push(`ข้อ ${index+1} ไม่พบหมวด`);
  });
  return errors;
}

function updateHud(){
  resetDaily();
  const stats = totalStats();
  const progress = state.xp % 100;
  $("#topLevel").textContent = level();
  $("#topCoins").textContent = state.coins;
  $("#rankName").textContent = rankName();
  $("#xpText").textContent = `${progress} / 100`;
  $("#xpBar").style.width = `${progress}%`;
  $("#sideStreak").textContent = state.maxCombo;
  $("#sideMastery").textContent = stats.accuracy;
  $("#dailyQuestBar").style.width = `${clamp(state.daily.count / 10 * 100,0,100)}%`;
  $("#dailyQuestCount").textContent = `${Math.min(state.daily.count,10)} / 10`;
  $("#musicBtn").classList.toggle("off",!state.settings.music);
  $("#soundBtn").classList.toggle("off",!state.settings.sound);
  document.body.classList.toggle("no-motion",state.settings.reduced);
}

function showToast(message){
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"),2200);
}

function modalFocusables(){
  return $$('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',modal)
    .filter(element => element.offsetParent !== null);
}

function openModal(html){
  if(modal.classList.contains("hidden")) modalPreviousFocus = document.activeElement;
  modalBody.innerHTML = html;
  modal.classList.remove("hidden");
  modalBackground.forEach(element => {
    element.inert = true;
    element.setAttribute("aria-hidden","true");
  });
  document.body.classList.add("modal-open");
  setTimeout(() => $("button,input,select",modalBody)?.focus() || $("#modalClose")?.focus(),30);
}
function closeModal(){
  if(modal.classList.contains("hidden")) return;
  modal.classList.add("hidden");
  modalBody.innerHTML = "";
  modalBackground.forEach(element => {
    element.inert = false;
    element.removeAttribute("aria-hidden");
  });
  document.body.classList.remove("modal-open");
  const focusTarget = modalPreviousFocus;
  modalPreviousFocus = null;
  focusTarget?.focus?.();
}

function ensureAudio(){
  if(audioContext) return audioContext;
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if(!AudioEngine) return null;
  audioContext = new AudioEngine();
  return audioContext;
}

function tone(frequency=440,duration=.08,type="square",gain=.08,delay=0,force=false){
  if(!force && !state.settings.sound) return;
  const context = ensureAudio();
  if(!context) return;
  if(context.state === "suspended") context.resume();
  const oscillator = context.createOscillator();
  const volume = context.createGain();
  const time = context.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency,time);
  volume.gain.setValueAtTime(gain * state.settings.volume,time);
  volume.gain.exponentialRampToValueAtTime(.001,time + duration);
  oscillator.connect(volume).connect(context.destination);
  oscillator.start(time);
  oscillator.stop(time + duration);
}

const sfx = {
  select(){ tone(520,.05); },
  correct(){ tone(660,.09); tone(880,.12,"square",.07,.08); },
  wrong(){ tone(190,.16,"sawtooth"); tone(120,.18,"sawtooth",.06,.08); },
  win(){ [523,659,784,1047].forEach((note,index) => tone(note,.18,"square",.07,index*.11)); }
};

function startMusic(){
  if(!state.settings.music || musicTimer) return;
  const context = ensureAudio();
  if(!context) return;
  if(context.state === "suspended") context.resume();
  let step = 0;
  const sequence = [220,277,330,440,330,277,247,330];
  musicTimer = setInterval(() => {
    if(!state.settings.music) return;
    tone(sequence[step++ % sequence.length],.18,"triangle",.022,0,true);
  },260);
}
function stopMusic(){ clearInterval(musicTimer); musicTimer = null; }
function toggleMusic(){
  state = loadState();
  state.settings.music = !state.settings.music;
  state.settings.music ? startMusic() : stopMusic();
  saveState();
  showToast(state.settings.music ? "เปิดเพลงแล้ว" : "ปิดเพลงแล้ว");
}
function toggleSound(){
  state = loadState();
  state.settings.sound = !state.settings.sound;
  saveState();
  if(state.settings.sound) sfx.select();
  showToast(state.settings.sound ? "เปิดเสียงเอฟเฟกต์แล้ว" : "ปิดเสียงเอฟเฟกต์แล้ว");
}

function fighterArt(){
  return '<div class="pixel-fighter"><i class="head"></i><i class="body"></i><i class="weapon"></i></div>';
}
function heroArt(){
  return `<div class="hero-art"><div class="portal"></div><div class="teacher-sprite"><i class="hair"></i><i class="face"></i><i class="body"></i><i class="book"></i><i class="legs"></i></div><div class="float-badge one">16 ดินแดน</div><div class="float-badge two">${D.questions.length} ภารกิจ</div></div>`;
}

function bindCommon(){
  $$('[data-go]').forEach(button => button.onclick = () => go(button.dataset.go));
  $$('[data-module]').forEach(button => button.onclick = () => openZone(button.dataset.module));
}

function go(name,options={}){
  $$('.nav-btn').forEach(button => button.classList.toggle("active",button.dataset.view === name));
  view.className = "view";
  clearInterval(examTimer);
  examTimer = null;
  if(name !== "practice") battle = null;
  if(name !== "exam") exam = null;
  const routes = {
    home:renderHome,
    world:renderWorld,
    practice:() => renderPractice(options),
    exam:renderExamLobby,
    review:renderReview,
    codex:renderCodex,
    profile:renderProfile
  };
  (routes[name] || renderHome)();
  window.scrollTo({top:0,behavior:"smooth"});
}

function zoneHtml(item){
  const stats = moduleStats(item.id);
  const progress = Math.round(stats.done / stats.total * 100);
  const stars = stats.accuracy >= 85 ? "★★★" : stats.accuracy >= 70 ? "★★☆" : stats.done ? "★☆☆" : "☆☆☆";
  return `<button class="zone ${stats.accuracy >= 80 ? "mastered" : ""}" data-module="${item.id}"><span class="stars">${stars}</span><span class="zone-no">ZONE ${String(D.modules.indexOf(item)+1).padStart(2,"0")}</span><div class="zone-icon">${item.icon}</div><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p><div class="zone-meta"><span>${stats.done}/${stats.total} ข้อ</span><span>${stats.accuracy}%</span></div><div class="meter"><i style="width:${progress}%"></i></div></button>`;
}

function renderHome(){
  const stats = totalStats();
  const explored = D.modules.filter(item => moduleStats(item.id).done > 0);
  const strongest = [...explored].sort((a,b) => moduleStats(b.id).accuracy - moduleStats(a.id).accuracy)[0];
  view.innerHTML = `
    <section class="hero pixel-box"><div class="hero-grid"><div>
      <div class="eyebrow">MISSION 2569 • READY FOR THE EXAM</div>
      <h1>ฝึกให้แม่น<br><span>สู้ให้ติด</span></h1>
      <p>ออกเดินทางผ่านศาสตร์การสอน กฎหมาย วิชาชีพ และสถานการณ์การศึกษา ฝึกตอบแบบต่อสู้ เก็บคอมโบ แล้วพิชิตสนามสอบใหญ่</p>
      <div class="hero-actions"><button class="btn" id="quickStart">⚔ เริ่มภารกิจทันที</button><button class="btn mint" data-go="world">◈ เลือกดินแดน</button><button class="btn dark" data-go="exam">◷ สนามสอบใหญ่</button></div>
    </div>${heroArt()}</div></section>
    <div class="section-head"><div><h2>สถานะการเดินทาง</h2><p>ดูจุดแข็งและภารกิจที่รออยู่</p></div></div>
    <section class="dashboard">
      <div class="stat-card pixel-box"><b>${stats.attempted}</b><span>ข้อที่เผชิญแล้ว</span></div>
      <div class="stat-card pixel-box"><b>${stats.accuracy}%</b><span>ความแม่นยำรวม</span></div>
      <div class="stat-card pixel-box"><b>${state.maxCombo}</b><span>คอมโบสูงสุด</span></div>
      <div class="stat-card pixel-box"><b>${stats.weak}</b><span>ข้อที่ยังต้องฝึก</span></div>
    </section>
    <div class="section-head"><div><h2>ทางลัดนักผจญภัย</h2><p>เลือกสนามให้ตรงกับเป้าหมายวันนี้</p></div></div>
    <section class="quest-strip">
      <button class="quest-card pixel-box" id="weakStart"><span class="quest-ico">◎</span><span><h3>ล่าจุดอ่อน</h3><p>ระบบเลือกข้อที่ยังไม่แม่น</p></span><b>+EXP</b></button>
      <button class="quest-card pixel-box" id="lawStart"><span class="quest-ico">⚖</span><span><h3>ศึกกฎหมาย</h3><p>รวมกฎหมายและวิชาชีพฉบับตรวจทาน</p></span><b>BOSS</b></button>
      <button class="quest-card pixel-box" data-go="codex"><span class="quest-ico">▤</span><span><h3>เปิดคัมภีร์</h3><p>สูตรจำและแหล่งอ้างอิงทางการ</p></span><b>READ</b></button>
    </section>
    <div class="section-head"><div><h2>ดินแดนแนะนำ</h2><p>${strongest ? `ดินแดนที่คุณทำได้ดีที่สุด: ${esc(strongest.title)}` : "เริ่มด่านแรกเพื่อเปิดสถิติ"}</p></div><button class="btn small dark" data-go="world">ดูทั้งหมด</button></div>
    <section class="world-map">${D.modules.slice(0,4).map(zoneHtml).join("")}</section>
    <div class="footer-note">ครูเควสต์ • คลังความรู้ฉบับ ${D.version} • ตรวจข้อมูลผันแปรล่าสุด ${D.verifiedAt}</div>`;
  bindCommon();
  $("#quickStart").onclick = () => startBattle({mode:"random",count:10});
  $("#weakStart").onclick = () => startBattle({mode:"weak",count:10});
  $("#lawStart").onclick = () => startBattle({mode:"modules",modules:["eduact","child","disability","civil","ksp","voclaw"],count:12});
}

function renderWorld(){
  view.innerHTML = `<section class="panel pixel-box"><div class="panel-title"><div><h2>แผนที่ภารกิจ</h2><small>เลือกดินแดนเพื่อท้าทายบอสประจำศาสตร์</small></div><button class="btn small" id="allRandom">สุ่มทุกดินแดน</button></div><div class="world-map">${D.modules.map(zoneHtml).join("")}</div></section>`;
  $$('[data-module]').forEach(button => button.onclick = () => openZone(button.dataset.module));
  $("#allRandom").onclick = () => startBattle({mode:"random",count:15});
}

function openZone(id){
  const item = moduleById(id);
  const stats = moduleStats(id);
  openModal(`<h2 id="modalTitle">${item.icon} ${esc(item.title)}</h2><p>${esc(item.summary)}</p><div class="dashboard"><div class="stat-card pixel-box"><b>${stats.total}</b><span>ข้อในด่าน</span></div><div class="stat-card pixel-box"><b>${stats.accuracy}%</b><span>ความแม่นยำ</span></div></div><h3>บอสประจำด่าน</h3><p>◆ ${esc(item.boss)}</p><div class="hero-actions"><button class="btn" id="zoneNormal">เริ่มด่าน 10 ข้อ</button><button class="btn pink" id="zoneBoss">ท้าบอส 15 ข้อ</button></div>`);
  $("#zoneNormal").onclick = () => { closeModal(); startBattle({mode:"module",module:id,count:10}); };
  $("#zoneBoss").onclick = () => { closeModal(); startBattle({mode:"module",module:id,count:15,boss:true}); };
}

function renderPractice(options={}){
  if(options.start){ startBattle(options.start); return; }
  view.innerHTML = `<section class="panel pixel-box"><div class="panel-title"><div><h2>สนามฝึก</h2><small>เลือกวิธีฝึก แล้วเปลี่ยนความรู้เป็นพลังโจมตี</small></div></div><div class="filter-row"><label>ดินแดน <select id="practiceModule"><option value="all">ทุกดินแดน</option>${D.modules.map(item => `<option value="${item.id}" ${state.lastModule === item.id ? "selected" : ""}>${item.icon} ${esc(item.title)}</option>`).join("")}</select></label></div><div class="mode-grid"><button class="mode-card" data-mode="normal"><div class="mode-icon" aria-hidden="true">⚔</div><h3>ศึกมาตรฐาน</h3><p>สุ่ม 10 ข้อ ตอบถูกโจมตี ตอบผิดถูกสวนกลับ</p><span class="tag">10 QUESTIONS</span></button><button class="mode-card" data-mode="boss"><div class="mode-icon" aria-hidden="true">◆</div><h3>ล่าบอส</h3><p>15 ข้อ ระดับกลางและยาก บอสพลังชีวิตสูง</p><span class="tag">HARD MODE</span></button><button class="mode-card" data-mode="weak"><div class="mode-icon" aria-hidden="true">◎</div><h3>ห้องล้างแค้น</h3><p>ระบบเลือกข้อที่เคยผิดหรือยังไม่เคยทำ</p><span class="tag">SMART REVIEW</span></button></div></section>`;
  $$('.mode-card').forEach(button => button.onclick = () => {
    const selected = $("#practiceModule").value;
    state.lastModule = selected;
    saveState();
    if(button.dataset.mode === "weak") startBattle({mode:"weak",module:selected === "all" ? null : selected,count:10});
    else startBattle({mode:selected === "all" ? "random" : "module",module:selected === "all" ? null : selected,count:button.dataset.mode === "boss" ? 15 : 10,boss:button.dataset.mode === "boss"});
  });
}

function pickPool(config){
  let pool = D.questions;
  if(config.mode === "module") pool = pool.filter(question => question.module === config.module);
  if(config.mode === "modules") pool = pool.filter(question => config.modules.includes(question.module));
  if(config.module) pool = pool.filter(question => question.module === config.module);
  if(config.mode === "weak") pool = pool.filter(question => {
    const record = state.records[question.id];
    return !record || record.lastWrong || record.correct / record.attempts < .7;
  });
  if(config.boss) pool = pool.filter(question => question.difficulty !== "ง่าย");
  if(pool.length < (config.count || 10)){
    pool = pool.concat(shuffle(D.questions.filter(question => !pool.includes(question))));
  }
  return shuffle(pool).slice(0,config.count || 10);
}

function startBattle(config){
  battle = {
    pool:pickPool(config),index:0,playerHp:100,
    enemyHp:config.boss ? 150 : 100,enemyMax:config.boss ? 150 : 100,
    combo:0,selected:null,locked:false,hidden:[],shield:false,
    skills:{fifty:1,heal:1,shield:1,hint:1},boss:Boolean(config.boss),correct:0
  };
  $$('.nav-btn').forEach(button => button.classList.toggle("active",button.dataset.view === "practice"));
  renderBattle();
  window.scrollTo({top:0,behavior:"smooth"});
}

function renderBattle(){
  if(!battle || battle.index >= battle.pool.length){ finishBattle(); return; }
  const question = battle.pool[battle.index];
  const item = moduleById(question.module);
  view.innerHTML = `<section class="battle-shell pixel-box"><div class="battle-hud"><div><div class="fighter-name">◆ ครูนักผจญภัย</div><div class="hpbar"><i style="width:${battle.playerHp}%"></i></div></div><div class="battle-center"><strong>${battle.index+1} / ${battle.pool.length}</strong><small>COMBO ×${battle.combo}</small></div><div><div class="fighter-name right">${esc(battle.boss ? item.boss : "มอนสเตอร์ความสับสน")} ◆</div><div class="hpbar enemy-hp"><i style="width:${battle.enemyHp / battle.enemyMax * 100}%"></i></div></div></div><div class="arena"><div class="fighter player" id="playerFighter">${fighterArt()}</div><div class="fighter enemy" id="enemyFighter">${fighterArt()}</div></div><div class="question-panel"><div class="question-meta"><span class="chip gold">${item.icon} ${esc(item.title)}</span><span class="chip">${esc(question.difficulty)}</span><span class="chip">${esc(questionType(question))}</span>${question.verified ? `<span class="chip mint">ตรวจ ${esc(question.verifiedAt)}</span>` : `<span class="chip">อ้างอิงต้นทาง</span>`}</div><div class="question-text">${esc(question.question)}</div><div class="options">${question.options.map((option,index) => `<button class="option ${battle.selected === index ? "selected" : ""}" data-answer="${index}" ${battle.locked || battle.hidden.includes(index) ? "disabled" : ""} style="${battle.hidden.includes(index) ? "visibility:hidden" : ""}"><span class="letter">${letters[index]}</span>${esc(option)}</button>`).join("")}</div><div class="battle-actions"><div class="skills"><button class="skill" data-skill="fifty" ${!battle.skills.fifty || battle.locked ? "disabled" : ""}>✂ 50:50</button><button class="skill" data-skill="shield" ${!battle.skills.shield || battle.locked ? "disabled" : ""}>◈ โล่</button><button class="skill" data-skill="heal" ${!battle.skills.heal || battle.locked ? "disabled" : ""}>+ ฟื้นพลัง</button><button class="skill" data-skill="hint" ${!battle.skills.hint || battle.locked ? "disabled" : ""}>◉ คำใบ้</button></div><button class="btn" id="attackBtn" ${battle.selected === null || battle.locked ? "disabled" : ""}>โจมตี!</button></div><div id="feedbackSlot"></div></div></section>`;
  $$('.option').forEach(button => button.onclick = () => {
    if(battle.locked) return;
    battle.selected = Number(button.dataset.answer);
    sfx.select();
    renderBattle();
  });
  $$('.skill').forEach(button => button.onclick = () => useSkill(button.dataset.skill));
  $("#attackBtn").onclick = submitBattle;
}

function useSkill(skill){
  const question = battle.pool[battle.index];
  if(!battle.skills[skill]) return;
  battle.skills[skill]--;
  if(skill === "fifty"){
    battle.hidden = shuffle([0,1,2,3].filter(index => index !== question.answer)).slice(0,2);
    showToast("ตัดตัวลวงออก 2 ตัวเลือก");
  }
  if(skill === "shield"){
    battle.shield = true;
    showToast("กางโล่แล้ว: ป้องกันการโจมตีครั้งถัดไป");
  }
  if(skill === "heal"){
    battle.playerHp = clamp(battle.playerHp + 25,0,100);
    showToast("ฟื้นพลัง 25 HP");
  }
  if(skill === "hint"){
    const hint = question.explanation.split(" ").slice(0,12).join(" ");
    openModal(`<h2 id="modalTitle">◉ คำใบ้</h2><p>จับคำสำคัญในโจทย์: <strong>${esc(questionType(question))}</strong></p><p>${esc(hint)}…</p>`);
  }
  renderBattle();
}

function damagePop(element,text){
  if(!element) return;
  const pop = document.createElement("div");
  pop.className = "damage-pop";
  pop.textContent = text;
  pop.style.left = `${element.offsetLeft + 40}px`;
  pop.style.top = `${element.offsetTop + 10}px`;
  element.parentElement.appendChild(pop);
  setTimeout(() => pop.remove(),1000);
}

function animateAttack(damage){
  const player = $("#playerFighter");
  const enemy = $("#enemyFighter");
  player?.classList.add("attack");
  setTimeout(() => enemy?.classList.add("hit"),150);
  damagePop(enemy,`-${damage}`);
}
function animateHurt(damage){
  const player = $("#playerFighter");
  player?.classList.add("hurt");
  damagePop(player,damage ? `-${damage}` : "BLOCK");
}

function toggleBookmark(id,button=null){
  if(state.bookmarks.includes(id)) state.bookmarks = state.bookmarks.filter(value => value !== id);
  else state.bookmarks.push(id);
  saveState();
  const saved = state.bookmarks.includes(id);
  if(button) button.textContent = saved ? "★ เก็บแล้ว" : "☆ เก็บทบทวน";
  showToast(saved ? "เก็บเข้าห้องทบทวนแล้ว" : "นำออกจากห้องทบทวนแล้ว");
}

function submitBattle(){
  if(battle.locked || battle.selected === null) return;
  const question = battle.pool[battle.index];
  const isCorrect = battle.selected === question.answer;
  battle.locked = true;
  recordAnswer(question,isCorrect);
  let damage;
  if(isCorrect){
    battle.combo++;
    battle.correct++;
    state.maxCombo = Math.max(state.maxCombo,battle.combo);
    damage = 22 + Math.min(battle.combo * 3,18);
    battle.enemyHp = clamp(battle.enemyHp - damage,0,battle.enemyMax);
    sfx.correct();
    animateAttack(damage);
  }else{
    battle.combo = 0;
    damage = battle.shield ? 0 : 18;
    battle.shield = false;
    battle.playerHp = clamp(battle.playerHp - damage,0,100);
    sfx.wrong();
    animateHurt(damage);
  }
  saveState();
  $$('.option').forEach((button,index) => {
    button.disabled = true;
    if(index === question.answer) button.classList.add("correct");
    if(index === battle.selected && !isCorrect) button.classList.add("wrong");
  });
  const slot = $("#feedbackSlot");
  slot.innerHTML = `<div class="feedback ${isCorrect ? "" : "bad"}"><h3>${isCorrect ? "โจมตีสำเร็จ!" : "ถูกสวนกลับ!"}</h3><p><strong>คำตอบ: ${letters[question.answer]}. ${esc(question.options[question.answer])}</strong></p><p>${esc(question.explanation)}</p><div class="source">${sourceMarkup(question)}</div><div class="hero-actions"><button class="btn small ${battle.playerHp <= 0 ? "red" : "mint"}" id="nextBattle">${battle.playerHp <= 0 ? "กลับฐาน" : "ข้อต่อไป"}</button><button class="btn small dark" id="bookmarkBtn">${state.bookmarks.includes(question.id) ? "★ เก็บแล้ว" : "☆ เก็บทบทวน"}</button></div></div>`;
  $("#bookmarkBtn").onclick = event => toggleBookmark(question.id,event.currentTarget);
  $("#nextBattle").onclick = () => {
    if(battle.playerHp <= 0){ finishBattle(true); return; }
    battle.index++;
    battle.selected = null;
    battle.locked = false;
    battle.hidden = [];
    if(battle.enemyHp <= 0){
      battle.enemyHp = battle.enemyMax;
      sfx.win();
      state.coins += 10;
      saveState();
      showToast("ปราบศัตรูสำเร็จ +10 เหรียญ");
    }
    renderBattle();
  };
}

function finishBattle(defeat=false){
  const result = battle;
  const score = result ? result.correct : 0;
  const total = result ? result.pool.length : 0;
  view.innerHTML = `<section class="panel pixel-box"><div class="result-hero pixel-box"><div class="eyebrow">${defeat ? "MISSION RETREAT" : "MISSION COMPLETE"}</div><b>${score}/${total}</b><h2>${defeat ? "ถอยมาตั้งหลัก แล้วกลับไปลุยใหม่" : "ภารกิจเสร็จสิ้น!"}</h2><p>${score / Math.max(total,1) >= .8 ? "ยอดเยี่ยม ความแม่นของคุณพร้อมลุยด่านยากขึ้น" : "ทบทวนข้อที่พลาด แล้วลองอีกครั้งจะเห็นพัฒนาการชัดเจน"}</p></div><div class="hero-actions"><button class="btn" id="againBattle">ฝึกอีกชุด</button><button class="btn mint" data-go="review">ทบทวนข้อพลาด</button><button class="btn dark" data-go="home">กลับฐาน</button></div></section>`;
  battle = null;
  bindCommon();
  $("#againBattle").onclick = () => go("practice");
}

function renderExamLobby(){
  view.innerHTML = `<section class="panel pixel-box"><div class="panel-title"><div><h2>สนามสอบใหญ่</h2><small>เลือกจำนวนข้อ เวลา และขอบเขตก่อนเปิดประตูสนาม</small></div></div><div class="filter-row"><label>ขอบเขต <select id="examModule"><option value="all">ทุกดินแดน</option>${D.modules.map(item => `<option value="${item.id}">${item.icon} ${esc(item.title)}</option>`).join("")}</select></label><label>จำนวนข้อ <select id="examCount"></select></label><label>เวลา <select id="examMinutes"><option value="30">30 นาที</option><option value="60" selected>60 นาที</option><option value="90">90 นาที</option></select></label></div><p class="exam-availability" id="examAvailability" role="status"></p><div class="mode-grid"><button class="mode-card" id="startExam"><div class="mode-icon">◷</div><h3>เริ่มสนามสอบ</h3><p>ซ่อนเฉลยจนกว่าจะส่งข้อสอบ เปลี่ยนคำตอบและข้ามข้อได้</p><span class="tag">EXAM MODE</span></button><button class="mode-card" id="quickExam"><div class="mode-icon">⚡</div><h3>ด่านด่วน 20 ข้อ</h3><p>จับเวลา 20 นาที เหมาะกับการซ้อมทุกวัน</p><span class="tag">SPEED RUN</span></button><button class="mode-card" id="bossExam"><div class="mode-icon">♜</div><h3>ศึกบอส 80 ข้อ</h3><p>คัดระดับกลางและยากจากทุกดินแดน</p><span class="tag">FINAL BOSS</span></button></div></section>`;
  const syncExamAvailability = () => {
    const moduleId = $("#examModule").value;
    const available = D.questions.filter(question => moduleId === "all" || question.module === moduleId).length;
    const preferred = moduleId === "all" ? [30,60,100] : [10,20,30,60,100].filter(count => count <= available);
    if(!preferred.includes(available) && moduleId !== "all") preferred.push(available);
    const previous = Number($("#examCount").value) || 60;
    $("#examCount").innerHTML = preferred.map(count => `<option value="${count}">${count}</option>`).join("");
    const selected = preferred.filter(count => count <= Math.min(previous,available)).pop() || preferred[0];
    $("#examCount").value = String(selected);
    const item = moduleId === "all" ? null : moduleById(moduleId);
    $("#examAvailability").textContent = item
      ? `${item.icon} ${item.title} มี ${available} ข้อ — ระบบแสดงเฉพาะจำนวนที่ทำได้จริง`
      : `คลังรวมมี ${available} ข้อ`;
  };
  $("#examModule").onchange = syncExamAvailability;
  syncExamAvailability();
  $("#startExam").onclick = () => beginExam(Number($("#examCount").value),Number($("#examMinutes").value),$("#examModule").value,false);
  $("#quickExam").onclick = () => beginExam(20,20,"all",false);
  $("#bossExam").onclick = () => beginExam(80,100,"all",true);
}

function beginExam(count,minutes,moduleId,boss){
  let pool = D.questions.filter(question => moduleId === "all" || question.module === moduleId);
  if(boss) pool = pool.filter(question => question.difficulty !== "ง่าย");
  if(!pool.length){ showToast("ไม่พบข้อสอบในขอบเขตนี้"); return; }
  if(count > pool.length) showToast(`ขอบเขตนี้มี ${pool.length} ข้อ ระบบปรับจำนวนให้อัตโนมัติ`);
  pool = shuffle(pool).slice(0,Math.min(count,pool.length));
  exam = {pool,answers:Array(pool.length).fill(null),index:0,end:Date.now()+minutes*60000,minutes};
  renderExam();
  examTimer = setInterval(updateExamTimer,500);
  updateExamTimer();
}

function renderExam(){
  const question = exam.pool[exam.index];
  const item = moduleById(question.module);
  view.innerHTML = `<div class="exam-layout"><section class="panel pixel-box"><div class="panel-title"><div><h2>ข้อ ${exam.index+1} จาก ${exam.pool.length}</h2><small>${item.icon} ${esc(item.title)}</small></div><div class="timer" id="timerText">--:--</div></div><div class="question-meta"><span class="chip">${esc(question.difficulty)}</span><span class="chip">${esc(questionType(question))}</span></div><div class="question-text">${esc(question.question)}</div><div class="options">${question.options.map((option,index) => `<button class="option ${exam.answers[exam.index] === index ? "selected" : ""}" data-exam-answer="${index}"><span class="letter">${letters[index]}</span>${esc(option)}</button>`).join("")}</div><div class="battle-actions"><button class="btn small dark" id="prevExam" ${exam.index === 0 ? "disabled" : ""}>← ก่อนหน้า</button><div><button class="btn small" id="nextExam">${exam.index === exam.pool.length-1 ? "ตรวจรายการ" : "ข้อต่อไป →"}</button> <button class="btn small red" id="submitExam">ส่งข้อสอบ</button></div></div></section><aside class="panel pixel-box exam-side"><div class="panel-title"><div><h2>กระดาษคำตอบ</h2><small>${exam.answers.filter(value => value !== null).length} / ${exam.pool.length} ข้อ</small></div></div><div class="question-grid">${exam.pool.map((_,index) => `<button data-qnav="${index}" class="${exam.answers[index] !== null ? "answered" : ""} ${index === exam.index ? "current" : ""}" aria-label="ไปข้อ ${index+1}${exam.answers[index] !== null ? " ตอบแล้ว" : " ยังไม่ตอบ"}">${index+1}</button>`).join("")}</div></aside></div>`;
  $$('[data-exam-answer]').forEach(button => button.onclick = () => {
    exam.answers[exam.index] = Number(button.dataset.examAnswer);
    sfx.select();
    renderExam();
    updateExamTimer();
  });
  $$('[data-qnav]').forEach(button => button.onclick = () => {
    exam.index = Number(button.dataset.qnav);
    renderExam();
    updateExamTimer();
  });
  $("#prevExam").onclick = () => { exam.index--; renderExam(); updateExamTimer(); };
  $("#nextExam").onclick = () => {
    if(exam.index < exam.pool.length-1) exam.index++;
    else{
      const blank = exam.answers.findIndex(value => value === null);
      if(blank >= 0) exam.index = blank;
    }
    renderExam();
    updateExamTimer();
  };
  $("#submitExam").onclick = confirmFinishExam;
}

function updateExamTimer(){
  if(!exam) return;
  const remaining = exam.end - Date.now();
  if(remaining <= 0){ finishExam(); return; }
  const seconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  const element = $("#timerText");
  if(element) element.textContent = `${String(minutes).padStart(2,"0")}:${String(rest).padStart(2,"0")}`;
}

function confirmFinishExam(){
  const blank = exam.answers.filter(value => value === null).length;
  const statusText = blank ? `ยังไม่ได้ตอบ <strong>${blank}</strong> ข้อ` : "ตอบครบทุกข้อแล้ว";
  openModal(`<h2 id="modalTitle">ส่งข้อสอบหรือไม่?</h2><p>${statusText}</p><div class="hero-actions"><button class="btn red" id="confirmSubmit">ยืนยันส่งข้อสอบ</button><button class="btn dark" id="cancelSubmit">กลับไปตรวจ</button></div>`);
  $("#confirmSubmit").onclick = () => { closeModal(); finishExam(); };
  $("#cancelSubmit").onclick = closeModal;
}

function finishExam(){
  clearInterval(examTimer);
  examTimer = null;
  if(!exam) return;
  let score = 0;
  const breakdown = {};
  exam.pool.forEach((question,index) => {
    const answer = exam.answers[index];
    const correct = answer === question.answer;
    if(answer !== null) recordAnswer(question,correct);
    if(correct) score++;
    const item = breakdown[question.module] || (breakdown[question.module] = {total:0,correct:0});
    item.total++;
    if(correct) item.correct++;
  });
  const percent = Math.round(score / exam.pool.length * 100);
  state.examHistory.unshift({date:new Date().toLocaleString("th-TH"),score,total:exam.pool.length,pct:percent});
  state.examHistory = state.examHistory.slice(0,20);
  saveState();
  const result = exam;
  exam = null;
  sfx.win();
  view.innerHTML = `<section class="panel pixel-box"><div class="result-hero pixel-box"><div class="eyebrow">EXAM RESULT</div><b>${percent}%</b><h2>${percent >= 80 ? "ผ่านด่านอย่างสง่างาม" : percent >= 60 ? "ใกล้ถึงเป้าหมาย" : "กลับไปเก็บเลเวลอีกนิด"}</h2><p>${score} คะแนน จาก ${result.pool.length} ข้อ</p></div><div class="section-head"><div><h2>ผลรายดินแดน</h2><p>ใช้เลือกด่านที่จะฝึกต่อ</p></div></div><div class="breakdown">${Object.entries(breakdown).map(([id,item]) => `<div class="break-card pixel-box"><strong>${moduleById(id).icon} ${esc(moduleById(id).title)}</strong><b>${item.correct}/${item.total}</b><small>${Math.round(item.correct/item.total*100)}%</small></div>`).join("")}</div><div class="hero-actions"><button class="btn" data-go="exam">สอบใหม่</button><button class="btn mint" data-go="review">ทบทวนข้อผิด</button><button class="btn dark" data-go="home">กลับฐาน</button></div></section>`;
  bindCommon();
}

function weakQuestions(){
  return D.questions.filter(question => {
    const record = state.records[question.id];
    return state.bookmarks.includes(question.id) || Boolean(record && (record.lastWrong || record.correct / record.attempts < .7));
  });
}

function renderReview(limit=60){
  const questions = weakQuestions();
  const visible = questions.slice(0,limit);
  const list = questions.length
    ? `<p class="review-count">แสดง ${visible.length} จาก ${questions.length} ข้อที่ควรทบทวน</p><div class="review-list">${visible.map(question => {
        const record = state.records[question.id];
        const accuracy = record ? Math.round(record.correct / record.attempts * 100) : 0;
        return `<article class="review-card pixel-box"><div><h3>${moduleById(question.module).icon} ${esc(question.question)}</h3><p>${esc(moduleById(question.module).title)} • ความแม่น ${accuracy}% ${state.bookmarks.includes(question.id) ? "• ★ เก็บไว้" : ""}</p></div><button class="btn small dark" data-one="${question.id}">ฝึกข้อนี้</button></article>`;
      }).join("")}</div>${visible.length < questions.length ? `<p><button class="btn small dark" id="moreReview">ดูเพิ่มอีก ${Math.min(60,questions.length-visible.length)} ข้อ</button></p>` : ""}`
    : '<div class="empty">✦ ไม่มีข้อค้างทบทวนในตอนนี้</div>';
  view.innerHTML = `<section class="panel pixel-box"><div class="panel-title"><div><h2>ห้องทบทวน</h2><small>รวมข้อที่เก็บไว้ เคยตอบผิด หรือยังไม่แม่น</small></div><button class="btn small" id="reviewBattle" ${questions.length ? "" : "disabled"}>ฝึกชุดนี้</button></div>${list}</section>`;
  $("#reviewBattle")?.addEventListener("click",() => startCustomBattle(shuffle(questions).slice(0,15),110));
  $$('[data-one]').forEach(button => button.onclick = () => {
    const question = D.questions.find(item => item.id === Number(button.dataset.one));
    startCustomBattle([question],40);
  });
  $("#moreReview")?.addEventListener("click",() => renderReview(limit+60));
}

function startCustomBattle(pool,hp){
  battle = {pool,index:0,playerHp:100,enemyHp:hp,enemyMax:hp,combo:0,selected:null,locked:false,hidden:[],shield:false,skills:{fifty:1,heal:1,shield:1,hint:1},boss:false,correct:0};
  renderBattle();
}

function renderCodex(){
  view.innerHTML = `<section class="panel pixel-box"><div class="panel-title"><div><h2>คัมภีร์ความรู้</h2><small>สูตรจำสั้น ๆ สำหรับเรียกคืนก่อนเข้าสนาม</small></div></div><div class="codex-grid">${D.codex.map(item => `<article class="codex-card pixel-box"><div class="codex-icon">${item.icon}</div><h3>${esc(item.title)}</h3><ul>${item.items.map(text => `<li>${esc(text)}</li>`).join("")}</ul></article>`).join("")}</div><div class="section-head"><div><h2>หอจดหมายเหตุ</h2><p>เปิดต้นทางเมื่อต้องตรวจข้อมูลกฎหมาย นโยบาย หรือบุคคลปัจจุบัน</p></div></div><div class="codex-grid">${D.sources.map(source => `<article class="codex-card pixel-box"><h3>${esc(source.title)}</h3><p>${esc(source.note)}</p><div class="source-links"><a href="${source.url}" target="_blank" rel="noopener" aria-label="เปิดแหล่งทางการ: ${esc(source.title)}">เปิด ${esc(source.title)} ↗</a></div></article>`).join("")}</div></section>`;
}

function renderProfile(){
  const stats = totalStats();
  const achievements = [
    {icon:"⚔",name:"ก้าวแรก",desc:"ตอบข้อสอบครั้งแรก",ok:stats.attempted >= 1},
    {icon:"✦",name:"คอมโบ 10",desc:"ตอบถูกต่อเนื่อง 10 ข้อ",ok:state.maxCombo >= 10},
    {icon:"▤",name:"นักสำรวจ",desc:"ทำข้อสอบอย่างน้อย 8 ดินแดน",ok:D.modules.filter(item => moduleStats(item.id).done > 0).length >= 8},
    {icon:"♜",name:"ผู้พิชิต",desc:"ได้คะแนนสนามสอบอย่างน้อย 80%",ok:state.examHistory.some(item => item.pct >= 80)},
    {icon:"◆",name:"คลังสมบัติ",desc:"สะสม 300 เหรียญ",ok:state.coins >= 300},
    {icon:"★",name:"ปรมาจารย์",desc:"ขึ้นถึงเลเวล 20",ok:level() >= 20}
  ];
  view.innerHTML = `<section class="panel pixel-box"><div class="panel-title"><div><h2>สมุดนักผจญภัย</h2><small>เลเวล ${level()} • ${rankName()}</small></div></div><div class="profile-grid"><div><div class="dashboard"><div class="stat-card pixel-box"><b>${stats.accuracy}%</b><span>ความแม่นรวม</span></div><div class="stat-card pixel-box"><b>${stats.attempts}</b><span>จำนวนครั้งที่ตอบ</span></div><div class="stat-card pixel-box"><b>${state.examHistory.length}</b><span>รอบสนามสอบ</span></div><div class="stat-card pixel-box"><b>${state.bookmarks.length}</b><span>ข้อที่เก็บไว้</span></div></div><div class="section-head"><div><h2>พลังรายดินแดน</h2></div></div>${D.modules.map(item => { const stats = moduleStats(item.id); return `<div class="chart-row"><span>${item.icon} ${esc(item.title)}</span><div class="bar"><i style="width:${stats.accuracy}%"></i></div><b>${stats.accuracy}%</b></div>`; }).join("")}</div><div><div class="section-head"><div><h2>เหรียญตรา</h2></div></div><div class="achievement-grid">${achievements.map(item => `<article class="achievement pixel-box ${item.ok ? "unlocked" : ""}"><span class="medal">${item.icon}</span><span><h3>${esc(item.name)}</h3><p>${esc(item.desc)}</p></span></article>`).join("")}</div><div class="section-head"><div><h2>ประวัติสนามสอบ</h2></div></div>${state.examHistory.length ? state.examHistory.slice(0,8).map(item => `<div class="review-card pixel-box"><div><h3>${item.pct}% • ${item.score}/${item.total}</h3><p>${esc(item.date)}</p></div></div>`).join("") : '<div class="empty">ยังไม่มีประวัติสนามสอบ</div>'}</div></div></section>`;
}

function openSettings(){
  state = loadState();
  openModal(`<h2 id="modalTitle">⚙ ตั้งค่าเกม</h2><div class="setting-row"><span id="musicSettingLabel">เพลงประกอบ</span><button class="btn small ${state.settings.music ? "mint" : "dark"}" id="setMusic" aria-label="เพลงประกอบ: ${state.settings.music ? "เปิดอยู่ กดเพื่อปิด" : "ปิดอยู่ กดเพื่อเปิด"}">${state.settings.music ? "เปิด" : "ปิด"}</button></div><div class="setting-row"><span id="soundSettingLabel">เสียงเอฟเฟกต์</span><button class="btn small ${state.settings.sound ? "mint" : "dark"}" id="setSound" aria-label="เสียงเอฟเฟกต์: ${state.settings.sound ? "เปิดอยู่ กดเพื่อปิด" : "ปิดอยู่ กดเพื่อเปิด"}">${state.settings.sound ? "เปิด" : "ปิด"}</button></div><div class="setting-row"><label for="volume">ระดับเสียง</label><input id="volume" type="range" min="0" max="1" step="0.05" value="${state.settings.volume}"></div><div class="setting-row"><label for="reduce">ลดการเคลื่อนไหว</label><input id="reduce" type="checkbox" ${state.settings.reduced ? "checked" : ""}></div><div class="setting-row"><span>เวอร์ชันคัมภีร์</span><b>${D.version} • ${D.questions.length} ข้อ</b></div><p><button class="btn small red" id="resetData">เริ่มความคืบหน้าใหม่</button></p>`);
  $("#setMusic").onclick = () => { toggleMusic(); openSettings(); };
  $("#setSound").onclick = () => { toggleSound(); openSettings(); };
  $("#volume").oninput = event => { state.settings.volume = Number(event.target.value); saveState(); };
  $("#reduce").onchange = event => { state.settings.reduced = event.target.checked; saveState(); };
  $("#resetData").onclick = () => {
    if(confirm("ล้างความคืบหน้า คะแนน และประวัติทั้งหมดหรือไม่?")){
      localStorage.removeItem(STORAGE);
      state = clone(defaults);
      resetDaily();
      closeModal();
      go("home");
      showToast("เริ่มการเดินทางใหม่แล้ว");
    }
  };
}

function bindGlobal(){
  $$('[data-view]').forEach(button => button.addEventListener("click",() => { sfx.select(); go(button.dataset.view); }));
  $("#musicBtn").onclick = toggleMusic;
  $("#soundBtn").onclick = toggleSound;
  $("#settingsBtn").onclick = openSettings;
  $("#modalClose").onclick = closeModal;
  modal.addEventListener("click",event => { if(event.target === modal) closeModal(); });
  document.addEventListener("keydown",event => {
    if(!modal.classList.contains("hidden")){
      if(event.key === "Escape"){
        event.preventDefault();
        closeModal();
        return;
      }
      if(event.key === "Tab"){
        const focusables = modalFocusables();
        if(!focusables.length){ event.preventDefault(); return; }
        const first = focusables[0];
        const last = focusables[focusables.length-1];
        if(event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))){
          event.preventDefault();
          last.focus();
        }else if(!event.shiftKey && document.activeElement === last){
          event.preventDefault();
          first.focus();
        }
      }
      return;
    }
    if(battle && !battle.locked && ["1","2","3","4"].includes(event.key)){
      battle.selected = Number(event.key) - 1;
      renderBattle();
    }
    if(battle && event.key === "Enter" && battle.selected !== null && !battle.locked) submitBattle();
  });
  window.addEventListener("storage",event => { if(event.key === STORAGE) refreshState(); });
  window.addEventListener("teacherquest:local-state",refreshState);
  document.addEventListener("pointerdown",() => { if(state.settings.music) startMusic(); },{once:true});
}

function init(){
  resetDaily();
  const errors = validateData();
  $("#avatarArt").innerHTML = '<div class="pixel-head"></div>';
  bindGlobal();
  updateHud();
  if(errors.length){
    console.error(errors);
    view.innerHTML = `<section class="panel pixel-box"><h2>พบข้อผิดพลาดในคลังข้อสอบ</h2><pre>${esc(errors.join("\n"))}</pre></section>`;
    return;
  }
  go("home");
}

init();
})();
