(()=>{
"use strict";

const STORAGE = "teacherQuestAdventure_v1";
const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 540;
const WORLD_WIDTH = 2048;
const WORLD_HEIGHT = 1536;
const TILE = 32;
const PLAYER_SPEED = 176;
const INTERACT_DISTANCE = 76;
const SPAWN = Object.freeze({x:1024,y:812});
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const DIRECTION_BY_CODE = Object.freeze({
  ArrowUp:"up",KeyW:"up",ArrowDown:"down",KeyS:"down",
  ArrowLeft:"left",KeyA:"left",ArrowRight:"right",KeyD:"right"
});
const DIRECTION_BY_KEY = Object.freeze({
  ArrowUp:"up",w:"up",ไ:"up",ArrowDown:"down",s:"down",ห:"down",
  ArrowLeft:"left",a:"left",ฟ:"left",ArrowRight:"right",d:"right",ก:"right"
});

const DISTRICTS = Object.freeze([
  {name:"หมู่บ้านครูนักคิด",short:"ศาสตร์ครู",color:"#ffd45c",x:0,y:0,w:1024,h:768,hub:{x:512,y:384}},
  {name:"นครนวัตกรรม",short:"นวัตกรรม",color:"#58e7b2",x:1024,y:0,w:1024,h:768,hub:{x:1536,y:384}},
  {name:"ป่าคัมภีร์กฎหมาย",short:"กฎหมาย",color:"#ff9b6a",x:0,y:768,w:1024,h:768,hub:{x:512,y:1152}},
  {name:"ป้อมอนาคตการศึกษา",short:"อนาคต",color:"#a88cff",x:1024,y:768,w:1024,h:768,hub:{x:1536,y:1152}}
]);

const PORTAL_POSITIONS = Object.freeze([
  {x:224,y:208},{x:480,y:192},{x:752,y:272},{x:304,y:512},{x:688,y:528},
  {x:1280,y:208},{x:1536,y:192},{x:1816,y:288},{x:1304,y:520},{x:1696,y:520},
  {x:224,y:1000},{x:496,y:976},{x:760,y:1096},{x:304,y:1320},{x:704,y:1328},
  {x:1280,y:992},{x:1552,y:976},{x:1816,y:1096},{x:1312,y:1320},{x:1712,y:1328}
]);

const BUILDINGS = Object.freeze([
  {x:872,y:596,w:304,h:150,kind:"academy",name:"สถาบันครูเควสต์"},
  {x:382,y:344,w:168,h:118,kind:"school",name:"หอศาสตร์ครู"},
  {x:1450,y:336,w:172,h:120,kind:"lab",name:"หอนวัตกรรม"},
  {x:420,y:1110,w:178,h:122,kind:"archive",name:"หอคัมภีร์"},
  {x:1446,y:1104,w:184,h:128,kind:"fort",name:"ป้อมอนาคต"},
  {x:80,y:616,w:132,h:98,kind:"house"},
  {x:1818,y:608,w:140,h:102,kind:"house"},
  {x:72,y:816,w:140,h:102,kind:"house"},
  {x:1818,y:816,w:140,h:102,kind:"house"}
]);

const WATER = Object.freeze([
  {x:832,y:96,w:384,h:390},
  {x:80,y:1168,w:216,h:248},
  {x:1760,y:96,w:208,h:170}
]);

const NPC_DEFINITIONS = Object.freeze([
  {id:"guide",x:1018,y:866,name:"ครูผู้พิทักษ์",role:"ไกด์ประจำโลก",color:"#ffd45c",dialogue:"ยินดีต้อนรับสู่ครูเควสต์! เดินสำรวจโลกทั้ง 4 เขต เข้าใกล้ประตูวิชา แล้วกด E (ปุ่ม ำ เมื่อเป็นภาษาไทย) หรือ SPACE เพื่อเริ่มภารกิจ โดยไม่ต้องสลับภาษาคีย์บอร์ด",action:"help"},
  {id:"trainer",x:900,y:830,name:"ครูฝึกคอมโบ",role:"สนามฝึก",color:"#ff72b4",dialogue:"อยากซ้อมแบบรวดเร็ว หรือไล่ล่าข้อที่ยังไม่แม่นใช่ไหม? สนามฝึกเดิมยังอยู่ครบและใช้ความคืบหน้าชุดเดียวกับโลกนี้",action:"practice"},
  {id:"examiner",x:1138,y:830,name:"ผู้คุมสนามสอบ",role:"สนามสอบใหญ่",color:"#ff6679",dialogue:"เมื่อพร้อมแล้ว มาทดลองสนามสอบแบบจับเวลาจริงได้ คำตอบจะถูกเก็บไว้จนกว่าจะกดส่งข้อสอบ",action:"exam"},
  {id:"librarian",x:1024,y:554,name:"บรรณารักษ์พิกเซล",role:"คัมภีร์ความรู้",color:"#58e7b2",dialogue:"คัมภีร์เก็บสูตรจำ สาระสำคัญ และแหล่งอ้างอิงของทุกดินแดนไว้ หากติดตรงไหนแวะมาทบทวนได้",action:"codex"},
  {id:"scholar",x:512,y:498,name:"นักปราชญ์แห่งการสอน",role:"ผู้ดูแลเขตศาสตร์ครู",color:"#ffd45c",dialogue:"เขตนี้รวมศาสตร์การสอน หลักสูตร การวัดผล วิจัย และจิตวิทยา เริ่มจากด่านที่ยังไม่เคยทำก่อน แล้วค่อยกลับมาเก็บความแม่นให้เกิน 80%",action:"district"},
  {id:"inventor",x:1536,y:498,name:"ช่างกลนวัตกรรม",role:"ผู้ดูแลเขตนวัตกรรม",color:"#58e7b2",dialogue:"เขตนี้ฝึกสื่อ AI การจัดชั้นเรียน และมาตรฐานวิชาชีพ ประตูจะสว่างขึ้นตามความคืบหน้าของคุณ",action:"district"},
  {id:"judge",x:512,y:1268,name:"ผู้เฝ้าคัมภีร์",role:"ผู้ดูแลเขตกฎหมาย",color:"#ff9b6a",dialogue:"ข้อกฎหมายต้องอ่านคำถามและเงื่อนไขให้ครบ อย่าใช้ความยาวของตัวเลือกเป็นตัวเดา เพราะคลังนี้ปรับสมดุลตัวเลือกแล้ว",action:"district"},
  {id:"ranger",x:1536,y:1268,name:"ผู้สังเกตการณ์ 2569",role:"ผู้ดูแลเขตอนาคต",color:"#a88cff",dialogue:"เขตนี้รวมภาษา วัฒนธรรม นโยบาย คุณภาพ และสถานการณ์ปัจจุบัน เนื้อหาที่ผันแปรมีวันที่ตรวจสอบและลิงก์ต้นทางกำกับ",action:"district"}
]);

function loadPosition(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE) || "{}");
    if(Number.isFinite(saved.x) && Number.isFinite(saved.y)){
      return {x:clamp(saved.x,40,WORLD_WIDTH-40),y:clamp(saved.y,64,WORLD_HEIGHT-32),direction:saved.direction || "down"};
    }
  }catch(error){
    console.warn("Could not load adventure position",error);
  }
  return {...SPAWN,direction:"down"};
}

function savePosition(player,{immediate=false}={}){
  const position={x:Math.round(player.x),y:Math.round(player.y),direction:player.direction};
  try{
    localStorage.setItem(STORAGE,JSON.stringify(position));
    window.TeacherQuestOnline?.saveAdventurePosition?.(position,{immediate});
  }catch(error){
    console.warn("Could not save adventure position",error);
  }
}

function seeded(tx,ty,salt=0){
  let value = (tx * 374761393 + ty * 668265263 + salt * 982451653) | 0;
  value = (value ^ (value >>> 13)) * 1274126177;
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function rectContains(rect,x,y,padding=0){
  return x >= rect.x-padding && x <= rect.x+rect.w+padding && y >= rect.y-padding && y <= rect.y+rect.h+padding;
}

function makeRoads(portals){
  const roads = [
    {x:0,y:744,w:WORLD_WIDTH,h:56,main:true},
    {x:996,y:0,w:56,h:WORLD_HEIGHT,main:true}
  ];
  DISTRICTS.forEach((district,index) => {
    const districtPortals = portals.slice(index*5,index*5+5);
    roads.push({x:Math.min(district.hub.x,1024)-24,y:district.hub.y-24,w:Math.abs(1024-district.hub.x)+48,h:48});
    roads.push({x:district.hub.x-24,y:Math.min(district.hub.y,772)-24,w:48,h:Math.abs(772-district.hub.y)+48});
    districtPortals.forEach(portal => {
      roads.push({x:Math.min(portal.x,district.hub.x)-18,y:portal.y-18,w:Math.abs(district.hub.x-portal.x)+36,h:36});
      roads.push({x:district.hub.x-18,y:Math.min(portal.y,district.hub.y)-18,w:36,h:Math.abs(district.hub.y-portal.y)+36});
    });
  });
  return roads;
}

function makeTrees(portals,roads){
  const trees = [];
  for(let ty=2;ty<46;ty+=2){
    for(let tx=2;tx<62;tx+=2){
      if(seeded(tx,ty,7) < .61) continue;
      const x = tx*TILE + Math.floor(seeded(tx,ty,8)*18-9);
      const y = ty*TILE + Math.floor(seeded(tx,ty,9)*18-9);
      const nearRoad = roads.some(road => rectContains(road,x,y,34));
      const nearPortal = portals.some(portal => Math.hypot(portal.x-x,portal.y-y) < 96);
      const nearNpc = NPC_DEFINITIONS.some(npc => Math.hypot(npc.x-x,npc.y-y) < 76);
      const nearBuilding = BUILDINGS.some(building => rectContains(building,x,y,52));
      const inWater = WATER.some(water => rectContains(water,x,y,16));
      const nearSpawn = Math.hypot(SPAWN.x-x,SPAWN.y-y) < 170;
      if(!nearRoad && !nearPortal && !nearNpc && !nearBuilding && !inWater && !nearSpawn){
        trees.push({x,y,variant:Math.floor(seeded(tx,ty,10)*3)});
      }
    }
  }
  return trees;
}

function districtAt(x,y){
  const index = (y >= 768 ? 2 : 0) + (x >= 1024 ? 1 : 0);
  return DISTRICTS[index];
}

function locationNameAt(x,y){
  if(x>=816&&x<=1232&&y>=520&&y<=976) return "ลานสถาบันครูเควสต์";
  return districtAt(x,y).name;
}

function musicSceneAt(x,y){
  if(x>=816&&x<=1232&&y>=520&&y<=976) return "plaza";
  return `district${DISTRICTS.indexOf(districtAt(x,y))}`;
}

function drawPixelText(ctx,text,x,y,{size=12,color="#fff",align="left",stroke="#091020"}={}){
  ctx.save();
  ctx.font = `900 ${size}px "Noto Sans Thai", Tahoma, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.imageSmoothingEnabled = false;
  if(stroke){ ctx.lineWidth = Math.max(3,Math.round(size/4)); ctx.strokeStyle = stroke; ctx.strokeText(text,Math.round(x),Math.round(y)); }
  ctx.fillStyle = color;
  ctx.fillText(text,Math.round(x),Math.round(y));
  ctx.restore();
}

function createTeacherQuestAdventure(options={}){
  const root = options.root;
  const canvas = options.canvas || root?.querySelector("#adventureCanvas");
  if(!root || !canvas) throw new Error("Adventure root and canvas are required");
  const ctx = canvas.getContext("2d",{alpha:false});
  const miniCanvas = root.querySelector("#adventureMiniMap");
  const mini = miniCanvas?.getContext("2d");
  const prompt = root.querySelector("#adventurePrompt");
  const districtLabel = root.querySelector("#adventureDistrict");
  const objective = root.querySelector("#adventureObjective");
  const progressText = root.querySelector("#adventureProgressText");
  const progressBar = root.querySelector("#adventureProgressBar");
  const dialogue = root.querySelector("#adventureDialogue");
  const dialogueEyebrow = root.querySelector("#adventureDialogueEyebrow");
  const dialogueTitle = root.querySelector("#adventureDialogueTitle");
  const dialogueText = root.querySelector("#adventureDialogueText");
  const dialogueStats = root.querySelector("#adventureDialogueStats");
  const dialogueActions = root.querySelector("#adventureDialogueActions");
  const mapPanel = root.querySelector("#adventureMapPanel");
  const keys = new Set();
  const player = {...loadPosition(),moving:false,step:0};
  const camera = {x:clamp(player.x-VIEW_WIDTH/2,0,WORLD_WIDTH-VIEW_WIDTH),y:clamp(player.y-VIEW_HEIGHT/2,0,WORLD_HEIGHT-VIEW_HEIGHT)};
  const modules = options.modules || [];
  const portals = modules.map((module,index) => ({...PORTAL_POSITIONS[index],module,index,district:Math.floor(index/5)}));
  const statsCache = new Map();
  const roads = makeRoads(portals);
  const trees = makeTrees(portals,roads);
  const npcs = NPC_DEFINITIONS.map(npc => ({...npc,type:"npc"}));
  const obstacles = [
    ...BUILDINGS.map(building => ({x:building.x+8,y:building.y+36,w:building.w-16,h:building.h-38})),
    ...trees.map(tree => ({x:tree.x-10,y:tree.y-8,w:20,h:17})),
  ];
  let nearest = null;
  let destroyed = false;
  let dialogueOpen = false;
  let mapOpen = false;
  let raf = 0;
  let lastTime = performance.now();
  let lastSave = lastTime;
  let elapsed = 0;
  let previousDistrict = "";
  let playerProfile = options.getPlayerProfile?.() || {nickname:"ครูนักผจญภัย",avatar:{}};
  let lastPresenceTime = -Infinity;
  let lastPresenceFingerprint = "";
  const remoteCharacters = new Map();
  let tapTarget = null;
  let tapBlockedFrames = 0;

  canvas.width = VIEW_WIDTH;
  canvas.height = VIEW_HEIGHT;
  ctx.imageSmoothingEnabled = false;
  if(mini){ miniCanvas.width = 176; miniCanvas.height = 124; mini.imageSmoothingEnabled = false; }

  function statsFor(portal){
    if(statsCache.has(portal.module.id)) return statsCache.get(portal.module.id);
    const stats = options.getStats?.(portal.module.id) || {total:20,done:0,accuracy:0};
    const normalized = {total:Number(stats.total)||20,done:Number(stats.done)||0,accuracy:Number(stats.accuracy)||0};
    statsCache.set(portal.module.id,normalized);
    return normalized;
  }

  function safeColor(value,fallback){
    return /^#[0-9a-f]{6}$/i.test(String(value||"")) ? String(value) : fallback;
  }

  function normalizedProfile(value={}){
    const avatar=value.avatar || {};
    return {
      nickname:String(value.nickname || "นักผจญภัย").replace(/[<>\u0000-\u001f\u007f]/g,"").slice(0,20),
      avatar:{
        skin:safeColor(avatar.skin,"#e8b989"),hair:safeColor(avatar.hair,"#24182f"),
        shirt:safeColor(avatar.shirt,"#3d68af"),accent:safeColor(avatar.accent,"#ffd45c"),
        style:["short","spike","long","cap"].includes(avatar.style)?avatar.style:"short"
      }
    };
  }

  function setPlayerProfile(value){
    playerProfile=normalizedProfile(value);
    lastPresenceFingerprint="";
  }

  function setRemotePlayers(players=[]){
    const seen=new Set();
    players.slice(0,40).forEach((item,index)=>{
      const uid=String(item.uid || `remote-${index}`);
      seen.add(uid);
      const existing=remoteCharacters.get(uid);
      const profile=normalizedProfile(item);
      if(existing){
        Object.assign(existing,{targetX:clamp(item.x,0,WORLD_WIDTH),targetY:clamp(item.y,0,WORLD_HEIGHT),direction:item.direction||"down",moving:Boolean(item.moving),profile});
      }else{
        remoteCharacters.set(uid,{uid,x:clamp(item.x,0,WORLD_WIDTH),y:clamp(item.y,0,WORLD_HEIGHT),targetX:clamp(item.x,0,WORLD_WIDTH),targetY:clamp(item.y,0,WORLD_HEIGHT),direction:item.direction||"down",moving:Boolean(item.moving),step:0,profile});
      }
    });
    [...remoteCharacters.keys()].forEach(uid=>{if(!seen.has(uid))remoteCharacters.delete(uid);});
  }

  function isRoad(x,y){ return roads.some(road => rectContains(road,x,y)); }
  function isWater(x,y){ return WATER.some(water => rectContains(water,x,y)) && !isRoad(x,y); }
  function collides(x,y){
    const halfW = 11;
    const top = y-11;
    const bottom = y+8;
    if(x-halfW<18 || x+halfW>WORLD_WIDTH-18 || top<32 || bottom>WORLD_HEIGHT-16) return true;
    const points = [[x-halfW,top],[x+halfW,top],[x-halfW,bottom],[x+halfW,bottom]];
    if(points.some(([px,py]) => isWater(px,py))) return true;
    return obstacles.some(rect => points.some(([px,py]) => rectContains(rect,px,py)));
  }

  function tryMove(dx,dy){
    const nextX = player.x+dx;
    const nextY = player.y+dy;
    if(!collides(nextX,player.y)) player.x = nextX;
    if(!collides(player.x,nextY)) player.y = nextY;
  }

  function setTapTarget(event){
    if(dialogueOpen || mapOpen) return;
    const rect=canvas.getBoundingClientRect();
    if(!rect.width || !rect.height) return;
    tapTarget={
      x:clamp(camera.x+(event.clientX-rect.left)*VIEW_WIDTH/rect.width,20,WORLD_WIDTH-20),
      y:clamp(camera.y+(event.clientY-rect.top)*VIEW_HEIGHT/rect.height,36,WORLD_HEIGHT-18)
    };
    tapBlockedFrames=0;
    keys.clear();
    canvas.focus({preventScroll:true});
  }

  function updateNearest(){
    const candidates = [...portals.map(portal => ({...portal,type:"portal"})),...npcs];
    const candidate = candidates.reduce((best,item) => {
      const range = distance(player,item);
      return range < (best?.range ?? Infinity) ? {item,range} : best;
    },null);
    nearest = candidate && candidate.range <= INTERACT_DISTANCE ? candidate.item : null;
    if(!prompt) return;
    if(dialogueOpen || mapOpen){ prompt.classList.remove("visible"); return; }
    if(nearest){
      prompt.innerHTML = nearest.type === "portal"
        ? `<kbd>E</kbd><span>เข้าสู่ด่าน ${nearest.index+1}: ${escapeHtml(nearest.module.title)}</span>`
        : `<kbd>E</kbd><span>คุยกับ ${escapeHtml(nearest.name)}</span>`;
      prompt.classList.add("visible");
    }else{
      prompt.classList.remove("visible");
    }
  }

  function escapeHtml(value){
    return String(value ?? "").replace(/[&<>"']/g,char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char]);
  }

  function openPortal(portal){
    const stats = statsFor(portal);
    const bossCount = Math.min(15,options.getBossCount?.(portal.module.id) || 15);
    dialogueEyebrow.textContent = `ประตูด่าน ${String(portal.index+1).padStart(2,"0")} • ${DISTRICTS[portal.district].name}`;
    dialogueTitle.textContent = portal.module.title;
    dialogueText.textContent = `${portal.module.summary} บอสประจำด่าน: ${portal.module.boss}`;
    dialogueStats.innerHTML = `<span><b>${stats.total}</b> ข้อในคลัง</span><span><b>${stats.done}</b> ข้อที่เคยทำ</span><span><b>${stats.accuracy}%</b> ความแม่น</span>`;
    dialogueActions.innerHTML = `
      <button class="btn mint adventure-choice" data-adventure-mode="complete"><strong>พิชิตครบ ${stats.total} ข้อ</strong><small>ครบทุกข้อ • โบนัสเนื้อเรื่อง +25 EXP +10 เหรียญ</small></button>
      <button class="btn adventure-choice" data-adventure-mode="quick"><strong>ฝึกด่วน ${Math.min(10,stats.total)} ข้อ</strong><small>สุ่มชุดใหม่จากคลังด่าน</small></button>
      <button class="btn pink adventure-choice" data-adventure-mode="boss"><strong>ท้าบอส ${bossCount} ข้อ</strong><small>โจทย์กลาง–ยาก • รับโบนัสเมื่อจบภารกิจ</small></button>
      <button class="btn dark" data-dialogue-close>เดินสำรวจต่อ</button>`;
    dialogueActions.querySelectorAll("[data-adventure-mode]").forEach(button => button.addEventListener("click",() => {
      savePosition(player);
      options.onStartModule?.(portal.module.id,button.dataset.adventureMode);
    }));
    dialogueActions.querySelector("[data-dialogue-close]")?.addEventListener("click",closeDialogue);
    showDialogue();
  }

  function openNpc(npc){
    dialogueEyebrow.textContent = npc.role;
    dialogueTitle.textContent = npc.name;
    dialogueText.textContent = npc.dialogue;
    dialogueStats.innerHTML = "";
    const actionLabels = {practice:"ไปสนามฝึก",exam:"เข้าสนามสอบ",codex:"เปิดคัมภีร์"};
    dialogueActions.innerHTML = npc.action in actionLabels
      ? `<button class="btn mint" data-npc-action="${npc.action}">${actionLabels[npc.action]}</button><button class="btn dark" data-dialogue-close>คุยจบ</button>`
      : npc.action === "help"
        ? `<button class="btn mint" data-map-open>เปิดแผนที่ 4 เขต</button><button class="btn dark" data-dialogue-close>เข้าใจแล้ว</button>`
        : `<button class="btn dark" data-dialogue-close>ขอบคุณสำหรับคำแนะนำ</button>`;
    dialogueActions.querySelector("[data-npc-action]")?.addEventListener("click",event => {
      savePosition(player);
      options.onNavigate?.(event.currentTarget.dataset.npcAction);
    });
    dialogueActions.querySelector("[data-map-open]")?.addEventListener("click",() => { closeDialogue(); toggleMap(true); });
    dialogueActions.querySelector("[data-dialogue-close]")?.addEventListener("click",closeDialogue);
    showDialogue();
  }

  function showDialogue(){
    dialogueOpen = true;
    tapTarget = null;
    keys.clear();
    dialogue.hidden = false;
    dialogue.setAttribute("aria-hidden","false");
    prompt?.classList.remove("visible");
    requestAnimationFrame(() => dialogueActions.querySelector("button")?.focus({preventScroll:true}));
  }

  function closeDialogue(){
    dialogueOpen = false;
    dialogue.hidden = true;
    dialogue.setAttribute("aria-hidden","true");
    canvas.focus({preventScroll:true});
    updateNearest();
  }

  function interact(){
    if(dialogueOpen || mapOpen || !nearest) return;
    nearest.type === "portal" ? openPortal(nearest) : openNpc(nearest);
  }

  function renderMapPanel(){
    if(!mapPanel) return;
    mapPanel.querySelector(".adventure-map-grid").innerHTML = DISTRICTS.map((district,districtIndex) => {
      const districtPortals = portals.slice(districtIndex*5,districtIndex*5+5);
      return `<section class="map-district" style="--district:${district.color}"><h4>${escapeHtml(district.name)}</h4>${districtPortals.map(portal => {
        const stats = statsFor(portal);
        return `<div class="map-zone ${stats.done >= stats.total ? "cleared" : stats.done ? "started" : ""}"><span>${portal.index+1}</span><b>${escapeHtml(portal.module.title)}</b><small>${stats.done}/${stats.total} • ${stats.accuracy}%</small></div>`;
      }).join("")}</section>`;
    }).join("");
  }

  function toggleMap(force){
    mapOpen = typeof force === "boolean" ? force : !mapOpen;
    keys.clear();
    tapTarget = null;
    mapPanel.hidden = !mapOpen;
    mapPanel.setAttribute("aria-hidden",String(!mapOpen));
    if(mapOpen){ renderMapPanel(); mapPanel.querySelector("[data-map-close]")?.focus({preventScroll:true}); }
    else canvas.focus({preventScroll:true});
    updateNearest();
  }

  function resetPosition(){
    tapTarget = null;
    Object.assign(player,SPAWN,{direction:"down"});
    camera.x = clamp(player.x-VIEW_WIDTH/2,0,WORLD_WIDTH-VIEW_WIDTH);
    camera.y = clamp(player.y-VIEW_HEIGHT/2,0,WORLD_HEIGHT-VIEW_HEIGHT);
    savePosition(player);
    updateNearest();
    updateHud();
  }

  function onKeyDown(event){
    if(destroyed || !canvas.isConnected || document.body.classList.contains("auth-locked")) return;
    const target = event.target;
    const inControl = target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(target.tagName);
    if(dialogueOpen || mapOpen){
      if(event.key === "Escape"){
        event.preventDefault();
        dialogueOpen ? closeDialogue() : toggleMap(false);
      }
      return;
    }
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const direction = DIRECTION_BY_CODE[event.code] || DIRECTION_BY_KEY[key];
    if(direction && !inControl){ event.preventDefault(); tapTarget=null; keys.add(direction); }
    const interactKey = ["KeyE","Space","Enter","NumpadEnter"].includes(event.code) || ["e","ำ"," ","Enter"].includes(key);
    if(!inControl && !event.repeat && interactKey){
      event.preventDefault();
      interact();
    }
    const mapKey = event.code === "KeyM" || key === "m" || key === "ท";
    if(!inControl && !event.repeat && mapKey){
      event.preventDefault();
      toggleMap();
    }
  }

  function onKeyUp(event){
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const direction = DIRECTION_BY_CODE[event.code] || DIRECTION_BY_KEY[key];
    if(direction) keys.delete(direction);
  }

  function drawGround(){
    const startX = Math.floor(camera.x/TILE);
    const startY = Math.floor(camera.y/TILE);
    const endX = Math.ceil((camera.x+VIEW_WIDTH)/TILE);
    const endY = Math.ceil((camera.y+VIEW_HEIGHT)/TILE);
    for(let ty=startY;ty<=endY;ty++){
      for(let tx=startX;tx<=endX;tx++){
        const wx = tx*TILE;
        const wy = ty*TILE;
        const cx = wx+TILE/2;
        const cy = wy+TILE/2;
        const district = districtAt(cx,cy);
        const water = isWater(cx,cy);
        const road = isRoad(cx,cy);
        if(water){
          ctx.fillStyle = seeded(tx,ty,1)>.5 ? "#2f8299" : "#347f96";
          ctx.fillRect(wx,wy,TILE,TILE);
          ctx.fillStyle = (tx+ty+Math.floor(elapsed*2))%3===0 ? "#67b9c3" : "#3d91a5";
          ctx.fillRect(wx+4+(Math.floor(elapsed*12)%8),wy+9,16,3);
          ctx.fillRect(wx+14,wy+23,12,2);
        }else if(road){
          ctx.fillStyle = seeded(tx,ty,2)>.55 ? "#c79e5a" : "#bd914d";
          ctx.fillRect(wx,wy,TILE,TILE);
          ctx.fillStyle = "#a97c42";
          if(seeded(tx,ty,3)>.58) ctx.fillRect(wx+6,wy+8,5,4);
          if(seeded(tx,ty,4)>.67) ctx.fillRect(wx+21,wy+22,4,3);
          if(WATER.some(area => rectContains(area,cx,cy))){
            ctx.fillStyle="#765336"; ctx.fillRect(wx,wy,TILE,4); ctx.fillRect(wx,wy+28,TILE,4);
            ctx.fillStyle="#e2bc6d"; ctx.fillRect(wx+3,wy+6,26,20);
            ctx.fillStyle="#8c633c"; ctx.fillRect(wx+5,wy+14,22,3);
          }
        }else{
          const palettes = ["#3c8351","#34805d","#507b49","#3d7161"];
          ctx.fillStyle = palettes[DISTRICTS.indexOf(district)];
          ctx.fillRect(wx,wy,TILE,TILE);
          const grain = seeded(tx,ty,5);
          ctx.fillStyle = grain>.5 ? "rgba(139,200,104,.25)" : "rgba(25,75,47,.22)";
          if(grain>.35) ctx.fillRect(wx+(tx*7%23),wy+(ty*11%23),3,5);
          if(grain>.78) ctx.fillRect(wx+23,wy+7,4,3);
        }
      }
    }
  }

  function drawFlower(x,y,color){
    ctx.fillStyle="#1d583d"; ctx.fillRect(x-1,y,2,7);
    ctx.fillStyle=color; ctx.fillRect(x-3,y-3,6,3); ctx.fillRect(x-1,y-5,2,7);
  }

  function drawDecor(){
    const startX = Math.floor(camera.x/TILE)-1;
    const startY = Math.floor(camera.y/TILE)-1;
    const endX = Math.ceil((camera.x+VIEW_WIDTH)/TILE)+1;
    const endY = Math.ceil((camera.y+VIEW_HEIGHT)/TILE)+1;
    const colors=["#ffd45c","#ff72b4","#e9efff","#8dd9ff"];
    for(let ty=startY;ty<=endY;ty++) for(let tx=startX;tx<=endX;tx++){
      const x=tx*TILE+16,y=ty*TILE+16;
      if(!isWater(x,y) && !isRoad(x,y) && seeded(tx,ty,15)>.88) drawFlower(x+(tx%3)*4-4,y+(ty%2)*5,colors[(tx+ty+4)%colors.length]);
    }
  }

  function drawTree(tree){
    const {x,y,variant}=tree;
    ctx.fillStyle="rgba(3,19,21,.35)"; ctx.fillRect(x-23,y+6,48,13);
    ctx.fillStyle="#3c2b24"; ctx.fillRect(x-7,y-10,14,28);
    ctx.fillStyle="#6a4630"; ctx.fillRect(x-3,y-9,6,24);
    const dark=["#153f32","#174936","#274933"][variant];
    const mid=["#226044","#266c47","#386342"][variant];
    const light=["#3b8456","#43a060","#63804d"][variant];
    ctx.fillStyle=dark; ctx.fillRect(x-25,y-50,50,39); ctx.fillRect(x-17,y-65,34,15);
    ctx.fillStyle=mid; ctx.fillRect(x-20,y-55,37,34); ctx.fillRect(x+10,y-42,17,21);
    ctx.fillStyle=light; ctx.fillRect(x-13,y-58,19,12); ctx.fillRect(x+7,y-34,12,8);
    ctx.fillStyle="#102b27"; ctx.fillRect(x-27,y-30,9,18); ctx.fillRect(x+21,y-27,8,14);
  }

  function drawBuilding(building){
    const colors = {
      academy:["#d8c6a0","#334c78","#ffd45c"],school:["#ceb886","#6c4d76","#ffd45c"],
      lab:["#b7d4cf","#286d72","#58e7b2"],archive:["#d3b18d","#774632","#ff9b6a"],
      fort:["#b6aac9","#4a3e70","#a88cff"],house:["#c8a67e","#70463f","#ffcf76"]
    }[building.kind] || ["#c8a67e","#70463f","#ffcf76"];
    const {x,y,w,h}=building;
    ctx.fillStyle="rgba(4,8,18,.4)"; ctx.fillRect(x+12,y+h-3,w,17);
    ctx.fillStyle=colors[0]; ctx.fillRect(x+8,y+45,w-16,h-45);
    ctx.fillStyle="#211b2d"; ctx.fillRect(x,y+34,w,16); ctx.fillRect(x+14,y+20,w-28,16); ctx.fillRect(x+34,y+6,w-68,16);
    ctx.fillStyle=colors[1]; ctx.fillRect(x+4,y+28,w-8,14); ctx.fillRect(x+20,y+14,w-40,14); ctx.fillRect(x+42,y,w-84,14);
    ctx.fillStyle="#15172b";
    for(let windowX=x+25;windowX<x+w-24;windowX+=48){
      ctx.fillRect(windowX,y+58,24,24); ctx.fillStyle="#71c9d6"; ctx.fillRect(windowX+5,y+63,14,13); ctx.fillStyle="#15172b";
    }
    const doorW=building.kind==="academy"?52:34;
    ctx.fillStyle="#241b32"; ctx.fillRect(x+w/2-doorW/2,y+h-46,doorW,46);
    ctx.fillStyle=colors[2]; ctx.fillRect(x+w/2-doorW/2+7,y+h-39,doorW-14,39); ctx.fillStyle="#241b32"; ctx.fillRect(x+w/2+doorW/2-12,y+h-23,5,5);
    if(building.name) drawPixelText(ctx,building.name,x+w/2,y+54,{size:11,color:"#fff6d2",align:"center",stroke:"#272039"});
  }

  function drawPortal(portal){
    const stats = statsFor(portal);
    const district = DISTRICTS[portal.district];
    const pulse = Math.round((Math.sin(elapsed*3+portal.index)+1)*2);
    const cleared = stats.done >= stats.total && stats.total>0;
    ctx.fillStyle="rgba(5,8,19,.45)"; ctx.fillRect(portal.x-29,portal.y+20,58,13);
    ctx.fillStyle="#18152a"; ctx.fillRect(portal.x-26,portal.y-31,52,57);
    ctx.fillStyle=cleared?"#fff3a7":district.color; ctx.fillRect(portal.x-21-pulse/2,portal.y-26-pulse/2,42+pulse,46+pulse);
    ctx.fillStyle="#151d43"; ctx.fillRect(portal.x-14,portal.y-19,28,38);
    ctx.fillStyle=cleared?"#58e7b2":"#6b76cc"; ctx.fillRect(portal.x-8,portal.y-12,16,25);
    ctx.fillStyle="#f8f5df"; ctx.fillRect(portal.x-2,portal.y-3,6,6);
    ctx.fillStyle="#171127"; ctx.fillRect(portal.x-34,portal.y+22,68,8);
    drawPixelText(ctx,String(portal.index+1),portal.x,portal.y-44,{size:11,color:"#fff",align:"center"});
    if(distance(player,portal)<125) drawPixelText(ctx,portal.module.title,portal.x,portal.y+43,{size:11,color:"#fff6d2",align:"center"});
  }

  function drawCharacter(character,isPlayer=false){
    const x=Math.round(character.x),y=Math.round(character.y);
    const walking=isPlayer&&character.moving;
    const step=walking&&Math.floor(character.step)%2?3:0;
    const bodyColor=isPlayer?"#3d68af":character.color;
    ctx.fillStyle="rgba(4,8,18,.38)"; ctx.fillRect(x-16,y+11,32,9);
    ctx.fillStyle="#171127"; ctx.fillRect(x-13,y-31,26,22); ctx.fillRect(x-10,y-37,20,8);
    ctx.fillStyle=isPlayer?"#e8b989":"#d8a878"; ctx.fillRect(x-10,y-25,20,18);
    ctx.fillStyle="#171127";
    if(character.direction!=="up"){
      if(character.direction==="left") ctx.fillRect(x-8,y-19,4,4);
      else if(character.direction==="right") ctx.fillRect(x+4,y-19,4,4);
      else {ctx.fillRect(x-7,y-19,4,4);ctx.fillRect(x+3,y-19,4,4);}
    }
    ctx.fillStyle="#171127"; ctx.fillRect(x-14,y-9,28,25);
    ctx.fillStyle=bodyColor; ctx.fillRect(x-10,y-6,20,20);
    ctx.fillStyle=isPlayer?"#fff0c7":"#e9e5d5"; ctx.fillRect(x-2,y-6,5,20);
    if(isPlayer){ ctx.fillStyle="#ffd45c"; ctx.fillRect(character.direction==="left"?x-16:x+10,y-2,8,14); }
    ctx.fillStyle="#171127"; ctx.fillRect(x-10,y+14+step,8,8); ctx.fillRect(x+2,y+14-step,8,8);
    if(!isPlayer){
      ctx.fillStyle="#fff3c2"; ctx.fillRect(x-17,y-44,34,10);
      drawPixelText(ctx,"!",x,y-40,{size:10,color:"#171127",align:"center",stroke:null});
    }
  }

  function drawAdventurer(character,profile,remote=false){
    const normalized=normalizedProfile(profile);
    const avatar=normalized.avatar;
    const x=Math.round(character.x),y=Math.round(character.y);
    const step=character.moving&&Math.floor(character.step)%2?3:0;
    ctx.fillStyle="rgba(4,8,18,.38)";ctx.fillRect(x-16,y+11,32,9);

    ctx.fillStyle="#171127";
    if(avatar.style==="long") ctx.fillRect(x-15,y-35,30,30);
    else if(avatar.style==="cap"){ctx.fillRect(x-15,y-40,30,12);ctx.fillRect(x+10,y-33,11,6);}
    else ctx.fillRect(x-13,y-37,26,12);
    ctx.fillStyle=avatar.style==="cap"?avatar.accent:avatar.hair;
    if(avatar.style==="spike"){
      ctx.fillRect(x-10,y-39,6,9);ctx.fillRect(x-2,y-44,7,14);ctx.fillRect(x+7,y-39,6,9);ctx.fillRect(x-11,y-32,22,7);
    }else if(avatar.style==="long"){
      ctx.fillRect(x-11,y-32,22,25);ctx.fillStyle=avatar.skin;ctx.fillRect(x-9,y-26,18,16);
    }else if(avatar.style==="cap"){
      ctx.fillRect(x-11,y-36,22,8);ctx.fillRect(x+9,y-31,8,4);
    }else ctx.fillRect(x-10,y-34,20,8);

    ctx.fillStyle="#171127";ctx.fillRect(x-12,y-29,24,22);
    ctx.fillStyle=avatar.skin;ctx.fillRect(x-9,y-26,18,16);
    ctx.fillStyle="#171127";
    if(character.direction!=="up"){
      if(character.direction==="left") ctx.fillRect(x-7,y-20,4,4);
      else if(character.direction==="right") ctx.fillRect(x+3,y-20,4,4);
      else {ctx.fillRect(x-7,y-20,4,4);ctx.fillRect(x+3,y-20,4,4);}
    }

    ctx.fillStyle="#171127";ctx.fillRect(x-14,y-9,28,25);
    ctx.fillStyle=avatar.shirt;ctx.fillRect(x-10,y-6,20,20);
    ctx.fillStyle=avatar.accent;ctx.fillRect(x-2,y-6,5,20);
    ctx.fillStyle="#171127";ctx.fillRect(x-10,y+14+step,8,8);ctx.fillRect(x+2,y+14-step,8,8);
    if(!remote){ctx.fillStyle=avatar.accent;ctx.fillRect(character.direction==="left"?x-16:x+10,y-2,8,14);}
    if(remote) drawPixelText(ctx,normalized.nickname,x,y-48,{size:9,color:"#f8f5df",align:"center",stroke:"#07101f"});
  }

  function drawSign(x,y,text,color="#ffd45c"){
    ctx.fillStyle="#3a2a26";ctx.fillRect(x-3,y,6,25);ctx.fillRect(x-32,y-20,64,24);
    ctx.fillStyle=color;ctx.fillRect(x-27,y-15,54,14);
    drawPixelText(ctx,text,x,y-8,{size:8,color:"#171127",align:"center",stroke:null});
  }

  function drawWorld(){
    ctx.save();
    ctx.translate(-Math.round(camera.x),-Math.round(camera.y));
    drawGround();
    drawDecor();
    if(tapTarget){
      const pulse=Math.floor(elapsed*6)%2?3:0;
      ctx.fillStyle="#081027";ctx.fillRect(tapTarget.x-12-pulse,tapTarget.y-3-pulse,24+pulse*2,6+pulse*2);ctx.fillRect(tapTarget.x-3-pulse,tapTarget.y-12-pulse,6+pulse*2,24+pulse*2);
      ctx.fillStyle="#ffd45c";ctx.fillRect(tapTarget.x-7,tapTarget.y-2,14,4);ctx.fillRect(tapTarget.x-2,tapTarget.y-7,4,14);
    }
    drawSign(1018,776,"ศูนย์กลาง");
    DISTRICTS.forEach(district => drawSign(district.hub.x,district.hub.y+76,district.short,district.color));
    BUILDINGS.forEach(drawBuilding);
    const sprites = [
      ...trees.map(tree => ({y:tree.y,draw:()=>drawTree(tree)})),
      ...portals.map(portal => ({y:portal.y+25,draw:()=>drawPortal(portal)})),
      ...npcs.map(npc => ({y:npc.y,draw:()=>drawCharacter(npc,false)})),
      ...[...remoteCharacters.values()].map(remote=>({y:remote.y,draw:()=>drawAdventurer(remote,remote.profile,true)})),
      {y:player.y,draw:()=>drawAdventurer(player,playerProfile,false)}
    ].sort((a,b)=>a.y-b.y);
    sprites.forEach(sprite=>sprite.draw());
    ctx.restore();
  }

  function drawMiniMap(){
    if(!mini) return;
    const sx=miniCanvas.width/WORLD_WIDTH,sy=miniCanvas.height/WORLD_HEIGHT;
    mini.fillStyle="#10172d";mini.fillRect(0,0,miniCanvas.width,miniCanvas.height);
    DISTRICTS.forEach((district,index)=>{
      mini.fillStyle=["#29563c","#28534a","#4b5135","#3d4059"][index];
      mini.fillRect(district.x*sx,district.y*sy,district.w*sx,district.h*sy);
    });
    mini.fillStyle="#b88a4c";mini.fillRect(0,744*sy,miniCanvas.width,56*sy);mini.fillRect(996*sx,0,56*sx,miniCanvas.height);
    WATER.forEach(water=>{mini.fillStyle="#367f98";mini.fillRect(water.x*sx,water.y*sy,water.w*sx,water.h*sy);});
    portals.forEach(portal=>{const stats=statsFor(portal);mini.fillStyle=stats.done>=stats.total?"#58e7b2":DISTRICTS[portal.district].color;mini.fillRect(portal.x*sx-2,portal.y*sy-2,4,4);});
    remoteCharacters.forEach(remote=>{mini.fillStyle=remote.profile.avatar.accent;mini.fillRect(remote.x*sx-1,remote.y*sy-1,3,3);});
    mini.fillStyle="#fff";mini.fillRect(player.x*sx-2,player.y*sy-2,5,5);
    mini.strokeStyle="#10101e";mini.lineWidth=3;mini.strokeRect(1.5,1.5,miniCanvas.width-3,miniCanvas.height-3);
  }

  function updateHud(){
    const locationName=locationNameAt(player.x,player.y);
    if(locationName!==previousDistrict){
      previousDistrict=locationName;
      if(districtLabel) districtLabel.textContent=locationName;
      options.onMusicScene?.(musicSceneAt(player.x,player.y),locationName);
    }
    const totals=portals.reduce((result,portal)=>{const stats=statsFor(portal);result.done+=Math.min(stats.done,stats.total);result.total+=stats.total;return result;},{done:0,total:0});
    const pct=totals.total?Math.round(totals.done/totals.total*100):0;
    if(progressText) progressText.textContent=`สำรวจคลัง ${totals.done}/${totals.total} ข้อ`;
    if(progressBar) progressBar.style.width=`${pct}%`;
    const unstarted=portals.find(portal=>statsFor(portal).done===0);
    if(objective) objective.textContent=unstarted?`ภารกิจแนะนำ: ค้นหาประตู ${unstarted.index+1} • ${unstarted.module.title}`:"เยี่ยมมาก! คุณเคยสำรวจครบทุกประตูแล้ว กลับไปเก็บความแม่นให้ถึง 80%";
  }

  function update(delta){
    remoteCharacters.forEach(remote=>{
      const gap=Math.hypot(remote.targetX-remote.x,remote.targetY-remote.y);
      const ease=gap>320?1:1-Math.pow(.006,delta);
      remote.x+=(remote.targetX-remote.x)*ease;
      remote.y+=(remote.targetY-remote.y)*ease;
      if(remote.moving) remote.step+=delta*8;
    });
    if(dialogueOpen||mapOpen){player.moving=false;return;}
    let horizontal=(keys.has("right")?1:0)-(keys.has("left")?1:0);
    let vertical=(keys.has("down")?1:0)-(keys.has("up")?1:0);
    if(!horizontal && !vertical && tapTarget){
      const dx=tapTarget.x-player.x;
      const dy=tapTarget.y-player.y;
      const gap=Math.hypot(dx,dy);
      if(gap<=9){tapTarget=null;tapBlockedFrames=0;}
      else{horizontal=dx/gap;vertical=dy/gap;}
    }
    player.moving=Boolean(horizontal||vertical);
    if(player.moving){
      const length=Math.hypot(horizontal,vertical)||1;
      const speed=PLAYER_SPEED*delta;
      const beforeX=player.x,beforeY=player.y;
      tryMove(horizontal/length*speed,vertical/length*speed);
      if(tapTarget){
        tapBlockedFrames=Math.hypot(player.x-beforeX,player.y-beforeY)<.15 ? tapBlockedFrames+1 : 0;
        if(tapBlockedFrames>18){tapTarget=null;tapBlockedFrames=0;}
      }
      player.step+=delta*9;
      if(Math.abs(horizontal)>Math.abs(vertical)) player.direction=horizontal>0?"right":"left";
      else player.direction=vertical>0?"down":"up";
    }
    const targetX=clamp(player.x-VIEW_WIDTH/2,0,WORLD_WIDTH-VIEW_WIDTH);
    const targetY=clamp(player.y-VIEW_HEIGHT/2,0,WORLD_HEIGHT-VIEW_HEIGHT);
    const ease=1-Math.pow(.0005,delta);
    camera.x+=(targetX-camera.x)*ease;
    camera.y+=(targetY-camera.y)*ease;
    updateNearest();
    if(locationNameAt(player.x,player.y)!==previousDistrict) updateHud();
  }

  function reportPlayerState(time,force=false){
    if(typeof options.onPlayerState!=="function") return;
    const snapshot={x:Math.round(player.x),y:Math.round(player.y),direction:player.direction,moving:player.moving,district:locationNameAt(player.x,player.y)};
    const fingerprint=`${snapshot.x}|${snapshot.y}|${snapshot.direction}|${Number(snapshot.moving)}|${snapshot.district}`;
    if(force || (fingerprint!==lastPresenceFingerprint && time-lastPresenceTime>=250) || time-lastPresenceTime>=20000){
      lastPresenceTime=time;
      lastPresenceFingerprint=fingerprint;
      options.onPlayerState(snapshot);
    }
  }

  function frame(time){
    if(destroyed) return;
    if(!canvas.isConnected){destroy();return;}
    const delta=Math.min((time-lastTime)/1000,.05);
    lastTime=time;
    elapsed+=delta;
    update(delta);
    reportPlayerState(time);
    drawWorld();
    drawMiniMap();
    if(time-lastSave>2500){savePosition(player);lastSave=time;}
    raf=requestAnimationFrame(frame);
  }

  const mobileBindings=[];
  root.querySelectorAll("[data-move]").forEach(button=>{
    const key=button.dataset.move;
    const down=event=>{event.preventDefault();tapTarget=null;button.classList.add("pressed");keys.add(key);try{button.setPointerCapture?.(event.pointerId);}catch(error){/* Synthetic test events do not own a pointer. */}canvas.focus({preventScroll:true});};
    const up=event=>{event.preventDefault();button.classList.remove("pressed");keys.delete(key);};
    button.addEventListener("pointerdown",down);button.addEventListener("pointerup",up);button.addEventListener("pointercancel",up);button.addEventListener("lostpointercapture",up);
    mobileBindings.push([button,"pointerdown",down],[button,"pointerup",up],[button,"pointercancel",up],[button,"lostpointercapture",up]);
  });
  const interactButton=root.querySelector("[data-interact]");
  const interactClick=event=>{event.preventDefault();canvas.focus({preventScroll:true});interact();};
  const onBlur=()=>keys.clear();
  const applyCloudPosition=event=>{
    const saved=event.detail?.adventure;
    if(!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return;
    player.x=clamp(saved.x,40,WORLD_WIDTH-40);
    player.y=clamp(saved.y,64,WORLD_HEIGHT-32);
    player.direction=["up","down","left","right"].includes(saved.direction) ? saved.direction : "down";
    camera.x=clamp(player.x-VIEW_WIDTH/2,0,WORLD_WIDTH-VIEW_WIDTH);
    camera.y=clamp(player.y-VIEW_HEIGHT/2,0,WORLD_HEIGHT-VIEW_HEIGHT);
    keys.clear();
    tapTarget=null;
    updateNearest();
    updateHud();
  };
  interactButton?.addEventListener("click",interactClick);
  const mapButtons=[...root.querySelectorAll("[data-adventure-map]")];
  mapButtons.forEach(button=>button.addEventListener("click",()=>toggleMap()));
  mapPanel?.querySelector("[data-map-close]")?.addEventListener("click",()=>toggleMap(false));
  root.querySelector("[data-adventure-reset]")?.addEventListener("click",resetPosition);
  window.addEventListener("keydown",onKeyDown,{passive:false});
  window.addEventListener("keyup",onKeyUp);
  window.addEventListener("blur",onBlur);
  window.addEventListener("teacherquest:cloud-progress",applyCloudPosition);
  canvas.addEventListener("pointerdown",setTapTarget);

  function destroy(){
    if(destroyed) return;
    destroyed=true;
    cancelAnimationFrame(raf);
    savePosition(player,{immediate:true});
    options.onLeave?.();
    keys.clear();
    window.removeEventListener("keydown",onKeyDown);
    window.removeEventListener("keyup",onKeyUp);
    window.removeEventListener("blur",onBlur);
    window.removeEventListener("teacherquest:cloud-progress",applyCloudPosition);
    canvas.removeEventListener("pointerdown",setTapTarget);
    mobileBindings.forEach(([element,event,handler])=>element.removeEventListener(event,handler));
    interactButton?.removeEventListener("click",interactClick);
    if(window.teacherQuestAdventureDebug?.destroy===destroy) delete window.teacherQuestAdventureDebug;
  }

  updateNearest();
  updateHud();
  setPlayerProfile(playerProfile);
  reportPlayerState(performance.now(),true);
  raf=requestAnimationFrame(frame);

  window.teacherQuestAdventureDebug={
    getState:()=>({x:player.x,y:player.y,direction:player.direction,moving:player.moving,district:locationNameAt(player.x,player.y),nearest:nearest?.module?.id||nearest?.id||null,remotePlayers:remoteCharacters.size,tapTarget:tapTarget?{...tapTarget}:null}),
    teleportToModule:id=>{const portal=portals.find(item=>item.module.id===id);if(!portal)return false;player.x=portal.x;player.y=portal.y+54;player.direction="up";camera.x=clamp(player.x-VIEW_WIDTH/2,0,WORLD_WIDTH-VIEW_WIDTH);camera.y=clamp(player.y-VIEW_HEIGHT/2,0,WORLD_HEIGHT-VIEW_HEIGHT);updateNearest();updateHud();return true;},
    teleportToNpc:id=>{const npc=npcs.find(item=>item.id===id);if(!npc)return false;player.x=npc.x;player.y=npc.y+48;player.direction="up";updateNearest();updateHud();return true;},
    interact,
    setRemotePlayers,
    setPlayerProfile,
    resetPosition,
    destroy
  };

  return {destroy,getState:window.teacherQuestAdventureDebug.getState,resetPosition,setRemotePlayers,setPlayerProfile};
}

window.createTeacherQuestAdventure=createTeacherQuestAdventure;
})();
