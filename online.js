(()=>{
"use strict";

const SDK_VERSION = "12.16.0";
const PROFILE_STORAGE = "teacherQuestOnlineProfile_v1";
const GAME_STORAGE = "teacherQuest2569_v3";
const ADVENTURE_STORAGE = "teacherQuestAdventure_v1";
const PROGRESS_VERSION = 1;
const PROGRESS_SAVE_DELAY = 900;
const ADVENTURE_SAVE_INTERVAL = 15000;
const CONFIG = window.TEACHER_QUEST_FIREBASE_CONFIG;
const POSITION_INTERVAL = 650;
const PRESENCE_HEARTBEAT = 20000;
const PLAYER_STALE_AFTER = 45000;
const MAX_ZONE_PLAYERS = 40;
const MAX_ZONE_MESSAGES = 40;
const CHAT_MAX_LENGTH = 80;
const CHAT_STALE_AFTER = 15000;
const CHAT_SEND_COOLDOWN = 1500;
const VOICE_RADIUS = 360;
const VOICE_MAX_PEERS = 4;
const VOICE_SIGNAL_STALE_AFTER = 60000;
const VOICE_SDP_MAX_LENGTH = 12000;
const VOICE_MUTED_STORAGE = "teacherQuestMutedVoice_v1";
const RAID_STORAGE = "teacherQuestRaidRoom_v1";
const RAID_CODE_LENGTH = 6;
const RAID_MAX_PLAYERS = 8;
const RAID_BOSS_HP = 480;
const RAID_HEARTBEAT = 25000;
const FIREBASE_RULES_REVISION = "2026-07-22.1";
const RAID_RULES_REVISION = FIREBASE_RULES_REVISION;
const RAID_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RAID_EMOTES = Object.freeze(["","hi","go","help","wow","gg"]);
const RAID_MODULES = Object.freeze(["all","learn","curriculum","measure","research","psych","media","classroom","profession","eduact","child","disability","civil","ksp","voclaw","culture","english","policy","student","admin","quality","current"]);
const connectionId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/[^a-zA-Z0-9_-]/g,"");
const listeners = new Set();
const zoneUnsubscribers = [];
const remotePlayers = new Map();
const zoneMessages = new Map();
const voicePeers = new Map();
const voiceSignalRefs = new Map();

const AVATAR_OPTIONS = Object.freeze({
  skin:Object.freeze(["#f4c7a1","#e8b989","#c98f65","#8b5b3f"]),
  hair:Object.freeze(["#24182f","#4a2d28","#815226","#d9b65a","#5b4b85"]),
  shirt:Object.freeze(["#3d68af","#1e8a72","#9b4e86","#b86535","#5c55a7"]),
  accent:Object.freeze(["#ffd45c","#58e7b2","#5dcbff","#ff72b4","#a88cff"]),
  style:Object.freeze(["short","spike","long","cap"]),
  accessory:Object.freeze(["none","cape","book","crown"])
});
const DEFAULT_AVATAR = Object.freeze({skin:AVATAR_OPTIONS.skin[1],hair:AVATAR_OPTIONS.hair[0],shirt:AVATAR_OPTIONS.shirt[0],accent:AVATAR_OPTIONS.accent[0],style:"short",accessory:"none"});
const ZONE_KEYS = Object.freeze({
  "ลานสถาบันครูเควสต์":"plaza",
  "หมู่บ้านครูนักคิด":"plaza",
  "นครนวัตกรรม":"plaza",
  "ป่าคัมภีร์กฎหมาย":"plaza",
  "ป้อมอนาคตการศึกษา":"plaza",
  "academy-plaza":"plaza",
  "ป่าฝึกเอาตัวรอด":"training-grove",
  "นครคัมภีร์กฎหมาย":"law-archive",
  "มหานครอนาคตการศึกษา":"future-campus"
});
const configured = Boolean(CONFIG?.apiKey && CONFIG?.authDomain && CONFIG?.databaseURL && CONFIG?.projectId && CONFIG?.appId);
const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (value,min,max) => Math.max(min,Math.min(max,Number(value)||0));
const validChoice = (group,value,fallback) => AVATAR_OPTIONS[group].includes(value) ? value : fallback;
const cleanNickname = value => String(value || "").normalize("NFKC").replace(/[<>\u0000-\u001f\u007f]/g,"").replace(/\s+/g," ").trim().slice(0,20);
const cleanChatText = value => String(value || "").normalize("NFKC").replace(/[<>\u0000-\u001f\u007f]/g,"").replace(/\s+/g," ").trim().slice(0,CHAT_MAX_LENGTH);
const randomNickname = () => `นักผจญภัย ${String(Math.floor(1000+Math.random()*9000))}`;

function normalizeAvatar(value={}){
  return {
    skin:validChoice("skin",value.skin,DEFAULT_AVATAR.skin),
    hair:validChoice("hair",value.hair,DEFAULT_AVATAR.hair),
    shirt:validChoice("shirt",value.shirt,DEFAULT_AVATAR.shirt),
    accent:validChoice("accent",value.accent,DEFAULT_AVATAR.accent),
    style:validChoice("style",value.style,DEFAULT_AVATAR.style),
    accessory:validChoice("accessory",value.accessory,DEFAULT_AVATAR.accessory)
  };
}

function normalizeProfile(value={}){
  return {
    nickname:cleanNickname(value.nickname) || randomNickname(),
    avatar:normalizeAvatar(value.avatar)
  };
}

function normalizeRaidCode(value){
  return String(value || "").toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g,"").slice(0,RAID_CODE_LENGTH);
}

function validRaidModule(value){ return RAID_MODULES.includes(value) ? value : "all"; }

function raidMember(value={},uid=""){
  return {
    uid:String(uid || ""),
    nickname:cleanNickname(value.nickname) || "นักผจญภัย",
    avatar:normalizeAvatar(value.avatar),
    score:clamp(value.score,0,20000),
    correct:clamp(value.correct,0,2000),
    joinedAt:Number(value.joinedAt)||0,
    lastSeen:Number(value.lastSeen)||0,
    ready:Boolean(value.ready),
    emote:RAID_EMOTES.includes(value.emote) ? value.emote : "",
    emoteAt:Number(value.emoteAt)||0
  };
}

function normalizeRaid(value,code=raidCode){
  if(!value || typeof value!=="object" || !value.meta) return null;
  const meta=value.meta || {};
  const members=Object.entries(value.members || {}).map(([uid,member])=>raidMember(member,uid))
    .sort((a,b)=>b.score-a.score || a.joinedAt-b.joinedAt || a.nickname.localeCompare(b.nickname,"th"));
  return {
    code:normalizeRaidCode(code),
    meta:{
      hostUid:String(meta.hostUid||""),
      status:meta.status==="active" ? "active" : "lobby",
      bossHp:clamp(meta.bossHp,0,Number(meta.bossMax)||RAID_BOSS_HP),
      bossMax:clamp(meta.bossMax,1,1200),
      moduleId:validRaidModule(meta.moduleId),
      questionSeed:Math.max(1,Math.floor(Number(meta.questionSeed)||1)),
      createdAt:Number(meta.createdAt)||0,
      startedAt:Number(meta.startedAt)||0
    },
    members,
    memberCount:members.length,
    isHost:Boolean(state.user?.uid && meta.hostUid===state.user.uid)
  };
}

function randomRaidCode(){
  const bytes=new Uint8Array(RAID_CODE_LENGTH);
  globalThis.crypto?.getRandomValues?.(bytes);
  return [...bytes].map((value,index)=>RAID_CODE_ALPHABET[(value || Math.floor(Math.random()*256)+index)%RAID_CODE_ALPHABET.length]).join("");
}

function raidMemberPayload({joinedAt=null,ready=false}={}){
  const serverNow=databaseModule?.serverTimestamp?.() || Date.now();
  return {
    nickname:state.profile.nickname,
    avatar:state.profile.avatar,
    score:0,
    correct:0,
    joinedAt:joinedAt ?? serverNow,
    lastSeen:serverNow,
    ready:Boolean(ready),
    emote:"",
    emoteAt:0
  };
}

function raidRoomPayload(moduleId="all"){
  const createdAt=databaseModule.serverTimestamp();
  return {
    meta:{
      hostUid:state.user.uid,status:"lobby",bossHp:RAID_BOSS_HP,bossMax:RAID_BOSS_HP,
      moduleId:validRaidModule(moduleId),questionSeed:Math.floor(1+Math.random()*2147483646),createdAt,startedAt:0
    },
    members:{[state.user.uid]:raidMemberPayload({joinedAt:createdAt,ready:true})}
  };
}

function requireRaidOnline(){
  if(!database || !databaseModule || !state.user || state.user.isAnonymous || state.phase!=="online"){
    throw new Error("กรุณาเข้าสู่ระบบ Google และรอให้สถานะออนไลน์พร้อมก่อนเข้า Raid");
  }
}

function loadLocalProfile(){
  try{ return normalizeProfile(JSON.parse(localStorage.getItem(PROFILE_STORAGE) || "{}")); }
  catch(error){ console.warn("Could not load online profile",error); return normalizeProfile(); }
}

function saveLocalProfile(profile){
  try{ localStorage.setItem(PROFILE_STORAGE,JSON.stringify(normalizeProfile(profile))); }
  catch(error){ console.warn("Could not save online profile",error); }
}

function readStoredObject(key){
  try{
    const raw=localStorage.getItem(key);
    if(!raw) return null;
    const value=JSON.parse(raw);
    return value && typeof value==="object" && !Array.isArray(value) ? value : null;
  }catch(error){
    console.warn(`Could not read ${key}`,error);
    return null;
  }
}

function safeJson(value,fallback="{}"){
  try{ return JSON.stringify(value && typeof value==="object" ? value : JSON.parse(fallback)); }
  catch{ return fallback; }
}

function buildProgressBundle(updatedAt=Date.now()){
  const game=readStoredObject(GAME_STORAGE) || {};
  const adventure=readStoredObject(ADVENTURE_STORAGE) || {};
  return {
    version:PROGRESS_VERSION,
    game:safeJson(game),
    adventure:safeJson(adventure),
    updatedAt:Number(updatedAt)||Date.now()
  };
}

function applyProgressBundle(bundle){
  if(!bundle || bundle.version!==PROGRESS_VERSION || typeof bundle.game!=="string") return false;
  try{
    const game=JSON.parse(bundle.game);
    const adventure=typeof bundle.adventure==="string" ? JSON.parse(bundle.adventure) : {};
    if(!game || typeof game!=="object" || Array.isArray(game)) return false;
    const updatedAt=Number(bundle.updatedAt)||Date.now();
    game.localUpdatedAt=updatedAt;
    localStorage.setItem(GAME_STORAGE,JSON.stringify(game));
    if(adventure && typeof adventure==="object" && !Array.isArray(adventure) && Number.isFinite(adventure.x) && Number.isFinite(adventure.y)){
      localStorage.setItem(ADVENTURE_STORAGE,JSON.stringify(adventure));
    }
    window.dispatchEvent(new CustomEvent("teacherquest:cloud-progress",{detail:{updatedAt,adventure}}));
    window.dispatchEvent(new CustomEvent("teacherquest:local-state",{detail:{updatedAt,source:"cloud"}}));
    return true;
  }catch(error){
    console.warn("Could not apply cloud progress",error);
    return false;
  }
}

const state = {
  configured,
  phase:configured ? "connecting" : "setup",
  connected:false,
  user:null,
  profile:loadLocalProfile(),
  onlineCount:0,
  totalPlayers:0,
  cloudSync:"idle",
  cloudUpdatedAt:0,
  isAdmin:false,
  zone:null,
  zonePlayers:[],
  zoneMessages:[],
  presence:{zone:null,read:"idle",write:"idle",error:"",lastSyncedAt:0},
  voice:{
    supported:Boolean(globalThis.RTCPeerConnection && navigator.mediaDevices?.getUserMedia),
    enabled:false,permission:"idle",talking:false,nearby:0,peerCount:0,peers:[],error:""
  },
  raid:null,
  error:""
};

let appModule=null;
let authModule=null;
let databaseModule=null;
let auth=null;
let database=null;
let authUnsubscribe=null;
let connectedUnsubscribe=null;
let onlineUnsubscribe=null;
let totalUnsubscribe=null;
let onlineConnectionRef=null;
let onlineConnectionUid=null;
let currentPresenceRef=null;
let currentChatRef=null;
let voiceStream=null;
let voiceInboxUnsubscribe=null;
let voiceInboxZone=null;
let voiceMutedUids=new Set();
let voiceSignalFingerprints=new Map();
let currentZone=null;
let pendingWorldState=null;
let lastPresenceAt=0;
let lastPresenceFingerprint="";
let presenceTimer=null;
let cleanupTimer=null;
let lastChatAt=0;
let signingIn=false;
let progressRef=null;
let progressSaveTimer=null;
let progressSaving=false;
let progressQueued=false;
let lastAdventureCloudSave=0;
let attachPromise=null;
let attachingUid=null;
let attachedUid=null;
let raidCode="";
let raidUnsubscribe=null;
let raidMemberRef=null;
let raidRoomDisconnect=null;
let raidMemberDisconnect=null;
let raidHeartbeatTimer=null;

try{voiceMutedUids=new Set(JSON.parse(localStorage.getItem(VOICE_MUTED_STORAGE)||"[]").map(String).slice(0,100));}catch(error){console.warn(error);}

function publicState(){
  return clone({...state,zonePlayers:[...state.zonePlayers],zoneMessages:[...state.zoneMessages]});
}

function emit(){
  const snapshot=publicState();
  listeners.forEach(listener=>{try{listener(snapshot);}catch(error){console.error(error);}});
  window.dispatchEvent(new CustomEvent("teacherquest:online",{detail:snapshot}));
}

function setPhase(phase,error=""){
  state.phase=phase;
  state.error=error;
  state.connected=phase==="online";
  emit();
}

function setPresenceHealth(part,status,error=""){
  if(!state.presence || typeof state.presence!=="object") state.presence={zone:currentZone,read:"idle",write:"idle",error:"",lastSyncedAt:0};
  if(part==="read" || part==="write") state.presence[part]=status;
  state.presence.zone=currentZone;
  if(error) state.presence.error=error;
  else if(state.presence.read!=="error" && state.presence.write!=="error") state.presence.error="";
  if(status==="ready") state.presence.lastSyncedAt=Date.now();
  emit();
}

function resetPresenceHealth(zone=null,status="idle"){
  state.presence={zone,read:status,write:status,error:"",lastSyncedAt:0};
  emit();
}

function avatarMarkup(profile=state.profile,className=""){
  const avatar=normalizeAvatar(profile?.avatar || profile);
  return `<span class="pixel-avatar ${String(className).replace(/[^a-zA-Z0-9 _-]/g,"")}" data-hair-style="${avatar.style}" data-accessory="${avatar.accessory}" style="--avatar-skin:${avatar.skin};--avatar-hair:${avatar.hair};--avatar-shirt:${avatar.shirt};--avatar-accent:${avatar.accent}" aria-hidden="true"><i class="pixel-avatar-hair"></i><i class="pixel-avatar-face"></i><i class="pixel-avatar-body"></i><i class="pixel-avatar-accent"></i><i class="pixel-avatar-feet"></i></span>`;
}

function friendlyError(error,context=""){
  const rawError=`${String(error?.code || "")} ${String(error?.message || "")}`;
  if(/permission[_\s-]*denied/i.test(rawError)){
    if(context==="world-read" || context==="world-write"){
      return `Firebase ปฏิเสธ World Presence (${context==="world-read"?"อ่านผู้เล่นในพื้นที่":"ส่งตำแหน่งตัวละคร"}) กรุณา Publish Realtime Database Rules รุ่น ${FIREBASE_RULES_REVISION}`;
    }
    if(context==="raid-create"){
      return "Firebase ปฏิเสธการสร้างห้อง Raid โดยเฉพาะ กฎออนไลน์ส่วนอื่นอาจยังทำงานได้ กรุณาใช้ Rules ชุดล่าสุดแล้วกด Publish จากนั้นเปิด ‘บัญชีและตัวละคร’ > ‘ตรวจสิทธิ์ Firebase’";
    }
    return "Firebase ปฏิเสธสิทธิ์ในการทำรายการนี้: รีโหลดเว็บและเข้าสู่ระบบ Google ใหม่ หากเพิ่งแก้ Realtime Database → Rules ให้ตรวจว่ากด Publish แล้ว";
  }
  const map={
    "auth/operation-not-allowed":"ยังไม่ได้เปิด Anonymous หรือ Google Sign-in ใน Firebase",
    "auth/unauthorized-domain":"ยังไม่ได้เพิ่มโดเมนเว็บไซต์ใน Authorized domains",
    "auth/popup-blocked":"เบราว์เซอร์บล็อกหน้าต่าง Google กรุณาอนุญาตป๊อปอัปแล้วลองใหม่",
    "auth/popup-closed-by-user":"ปิดหน้าต่าง Google ก่อนเข้าสู่ระบบสำเร็จ",
    "auth/network-request-failed":"อินเทอร์เน็ตขัดข้อง กรุณาลองใหม่"
  };
  return map[error?.code] || map[error?.message] || error?.message || "เชื่อมระบบออนไลน์ไม่สำเร็จ";
}

function zoneKeyFor(value){
  if(ZONE_KEYS[value]) return ZONE_KEYS[value];
  const cleaned=String(value||"").toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,30);
  return cleaned || "plaza";
}

function direction(value){ return ["up","down","left","right"].includes(value) ? value : "down"; }

function sanitizeWorldState(value={}){
  const action=["wave","cheer","spin"].includes(value.action)?value.action:"";
  return {
    zone:zoneKeyFor(value.zone || value.district),
    zoneLabel:String(value.district || value.zone || "โลกครูเควสต์").slice(0,40),
    x:Math.round(clamp(value.x,0,2048)),
    y:Math.round(clamp(value.y,0,1536)),
    direction:direction(value.direction),
    moving:Boolean(value.moving),
    action,
    actionAt:action?Math.round(clamp(value.actionAt,Date.now()-120000,Date.now()+120000)):0
  };
}

function voiceDistance(player={}){
  if(!pendingWorldState) return Infinity;
  const local=sanitizeWorldState(pendingWorldState);
  return Math.hypot(local.x-clamp(player.x,0,2048),local.y-clamp(player.y,0,1536));
}

function saveVoiceMuted(){
  try{localStorage.setItem(VOICE_MUTED_STORAGE,JSON.stringify([...voiceMutedUids].slice(0,100)));}catch(error){console.warn(error);}
}

function syncVoiceState({emitState=true}={}){
  const candidates=state.zonePlayers.filter(player=>player.voice && voiceDistance(player)<=VOICE_RADIUS).slice(0,VOICE_MAX_PEERS);
  state.voice.nearby=candidates.length;
  state.voice.peers=candidates.map(player=>{
    const peer=voicePeers.get(player.uid);
    return {uid:player.uid,nickname:player.nickname,distance:Math.round(voiceDistance(player)),connected:Boolean(peer?.connected),muted:voiceMutedUids.has(player.uid)};
  });
  state.voice.peerCount=state.voice.peers.filter(peer=>peer.connected).length;
  voicePeers.forEach((peer,uid)=>{
    const player=state.zonePlayers.find(item=>item.uid===uid);
    const distanceToPeer=player?voiceDistance(player):Infinity;
    if(peer.audio){
      peer.audio.muted=voiceMutedUids.has(uid);
      const proximity=Math.max(0,1-distanceToPeer/VOICE_RADIUS);
      peer.audio.volume=Math.min(1,Math.max(.04,proximity*proximity));
    }
  });
  if(emitState) emit();
}

function refreshRemoteState(){
  const now=Date.now();
  state.zonePlayers=[...remotePlayers.values()]
    .filter(player=>now-(Number(player.lastSeen)||now)<PLAYER_STALE_AFTER)
    .sort((a,b)=>String(a.nickname).localeCompare(String(b.nickname),"th"));
  state.zoneMessages=[...zoneMessages.values()]
    .filter(message=>now-(Number(message.sentAt)||0)<CHAT_STALE_AFTER)
    .sort((a,b)=>a.sentAt-b.sentAt);
  refreshVoicePeers();
  syncVoiceState({emitState:false});
  emit();
}

function messageFromSnapshot(snapshot){
  const value=snapshot.val() || {};
  const text=cleanChatText(value.text);
  if(!text) return null;
  return {
    uid:String(snapshot.key||""),
    nickname:cleanNickname(value.nickname)||"นักผจญภัย",
    text,
    x:clamp(value.x,0,2048),
    y:clamp(value.y,0,1536),
    sentAt:Number(value.sentAt)||Date.now(),
    self:snapshot.key===state.user?.uid
  };
}

function remoteFromSnapshot(snapshot){
  const value=snapshot.val() || {};
  if(snapshot.key===state.user?.uid) return null;
  return {
    uid:String(snapshot.key||""),
    nickname:cleanNickname(value.nickname) || "นักผจญภัย",
    avatar:normalizeAvatar(value.avatar),
    x:clamp(value.x,0,2048),
    y:clamp(value.y,0,1536),
    direction:direction(value.direction),
    moving:Boolean(value.moving),action:["wave","cheer","spin"].includes(value.action)?value.action:"",actionAt:Number(value.actionAt)||0,
    voice:Boolean(value.voice),
    lastSeen:Number(value.lastSeen)||Date.now()
  };
}

function clearZoneSubscription(){
  while(zoneUnsubscribers.length){
    try{zoneUnsubscribers.pop()?.();}catch(error){console.warn(error);}
  }
  clearInterval(cleanupTimer);
  cleanupTimer=null;
  remotePlayers.clear();
  zoneMessages.clear();
  state.zonePlayers=[];
  state.zoneMessages=[];
}

function subscribeZone(zone){
  clearZoneSubscription();
  if(!database || !databaseModule || !state.user) return;
  const zoneQuery=databaseModule.query(databaseModule.ref(database,`world/${zone}`),databaseModule.limitToLast(MAX_ZONE_PLAYERS));
  const onWorldReadError=error=>{
    remotePlayers.clear();
    state.zonePlayers=[];
    setPresenceHealth("read","error",friendlyError(error,"world-read"));
  };
  const apply=snapshot=>{
    const player=remoteFromSnapshot(snapshot);
    if(player) remotePlayers.set(player.uid,player);
    refreshRemoteState();
  };
  zoneUnsubscribers.push(
    databaseModule.onValue(zoneQuery,()=>setPresenceHealth("read","ready"),onWorldReadError),
    databaseModule.onChildAdded(zoneQuery,apply,onWorldReadError),
    databaseModule.onChildChanged(zoneQuery,apply,onWorldReadError),
    databaseModule.onChildRemoved(zoneQuery,snapshot=>{remotePlayers.delete(String(snapshot.key||""));refreshRemoteState();},onWorldReadError)
  );
  const chatQuery=databaseModule.query(databaseModule.ref(database,`zoneChat/${zone}`),databaseModule.limitToLast(MAX_ZONE_MESSAGES));
  const applyMessage=snapshot=>{
    const message=messageFromSnapshot(snapshot);
    if(message) zoneMessages.set(message.uid,message);
    else zoneMessages.delete(String(snapshot.key||""));
    refreshRemoteState();
  };
  zoneUnsubscribers.push(
    databaseModule.onChildAdded(chatQuery,applyMessage),
    databaseModule.onChildChanged(chatQuery,applyMessage),
    databaseModule.onChildRemoved(chatQuery,snapshot=>{zoneMessages.delete(String(snapshot.key||""));refreshRemoteState();})
  );
  cleanupTimer=setInterval(refreshRemoteState,15000);
}

async function removePresence(){
  clearTimeout(presenceTimer);
  presenceTimer=null;
  await disableProximityVoice({skipPresence:true});
  if(currentPresenceRef && databaseModule){
    try{await databaseModule.onDisconnect(currentPresenceRef).cancel();}catch(error){/* Connection may already be closed. */}
    try{await databaseModule.remove(currentPresenceRef);}catch(error){console.warn("Could not remove world presence",error);}
  }
  if(currentChatRef && databaseModule){
    try{await databaseModule.onDisconnect(currentChatRef).cancel();}catch(error){/* Connection may already be closed. */}
    try{await databaseModule.remove(currentChatRef);}catch(error){console.warn("Could not remove proximity message",error);}
  }
  currentPresenceRef=null;
  currentChatRef=null;
  currentZone=null;
  lastPresenceFingerprint="";
  clearZoneSubscription();
  state.zone=null;
  resetPresenceHealth();
}

async function switchZone(zone){
  if(zone===currentZone || !database || !databaseModule || !state.user) return;
  if(state.voice.enabled){
    await Promise.all([...voicePeers.keys()].map(uid=>sendVoiceSignal(uid,"bye").catch(()=>{})));
    clearVoicePeers();stopVoiceInbox();await clearVoiceSignals();
  }
  if(currentPresenceRef){
    try{await databaseModule.onDisconnect(currentPresenceRef).cancel();}catch(error){/* Ignore stale connection. */}
    try{await databaseModule.remove(currentPresenceRef);}catch(error){console.warn(error);}
  }
  if(currentChatRef){
    try{await databaseModule.onDisconnect(currentChatRef).cancel();}catch(error){/* Ignore stale connection. */}
    try{await databaseModule.remove(currentChatRef);}catch(error){console.warn(error);}
  }
  currentZone=zone;
  state.zone=zone;
  resetPresenceHealth(zone,"connecting");
  currentPresenceRef=databaseModule.ref(database,`world/${zone}/${state.user.uid}`);
  currentChatRef=databaseModule.ref(database,`zoneChat/${zone}/${state.user.uid}`);
  try{await databaseModule.onDisconnect(currentPresenceRef).remove();}catch(error){console.warn("Could not register world disconnect",error);}
  try{await databaseModule.onDisconnect(currentChatRef).remove();}catch(error){console.warn("Could not register chat disconnect",error);}
  subscribeZone(zone);
  emit();
}

async function flushPresence(force=false){
  presenceTimer=null;
  if(!pendingWorldState || !database || !databaseModule || !state.user || state.phase!=="online") return;
  const world=sanitizeWorldState(pendingWorldState);
  await switchZone(world.zone);
  const fingerprint=`${world.zone}|${world.x}|${world.y}|${world.direction}|${Number(world.moving)}|${world.action}|${world.actionAt}|${Number(state.voice.enabled)}|${state.profile.nickname}|${JSON.stringify(state.profile.avatar)}`;
  const now=Date.now();
  if(!force && fingerprint===lastPresenceFingerprint && now-lastPresenceAt<PRESENCE_HEARTBEAT) return;
  const elapsed=now-lastPresenceAt;
  if(!force && elapsed<POSITION_INTERVAL){
    presenceTimer=setTimeout(()=>flushPresence(),POSITION_INTERVAL-elapsed);
    return;
  }
  lastPresenceAt=now;
  lastPresenceFingerprint=fingerprint;
  try{
    await databaseModule.set(currentPresenceRef,{
      nickname:state.profile.nickname,
      avatar:state.profile.avatar,
      x:world.x,y:world.y,direction:world.direction,moving:world.moving,action:world.action,actionAt:world.actionAt,
      voice:Boolean(state.voice.enabled),
      lastSeen:databaseModule.serverTimestamp()
    });
    setPresenceHealth("write","ready");
    if(state.voice.enabled) startVoiceInbox(world.zone);
  }catch(error){
    setPresenceHealth("write","error",friendlyError(error,"world-write"));
  }
}

function updatePresence(value){
  pendingWorldState=sanitizeWorldState(value);
  refreshVoicePeers();
  syncVoiceState({emitState:false});
  void flushPresence();
}

async function sendProximityMessage(value){
  const text=cleanChatText(value);
  if(!text) throw new Error("พิมพ์ข้อความก่อนส่ง");
  if(!database || !databaseModule || !state.user || state.user.isAnonymous || state.phase!=="online") throw new Error("กรุณาเข้าสู่ระบบ Google และรอให้สถานะออนไลน์พร้อมก่อนแชต");
  if(Date.now()-lastChatAt<CHAT_SEND_COOLDOWN) throw new Error("ส่งข้อความเร็วเกินไป กรุณารอสักครู่");
  if(!pendingWorldState) throw new Error("กรุณาเข้าโลกผจญภัยก่อนส่งข้อความ");
  const world=sanitizeWorldState(pendingWorldState);
  await switchZone(world.zone);
  lastChatAt=Date.now();
  await databaseModule.set(currentChatRef,{
    nickname:state.profile.nickname,
    text,
    x:world.x,
    y:world.y,
    sentAt:databaseModule.serverTimestamp()
  });
  return {ok:true,text};
}

function voiceErrorMessage(error){
  if(error?.name==="NotAllowedError" || error?.name==="SecurityError") return "เบราว์เซอร์ยังไม่ได้รับอนุญาตใช้ไมโครโฟน";
  if(error?.name==="NotFoundError") return "ไม่พบไมโครโฟนในอุปกรณ์นี้";
  if(!globalThis.isSecureContext) return "Voice Chat ต้องเปิดผ่าน HTTPS";
  return error?.message || "เปิด Voice Chat ไม่สำเร็จ";
}

function waitForIceGathering(peer,timeout=5000){
  if(peer.iceGatheringState==="complete") return Promise.resolve();
  return new Promise(resolve=>{
    const timer=setTimeout(done,timeout);
    function done(){clearTimeout(timer);peer.removeEventListener("icegatheringstatechange",onChange);resolve();}
    function onChange(){if(peer.iceGatheringState==="complete")done();}
    peer.addEventListener("icegatheringstatechange",onChange);
  });
}

async function sendVoiceSignal(toUid,kind,sdp=""){
  if(!database || !databaseModule || !state.user || !currentZone || !state.voice.enabled) return;
  const target=String(toUid||"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,128);
  const payload=String(sdp||"").slice(0,VOICE_SDP_MAX_LENGTH);
  if(!target || !["offer","answer","bye"].includes(kind)) return;
  let signalRef=voiceSignalRefs.get(target);
  if(!signalRef){
    signalRef=databaseModule.ref(database,`voiceSignals/${currentZone}/${target}/${state.user.uid}`);
    voiceSignalRefs.set(target,signalRef);
    try{await databaseModule.onDisconnect(signalRef).remove();}catch(error){console.warn("Could not register voice signal disconnect",error);}
  }
  await databaseModule.set(signalRef,{kind,sdp:payload,sentAt:databaseModule.serverTimestamp()});
}

function closeVoicePeer(uid,{notify=false}={}){
  const peer=voicePeers.get(uid);
  if(!peer) return;
  voicePeers.delete(uid);
  try{peer.pc.ontrack=null;peer.pc.onconnectionstatechange=null;peer.pc.close();}catch(error){console.warn(error);}
  try{peer.audio?.pause();peer.audio?.remove();}catch(error){console.warn(error);}
  if(notify && state.voice.enabled) void sendVoiceSignal(uid,"bye");
}

function clearVoicePeers({notify=false}={}){
  [...voicePeers.keys()].forEach(uid=>closeVoicePeer(uid,{notify}));
  syncVoiceState({emitState:false});
}

function createVoicePeer(player){
  if(!voiceStream || !state.voice.enabled || !player?.uid) return null;
  const existing=voicePeers.get(player.uid);
  if(existing) return existing;
  const pc=new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"}],iceCandidatePoolSize:4});
  voiceStream.getTracks().forEach(track=>pc.addTrack(track,voiceStream));
  const audio=document.createElement("audio");
  audio.autoplay=true;audio.playsInline=true;audio.hidden=true;audio.dataset.voiceUid=player.uid;
  document.body.append(audio);
  const peer={uid:player.uid,nickname:player.nickname,pc,audio,connected:false,offering:false};
  voicePeers.set(player.uid,peer);
  pc.ontrack=event=>{
    audio.srcObject=event.streams?.[0] || new MediaStream([event.track]);
    audio.muted=voiceMutedUids.has(player.uid);
    void audio.play().catch(()=>{state.voice.error="แตะหน้าจอหนึ่งครั้งเพื่อเริ่มรับเสียง";syncVoiceState();});
  };
  pc.onconnectionstatechange=()=>{
    peer.connected=pc.connectionState==="connected";
    if(["failed","closed"].includes(pc.connectionState)) closeVoicePeer(player.uid);
    syncVoiceState();
  };
  syncVoiceState({emitState:false});
  return peer;
}

async function offerVoicePeer(player){
  const peer=createVoicePeer(player);
  if(!peer || peer.offering || peer.pc.signalingState!=="stable") return;
  peer.offering=true;
  try{
    await peer.pc.setLocalDescription(await peer.pc.createOffer({offerToReceiveAudio:true}));
    await waitForIceGathering(peer.pc);
    await sendVoiceSignal(player.uid,"offer",peer.pc.localDescription?.sdp||"");
  }catch(error){
    console.warn("Could not create proximity voice offer",error);
    closeVoicePeer(player.uid);
  }finally{peer.offering=false;}
}

async function handleVoiceSignal(snapshot){
  if(!state.voice.enabled || !state.user || !voiceStream) return;
  const fromUid=String(snapshot.key||"");
  if(!fromUid || fromUid===state.user.uid) return;
  const signal=snapshot.val()||{};
  const fingerprint=`${signal.kind}|${Number(signal.sentAt)||0}|${String(signal.sdp||"").length}`;
  if(voiceSignalFingerprints.get(fromUid)===fingerprint || Date.now()-(Number(signal.sentAt)||0)>VOICE_SIGNAL_STALE_AFTER) return;
  voiceSignalFingerprints.set(fromUid,fingerprint);
  const player=state.zonePlayers.find(item=>item.uid===fromUid && item.voice && voiceDistance(item)<=VOICE_RADIUS);
  if(!player) return;
  if(signal.kind==="bye"){closeVoicePeer(fromUid);syncVoiceState();return;}
  if(!["offer","answer"].includes(signal.kind) || typeof signal.sdp!=="string" || signal.sdp.length>VOICE_SDP_MAX_LENGTH) return;
  try{
    if(signal.kind==="offer"){
      closeVoicePeer(fromUid);
      const peer=createVoicePeer(player);
      await peer.pc.setRemoteDescription({type:"offer",sdp:signal.sdp});
      await peer.pc.setLocalDescription(await peer.pc.createAnswer());
      await waitForIceGathering(peer.pc);
      await sendVoiceSignal(fromUid,"answer",peer.pc.localDescription?.sdp||"");
    }else{
      const peer=voicePeers.get(fromUid);
      if(peer && peer.pc.signalingState==="have-local-offer") await peer.pc.setRemoteDescription({type:"answer",sdp:signal.sdp});
    }
  }catch(error){
    console.warn("Could not apply proximity voice signal",error);
    closeVoicePeer(fromUid);
    state.voice.error="เชื่อมเสียงกับผู้เล่นบางคนไม่สำเร็จ";
    syncVoiceState();
  }
}

function stopVoiceInbox(){
  try{voiceInboxUnsubscribe?.();}catch(error){console.warn(error);}
  voiceInboxUnsubscribe=null;voiceInboxZone=null;voiceSignalFingerprints.clear();
}

function startVoiceInbox(zone=currentZone){
  if(!state.voice.enabled || !database || !databaseModule || !state.user || !zone || voiceInboxZone===zone) return;
  stopVoiceInbox();
  voiceInboxZone=zone;
  const inboxRef=databaseModule.ref(database,`voiceSignals/${zone}/${state.user.uid}`);
  const apply=snapshot=>{void handleVoiceSignal(snapshot);};
  const unsubAdded=databaseModule.onChildAdded(inboxRef,apply,error=>{state.voice.error=voiceErrorMessage(error);syncVoiceState();});
  const unsubChanged=databaseModule.onChildChanged(inboxRef,apply,error=>{state.voice.error=voiceErrorMessage(error);syncVoiceState();});
  voiceInboxUnsubscribe=()=>{unsubAdded();unsubChanged();};
}

function refreshVoicePeers(){
  if(!state.voice.enabled || !voiceStream || !state.user) return;
  const candidates=state.zonePlayers.filter(player=>player.voice && voiceDistance(player)<=VOICE_RADIUS).slice(0,VOICE_MAX_PEERS);
  const allowed=new Set(candidates.map(player=>player.uid));
  [...voicePeers.keys()].forEach(uid=>{if(!allowed.has(uid))closeVoicePeer(uid,{notify:true});});
  candidates.forEach(player=>{
    if(!voicePeers.has(player.uid) && String(state.user.uid).localeCompare(String(player.uid))<0) void offerVoicePeer(player);
  });
}

async function clearVoiceSignals(){
  const entries=[...voiceSignalRefs.values()];
  voiceSignalRefs.clear();
  await Promise.all(entries.map(async signalRef=>{
    try{await databaseModule?.onDisconnect(signalRef).cancel();}catch(error){/* Connection may already be closed. */}
    try{await databaseModule?.remove(signalRef);}catch(error){console.warn("Could not remove voice signal",error);}
  }));
}

async function enableProximityVoice(){
  if(!state.voice.supported) throw new Error("เบราว์เซอร์นี้ไม่รองรับ Voice Chat");
  if(!globalThis.isSecureContext) throw new Error("Voice Chat ต้องเปิดผ่าน HTTPS");
  if(!database || !databaseModule || !state.user || state.user.isAnonymous || state.phase!=="online") throw new Error("กรุณาเข้าสู่ระบบ Google และเข้าโลกผจญภัยก่อนเปิดไมค์");
  if(!pendingWorldState) throw new Error("กรุณาเข้าโลกผจญภัยก่อนเปิดไมค์");
  if(state.voice.enabled) return publicState();
  state.voice.permission="requesting";state.voice.error="";emit();
  try{
    voiceStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
    voiceStream.getAudioTracks().forEach(track=>{track.enabled=false;});
    state.voice.enabled=true;state.voice.permission="granted";state.voice.talking=false;
    await flushPresence(true);
    startVoiceInbox(currentZone);
    refreshVoicePeers();syncVoiceState();
  }catch(error){
    voiceStream?.getTracks().forEach(track=>track.stop());voiceStream=null;
    state.voice.enabled=false;state.voice.permission=error?.name==="NotAllowedError"?"denied":"error";state.voice.error=voiceErrorMessage(error);emit();
    throw new Error(state.voice.error);
  }
  return publicState();
}

function setVoiceTalking(value){
  const talking=Boolean(value && state.voice.enabled && voiceStream);
  voiceStream?.getAudioTracks().forEach(track=>{track.enabled=talking;});
  state.voice.talking=talking;syncVoiceState();
  return talking;
}

function setVoiceMuted(uid,value=true){
  const key=String(uid||"");
  if(value) voiceMutedUids.add(key);else voiceMutedUids.delete(key);
  saveVoiceMuted();syncVoiceState();
  return publicState();
}

async function disableProximityVoice({skipPresence=false}={}){
  if(!state.voice.enabled && !voiceStream) return publicState();
  setVoiceTalking(false);
  await Promise.all([...voicePeers.keys()].map(uid=>sendVoiceSignal(uid,"bye").catch(()=>{})));
  clearVoicePeers();stopVoiceInbox();await clearVoiceSignals();
  voiceStream?.getTracks().forEach(track=>track.stop());voiceStream=null;
  state.voice.enabled=false;state.voice.permission="idle";state.voice.talking=false;state.voice.nearby=0;state.voice.peerCount=0;state.voice.peers=[];state.voice.error="";
  if(!skipPresence && pendingWorldState && state.phase==="online") await flushPresence(true);
  emit();
  return publicState();
}

async function registerOnlineConnection(){
  if(!database || !databaseModule || !state.user) return;
  if(onlineConnectionRef && onlineConnectionUid!==state.user.uid) await removeOnlineConnection();
  onlineConnectionUid=state.user.uid;
  onlineConnectionRef=databaseModule.ref(database,`online/${state.user.uid}/${connectionId}`);
  try{
    await databaseModule.onDisconnect(onlineConnectionRef).remove();
    await databaseModule.set(onlineConnectionRef,{connectedAt:databaseModule.serverTimestamp()});
    if(pendingWorldState) await flushPresence(true);
  }catch(error){
    setPhase("error",friendlyError(error));
  }
}

async function removeOnlineConnection(){
  if(onlineConnectionRef && databaseModule){
    try{await databaseModule.onDisconnect(onlineConnectionRef).cancel();}catch(error){/* Connection may already be closed. */}
    try{await databaseModule.remove(onlineConnectionRef);}catch(error){console.warn("Could not remove online connection",error);}
  }
  onlineConnectionRef=null;
  onlineConnectionUid=null;
}

function clearCounterSubscriptions(){
  try{onlineUnsubscribe?.();}catch(error){console.warn(error);}
  try{totalUnsubscribe?.();}catch(error){console.warn(error);}
  onlineUnsubscribe=null;
  totalUnsubscribe=null;
  state.onlineCount=0;
  state.totalPlayers=0;
}

function subscribeCounters(){
  if(onlineUnsubscribe || !database || !databaseModule) return;
  const onError=error=>{
    state.error=friendlyError(error);
    emit();
  };
  onlineUnsubscribe=databaseModule.onValue(databaseModule.ref(database,"online"),snapshot=>{
    const value=snapshot.val() || {};
    state.onlineCount=Object.keys(value).filter(uid=>value[uid] && Object.keys(value[uid]).length).length;
    emit();
  },onError);
  totalUnsubscribe=databaseModule.onValue(databaseModule.ref(database,"visitorClaims"),snapshot=>{
    state.totalPlayers=Object.keys(snapshot.val() || {}).length;
    emit();
  },onError);
}

function localProgressTimestamp(){
  const value=Number(readStoredObject(GAME_STORAGE)?.localUpdatedAt)||0;
  return value>0 && value<=Date.now()+120000 ? value : 0;
}

async function writeProgressNow(){
  clearTimeout(progressSaveTimer);
  progressSaveTimer=null;
  if(!progressRef || !databaseModule || !state.user || state.user.isAnonymous) return false;
  if(progressSaving){ progressQueued=true; return false; }
  progressSaving=true;
  const updatedAt=Date.now();
  try{
    await databaseModule.set(progressRef,buildProgressBundle(updatedAt));
    state.cloudSync="saved";
    state.cloudUpdatedAt=updatedAt;
    emit();
    return true;
  }catch(error){
    state.cloudSync="error";
    state.error=friendlyError(error);
    emit();
    return false;
  }finally{
    progressSaving=false;
    if(progressQueued){
      progressQueued=false;
      progressSaveTimer=setTimeout(()=>{void writeProgressNow();},PROGRESS_SAVE_DELAY);
    }
  }
}

function saveProgress(){
  if(!progressRef || !state.user || state.user.isAnonymous) return false;
  state.cloudSync="saving";
  clearTimeout(progressSaveTimer);
  progressSaveTimer=setTimeout(()=>{void writeProgressNow();},PROGRESS_SAVE_DELAY);
  emit();
  return true;
}

function saveAdventurePosition(value,{immediate=false}={}){
  if(value && typeof value==="object"){
    try{localStorage.setItem(ADVENTURE_STORAGE,JSON.stringify(value));}catch(error){console.warn(error);}
  }
  const now=Date.now();
  if(!immediate && now-lastAdventureCloudSave<ADVENTURE_SAVE_INTERVAL) return false;
  lastAdventureCloudSave=now;
  if(immediate){void writeProgressNow();return true;}
  return saveProgress();
}

async function setupProgressSync(uid){
  progressRef=databaseModule.ref(database,`progress/${uid}`);
  state.cloudSync="loading";
  emit();
  const snapshot=await databaseModule.get(progressRef);
  const remote=snapshot.exists() ? snapshot.val() : null;
  const localExists=Boolean(localStorage.getItem(GAME_STORAGE));
  const localUpdatedAt=localProgressTimestamp();
  const remoteUpdatedAt=Number(remote?.updatedAt)||0;
  if(remote && remoteUpdatedAt>=localUpdatedAt){
    applyProgressBundle(remote);
    state.cloudUpdatedAt=remoteUpdatedAt;
    state.cloudSync="saved";
    return;
  }
  if(localExists){
    await writeProgressNow();
    return;
  }
  state.cloudSync="empty";
}

function clearProgressSync(){
  clearTimeout(progressSaveTimer);
  progressSaveTimer=null;
  progressRef=null;
  progressSaving=false;
  progressQueued=false;
  state.cloudSync="idle";
  state.cloudUpdatedAt=0;
}

async function ensurePlayerCountClaim(uid){
  const claimRef=databaseModule.ref(database,`visitorClaims/${uid}`);
  await databaseModule.runTransaction(claimRef,current=>current ? undefined : {firstSeen:Date.now()},{applyLocally:false});
}

async function attachUserOnce(user){
  if(state.user?.uid && state.user.uid!==user.uid){
    await leaveRaid();
    await removePresence();
    await removeOnlineConnection();
  }
  clearCounterSubscriptions();
  connectedUnsubscribe?.();
  connectedUnsubscribe=null;
  clearProgressSync();
  state.user={uid:user.uid,isAnonymous:false,email:user.email||"",displayName:user.displayName||"",provider:"google"};
  const profileRef=databaseModule.ref(database,`profiles/${user.uid}`);
  const localProfile=normalizeProfile({
    ...state.profile,
    nickname:user.displayName ? cleanNickname(user.displayName) : state.profile.nickname
  });
  const profileResult=await databaseModule.runTransaction(profileRef,current=>{
    const next=current ? normalizeProfile(current) : localProfile;
    const now=Date.now();
    return {
      nickname:next.nickname,
      avatar:next.avatar,
      provider:"google",
      createdAt:Number(current?.createdAt) || now,
      updatedAt:now
    };
  },{applyLocally:false});
  state.profile=normalizeProfile(profileResult.snapshot.val());
  saveLocalProfile(state.profile);
  try{
    const adminSnapshot=await databaseModule.get(databaseModule.ref(database,`admins/${user.uid}`));
    state.isAdmin=adminSnapshot.val()===true;
  }catch(error){
    state.isAdmin=false;
    console.warn("Could not verify Test Admin role",error);
  }

  let warning="";
  try{
    await ensurePlayerCountClaim(user.uid);
  }catch(error){
    warning=friendlyError(error);
  }
  try{
    await setupProgressSync(user.uid);
  }catch(error){
    state.cloudSync="error";
    warning=warning || friendlyError(error);
  }
  subscribeCounters();
  connectedUnsubscribe=databaseModule.onValue(databaseModule.ref(database,".info/connected"),connection=>{
    if(connection.val()===true){ state.connected=true; void registerOnlineConnection(); }
    else state.connected=false;
    state.phase=state.connected?"online":"connecting";
    emit();
  });
  setPhase("online",warning);
  void restoreRaid();
  return publicState();
}

async function attachUser(user){
  if(!user || user.isAnonymous) return publicState();
  if(attachedUid===user.uid && state.user?.uid===user.uid && state.phase!=="error") return publicState();
  if(attachingUid===user.uid && attachPromise) return attachPromise;
  const run=attachUserOnce(user);
  attachingUid=user.uid;
  attachPromise=run;
  try{
    const result=await run;
    attachedUid=user.uid;
    return result;
  }catch(error){
    setPhase("error",friendlyError(error));
    return publicState();
  }finally{
    if(attachPromise===run){
      attachPromise=null;
      attachingUid=null;
    }
  }
}

async function init(){
  if(!configured){emit();return publicState();}
  if(auth) return publicState();
  setPhase("connecting");
  try{
    [appModule,authModule,databaseModule]=await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-database.js`)
    ]);
    const appName="teacher-quest-online";
    const app=appModule.getApps().find(item=>item.name===appName) || appModule.initializeApp(CONFIG,appName);
    auth=authModule.getAuth(app);
    database=databaseModule.getDatabase(app);
    await authModule.setPersistence(auth,authModule.browserLocalPersistence);
    authUnsubscribe=authModule.onAuthStateChanged(auth,user=>{
      signingIn=false;
      if(user && !user.isAnonymous){ void attachUser(user); return; }
      attachedUid=null;
      void leaveRaid();
      clearCounterSubscriptions();
      connectedUnsubscribe?.();
      connectedUnsubscribe=null;
      clearProgressSync();
      state.user=user ? {uid:user.uid,isAnonymous:true,email:"",displayName:"",provider:"guest"} : null;
      state.isAdmin=false;
      state.connected=false;
      setPhase("signin-required");
    });
  }catch(error){
    setPhase("error",friendlyError(error));
  }
  return publicState();
}

async function updateProfile(value){
  const next=normalizeProfile({...state.profile,...value,avatar:{...state.profile.avatar,...value?.avatar}});
  state.profile=next;
  saveLocalProfile(next);
  emit();
  if(database && databaseModule && state.user && !state.user.isAnonymous){
    await databaseModule.update(databaseModule.ref(database,`profiles/${state.user.uid}`),{
      nickname:next.nickname,avatar:next.avatar,provider:"google",updatedAt:databaseModule.serverTimestamp()
    });
    if(pendingWorldState) await flushPresence(true);
    if(state.raid) await touchRaidMember({nickname:next.nickname,avatar:next.avatar});
  }
  return publicState();
}

async function finalizeGoogleSignIn(user){
  if(!user || user.isAnonymous) throw new Error("Google ไม่ส่งข้อมูลบัญชีกลับมา กรุณาลองใหม่");
  await user.getIdToken(true);
  if(attachingUid===user.uid && attachPromise){
    try{await attachPromise;}catch(error){/* Retry below with the refreshed Google token. */}
  }
  attachedUid=null;
  return attachUser(user);
}

async function signInGoogle(){
  if(!configured) throw new Error("กรุณาตั้งค่า Firebase ก่อน");
  await init();
  if(!auth || !authModule) throw new Error(state.error || "ระบบบัญชียังไม่พร้อม");
  const provider=new authModule.GoogleAuthProvider();
  provider.setCustomParameters({prompt:"select_account"});
  setPhase("connecting");
  try{
    signingIn=true;
    const result=auth.currentUser?.isAnonymous
      ? await authModule.linkWithPopup(auth.currentUser,provider)
      : await authModule.signInWithPopup(auth,provider);
    signingIn=false;
    await finalizeGoogleSignIn(result.user);
  }catch(error){
    signingIn=false;
    if(error?.code==="auth/credential-already-in-use"){
      const credential=authModule.GoogleAuthProvider.credentialFromError?.(error);
      if(!credential) throw new Error("บัญชี Google นี้ถูกใช้อยู่แล้ว กรุณาลองออกจาก Guest แล้วเชื่อมใหม่");
      try{
        await removePresence();
        await removeOnlineConnection();
        clearProgressSync();
        const result=await authModule.signInWithCredential(auth,credential);
        await finalizeGoogleSignIn(result.user);
      }catch(signInError){
        if(state.user && state.connected){
          await registerOnlineConnection();
          if(pendingWorldState) await flushPresence(true);
        }
        setPhase("signin-required",friendlyError(signInError));
        throw new Error(friendlyError(signInError));
      }
    }else{
      setPhase("signin-required",friendlyError(error));
      throw new Error(friendlyError(error));
    }
  }
  return publicState();
}

async function signOut(){
  if(!auth || !authModule) return;
  await leaveRaid();
  await removePresence();
  await removeOnlineConnection();
  clearCounterSubscriptions();
  connectedUnsubscribe?.();
  connectedUnsubscribe=null;
  clearProgressSync();
  attachedUid=null;
  state.isAdmin=false;
  setPhase("connecting");
  await authModule.signOut(auth);
}

async function reconnect(){
  if(!auth?.currentUser || auth.currentUser.isAnonymous) throw new Error("กรุณาเข้าสู่ระบบด้วย Google ก่อน");
  await auth.currentUser.getIdToken(true);
  attachedUid=null;
  return attachUser(auth.currentUser);
}

function claimSummary(tokenResult){
  const firebaseClaims=tokenResult?.claims?.firebase || {};
  const googleIdentity=firebaseClaims.identities?.["google.com"];
  return {
    emailVerified:tokenResult?.claims?.email_verified===true,
    signInProvider:String(firebaseClaims.sign_in_provider || "unknown").slice(0,40),
    googleLinked:Array.isArray(googleIdentity) ? googleIdentity.length>0 : Boolean(googleIdentity),
    rulesRevision:FIREBASE_RULES_REVISION
  };
}

async function diagnosticStep(key,label,task){
  try{
    await task();
    return {key,label,ok:true,error:""};
  }catch(error){
    return {key,label,ok:false,error:friendlyError(error,key==="raid-create" ? "raid-create" : "")};
  }
}

async function diagnosePermissions(){
  if(!configured || !auth?.currentUser || auth.currentUser.isAnonymous || !database || !databaseModule){
    throw new Error("กรุณาเข้าสู่ระบบ Google และรอให้ Firebase เชื่อมต่อก่อนตรวจสิทธิ์");
  }
  const user=auth.currentUser;
  const tokenResult=await user.getIdTokenResult(true);
  const steps=[];
  steps.push(await diagnosticStep("profile-read","อ่านโปรไฟล์ของตนเอง",()=>databaseModule.get(databaseModule.ref(database,`profiles/${user.uid}`))));
  steps.push(await diagnosticStep("progress-read","อ่านความคืบหน้าบน Cloud",()=>databaseModule.get(databaseModule.ref(database,`progress/${user.uid}`))));
  const diagnosticConnection=`${connectionId.slice(0,64)}_diag`;
  const connectionRef=databaseModule.ref(database,`online/${user.uid}/${diagnosticConnection}`);
  steps.push(await diagnosticStep("presence-write","เขียนสถานะออนไลน์",async()=>{
    await databaseModule.set(connectionRef,{connectedAt:databaseModule.serverTimestamp()});
    await databaseModule.remove(connectionRef);
  }));
  const worldQuery=databaseModule.query(databaseModule.ref(database,"world/plaza"),databaseModule.limitToLast(MAX_ZONE_PLAYERS));
  steps.push(await diagnosticStep("world-read","อ่านผู้เล่นในพื้นที่",()=>databaseModule.get(worldQuery)));
  const diagnosticWorldZone=currentZone==="future-campus"?"law-archive":"future-campus";
  const worldRef=databaseModule.ref(database,`world/${diagnosticWorldZone}/${user.uid}`);
  let worldWritten=false;
  steps.push(await diagnosticStep("world-write","ส่งและลบตำแหน่งตัวละครทดสอบ",async()=>{
    await databaseModule.set(worldRef,{
      nickname:state.profile.nickname,avatar:state.profile.avatar,x:1024,y:812,direction:"down",moving:false,
      action:"",actionAt:0,voice:false,lastSeen:databaseModule.serverTimestamp()
    });
    worldWritten=true;
    await databaseModule.remove(worldRef);
    worldWritten=false;
  }));
  const chatRef=databaseModule.ref(database,`zoneChat/plaza/${user.uid}`);
  steps.push(await diagnosticStep("chat-write","ส่งและลบข้อความใกล้ตัวทดสอบ",async()=>{
    await databaseModule.set(chatRef,{nickname:state.profile.nickname,text:"ทดสอบสิทธิ์แชต",x:1024,y:812,sentAt:databaseModule.serverTimestamp()});
    await databaseModule.remove(chatRef);
  }));
  const code=randomRaidCode();
  const roomRef=databaseModule.ref(database,`raids/${code}`);
  let raidCreated=false;
  steps.push(await diagnosticStep("raid-create","สร้างและลบห้อง Raid ทดสอบ",async()=>{
    await databaseModule.set(roomRef,raidRoomPayload("all"));
    raidCreated=true;
    await databaseModule.remove(roomRef);
    raidCreated=false;
  }));
  if(raidCreated){
    try{await databaseModule.remove(roomRef);}catch(error){console.warn("Could not clean up diagnostic Raid",error);}
  }
  if(worldWritten){
    try{await databaseModule.remove(worldRef);}catch(error){console.warn("Could not clean up diagnostic World Presence",error);}
  }
  return {ok:steps.every(step=>step.ok),checkedAt:Date.now(),claims:claimSummary(tokenResult),steps};
}

async function leaveWorld(){
  pendingWorldState=null;
  await removePresence();
}

function stopRaidHeartbeat(){
  clearInterval(raidHeartbeatTimer);
  raidHeartbeatTimer=null;
}

function rememberRaid(code){
  try{sessionStorage.setItem(RAID_STORAGE,normalizeRaidCode(code));}catch(error){console.warn(error);}
}

function forgetRaid(){
  try{sessionStorage.removeItem(RAID_STORAGE);}catch(error){console.warn(error);}
}

function rememberedRaid(){
  try{return normalizeRaidCode(sessionStorage.getItem(RAID_STORAGE));}catch{return "";}
}

async function cancelRaidDisconnects(){
  try{await raidRoomDisconnect?.cancel();}catch(error){/* Connection may already be closed. */}
  try{await raidMemberDisconnect?.cancel();}catch(error){/* Connection may already be closed. */}
  raidRoomDisconnect=null;
  raidMemberDisconnect=null;
}

async function setupRaidDisconnect({hostLobby=false}={}){
  await cancelRaidDisconnects();
  if(!databaseModule || !database || !state.user || !raidCode) return;
  raidMemberRef=databaseModule.ref(database,`raids/${raidCode}/members/${state.user.uid}`);
  raidMemberDisconnect=databaseModule.onDisconnect(raidMemberRef);
  await raidMemberDisconnect.remove();
  if(hostLobby){
    raidRoomDisconnect=databaseModule.onDisconnect(databaseModule.ref(database,`raids/${raidCode}`));
    await raidRoomDisconnect.remove();
  }
}

async function touchRaidMember(extra={}){
  if(!raidMemberRef || !databaseModule || !state.user) return false;
  try{
    await databaseModule.update(raidMemberRef,{...extra,lastSeen:databaseModule.serverTimestamp()});
    return true;
  }catch(error){
    state.error=friendlyError(error);
    emit();
    return false;
  }
}

function startRaidHeartbeat(){
  stopRaidHeartbeat();
  raidHeartbeatTimer=setInterval(()=>{void touchRaidMember();},RAID_HEARTBEAT);
}

function clearRaidListener(){
  try{raidUnsubscribe?.();}catch(error){console.warn(error);}
  raidUnsubscribe=null;
  stopRaidHeartbeat();
}

function subscribeRaid(code){
  clearRaidListener();
  raidCode=normalizeRaidCode(code);
  if(!raidCode || !databaseModule || !database || !state.user) return;
  rememberRaid(raidCode);
  raidMemberRef=databaseModule.ref(database,`raids/${raidCode}/members/${state.user.uid}`);
  const roomRef=databaseModule.ref(database,`raids/${raidCode}`);
  raidUnsubscribe=databaseModule.onValue(roomRef,snapshot=>{
    const next=normalizeRaid(snapshot.val(),raidCode);
    if(!next){
      state.raid=null;
      clearRaidListener();
      raidCode="";
      raidMemberRef=null;
      forgetRaid();
      emit();
      return;
    }
    state.raid=next;
    state.error="";
    emit();
  },error=>{
    state.error=friendlyError(error);
    state.raid=null;
    clearRaidListener();
    emit();
  });
  startRaidHeartbeat();
}

async function createRaid({moduleId="all"}={}){
  requireRaidOnline();
  if(state.raid) await leaveRaid();
  const safeModule=validRaidModule(moduleId);
  let lastError=null;
  for(let attempt=0;attempt<6;attempt++){
    const code=randomRaidCode();
    const roomRef=databaseModule.ref(database,`raids/${code}`);
    const payload=raidRoomPayload(safeModule);
    try{
      await databaseModule.set(roomRef,payload);
      raidCode=code;
      state.raid=normalizeRaid(payload,code);
      emit();
      subscribeRaid(code);
      await setupRaidDisconnect({hostLobby:true});
      return publicState();
    }catch(error){ lastError=error; }
  }
  throw new Error(friendlyError(lastError,"raid-create") || "สร้างห้อง Raid ไม่สำเร็จ กรุณาลองใหม่");
}

async function joinRaid(value,{restoring=false}={}){
  requireRaidOnline();
  const code=normalizeRaidCode(value);
  if(code.length!==RAID_CODE_LENGTH) throw new Error("รหัสห้องต้องมี 6 ตัว");
  if(state.raid?.code===code) return publicState();
  if(state.raid) await leaveRaid();
  const joinedAt=databaseModule.serverTimestamp();
  const memberRef=databaseModule.ref(database,`raids/${code}/members/${state.user.uid}`);
  try{
    await databaseModule.set(memberRef,raidMemberPayload({joinedAt}));
    const snapshot=await databaseModule.get(databaseModule.ref(database,`raids/${code}`));
    const room=normalizeRaid(snapshot.val(),code);
    if(!room) throw new Error("ไม่พบห้อง Raid นี้");
    if(room.memberCount>RAID_MAX_PLAYERS){
      await databaseModule.remove(memberRef);
      throw new Error(`ห้องเต็มแล้ว (สูงสุด ${RAID_MAX_PLAYERS} คน)`);
    }
    raidCode=code;
    state.raid=room;
    emit();
    subscribeRaid(code);
    await setupRaidDisconnect({hostLobby:false});
    return publicState();
  }catch(error){
    if(!restoring) throw new Error(/ห้อง|รหัส/.test(error?.message||"") ? error.message : "เข้าห้องไม่ได้: ตรวจรหัส หรือขอให้หัวหน้าห้องสร้างใหม่");
    forgetRaid();
    return publicState();
  }
}

async function restoreRaid(){
  const code=rememberedRaid();
  if(code.length!==RAID_CODE_LENGTH || state.raid) return;
  await joinRaid(code,{restoring:true});
}

async function startRaid(){
  requireRaidOnline();
  if(!state.raid || !state.raid.isHost) throw new Error("เฉพาะหัวหน้าห้องเท่านั้นที่เริ่ม Raid ได้");
  if(state.raid.meta.status!=="lobby") return publicState();
  try{
    await databaseModule.update(databaseModule.ref(database,`raids/${state.raid.code}/meta`),{
      status:"active",startedAt:databaseModule.serverTimestamp()
    });
  }catch(error){
    throw new Error(friendlyError(error));
  }
  try{await raidRoomDisconnect?.cancel();}catch(error){/* Ignore stale connection. */}
  raidRoomDisconnect=null;
  await setupRaidDisconnect({hostLobby:false});
  await touchRaidMember({ready:true});
  return publicState();
}

async function attackRaid(value){
  requireRaidOnline();
  if(!state.raid || state.raid.meta.status!=="active" || state.raid.meta.bossHp<=0) throw new Error("Raid ยังไม่เริ่มหรือบอสถูกปราบแล้ว");
  const damage=Math.round(clamp(value,1,40));
  let transactionBefore=Number(state.raid.meta.bossHp)||0;
  const hpRef=databaseModule.ref(database,`raids/${state.raid.code}/meta/bossHp`);
  const result=await databaseModule.runTransaction(hpRef,current=>{
    transactionBefore=Number(current)||0;
    return Math.max(0,transactionBefore-damage);
  },{applyLocally:false});
  if(!result.committed) throw new Error("การโจมตีชนกับผู้เล่นอื่น กรุณาลองข้อถัดไป");
  const bossHp=Number(result.snapshot.val())||0;
  const actualDamage=Math.max(0,Math.min(damage,transactionBefore-bossHp));
  await touchRaidMember({
    score:databaseModule.increment(actualDamage),
    correct:databaseModule.increment(1)
  });
  return {bossHp,bossMax:state.raid.meta.bossMax,damage:actualDamage};
}

async function sendRaidEmote(value){
  requireRaidOnline();
  const emote=RAID_EMOTES.includes(value) ? value : "";
  if(!state.raid) throw new Error("ยังไม่ได้อยู่ในห้อง Raid");
  await touchRaidMember({emote,emoteAt:databaseModule.serverTimestamp()});
  return publicState();
}

async function setRaidReady(value){
  requireRaidOnline();
  if(!state.raid || state.raid.meta.status!=="lobby") return publicState();
  await touchRaidMember({ready:Boolean(value)});
  return publicState();
}

async function leaveRaid(){
  const room=state.raid;
  const code=raidCode || room?.code;
  const memberRef=raidMemberRef;
  await cancelRaidDisconnects();
  clearRaidListener();
  state.raid=null;
  raidCode="";
  raidMemberRef=null;
  forgetRaid();
  emit();
  if(!databaseModule || !database || !state.user || !code) return publicState();
  try{
    if(room?.isHost && room.meta.status==="lobby") await databaseModule.remove(databaseModule.ref(database,`raids/${code}`));
    else if(memberRef) await databaseModule.remove(memberRef);
  }catch(error){console.warn("Could not leave Raid",error);}
  return publicState();
}

function subscribe(listener){
  listeners.add(listener);
  listener(publicState());
  return ()=>listeners.delete(listener);
}

function simulateForTests(value={}){
  Object.assign(state,value);
  if(value.profile) state.profile=normalizeProfile(value.profile);
  if(value.raid && !Array.isArray(value.raid.members)) state.raid=normalizeRaid(value.raid,value.raid.code);
  if(value.zonePlayers){
    state.zonePlayers=value.zonePlayers.map((player,index)=>({
      uid:String(player.uid||`test-${index}`),nickname:cleanNickname(player.nickname)||`เพื่อน ${index+1}`,
      avatar:normalizeAvatar(player.avatar),x:clamp(player.x,0,2048),y:clamp(player.y,0,1536),
      direction:direction(player.direction),moving:Boolean(player.moving),action:["wave","cheer","spin"].includes(player.action)?player.action:"",actionAt:Number(player.actionAt)||0,voice:Boolean(player.voice),lastSeen:Date.now()
    }));
  }
  if(value.zoneMessages){
    state.zoneMessages=value.zoneMessages.map((message,index)=>({
      uid:String(message.uid||`message-${index}`),nickname:cleanNickname(message.nickname)||`เพื่อน ${index+1}`,
      text:cleanChatText(message.text),x:clamp(message.x,0,2048),y:clamp(message.y,0,1536),
      sentAt:Number(message.sentAt)||Date.now(),self:Boolean(message.self)
    })).filter(message=>message.text);
  }
  emit();
}

window.TeacherQuestOnline={
  init,getState:publicState,subscribe,updateProfile,signInGoogle,signOut,reconnect,
  updatePresence,sendProximityMessage,enableProximityVoice,disableProximityVoice,setVoiceTalking,setVoiceMuted,leaveWorld,saveProgress,saveAdventurePosition,avatarMarkup,
  createRaid,joinRaid,startRaid,attackRaid,sendRaidEmote,setRaidReady,leaveRaid,diagnosePermissions,
  avatarOptions:AVATAR_OPTIONS,raidEmotes:RAID_EMOTES,normalizeProfile,normalizeRaidCode,cleanChatText,
  isConfigured:()=>configured
};
window.teacherQuestOnlineDebug={
  simulate:simulateForTests,getState:publicState,flushPresence,formatError:friendlyError,
  buildProgressBundle,applyProgressBundle,normalizeRaidCode,normalizeRaid,claimSummary,raidRoomPayload,cleanChatText,voiceDistance,syncVoiceState
};

window.addEventListener("pagehide",()=>{voiceStream?.getTracks().forEach(track=>track.stop());void leaveWorld();});
emit();
void init();
})();
