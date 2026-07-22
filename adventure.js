(()=>{
"use strict";

const STORAGE = "teacherQuestAdventure_v1";
const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 540;
const WORLD_CORE = window.TeacherQuestWorldCore;
if(!WORLD_CORE) throw new Error("TeacherQuestWorldCore must load before adventure.js");
const ACADEMY_MAP_ID="academy-plaza";
const TRAINING_MAP_ID="training-grove";
const LAW_MAP_ID="law-archive";
const FUTURE_MAP_ID="future-campus";
const MAP_REGISTRY = WORLD_CORE.createMapRegistry([
  {id:ACADEMY_MAP_ID,title:"โลกครูเควสต์",short:"ศูนย์กลาง",width:2048,height:1536,tile:32,spawn:{x:1024,y:812},musicScene:"plaza"},
  {id:TRAINING_MAP_ID,title:"ป่าฝึกเอาตัวรอด",short:"สนามกระโดด",width:2048,height:1536,tile:32,spawn:{x:1024,y:930},musicScene:"district1"},
  {id:LAW_MAP_ID,title:"นครคัมภีร์กฎหมาย",short:"โลกกฎหมาย",width:2048,height:1536,tile:32,spawn:{x:1024,y:930},musicScene:"district2"},
  {id:FUTURE_MAP_ID,title:"มหานครอนาคตการศึกษา",short:"โลกอนาคต",width:2048,height:1536,tile:32,spawn:{x:1024,y:930},musicScene:"district3"}
]);
const MAP_META=Object.freeze({
  [ACADEMY_MAP_ID]:Object.freeze({icon:"⌂",color:"#ffd45c",description:"ศูนย์กลางศาสตร์ครูและประตูเชื่อมโลก"}),
  [TRAINING_MAP_ID]:Object.freeze({icon:"J",color:"#58e7b2",description:"สนามฝึกกระโดด ทางลัด และการสำรวจ"}),
  [LAW_MAP_ID]:Object.freeze({icon:"§",color:"#ff9b6a",description:"กฎหมายการศึกษา วิชาชีพ และการบริหารราชการ"}),
  [FUTURE_MAP_ID]:Object.freeze({icon:"✦",color:"#a88cff",description:"ภาษา วัฒนธรรม นวัตกรรม คุณภาพ และเหตุการณ์ปัจจุบัน"})
});
const DEFAULT_MAP = MAP_REGISTRY.get(MAP_REGISTRY.defaultMapId);
const WORLD_WIDTH = DEFAULT_MAP.width;
const WORLD_HEIGHT = DEFAULT_MAP.height;
const TILE = DEFAULT_MAP.tile;
const PLAYER_SPEED = 176;
const INTERACT_DISTANCE = 76;
const VISION_RADIUS = 190;
const JUMP_DURATION = .54;
const JUMP_COOLDOWN = .18;
const CHAT_RADIUS = 360;
const CHAT_STALE_AFTER = 15000;
const MUTED_CHAT_STORAGE = "teacherQuestMutedChat_v1";
const SPAWN = DEFAULT_MAP.spawn;
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

const THEMED_PORTAL_POSITIONS = Object.freeze([
  {x:376,y:300},{x:752,y:288},{x:1296,y:288},{x:1672,y:300},
  {x:360,y:1136},{x:752,y:1184},{x:1296,y:1184},{x:1688,y:1136}
]);
const MODULE_MAPS=Object.freeze({
  [ACADEMY_MAP_ID]:Object.freeze(["learn","curriculum","measure","research","psych","student","classroom","profession"]),
  [LAW_MAP_ID]:Object.freeze(["eduact","child","disability","civil","ksp","voclaw","admin"]),
  [FUTURE_MAP_ID]:Object.freeze(["media","culture","english","policy","quality","current"])
});
const MAP_DISTRICT_INDEX=Object.freeze({[ACADEMY_MAP_ID]:0,[LAW_MAP_ID]:2,[FUTURE_MAP_ID]:3});

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

const TRAINING_ROADS = Object.freeze([
  {x:0,y:744,w:WORLD_WIDTH,h:56,main:true},
  {x:996,y:0,w:56,h:WORLD_HEIGHT,main:true},
  {x:280,y:476,w:1488,h:44},
  {x:280,y:1036,w:1488,h:44},
  {x:284,y:480,w:44,h:600},
  {x:1724,y:480,w:44,h:600}
]);
const TRAINING_WATER = Object.freeze([
  {x:64,y:112,w:660,h:304},{x:1320,y:108,w:648,h:308},
  {x:96,y:1152,w:520,h:272},{x:1432,y:1144,w:520,h:280}
]);
const TRAINING_BUILDINGS = Object.freeze([
  {x:872,y:560,w:304,h:150,kind:"fort",name:"หอฝึกการเคลื่อนไหว"},
  {x:300,y:884,w:154,h:108,kind:"house",name:"ค่ายพักนักสำรวจ"},
  {x:1594,y:884,w:154,h:108,kind:"house",name:"ฐานฝึกทางลัด"}
]);
const LAW_BUILDINGS = Object.freeze([
  {x:856,y:548,w:336,h:168,kind:"archive",name:"หอจดหมายเหตุกฎหมาย"},
  {x:256,y:724,w:190,h:126,kind:"archive",name:"ศาลาครูและบุคลากร"},
  {x:1602,y:724,w:190,h:126,kind:"fort",name:"ป้อมบริหารการศึกษา"}
]);
const LAW_WATER = Object.freeze([
  {x:72,y:84,w:600,h:222},{x:1376,y:84,w:600,h:222},
  {x:96,y:1272,w:520,h:168},{x:1432,y:1272,w:520,h:168}
]);
const FUTURE_BUILDINGS = Object.freeze([
  {x:856,y:548,w:336,h:168,kind:"lab",name:"สถาบันอนาคตการศึกษา"},
  {x:250,y:720,w:200,h:130,kind:"lab",name:"หอเทคโนโลยีและสื่อ"},
  {x:1598,y:720,w:200,h:130,kind:"fort",name:"ศูนย์นโยบาย 2569"}
]);
const FUTURE_WATER = Object.freeze([
  {x:56,y:72,w:420,h:200},{x:1572,y:72,w:420,h:200},
  {x:720,y:1260,w:608,h:180}
]);
const LOW_BARRIERS = Object.freeze({
  [ACADEMY_MAP_ID]:[
    {x:1210,y:794,w:18,h:116,label:"รั้วทางลัด"}
  ],
  [TRAINING_MAP_ID]:[
    {x:930,y:858,w:188,h:18,label:"แนวรั้วฝึก 1"},
    {x:760,y:1008,w:220,h:18,label:"แนวรั้วฝึก 2"},
    {x:1070,y:1008,w:220,h:18,label:"แนวรั้วฝึก 3"},
    {x:1376,y:720,w:18,h:210,label:"แนวรั้วฝึก 4"}
  ],
  [LAW_MAP_ID]:[],
  [FUTURE_MAP_ID]:[]
});
const WORLD_GATES = Object.freeze({
  [ACADEMY_MAP_ID]:[
    {id:"gate-training",x:1280,y:850,name:"ป่าฝึกเอาตัวรอด",targetMap:TRAINING_MAP_ID,target:{x:1024,y:930,direction:"up"},color:"#58e7b2"},
    {id:"gate-law",x:768,y:850,name:"นครคัมภีร์กฎหมาย",targetMap:LAW_MAP_ID,target:{x:1024,y:930,direction:"up"},color:"#ff9b6a"},
    {id:"gate-future",x:1024,y:1012,name:"มหานครอนาคตการศึกษา",targetMap:FUTURE_MAP_ID,target:{x:1024,y:930,direction:"up"},color:"#a88cff"}
  ],
  [TRAINING_MAP_ID]:[
    {id:"gate-academy",x:1024,y:790,name:"กลับโลกครูเควสต์",targetMap:ACADEMY_MAP_ID,target:{x:1280,y:910,direction:"down"},color:"#ffd45c"}
  ],
  [LAW_MAP_ID]:[
    {id:"gate-academy",x:1024,y:790,name:"กลับโลกครูเควสต์",targetMap:ACADEMY_MAP_ID,target:{x:768,y:910,direction:"down"},color:"#ffd45c"}
  ],
  [FUTURE_MAP_ID]:[
    {id:"gate-academy",x:1024,y:790,name:"กลับโลกครูเควสต์",targetMap:ACADEMY_MAP_ID,target:{x:1024,y:1068,direction:"down"},color:"#ffd45c"}
  ]
});

const NPC_DEFINITIONS = Object.freeze([
  {id:"guide",x:1018,y:866,name:"ครูผู้พิทักษ์",role:"ไกด์ประจำโลก",color:"#ffd45c",dialogue:"ยินดีต้อนรับสู่ครูเควสต์! เดินสำรวจโลกทั้ง 4 เขต เข้าใกล้ประตูวิชา แล้วกด E (ปุ่ม ำ เมื่อเป็นภาษาไทย) หรือ SPACE เพื่อเริ่มภารกิจ โดยไม่ต้องสลับภาษาคีย์บอร์ด",action:"help"},
  {id:"trainer",x:900,y:830,name:"ครูฝึกคอมโบ",role:"สนามฝึก",color:"#ff72b4",dialogue:"อยากซ้อมแบบรวดเร็ว หรือไล่ล่าข้อที่ยังไม่แม่นใช่ไหม? สนามฝึกเดิมยังอยู่ครบและใช้ความคืบหน้าชุดเดียวกับโลกนี้",action:"practice"},
  {id:"examiner",x:1138,y:830,name:"ผู้คุมสนามสอบ",role:"สนามสอบใหญ่",color:"#ff6679",dialogue:"เมื่อพร้อมแล้ว มาทดลองสนามสอบแบบจับเวลาจริงได้ คำตอบจะถูกเก็บไว้จนกว่าจะกดส่งข้อสอบ",action:"exam"},
  {id:"librarian",x:1024,y:554,name:"บรรณารักษ์พิกเซล",role:"คัมภีร์ความรู้",color:"#58e7b2",dialogue:"คัมภีร์เก็บสูตรจำ สาระสำคัญ และแหล่งอ้างอิงของทุกดินแดนไว้ หากติดตรงไหนแวะมาทบทวนได้",action:"codex"},
  {id:"scholar",x:512,y:498,name:"นักปราชญ์แห่งการสอน",role:"ผู้ดูแลเขตศาสตร์ครู",color:"#ffd45c",dialogue:"เขตนี้รวมศาสตร์การสอน หลักสูตร การวัดผล วิจัย และจิตวิทยา เริ่มจากด่านที่ยังไม่เคยทำก่อน แล้วค่อยกลับมาเก็บความแม่นให้เกิน 80%",action:"district"},
  {id:"inventor",x:1536,y:498,name:"ช่างกลนวัตกรรม",role:"ผู้ดูแลเขตนวัตกรรม",color:"#58e7b2",dialogue:"เขตนี้ฝึกสื่อ AI การจัดชั้นเรียน และมาตรฐานวิชาชีพ ประตูจะสว่างขึ้นตามความคืบหน้าของคุณ",action:"district"},
  {id:"judge",x:512,y:1268,name:"ผู้เฝ้าคัมภีร์",role:"ผู้ดูแลเขตกฎหมาย",color:"#ff9b6a",dialogue:"ข้อกฎหมายต้องอ่านคำถามและเงื่อนไขให้ครบ อย่าใช้ความยาวของตัวเลือกเป็นตัวเดา เพราะคลังนี้ปรับสมดุลตัวเลือกแล้ว",action:"district"},
  {id:"ranger",x:1536,y:1268,name:"ผู้สังเกตการณ์ 2569",role:"ผู้ดูแลเขตอนาคต",color:"#a88cff",dialogue:"เขตนี้รวมภาษา วัฒนธรรม นโยบาย คุณภาพ และสถานการณ์ปัจจุบัน เนื้อหาที่ผันแปรมีวันที่ตรวจสอบและลิงก์แหล่งทางการสำหรับตรวจเทียบ",action:"district"}
]);

const TRAINING_NPCS = Object.freeze([
  {id:"jump-coach",x:1160,y:938,name:"ครูฝึกกระโดด",role:"บทเรียนการเคลื่อนไหว",color:"#58e7b2",dialogue:"กด SPACE หรือ J ได้แม้แป้นพิมพ์เป็นภาษาไทย ใช้กระโดดข้ามรั้วเตี้ยเพื่อเปิดทางลัด ส่วน E/ำ และ ENTER ใช้พูดคุยหรือเข้าประตู",action:"district"},
  {id:"path-scout",x:1540,y:1030,name:"นักสำรวจทางลัด",role:"ผู้ดูแลป่าฝึก",color:"#a88cff",dialogue:"พื้นที่ที่เดินผ่านจะถูกเปิดบนมินิแมพ จุดสำคัญจะปรากฏต่อเมื่อคุณสำรวจพบแล้ว ความคืบหน้านี้บันทึกไปกับ Cloud Save",action:"district"}
]);
const LAW_NPCS = Object.freeze([
  {id:"law-keeper",x:1160,y:930,name:"ผู้พิทักษ์มาตรา",role:"ผู้ดูแลโลกกฎหมาย",color:"#ff9b6a",dialogue:"ประตูในโลกนี้รวบรวมกฎหมายการศึกษา กฎหมายวิชาชีพ และการบริหารราชการ อ่านเงื่อนไขและถ้อยคำให้ครบก่อนเลือกคำตอบ",action:"district"},
  {id:"law-librarian",x:884,y:930,name:"บรรณารักษ์ราชกิจจา",role:"ผู้ตรวจแหล่งอ้างอิง",color:"#ffd45c",dialogue:"หลังตอบแต่ละข้อ ระบบจะแสดงเอกสาร หน้า หรือหัวข้อที่ตรวจพบ และแยกลิงก์ทางการออกจากเอกสารแนวข้อสอบอย่างชัดเจน",action:"codex"}
]);
const FUTURE_NPCS = Object.freeze([
  {id:"future-ranger",x:1160,y:930,name:"ผู้สังเกตการณ์ 2569",role:"ผู้ดูแลโลกอนาคต",color:"#a88cff",dialogue:"โลกนี้รวมภาษา วัฒนธรรม นวัตกรรม คุณภาพ นโยบาย และเหตุการณ์ปัจจุบัน ข้อมูลที่เปลี่ยนได้จะมีวันที่ตรวจสอบกำกับ",action:"district"},
  {id:"future-engineer",x:884,y:930,name:"วิศวกรสื่อการเรียนรู้",role:"ห้องทดลองนวัตกรรม",color:"#58e7b2",dialogue:"สำรวจประตูแต่ละแขนงเพื่อฝึกทั้งหลักการและสถานการณ์ประยุกต์ เพลงและบรรยากาศของโลกนี้จะต่างจากเขตกฎหมาย",action:"district"}
]);

function loadAdventureState(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE) || "{}");
    return {
      position:MAP_REGISTRY.normalizePosition(saved,{mapId:DEFAULT_MAP.id,...SPAWN,direction:"down"}),
      exploration:saved?.exploration&&typeof saved.exploration==="object"&&!Array.isArray(saved.exploration)?saved.exploration:{}
    };
  }catch(error){
    console.warn("Could not load adventure position",error);
  }
  return {position:MAP_REGISTRY.normalizePosition({mapId:DEFAULT_MAP.id,...SPAWN,direction:"down"}),exploration:{}};
}

function savePosition(player,explorationSets,{immediate=false}={}){
  const position=MAP_REGISTRY.normalizePosition({mapId:player.mapId,x:Math.round(player.x),y:Math.round(player.y),direction:player.direction});
  const exploration={};
  MAP_REGISTRY.ids.forEach(mapId=>{
    exploration[mapId]=MAP_REGISTRY.exploration(mapId).encode(explorationSets?.get(mapId));
  });
  const snapshot={...position,exploration};
  try{
    localStorage.setItem(STORAGE,JSON.stringify(snapshot));
    window.TeacherQuestOnline?.saveAdventurePosition?.(snapshot,{immediate});
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

function makeThemedRoads(portals){
  const roads=[
    {x:0,y:744,w:WORLD_WIDTH,h:56,main:true},
    {x:996,y:0,w:56,h:WORLD_HEIGHT,main:true}
  ];
  portals.forEach(portal=>{
    roads.push({x:Math.min(portal.x,1024)-18,y:portal.y-18,w:Math.abs(1024-portal.x)+36,h:36});
    roads.push({x:1006,y:Math.min(portal.y,772)-18,w:36,h:Math.abs(772-portal.y)+36});
  });
  return roads;
}

function makeTrees({portals=[],roads=[],npcs=[],buildings=[],water=[],spawn=SPAWN,salt=0,density=.61}={}){
  const trees = [];
  for(let ty=2;ty<46;ty+=2){
    for(let tx=2;tx<62;tx+=2){
      if(seeded(tx,ty,7+salt) < density) continue;
      const x = tx*TILE + Math.floor(seeded(tx,ty,8+salt)*18-9);
      const y = ty*TILE + Math.floor(seeded(tx,ty,9+salt)*18-9);
      const nearRoad = roads.some(road => rectContains(road,x,y,34));
      const nearPortal = portals.some(portal => Math.hypot(portal.x-x,portal.y-y) < 96);
      const nearNpc = npcs.some(npc => Math.hypot(npc.x-x,npc.y-y) < 76);
      const nearBuilding = buildings.some(building => rectContains(building,x,y,52));
      const inWater = water.some(area => rectContains(area,x,y,16));
      const nearSpawn = Math.hypot(spawn.x-x,spawn.y-y) < 170;
      if(!nearRoad && !nearPortal && !nearNpc && !nearBuilding && !inWater && !nearSpawn){
        trees.push({x,y,variant:Math.floor(seeded(tx,ty,10+salt)*3)});
      }
    }
  }
  return trees;
}

function districtAt(x,y){
  const index = (y >= 768 ? 2 : 0) + (x >= 1024 ? 1 : 0);
  return DISTRICTS[index];
}

function locationNameAt(mapId,x,y){
  if(mapId===TRAINING_MAP_ID) return "ป่าฝึกเอาตัวรอด";
  if(mapId===LAW_MAP_ID) return "นครคัมภีร์กฎหมาย";
  if(mapId===FUTURE_MAP_ID) return "มหานครอนาคตการศึกษา";
  if(x>=816&&x<=1232&&y>=520&&y<=976) return "ลานสถาบันครูเควสต์";
  return districtAt(x,y).name;
}

function musicSceneAt(mapId,x,y){
  if(mapId!==ACADEMY_MAP_ID) return MAP_REGISTRY.get(mapId).musicScene;
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
  const chatRoot = root.querySelector("#adventureChat");
  const chatFeed = root.querySelector("#adventureChatFeed");
  const chatNearby = root.querySelector("#adventureChatNearby");
  const worldTitle = root.querySelector("#adventureWorldTitle");
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
  const storedState=loadAdventureState();
  const player = {...storedState.position,moving:false,step:0,jumping:false,jumpElapsed:0,jumpHeight:0,jumpCooldown:0,action:"",actionAt:0};
  let activeMap=MAP_REGISTRY.get(player.mapId);
  const camera = {x:clamp(player.x-VIEW_WIDTH/2,0,WORLD_WIDTH-VIEW_WIDTH),y:clamp(player.y-VIEW_HEIGHT/2,0,WORLD_HEIGHT-VIEW_HEIGHT)};
  const modules = options.modules || [];
  const portals = modules.map((module,index) => {
    const mapId=Object.keys(MODULE_MAPS).find(id=>MODULE_MAPS[id].includes(module.id))||ACADEMY_MAP_ID;
    const mapIndex=Math.max(0,MODULE_MAPS[mapId].indexOf(module.id));
    return {...THEMED_PORTAL_POSITIONS[mapIndex%THEMED_PORTAL_POSITIONS.length],module,index,mapId,district:MAP_DISTRICT_INDEX[mapId]??0};
  });
  const statsCache = new Map();
  const portalsFor=mapId=>portals.filter(portal=>portal.mapId===mapId);
  const academyPortals=portalsFor(ACADEMY_MAP_ID);
  const lawPortals=portalsFor(LAW_MAP_ID);
  const futurePortals=portalsFor(FUTURE_MAP_ID);
  const academyRoads = makeThemedRoads(academyPortals);
  const lawRoads = makeThemedRoads(lawPortals);
  const futureRoads = makeThemedRoads(futurePortals);
  const academyNpcs = NPC_DEFINITIONS.filter(npc=>!["inventor","judge","ranger"].includes(npc.id)).map(npc => ({...npc,type:"npc"}));
  const trainingNpcs = TRAINING_NPCS.map(npc => ({...npc,type:"npc"}));
  const lawNpcs = LAW_NPCS.map(npc => ({...npc,type:"npc"}));
  const futureNpcs = FUTURE_NPCS.map(npc => ({...npc,type:"npc"}));
  const academyTrees = makeTrees({portals:academyPortals,roads:academyRoads,npcs:academyNpcs,buildings:BUILDINGS,water:WATER,spawn:MAP_REGISTRY.get(ACADEMY_MAP_ID).spawn});
  const trainingTrees = makeTrees({roads:TRAINING_ROADS,npcs:trainingNpcs,buildings:TRAINING_BUILDINGS,water:TRAINING_WATER,spawn:MAP_REGISTRY.get(TRAINING_MAP_ID).spawn,salt:37,density:.54});
  const lawTrees = makeTrees({portals:lawPortals,roads:lawRoads,npcs:lawNpcs,buildings:LAW_BUILDINGS,water:LAW_WATER,spawn:MAP_REGISTRY.get(LAW_MAP_ID).spawn,salt:71,density:.57});
  const futureTrees = makeTrees({portals:futurePortals,roads:futureRoads,npcs:futureNpcs,buildings:FUTURE_BUILDINGS,water:FUTURE_WATER,spawn:MAP_REGISTRY.get(FUTURE_MAP_ID).spawn,salt:109,density:.59});
  const buildObstacles=(buildings,trees)=>[
    ...buildings.map(building => ({x:building.x+8,y:building.y+36,w:building.w-16,h:building.h-38})),
    ...trees.map(tree => ({x:tree.x-10,y:tree.y-8,w:20,h:17}))
  ];
  const scenes={
    [ACADEMY_MAP_ID]:{map:MAP_REGISTRY.get(ACADEMY_MAP_ID),portals:academyPortals,npcs:academyNpcs,roads:academyRoads,trees:academyTrees,buildings:BUILDINGS,water:WATER,gates:WORLD_GATES[ACADEMY_MAP_ID],barriers:LOW_BARRIERS[ACADEMY_MAP_ID],obstacles:buildObstacles(BUILDINGS,academyTrees),palette:["#3c8351","#34805d","#507b49","#3d7161"],road:["#c79e5a","#bd914d"],sign:"ศูนย์กลางหลายโลก",color:"#ffd45c",salt:0},
    [TRAINING_MAP_ID]:{map:MAP_REGISTRY.get(TRAINING_MAP_ID),portals:[],npcs:trainingNpcs,roads:TRAINING_ROADS,trees:trainingTrees,buildings:TRAINING_BUILDINGS,water:TRAINING_WATER,gates:WORLD_GATES[TRAINING_MAP_ID],barriers:LOW_BARRIERS[TRAINING_MAP_ID],obstacles:buildObstacles(TRAINING_BUILDINGS,trainingTrees),palette:["#254f3d","#275948","#31583b","#294b44"],road:["#8e7653","#816747"],sign:"สนามกระโดด",color:"#58e7b2",salt:37},
    [LAW_MAP_ID]:{map:MAP_REGISTRY.get(LAW_MAP_ID),portals:lawPortals,npcs:lawNpcs,roads:lawRoads,trees:lawTrees,buildings:LAW_BUILDINGS,water:LAW_WATER,gates:WORLD_GATES[LAW_MAP_ID],barriers:LOW_BARRIERS[LAW_MAP_ID],obstacles:buildObstacles(LAW_BUILDINGS,lawTrees),palette:["#5e473b","#634d3c","#4c5141","#59443e"],road:["#b88355","#9b6848"],sign:"นครคัมภีร์",color:"#ff9b6a",salt:71},
    [FUTURE_MAP_ID]:{map:MAP_REGISTRY.get(FUTURE_MAP_ID),portals:futurePortals,npcs:futureNpcs,roads:futureRoads,trees:futureTrees,buildings:FUTURE_BUILDINGS,water:FUTURE_WATER,gates:WORLD_GATES[FUTURE_MAP_ID],barriers:LOW_BARRIERS[FUTURE_MAP_ID],obstacles:buildObstacles(FUTURE_BUILDINGS,futureTrees),palette:["#334c61","#34566a","#3d4d68","#31485b"],road:["#6a78a8","#596895"],sign:"มหานครอนาคต",color:"#a88cff",salt:109}
  };
  const explorationSets=new Map(MAP_REGISTRY.ids.map(mapId=>[mapId,MAP_REGISTRY.exploration(mapId).decode(storedState.exploration?.[mapId])]));
  let explorationDirty=false;
  let lastExplorationCell=-1;
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
  let chatMessages = [];
  let lastChatRender = -Infinity;
  let mutedChatUids = new Set();
  try{mutedChatUids=new Set(JSON.parse(localStorage.getItem(MUTED_CHAT_STORAGE)||"[]").map(String).slice(0,100));}catch(error){console.warn(error);}
  let tapTarget = null;
  let tapBlockedFrames = 0;
  let dialogueChoiceIndex = -1;

  const currentScene=()=>scenes[activeMap.id]||scenes[ACADEMY_MAP_ID];
  const currentExploration=()=>explorationSets.get(activeMap.id);

  canvas.width = VIEW_WIDTH;
  canvas.height = VIEW_HEIGHT;
  ctx.imageSmoothingEnabled = false;
  if(mini){ miniCanvas.width = 176; miniCanvas.height = 124; mini.imageSmoothingEnabled = false; }

  function statsFor(portal){
    if(statsCache.has(portal.module.id)) return statsCache.get(portal.module.id);
    const stats = options.getStats?.(portal.module.id) || {total:0,done:0,accuracy:0};
    const normalized = {total:Number(stats.total)||0,done:Number(stats.done)||0,accuracy:Number(stats.accuracy)||0};
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
        style:["short","spike","long","cap"].includes(avatar.style)?avatar.style:"short",
        accessory:["none","cape","book","crown"].includes(avatar.accessory)?avatar.accessory:"none"
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
        Object.assign(existing,{targetX:clamp(item.x,0,WORLD_WIDTH),targetY:clamp(item.y,0,WORLD_HEIGHT),direction:item.direction||"down",moving:Boolean(item.moving),action:["wave","cheer","spin"].includes(item.action)?item.action:"",actionAt:Number(item.actionAt)||0,profile});
      }else{
        remoteCharacters.set(uid,{uid,x:clamp(item.x,0,WORLD_WIDTH),y:clamp(item.y,0,WORLD_HEIGHT),targetX:clamp(item.x,0,WORLD_WIDTH),targetY:clamp(item.y,0,WORLD_HEIGHT),direction:item.direction||"down",moving:Boolean(item.moving),step:0,action:["wave","cheer","spin"].includes(item.action)?item.action:"",actionAt:Number(item.actionAt)||0,profile});
      }
    });
    [...remoteCharacters.keys()].forEach(uid=>{if(!seen.has(uid))remoteCharacters.delete(uid);});
    renderProximityChat();
  }

  function normalizeChatMessage(item={},index=0){
    return {
      uid:String(item.uid||`message-${index}`).replace(/[^a-zA-Z0-9_-]/g,"").slice(0,128),
      nickname:String(item.nickname||"นักผจญภัย").replace(/[<>\u0000-\u001f\u007f]/g,"").slice(0,20),
      text:String(item.text||"").replace(/[<>\u0000-\u001f\u007f]/g,"").replace(/\s+/g," ").trim().slice(0,80),
      x:clamp(Number(item.x)||0,0,WORLD_WIDTH),y:clamp(Number(item.y)||0,0,WORLD_HEIGHT),
      sentAt:Number(item.sentAt)||Date.now(),self:Boolean(item.self)
    };
  }

  function setZoneMessages(messages=[]){
    chatMessages=messages.slice(-40).map(normalizeChatMessage).filter(message=>message.text);
    renderProximityChat();
  }

  function saveMutedChat(){
    try{localStorage.setItem(MUTED_CHAT_STORAGE,JSON.stringify([...mutedChatUids].slice(0,100)));}catch(error){console.warn(error);}
  }

  function nearbyChatMessages(){
    const now=Date.now();
    return chatMessages.filter(message=>now-message.sentAt<CHAT_STALE_AFTER && !mutedChatUids.has(message.uid) && (message.self||distance(player,message)<=CHAT_RADIUS));
  }

  function renderProximityChat(){
    if(!chatFeed) return;
    const nearby=[...remoteCharacters.values()].filter(remote=>distance(player,remote)<=CHAT_RADIUS);
    if(chatNearby) chatNearby.textContent=`${nearby.length} คน`;
    const messages=nearbyChatMessages();
    const rows=messages.map(message=>`<div class="adventure-chat-line ${message.self?"self":""}">${message.self?`<b>คุณ</b>`:`<button type="button" data-chat-mute="${escapeHtml(message.uid)}" title="ปิดเสียงผู้เล่นนี้">${escapeHtml(message.nickname)}</button>`}<span>${escapeHtml(message.text)}</span></div>`).join("");
    const muted=mutedChatUids.size?`<button class="adventure-chat-unmute" type="button" data-chat-unmute-all>เลิกปิดเสียงทั้งหมด (${mutedChatUids.size})</button>`:"";
    chatFeed.innerHTML=rows||`<p>${nearby.length?"อยู่ใกล้กันแล้ว ลองทักทายได้เลย":"เดินเข้าใกล้เพื่อนเพื่อเริ่มคุยกัน"}</p>`;
    if(muted) chatFeed.insertAdjacentHTML("beforeend",muted);
    chatFeed.scrollTop=chatFeed.scrollHeight;
  }

  const onChatFeedClick=event=>{
    const muteButton=event.target.closest?.("[data-chat-mute]");
    if(muteButton){mutedChatUids.add(String(muteButton.dataset.chatMute||""));saveMutedChat();renderProximityChat();return;}
    if(event.target.closest?.("[data-chat-unmute-all]")){mutedChatUids.clear();saveMutedChat();renderProximityChat();}
  };
  chatFeed?.addEventListener("click",onChatFeedClick);

  function isRoad(x,y){ return currentScene().roads.some(road => rectContains(road,x,y)); }
  function isWater(x,y){ return currentScene().water.some(water => rectContains(water,x,y)) && !isRoad(x,y); }
  function isExploredAt(x,y,mapId=activeMap.id){
    const codec=MAP_REGISTRY.exploration(mapId);
    return explorationSets.get(mapId)?.has(codec.cellIndex(x,y)) || false;
  }
  function explorationPercent(mapId=activeMap.id){
    const codec=MAP_REGISTRY.exploration(mapId);
    return Math.round((explorationSets.get(mapId)?.size||0)/codec.total*100);
  }
  function revealAroundPlayer(force=false){
    const codec=MAP_REGISTRY.exploration(activeMap.id);
    const cell=codec.cellIndex(player.x,player.y);
    if(!force&&cell===lastExplorationCell) return false;
    lastExplorationCell=cell;
    const added=codec.reveal(currentExploration(),player.x,player.y,VISION_RADIUS);
    if(added){explorationDirty=true;updateHud();}
    return added>0;
  }
  function collides(x,y){
    const halfW = 11;
    const top = y-11;
    const bottom = y+8;
    if(x-halfW<18 || x+halfW>WORLD_WIDTH-18 || top<32 || bottom>WORLD_HEIGHT-16) return true;
    const points = [[x-halfW,top],[x+halfW,top],[x-halfW,bottom],[x+halfW,bottom]];
    if(points.some(([px,py]) => isWater(px,py))) return true;
    if(currentScene().obstacles.some(rect => points.some(([px,py]) => rectContains(rect,px,py)))) return true;
    return !player.jumping&&currentScene().barriers.some(rect => points.some(([px,py]) => rectContains(rect,px,py)));
  }

  function tryMove(dx,dy){
    const nextX = player.x+dx;
    const nextY = player.y+dy;
    if(!collides(nextX,player.y)) player.x = nextX;
    if(!collides(player.x,nextY)) player.y = nextY;
  }

  function startJump(){
    if(dialogueOpen||mapOpen||player.jumping||player.jumpCooldown>0) return false;
    player.jumping=true;
    player.jumpElapsed=0;
    player.jumpHeight=1;
    player.jumpCooldown=JUMP_COOLDOWN;
    tapTarget=null;
    return true;
  }

  function startAction(action=options.getEquippedEmote?.()||"wave"){
    const next=["wave","cheer","spin"].includes(action)?action:"wave";
    if(dialogueOpen||mapOpen) return false;
    player.action=next;
    player.actionAt=Date.now();
    tapTarget=null;
    reportPlayerState(performance.now(),true);
    return true;
  }

  function switchMap(targetMapId,target){
    if(!MAP_REGISTRY.has(targetMapId)) return false;
    const nextMap=MAP_REGISTRY.get(targetMapId);
    const position=MAP_REGISTRY.normalizePosition({mapId:nextMap.id,...(target||nextMap.spawn)},{mapId:nextMap.id,...nextMap.spawn,direction:"down"});
    activeMap=nextMap;
    Object.assign(player,position,{moving:false,jumping:false,jumpElapsed:0,jumpHeight:0});
    remoteCharacters.clear();
    tapTarget=null;
    keys.clear();
    camera.x=clamp(player.x-VIEW_WIDTH/2,0,WORLD_WIDTH-VIEW_WIDTH);
    camera.y=clamp(player.y-VIEW_HEIGHT/2,0,WORLD_HEIGHT-VIEW_HEIGHT);
    lastExplorationCell=-1;
    previousDistrict="";
    revealAroundPlayer(true);
    updateNearest();
    updateHud();
    reportPlayerState(performance.now(),true);
    savePosition(player,explorationSets,{immediate:true});
    return true;
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
    const scene=currentScene();
    const candidates = [
      ...scene.portals.map(portal => ({...portal,type:"portal"})),
      ...scene.npcs,
      ...scene.gates.map(gate=>({...gate,type:"gate"}))
    ];
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
        : nearest.type === "gate"
          ? `<kbd>E</kbd><span>เดินทางไป ${escapeHtml(nearest.name)}</span>`
          : `<kbd>E</kbd><span>คุยกับ ${escapeHtml(nearest.name)}</span>`;
      prompt.classList.add("visible");
    }else{
      prompt.classList.remove("visible");
    }
  }

  function escapeHtml(value){
    return String(value ?? "").replace(/[&<>"']/g,char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char]);
  }

  function dialogueButtons(){
    return [...dialogueActions.querySelectorAll("button:not(:disabled)")];
  }

  function setDialogueChoice(button,{focus=false}={}){
    const buttons=dialogueButtons();
    const index=buttons.indexOf(button);
    if(index<0) return;
    dialogueChoiceIndex=index;
    buttons.forEach((item,itemIndex)=>{
      const active=itemIndex===dialogueChoiceIndex;
      item.classList.toggle("active-choice",active);
      item.dataset.activeChoice=String(active);
    });
    if(focus) button.focus({preventScroll:true});
  }

  function bindDialogueChoices(){
    const buttons=dialogueButtons();
    dialogueChoiceIndex=buttons.length?0:-1;
    buttons.forEach((button,index)=>{
      button.dataset.dialogueChoice=String(index);
      button.addEventListener("focus",()=>setDialogueChoice(button));
      button.addEventListener("pointerenter",()=>setDialogueChoice(button));
      button.addEventListener("pointerdown",()=>setDialogueChoice(button,{focus:true}));
    });
    buttons.forEach((button,index)=>button.classList.toggle("active-choice",index===dialogueChoiceIndex));
    return buttons;
  }

  function moveDialogueChoice(amount){
    const buttons=dialogueButtons();
    if(!buttons.length) return;
    const current=dialogueChoiceIndex<0?0:dialogueChoiceIndex;
    const next=(current+amount+buttons.length)%buttons.length;
    setDialogueChoice(buttons[next],{focus:true});
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
      savePosition(player,explorationSets);
      options.onStartModule?.(portal.module.id,button.dataset.adventureMode);
    }));
    dialogueActions.querySelector("[data-dialogue-close]")?.addEventListener("click",closeDialogue);
    showDialogue();
  }

  function openGate(gate){
    const destination=MAP_REGISTRY.get(gate.targetMap);
    dialogueEyebrow.textContent="WORLD GATE • ทางเชื่อมหลายแผนที่";
    dialogueTitle.textContent=gate.name;
    dialogueText.textContent=`${MAP_META[destination.id]?.description||"พื้นที่ใหม่ของครูเควสต์"} ความคืบหน้า หมอกที่เปิด และตำแหน่งล่าสุดของแต่ละโลกจะถูกบันทึกไว้`;
    dialogueStats.innerHTML=`<span><b>${explorationPercent(destination.id)}%</b> สำรวจแล้ว</span><span><b>${destination.short}</b> จุดหมาย</span>`;
    dialogueActions.innerHTML=`<button class="btn mint" data-gate-travel>เดินทางไป ${escapeHtml(destination.title)}</button><button class="btn dark" data-dialogue-close>อยู่ที่นี่ต่อ</button>`;
    dialogueActions.querySelector("[data-gate-travel]")?.addEventListener("click",()=>{
      closeDialogue();
      switchMap(gate.targetMap,gate.target);
    });
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
        ? `<button class="btn mint" data-map-open>เปิดแผนที่ 4 โลก</button><button class="btn dark" data-dialogue-close>เข้าใจแล้ว</button>`
        : `<button class="btn dark" data-dialogue-close>ขอบคุณสำหรับคำแนะนำ</button>`;
    dialogueActions.querySelector("[data-npc-action]")?.addEventListener("click",event => {
      savePosition(player,explorationSets);
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
    requestAnimationFrame(() => {
      const buttons=bindDialogueChoices();
      if(buttons[0]) setDialogueChoice(buttons[0],{focus:true});
    });
  }

  function closeDialogue(){
    dialogueOpen = false;
    dialogueChoiceIndex = -1;
    dialogue.hidden = true;
    dialogue.setAttribute("aria-hidden","true");
    canvas.focus({preventScroll:true});
    updateNearest();
  }

  function interact(){
    if(dialogueOpen || mapOpen || !nearest) return;
    if(nearest.type==="portal") openPortal(nearest);
    else if(nearest.type==="gate") openGate(nearest);
    else openNpc(nearest);
  }

  function renderMapPanel(){
    if(!mapPanel) return;
    const title=mapPanel.querySelector("#adventureMapTitle");
    const description=mapPanel.querySelector("#adventureMapDescription");
    if(title) title.textContent=`แผนที่: ${activeMap.title}`;
    if(description) description.textContent=`สำรวจแล้ว ${explorationPercent()}% • จุดสำคัญจะแสดงเมื่อค้นพบ`;
    const maps=`<section class="map-world-summary">${MAP_REGISTRY.ids.map(mapId=>{
      const map=MAP_REGISTRY.get(mapId);
      const meta=MAP_META[mapId]||MAP_META[ACADEMY_MAP_ID];
      const percent=explorationPercent(mapId);
      const discovered=percent>0||mapId===activeMap.id;
      return `<div class="map-world-card ${mapId===activeMap.id?"active":""} ${discovered?"":"locked"}" style="--map-color:${meta.color}"><span>${discovered?meta.icon:"?"}</span><b>${discovered?escapeHtml(map.title):"พื้นที่ลับยังไม่ค้นพบ"}</b><small>${discovered?`${percent}% สำรวจแล้ว`:"ค้นหาประตูเชื่อมโลก"}</small></div>`;
    }).join("")}</section>`;
    const scene=currentScene();
    const meta=MAP_META[activeMap.id]||MAP_META[ACADEMY_MAP_ID];
    const portalCards=scene.portals.map(portal=>{
      const stats=statsFor(portal);
      const discovered=isExploredAt(portal.x,portal.y);
      return `<div class="map-zone ${discovered?"":"undiscovered"} ${stats.done>=stats.total?"cleared":stats.done?"started":""}"><span>${discovered?escapeHtml(portal.module.icon):"?"}</span><b>${discovered?escapeHtml(portal.module.title):"ด่านที่ยังไม่ค้นพบ"}</b><small>${discovered?`${stats.done}/${stats.total} • ${stats.accuracy}%`:"สำรวจเพื่อเปิด"}</small></div>`;
    }).join("");
    const gateCards=scene.gates.map(gate=>{
      const discovered=isExploredAt(gate.x,gate.y);
      return `<div class="map-zone ${discovered?"started":"undiscovered"}"><span>${discovered?"↔":"?"}</span><b>${discovered?escapeHtml(gate.name):"ประตูโลกที่ยังไม่ค้นพบ"}</b><small>${discovered?"เดินทางได้แล้ว":"สำรวจเพื่อเปิด"}</small></div>`;
    }).join("");
    const trainingCard=activeMap.id===TRAINING_MAP_ID?`<div class="map-zone started"><span>J</span><b>แนวรั้วฝึก ${scene.barriers.length} จุด</b><small>SPACE / J</small></div>`:"";
    const content=`<section class="map-district ${activeMap.id===TRAINING_MAP_ID?"training-map-card":""}" style="--district:${meta.color}"><h4>${escapeHtml(meta.description)}</h4>${trainingCard}${portalCards}${gateCards}</section>`;
    mapPanel.querySelector(".adventure-map-grid").innerHTML = maps+content;
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
    Object.assign(player,activeMap.spawn,{mapId:activeMap.id,direction:"down",jumping:false,jumpHeight:0});
    camera.x = clamp(player.x-VIEW_WIDTH/2,0,WORLD_WIDTH-VIEW_WIDTH);
    camera.y = clamp(player.y-VIEW_HEIGHT/2,0,WORLD_HEIGHT-VIEW_HEIGHT);
    revealAroundPlayer(true);
    savePosition(player,explorationSets);
    updateNearest();
    updateHud();
  }

  function revealCurrentMap(){
    const codec=MAP_REGISTRY.exploration(activeMap.id);
    const explored=currentExploration();
    for(let index=0;index<codec.total;index++) explored.add(index);
    explorationDirty=true;
    updateHud();
    savePosition(player,explorationSets,{immediate:true});
    return {mapId:activeMap.id,explored:explored.size,total:codec.total};
  }

  function onKeyDown(event){
    if(destroyed || !canvas.isConnected || document.body.classList.contains("auth-locked")) return;
    const target = event.target;
    const inControl = target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(target.tagName);
    if(dialogueOpen){
      if(event.key === "Escape"){
        event.preventDefault();
        closeDialogue();
        return;
      }
      if(["ArrowLeft","ArrowUp"].includes(event.key)){
        event.preventDefault();
        moveDialogueChoice(-1);
      }else if(["ArrowRight","ArrowDown"].includes(event.key)){
        event.preventDefault();
        moveDialogueChoice(1);
      }else if(event.key==="Home"){
        event.preventDefault();
        const buttons=dialogueButtons();
        if(buttons[0]) setDialogueChoice(buttons[0],{focus:true});
      }else if(event.key==="End"){
        event.preventDefault();
        const buttons=dialogueButtons();
        if(buttons.at(-1)) setDialogueChoice(buttons.at(-1),{focus:true});
      }
      return;
    }
    if(mapOpen){
      if(event.key === "Escape"){
        event.preventDefault();
        toggleMap(false);
      }
      return;
    }
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const direction = DIRECTION_BY_CODE[event.code] || DIRECTION_BY_KEY[key];
    if(direction && !inControl){ event.preventDefault(); tapTarget=null; keys.add(direction); }
    const jumpKey = ["Space","KeyJ"].includes(event.code) || [" ","j","่"].includes(key);
    if(!inControl&&!event.repeat&&jumpKey){
      event.preventDefault();
      startJump();
    }
    const interactKey = ["KeyE","Enter","NumpadEnter"].includes(event.code) || ["e","ำ","Enter"].includes(key);
    if(!inControl && !event.repeat && interactKey){
      event.preventDefault();
      interact();
    }
    const mapKey = event.code === "KeyM" || key === "m" || key === "ท";
    if(!inControl && !event.repeat && mapKey){
      event.preventDefault();
      toggleMap();
    }
    const actionKey=["KeyQ","KeyC"].includes(event.code)||["q","c","ๆ","แ"].includes(key);
    if(!inControl&&!event.repeat&&actionKey){
      event.preventDefault();
      startAction();
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
          ctx.fillStyle = seeded(tx,ty,2+currentScene().salt)>.55 ? currentScene().road[0] : currentScene().road[1];
          ctx.fillRect(wx,wy,TILE,TILE);
          ctx.fillStyle = "#a97c42";
          if(seeded(tx,ty,3)>.58) ctx.fillRect(wx+6,wy+8,5,4);
          if(seeded(tx,ty,4)>.67) ctx.fillRect(wx+21,wy+22,4,3);
          if(currentScene().water.some(area => rectContains(area,cx,cy))){
            ctx.fillStyle="#765336"; ctx.fillRect(wx,wy,TILE,4); ctx.fillRect(wx,wy+28,TILE,4);
            ctx.fillStyle="#e2bc6d"; ctx.fillRect(wx+3,wy+6,26,20);
            ctx.fillStyle="#8c633c"; ctx.fillRect(wx+5,wy+14,22,3);
          }
        }else{
          ctx.fillStyle = currentScene().palette[DISTRICTS.indexOf(district)];
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
      const salt=currentScene().salt;
      if(!isWater(x,y) && !isRoad(x,y) && seeded(tx,ty,15+salt)>.88) drawFlower(x+(tx%3)*4-4,y+(ty%2)*5,colors[(tx+ty+4+salt)%colors.length]);
    }
  }

  function treeOpacity(tree){
    const proximity=distance(player,tree);
    if(proximity<=52) return .22;
    if(proximity>=124) return 1;
    return .22+(proximity-52)/72*.78;
  }

  function drawTree(tree){
    const {x,y,variant}=tree;
    ctx.save();
    ctx.globalAlpha=treeOpacity(tree);
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
    ctx.restore();
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
  }

  function drawGate(gate){
    const pulse=Math.floor(elapsed*5)%2?3:0;
    ctx.fillStyle="rgba(4,8,18,.45)";ctx.fillRect(gate.x-34,gate.y+20,68,12);
    ctx.fillStyle="#12152c";ctx.fillRect(gate.x-31,gate.y-42,62,68);
    ctx.fillStyle=gate.color;ctx.fillRect(gate.x-25-pulse/2,gate.y-36-pulse/2,50+pulse,55+pulse);
    ctx.fillStyle="#071b27";ctx.fillRect(gate.x-17,gate.y-29,34,47);
    ctx.fillStyle="#dff8ff";ctx.fillRect(gate.x-3,gate.y-13,6,19);
    ctx.fillStyle=gate.color;ctx.fillRect(gate.x-8,gate.y-4,16,5);
  }

  function drawBarrier(barrier){
    ctx.fillStyle="rgba(4,8,18,.35)";ctx.fillRect(barrier.x+4,barrier.y+8,barrier.w,barrier.h+5);
    ctx.fillStyle="#162c2a";ctx.fillRect(barrier.x,barrier.y,barrier.w,barrier.h);
    ctx.fillStyle="#2f6d48";ctx.fillRect(barrier.x+3,barrier.y+2,barrier.w-6,Math.max(5,barrier.h-6));
    ctx.fillStyle="#66a45e";
    if(barrier.w>barrier.h){for(let x=barrier.x+8;x<barrier.x+barrier.w-5;x+=20)ctx.fillRect(x,barrier.y-4,8,7);}
    else{for(let y=barrier.y+8;y<barrier.y+barrier.h-5;y+=20)ctx.fillRect(barrier.x-4,y,7,8);}
  }

  function drawPoiBadge(symbol,x,y,color){
    ctx.fillStyle="#050713";ctx.fillRect(x-12,y-12,24,24);
    ctx.fillStyle=color;ctx.fillRect(x-9,y-9,18,18);
    drawPixelText(ctx,symbol,x,y,{size:11,color:"#07101f",align:"center",stroke:null});
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
    const x=Math.round(character.x),groundY=Math.round(character.y);
    const actionAge=Date.now()-(Number(character.actionAt)||0);
    const action=actionAge>=0&&actionAge<1400&&["wave","cheer","spin"].includes(character.action)?character.action:"";
    const actionPhase=action?actionAge/1400:0;
    const cheerLift=action==="cheer"?Math.abs(Math.sin(actionPhase*Math.PI*4))*9:0;
    const y=groundY-Math.round((remote?0:Number(character.jumpHeight)||0)+cheerLift);
    const step=character.moving&&Math.floor(character.step)%2?3:0;
    ctx.fillStyle=`rgba(4,8,18,${character.jumping && !remote ? .22 : .38})`;ctx.fillRect(x-16,groundY+11,32,9);

    if(avatar.accessory==="cape"){
      ctx.fillStyle="#171127";ctx.fillRect(x-16,y-10,32,31);
      ctx.fillStyle=avatar.accent;ctx.fillRect(x-12,y-6,24,25);
    }
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
    if(avatar.accessory==="book"){
      const bookY=y-4+Math.round(Math.sin(elapsed*5)*3);
      ctx.fillStyle="#171127";ctx.fillRect(x+15,bookY,17,21);ctx.fillStyle="#ffd45c";ctx.fillRect(x+18,bookY+3,11,15);ctx.fillStyle="#5dcbff";ctx.fillRect(x+22,bookY+4,2,13);
    }else if(avatar.accessory==="crown"){
      ctx.fillStyle="#171127";ctx.fillRect(x-12,y-48,24,13);ctx.fillStyle="#ffd45c";ctx.fillRect(x-9,y-45,18,8);ctx.fillRect(x-9,y-50,5,7);ctx.fillRect(x-2,y-53,5,10);ctx.fillRect(x+5,y-50,4,7);
    }
    if(action==="wave"){
      const handX=character.direction==="left"?x-19:x+13;
      ctx.fillStyle="#171127";ctx.fillRect(handX,y-24,8,24);ctx.fillStyle=avatar.skin;ctx.fillRect(handX+2,y-22,4,18);
    }else if(action==="spin"){
      const angle=actionPhase*Math.PI*4;
      for(let i=0;i<4;i++){
        const px=x+Math.cos(angle+i*Math.PI/2)*25,py=y-12+Math.sin(angle+i*Math.PI/2)*16;
        ctx.fillStyle=i%2?"#5dcbff":"#ffd45c";ctx.fillRect(Math.round(px)-3,Math.round(py)-3,6,6);
      }
    }else if(action==="cheer"){
      ctx.fillStyle="#fff4b2";ctx.fillRect(x-20,y-17,7,7);ctx.fillRect(x+13,y-17,7,7);
    }
  }

  function drawSign(x,y,text,color="#ffd45c"){
    ctx.fillStyle="#3a2a26";ctx.fillRect(x-3,y,6,25);ctx.fillRect(x-32,y-20,64,24);
    ctx.fillStyle=color;ctx.fillRect(x-27,y-15,54,14);
    drawPixelText(ctx,text,x,y-8,{size:8,color:"#171127",align:"center",stroke:null});
  }

  function labelWidth(text,size=9){
    ctx.save();
    ctx.font=`900 ${size}px "Noto Sans Thai", Tahoma, sans-serif`;
    const width=Math.ceil(ctx.measureText(String(text||"")).width)+14;
    ctx.restore();
    return Math.max(36,Math.min(190,width));
  }

  function drawNameplate(text,x,y,{accent="#5dcbff",self=false,occupied=[]}={}){
    const size=self?10:9;
    const width=labelWidth(text,size);
    let top=y-8;
    let rect={x:x-width/2,y:top,w:width,h:17};
    for(let attempt=0;attempt<5&&occupied.some(item=>rect.x<item.x+item.w&&rect.x+rect.w>item.x&&rect.y<item.y+item.h&&rect.y+rect.h>item.y);attempt++){
      top-=18;
      rect={...rect,y:top};
    }
    occupied.push(rect);
    ctx.fillStyle=self?"#fff4b2":"rgba(5,11,25,.9)";
    ctx.fillRect(rect.x-2,rect.y-2,rect.w+4,rect.h+4);
    ctx.fillStyle=self?"#07101f":accent;
    ctx.fillRect(rect.x,rect.y,rect.w,rect.h);
    if(!self){ctx.fillStyle="rgba(5,11,25,.88)";ctx.fillRect(rect.x+3,rect.y+3,rect.w-6,rect.h-6);}
    if(self){
      ctx.fillStyle=accent;
      ctx.fillRect(x-3,rect.y-9,6,6);
      ctx.fillStyle="#fff4b2";
      ctx.fillRect(x-1,rect.y-7,2,2);
    }
    drawPixelText(ctx,text,x,rect.y+rect.h/2,{size,color:self?"#fff4b2":"#f8f5df",align:"center",stroke:self?"#07101f":"#07101f"});
  }

  function drawChatBubble(message,character,{self=false}={}){
    const text=message.text.length>28?`${message.text.slice(0,27)}…`:message.text;
    const width=Math.min(220,labelWidth(text,10)+10);
    const x=Math.round(character.x),y=Math.round(character.y-(self?(Number(character.jumpHeight)||0):0)-82);
    ctx.fillStyle="#03050d";ctx.fillRect(x-width/2-3,y-3,width+6,25);
    ctx.fillStyle=self?"#fff4b2":"#f8f5df";ctx.fillRect(x-width/2,y,width,19);
    ctx.fillStyle=self?"#fff4b2":"#f8f5df";ctx.fillRect(x-4,y+18,8,7);
    drawPixelText(ctx,text,x,y+10,{size:10,color:"#07101f",align:"center",stroke:null});
  }

  function drawChatBubbles(){
    const messages=nearbyChatMessages();
    remoteCharacters.forEach(remote=>{
      const message=[...messages].reverse().find(item=>!item.self&&item.uid===remote.uid);
      if(message) drawChatBubble(message,remote);
    });
    const selfMessage=[...messages].reverse().find(message=>message.self);
    if(selfMessage) drawChatBubble(selfMessage,player,{self:true});
  }

  function drawWorldLabels(){
    const scene=currentScene();
    scene.buildings.forEach(building=>{
      if(building.name) drawPixelText(ctx,building.name,building.x+building.w/2,building.y+54,{size:11,color:"#fff6d2",align:"center",stroke:"#272039"});
    });
    scene.portals.forEach(portal=>{
      if(isExploredAt(portal.x,portal.y)) drawPoiBadge(portal.module.icon,portal.x,portal.y-51,DISTRICTS[portal.district].color);
      if(distance(player,portal)<125) drawPixelText(ctx,portal.module.title,portal.x,portal.y+43,{size:11,color:"#fff6d2",align:"center"});
    });
    scene.gates.forEach(gate=>{
      if(isExploredAt(gate.x,gate.y)) drawPoiBadge("↔",gate.x,gate.y-58,gate.color);
      if(distance(player,gate)<140) drawPixelText(ctx,gate.name,gate.x,gate.y+45,{size:10,color:"#fff6d2",align:"center"});
    });
    const occupied=[];
    scene.npcs.forEach(npc=>{
      if(distance(player,npc)<150) drawNameplate(npc.name,npc.x,npc.y-56,{accent:npc.color,occupied});
    });
    remoteCharacters.forEach(remote=>{
      const profile=normalizedProfile(remote.profile);
      drawNameplate(profile.nickname,remote.x,remote.y-48,{accent:profile.avatar.accent,occupied});
    });
    const profile=normalizedProfile(playerProfile);
    drawNameplate(`คุณ • ${profile.nickname}`,player.x,player.y-50-player.jumpHeight,{accent:profile.avatar.accent,self:true,occupied});
  }

  function drawFog(){
    const codec=MAP_REGISTRY.exploration(activeMap.id);
    const explored=currentExploration();
    const startColumn=Math.max(0,Math.floor(camera.x/codec.cellSize)-1);
    const startRow=Math.max(0,Math.floor(camera.y/codec.cellSize)-1);
    const endColumn=Math.min(codec.columns-1,Math.ceil((camera.x+VIEW_WIDTH)/codec.cellSize)+1);
    const endRow=Math.min(codec.rows-1,Math.ceil((camera.y+VIEW_HEIGHT)/codec.cellSize)+1);
    for(let row=startRow;row<=endRow;row++) for(let column=startColumn;column<=endColumn;column++){
      const index=row*codec.columns+column;
      const x=column*codec.cellSize,y=row*codec.cellSize;
      const center={x:x+codec.cellSize/2,y:y+codec.cellSize/2};
      const inSight=distance(player,center)<=VISION_RADIUS+codec.cellSize*.58;
      if(inSight) continue;
      ctx.fillStyle=explored.has(index)?"rgba(3,8,20,.68)":"rgba(1,3,10,.97)";
      ctx.fillRect(x,y,codec.cellSize+1,codec.cellSize+1);
      if(!explored.has(index)&&((row+column)%2===0)){
        ctx.fillStyle="rgba(12,21,43,.38)";ctx.fillRect(x+4,y+4,codec.cellSize-8,codec.cellSize-8);
      }
    }
  }

  function drawWorld(){
    const scene=currentScene();
    ctx.save();
    ctx.translate(-Math.round(camera.x),-Math.round(camera.y));
    drawGround();
    drawDecor();
    if(tapTarget){
      const pulse=Math.floor(elapsed*6)%2?3:0;
      ctx.fillStyle="#081027";ctx.fillRect(tapTarget.x-12-pulse,tapTarget.y-3-pulse,24+pulse*2,6+pulse*2);ctx.fillRect(tapTarget.x-3-pulse,tapTarget.y-12-pulse,6+pulse*2,24+pulse*2);
      ctx.fillStyle="#ffd45c";ctx.fillRect(tapTarget.x-7,tapTarget.y-2,14,4);ctx.fillRect(tapTarget.x-2,tapTarget.y-7,4,14);
    }
    drawSign(1024,1030,scene.sign,scene.color);
    if(activeMap.id===ACADEMY_MAP_ID) DISTRICTS.forEach(district => drawSign(district.hub.x,district.hub.y+76,district.short,district.color));
    if(activeMap.id===TRAINING_MAP_ID) drawSign(1536,1010,"ทางลัด","#a88cff");
    scene.buildings.forEach(drawBuilding);
    const sprites = [
      ...scene.trees.map(tree => ({y:tree.y,draw:()=>drawTree(tree)})),
      ...scene.barriers.map(barrier=>({y:barrier.y+barrier.h,draw:()=>drawBarrier(barrier)})),
      ...scene.portals.map(portal => ({y:portal.y+25,draw:()=>drawPortal(portal)})),
      ...scene.gates.map(gate=>({y:gate.y+26,draw:()=>drawGate(gate)})),
      ...scene.npcs.map(npc => ({y:npc.y,draw:()=>drawCharacter(npc,false)})),
      ...[...remoteCharacters.values()].map(remote=>({y:remote.y,draw:()=>drawAdventurer(remote,remote.profile,true)})),
      {y:player.y,draw:()=>drawAdventurer(player,playerProfile,false)}
    ].sort((a,b)=>a.y-b.y);
    sprites.forEach(sprite=>sprite.draw());
    drawWorldLabels();
    drawFog();
    drawChatBubbles();
    ctx.restore();
  }

  function drawMiniAvatar(character,profile,{self=false}={}){
    const normalized=normalizedProfile(profile);
    const sx=miniCanvas.width/WORLD_WIDTH,sy=miniCanvas.height/WORLD_HEIGHT;
    const x=Math.round(character.x*sx),y=Math.round(character.y*sy);
    const size=self?9:7;
    mini.fillStyle=self?"#fff4b2":"#07101f";
    mini.fillRect(x-Math.floor(size/2),y-Math.floor(size/2),size,size);
    mini.fillStyle=normalized.avatar.skin;
    mini.fillRect(x-2,y-3,4,3);
    mini.fillStyle=normalized.avatar.accent;
    mini.fillRect(x-2,y,4,3);
    if(self){mini.fillStyle="#5dcbff";mini.fillRect(x-1,y-6,2,2);}
  }

  function drawMiniMap(){
    if(!mini) return;
    const scene=currentScene();
    const codec=MAP_REGISTRY.exploration(activeMap.id);
    const sx=miniCanvas.width/WORLD_WIDTH,sy=miniCanvas.height/WORLD_HEIGHT;
    mini.fillStyle="#050814";mini.fillRect(0,0,miniCanvas.width,miniCanvas.height);
    currentExploration().forEach(index=>{
      const column=index%codec.columns,row=Math.floor(index/codec.columns);
      const wx=column*codec.cellSize,wy=row*codec.cellSize;
      const cx=wx+codec.cellSize/2,cy=wy+codec.cellSize/2;
      const district=districtAt(cx,cy);
      if(isWater(cx,cy)) mini.fillStyle="#367f98";
      else if(isRoad(cx,cy)) mini.fillStyle=scene.road[0];
      else mini.fillStyle=scene.palette[DISTRICTS.indexOf(district)];
      mini.fillRect(Math.floor(wx*sx),Math.floor(wy*sy),Math.ceil(codec.cellSize*sx)+1,Math.ceil(codec.cellSize*sy)+1);
    });
    scene.portals.forEach(portal=>{
      if(!isExploredAt(portal.x,portal.y)) return;
      const stats=statsFor(portal),x=Math.round(portal.x*sx),y=Math.round(portal.y*sy);
      mini.fillStyle="#050713";mini.fillRect(x-3,y-3,7,7);
      mini.fillStyle=stats.done>=stats.total?"#58e7b2":DISTRICTS[portal.district].color;mini.fillRect(x-2,y-2,5,5);
      mini.fillStyle="#fff";mini.fillRect(x,y,1,1);
    });
    scene.gates.forEach(gate=>{
      if(!isExploredAt(gate.x,gate.y)) return;
      const x=Math.round(gate.x*sx),y=Math.round(gate.y*sy);
      mini.fillStyle="#050713";mini.fillRect(x-4,y-4,9,9);
      mini.fillStyle=gate.color;mini.fillRect(x-2,y-3,5,7);mini.fillRect(x-3,y-2,7,5);
    });
    scene.npcs.forEach(npc=>{
      if(!isExploredAt(npc.x,npc.y)) return;
      mini.fillStyle=npc.color;mini.fillRect(Math.round(npc.x*sx)-1,Math.round(npc.y*sy)-1,3,3);
    });
    remoteCharacters.forEach(remote=>{if(isExploredAt(remote.x,remote.y))drawMiniAvatar(remote,remote.profile);});
    drawMiniAvatar(player,playerProfile,{self:true});
    mini.strokeStyle="#10101e";mini.lineWidth=3;mini.strokeRect(1.5,1.5,miniCanvas.width-3,miniCanvas.height-3);
    miniCanvas.setAttribute("aria-label",`มินิแมป ${activeMap.title} สำรวจแล้ว ${explorationPercent()} เปอร์เซ็นต์ ผู้เล่นของคุณมีกรอบสีทอง`);
  }

  function updateHud(){
    const locationName=locationNameAt(activeMap.id,player.x,player.y);
    if(worldTitle) worldTitle.textContent=activeMap.title;
    if(locationName!==previousDistrict){
      previousDistrict=locationName;
      if(districtLabel) districtLabel.textContent=locationName;
      options.onMusicScene?.(musicSceneAt(activeMap.id,player.x,player.y),locationName);
    }
    const totals=portals.reduce((result,portal)=>{const stats=statsFor(portal);result.done+=Math.min(stats.done,stats.total);result.total+=stats.total;return result;},{done:0,total:0});
    const explored=explorationPercent();
    if(progressText) progressText.textContent=`${activeMap.short} ${explored}% • คลัง ${totals.done}/${totals.total}`;
    if(progressBar) progressBar.style.width=`${explored}%`;
    const scenePortals=currentScene().portals;
    const unstarted=scenePortals.find(portal=>statsFor(portal).done===0);
    if(objective){
      if(activeMap.id===TRAINING_MAP_ID) objective.textContent="ภารกิจ: กระโดดข้ามรั้วและค้นหาประตูกลับโลกหลัก";
      else if(unstarted) objective.textContent=isExploredAt(unstarted.x,unstarted.y)?`ด่านที่พบแล้ว: ${unstarted.module.icon} ${unstarted.module.title}`:"สำรวจหมอกเพื่อค้นหาด่านข้อสอบที่ยังไม่เคยทำ";
      else if(scenePortals.length) objective.textContent="เยี่ยมมาก! คุณเคยสำรวจครบทุกประตูในโลกนี้แล้ว กลับไปเก็บความแม่นให้ถึง 80%";
      else objective.textContent="สำรวจโลกนี้และค้นหาประตูเดินทางกลับศูนย์กลาง";
    }
  }

  function update(delta){
    remoteCharacters.forEach(remote=>{
      const gap=Math.hypot(remote.targetX-remote.x,remote.targetY-remote.y);
      const ease=gap>320?1:1-Math.pow(.006,delta);
      remote.x+=(remote.targetX-remote.x)*ease;
      remote.y+=(remote.targetY-remote.y)*ease;
      if(remote.moving) remote.step+=delta*8;
    });
    player.jumpCooldown=Math.max(0,player.jumpCooldown-delta);
    if(player.jumping){
      player.jumpElapsed+=delta;
      const progress=Math.min(1,player.jumpElapsed/JUMP_DURATION);
      player.jumpHeight=Math.sin(progress*Math.PI)*25;
      if(progress>=1){player.jumping=false;player.jumpElapsed=0;player.jumpHeight=0;}
    }
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
    revealAroundPlayer();
    const targetX=clamp(player.x-VIEW_WIDTH/2,0,WORLD_WIDTH-VIEW_WIDTH);
    const targetY=clamp(player.y-VIEW_HEIGHT/2,0,WORLD_HEIGHT-VIEW_HEIGHT);
    const ease=1-Math.pow(.0005,delta);
    camera.x+=(targetX-camera.x)*ease;
    camera.y+=(targetY-camera.y)*ease;
    updateNearest();
    if(locationNameAt(activeMap.id,player.x,player.y)!==previousDistrict) updateHud();
  }

  function reportPlayerState(time,force=false){
    if(typeof options.onPlayerState!=="function") return;
    const district=locationNameAt(activeMap.id,player.x,player.y);
    const action=Date.now()-player.actionAt<1400?player.action:"";
    const snapshot={mapId:activeMap.id,zone:activeMap.id===ACADEMY_MAP_ID?"plaza":activeMap.id,x:Math.round(player.x),y:Math.round(player.y),direction:player.direction,moving:player.moving,district,action,actionAt:action?player.actionAt:0};
    const fingerprint=`${snapshot.mapId}|${snapshot.zone}|${snapshot.x}|${snapshot.y}|${snapshot.direction}|${Number(snapshot.moving)}|${snapshot.district}|${snapshot.action}|${snapshot.actionAt}`;
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
    if(time-lastChatRender>500){lastChatRender=time;renderProximityChat();}
    drawWorld();
    drawMiniMap();
    if(time-lastSave>2500){savePosition(player,explorationSets);explorationDirty=false;lastSave=time;}
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
  const jumpButton=root.querySelector("[data-jump]");
  const jumpClick=event=>{event.preventDefault();canvas.focus({preventScroll:true});startJump();};
  const emoteButton=root.querySelector("[data-emote]");
  const emoteClick=event=>{event.preventDefault();canvas.focus({preventScroll:true});startAction();};
  const onBlur=()=>keys.clear();
  const applyCloudPosition=event=>{
    const saved=event.detail?.adventure;
    if(!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return;
    const position=MAP_REGISTRY.normalizePosition(saved,{mapId:activeMap.id,...activeMap.spawn,direction:"down"});
    activeMap=MAP_REGISTRY.get(position.mapId);
    player.mapId=activeMap.id;
    player.version=position.version;
    player.x=position.x;
    player.y=position.y;
    player.direction=position.direction;
    if(saved.exploration&&typeof saved.exploration==="object") MAP_REGISTRY.ids.forEach(mapId=>{
      const cloudSet=MAP_REGISTRY.exploration(mapId).decode(saved.exploration[mapId]);
      if(cloudSet.size) explorationSets.set(mapId,cloudSet);
    });
    lastExplorationCell=-1;
    revealAroundPlayer(true);
    camera.x=clamp(player.x-VIEW_WIDTH/2,0,WORLD_WIDTH-VIEW_WIDTH);
    camera.y=clamp(player.y-VIEW_HEIGHT/2,0,WORLD_HEIGHT-VIEW_HEIGHT);
    keys.clear();
    tapTarget=null;
    updateNearest();
    updateHud();
  };
  interactButton?.addEventListener("click",interactClick);
  jumpButton?.addEventListener("click",jumpClick);
  emoteButton?.addEventListener("click",emoteClick);
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
    savePosition(player,explorationSets,{immediate:true});
    options.onLeave?.();
    keys.clear();
    window.removeEventListener("keydown",onKeyDown);
    window.removeEventListener("keyup",onKeyUp);
    window.removeEventListener("blur",onBlur);
    window.removeEventListener("teacherquest:cloud-progress",applyCloudPosition);
    canvas.removeEventListener("pointerdown",setTapTarget);
    chatFeed?.removeEventListener("click",onChatFeedClick);
    mobileBindings.forEach(([element,event,handler])=>element.removeEventListener(event,handler));
    interactButton?.removeEventListener("click",interactClick);
    jumpButton?.removeEventListener("click",jumpClick);
    emoteButton?.removeEventListener("click",emoteClick);
    if(window.teacherQuestAdventureDebug?.destroy===destroy) delete window.teacherQuestAdventureDebug;
  }

  revealAroundPlayer(true);
  updateNearest();
  updateHud();
  setPlayerProfile(playerProfile);
  reportPlayerState(performance.now(),true);
  raf=requestAnimationFrame(frame);

  window.teacherQuestAdventureDebug={
    getState:()=>{
      const scene=currentScene();
      const codec=MAP_REGISTRY.exploration(activeMap.id);
      return {mapId:activeMap.id,mapTitle:activeMap.title,worldVersion:MAP_REGISTRY.version,mapIds:[...MAP_REGISTRY.ids],x:player.x,y:player.y,direction:player.direction,moving:player.moving,jumping:player.jumping,jumpHeight:player.jumpHeight,action:Date.now()-player.actionAt<1400?player.action:"",accessory:normalizedProfile(playerProfile).avatar.accessory,district:locationNameAt(activeMap.id,player.x,player.y),nearest:nearest?.module?.id||nearest?.id||null,remotePlayers:remoteCharacters.size,nearbyPlayers:[...remoteCharacters.values()].filter(remote=>distance(player,remote)<=CHAT_RADIUS).length,nearbyMessages:nearbyChatMessages().length,tapTarget:tapTarget?{...tapTarget}:null,fadedTrees:scene.trees.filter(tree=>treeOpacity(tree)<.99).length,playerLabel:`คุณ • ${normalizedProfile(playerProfile).nickname}`,visionRadius:VISION_RADIUS,chatRadius:CHAT_RADIUS,exploredCells:currentExploration().size,explorationTotal:codec.total,explorationPercent:explorationPercent(),discoveredPoi:[...scene.portals,...scene.gates,...scene.npcs].filter(item=>isExploredAt(item.x,item.y)).length,barrierCount:scene.barriers.length,portalCount:scene.portals.length,gateCount:scene.gates.length};
    },
    teleportToModule:id=>{const portal=portals.find(item=>item.module.id===id);if(!portal)return false;if(activeMap.id!==portal.mapId)switchMap(portal.mapId);player.x=portal.x;player.y=portal.y+54;player.direction="up";camera.x=clamp(player.x-VIEW_WIDTH/2,0,WORLD_WIDTH-VIEW_WIDTH);camera.y=clamp(player.y-VIEW_HEIGHT/2,0,WORLD_HEIGHT-VIEW_HEIGHT);lastExplorationCell=-1;revealAroundPlayer(true);updateNearest();updateHud();return true;},
    teleportToNpc:id=>{const npc=currentScene().npcs.find(item=>item.id===id);if(!npc)return false;player.x=npc.x;player.y=npc.y+48;player.direction="up";lastExplorationCell=-1;revealAroundPlayer(true);updateNearest();updateHud();return true;},
    teleportToTree:index=>{const trees=currentScene().trees;const tree=trees[Math.max(0,Math.min(trees.length-1,Number(index)||0))];if(!tree)return false;player.x=clamp(tree.x+28,40,WORLD_WIDTH-40);player.y=clamp(tree.y,64,WORLD_HEIGHT-32);camera.x=clamp(player.x-VIEW_WIDTH/2,0,WORLD_WIDTH-VIEW_WIDTH);camera.y=clamp(player.y-VIEW_HEIGHT/2,0,WORLD_HEIGHT-VIEW_HEIGHT);lastExplorationCell=-1;revealAroundPlayer(true);updateNearest();updateHud();return true;},
    teleportToGate:index=>{const gate=currentScene().gates[Math.max(0,Math.min(currentScene().gates.length-1,Number(index)||0))];if(!gate)return false;player.x=gate.x;player.y=gate.y+52;player.direction="up";camera.x=clamp(player.x-VIEW_WIDTH/2,0,WORLD_WIDTH-VIEW_WIDTH);camera.y=clamp(player.y-VIEW_HEIGHT/2,0,WORLD_HEIGHT-VIEW_HEIGHT);lastExplorationCell=-1;revealAroundPlayer(true);updateNearest();updateHud();return true;},
    teleportToBarrier:index=>{const barrier=currentScene().barriers[Math.max(0,Math.min(currentScene().barriers.length-1,Number(index)||0))];if(!barrier)return false;player.x=barrier.x+barrier.w/2;player.y=barrier.y+barrier.h+22;player.direction="up";camera.x=clamp(player.x-VIEW_WIDTH/2,0,WORLD_WIDTH-VIEW_WIDTH);camera.y=clamp(player.y-VIEW_HEIGHT/2,0,WORLD_HEIGHT-VIEW_HEIGHT);lastExplorationCell=-1;revealAroundPlayer(true);updateNearest();updateHud();return true;},
    moveBy:(dx,dy)=>{const before={x:player.x,y:player.y};tryMove(Number(dx)||0,Number(dy)||0);revealAroundPlayer();return {x:player.x-before.x,y:player.y-before.y};},
    switchMap,
    startJump,
    startAction,
    interact,
    setRemotePlayers,
    setZoneMessages,
    setPlayerProfile,
    resetPosition,
    revealCurrentMap,
    destroy
  };

  return {destroy,getState:window.teacherQuestAdventureDebug.getState,resetPosition,revealCurrentMap,setRemotePlayers,setZoneMessages,setPlayerProfile};
}

window.createTeacherQuestAdventure=createTeacherQuestAdventure;
})();
