(()=>{
"use strict";

const DATA = window.GAME_DATA;
if(!DATA || !Array.isArray(DATA.questions)) return;

const STORAGE = "teacherQuest2569_v3";
const RETURN_KEY = "teacherQuestV4Return";
const letters = ["ก","ข","ค","ง"];
const view = document.querySelector("#view");
const navList = document.querySelector(".nav-list");
const topInner = document.querySelector(".top-inner");
let active = false;
let drill = null;
let cards = null;

const esc = value => String(value ?? "").replace(/[&<>"']/g,char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char]);
const shuffle = items => items.slice().sort(() => Math.random() - .5);
const unique = items => [...new Map(items.map(item => [item.id,item])).values()];
const today = () => new Date().toLocaleDateString("sv-SE");

function readState(){
  let state;
  try{ state = JSON.parse(localStorage.getItem(STORAGE) || "{}"); }
  catch{ state = {}; }
  state.xp = Number(state.xp) || 0;
  state.coins = Number(state.coins) || 0;
  state.maxCombo = Number(state.maxCombo) || 0;
  state.records = state.records && typeof state.records === "object" ? state.records : {};
  state.bookmarks = Array.isArray(state.bookmarks) ? state.bookmarks : [];
  state.examHistory = Array.isArray(state.examHistory) ? state.examHistory : [];
  state.daily = state.daily && state.daily.date === today() ? state.daily : {date:today(),count:0};
  state.settings = state.settings || {music:true,sound:true,volume:.35,reduced:false};
  state.v4 = state.v4 || {sessions:0,answered:0,correct:0};
  return state;
}

function writeState(state,{touch=true}={}){
  if(touch) state.cloudUpdatedAt = Date.now();
  localStorage.setItem(STORAGE,JSON.stringify(state));
  updateHud(state);
  window.dispatchEvent(new CustomEvent("teacherquest:local-state",{detail:{updatedAt:state.cloudUpdatedAt || 0}}));
}

function updateHud(state=readState()){
  const level = Math.floor(state.xp / 100) + 1;
  const progress = state.xp % 100;
  const records = Object.values(state.records);
  const attempts = records.reduce((sum,item) => sum + (Number(item.attempts)||0),0);
  const correct = records.reduce((sum,item) => sum + (Number(item.correct)||0),0);
  const accuracy = attempts ? Math.round(correct / attempts * 100) : 0;
  const setText = (selector,value) => { const element=document.querySelector(selector); if(element) element.textContent=value; };
  setText("#topLevel",level);
  setText("#topCoins",state.coins);
  setText("#xpText",`${progress} / 100`);
  setText("#sideStreak",state.maxCombo);
  setText("#sideMastery",accuracy);
  setText("#dailyQuestCount",`${Math.min(state.daily.count||0,10)} / 10`);
  const xp = document.querySelector("#xpBar"); if(xp) xp.style.width = `${progress}%`;
  const daily = document.querySelector("#dailyQuestBar"); if(daily) daily.style.width = `${Math.min((state.daily.count||0)*10,100)}%`;
}

function recordStats(question,state){
  const record = state.records[question.id];
  if(!record) return {attempts:0,correct:0,accuracy:0,lastWrong:false};
  const attempts = Number(record.attempts)||0;
  const correct = Number(record.correct)||0;
  return {attempts,correct,accuracy:attempts ? correct/attempts : 0,lastWrong:Boolean(record.lastWrong)};
}

function moduleReport(state=readState()){
  return DATA.modules.map(module => {
    const questions = DATA.questions.filter(question => question.module === module.id);
    let attempts=0,correct=0,seen=0,wrong=0;
    questions.forEach(question => {
      const stats = recordStats(question,state);
      if(stats.attempts){ seen++; attempts+=stats.attempts; correct+=stats.correct; if(stats.lastWrong || stats.accuracy<.7) wrong++; }
    });
    return {...module,total:questions.length,seen,wrong,accuracy:attempts ? Math.round(correct/attempts*100) : 0,attempts};
  }).sort((a,b) => {
    const aScore = a.attempts ? a.accuracy : -1;
    const bScore = b.attempts ? b.accuracy : -1;
    return aScore-bScore || b.wrong-a.wrong;
  });
}

function overall(state=readState()){
  const records = Object.values(state.records);
  const attempts = records.reduce((sum,item)=>sum+(Number(item.attempts)||0),0);
  const correct = records.reduce((sum,item)=>sum+(Number(item.correct)||0),0);
  const unseen = DATA.questions.filter(question => !state.records[question.id]).length;
  const weak = DATA.questions.filter(question => {
    const stats = recordStats(question,state);
    return stats.attempts && (stats.lastWrong || stats.accuracy < .7);
  }).length;
  return {attempts,correct,accuracy:attempts?Math.round(correct/attempts*100):0,unseen,weak};
}

function cloudLabel(){
  const cloud = window.TeacherQuestCloud;
  if(!cloud) return {className:"warn",text:"กำลังเตรียมระบบบัญชี"};
  const status = cloud.getStatus?.() || {};
  if(!status.configured) return {className:"warn",text:"พร้อมเชื่อม Firebase ฟรี เมื่อใส่ค่าตั้งค่า"};
  if(status.user) return {className:"online",text:`เชื่อมแล้ว: ${status.user.email || "บัญชีผู้ใช้"}`};
  if(status.loading) return {className:"warn",text:"กำลังเชื่อมต่อ Firebase"};
  return {className:"",text:"ยังไม่ได้เข้าสู่ระบบออนไลน์"};
}

function activate(){
  active = true;
  document.querySelectorAll(".nav-btn").forEach(button => button.classList.remove("active"));
  document.querySelector("#v4CoachBtn")?.classList.add("active");
  renderCoach();
  window.scrollTo({top:0,behavior:"smooth"});
}

function renderCoach(){
  drill = null;
  cards = null;
  const state = readState();
  const total = overall(state);
  const reports = moduleReport(state);
  const weakReports = reports.slice(0,6);
  const cloud = cloudLabel();
  view.className = "view v4-view";
  view.innerHTML = `
    <section class="hero pixel-box">
      <div class="hero-grid">
        <div>
          <div class="eyebrow">SMART TRAINING • V4</div>
          <h1>ศูนย์ฝึก<br><span>อัจฉริยะ</span></h1>
          <p>วิเคราะห์ข้อที่ยังไม่แม่น จัดชุดฝึกเฉพาะจุด ใช้ไอเทมช่วยคิด และสำรองความคืบหน้าได้โดยไม่เสียค่าใช้จ่าย</p>
          <div class="hero-actions">
            <button class="btn mint" data-v4-mode="weak">ฝึกแก้จุดอ่อน</button>
            <button class="btn sky" data-v4-mode="mixed">ชุดแนะนำอัตโนมัติ</button>
            <button class="btn dark" data-v4-action="flash">เปิดแฟลชการ์ด</button>
          </div>
        </div>
        <div class="hero-art"><div class="portal"></div><div class="teacher-sprite"><i class="hair"></i><i class="face"></i><i class="body"></i><i class="book"></i><i class="legs"></i></div><div class="float-badge one">V4 COACH</div><div class="float-badge two">FREE SYNC</div></div>
      </div>
    </section>

    <div class="section-head"><div><h2>ภาพรวมการฝึก</h2><p>คำนวณจากประวัติในอุปกรณ์นี้</p></div><span class="v4-badge">คลัง ${DATA.questions.length} ข้อ</span></div>
    <section class="v4-grid">
      <article class="v4-card"><span class="big">${total.accuracy}%</span><h3>ความแม่นยำรวม</h3><p>ตอบถูก ${total.correct} จาก ${total.attempts} ครั้ง</p></article>
      <article class="v4-card"><span class="big">${total.weak}</span><h3>ข้อที่ควรแก้มือ</h3><p>ข้อที่ตอบผิดล่าสุดหรือความแม่นยำต่ำกว่า 70%</p></article>
      <article class="v4-card"><span class="big">${total.unseen}</span><h3>ข้อที่ยังไม่เคยพบ</h3><p>ใช้โหมดสำรวจข้อใหม่เพื่อเปิดพื้นที่ความรู้</p></article>
    </section>

    <div class="section-head"><div><h2>เลือกภารกิจฝึก</h2><p>ระบบจะสุ่มไม่เกิน 10 ข้อต่อรอบ</p></div></div>
    <section class="v4-mode-grid">
      ${modeCard("weak","🩹","แก้จุดอ่อน","เน้นข้อที่เคยผิดและหมวดที่คะแนนต่ำ","แนะนำ")}
      ${modeCard("unseen","🔭","สำรวจข้อใหม่","เลือกเฉพาะข้อที่ยังไม่เคยตอบ","เปิดแผนที่")}
      ${modeCard("hard","👑","ด่านยาก","คัดเฉพาะโจทย์ระดับยากและข้อหลอก","ท้าทาย")}
      ${modeCard("scenario","🎭","สถานการณ์จริง","ฝึกตัดสินใจและประยุกต์ใช้หลักการ","คิดวิเคราะห์")}
      ${modeCard("bookmarks","🔖","ข้อที่บันทึกไว้","ทบทวนรายการโปรดจากห้องฝึกเดิม","เฉพาะคุณ")}
      ${modeCard("mixed","⚗️","ชุดผสมอัจฉริยะ","ผสมข้ออ่อน ข้อใหม่ ข้อยาก และสถานการณ์","สมดุล")}
    </section>

    <div class="section-head"><div><h2>เรดาร์จุดอ่อนรายดินแดน</h2><p>หมวดที่ยังไม่เคยทำจะแสดง 0% เพื่อชวนเริ่มสำรวจ</p></div></div>
    <section class="panel pixel-box"><div class="v4-weak-list">
      ${weakReports.map(item => `<div class="v4-weak-row"><span>${item.icon} ${esc(item.title)}</span><div class="meter"><i style="width:${item.accuracy}%"></i></div><b>${item.accuracy}%</b></div>`).join("")}
    </div></section>

    <div class="section-head"><div><h2>สำรองข้อมูลและบัญชีฟรี</h2><p>ใช้ไฟล์สำรองได้ทันที ส่วนซิงก์ออนไลน์ใช้ Firebase Spark โดยไม่ใช้ระบบชำระเงิน</p></div></div>
    <section class="v4-grid two">
      <article class="v4-card"><h3>📦 สำรองในไฟล์</h3><p>ย้ายคะแนน เลเวล เหรียญ บุ๊กมาร์ก และประวัติไปเครื่องอื่นได้</p><div class="v4-actions"><button class="v4-btn sky" data-v4-action="export">ส่งออกข้อมูล</button><button class="v4-btn dark" data-v4-action="import">นำเข้าข้อมูล</button><input id="v4ImportFile" class="v4-file" type="file" accept="application/json,.json"></div></article>
      <article class="v4-card"><h3>☁️ ซิงก์ออนไลน์</h3><p>สมัครด้วยอีเมลและรหัสผ่าน แล้วเลือกอัปโหลดหรือดึงข้อมูลด้วยตัวเอง</p><div class="v4-status"><span class="v4-dot ${cloud.className}"></span><span id="v4CloudText">${esc(cloud.text)}</span></div><div class="v4-actions"><button class="v4-btn mint" data-v4-action="account">จัดการบัญชี</button></div></article>
    </section>`;
  bindCoach();
}

function modeCard(mode,icon,title,description,tag){
  return `<button class="v4-mode" data-v4-mode="${mode}"><span>${icon}</span><h3>${title}</h3><p>${description}</p><small>${tag}</small></button>`;
}

function selectQuestions(mode,state){
  const weak = DATA.questions.filter(question => {
    const stats = recordStats(question,state);
    return stats.attempts && (stats.lastWrong || stats.accuracy < .7);
  });
  const unseen = DATA.questions.filter(question => !state.records[question.id]);
  const hard = DATA.questions.filter(question => question.difficulty === "ยาก");
  const scenario = DATA.questions.filter(question => /สถานการณ์|ประยุกต์|วิเคราะห์/.test(question.type || ""));
  const bookmarks = DATA.questions.filter(question => state.bookmarks.map(Number).includes(Number(question.id)));
  const map = {weak,unseen,hard,scenario,bookmarks};
  let pool;
  if(mode === "mixed") pool = unique([...shuffle(weak).slice(0,4),...shuffle(unseen).slice(0,3),...shuffle(hard).slice(0,2),...shuffle(scenario).slice(0,2)]);
  else pool = map[mode] || DATA.questions;
  if(pool.length < 5) pool = unique([...pool,...shuffle(DATA.questions)]);
  return shuffle(pool).slice(0,Math.min(10,pool.length));
}

function startDrill(mode){
  const state = readState();
  const questions = selectQuestions(mode,state);
  if(!questions.length){ alert("ยังไม่มีข้อในโหมดนี้ ลองเลือกชุดผสมอัจฉริยะ"); return; }
  drill = {mode,questions,index:0,combo:0,best:0,correct:0,answered:false,selected:null,eliminated:[],shield:false,items:{eliminate:2,shield:1,hint:2}};
  renderDrill();
}

function renderDrill(){
  const question = drill.questions[drill.index];
  const progress = Math.round(drill.index / drill.questions.length * 100);
  const answer = drill.selected;
  view.innerHTML = `
    <section class="panel pixel-box">
      <div class="v4-drill-head"><div><div class="eyebrow">SMART DRILL • ${esc(drill.mode.toUpperCase())}</div><h2 style="margin:4px 0">ภารกิจข้อ ${drill.index+1} / ${drill.questions.length}</h2><div class="v4-drill-meta"><span class="v4-chip gold">${esc(question.difficulty)}</span><span class="v4-chip">${esc(question.type)}</span><span class="v4-chip">${esc(DATA.modules.find(item=>item.id===question.module)?.title || question.module)}</span></div></div><div class="v4-combo">🔥 ${drill.combo}</div></div>
      <div class="meter" style="margin-bottom:14px"><i style="width:${progress}%"></i></div>
      <article class="v4-question">
        <h2>${esc(question.question)}</h2>
        <div class="v4-options">${question.options.map((option,index) => optionHtml(question,option,index,answer)).join("")}</div>
        <div class="v4-items">
          ${itemButton("eliminate","✂️","ตัดตัวเลือก",drill.items.eliminate)}
          ${itemButton("shield","🛡️",drill.shield?"เปิดโล่แล้ว":"โล่คอมโบ",drill.items.shield,drill.shield)}
          ${itemButton("hint","💡","คำใบ้",drill.items.hint)}
        </div>
        <div id="v4Hint"></div>
        ${drill.answered ? feedbackHtml(question) : ""}
      </article>
      <div class="v4-actions"><button class="v4-btn dark" data-v4-action="quit">ออกจากรอบฝึก</button>${drill.answered ? `<button class="v4-btn mint" data-v4-action="next">${drill.index===drill.questions.length-1?"ดูผลภารกิจ":"ข้อต่อไป"}</button>` : ""}</div>
    </section>`;
  bindDrill();
}

function optionHtml(question,option,index,selected){
  let classes = "v4-option";
  if(drill.eliminated.includes(index)) classes += " eliminated";
  if(drill.answered && index === question.answer) classes += " correct";
  if(drill.answered && index === selected && index !== question.answer) classes += " wrong";
  return `<button class="${classes}" data-v4-answer="${index}" ${drill.answered||drill.eliminated.includes(index)?"disabled":""}><b>${letters[index]}</b><span>${esc(option)}</span></button>`;
}

function itemButton(item,icon,label,count,on=false){
  return `<button class="v4-item ${on?"on":""}" data-v4-item="${item}" ${drill.answered||count<=0||on?"disabled":""}><i>${icon}</i><span>${label}</span><em>×${count}</em></button>`;
}

function feedbackHtml(question){
  const correct = drill.selected === question.answer;
  return `<div class="v4-feedback ${correct?"good":"bad"}"><h3>${correct?"✅ ตอบถูก":"❌ ยังไม่ถูก"}</h3><p>${esc(question.explanation)}</p><small>แหล่งเนื้อหา: ${esc(question.source || "คลังความรู้ครูเควสต์")}</small></div>`;
}

function answerQuestion(index){
  if(drill.answered) return;
  const question = drill.questions[drill.index];
  const correct = index === question.answer;
  drill.selected = index;
  drill.answered = true;
  if(correct){ drill.combo++; drill.correct++; }
  else if(drill.shield){ drill.shield=false; }
  else drill.combo=0;
  drill.best = Math.max(drill.best,drill.combo);
  const state = readState();
  const record = state.records[question.id] || {attempts:0,correct:0,lastWrong:false};
  record.attempts = (Number(record.attempts)||0)+1;
  if(correct) record.correct = (Number(record.correct)||0)+1;
  record.lastWrong = !correct;
  record.lastAt = Date.now();
  state.records[question.id] = record;
  state.daily.count = (Number(state.daily.count)||0)+1;
  state.xp += correct ? 8 : 2;
  state.coins += correct ? 3 : 1;
  state.maxCombo = Math.max(state.maxCombo,drill.best);
  state.v4.answered = (Number(state.v4.answered)||0)+1;
  if(correct) state.v4.correct = (Number(state.v4.correct)||0)+1;
  writeState(state);
  renderDrill();
}

function useItem(item){
  const question = drill.questions[drill.index];
  if(drill.answered || drill.items[item] <= 0) return;
  if(item === "eliminate"){
    const candidates = question.options.map((_,index)=>index).filter(index => index!==question.answer && !drill.eliminated.includes(index));
    if(candidates.length) drill.eliminated.push(shuffle(candidates)[0]);
  }
  if(item === "shield") drill.shield = true;
  if(item === "hint"){
    const module = DATA.modules.find(entry=>entry.id===question.module);
    const hint = `คำใบ้: อยู่ในหมวด “${module?.title || question.module}” ประเภท ${question.type} — มองหาตัวเลือกที่สอดคล้องกับหลักการมากที่สุด ไม่ใช่คำตอบที่ดูเด็ดขาดเกินจริง`;
    const box = document.querySelector("#v4Hint");
    if(box) box.innerHTML = `<div class="v4-alert" style="margin-top:12px">${esc(hint)}</div>`;
  }
  drill.items[item]--;
  if(item !== "hint") renderDrill();
  else document.querySelector(`[data-v4-item="hint"]`)?.setAttribute("disabled","");
}

function nextQuestion(){
  if(drill.index >= drill.questions.length-1){ finishDrill(); return; }
  drill.index++;
  drill.answered=false;
  drill.selected=null;
  drill.eliminated=[];
  renderDrill();
}

function finishDrill(){
  const state = readState();
  state.v4.sessions = (Number(state.v4.sessions)||0)+1;
  writeState(state);
  const percent = Math.round(drill.correct/drill.questions.length*100);
  view.innerHTML = `<section class="result-card pixel-box"><div class="eyebrow">MISSION COMPLETE</div><div class="score-big">${percent}%</div><div class="rank">ตอบถูก ${drill.correct} / ${drill.questions.length}</div><div class="result-break"><div><b>${drill.best}</b>คอมโบสูงสุด</div><div><b>+${drill.correct*8+(drill.questions.length-drill.correct)*2}</b>EXP</div><div><b>${overall(state).weak}</b>ข้อรอแก้มือ</div></div><div class="v4-actions" style="justify-content:center"><button class="v4-btn mint" data-v4-finish="again">ฝึกชุดใหม่</button><button class="v4-btn sky" data-v4-finish="coach">กลับศูนย์ฝึก</button><button class="v4-btn dark" data-v4-finish="home">กลับฐานบัญชาการ</button></div></section>`;
  document.querySelector('[data-v4-finish="again"]').onclick=()=>startDrill(drill.mode);
  document.querySelector('[data-v4-finish="coach"]').onclick=renderCoach;
  document.querySelector('[data-v4-finish="home"]').onclick=()=>leaveTo("home");
}

function startFlashcards(){
  const state = readState();
  let pool = selectQuestions("weak",state);
  if(!pool.length) pool = shuffle(DATA.questions).slice(0,10);
  cards = {questions:pool,index:0,revealed:false};
  renderFlashcard();
}

function renderFlashcard(){
  const question = cards.questions[cards.index];
  const answer = question.options[question.answer];
  view.innerHTML = `<section class="panel pixel-box"><div class="panel-title"><div><h2>แฟลชการ์ดแก้จุดอ่อน</h2><small>ใบที่ ${cards.index+1} / ${cards.questions.length}</small></div><span class="v4-chip gold">${esc(question.difficulty)}</span></div><button class="v4-card-face" id="v4CardFace">${cards.revealed?`<div class="back"><strong>${letters[question.answer]}. ${esc(answer)}</strong><p>${esc(question.explanation)}</p><small>${esc(question.source || "คลังความรู้ครูเควสต์")}</small></div>`:`<div class="front">${esc(question.question)}<div style="font-size:12px;color:var(--gold);margin-top:20px">แตะเพื่อเปิดคำตอบ</div></div>`}</button><div class="v4-actions"><button class="v4-btn dark" data-card="prev">ก่อนหน้า</button><button class="v4-btn sky" data-card="shuffle">สุ่มใหม่</button><button class="v4-btn mint" data-card="next">ถัดไป</button><button class="v4-btn dark" data-card="close">กลับศูนย์ฝึก</button></div></section>`;
  document.querySelector("#v4CardFace").onclick=()=>{cards.revealed=!cards.revealed;renderFlashcard();};
  document.querySelector('[data-card="prev"]').onclick=()=>{cards.index=(cards.index-1+cards.questions.length)%cards.questions.length;cards.revealed=false;renderFlashcard();};
  document.querySelector('[data-card="next"]').onclick=()=>{cards.index=(cards.index+1)%cards.questions.length;cards.revealed=false;renderFlashcard();};
  document.querySelector('[data-card="shuffle"]').onclick=()=>{cards.questions=shuffle(cards.questions);cards.index=0;cards.revealed=false;renderFlashcard();};
  document.querySelector('[data-card="close"]').onclick=renderCoach;
}

function exportProgress(){
  const payload = {app:"teacher-quest-2569",schema:4,exportedAt:new Date().toISOString(),state:readState()};
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href=url;
  link.download=`teacher-quest-backup-${today()}.json`;
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function importProgress(file){
  const reader = new FileReader();
  reader.onload=()=>{
    try{
      const payload=JSON.parse(reader.result);
      const incoming=payload.state || payload;
      if(!incoming || typeof incoming!=="object" || !incoming.records) throw new Error("รูปแบบไม่ถูกต้อง");
      if(!confirm("นำเข้าข้อมูลนี้แทนความคืบหน้าในเครื่องหรือไม่?")) return;
      incoming.cloudUpdatedAt=Date.now();
      writeState(incoming);
      alert("นำเข้าสำเร็จ ระบบจะโหลดหน้าใหม่");
      location.reload();
    }catch(error){ alert(`นำเข้าไม่สำเร็จ: ${error.message}`); }
  };
  reader.readAsText(file);
}

function openAccount(){
  const cloud=window.TeacherQuestCloud;
  if(cloud?.openAccountDialog) cloud.openAccountDialog();
  else alert("ระบบบัญชีกำลังโหลด กรุณาลองอีกครั้ง");
}

function bindCoach(){
  document.querySelectorAll("[data-v4-mode]").forEach(button=>button.onclick=()=>startDrill(button.dataset.v4Mode));
  document.querySelector('[data-v4-action="flash"]')?.addEventListener("click",startFlashcards);
  document.querySelector('[data-v4-action="export"]')?.addEventListener("click",exportProgress);
  document.querySelector('[data-v4-action="import"]')?.addEventListener("click",()=>document.querySelector("#v4ImportFile")?.click());
  document.querySelector("#v4ImportFile")?.addEventListener("change",event=>{const file=event.target.files?.[0];if(file) importProgress(file);});
  document.querySelector('[data-v4-action="account"]')?.addEventListener("click",openAccount);
}

function bindDrill(){
  document.querySelectorAll("[data-v4-answer]").forEach(button=>button.onclick=()=>answerQuestion(Number(button.dataset.v4Answer)));
  document.querySelectorAll("[data-v4-item]").forEach(button=>button.onclick=()=>useItem(button.dataset.v4Item));
  document.querySelector('[data-v4-action="next"]')?.addEventListener("click",nextQuestion);
  document.querySelector('[data-v4-action="quit"]')?.addEventListener("click",()=>{if(confirm("ออกจากรอบฝึกนี้หรือไม่?")) renderCoach();});
}

function leaveTo(target){
  sessionStorage.setItem(RETURN_KEY,target);
  location.reload();
}

function installControls(){
  if(!document.querySelector("#v4CoachBtn")){
    const button=document.createElement("button");
    button.className="nav-btn v4-nav";
    button.id="v4CoachBtn";
    button.innerHTML="<span>🧭</span>ศูนย์ฝึกอัจฉริยะ";
    navList?.appendChild(button);
  }
  if(!document.querySelector("#cloudAccountBtn")){
    const button=document.createElement("button");
    button.className="top-btn";
    button.id="cloudAccountBtn";
    button.title="บัญชีและซิงก์ออนไลน์";
    button.setAttribute("aria-label","บัญชีและซิงก์ออนไลน์");
    button.textContent="☁";
    topInner?.insertBefore(button,document.querySelector("#settingsBtn"));
  }
  document.querySelector("#v4CoachBtn")?.addEventListener("click",activate);
  document.querySelector("#cloudAccountBtn")?.addEventListener("click",openAccount);
  document.addEventListener("click",event=>{
    const target=event.target.closest?.("[data-view]");
    if(active && target){
      event.preventDefault();
      event.stopImmediatePropagation();
      leaveTo(target.dataset.view || "home");
    }
  },true);
  document.querySelectorAll("[data-view]").forEach(button=>button.addEventListener("click",()=>{if(!active) document.querySelector("#v4CoachBtn")?.classList.remove("active");}));
}

window.addEventListener("teacherquest:cloud-status",()=>{
  const label=cloudLabel();
  const text=document.querySelector("#v4CloudText");
  const dot=document.querySelector(".v4-status .v4-dot");
  if(text) text.textContent=label.text;
  if(dot) dot.className=`v4-dot ${label.className}`;
});

window.TeacherQuestV4={readState,writeState,renderCoach,activate};
installControls();
updateHud();
const returnTarget=sessionStorage.getItem(RETURN_KEY);
if(returnTarget){
  sessionStorage.removeItem(RETURN_KEY);
  setTimeout(()=>document.querySelector(`[data-view="${CSS.escape(returnTarget)}"]`)?.click(),80);
}
})();
