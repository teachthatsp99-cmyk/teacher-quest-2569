(()=>{
"use strict";

const D = window.GAME_DATA;
const ECONOMY = window.TeacherQuestEconomyCore;
if(!ECONOMY) throw new Error("TeacherQuestEconomyCore must load before app.js");
const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const view = $("#view");
const modal = $("#modal");
const modalBody = $("#modalBody");
const toast = $("#toast");
const authGate = $("#authGate");
const authGateButton = $("#authGateGoogle");
const authGateButtonText = $("#authGateButtonText");
const authGateStatus = $("#authGateStatus");
const protectedSurfaces = [$(".topbar"),$(".app-shell")].filter(Boolean);
const modalBackground = [$(".topbar"),$(".app-shell")].filter(Boolean);
const STORAGE = "teacherQuest2569_v3";
const letters = ["ก","ข","ค","ง"];
const ROUND_COUNTS = Object.freeze({quick:10,zone:10,boss:15,all:15,law:12,weak:10,complete:20});
const RAID_EMOTES = Object.freeze({hi:"HI!",go:"ลุย!",help:"ช่วย!",wow:"สุดยอด!",gg:"GG"});
const clone = value => JSON.parse(JSON.stringify(value));
const today = () => new Date().toLocaleDateString("sv-SE");
const shuffle = items => items.slice().sort(() => Math.random() - 0.5);
const clamp = (number,min,max) => Math.max(min,Math.min(max,number));
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
})[char]);
const MODULE_PIXEL_ART = Object.freeze({
  learn:["01100110","12211221","12211221","12211221","12211221","12211221","01111110","00011000"],
  curriculum:["01111110","01222210","01100110","01222210","01100110","01222210","01111110","00000000"],
  measure:["00000000","01111110","01212110","01111110","00001100","00011000","00110000","00000000"],
  research:["00111000","01000100","01020100","01000100","00111000","00011000","00101100","01000110"],
  psych:["00111100","01211210","12122121","12211221","01222210","00111100","00011000","00100100"],
  media:["01111110","01000010","01222210","01212210","01222210","01000010","01111110","00100100"],
  classroom:["00111100","01111110","01011010","01011010","01111110","01222210","01200210","01111110"],
  profession:["00011000","01111110","00111100","01011010","10011001","01111110","00111100","00011000"],
  eduact:["00111100","01111110","01011010","01011010","01011010","01111110","12222221","11111111"],
  child:["00100100","01211210","12222221","12222221","01222210","00122100","00011000","00000000"],
  disability:["00011000","00122100","00011000","01111110","00122100","00122100","01000010","10000001"],
  civil:["00111100","01111110","01011010","01011010","01111110","00111100","01111110","11000011"],
  ksp:["00011000","10011001","01122110","00122100","11222211","00122100","01000010","00000000"],
  voclaw:["01000010","00100100","00011000","01111110","01222210","00111100","00100100","01000010"],
  culture:["00011000","00122100","01222210","12211221","01222210","00122100","00011000","00100100"],
  english:["01111110","01000010","01222110","01000010","01222110","01000010","01111110","00011000"],
  policy:["01100000","01210000","01221000","01222100","01221000","01210000","01100000","01000000"],
  student:["00011000","00122100","01222210","12211221","01222210","00122100","01111110","01000010"],
  admin:["01111110","01022010","01022010","01111110","01211210","01211210","01111110","11000011"],
  quality:["11111111","10000001","10222201","10211201","10222201","10000001","11111111","00111100"],
  current:["00122100","12222221","01211210","12222221","01211210","00122100","00011000","00100100"]
});
const MUSIC_THEMES = Object.freeze({
  menu:{label:"ฐานบัญชาการ",bpm:104,wave:"triangle",lead:[262,0,330,392,330,294,262,0,294,0,349,440,392,349,330,0],bass:[131,131,110,123,131,147,110,123],drums:.25},
  map:{label:"แผนที่ภารกิจ",bpm:112,wave:"triangle",lead:[330,392,440,0,392,330,294,330,349,440,494,0,440,392,330,294],bass:[131,147,165,147,139,165,185,147],drums:.3},
  codex:{label:"หอคัมภีร์",bpm:92,wave:"sine",lead:[262,0,294,330,0,392,349,330,247,0,294,349,0,330,294,262],bass:[98,110,131,123,98,110,123,131],drums:.08},
  plaza:{label:"ลานสถาบันครูเควสต์",bpm:110,wave:"triangle",lead:[392,0,440,523,494,440,392,330,349,0,392,440,523,494,440,0],bass:[131,165,147,123,139,165,147,131],drums:.22},
  district0:{label:"หมู่บ้านครูนักคิด",bpm:116,wave:"triangle",lead:[262,330,392,0,440,392,330,294,262,294,330,0,392,440,392,330],bass:[131,165,147,131,131,147,165,123],drums:.28},
  district1:{label:"นครนวัตกรรม",bpm:132,wave:"square",lead:[330,392,494,659,0,587,494,392,349,440,523,698,0,659,523,440],bass:[165,196,147,196,175,220,165,196],drums:.42,leadGain:.017},
  district2:{label:"ป่าคัมภีร์กฎหมาย",bpm:98,wave:"triangle",lead:[220,0,262,294,330,0,294,262,208,0,247,294,330,294,247,0],bass:[110,98,104,123,110,98,104,92],drums:.16},
  district3:{label:"ป้อมอนาคตการศึกษา",bpm:124,wave:"sine",lead:[294,370,440,0,554,440,370,330,277,349,415,0,523,415,349,294],bass:[147,185,139,165,147,175,139,185],drums:.34},
  training:{label:"สนามฝึก",bpm:140,wave:"square",lead:[330,392,440,392,494,440,392,330,349,440,523,440,587,523,440,392],bass:[131,165,147,165,139,175,147,196],drums:.58,leadGain:.018},
  exam:{label:"สนามสอบ",bpm:126,wave:"triangle",lead:[220,262,0,294,330,294,262,247,220,262,0,330,349,330,294,262],bass:[110,123,131,98,110,131,123,104],drums:.35},
  battle:{label:"การต่อสู้",bpm:158,wave:"square",lead:[220,220,262,294,330,294,262,247,220,262,294,349,330,294,262,247],bass:[110,110,98,123,110,131,98,123],drums:.78,leadGain:.017,bassGain:.012},
  boss:{label:"ศึกบอส",bpm:178,wave:"sawtooth",lead:[196,233,262,294,196,311,294,262,185,220,262,311,349,311,262,233],bass:[98,87,93,82,98,104,87,93],drums:1,leadGain:.014,bassGain:.014},
  victory:{label:"ชัยชนะ",bpm:146,wave:"square",lead:[262,330,392,523,330,392,523,659,392,494,587,784,659,587,523,0],bass:[131,165,196,262,165,196,247,262],drums:.55,leadGain:.019},
  retreat:{label:"ถอยตั้งหลัก",bpm:82,wave:"triangle",lead:[262,0,247,220,0,196,185,0,220,0,208,196,0,185,175,0],bass:[98,92,87,82,98,92,87,82],drums:.08}
});
const MUSIC_VARIANT_STEPS = Object.freeze([0,2,3,5,7]);

function moduleIconMarkup(item,className=""){
  const pattern = MODULE_PIXEL_ART[item?.id] || MODULE_PIXEL_ART.learn;
  const pixels = pattern.flatMap((row,y) => [...row].map((value,x) => value === "0" ? "" : `<rect class="pixel-tone-${value}" x="${x}" y="${y}" width="1" height="1"/>`)).join("");
  return `<svg class="pixel-module-icon ${className}" data-module-icon="${esc(item?.id || "learn")}" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${pixels}</svg>`;
}
window.teacherQuestModuleIcon = moduleIconMarkup;
const questionType = question => question.category || question.type;
const sourceMarkup = question => {
  const status={
    "official-current":["ตรงจากแหล่งทางการ","official"],
    "exact-reference":["ตรงกับข้อในเอกสาร","exact"],
    "page-reference":["พบหัวข้อในหน้าเอกสาร","page"],
    "topic-reference":["อ้างอิงหัวข้อในเอกสาร","topic"],
    "applied-reference":["คำถามประยุกต์จากหัวข้อ","applied"]
  }[question.verificationStatus] || ["มีแหล่งสำหรับตรวจเทียบ","topic"];
  const link = question.sourceUrl
    ? `<a href="${esc(question.sourceUrl)}" target="_blank" rel="noopener" aria-label="${question.sourceDirect ? "เปิดหน้าต้นทางตรง" : "เปิดแหล่งตรวจเทียบ"}ของข้อ ${question.id}">${question.sourceDirect ? "เปิดหน้าต้นทางตรง" : "เปิดแหล่งตรวจเทียบ"} ↗</a>`
    : "";
  const evidenceNote=question.sourceDirect
    ? `ตรวจข้อมูล ${esc(question.verifiedAt || D.verifiedAt)}`
    : question.verificationStatus === "page-reference" || question.verificationStatus === "exact-reference"
      ? "ระบุตำแหน่งจาก PDF ที่ส่ง • ลิงก์ภายนอกใช้ตรวจเทียบ"
      : "ลิงก์ภายนอกใช้สำหรับตรวจเทียบ ไม่ใช่หน้าของไฟล์ PDF";
  return `<div class="citation-card ${status[1]}"><div class="citation-head"><span>หลักฐานข้อ ${question.id}</span><strong>${status[0]}</strong></div><p><b>เอกสาร:</b> ${esc(question.sourceDocument || question.source)}</p><p><b>ตำแหน่ง:</b> ${esc(question.sourceLocator || question.type)}</p><div class="citation-foot"><span>${evidenceNote}</span>${link}</div></div>`;
};
window.teacherQuestSourceMarkup=sourceMarkup;

const defaults = {
  xp:0,
  coins:0,
  maxCombo:0,
  records:{},
  bookmarks:[],
  examHistory:[],
  raidWins:0,
  raidRewards:[],
  economy:ECONOMY.defaults(),
  daily:{date:today(),count:0},
  settings:{music:true,sound:true,volume:.35,reduced:false},
  lastModule:"all"
};

let state = loadState();
let battle = null;
let raidGame = null;
let raidVictoryTimer = null;
let exam = null;
let examTimer = null;
let toastTimer = null;
let audioContext = null;
let musicTimer = null;
let musicScene = "menu";
let musicSceneLabel = MUSIC_THEMES.menu.label;
let musicStep = 0;
let musicVariant = 0;
let musicUnlocked = false;
const activeMusicNodes = new Set();
let modalPreviousFocus = null;
let adventureInstance = null;
let currentView = "";
let shopFilter = "helper";
let onlineState = window.TeacherQuestOnline?.getState?.() || {
  configured:false,phase:"setup",connected:false,user:null,
  profile:{nickname:"ครูนักผจญภัย",avatar:{}},onlineCount:0,totalPlayers:0,zonePlayers:[],zoneMessages:[],error:""
};

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
    const loaded=mergeDeep(defaults,JSON.parse(localStorage.getItem(STORAGE) || "{}"));
    loaded.economy=ECONOMY.normalize(loaded.economy);
    loaded.coins=Math.max(0,Math.floor(Number(loaded.coins)||0));
    return loaded;
  }catch(error){
    console.warn("Could not load progress",error);
    return clone(defaults);
  }
}

function saveState(){
  state.localUpdatedAt = Date.now();
  localStorage.setItem(STORAGE,JSON.stringify(state));
  window.TeacherQuestOnline?.saveProgress?.();
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

function hasGoogleIdentity(value=onlineState){
  return Boolean(value?.user && !value.user.isAnonymous && value.user.provider==="google");
}

function updateAuthGate(){
  if(!authGate) return;
  const locked=Boolean(onlineState.configured) && !hasGoogleIdentity();
  authGate.hidden=!locked;
  document.body.classList.toggle("auth-locked",locked);
  document.body.classList.remove("auth-checking");
  protectedSurfaces.forEach(element=>{element.inert=locked;});
  if(!locked) return;
  const connecting=onlineState.phase==="connecting";
  authGateButton.disabled=connecting || !window.TeacherQuestOnline;
  authGateButtonText.textContent=connecting ? "กำลังตรวจบัญชี…" : "เข้าสู่ระบบด้วย Google";
  authGateStatus.textContent=onlineState.error || (connecting ? "กำลังเชื่อมต่อ Firebase" : "ต้องเข้าสู่ระบบก่อนเริ่มเล่น");
  if(!connecting) requestAnimationFrame(()=>authGateButton.focus({preventScroll:true}));
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
  const weak = D.questions.filter(needsPractice).length;
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

function needsPractice(question){
  const record = state.records[question.id];
  if(!record) return true;
  const attempts = Number(record.attempts) || 0;
  return !attempts || Boolean(record.lastWrong) || (Number(record.correct) || 0) / attempts < .7;
}

function questionPoolSummary(moduleId="all"){
  const pool = moduleId === "all" ? D.questions : D.questions.filter(question => question.module === moduleId);
  return {
    total:pool.length,
    boss:pool.filter(question => question.difficulty !== "ง่าย").length,
    weak:pool.filter(needsPractice).length
  };
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
  $("#shopShortcut")?.setAttribute("aria-label",`เปิดร้านค้า มี ${state.coins} เหรียญ`);
  $("#rankName").textContent = rankName();
  $("#xpText").textContent = `${progress} / 100`;
  $("#xpBar").style.width = `${progress}%`;
  $("#sideStreak").textContent = state.maxCombo;
  $("#sideMastery").textContent = stats.accuracy;
  $("#dailyQuestBar").style.width = `${clamp(state.daily.count / 10 * 100,0,100)}%`;
  $("#dailyQuestCount").textContent = `${Math.min(state.daily.count,10)} / 10`;
  $("#musicBtn").classList.toggle("off",!state.settings.music);
  refreshMusicButton();
  $("#soundBtn").classList.toggle("off",!state.settings.sound);
  document.body.classList.toggle("no-motion",state.settings.reduced);
  updateOnlineHud();
}

function updateOnlineHud(){
  const button=$("#onlineBtn");
  if(!button) return;
  const phase=onlineState.phase || "setup";
  const profile=onlineState.profile || {nickname:"ครูนักผจญภัย",avatar:{}};
  const label=phase==="online"
    ? `${onlineState.onlineCount || 1} ออนไลน์`
    : phase==="connecting" ? "กำลังเชื่อม"
      : phase==="signin-required" ? "ต้องเข้าสู่ระบบ"
        : phase==="error" ? "ออนไลน์ขัดข้อง" : "ตั้งค่าออนไลน์";
  $("#onlineCount").textContent=label;
  $("#playerName").textContent=profile.nickname || "ครูนักผจญภัย";
  $("#avatarArt").innerHTML=window.TeacherQuestOnline?.avatarMarkup?.(gameProfile(profile)) || '<div class="pixel-head"></div>';
  button.classList.toggle("online",phase==="online");
  button.classList.toggle("error",phase==="error");
  button.classList.toggle("setup",phase==="setup");
  button.title=phase==="online"
    ? `${label} • นักผจญภัยทั้งหมด ${onlineState.totalPlayers || 1} คน`
    : onlineState.error || (phase==="setup" ? "แต่งตัวได้ทันที • ต้องผูก Firebase เพื่อพบผู้เล่นอื่น" : "กำลังเชื่อม Firebase");
  const adventureStatus=$("#adventureOnlineStatus");
  if(adventureStatus){
    adventureStatus.classList.toggle("online",phase==="online");
    adventureStatus.querySelector("span:last-child").textContent=phase==="online"
      ? `พื้นที่นี้ ${Math.max(1,(onlineState.zonePlayers?.length || 0)+1)} คน`
      : phase==="setup" ? "โหมดออฟไลน์" : phase==="signin-required" ? "รอเข้าสู่ระบบ" : phase==="error" ? "เชื่อมต่อขัดข้อง" : "กำลังเชื่อม";
  }
  const chatInput=$("#adventureChatInput");
  const chatSubmit=$("#adventureChatForm button[type='submit']");
  if(chatInput) chatInput.disabled=phase!=="online";
  if(chatSubmit) chatSubmit.disabled=phase!=="online";
  const adminButton=$("#adminTestBtn");
  if(adminButton) adminButton.hidden=!onlineState.isAdmin;
  updateVoiceHud();
  updateAuthGate();
}

function updateVoiceHud(){
  const voice=onlineState.voice || {supported:false,enabled:false,permission:"idle",talking:false,nearby:0,peerCount:0,peers:[],error:""};
  const panel=$("#adventureVoice");
  if(!panel) return;
  panel.classList.toggle("is-enabled",Boolean(voice.enabled));
  panel.classList.toggle("is-talking",Boolean(voice.talking));
  const toggle=$("#adventureVoiceEnable");
  const talk=$("#adventureVoiceTalk");
  const status=$("#adventureVoiceStatus");
  if(toggle){
    toggle.disabled=onlineState.phase!=="online" || !voice.supported || voice.permission==="requesting";
    toggle.textContent=voice.permission==="requesting"?"กำลังขอสิทธิ์…":voice.enabled?"ปิด Voice":"เปิด Voice";
  }
  if(talk){
    talk.disabled=!voice.enabled;
    talk.setAttribute("aria-pressed",String(Boolean(voice.talking)));
    talk.textContent=voice.talking?"กำลังพูด… ปล่อยเพื่อหยุด":"กดค้างเพื่อพูด • V";
  }
  if(status) status.textContent=voice.error || (!voice.supported?"อุปกรณ์นี้ไม่รองรับ":voice.enabled?`${voice.peerCount||0}/${voice.nearby||0} คนเชื่อมเสียง`:"ไมค์ปิด");
  const peers=$("#adventureVoicePeers");
  if(peers){
    peers.innerHTML=(voice.peers||[]).map(peer=>`<button type="button" data-voice-mute="${esc(peer.uid)}" aria-pressed="${String(Boolean(peer.muted))}" title="${peer.muted?"เปิด":"ปิด"}เสียง ${esc(peer.nickname)}"><span>${peer.connected?"●":"○"} ${esc(peer.nickname)}</span><small>${peer.distance} ระยะ • ${peer.muted?"ปิดเสียง":"ได้ยิน"}</small></button>`).join("") || `<p>${voice.enabled?"เดินเข้าใกล้ผู้เล่นที่เปิด Voice เพื่อเชื่อมเสียง":"เปิด Voice เมื่อต้องการคุยกับผู้เล่นใกล้ตัว"}</p>`;
  }
}

function openVoiceConsent(){
  openModal(`<div class="eyebrow">OPT-IN PROXIMITY VOICE • WEBRTC</div><h2 id="modalTitle">เปิดเสียงใกล้ตัวหรือไม่?</h2><p>ระบบจะขอใช้ไมโครโฟนหลังคุณกดยืนยัน และส่งเสียงตรงระหว่างผู้เล่นด้วย WebRTC เฉพาะผู้เล่นที่เปิด Voice และอยู่ในระยะ 360 เท่านั้น</p><ul class="voice-consent-list"><li>ไมค์เริ่มต้นเป็นปิด ต้องกดค้างปุ่มพูดหรือปุ่ม V จึงส่งเสียง</li><li>Firebase เก็บเฉพาะข้อมูลจับคู่ชั่วคราว ไม่บันทึกไฟล์เสียง</li><li>ปิด Voice หรือปิดเสียงผู้เล่นแต่ละคนได้ทุกเวลา</li><li>แนะนำให้ใช้หูฟัง และอย่าเปิดเผยข้อมูลส่วนตัว</li></ul><div class="modal-actions"><button class="btn mint" type="button" id="voiceConsentAllow">อนุญาตและเปิด Voice</button><button class="btn dark" type="button" id="voiceConsentCancel">ยังไม่เปิด</button></div>`);
  $("#voiceConsentCancel").onclick=closeModal;
  $("#voiceConsentAllow").onclick=async()=>{
    const button=$("#voiceConsentAllow");button.disabled=true;button.textContent="กำลังขอสิทธิ์ไมค์…";
    try{onlineState=await window.TeacherQuestOnline.enableProximityVoice();closeModal();showToast("เปิด Voice แล้ว • กดค้าง V เพื่อพูด");}
    catch(error){button.disabled=false;button.textContent="ลองอนุญาตอีกครั้ง";showToast(error?.message||"เปิด Voice ไม่สำเร็จ");}
  };
}

function showToast(message){
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"),2200);
}

function openAdminTestPanel(){
  onlineState=window.TeacherQuestOnline?.getState?.()||onlineState;
  if(!onlineState.isAdmin){showToast("บัญชีนี้ไม่มีสิทธิ์ Test Admin");return;}
  openModal(`<div class="eyebrow">TEST ADMIN • PRIVATE ROLE</div><h2 id="modalTitle">แผงทดสอบเกม</h2><p>เครื่องมือเหล่านี้เปลี่ยนเฉพาะความคืบหน้าและตัวละครของบัญชีคุณเอง ไม่สามารถอ่านหรือแก้ข้อมูลส่วนตัวของผู้เล่นอื่น</p><div class="admin-test-grid"><button class="btn mint" type="button" data-admin-action="resources">+5,000 Coin / +2,000 EXP</button><button class="btn sky" type="button" data-admin-action="unlock">ปลดล็อกไอเทมทั้งหมด</button><button class="btn" type="button" data-admin-action="reveal">เปิดแผนที่โลกปัจจุบัน</button><button class="btn dark" type="button" data-admin-map="academy-plaza">วาร์ปศูนย์กลาง</button><button class="btn dark" type="button" data-admin-map="training-grove">วาร์ปป่าฝึก</button><button class="btn dark" type="button" data-admin-map="law-archive">วาร์ปโลกกฎหมาย</button><button class="btn dark" type="button" data-admin-map="future-campus">วาร์ปโลกอนาคต</button></div><p class="admin-test-note">การเพิ่มทรัพยากรและปลดล็อกจะบันทึกขึ้น Cloud Save ของบัญชีนี้ ใช้สำหรับทดสอบก่อนเปิดจริงเท่านั้น</p>`);
  $$('[data-admin-action]',modalBody).forEach(button=>button.onclick=()=>{
    if(!window.TeacherQuestOnline?.getState?.().isAdmin){closeModal();showToast("สิทธิ์ Test Admin หมดอายุ กรุณาเข้าสู่ระบบใหม่");return;}
    if(button.dataset.adminAction==="resources"){
      state.coins+=5000;state.xp+=2000;saveState();showToast("เพิ่มทรัพยากรทดสอบแล้ว");
    }else if(button.dataset.adminAction==="unlock"){
      const owned=ECONOMY.catalog.filter(item=>item.type==="unlock").map(item=>item.id);
      const inventory=Object.fromEntries(ECONOMY.catalog.filter(item=>item.type==="consumable").map(item=>[item.id,ECONOMY.maxConsumable]));
      state.economy=ECONOMY.normalize({...state.economy,owned,inventory});saveState();showToast("ปลดล็อกไอเทมและผู้ช่วยทั้งหมดแล้ว");
    }else if(button.dataset.adminAction==="reveal"){
      const result=adventureInstance?.revealCurrentMap?.();showToast(result?`เปิดแผนที่ ${result.explored}/${result.total} ช่องแล้ว`:"เปิดโลกผจญภัยก่อนใช้คำสั่งนี้");
    }
  });
  $$('[data-admin-map]',modalBody).forEach(button=>button.onclick=()=>{
    if(!window.TeacherQuestOnline?.getState?.().isAdmin){closeModal();showToast("บัญชีนี้ไม่มีสิทธิ์ Test Admin");return;}
    const ok=window.teacherQuestAdventureDebug?.switchMap?.(button.dataset.adminMap);
    if(ok){closeModal();showToast("วาร์ปไปพื้นที่ทดสอบแล้ว");}
    else showToast("เปิดโลกผจญภัยก่อนใช้คำสั่งนี้");
  });
}

function gameProfile(value=onlineState.profile){
  const profile=clone(value || {nickname:"ครูนักผจญภัย",avatar:{}});
  profile.avatar={...(profile.avatar||{}),accessory:state.economy?.equipped?.accessory || "none"};
  return profile;
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
  const initialFocus = $("button,input,select",modalBody) || $("#modalClose");
  initialFocus?.focus({preventScroll:true});
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

function musicTone(frequency,duration,type,gain){
  const context = ensureAudio();
  if(!context) return;
  const oscillator = context.createOscillator();
  const volume = context.createGain();
  const now = context.currentTime;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency,now);
  volume.gain.setValueAtTime(Math.max(.0001,gain * state.settings.volume),now);
  volume.gain.exponentialRampToValueAtTime(.001,now + duration);
  oscillator.connect(volume).connect(context.destination);
  const node = {oscillator,volume};
  activeMusicNodes.add(node);
  oscillator.onended = () => activeMusicNodes.delete(node);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function stopActiveMusicNodes(){
  const context = audioContext;
  activeMusicNodes.forEach(({oscillator,volume}) => {
    try{
      const now = context?.currentTime || 0;
      volume.gain.cancelScheduledValues(now);
      volume.gain.setTargetAtTime(.001,now,.008);
      oscillator.stop(now + .04);
    }catch(error){ /* The oscillator may already have ended. */ }
  });
  activeMusicNodes.clear();
}

function musicInterval(theme){ return Math.round(60000 / theme.bpm / 2); }

function playMusicStep(){
  if(!state.settings.music) return;
  const theme = MUSIC_THEMES[musicScene] || MUSIC_THEMES.menu;
  const step = musicStep % theme.lead.length;
  const beatSeconds = musicInterval(theme) / 1000;
  const semitones = MUSIC_VARIANT_STEPS[musicVariant % MUSIC_VARIANT_STEPS.length] || 0;
  const transpose = frequency => frequency * Math.pow(2,semitones/12);
  const lead = theme.lead[step];
  if(lead) musicTone(transpose(lead),Math.min(.22,beatSeconds*.82),theme.wave,theme.leadGain || .02);
  if(step % 2 === 0){
    const bass = theme.bass[(step/2) % theme.bass.length];
    if(bass) musicTone(transpose(bass),Math.min(.3,beatSeconds*1.45),"triangle",theme.bassGain || .01);
  }
  if(theme.drums && step % 4 === 0) musicTone(58,Math.min(.075,beatSeconds*.3),"sine",.008*theme.drums);
  if(theme.drums > .3 && step % 2 === 1) musicTone(1450,Math.min(.025,beatSeconds*.12),"square",.0022*theme.drums);
  if(theme.drums > .65 && step % 8 === 6) musicTone(118,Math.min(.055,beatSeconds*.22),"sawtooth",.004*theme.drums);
  musicStep++;
}

function startMusic({unlock=false}={}){
  if(unlock) musicUnlocked = true;
  if(!musicUnlocked || !state.settings.music || musicTimer) return;
  const context = ensureAudio();
  if(!context) return;
  if(context.state === "suspended") context.resume();
  playMusicStep();
  musicTimer = setInterval(playMusicStep,musicInterval(MUSIC_THEMES[musicScene] || MUSIC_THEMES.menu));
}

function stopMusic({reset=true}={}){
  clearInterval(musicTimer);
  musicTimer = null;
  stopActiveMusicNodes();
  if(reset) musicStep = 0;
}

function refreshMusicButton(){
  const button = $("#musicBtn");
  if(!button) return;
  const status = state.settings.music ? "เปิดอยู่" : "ปิดอยู่";
  button.title = `เพลง: ${musicSceneLabel} • ${status}`;
  button.setAttribute("aria-label",`${state.settings.music ? "ปิด" : "เปิด"}เพลงประกอบ ขณะนี้เป็นเพลง${musicSceneLabel}`);
}

function setMusicScene(scene,label="",variant=0){
  const nextScene = MUSIC_THEMES[scene] ? scene : "menu";
  const nextVariant = Math.abs(Number(variant) || 0) % MUSIC_VARIANT_STEPS.length;
  const changed = nextScene !== musicScene || nextVariant !== musicVariant;
  const wasPlaying = Boolean(musicTimer);
  musicScene = nextScene;
  musicVariant = nextVariant;
  musicSceneLabel = label || MUSIC_THEMES[nextScene].label;
  document.body.dataset.musicScene = musicScene;
  document.body.dataset.musicLabel = musicSceneLabel;
  document.body.dataset.musicBpm = String(MUSIC_THEMES[musicScene].bpm);
  refreshMusicButton();
  if(changed && wasPlaying){
    stopMusic();
    startMusic();
  }
}

function unlockMusic(){ startMusic({unlock:true}); }

function toggleMusic(){
  state = loadState();
  state.settings.music = !state.settings.music;
  state.settings.music ? startMusic({unlock:true}) : stopMusic();
  saveState();
  showToast(state.settings.music ? `เปิดเพลง ${musicSceneLabel} แล้ว` : "ปิดเพลงแล้ว");
}
function toggleSound(){
  state = loadState();
  state.settings.sound = !state.settings.sound;
  saveState();
  if(state.settings.sound) sfx.select();
  showToast(state.settings.sound ? "เปิดเสียงเอฟเฟกต์แล้ว" : "ปิดเสียงเอฟเฟกต์แล้ว");
}

function fighterArt(isPlayer=true){
  if(!isPlayer) return '<div class="pixel-fighter"><i class="head"></i><i class="body"></i><i class="weapon"></i></div>';
  const avatar=window.TeacherQuestOnline?.normalizeProfile?.(gameProfile())?.avatar || gameProfile().avatar || {};
  const style=`--avatar-skin:${esc(avatar.skin || "#e8b989")};--avatar-hair:${esc(avatar.hair || "#24182f")};--avatar-shirt:${esc(avatar.shirt || "#3d68af")};--avatar-accent:${esc(avatar.accent || "#ffd45c")}`;
  return `<div class="pixel-fighter custom-fighter" data-hair-style="${esc(avatar.style || "short")}" data-accessory="${esc(avatar.accessory || "none")}" style="${style}"><i class="fighter-hair"></i><i class="head"></i><i class="body"></i><i class="weapon"></i></div>`;
}
function heroArt(){
  return `<div class="hero-art"><div class="portal"></div><div class="teacher-sprite"><i class="hair"></i><i class="face"></i><i class="body"></i><i class="book"></i><i class="legs"></i></div><div class="float-badge one">${D.modules.length} ดินแดน</div><div class="float-badge two">${D.questions.length} ภารกิจ</div></div>`;
}

function bindCommon(){
  $$('[data-go]').forEach(button => button.onclick = () => go(button.dataset.go));
  $$('[data-module]').forEach(button => button.onclick = () => openZone(button.dataset.module));
}

function go(name,options={}){
  if(currentView==="adventure" && name!=="adventure") void window.TeacherQuestOnline?.leaveWorld?.();
  if(adventureInstance){
    adventureInstance.destroy();
    adventureInstance = null;
  }
  $$('.nav-btn').forEach(button => button.classList.toggle("active",button.dataset.view === name));
  view.className = "view";
  clearInterval(examTimer);
  examTimer = null;
  if(name !== "practice") battle = null;
  if(name !== "exam") exam = null;
  currentView=name;
  const routeMusic = {home:"menu",world:"map",practice:"training",exam:"exam",review:"training",codex:"codex",shop:"menu",profile:"menu",raid:"boss"};
  if(name !== "adventure") setMusicScene(routeMusic[name] || "menu");
  const routes = {
    adventure:renderAdventure,
    home:renderHome,
    world:renderWorld,
    practice:() => renderPractice(options),
    exam:renderExamLobby,
    review:renderReview,
    codex:renderCodex,
    shop:renderShop,
    profile:renderProfile,
    raid:renderRaid
  };
  (routes[name] || renderHome)();
  window.scrollTo({top:0,behavior:"smooth"});
}

function renderAdventure(){
  const stats = totalStats();
  view.innerHTML = `
    <section class="adventure-page" id="adventureRoot">
      <header class="adventure-intro">
        <div>
          <div class="eyebrow">ADVENTURE MODE • PIXEL WORLD</div>
          <h1 id="adventureWorldTitle">โลกครูเควสต์</h1>
          <p id="adventureInstructions">มือถือแตะพื้นหรือใช้ D-pad • คีย์บอร์ดใช้ WASD/ลูกศร (ภาษาไทยใช้ ไฟหก) • E/ำ หรือ ENTER โต้ตอบ • SPACE หรือ J/่ กระโดด</p>
        </div>
        <div class="adventure-intro-actions">
          <button class="btn small sky" type="button" id="adminTestBtn" ${onlineState.isAdmin?"":"hidden"}>★ Test Admin</button>
          <button class="btn small pink" data-go="raid">⚡ เรด Co-op</button>
          <button class="btn small mint" data-adventure-map>▤ แผนที่สำรวจ</button>
          <button class="btn small dark" data-adventure-reset>⌂ กลับจุดเริ่ม</button>
          <button class="btn small dark" data-go="home">◆ ฐานบัญชาการ</button>
        </div>
      </header>
      <div class="adventure-game pixel-box">
        <canvas id="adventureCanvas" class="adventure-canvas" width="960" height="540" tabindex="0" role="img" aria-label="โลกผจญภัย Pixel Art ที่ควบคุมตัวละครเดินสำรวจได้" aria-describedby="adventureInstructions">เบราว์เซอร์นี้ไม่รองรับ Canvas กรุณาใช้เมนูแผนที่ภารกิจแทน</canvas>
        <div class="adventure-hud" aria-hidden="true">
          <div class="adventure-hud-card">
            <small>ตำแหน่งปัจจุบัน</small>
            <strong id="adventureDistrict">ลานสถาบันครูเควสต์</strong>
            <p id="adventureObjective">กำลังค้นหาภารกิจแนะนำ…</p>
            <div class="adventure-progress"><div class="meter"><i id="adventureProgressBar" style="width:${Math.round(stats.attempted / D.questions.length * 100)}%"></i></div><span id="adventureProgressText">สำรวจคลัง ${stats.attempted}/${D.questions.length} ข้อ</span></div>
          </div>
          <div class="adventure-mini-wrap">
            <canvas id="adventureMiniMap" width="176" height="124" role="img" aria-label="มินิแมป ผู้เล่นของคุณมีกรอบสีทอง เพื่อนมีสีตามตัวละคร"></canvas>
            <span class="adventure-mini-legend"><b>◆ คุณ</b><i>■ เพื่อน</i><i>▣ จุดสำคัญ</i></span>
            <span class="adventure-mini-label">MINI MAP</span>
          </div>
        </div>
        <div class="adventure-prompt" id="adventurePrompt" role="status" aria-live="polite"></div>
        <div class="adventure-online-badge ${onlineState.phase==="online" ? "online" : ""}" id="adventureOnlineStatus"><span class="online-dot" aria-hidden="true"></span><span>${onlineState.phase==="online" ? `พื้นที่นี้ ${Math.max(1,(onlineState.zonePlayers?.length || 0)+1)} คน` : "โหมดออฟไลน์"}</span></div>
        <section class="adventure-chat is-collapsed" id="adventureChat" aria-label="แชตผู้เล่นที่อยู่ใกล้กัน">
          <button class="adventure-chat-toggle" type="button" id="adventureChatToggle" aria-expanded="false"><span>▣ คุยใกล้ตัว</span><b id="adventureChatNearby">0 คน</b></button>
          <div class="adventure-chat-body">
            <div class="adventure-chat-feed" id="adventureChatFeed" role="log" aria-live="polite"><p>เดินเข้าใกล้เพื่อนเพื่อเริ่มคุยกัน</p></div>
            <form class="adventure-chat-form" id="adventureChatForm">
              <label class="sr-only" for="adventureChatInput">ข้อความถึงผู้เล่นใกล้ตัว</label>
              <input id="adventureChatInput" maxlength="80" autocomplete="off" placeholder="พิมพ์ข้อความใกล้ตัว…" ${onlineState.phase==="online"?"":"disabled"}>
              <button type="submit" ${onlineState.phase==="online"?"":"disabled"}>ส่ง</button>
            </form>
            <small>ได้ยินในระยะ 360 • ล่าสุดคนละ 1 ข้อความ • กดชื่อเพื่อปิดเสียง</small>
            <section class="adventure-voice" id="adventureVoice" aria-label="เสียงพูดคุยกับผู้เล่นใกล้ตัว">
              <header><strong>◉ VOICE ใกล้ตัว</strong><span id="adventureVoiceStatus" role="status">ไมค์ปิด</span></header>
              <div class="adventure-voice-controls"><button type="button" id="adventureVoiceEnable">เปิด Voice</button><button type="button" id="adventureVoiceTalk" aria-pressed="false" disabled>กดค้างเพื่อพูด • V</button></div>
              <div class="adventure-voice-peers" id="adventureVoicePeers"><p>เปิด Voice เมื่อต้องการคุยกับผู้เล่นใกล้ตัว</p></div>
              <small>เสียง P2P ไม่ถูกบันทึก • สูงสุด 4 คนใกล้ตัว • ปล่อยปุ่มเพื่อปิดไมค์</small>
            </section>
          </div>
        </section>
        <section class="adventure-dialogue" id="adventureDialogue" role="dialog" aria-modal="false" aria-labelledby="adventureDialogueTitle" aria-hidden="true" hidden>
          <div class="adventure-dialogue-head"><div><div class="eyebrow" id="adventureDialogueEyebrow"></div><h2 id="adventureDialogueTitle"></h2></div></div>
          <p id="adventureDialogueText"></p>
          <div class="adventure-dialogue-stats" id="adventureDialogueStats"></div>
          <div class="adventure-dialogue-actions" id="adventureDialogueActions"></div>
        </section>
        <section class="adventure-map-panel" id="adventureMapPanel" role="dialog" aria-modal="false" aria-labelledby="adventureMapTitle" aria-hidden="true" hidden>
          <header class="adventure-map-head"><div><h2 id="adventureMapTitle">แผนที่โลกครูเควสต์</h2><p id="adventureMapDescription">พื้นที่ที่ยังไม่สำรวจจะถูกหมอกปิดไว้</p></div><button class="btn small red" data-map-close>ปิดแผนที่ ×</button></header>
          <div class="adventure-map-grid"></div>
        </section>
        <div class="adventure-mobile-controls" aria-label="ปุ่มควบคุมสำหรับจอสัมผัส">
          <div class="pixel-dpad">
            <button data-move="up" aria-label="เดินขึ้น">▲</button><button data-move="left" aria-label="เดินซ้าย">◀</button><button data-move="right" aria-label="เดินขวา">▶</button><button data-move="down" aria-label="เดินลง">▼</button>
          </div>
          <div class="adventure-action-buttons"><button class="adventure-emote-button" data-emote aria-label="ใช้ท่าทางที่เลือกไว้">C<small>EMOTE</small></button><button class="adventure-jump-button" data-jump aria-label="กระโดดข้ามสิ่งกีดขวาง">B<small>JUMP</small></button><button class="adventure-interact-button" data-interact aria-label="โต้ตอบกับคนหรือประตู">A<small>ACT</small></button></div>
        </div>
      </div>
      <div class="adventure-help" aria-label="วิธีเล่น">
        <div><kbd>แตะ / WASD</kbd><span><strong>เดินสำรวจ</strong>มือถือแตะพื้นได้ • ภาษาไทยใช้ ไ ฟ ห ก</span></div>
        <div><kbd>E / ำ</kbd><span><strong>พูดคุย / เข้าด่าน</strong>ใช้ ENTER ได้โดยไม่ต้องสลับภาษา</span></div>
        <div><kbd>SPACE / J</kbd><span><strong>กระโดด</strong>ข้ามรั้วเตี้ยและเปิดทางลัด</span></div>
        <div><kbd>Q / C</kbd><span><strong>ท่าทาง</strong>ใช้ Emote ที่เลือกจากร้านค้า</span></div>
        <div><kbd>V / ฟ</kbd><span><strong>Push-to-talk</strong>เปิด Voice ก่อน แล้วกดค้างเพื่อพูด</span></div>
        <div><kbd>M / ท</kbd><span><strong>ดูแผนที่</strong>ตรวจความคืบหน้า ${D.modules.length} ด่าน</span></div>
        <div><kbd>ESC</kbd><span><strong>ปิดหน้าต่าง</strong>กลับไปเดินต่อทันที</span></div>
      </div>
    </section>`;
  bindCommon();
  if(typeof window.createTeacherQuestAdventure !== "function"){
    view.innerHTML = `<section class="panel pixel-box"><h2>ไม่สามารถเปิดโลกผจญภัยได้</h2><p>ไฟล์ระบบแผนที่ไม่ถูกโหลด กรุณาเปิดแผนที่ภารกิจแทน</p><button class="btn" data-go="world">เปิดแผนที่ภารกิจ</button></section>`;
    bindCommon();
    return;
  }
  const root = $("#adventureRoot");
  $("#adminTestBtn")?.addEventListener("click",openAdminTestPanel);
  adventureInstance = window.createTeacherQuestAdventure({
    root,
    canvas:$("#adventureCanvas"),
    modules:D.modules,
    getStats:moduleStats,
    getBossCount:id => D.questions.filter(question => question.module === id && question.difficulty !== "ง่าย").length,
    getPlayerProfile:() => gameProfile(),
    getEquippedEmote:() => state.economy.equipped.emote,
    onPlayerState:player => window.TeacherQuestOnline?.updatePresence?.(player),
    onMusicScene:(scene,label) => setMusicScene(scene,label),
    onStartModule:(id,mode) => {
      const total = D.questions.filter(question => question.module === id).length;
      const bossTotal = D.questions.filter(question => question.module === id && question.difficulty !== "ง่าย").length;
      adventureInstance?.destroy();
      adventureInstance = null;
      void window.TeacherQuestOnline?.leaveWorld?.();
      if(mode === "complete") startBattle({mode:"module",module:id,count:total,complete:true,returnView:"adventure",adventureQuest:true});
      else if(mode === "boss") startBattle({mode:"module",module:id,count:Math.min(ROUND_COUNTS.boss,bossTotal),boss:true,returnView:"adventure",adventureQuest:true});
      else startBattle({mode:"module",module:id,count:Math.min(ROUND_COUNTS.zone,total),returnView:"adventure",adventureQuest:true});
    },
    onNavigate:name => go(name)
  });
  adventureInstance.setPlayerProfile?.(gameProfile());
  adventureInstance.setRemotePlayers?.(onlineState.zonePlayers || []);
  adventureInstance.setZoneMessages?.(onlineState.zoneMessages || []);
  const chatToggle=$("#adventureChatToggle");
  chatToggle?.addEventListener("click",()=>{
    const chat=$("#adventureChat");
    const collapsed=chat?.classList.toggle("is-collapsed");
    chatToggle.setAttribute("aria-expanded",String(!collapsed));
    if(!collapsed) $("#adventureChatInput")?.focus();
  });
  $("#adventureChatForm")?.addEventListener("submit",async event=>{
    event.preventDefault();
    const input=$("#adventureChatInput");
    const submit=event.currentTarget.querySelector('button[type="submit"]');
    if(!input?.value.trim()) return;
    input.disabled=true;if(submit)submit.disabled=true;
    try{
      await window.TeacherQuestOnline?.sendProximityMessage?.(input.value);
      input.value="";
      input.focus();
    }catch(error){showToast(error?.message||"ส่งข้อความไม่สำเร็จ");}
    finally{input.disabled=onlineState.phase!=="online";if(submit)submit.disabled=onlineState.phase!=="online";}
  });
  $("#adventureVoiceEnable")?.addEventListener("click",async()=>{
    const voice=window.TeacherQuestOnline?.getState?.().voice;
    if(!voice?.enabled){openVoiceConsent();return;}
    try{onlineState=await window.TeacherQuestOnline.disableProximityVoice();showToast("ปิด Voice และไมโครโฟนแล้ว");}
    catch(error){showToast(error?.message||"ปิด Voice ไม่สำเร็จ");}
  });
  const talkButton=$("#adventureVoiceTalk");
  const stopTalking=()=>window.TeacherQuestOnline?.setVoiceTalking?.(false);
  talkButton?.addEventListener("pointerdown",event=>{
    if(talkButton.disabled) return;
    event.preventDefault();talkButton.setPointerCapture?.(event.pointerId);window.TeacherQuestOnline?.setVoiceTalking?.(true);
  });
  talkButton?.addEventListener("pointerup",stopTalking);
  talkButton?.addEventListener("pointercancel",stopTalking);
  talkButton?.addEventListener("lostpointercapture",stopTalking);
  $("#adventureVoicePeers")?.addEventListener("click",event=>{
    const button=event.target.closest?.("[data-voice-mute]");
    if(!button) return;
    const muted=button.getAttribute("aria-pressed")!=="true";
    window.TeacherQuestOnline?.setVoiceMuted?.(button.dataset.voiceMute,muted);
  });
  updateOnlineHud();
  $("#adventureCanvas")?.focus({preventScroll:true});
}

function zoneHtml(item){
  const stats = moduleStats(item.id);
  const progress = Math.round(stats.done / stats.total * 100);
  const stars = stats.accuracy >= 85 ? "★★★" : stats.accuracy >= 70 ? "★★☆" : stats.done ? "★☆☆" : "☆☆☆";
  const roundCount = Math.min(ROUND_COUNTS.zone,stats.total);
  return `<button class="zone ${stats.accuracy >= 80 ? "mastered" : ""}" data-module="${item.id}"><span class="stars">${stars}</span><span class="zone-no">ZONE ${String(D.modules.indexOf(item)+1).padStart(2,"0")}</span><div class="zone-icon">${moduleIconMarkup(item,"large")}</div><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p><div class="zone-session">ภารกิจหลักครบ ${stats.total} ข้อ • ฝึกด่วน ${roundCount} ข้อ</div><div class="zone-meta"><span>เคยทำ ${stats.done}/${stats.total}</span><span>แม่น ${stats.accuracy}%</span></div><div class="meter"><i style="width:${progress}%"></i></div></button>`;
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
      <div class="hero-actions"><button class="btn" id="quickStart">⚔ ภารกิจด่วน ${ROUND_COUNTS.quick} ข้อ</button><button class="btn pink" data-go="raid">⚡ Multiplayer Raid</button><button class="btn mint" data-go="world">◈ เลือกดินแดน</button><button class="btn dark" data-go="exam">◷ สนามสอบใหญ่</button></div>
    </div>${heroArt()}</div></section>
    <div class="section-head"><div><h2>สถานะการเดินทาง</h2><p>ดูจุดแข็งและภารกิจที่รออยู่</p></div></div>
    <section class="dashboard">
      <div class="stat-card pixel-box"><b>${stats.attempted}</b><span>ข้อที่เผชิญแล้ว</span></div>
      <div class="stat-card pixel-box"><b>${stats.accuracy}%</b><span>ความแม่นยำรวม</span></div>
      <div class="stat-card pixel-box"><b>${state.maxCombo}</b><span>คอมโบสูงสุด</span></div>
      <div class="stat-card pixel-box"><b>${stats.weak}</b><span>ข้อที่ยังต้องฝึก</span></div>
    </section>
    <div class="section-head"><div><h2>ทางลัดฝึกทบทวน</h2><p>เริ่มตอบได้ทันทีโดยไม่เดินเรื่อง; ภารกิจในโลกผจญภัยมีโบนัสเพิ่ม</p></div></div>
    <section class="quest-strip">
      <button class="quest-card pixel-box" id="weakStart"><span class="quest-ico">◎</span><span><h3>ล่าจุดอ่อน</h3><p>ระบบเลือกข้อที่ยังไม่แม่น</p></span><b>+EXP</b></button>
      <button class="quest-card pixel-box" id="lawStart"><span class="quest-ico">⚖</span><span><h3>ศึกกฎหมาย</h3><p>รวมกฎหมายและวิชาชีพฉบับตรวจทาน</p></span><b>BOSS</b></button>
      <button class="quest-card pixel-box raid-quest-card" data-go="raid"><span class="quest-ico">⚡</span><span><h3>Classroom Raid</h3><p>รวมทีมตอบสด ช่วยกันโจมตีบอส</p></span><b>CO-OP</b></button>
      <button class="quest-card pixel-box" data-go="codex"><span class="quest-ico">▤</span><span><h3>เปิดคัมภีร์</h3><p>สูตรจำและแหล่งอ้างอิงทางการ</p></span><b>READ</b></button>
    </section>
    <div class="section-head"><div><h2>ดินแดนแนะนำ</h2><p>${strongest ? `ดินแดนที่คุณทำได้ดีที่สุด: ${esc(strongest.title)}` : "เริ่มด่านแรกเพื่อเปิดสถิติ"}</p></div><button class="btn small dark" data-go="world">ดูทั้งหมด</button></div>
    <section class="world-map">${D.modules.slice(0,4).map(zoneHtml).join("")}</section>
    <div class="footer-note">ครูเควสต์ • คลังความรู้ฉบับ ${D.version} • ตรวจข้อมูลผันแปรล่าสุด ${D.verifiedAt}</div>`;
  bindCommon();
  $("#quickStart").onclick = () => startBattle({mode:"random",count:ROUND_COUNTS.quick});
  $("#weakStart").onclick = () => startBattle({mode:"weak",count:ROUND_COUNTS.weak});
  $("#lawStart").onclick = () => startBattle({mode:"modules",modules:["eduact","child","disability","civil","ksp","voclaw"],count:ROUND_COUNTS.law});
}

function renderWorld(){
  view.innerHTML = `<section class="panel pixel-box"><div class="panel-title"><div><h2>สารบัญด่าน</h2><small>ทางลัดเลือกเนื้อหาโดยไม่ต้องเดิน • ถ้าต้องการเนื้อเรื่องและโบนัสเควสต์ ให้เข้าผ่านประตูในโลกผจญภัย</small></div><button class="btn small" id="allRandom">สุ่มรวม ${ROUND_COUNTS.all} ข้อ</button></div><div class="mode-explainer"><strong>เลือกให้ตรงกับเวลาของคุณ</strong><span>สารบัญ/ฝึกด่วน = ทบทวนทันที • โลกผจญภัย = NPC ประตู บอส และโบนัสภารกิจ • สนามสอบ = จำลองสอบจริง</span></div><div class="world-map">${D.modules.map(zoneHtml).join("")}</div></section>`;
  $$('[data-module]').forEach(button => button.onclick = () => openZone(button.dataset.module));
  $("#allRandom").onclick = () => startBattle({mode:"random",count:ROUND_COUNTS.all});
}

function openZone(id){
  const item = moduleById(id);
  const stats = moduleStats(id);
  const pools = questionPoolSummary(id);
  const normalCount = Math.min(ROUND_COUNTS.zone,pools.total);
  const bossCount = Math.min(ROUND_COUNTS.boss,pools.boss);
  openModal(`<h2 id="modalTitle" class="module-heading">${moduleIconMarkup(item,"heading")}<span>${esc(item.title)}</span></h2><p>${esc(item.summary)}</p><p class="round-note"><strong>คลังด่านนี้มี ${pools.total} ข้อ</strong> เลือก “พิชิตครบทั้งคลัง” เพื่อทำครบทุกข้อโดยไม่ซ้ำในภารกิจนี้ หรือเลือกชุดฝึกสั้นได้ตามเวลา</p><div class="dashboard zone-dashboard"><div class="stat-card pixel-box"><b>${pools.total}</b><span>ข้อทั้งหมดในคลัง</span></div><div class="stat-card pixel-box"><b>${stats.done}</b><span>ข้อที่เคยทำแล้ว</span></div><div class="stat-card pixel-box"><b>${stats.accuracy}%</b><span>ความแม่นยำ</span></div></div><h3>บอสประจำด่าน</h3><p>◆ ${esc(item.boss)}</p><div class="hero-actions zone-actions"><button class="btn mint round-choice primary-quest" id="zoneComplete"><strong>พิชิตครบทั้งคลัง ${pools.total} ข้อ</strong><small>ครบทุกข้อ • ไม่ซ้ำในภารกิจนี้</small></button><button class="btn round-choice" id="zoneNormal"><strong>ฝึกด่วน ${normalCount} ข้อ</strong><small>สุ่มจากคลัง ${pools.total} ข้อ</small></button><button class="btn pink round-choice" id="zoneBoss"><strong>ท้าบอส ${bossCount} ข้อ</strong><small>สุ่มจากโจทย์กลาง–ยาก ${pools.boss} ข้อ</small></button></div>`);
  $("#zoneComplete").onclick = () => { closeModal(); startBattle({mode:"module",module:id,count:pools.total,complete:true}); };
  $("#zoneNormal").onclick = () => { closeModal(); startBattle({mode:"module",module:id,count:normalCount}); };
  $("#zoneBoss").onclick = () => { closeModal(); startBattle({mode:"module",module:id,count:bossCount,boss:true}); };
}

function renderPractice(options={}){
  if(options.start){ startBattle(options.start); return; }
  view.innerHTML = `<section class="panel pixel-box"><div class="panel-title"><div><h2>ฝึกด่วน</h2><small>ทางลัดสำหรับทบทวนทันที ไม่เดินเนื้อเรื่องและไม่มีโบนัสจบเควสต์</small></div><button class="btn small mint" data-go="adventure">ไปเล่นเนื้อเรื่อง + โบนัส</button></div><div class="filter-row"><label>ดินแดน <select id="practiceModule"><option value="all">ทุกดินแดน</option>${D.modules.map(item => `<option value="${item.id}" ${state.lastModule === item.id ? "selected" : ""}>${esc(item.title)}</option>`).join("")}</select></label></div><p class="practice-availability" id="practiceAvailability" role="status"></p><div class="mode-grid"><button class="mode-card" data-mode="complete"><div class="mode-icon" aria-hidden="true">✦</div><h3>พิชิตครบทั้งคลัง</h3><p id="completePoolText"></p><span class="tag">COMPLETE PRACTICE</span></button><button class="mode-card" data-mode="normal"><div class="mode-icon" aria-hidden="true">⚔</div><h3>ศึกมาตรฐาน</h3><p id="normalPoolText"></p><span class="tag">NORMAL ROUND</span></button><button class="mode-card" data-mode="boss"><div class="mode-icon" aria-hidden="true">◆</div><h3>ล่าบอส</h3><p id="bossPoolText"></p><span class="tag">HARD ROUND</span></button><button class="mode-card" data-mode="weak"><div class="mode-icon" aria-hidden="true">◎</div><h3>ห้องล้างแค้น</h3><p id="weakPoolText"></p><span class="tag">SMART REVIEW</span></button></div></section>`;
  bindCommon();
  const syncAvailability = () => {
    const selected = $("#practiceModule").value;
    const item = selected === "all" ? null : moduleById(selected);
    const pools = questionPoolSummary(selected);
    const normalCount = Math.min(ROUND_COUNTS.zone,pools.total);
    const bossCount = Math.min(ROUND_COUNTS.boss,pools.boss);
    const weakCount = Math.min(ROUND_COUNTS.weak,pools.weak);
    $("#practiceAvailability").innerHTML = item ? `${moduleIconMarkup(item,"tiny")}<strong>${esc(item.title)}</strong>: คลังทั้งหมด ${pools.total} ข้อ • กลาง–ยาก ${pools.boss} ข้อ • ควรฝึก ${pools.weak} ข้อ` : `ทุกดินแดน: คลังทั้งหมด ${pools.total} ข้อ • กลาง–ยาก ${pools.boss} ข้อ • ควรฝึก ${pools.weak} ข้อ`;
    $("#completePoolText").textContent = item ? `ทำครบ ${pools.total} ข้อโดยไม่ซ้ำในภารกิจนี้` : "เลือกดินแดนก่อนเพื่อเริ่มทำครบคลัง";
    $('[data-mode="complete"]').disabled = !item;
    $("#normalPoolText").textContent = `สุ่ม ${normalCount} จากคลัง ${pools.total} ข้อ • ตอบถูกโจมตี`;
    $("#bossPoolText").textContent = `สุ่ม ${bossCount} จากโจทย์กลาง–ยาก ${pools.boss} ข้อ`;
    $("#weakPoolText").textContent = pools.weak ? `สุ่มสูงสุด ${weakCount} จาก ${pools.weak} ข้อที่ยังไม่แม่น` : "ไม่มีข้อที่ต้องแก้มือในดินแดนนี้";
    $('[data-mode="weak"]').disabled = !pools.weak;
  };
  $("#practiceModule").onchange = syncAvailability;
  syncAvailability();
  $$('.mode-card').forEach(button => button.onclick = () => {
    const selected = $("#practiceModule").value;
    state.lastModule = selected;
    saveState();
    if(button.dataset.mode === "complete") startBattle({mode:"module",module:selected,count:D.questions.filter(question => question.module === selected).length,complete:true});
    else if(button.dataset.mode === "weak") startBattle({mode:"weak",module:selected === "all" ? null : selected,count:ROUND_COUNTS.weak});
    else startBattle({mode:selected === "all" ? "random" : "module",module:selected === "all" ? null : selected,count:button.dataset.mode === "boss" ? ROUND_COUNTS.boss : ROUND_COUNTS.zone,boss:button.dataset.mode === "boss"});
  });
}

function pickPool(config){
  let pool = D.questions;
  if(config.mode === "module") pool = pool.filter(question => question.module === config.module);
  if(config.mode === "modules") pool = pool.filter(question => config.modules.includes(question.module));
  if(config.module) pool = pool.filter(question => question.module === config.module);
  if(config.mode === "weak") pool = pool.filter(needsPractice);
  if(config.boss) pool = pool.filter(question => question.difficulty !== "ง่าย");
  if(config.complete){
    const unseen = pool.filter(question => !state.records[question.id]);
    const seen = pool.filter(question => state.records[question.id]);
    return [...shuffle(unseen),...shuffle(seen)];
  }
  return shuffle(pool).slice(0,config.count || 10);
}

function startBattle(config){
  const pool = pickPool(config);
  if(!pool.length){
    showToast("ไม่มีข้อที่ตรงเงื่อนไขในขณะนี้ ลองเลือกดินแดนหรือโหมดอื่น");
    return;
  }
  battle = {
    pool,index:0,playerHp:100,
    enemyHp:config.boss ? 150 : 100,enemyMax:config.boss ? 150 : 100,
    combo:0,selected:null,locked:false,hidden:[],shield:false,
    skills:Object.fromEntries(["fifty","heal","shield","hint"].map(id=>[id,state.economy.inventory[id]>0?1:0])),boss:Boolean(config.boss),correct:0,
    returnView:config.returnView || "",adventureQuest:Boolean(config.adventureQuest)
  };
  const moduleIndex = config.module ? D.modules.findIndex(item => item.id === config.module) : 0;
  const battleLabel = config.module ? moduleById(config.module)?.title : config.boss ? "ศึกบอสใหญ่" : "สนามต่อสู้";
  setMusicScene(config.boss ? "boss" : "battle",battleLabel || "การต่อสู้",Math.max(0,moduleIndex));
  $$('.nav-btn').forEach(button => button.classList.toggle("active",button.dataset.view === "practice"));
  renderBattle();
  window.scrollTo({top:0,behavior:"smooth"});
}

function renderBattle(){
  if(!battle || battle.index >= battle.pool.length){ finishBattle(); return; }
  const question = battle.pool[battle.index];
  const item = moduleById(question.module);
  const stock=state.economy.inventory;
  view.innerHTML = `<section class="battle-shell pixel-box"><div class="battle-hud"><div><div class="fighter-name">◆ ${esc(onlineState.profile?.nickname || "ครูนักผจญภัย")}</div><div class="hpbar"><i style="width:${battle.playerHp}%"></i></div></div><div class="battle-center"><strong>${battle.index+1} / ${battle.pool.length}</strong><small>COMBO ×${battle.combo}</small></div><div><div class="fighter-name right">${esc(battle.boss ? item.boss : "มอนสเตอร์ความสับสน")} ◆</div><div class="hpbar enemy-hp"><i style="width:${battle.enemyHp / battle.enemyMax * 100}%"></i></div></div></div><div class="arena" id="battleArena" data-battle-action="idle"><div class="battle-action-label" id="battleAction" role="status" aria-live="polite"></div><div class="battle-slash" aria-hidden="true"></div><div class="battle-shield-fx" aria-hidden="true"></div><div class="fighter player" id="playerFighter">${fighterArt()}</div><div class="fighter enemy" id="enemyFighter">${fighterArt(false)}</div></div><div class="question-panel"><div class="question-meta"><span class="chip gold">${moduleIconMarkup(item,"tiny")} ${esc(item.title)}</span><span class="chip">${esc(question.difficulty)}</span><span class="chip">${esc(questionType(question))}</span>${question.verified ? `<span class="chip mint">ตรวจ ${esc(question.verifiedAt)}</span>` : `<span class="chip">อ้างอิงต้นทาง</span>`}</div><div class="question-text">${esc(question.question)}</div><div class="options">${question.options.map((option,index) => `<button class="option ${battle.selected === index ? "selected" : ""}" data-answer="${index}" ${battle.locked || battle.hidden.includes(index) ? "disabled" : ""} style="${battle.hidden.includes(index) ? "visibility:hidden" : ""}"><span class="letter">${letters[index]}</span>${esc(option)}</button>`).join("")}</div><div class="battle-actions"><div class="skills"><button class="skill" data-skill="fifty" ${!battle.skills.fifty || battle.locked ? "disabled" : ""}>✂ 50:50 <span class="skill-count">${stock.fifty}</span></button><button class="skill" data-skill="shield" ${!battle.skills.shield || battle.locked ? "disabled" : ""}>◈ โล่ <span class="skill-count">${stock.shield}</span></button><button class="skill" data-skill="heal" ${!battle.skills.heal || battle.locked ? "disabled" : ""}>+ ฟื้นพลัง <span class="skill-count">${stock.heal}</span></button><button class="skill" data-skill="hint" ${!battle.skills.hint || battle.locked ? "disabled" : ""}>◉ คำใบ้ <span class="skill-count">${stock.hint}</span></button><small class="battle-inventory-note">ตัวเลขคือจำนวนไอเทมคงเหลือ • ซื้อเพิ่มด้วย Coin ที่ร้านค้า</small></div><button class="btn attack-button" id="attackBtn" ${battle.selected === null || battle.locked ? "disabled" : ""}>⚔ โจมตี!</button></div><div id="feedbackSlot"></div></div></section>`;
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
  const consumed=ECONOMY.consume(state.economy,skill);
  if(!consumed.ok){battle.skills[skill]=0;renderBattle();showToast("ไอเทมหมดแล้ว ซื้อเพิ่มได้ที่ร้านค้า");return;}
  state.economy=consumed.economy;
  battle.skills[skill]=0;
  saveState();
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

function animateAttack(damage,finisher=false){
  const player = $("#playerFighter");
  const enemy = $("#enemyFighter");
  const arena = $("#battleArena");
  const label = $("#battleAction");
  if(arena) arena.dataset.battleAction = finisher ? "finisher" : "attack";
  if(label) label.textContent = finisher ? "FINISHING STRIKE!" : "KNOWLEDGE STRIKE!";
  player?.classList.add("attack");
  setTimeout(() => {
    arena?.classList.add("impact");
    enemy?.classList.add("hit");
    damagePop(enemy,`-${damage}`);
  },180);
  if(finisher){
    setTimeout(() => {
      enemy?.classList.add("defeated");
      player?.classList.add("victor");
      arena?.classList.add("victory");
      if(label) label.textContent = "VICTORY! ปราบศัตรูสำเร็จ";
    },520);
  }
}
function animateHurt(damage){
  const player = $("#playerFighter");
  const enemy = $("#enemyFighter");
  const arena = $("#battleArena");
  const label = $("#battleAction");
  if(arena) arena.dataset.battleAction = damage ? "counter" : "block";
  if(label) label.textContent = damage ? "ENEMY COUNTER!" : "SHIELD BLOCK!";
  enemy?.classList.add("counter");
  if(!damage) arena?.classList.add("blocked");
  setTimeout(() => {
    player?.classList.add(damage ? "hurt" : "block");
    damagePop(player,damage ? `-${damage}` : "BLOCK");
  },180);
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
    animateAttack(damage,battle.enemyHp <= 0);
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
  const nextLabel = battle.playerHp <= 0 ? "กลับฐาน" : battle.enemyHp <= 0 ? "รับชัยชนะ +10 เหรียญ" : battle.index >= battle.pool.length-1 ? "ดูผลภารกิจ" : "ข้อต่อไป";
  slot.innerHTML = `<div class="feedback ${isCorrect ? "" : "bad"}"><h3>${isCorrect ? battle.enemyHp <= 0 ? "ท่าปิดฉากสำเร็จ!" : "โจมตีสำเร็จ!" : damage ? "ถูกสวนกลับ!" : "โล่ป้องกันสำเร็จ!"}</h3><p><strong>คำตอบ: ${letters[question.answer]}. ${esc(question.options[question.answer])}</strong></p><p>${esc(question.explanation)}</p><div class="source">${sourceMarkup(question)}</div><div class="hero-actions"><button class="btn small ${battle.playerHp <= 0 ? "red" : "mint"}" id="nextBattle">${nextLabel}</button><button class="btn small dark" id="bookmarkBtn">${state.bookmarks.includes(question.id) ? "★ เก็บแล้ว" : "☆ เก็บทบทวน"}</button></div></div>`;
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
  if(!defeat) sfx.win();
  const returnToAdventure = result?.returnView === "adventure";
  const adventureBonus=Boolean(result?.adventureQuest && !defeat);
  if(adventureBonus){state.xp+=25;state.coins+=10;saveState();}
  setMusicScene(defeat ? "retreat" : "victory");
  view.innerHTML = `<section class="panel pixel-box"><div class="result-hero pixel-box ${defeat ? "retreat" : "mission-victory"}"><div class="result-battle-stage" data-result-action="${defeat ? "retreat" : "victory"}"><div class="victory-burst" aria-hidden="true"></div><div class="fighter result-fighter ${defeat ? "retreating" : "celebrating"}">${fighterArt()}</div><div class="victory-banner">${defeat ? "TRY AGAIN" : "VICTORY!"}</div></div><div class="eyebrow">${defeat ? "MISSION RETREAT" : "MISSION COMPLETE"}</div><b>${score}/${total}</b><h2>${defeat ? "ถอยมาตั้งหลัก แล้วกลับไปลุยใหม่" : "ภารกิจเสร็จสิ้น!"}</h2><p>${score / Math.max(total,1) >= .8 ? "ยอดเยี่ยม ความแม่นของคุณพร้อมลุยด่านยากขึ้น" : "ทบทวนข้อที่พลาด แล้วลองอีกครั้งจะเห็นพัฒนาการชัดเจน"}</p>${adventureBonus ? '<div class="adventure-bonus">โบนัสเนื้อเรื่อง +25 EXP • +10 เหรียญ</div>' : ''}</div><div class="hero-actions">${returnToAdventure ? '<button class="btn" id="returnAdventure">◈ กลับสู่โลกผจญภัย</button>' : '<button class="btn" id="againBattle">ฝึกอีกชุด</button>'}<button class="btn mint" data-go="review">ทบทวนข้อพลาด</button><button class="btn dark" data-go="home">กลับฐาน</button></div></section>`;
  battle = null;
  bindCommon();
  if(returnToAdventure) $("#returnAdventure").onclick = () => go("adventure");
  else $("#againBattle").onclick = () => go("practice");
}

function raidHash(value){
  let hash=2166136261;
  for(const char of String(value)){
    hash^=char.charCodeAt(0);
    hash=Math.imul(hash,16777619);
  }
  return hash>>>0;
}

function raidQuestionPool(raid){
  const moduleId=raid?.meta?.moduleId || "all";
  const pool=D.questions.filter(question=>moduleId==="all" || question.module===moduleId);
  const seed=raid?.meta?.questionSeed || 1;
  return pool.slice().sort((a,b)=>raidHash(`${seed}:${a.id}`)-raidHash(`${seed}:${b.id}`));
}

function ensureRaidGame(raid){
  if(!raidGame || raidGame.code!==raid.code){
    raidGame={
      code:raid.code,pool:raidQuestionPool(raid),index:0,selected:null,locked:false,
      combo:0,correct:0,playerHp:100,feedback:null
    };
  }
  return raidGame;
}

function raidModule(raid){
  return raid?.meta?.moduleId==="all" ? null : moduleById(raid?.meta?.moduleId);
}

function raidModuleLabel(raid){ return raidModule(raid)?.title || `ทุกดินแดนทั้ง ${D.questions.length} ข้อ`; }

function raidBossName(raid){ return raidModule(raid)?.boss || "จอมมารแห่งสนามสอบ"; }

function raidBossArt(){
  return `<div class="raid-boss-art" aria-hidden="true"><i class="raid-boss-horn left"></i><i class="raid-boss-horn right"></i><i class="raid-boss-head"></i><i class="raid-boss-eye left"></i><i class="raid-boss-eye right"></i><i class="raid-boss-body"></i><i class="raid-boss-core"></i><i class="raid-boss-arm left"></i><i class="raid-boss-arm right"></i></div>`;
}

function raidMemberCards(raid,{compact=false}={}){
  const api=window.TeacherQuestOnline;
  const localUid=onlineState.user?.uid;
  const members=raid?.members || [];
  if(!members.length) return `<div class="empty">กำลังรอสมาชิก…</div>`;
  return members.map((member,index)=>{
    const recentEmote=member.emote && Date.now()-(Number(member.emoteAt)||0)<8000;
    const emote=recentEmote ? `<span class="raid-emote-pop">${esc(RAID_EMOTES[member.emote] || member.emote)}</span>` : "";
    return `<article class="raid-member ${member.uid===localUid ? "is-me" : ""} ${compact ? "compact" : ""}" data-raid-member="${esc(member.uid)}">${emote}<span class="raid-rank">${index+1}</span>${api?.avatarMarkup?.(member,"raid-avatar") || ""}<div class="raid-member-copy"><strong>${esc(member.nickname)}${member.uid===raid.meta.hostUid ? " ◆" : ""}</strong><small>${raid.meta.status==="lobby" ? (member.ready ? "พร้อมบุก" : "กำลังเตรียมตัว") : `DMG ${member.score} • ถูก ${member.correct}`}</small></div></article>`;
  }).join("");
}

function raidEmoteButtons(){
  return `<div class="raid-emotes" aria-label="ส่งอีโมตให้ทีม">${Object.entries(RAID_EMOTES).map(([key,label])=>`<button type="button" class="skill" data-raid-emote="${key}" aria-label="ส่งอีโมต ${esc(label)}">${esc(label)}</button>`).join("")}</div>`;
}

function bindRaidEmotes(){
  $$('[data-raid-emote]').forEach(button=>button.onclick=async()=>{
    button.disabled=true;
    try{await window.TeacherQuestOnline?.sendRaidEmote?.(button.dataset.raidEmote);}
    catch(error){showToast(error.message || "ส่งอีโมตไม่สำเร็จ");}
  });
}

function renderRaid(){
  clearTimeout(raidVictoryTimer);
  raidVictoryTimer=null;
  onlineState=window.TeacherQuestOnline?.getState?.() || onlineState;
  if(!hasGoogleIdentity() || onlineState.phase!=="online"){
    view.innerHTML=`<section class="panel pixel-box raid-offline"><div class="eyebrow">MULTIPLAYER RAID • GOOGLE ID</div><h2>เชื่อมออนไลน์ก่อนรวมทีม</h2><p>${esc(onlineState.error || "Raid ใช้ Firebase เพื่อให้สมาชิกและพลังบอสตรงกันแบบเรียลไทม์")}</p><div class="hero-actions"><button class="btn sky" id="raidAccount">เปิดบัญชี / เช็กการเชื่อมต่อ</button><button class="btn dark" data-go="home">กลับฐาน</button></div></section>`;
    bindCommon();
    $("#raidAccount").onclick=openOnlineDialog;
    return;
  }
  const raid=onlineState.raid;
  if(!raid){ renderRaidEntry(); return; }
  if(raid.meta.status==="lobby"){ renderRaidLobby(raid); return; }
  if(raid.meta.bossHp<=0){ renderRaidVictory(raid); return; }
  renderRaidBattle(raid);
}

function renderRaidEntry(){
  view.innerHTML=`<section class="raid-entry pixel-box"><div class="raid-entry-hero"><div><div class="eyebrow">CLASSROOM RAID • REALTIME CO-OP</div><h1>รวมปาร์ตี้<br><span>ปราบบอสความรู้</span></h1><p>สร้างห้องหรือใส่รหัส 6 ตัว เพื่อนแต่ละคนตอบข้อสอบบนหน้าจอของตนเอง ทุกคำตอบที่ถูกจะกลายเป็นพลังโจมตีบอสตัวเดียวกันแบบสด</p></div><div class="raid-entry-boss">${raidBossArt()}<span>8 PLAYERS MAX</span></div></div><div class="raid-entry-grid"><form class="raid-entry-card pixel-box" id="createRaidForm"><h2>◆ สร้างห้องใหม่</h2><label for="raidModule">ขอบเขตข้อสอบ<select id="raidModule"><option value="all">ทุกดินแดน • ${D.questions.length} ข้อ</option>${D.modules.map(item=>`<option value="${item.id}">${esc(item.title)} • ${D.questions.filter(question=>question.module===item.id).length} ข้อ</option>`).join("")}</select></label><p>หัวหน้าห้องเลือกเนื้อหาแล้วส่งรหัสให้เพื่อน จากนั้นกดเริ่มเมื่อทีมพร้อม</p><button class="btn pink" type="submit" id="createRaidBtn">⚡ สร้างห้อง Raid</button></form><form class="raid-entry-card pixel-box" id="joinRaidForm"><h2>◈ เข้าห้องเพื่อน</h2><label for="raidCodeInput">รหัสห้อง 6 ตัว<input id="raidCodeInput" class="raid-code-input" maxlength="6" inputmode="text" autocomplete="off" placeholder="ABC234" required></label><p>ใช้รหัสจากหัวหน้าห้อง ตัวอักษรพิมพ์เล็กหรือใหญ่ก็ได้</p><button class="btn mint" type="submit" id="joinRaidBtn">เข้าร่วมปาร์ตี้</button></form></div><div class="raid-entry-error" id="raidEntryError" role="alert" hidden><div><strong>สร้างห้องไม่สำเร็จ</strong><span id="raidEntryErrorText"></span></div><button class="btn small sky" type="button" id="raidEntryDiagnostic">ตรวจสิทธิ์ Firebase</button></div><div class="raid-safety"><strong>ปลอดภัยสำหรับห้องเรียน</strong><span>ไม่มีแชตอิสระ • แสดงเฉพาะชื่อในเกม ตัวละคร คะแนน และอีโมตที่กำหนดไว้</span></div><div class="hero-actions"><button class="btn dark" data-go="adventure">กลับโลกผจญภัย</button></div></section>`;
  bindCommon();
  const api=window.TeacherQuestOnline;
  $("#raidCodeInput").oninput=event=>{event.target.value=api?.normalizeRaidCode?.(event.target.value) || event.target.value.toUpperCase();};
  $("#createRaidForm").onsubmit=async event=>{
    event.preventDefault();
    const button=$("#createRaidBtn");
    button.disabled=true;button.textContent="กำลังเปิดประตู Raid…";
    try{onlineState=await api.createRaid({moduleId:$("#raidModule").value});renderRaid();}
    catch(error){
      button.disabled=false;button.textContent="⚡ สร้างห้อง Raid";
      $("#raidEntryError").hidden=false;
      $("#raidEntryErrorText").textContent=error.message || "สร้างห้องไม่สำเร็จ";
      showToast(error.message || "สร้างห้องไม่สำเร็จ");
    }
  };
  $("#joinRaidForm").onsubmit=async event=>{
    event.preventDefault();
    const button=$("#joinRaidBtn");
    button.disabled=true;button.textContent="กำลังเข้าห้อง…";
    try{onlineState=await api.joinRaid($("#raidCodeInput").value);renderRaid();}
    catch(error){button.disabled=false;button.textContent="เข้าร่วมปาร์ตี้";showToast(error.message || "เข้าห้องไม่สำเร็จ");}
  };
  $("#raidEntryDiagnostic").onclick=openOnlineDialog;
}

function renderRaidLobby(raid){
  const local=raid.members.find(member=>member.uid===onlineState.user?.uid);
  view.innerHTML=`<section class="raid-lobby pixel-box"><header class="raid-toolbar"><div><div class="eyebrow">RAID LOBBY • ${esc(raidModuleLabel(raid))}</div><h1>ห้อง <span>${esc(raid.code)}</span></h1></div><div class="raid-toolbar-actions"><button class="btn small mint" id="copyRaidCode">คัดลอกรหัส</button><button class="btn small dark" id="leaveRaid">ออกจากห้อง</button></div></header><div class="raid-lobby-grid"><section class="raid-roster pixel-box"><div class="panel-title"><div><h2>สมาชิก ${raid.memberCount}/8</h2><small>◆ คือหัวหน้าห้อง • ทุกคนต้องล็อกอิน Google</small></div></div><div class="raid-member-list" id="raidMemberList">${raidMemberCards(raid)}</div>${raidEmoteButtons()}</section><aside class="raid-brief pixel-box"><div class="raid-mini-boss">${raidBossArt()}</div><h2>${esc(raidBossName(raid))}</h2><p>HP ${raid.meta.bossMax} • คำตอบถูกสร้างความเสียหาย 24–40 • พลังบอสเป็นค่ากลางร่วมกัน</p><div class="raid-rules"><span>1</span><p><strong>ตอบคนละชุด</strong> ทำพร้อมกันได้โดยไม่ต้องรอคิว</p><span>2</span><p><strong>โจมตีร่วมกัน</strong> ความเสียหายทุกคนรวมที่บอสตัวเดียว</p><span>3</span><p><strong>รับรางวัลทีม</strong> ชนะรับ 100 EXP + 50 เหรียญ</p></div>${raid.isHost ? `<button class="btn pink raid-start" id="startRaid">⚔ เริ่มบุกพร้อม ${raid.memberCount} คน</button><small class="raid-wait">เริ่มคนเดียวได้ หรือรอเพื่อนเข้าด้วยรหัสด้านบน</small>` : `<button class="btn ${local?.ready ? "mint" : "dark"} raid-start" id="toggleRaidReady">${local?.ready ? "✓ พร้อมแล้ว" : "กดเมื่อพร้อม"}</button><small class="raid-wait">กำลังรอหัวหน้าห้องเริ่มการบุก</small>`}</aside></div></section>`;
  bindRaidEmotes();
  $("#copyRaidCode").onclick=async()=>{
    try{await navigator.clipboard.writeText(raid.code);showToast(`คัดลอกรหัส ${raid.code} แล้ว`);}
    catch{showToast(`รหัสห้อง: ${raid.code}`);}
  };
  $("#leaveRaid").onclick=async()=>{await window.TeacherQuestOnline.leaveRaid();raidGame=null;renderRaid();};
  $("#startRaid")?.addEventListener("click",async event=>{
    event.currentTarget.disabled=true;event.currentTarget.textContent="กำลังเปิดศึก…";
    try{onlineState=await window.TeacherQuestOnline.startRaid();renderRaid();}
    catch(error){showToast(error.message || "เริ่ม Raid ไม่สำเร็จ");renderRaid();}
  });
  $("#toggleRaidReady")?.addEventListener("click",async()=>{
    try{await window.TeacherQuestOnline.setRaidReady(!local?.ready);}
    catch(error){showToast(error.message || "อัปเดตสถานะไม่สำเร็จ");}
  });
}

function raidFeedbackMarkup(question,feedback,raid){
  if(!feedback) return "";
  const nextLabel=raid.meta.bossHp<=0 ? "รับรางวัลชัยชนะ" : raidGame.playerHp<=0 ? "พักฟื้น +40 HP" : "ข้อต่อไป";
  return `<div class="feedback ${feedback.isCorrect ? "" : "bad"}"><h3>${feedback.isCorrect ? `โจมตีทีมสำเร็จ! -${feedback.damage} HP` : "บอสสวนกลับ! พลังใจลดลง"}</h3><p><strong>คำตอบ: ${letters[question.answer]}. ${esc(question.options[question.answer])}</strong></p><p>${esc(question.explanation)}</p><div class="source">${sourceMarkup(question)}</div><div class="hero-actions"><button class="btn small ${raidGame.playerHp<=0 ? "pink" : "mint"}" id="nextRaidQuestion">${nextLabel}</button><button class="btn small dark" id="raidBookmark">${state.bookmarks.includes(question.id) ? "★ เก็บแล้ว" : "☆ เก็บทบทวน"}</button></div></div>`;
}

function renderRaidBattle(raid=onlineState.raid,{allowDefeated=false}={}){
  if(!raid || (raid.meta.bossHp<=0 && !allowDefeated)){renderRaid();return;}
  const game=ensureRaidGame(raid);
  const question=game.pool[game.index%game.pool.length];
  const item=moduleById(question.module);
  const hpPercent=clamp(raid.meta.bossHp/raid.meta.bossMax*100,0,100);
  const playerHp=clamp(game.playerHp,0,100);
  const optionMarkup=question.options.map((option,index)=>{
    const selected=game.selected===index;
    const resultClass=game.feedback ? (index===question.answer ? "correct" : selected && !game.feedback.isCorrect ? "wrong" : "") : "";
    return `<button class="option ${selected ? "selected" : ""} ${resultClass}" data-raid-answer="${index}" ${game.locked ? "disabled" : ""}><span class="letter">${letters[index]}</span>${esc(option)}</button>`;
  }).join("");
  view.innerHTML=`<section class="raid-battle pixel-box"><header class="raid-toolbar compact"><div><div class="eyebrow">LIVE RAID • ห้อง ${esc(raid.code)}</div><h1>${esc(raidBossName(raid))}</h1></div><div class="raid-toolbar-actions"><span class="raid-live"><i></i><b id="raidMemberCount">${raid.memberCount}</b> คน</span><button class="btn small dark" id="leaveRaidBattle">ออกจากศึก</button></div></header><div class="raid-boss-hud"><div><strong>BOSS HP</strong><span id="raidBossHpText">${raid.meta.bossHp} / ${raid.meta.bossMax}</span></div><div class="hpbar enemy-hp raid-hp"><i id="raidBossHpBar" style="width:${hpPercent}%"></i></div></div><div class="arena raid-arena" id="raidArena" data-battle-action="idle"><div class="battle-action-label" id="raidAction" role="status" aria-live="polite"></div><div class="battle-slash" aria-hidden="true"></div><div class="battle-shield-fx" aria-hidden="true"></div><div class="raid-party-ghosts" aria-label="สมาชิกในปาร์ตี้">${raid.members.slice(0,8).map(member=>window.TeacherQuestOnline?.avatarMarkup?.(member,"raid-stage-avatar") || "").join("")}</div><div class="fighter player" id="raidPlayer">${fighterArt()}</div><div class="fighter enemy raid-boss" id="raidBoss">${raidBossArt()}</div></div><div class="raid-battle-grid"><main class="question-panel raid-question"><div class="raid-player-hud"><span>พลังใจ</span><div class="hpbar"><i style="width:${playerHp}%"></i></div><b>${game.playerHp} HP</b><span>COMBO ×${game.combo}</span></div><div class="question-meta"><span class="chip gold">${moduleIconMarkup(item,"tiny")} ${esc(item.title)}</span><span class="chip">${esc(question.difficulty)}</span><span class="chip">ข้อส่วนตัว ${(game.index%game.pool.length)+1}/${game.pool.length}</span></div><div class="question-text">${esc(question.question)}</div><div class="options">${optionMarkup}</div><div class="battle-actions"><span class="raid-shared-note">ทุกคำตอบถูก ลด HP บอสของทั้งทีม</span><button class="btn attack-button" id="raidAttackBtn" ${game.selected===null || game.locked ? "disabled" : ""}>⚔ โจมตีบอส!</button></div><div id="raidFeedback">${raidFeedbackMarkup(question,game.feedback,raid)}</div></main><aside class="raid-team-panel pixel-box"><div class="panel-title"><div><h2>ทีมสด</h2><small>อันดับความเสียหาย</small></div></div><div class="raid-member-list compact" id="raidTeamList">${raidMemberCards(raid,{compact:true})}</div>${raidEmoteButtons()}</aside></div></section>`;
  $$('[data-raid-answer]').forEach(button=>button.onclick=()=>{if(game.locked)return;game.selected=Number(button.dataset.raidAnswer);sfx.select();renderRaidBattle(raid);});
  $("#raidAttackBtn").onclick=submitRaidAnswer;
  $("#leaveRaidBattle").onclick=async()=>{if(!confirm("ออกจาก Raid ตอนนี้หรือไม่? คะแนนทีมที่ทำไว้ยังคงอยู่"))return;await window.TeacherQuestOnline.leaveRaid();raidGame=null;renderRaid();};
  bindRaidEmotes();
  $("#raidBookmark")?.addEventListener("click",event=>toggleBookmark(question.id,event.currentTarget));
  $("#nextRaidQuestion")?.addEventListener("click",()=>{
    if(onlineState.raid?.meta?.bossHp<=0){renderRaid();return;}
    if(game.playerHp<=0) game.playerHp=40;
    game.index++;
    game.selected=null;
    game.locked=false;
    game.feedback=null;
    renderRaidBattle(onlineState.raid);
  });
}

function animateRaidAttack(damage,finisher=false){
  const player=$("#raidPlayer"),boss=$("#raidBoss"),arena=$("#raidArena"),label=$("#raidAction");
  if(arena) arena.dataset.battleAction=finisher ? "finisher" : "attack";
  if(label) label.textContent=finisher ? "TEAM FINISHER!" : "CO-OP STRIKE!";
  player?.classList.add("attack");
  setTimeout(()=>{arena?.classList.add("impact");boss?.classList.add("hit");damagePop(boss,`-${damage}`);},150);
  if(finisher) setTimeout(()=>{boss?.classList.add("defeated");player?.classList.add("victor");arena?.classList.add("victory");if(label)label.textContent="RAID CLEAR!";},500);
}

function animateRaidHurt(){
  const player=$("#raidPlayer"),boss=$("#raidBoss"),arena=$("#raidArena"),label=$("#raidAction");
  if(arena) arena.dataset.battleAction="counter";
  if(label) label.textContent="BOSS COUNTER!";
  boss?.classList.add("counter");
  setTimeout(()=>{player?.classList.add("hurt");damagePop(player,"-18");},160);
}

async function submitRaidAnswer(){
  const raid=onlineState.raid;
  const game=raid && ensureRaidGame(raid);
  if(!raid || !game || game.locked || game.selected===null) return;
  const question=game.pool[game.index%game.pool.length];
  const isCorrect=game.selected===question.answer;
  game.locked=true;
  $$('[data-raid-answer]').forEach(button=>{button.disabled=true;});
  if($("#raidAttackBtn")){$("#raidAttackBtn").disabled=true;$("#raidAttackBtn").textContent="กำลังคำนวณพลัง…";}
  recordAnswer(question,isCorrect);
  if(isCorrect){
    game.combo++;
    game.correct++;
    state.maxCombo=Math.max(state.maxCombo,game.combo);
    saveState();
    const requested=24+Math.min(game.combo*2,16);
    let result={damage:0,bossHp:raid.meta.bossHp,bossMax:raid.meta.bossMax};
    try{result=await window.TeacherQuestOnline.attackRaid(requested);}
    catch(error){showToast(error.message || "การโจมตีไม่ถึงเซิร์ฟเวอร์");}
    if(onlineState.raid) onlineState.raid.meta.bossHp=result.bossHp;
    game.feedback={isCorrect:true,selected:game.selected,damage:result.damage};
    sfx.correct();
    renderRaidBattle(onlineState.raid || raid,{allowDefeated:result.bossHp<=0});
    requestAnimationFrame(()=>animateRaidAttack(result.damage,result.bossHp<=0));
  }else{
    game.combo=0;
    game.playerHp=clamp(game.playerHp-18,0,100);
    game.feedback={isCorrect:false,selected:game.selected,damage:18};
    sfx.wrong();
    renderRaidBattle(raid);
    requestAnimationFrame(animateRaidHurt);
  }
}

function claimRaidReward(code){
  const rewards=Array.isArray(state.raidRewards) ? state.raidRewards : [];
  if(rewards.includes(code)) return false;
  state.raidRewards=[...rewards,code].slice(-30);
  state.raidWins=(Number(state.raidWins)||0)+1;
  state.xp+=100;
  state.coins+=50;
  saveState();
  sfx.win();
  return true;
}

function renderRaidVictory(raid){
  const rewarded=claimRaidReward(raid.code);
  setMusicScene("victory","Raid Clear");
  view.innerHTML=`<section class="raid-victory panel pixel-box"><div class="result-hero pixel-box mission-victory"><div class="raid-victory-stage"><div class="victory-burst" aria-hidden="true"></div><div class="raid-victory-party">${raid.members.slice(0,5).map(member=>window.TeacherQuestOnline?.avatarMarkup?.(member,"large") || "").join("")}</div><div class="raid-defeated-boss">${raidBossArt()}</div><div class="victory-banner">RAID CLEAR!</div></div><div class="eyebrow">TEAM VICTORY • ห้อง ${esc(raid.code)}</div><b>+${rewarded ? 100 : 0} EXP</b><h2>ทีมปราบ ${esc(raidBossName(raid))} สำเร็จ!</h2><p>${rewarded ? "รับ 100 EXP และ 50 เหรียญแล้ว" : "รางวัลห้องนี้ถูกรับไว้แล้ว จึงไม่สามารถรับซ้ำได้"}</p></div><div class="raid-scoreboard pixel-box"><div class="panel-title"><div><h2>อันดับทีม</h2><small>รวมความเสียหาย ${raid.meta.bossMax} HP</small></div></div><div class="raid-member-list">${raidMemberCards(raid)}</div></div>${raidEmoteButtons()}<div class="hero-actions"><button class="btn mint" id="raidVictoryGG">ส่ง GG ให้ทีม</button><button class="btn pink" id="raidAgain">สร้าง Raid ใหม่</button><button class="btn dark" id="raidReturnWorld">กลับโลกผจญภัย</button></div></section>`;
  bindRaidEmotes();
  $("#raidVictoryGG").onclick=async()=>{await window.TeacherQuestOnline.sendRaidEmote("gg");showToast("ส่ง GG ให้ทีมแล้ว");};
  $("#raidAgain").onclick=async()=>{await window.TeacherQuestOnline.leaveRaid();raidGame=null;onlineState=window.TeacherQuestOnline.getState();setMusicScene("boss");renderRaid();};
  $("#raidReturnWorld").onclick=async()=>{await window.TeacherQuestOnline.leaveRaid();raidGame=null;go("adventure");};
}

function updateRaidLiveView(previousRaid=null){
  if(currentView!=="raid") return;
  const raid=onlineState.raid;
  if(!raid){raidGame=null;renderRaid();return;}
  if(!previousRaid || previousRaid.code!==raid.code || previousRaid.meta.status!==raid.meta.status){renderRaid();return;}
  if(raid.meta.status==="lobby"){renderRaidLobby(raid);return;}
  if(raid.meta.bossHp<=0){
    if($(".raid-victory")){
      const list=$(".raid-scoreboard .raid-member-list");
      if(list) list.innerHTML=raidMemberCards(raid);
      return;
    }
    if(!raidVictoryTimer) raidVictoryTimer=setTimeout(()=>{raidVictoryTimer=null;renderRaidVictory(raid);},650);
    return;
  }
  const percent=clamp(raid.meta.bossHp/raid.meta.bossMax*100,0,100);
  if($("#raidBossHpText")) $("#raidBossHpText").textContent=`${raid.meta.bossHp} / ${raid.meta.bossMax}`;
  if($("#raidBossHpBar")) $("#raidBossHpBar").style.width=`${percent}%`;
  if($("#raidMemberCount")) $("#raidMemberCount").textContent=raid.memberCount;
  if($("#raidTeamList")) $("#raidTeamList").innerHTML=raidMemberCards(raid,{compact:true});
}

function renderExamLobby(){
  view.innerHTML = `<section class="panel pixel-box"><div class="panel-title"><div><h2>สนามสอบใหญ่</h2><small>เลือกจำนวนข้อ เวลา และขอบเขตก่อนเปิดประตูสนาม</small></div></div><div class="filter-row"><label>ขอบเขต <select id="examModule"><option value="all">ทุกดินแดน</option>${D.modules.map(item => `<option value="${item.id}">${esc(item.title)}</option>`).join("")}</select></label><label>จำนวนข้อ <select id="examCount"></select></label><label>เวลา <select id="examMinutes"><option value="30">30 นาที</option><option value="60" selected>60 นาที</option><option value="90">90 นาที</option></select></label></div><p class="exam-availability" id="examAvailability" role="status"></p><div class="mode-grid"><button class="mode-card" id="startExam"><div class="mode-icon">◷</div><h3>เริ่มสนามสอบ</h3><p>ซ่อนเฉลยจนกว่าจะส่งข้อสอบ เปลี่ยนคำตอบและข้ามข้อได้</p><span class="tag">EXAM MODE</span></button><button class="mode-card" id="quickExam"><div class="mode-icon">⚡</div><h3>ด่านด่วน 20 ข้อ</h3><p>จับเวลา 20 นาที เหมาะกับการซ้อมทุกวัน</p><span class="tag">SPEED RUN</span></button><button class="mode-card" id="bossExam"><div class="mode-icon">♜</div><h3>ศึกบอส 80 ข้อ</h3><p>คัดระดับกลางและยากจากทุกดินแดน</p><span class="tag">FINAL BOSS</span></button></div></section>`;
  const syncExamAvailability = () => {
    const moduleId = $("#examModule").value;
    const available = D.questions.filter(question => moduleId === "all" || question.module === moduleId).length;
    const preferred = moduleId === "all" ? [30,60,100] : [10,20,30,60,100].filter(count => count <= available);
    if(!preferred.includes(available) && moduleId !== "all") preferred.push(available);
    const previous = Number($("#examCount").value) || 60;
    $("#examCount").innerHTML = preferred.map(count => `<option value="${count}">${count}</option>`).join("");
    const selected = moduleId === "all"
      ? preferred.filter(count => count <= Math.min(previous,available)).pop() || preferred[0]
      : available;
    $("#examCount").value = String(selected);
    const item = moduleId === "all" ? null : moduleById(moduleId);
    $("#examAvailability").innerHTML = item
      ? `${moduleIconMarkup(item,"tiny")}<strong>${esc(item.title)}</strong> มี ${available} ข้อ — ระบบแสดงเฉพาะจำนวนที่ทำได้จริง`
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
  setMusicScene(boss ? "boss" : "exam",boss ? "ศึกบอสสนามสอบ" : "สนามสอบ");
  renderExam();
  examTimer = setInterval(updateExamTimer,500);
  updateExamTimer();
}

function renderExam(){
  const question = exam.pool[exam.index];
  const item = moduleById(question.module);
  view.innerHTML = `<div class="exam-layout"><section class="panel pixel-box"><div class="panel-title"><div><h2>ข้อ ${exam.index+1} จาก ${exam.pool.length}</h2><small class="inline-module-label">${moduleIconMarkup(item,"tiny")} ${esc(item.title)}</small></div><div class="timer" id="timerText">--:--</div></div><div class="question-meta"><span class="chip">${esc(question.difficulty)}</span><span class="chip">${esc(questionType(question))}</span></div><div class="question-text">${esc(question.question)}</div><div class="options">${question.options.map((option,index) => `<button class="option ${exam.answers[exam.index] === index ? "selected" : ""}" data-exam-answer="${index}"><span class="letter">${letters[index]}</span>${esc(option)}</button>`).join("")}</div><div class="battle-actions"><button class="btn small dark" id="prevExam" ${exam.index === 0 ? "disabled" : ""}>← ก่อนหน้า</button><div><button class="btn small" id="nextExam">${exam.index === exam.pool.length-1 ? "ตรวจรายการ" : "ข้อต่อไป →"}</button> <button class="btn small red" id="submitExam">ส่งข้อสอบ</button></div></div></section><aside class="panel pixel-box exam-side"><div class="panel-title"><div><h2>กระดาษคำตอบ</h2><small>${exam.answers.filter(value => value !== null).length} / ${exam.pool.length} ข้อ</small></div></div><div class="question-grid">${exam.pool.map((_,index) => `<button data-qnav="${index}" class="${exam.answers[index] !== null ? "answered" : ""} ${index === exam.index ? "current" : ""}" aria-label="ไปข้อ ${index+1}${exam.answers[index] !== null ? " ตอบแล้ว" : " ยังไม่ตอบ"}">${index+1}</button>`).join("")}</div></aside></div>`;
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
  const answerReview=result.pool.map((question,index)=>{
    const selected=result.answers[index];
    const correct=selected===question.answer;
    const module=moduleById(question.module);
    const selectedText=selected===null ? "ไม่ได้ตอบ" : `${letters[selected]}. ${esc(question.options[selected])}`;
    return `<article class="exam-review-card pixel-box ${correct ? "correct" : "wrong"}"><div class="exam-review-head"><span>ข้อ ${index+1} • ${moduleIconMarkup(module,"tiny")} ${esc(module.title)}</span><strong>${correct ? "✓ ถูก" : "✕ ควรทบทวน"}</strong></div><h3>${esc(question.question)}</h3><p><b>คำตอบของคุณ:</b> ${selectedText}</p><p><b>เฉลย:</b> ${letters[question.answer]}. ${esc(question.options[question.answer])}</p><p>${esc(question.explanation)}</p>${sourceMarkup(question)}</article>`;
  }).join("");
  setMusicScene(percent >= 60 ? "victory" : "retreat",percent >= 60 ? "ผลสอบแห่งชัยชนะ" : "ผลสอบ: กลับไปฝึกใหม่");
  if(percent >= 60) sfx.win();
  else sfx.wrong();
  view.innerHTML = `<section class="panel pixel-box"><div class="result-hero pixel-box"><div class="eyebrow">EXAM RESULT</div><b>${percent}%</b><h2>${percent >= 80 ? "ผ่านด่านอย่างสง่างาม" : percent >= 60 ? "ใกล้ถึงเป้าหมาย" : "กลับไปเก็บเลเวลอีกนิด"}</h2><p>${score} คะแนน จาก ${result.pool.length} ข้อ</p></div><div class="section-head"><div><h2>ผลรายดินแดน</h2><p>ใช้เลือกด่านที่จะฝึกต่อ</p></div></div><div class="breakdown">${Object.entries(breakdown).map(([id,item]) => { const module=moduleById(id); return `<div class="break-card pixel-box"><strong class="inline-module-label">${moduleIconMarkup(module,"tiny")} ${esc(module.title)}</strong><b>${item.correct}/${item.total}</b><small>${Math.round(item.correct/item.total*100)}%</small></div>`; }).join("")}</div><details class="exam-answer-review"><summary>ดูเฉลย คำอธิบาย และหลักฐานรายข้อ (${result.pool.length} ข้อ)</summary><div class="exam-review-list">${answerReview}</div></details><div class="hero-actions"><button class="btn" data-go="exam">สอบใหม่</button><button class="btn mint" data-go="review">ทบทวนข้อผิด</button><button class="btn dark" data-go="home">กลับฐาน</button></div></section>`;
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
        const module = moduleById(question.module);
        return `<article class="review-card pixel-box"><div><h3 class="inline-module-label">${moduleIconMarkup(module,"tiny")}<span>${esc(question.question)}</span></h3><p>${esc(module.title)} • ความแม่น ${accuracy}% ${state.bookmarks.includes(question.id) ? "• ★ เก็บไว้" : ""}</p><details class="review-citation"><summary>ดูหลักฐานรายข้อ</summary>${sourceMarkup(question)}</details></div><button class="btn small dark" data-one="${question.id}">ฝึกข้อนี้</button></article>`;
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
  setMusicScene("battle","ศึกทบทวน",1);
  renderBattle();
}

function renderCodex(){
  view.innerHTML = `<section class="panel pixel-box"><div class="panel-title"><div><h2>คัมภีร์ความรู้</h2><small>สูตรจำสั้น ๆ สำหรับเรียกคืนก่อนเข้าสนาม</small></div></div><div class="codex-grid">${D.codex.map(item => `<article class="codex-card pixel-box"><div class="codex-icon">${item.icon}</div><h3>${esc(item.title)}</h3><ul>${item.items.map(text => `<li>${esc(text)}</li>`).join("")}</ul></article>`).join("")}</div><div class="section-head"><div><h2>หอจดหมายเหตุ</h2><p>ภาพรวมเอกสารของแต่ละหมวด ส่วนตำแหน่งหน้าและหัวข้อที่ใช้จริงจะแสดงหลังตอบทุกข้อ</p></div></div><div class="codex-grid">${D.sources.map(source => `<article class="codex-card pixel-box"><h3>${esc(source.title)}</h3><p>${esc(source.note)}</p><p><b>${source.questionCount} ข้อ</b> • ${source.documents.length ? `${source.documents.length} เอกสารในชุดอ้างอิง` : "ตรวจจากหน่วยงานทางการ"}</p>${source.documents.length ? `<ul class="source-document-list">${source.documents.map(document=>`<li>${esc(document)}</li>`).join("")}</ul>` : ""}<div class="source-links"><a href="${source.url}" target="_blank" rel="noopener" aria-label="เปิดแหล่งตรวจเทียบ: ${esc(source.title)}">เปิดแหล่งตรวจเทียบ ↗</a></div></article>`).join("")}</div></section>`;
}

function renderShop(){
  state.economy=ECONOMY.normalize(state.economy);
  const categories={helper:"ไอเทมช่วยสอบ",emote:"ท่าทาง",cosmetic:"เครื่องแต่งกาย"};
  const items=ECONOMY.catalog.filter(item=>item.category===shopFilter);
  const inventory=state.economy.inventory;
  const cards=items.map(item=>{
    const owned=item.type==="unlock"&&state.economy.owned.includes(item.id);
    const equipped=item.category==="emote"
      ? state.economy.equipped.emote===item.value
      : item.category==="cosmetic"&&state.economy.equipped.accessory===item.value;
    const stock=item.type==="consumable"?inventory[item.id]:0;
    const full=item.type==="consumable"&&stock>=ECONOMY.maxConsumable;
    const disabled=state.coins<item.price||owned||full;
    const action=equipped
      ? '<button class="btn small dark" type="button" disabled>กำลังใช้อยู่</button>'
      : owned
        ? `<button class="btn small mint" type="button" data-shop-equip="${esc(item.id)}">สวมใส่ / เลือกใช้</button>`
        : `<button class="btn small ${item.type==="consumable"?"sky":"pink"}" type="button" data-shop-buy="${esc(item.id)}" ${disabled?"disabled":""}>${full?"เต็ม 9 ชิ้น":`ซื้อ ${item.price} Coin`}</button>`;
    return `<article class="shop-card ${owned?"owned":""} ${equipped?"equipped":""}" data-shop-item="${esc(item.id)}"><span class="shop-card-icon" aria-hidden="true">${esc(item.icon)}</span><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p><div class="shop-card-meta">${item.type==="consumable"?`<span class="shop-stock">มี ${stock}/${ECONOMY.maxConsumable}</span>`:`<span class="shop-stock">${owned?"ปลดล็อกแล้ว":"ปลดล็อกถาวร"}</span>`}<span class="shop-price">◉ ${item.price}</span></div>${action}</article>`;
  }).join("");
  view.innerHTML=`<section class="shop-page"><header class="shop-hero"><div><div class="eyebrow">PIXEL MARKET • FAIR PLAY</div><h1>ร้านค้านักผจญภัย</h1><p>Coin จากการตอบคำถามใช้ซื้อผู้ช่วยแบบจำกัดจำนวน และปลดล็อกท่าทางหรือชุดที่ไม่เพิ่มพลังโจมตี</p></div><div class="shop-balance"><span>ยอดคงเหลือ</span><b>◉ ${state.coins}</b><small>ตอบถูก +3 • ตอบผิด +1</small></div></header><div class="inventory-strip" aria-label="คลังไอเทมช่วยสอบ">${ECONOMY.catalog.filter(item=>item.type==="consumable").map(item=>`<div class="inventory-chip"><span>${esc(item.icon)} ${esc(item.name)}</span><b>${inventory[item.id]} ชิ้น</b></div>`).join("")}</div><nav class="shop-tabs" aria-label="หมวดร้านค้า">${Object.entries(categories).map(([id,label])=>`<button class="btn small ${shopFilter===id?"mint":"dark"}" type="button" data-shop-filter="${id}" aria-selected="${shopFilter===id}">${label}</button>`).join("")}</nav><div class="shop-grid">${cards}</div><div class="hero-actions"><button class="btn" type="button" data-go="practice">หา Coin จากฝึกด่วน</button><button class="btn dark" type="button" data-go="adventure">กลับโลกผจญภัย</button></div></section>`;
  $$('[data-shop-filter]').forEach(button=>button.onclick=()=>{shopFilter=button.dataset.shopFilter;renderShop();});
  $$('[data-shop-buy]').forEach(button=>button.onclick=()=>{
    const result=ECONOMY.purchase(state.economy,state.coins,button.dataset.shopBuy);
    if(!result.ok){showToast(result.reason==="coins"?"Coin ยังไม่พอ ลุยตอบคำถามเพิ่มก่อน":"ซื้อรายการนี้ไม่ได้");return;}
    state.economy=result.economy;
    state.coins=result.coins;
    saveState();
    sfx.win();
    showToast(`ได้รับ ${result.item.name} แล้ว`);
    renderShop();
  });
  $$('[data-shop-equip]').forEach(button=>button.onclick=async()=>{
    const result=ECONOMY.equip(state.economy,button.dataset.shopEquip);
    if(!result.ok){showToast("ยังไม่ได้ปลดล็อกรายการนี้");return;}
    state.economy=result.economy;
    saveState();
    if(result.item.category==="cosmetic"){
      const profile=gameProfile();
      try{onlineState=await window.TeacherQuestOnline?.updateProfile?.(profile)||onlineState;}
      catch(error){showToast("สวมในเครื่องแล้ว • Firebase Rules ต้องเป็นชุดล่าสุดเพื่อให้เพื่อนเห็น");}
    }
    updateOnlineHud();
    showToast(`เลือกใช้ ${result.item.name} แล้ว`);
    renderShop();
  });
  bindCommon();
}

function renderProfile(){
  const stats = totalStats();
  const onlineProfile=onlineState.profile || {nickname:"ครูนักผจญภัย",avatar:{}};
  const cloudLabel=onlineState.cloudSync==="saving" ? "กำลังบันทึก Cloud" : onlineState.cloudSync==="error" ? "Cloud Save ขัดข้อง" : "Cloud Save พร้อม";
  const onlineStatus=onlineState.phase==="online" ? `เชื่อมต่อแล้ว • ${cloudLabel}` : onlineState.phase==="setup" ? "โหมดทดสอบในเครื่อง" : onlineState.phase==="error" ? "เชื่อมต่อขัดข้อง" : "กำลังเชื่อมต่อ";
  const onlineCard=`<section class="online-profile-card pixel-box">${window.TeacherQuestOnline?.avatarMarkup?.(onlineProfile) || ""}<div><h3>${esc(onlineProfile.nickname)} ${onlineState.isAdmin?'<span class="chip gold">TEST ADMIN</span>':""}</h3><p>${esc(onlineStatus)} • <b id="profileOnlineNow">${onlineState.onlineCount || 0}</b> ออนไลน์ • นักผจญภัยทั้งหมด <b id="profilePlayerTotal">${onlineState.totalPlayers || 0}</b> คน</p></div><button class="btn small mint" id="profileAvatarEdit">แต่งตัว / บัญชี</button></section>`;
  const achievements = [
    {icon:"⚔",name:"ก้าวแรก",desc:"ตอบข้อสอบครั้งแรก",ok:stats.attempted >= 1},
    {icon:"✦",name:"คอมโบ 10",desc:"ตอบถูกต่อเนื่อง 10 ข้อ",ok:state.maxCombo >= 10},
    {icon:"▤",name:"นักสำรวจ",desc:"ทำข้อสอบอย่างน้อย 8 ดินแดน",ok:D.modules.filter(item => moduleStats(item.id).done > 0).length >= 8},
    {icon:"♜",name:"ผู้พิชิต",desc:"ได้คะแนนสนามสอบอย่างน้อย 80%",ok:state.examHistory.some(item => item.pct >= 80)},
    {icon:"◆",name:"คลังสมบัติ",desc:"สะสม 300 เหรียญ",ok:state.coins >= 300},
    {icon:"★",name:"ปรมาจารย์",desc:"ขึ้นถึงเลเวล 20",ok:level() >= 20}
  ];
  view.innerHTML = `<section class="panel pixel-box"><div class="panel-title"><div><h2>สมุดนักผจญภัย</h2><small>เลเวล ${level()} • ${rankName()}</small></div></div>${onlineCard}<div class="profile-grid"><div><div class="dashboard"><div class="stat-card pixel-box"><b>${stats.accuracy}%</b><span>ความแม่นรวม</span></div><div class="stat-card pixel-box"><b>${stats.attempts}</b><span>จำนวนครั้งที่ตอบ</span></div><div class="stat-card pixel-box"><b>${state.examHistory.length}</b><span>รอบสนามสอบ</span></div><div class="stat-card pixel-box"><b>${state.bookmarks.length}</b><span>ข้อที่เก็บไว้</span></div></div><div class="section-head"><div><h2>พลังรายดินแดน</h2></div></div>${D.modules.map(item => { const stats = moduleStats(item.id); return `<div class="chart-row"><span class="inline-module-label">${moduleIconMarkup(item,"tiny")} ${esc(item.title)}</span><div class="bar"><i style="width:${stats.accuracy}%"></i></div><b>${stats.accuracy}%</b></div>`; }).join("")}</div><div><div class="section-head"><div><h2>เหรียญตรา</h2></div></div><div class="achievement-grid">${achievements.map(item => `<article class="achievement pixel-box ${item.ok ? "unlocked" : ""}"><span class="medal">${item.icon}</span><span><h3>${esc(item.name)}</h3><p>${esc(item.desc)}</p></span></article>`).join("")}</div><div class="section-head"><div><h2>ประวัติสนามสอบ</h2></div></div>${state.examHistory.length ? state.examHistory.slice(0,8).map(item => `<div class="review-card pixel-box"><div><h3>${item.pct}% • ${item.score}/${item.total}</h3><p>${esc(item.date)}</p></div></div>`).join("") : '<div class="empty">ยังไม่มีประวัติสนามสอบ</div>'}</div></div></section>`;
  $("#profileAvatarEdit").onclick=openOnlineDialog;
}

const AVATAR_GROUP_LABELS=Object.freeze({skin:"สีผิว",hair:"สีผม",shirt:"ชุด",accent:"สีประจำตัว",style:"ทรงผม"});
const AVATAR_STYLE_LABELS=Object.freeze({short:"สั้น",spike:"ตั้ง",long:"ยาว",cap:"หมวก"});

function avatarOptionsMarkup(profile){
  const options=window.TeacherQuestOnline?.avatarOptions || {};
  return Object.entries(options).filter(([group])=>group!=="accessory").map(([group,values])=>`<div class="avatar-option-group"><span class="avatar-option-title">${esc(AVATAR_GROUP_LABELS[group] || group)}</span><div class="avatar-swatches">${values.map(value=>{
    const selected=profile.avatar?.[group]===value;
    const label=group==="style" ? AVATAR_STYLE_LABELS[value] || value : value;
    const style=group==="style" ? "" : ` style="--swatch:${esc(value)}"`;
    return `<button type="button" class="avatar-swatch ${selected ? "selected" : ""}" data-avatar-group="${esc(group)}" data-avatar-value="${esc(value)}"${style} aria-label="${esc(AVATAR_GROUP_LABELS[group])} ${esc(label)}" aria-pressed="${selected}">${group==="style" ? esc(label) : ""}</button>`;
  }).join("")}</div></div>`).join("");
}

function firebaseDiagnosticMarkup(report){
  const claims=report?.claims || {};
  const steps=Array.isArray(report?.steps) ? report.steps : [];
  const status=report?.ok ? "ผ่านทุกจุด" : "พบจุดที่ถูกปฏิเสธ";
  return `<section class="firebase-diagnostic-result ${report?.ok ? "pass" : "fail"}"><h3>${report?.ok ? "✓" : "!"} ผลตรวจ Firebase: ${status}</h3><div class="firebase-claim-grid"><span>บัญชียืนยันอีเมล <b>${claims.emailVerified ? "ผ่าน" : "ไม่ผ่าน"}</b></span><span>เข้าใช้ผ่าน <b>${esc(claims.signInProvider || "unknown")}</b></span><span>ผูก Google <b>${claims.googleLinked ? "แล้ว" : "ยัง"}</b></span><span>Rules ที่เว็บต้องการ <b>${esc(claims.rulesRevision || "-")}</b></span></div><ol class="firebase-diagnostic-steps">${steps.map(step=>`<li class="${step.ok ? "pass" : "fail"}"><strong>${step.ok ? "ผ่าน" : "ไม่ผ่าน"} — ${esc(step.label)}</strong>${step.error ? `<small>${esc(step.error)}</small>` : ""}</li>`).join("")}</ol>${report?.ok ? "<p>สิทธิ์พื้นฐานและการสร้าง Raid ผ่านแล้ว ลองสร้างห้องจริงได้ทันที</p>" : "<p>ถ้าผ่านทุกข้อยกเว้น Raid แปลว่า Realtime Database ยังใช้ Rules ชุดเก่า ให้คัดลอกไฟล์ล่าสุดและกด Publish อีกครั้ง</p>"}</section>`;
}

function openOnlineDialog(){
  onlineState=window.TeacherQuestOnline?.getState?.() || onlineState;
  const api=window.TeacherQuestOnline;
  const draft=clone(onlineState.profile || {nickname:"ครูนักผจญภัย",avatar:{}});
  const statusText=onlineState.phase==="online" ? "เชื่อมต่อ Firebase แล้ว" : onlineState.phase==="connecting" ? "กำลังเชื่อม Firebase" : onlineState.phase==="error" ? "เชื่อมต่อไม่สำเร็จ" : "โหมดออฟไลน์ — แต่งตัวได้ แต่ยังไม่เห็นเพื่อน";
  const setupNotice=!onlineState.configured
    ? `<div class="online-alert"><strong>เหลือผูก Firebase Project ฟรีหนึ่งครั้ง</strong><br>โค้ดระบบออนไลน์พร้อมแล้ว เมื่อใส่ Web App Config ผู้เล่นจะเข้าสู่ระบบด้วย Google และพบกันในแผนที่</div>`
    : onlineState.error ? `<div class="online-alert error">${esc(onlineState.error)}</div>` : "";
  const googleConnected=onlineState.user && !onlineState.user.isAnonymous;
  const retryButton=googleConnected && onlineState.phase==="error" ? '<button class="btn small sky" type="button" id="retryOnline">ลองเชื่อมต่อใหม่</button>' : "";
  const diagnosticButton=googleConnected ? '<button class="btn small sky" type="button" id="runFirebaseDiagnostic">ตรวจสิทธิ์ Firebase</button>' : "";
  openModal(`<div class="eyebrow">ONLINE PIXEL ID • CLOUD SAVE</div><h2 id="modalTitle">บัญชีและตัวละคร</h2><div class="online-summary"><div class="online-avatar-preview" id="onlineAvatarPreview">${api?.avatarMarkup?.(draft,"large") || ""}</div><div><div class="online-status-line"><span class="online-dot" aria-hidden="true"></span><span>${esc(statusText)}</span></div><div class="online-stats"><div class="online-stat"><b>${onlineState.onlineCount || 0}</b><small>ออนไลน์ตอนนี้</small></div><div class="online-stat"><b>${onlineState.totalPlayers || 0}</b><small>นักผจญภัยทั้งหมด</small></div></div></div></div>${setupNotice}<form class="online-form" id="onlineProfileForm"><label for="onlineNickname">ชื่อที่แสดงในเกม<input id="onlineNickname" type="text" minlength="2" maxlength="20" value="${esc(draft.nickname)}" autocomplete="nickname" required></label>${avatarOptionsMarkup(draft)}<div class="online-actions"><button class="btn small mint" type="submit" id="saveOnlineProfile">บันทึกตัวละคร</button>${retryButton}${diagnosticButton}${googleConnected ? '<button class="btn small dark" type="button" id="signOutGoogle">ออกจากระบบ</button>' : ""}${!onlineState.configured ? '<a class="btn small dark" href="FIREBASE_ONLINE_SETUP.md" target="_blank" rel="noopener">เปิดคู่มือตั้งค่า</a>' : ""}</div><div id="firebaseDiagnostic" class="firebase-diagnostic" role="status" aria-live="polite" hidden></div><p class="online-help">Google ID ใช้บันทึกคะแนน ข้อที่เคยทำ บุ๊กมาร์ก ประวัติสอบ และตำแหน่งขึ้น Cloud ผู้เล่นอื่นจะเห็นเฉพาะชื่อ ชุด และตำแหน่งในโลกเกม โดยไม่เห็นอีเมล</p></form>`);
  const refreshDraft=()=>{
    $("#onlineAvatarPreview").innerHTML=api?.avatarMarkup?.(draft,"large") || "";
    $$("[data-avatar-group]",modalBody).forEach(button=>{
      const selected=draft.avatar?.[button.dataset.avatarGroup]===button.dataset.avatarValue;
      button.classList.toggle("selected",selected);
      button.setAttribute("aria-pressed",String(selected));
    });
  };
  $$("[data-avatar-group]",modalBody).forEach(button=>button.onclick=()=>{
    draft.avatar={...(draft.avatar||{}),[button.dataset.avatarGroup]:button.dataset.avatarValue};
    refreshDraft();
  });
  $("#onlineProfileForm").onsubmit=async event=>{
    event.preventDefault();
    const saveButton=$("#saveOnlineProfile");
    saveButton.disabled=true;
    saveButton.textContent="กำลังบันทึก…";
    try{
      draft.nickname=$("#onlineNickname").value;
      onlineState=await api.updateProfile(draft);
      updateOnlineHud();
      adventureInstance?.setPlayerProfile?.(onlineState.profile);
      closeModal();
      showToast(onlineState.configured ? "บันทึกตัวละครออนไลน์แล้ว" : "บันทึกตัวละครในเครื่องแล้ว");
    }catch(error){
      saveButton.disabled=false;
      saveButton.textContent="บันทึกตัวละคร";
      showToast(error.message || "บันทึกไม่สำเร็จ");
    }
  };
  $("#signOutGoogle")?.addEventListener("click",async()=>{
    if(!confirm("ออกจากระบบ Google หรือไม่? ข้อมูลที่บันทึกไว้บน Cloud จะไม่ถูกลบ")) return;
    await api.signOut();
    closeModal();
    showToast("ออกจากระบบแล้ว");
  });
  $("#retryOnline")?.addEventListener("click",async event=>{
    const button=event.currentTarget;
    button.disabled=true;
    button.textContent="กำลังเชื่อมต่อ…";
    try{
      onlineState=await api.reconnect();
      updateOnlineHud();
      closeModal();
      showToast(onlineState.phase==="online" ? "กลับมาออนไลน์แล้ว" : onlineState.error || "ยังเชื่อมต่อไม่สำเร็จ");
    }catch(error){
      button.disabled=false;
      button.textContent="ลองเชื่อมต่อใหม่";
      showToast(error.message || "ยังเชื่อมต่อไม่สำเร็จ");
    }
  });
  $("#runFirebaseDiagnostic")?.addEventListener("click",async event=>{
    const button=event.currentTarget;
    const panel=$("#firebaseDiagnostic");
    button.disabled=true;
    button.textContent="กำลังตรวจ 5 จุด…";
    panel.hidden=false;
    panel.innerHTML='<div class="firebase-diagnostic-loading">กำลังทดสอบโปรไฟล์ Cloud สถานะออนไลน์ แชตใกล้ตัว และการสร้าง Raid ชั่วคราว…</div>';
    try{
      const report=await api.diagnosePermissions();
      panel.innerHTML=firebaseDiagnosticMarkup(report);
      button.textContent="ตรวจสิทธิ์อีกครั้ง";
    }catch(error){
      panel.innerHTML=`<div class="online-alert error">${esc(error.message || "ตรวจสิทธิ์ไม่สำเร็จ")}</div>`;
      button.textContent="ลองตรวจอีกครั้ง";
    }finally{
      button.disabled=false;
    }
  });
}

function openSettings(){
  state = loadState();
  openModal(`<h2 id="modalTitle">⚙ ตั้งค่าเกม</h2><div class="setting-row"><span id="musicSettingLabel">เพลงประกอบ<br><small>ธีมปัจจุบัน: ${esc(musicSceneLabel)}</small></span><button class="btn small ${state.settings.music ? "mint" : "dark"}" id="setMusic" aria-label="เพลงประกอบ: ${state.settings.music ? "เปิดอยู่ กดเพื่อปิด" : "ปิดอยู่ กดเพื่อเปิด"}">${state.settings.music ? "เปิด" : "ปิด"}</button></div><div class="setting-row"><span id="soundSettingLabel">เสียงเอฟเฟกต์</span><button class="btn small ${state.settings.sound ? "mint" : "dark"}" id="setSound" aria-label="เสียงเอฟเฟกต์: ${state.settings.sound ? "เปิดอยู่ กดเพื่อปิด" : "ปิดอยู่ กดเพื่อเปิด"}">${state.settings.sound ? "เปิด" : "ปิด"}</button></div><div class="setting-row"><label for="volume">ระดับเสียง</label><input id="volume" type="range" min="0" max="1" step="0.05" value="${state.settings.volume}"></div><div class="setting-row"><label for="reduce">ลดการเคลื่อนไหว</label><input id="reduce" type="checkbox" ${state.settings.reduced ? "checked" : ""}></div><div class="setting-row"><span>เวอร์ชันคัมภีร์</span><b>${D.version} • ${D.questions.length} ข้อ</b></div><p><button class="btn small red" id="resetData">เริ่มความคืบหน้าใหม่</button></p>`);
  $("#setMusic").onclick = () => { toggleMusic(); openSettings(); };
  $("#setSound").onclick = () => { toggleSound(); openSettings(); };
  $("#volume").oninput = event => { state.settings.volume = Number(event.target.value); saveState(); };
  $("#reduce").onchange = event => { state.settings.reduced = event.target.checked; saveState(); };
  $("#resetData").onclick = () => {
    if(confirm("ล้างความคืบหน้า คะแนน และประวัติทั้งหมดหรือไม่?")){
      localStorage.removeItem(STORAGE);
      state = {...clone(defaults),localUpdatedAt:Date.now()};
      localStorage.setItem(STORAGE,JSON.stringify(state));
      window.TeacherQuestOnline?.saveProgress?.();
      resetDaily();
      closeModal();
      go("adventure");
      showToast("เริ่มการเดินทางใหม่แล้ว");
    }
  };
}

function bindGlobal(){
  $$('[data-view]').forEach(button => button.addEventListener("click",() => { sfx.select(); go(button.dataset.view); }));
  $("#musicBtn").onclick = toggleMusic;
  $("#soundBtn").onclick = toggleSound;
  $("#settingsBtn").onclick = openSettings;
  $("#shopShortcut").onclick = () => go("shop");
  $("#onlineBtn").onclick = openOnlineDialog;
  $("#avatarEditBtn").onclick = openOnlineDialog;
  authGateButton?.addEventListener("click",async()=>{
    authGateButton.disabled=true;
    authGateButtonText.textContent="กำลังเปิด Google…";
    authGateStatus.textContent="เลือกบัญชี Google เพื่อเข้าสู่เกม";
    try{
      onlineState=await window.TeacherQuestOnline.signInGoogle();
      updateOnlineHud();
    }catch(error){
      authGateButton.disabled=false;
      authGateButtonText.textContent="ลองเข้าสู่ระบบอีกครั้ง";
      authGateStatus.textContent=error.message || "เข้าสู่ระบบไม่สำเร็จ";
    }
  });
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
    const typingTarget=event.target?.matches?.("input,textarea,select,[contenteditable=true]");
    if(currentView==="adventure" && onlineState.voice?.enabled && event.code==="KeyV" && !typingTarget){
      event.preventDefault();
      if(!event.repeat) window.TeacherQuestOnline?.setVoiceTalking?.(true);
      return;
    }
    if(battle && !battle.locked && ["1","2","3","4"].includes(event.key)){
      battle.selected = Number(event.key) - 1;
      renderBattle();
    }
    if(battle && event.key === "Enter" && battle.selected !== null && !battle.locked) submitBattle();
    if(currentView==="raid" && raidGame && !raidGame.locked && ["1","2","3","4"].includes(event.key)){
      raidGame.selected=Number(event.key)-1;
      renderRaidBattle(onlineState.raid);
    }
    if(currentView==="raid" && raidGame && event.key==="Enter" && raidGame.selected!==null && !raidGame.locked) void submitRaidAnswer();
  });
  document.addEventListener("keyup",event=>{
    if(event.code==="KeyV") window.TeacherQuestOnline?.setVoiceTalking?.(false);
  });
  window.addEventListener("storage",event => { if(event.key === STORAGE) refreshState(); });
  window.addEventListener("teacherquest:local-state",refreshState);
  window.addEventListener("teacherquest:online",event=>{
    const previousRaid=onlineState.raid;
    onlineState=event.detail || onlineState;
    updateOnlineHud();
    adventureInstance?.setPlayerProfile?.(gameProfile());
    adventureInstance?.setRemotePlayers?.(onlineState.zonePlayers || []);
    adventureInstance?.setZoneMessages?.(onlineState.zoneMessages || []);
    if($("#profileOnlineNow")) $("#profileOnlineNow").textContent=onlineState.onlineCount || 0;
    if($("#profilePlayerTotal")) $("#profilePlayerTotal").textContent=onlineState.totalPlayers || 0;
    updateAuthGate();
    updateRaidLiveView(previousRaid);
  });
  document.addEventListener("pointerdown",unlockMusic,{once:true});
  document.addEventListener("keydown",unlockMusic,{once:true});
}

function init(){
  resetDaily();
  const errors = validateData();
  bindGlobal();
  updateAuthGate();
  updateHud();
  if(errors.length){
    console.error(errors);
    view.innerHTML = `<section class="panel pixel-box"><h2>พบข้อผิดพลาดในคลังข้อสอบ</h2><pre>${esc(errors.join("\n"))}</pre></section>`;
    return;
  }
  go("adventure");
}

window.teacherQuestSetMusicScene = setMusicScene;
window.teacherQuestMusicDebug = {
  getState:() => ({scene:musicScene,label:musicSceneLabel,bpm:MUSIC_THEMES[musicScene].bpm,variant:musicVariant,playing:Boolean(musicTimer),themeCount:Object.keys(MUSIC_THEMES).length})
};
window.teacherQuestRaidDebug={
  render:()=>go("raid"),
  getState:()=>raidGame ? clone(raidGame) : null,
  questionIds:raid=>raidQuestionPool(raid || onlineState.raid).map(question=>question.id)
};
window.teacherQuestEconomyDebug={
  render:()=>go("shop"),
  getState:()=>({coins:state.coins,economy:clone(state.economy),catalog:ECONOMY.catalog.map(item=>({...item}))}),
  grantCoins:value=>{state.coins=Math.max(0,state.coins+Math.floor(Number(value)||0));saveState();return state.coins;},
  purchase:id=>{const result=ECONOMY.purchase(state.economy,state.coins,id);if(result.ok){state.economy=result.economy;state.coins=result.coins;saveState();}return clone(result);},
  consume:id=>{const result=ECONOMY.consume(state.economy,id);if(result.ok){state.economy=result.economy;saveState();}return clone(result);}
};

init();
})();
