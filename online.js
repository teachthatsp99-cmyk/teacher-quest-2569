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
const RAID_STORAGE = "teacherQuestRaidRoom_v1";
const RAID_CODE_LENGTH = 6;
const RAID_MAX_PLAYERS = 8;
const RAID_BOSS_HP = 480;
const RAID_HEARTBEAT = 25000;
const RAID_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RAID_EMOTES = Object.freeze(["","hi","go","help","wow","gg"]);
const RAID_MODULES = Object.freeze(["all","learn","curriculum","measure","research","psych","media","classroom","profession","eduact","child","disability","civil","ksp","voclaw","culture","policy","student","admin","quality","current"]);
const connectionId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/[^a-zA-Z0-9_-]/g,"");
const listeners = new Set();
const zoneUnsubscribers = [];
const remotePlayers = new Map();

const AVATAR_OPTIONS = Object.freeze({
  skin:Object.freeze(["#f4c7a1","#e8b989","#c98f65","#8b5b3f"]),
  hair:Object.freeze(["#24182f","#4a2d28","#815226","#d9b65a","#5b4b85"]),
  shirt:Object.freeze(["#3d68af","#1e8a72","#9b4e86","#b86535","#5c55a7"]),
  accent:Object.freeze(["#ffd45c","#58e7b2","#5dcbff","#ff72b4","#a88cff"]),
  style:Object.freeze(["short","spike","long","cap"])
});
const DEFAULT_AVATAR = Object.freeze({skin:AVATAR_OPTIONS.skin[1],hair:AVATAR_OPTIONS.hair[0],shirt:AVATAR_OPTIONS.shirt[0],accent:AVATAR_OPTIONS.accent[0],style:"short"});
const ZONE_KEYS = Object.freeze({
  "ลานสถาบันครูเควสต์":"plaza",
  "หมู่บ้านครูนักคิด":"district-0",
  "นครนวัตกรรม":"district-1",
  "ป่าคัมภีร์กฎหมาย":"district-2",
  "ป้อมอนาคตการศึกษา":"district-3"
});
const configured = Boolean(CONFIG?.apiKey && CONFIG?.authDomain && CONFIG?.databaseURL && CONFIG?.projectId && CONFIG?.appId);
const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (value,min,max) => Math.max(min,Math.min(max,Number(value)||0));
const validChoice = (group,value,fallback) => AVATAR_OPTIONS[group].includes(value) ? value : fallback;
const cleanNickname = value => String(value || "").normalize("NFKC").replace(/[<>\u0000-\u001f\u007f]/g,"").replace(/\s+/g," ").trim().slice(0,20);
const randomNickname = () => `นักผจญภัย ${String(Math.floor(1000+Math.random()*9000))}`;

function normalizeAvatar(value={}){
  return {
    skin:validChoice("skin",value.skin,DEFAULT_AVATAR.skin),
    hair:validChoice("hair",value.hair,DEFAULT_AVATAR.hair),
    shirt:validChoice("shirt",value.shirt,DEFAULT_AVATAR.shirt),
    accent:validChoice("accent",value.accent,DEFAULT_AVATAR.accent),
    style:validChoice("style",value.style,DEFAULT_AVATAR.style)
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

function raidMemberPayload({joinedAt=Date.now(),ready=false}={}){
  return {
    nickname:state.profile.nickname,
    avatar:state.profile.avatar,
    score:0,
    correct:0,
    joinedAt:Number(joinedAt)||Date.now(),
    lastSeen:Date.now(),
    ready:Boolean(ready),
    emote:"",
    emoteAt:0
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
  zone:null,
  zonePlayers:[],
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
let currentZone=null;
let pendingWorldState=null;
let lastPresenceAt=0;
let lastPresenceFingerprint="";
let presenceTimer=null;
let cleanupTimer=null;
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

function publicState(){
  return clone({...state,zonePlayers:[...state.zonePlayers]});
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

function avatarMarkup(profile=state.profile,className=""){
  const avatar=normalizeAvatar(profile?.avatar || profile);
  return `<span class="pixel-avatar ${String(className).replace(/[^a-zA-Z0-9 _-]/g,"")}" data-hair-style="${avatar.style}" style="--avatar-skin:${avatar.skin};--avatar-hair:${avatar.hair};--avatar-shirt:${avatar.shirt};--avatar-accent:${avatar.accent}" aria-hidden="true"><i class="pixel-avatar-hair"></i><i class="pixel-avatar-face"></i><i class="pixel-avatar-body"></i><i class="pixel-avatar-accent"></i><i class="pixel-avatar-feet"></i></span>`;
}

function friendlyError(error){
  const rawError=`${String(error?.code || "")} ${String(error?.message || "")}`;
  if(/permission[_\s-]*denied/i.test(rawError)){
    return "Firebase ปฏิเสธสิทธิ์: เปิด Realtime Database → Rules วางไฟล์ database.rules.json แล้วกด Publish";
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
  return {
    zone:zoneKeyFor(value.zone || value.district),
    zoneLabel:String(value.district || value.zone || "โลกครูเควสต์").slice(0,40),
    x:Math.round(clamp(value.x,0,2048)),
    y:Math.round(clamp(value.y,0,1536)),
    direction:direction(value.direction),
    moving:Boolean(value.moving)
  };
}

function refreshRemoteState(){
  const now=Date.now();
  state.zonePlayers=[...remotePlayers.values()]
    .filter(player=>now-(Number(player.lastSeen)||now)<PLAYER_STALE_AFTER)
    .sort((a,b)=>String(a.nickname).localeCompare(String(b.nickname),"th"));
  emit();
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
    moving:Boolean(value.moving),
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
  state.zonePlayers=[];
}

function subscribeZone(zone){
  clearZoneSubscription();
  if(!database || !databaseModule || !state.user) return;
  const zoneQuery=databaseModule.query(databaseModule.ref(database,`world/${zone}`),databaseModule.limitToLast(MAX_ZONE_PLAYERS));
  const apply=snapshot=>{
    const player=remoteFromSnapshot(snapshot);
    if(player) remotePlayers.set(player.uid,player);
    refreshRemoteState();
  };
  zoneUnsubscribers.push(
    databaseModule.onChildAdded(zoneQuery,apply),
    databaseModule.onChildChanged(zoneQuery,apply),
    databaseModule.onChildRemoved(zoneQuery,snapshot=>{remotePlayers.delete(String(snapshot.key||""));refreshRemoteState();})
  );
  cleanupTimer=setInterval(refreshRemoteState,15000);
}

async function removePresence(){
  clearTimeout(presenceTimer);
  presenceTimer=null;
  if(currentPresenceRef && databaseModule){
    try{await databaseModule.onDisconnect(currentPresenceRef).cancel();}catch(error){/* Connection may already be closed. */}
    try{await databaseModule.remove(currentPresenceRef);}catch(error){console.warn("Could not remove world presence",error);}
  }
  currentPresenceRef=null;
  currentZone=null;
  lastPresenceFingerprint="";
  clearZoneSubscription();
  state.zone=null;
  emit();
}

async function switchZone(zone){
  if(zone===currentZone || !database || !databaseModule || !state.user) return;
  if(currentPresenceRef){
    try{await databaseModule.onDisconnect(currentPresenceRef).cancel();}catch(error){/* Ignore stale connection. */}
    try{await databaseModule.remove(currentPresenceRef);}catch(error){console.warn(error);}
  }
  currentZone=zone;
  state.zone=zone;
  currentPresenceRef=databaseModule.ref(database,`world/${zone}/${state.user.uid}`);
  try{await databaseModule.onDisconnect(currentPresenceRef).remove();}catch(error){console.warn("Could not register world disconnect",error);}
  subscribeZone(zone);
  emit();
}

async function flushPresence(force=false){
  presenceTimer=null;
  if(!pendingWorldState || !database || !databaseModule || !state.user || state.phase!=="online") return;
  const world=sanitizeWorldState(pendingWorldState);
  await switchZone(world.zone);
  const fingerprint=`${world.zone}|${world.x}|${world.y}|${world.direction}|${Number(world.moving)}|${state.profile.nickname}|${JSON.stringify(state.profile.avatar)}`;
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
      x:world.x,y:world.y,direction:world.direction,moving:world.moving,
      lastSeen:databaseModule.serverTimestamp()
    });
  }catch(error){
    state.error=friendlyError(error);
    emit();
  }
}

function updatePresence(value){
  pendingWorldState=sanitizeWorldState(value);
  void flushPresence();
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
    if(!result.user) throw new Error("Google ไม่ส่งข้อมูลบัญชีกลับมา กรุณาลองใหม่");
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
        if(!result.user) throw new Error("Google ไม่ส่งข้อมูลบัญชีกลับมา กรุณาลองใหม่");
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
  setPhase("connecting");
  await authModule.signOut(auth);
}

async function reconnect(){
  if(!auth?.currentUser || auth.currentUser.isAnonymous) throw new Error("กรุณาเข้าสู่ระบบด้วย Google ก่อน");
  attachedUid=null;
  return attachUser(auth.currentUser);
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
  const now=Date.now();
  const safeModule=validRaidModule(moduleId);
  let lastError=null;
  for(let attempt=0;attempt<6;attempt++){
    const code=randomRaidCode();
    const roomRef=databaseModule.ref(database,`raids/${code}`);
    const member=raidMemberPayload({joinedAt:now,ready:true});
    const payload={
      meta:{
        hostUid:state.user.uid,status:"lobby",bossHp:RAID_BOSS_HP,bossMax:RAID_BOSS_HP,
        moduleId:safeModule,questionSeed:Math.floor(1+Math.random()*2147483646),createdAt:now,startedAt:0
      },
      members:{[state.user.uid]:member}
    };
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
  throw new Error(friendlyError(lastError) || "สร้างห้อง Raid ไม่สำเร็จ กรุณาลองใหม่");
}

async function joinRaid(value,{restoring=false}={}){
  requireRaidOnline();
  const code=normalizeRaidCode(value);
  if(code.length!==RAID_CODE_LENGTH) throw new Error("รหัสห้องต้องมี 6 ตัว");
  if(state.raid?.code===code) return publicState();
  if(state.raid) await leaveRaid();
  const joinedAt=Date.now();
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
  await databaseModule.update(databaseModule.ref(database,`raids/${state.raid.code}/meta`),{
    status:"active",startedAt:databaseModule.serverTimestamp()
  });
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
      direction:direction(player.direction),moving:Boolean(player.moving),lastSeen:Date.now()
    }));
  }
  emit();
}

window.TeacherQuestOnline={
  init,getState:publicState,subscribe,updateProfile,signInGoogle,signOut,reconnect,
  updatePresence,leaveWorld,saveProgress,saveAdventurePosition,avatarMarkup,
  createRaid,joinRaid,startRaid,attackRaid,sendRaidEmote,setRaidReady,leaveRaid,
  avatarOptions:AVATAR_OPTIONS,raidEmotes:RAID_EMOTES,normalizeProfile,normalizeRaidCode,
  isConfigured:()=>configured
};
window.teacherQuestOnlineDebug={
  simulate:simulateForTests,getState:publicState,flushPresence,formatError:friendlyError,
  buildProgressBundle,applyProgressBundle,normalizeRaidCode,normalizeRaid
};

window.addEventListener("pagehide",()=>{void leaveWorld();});
emit();
void init();
})();
