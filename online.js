(()=>{
"use strict";

const SDK_VERSION = "12.16.0";
const PROFILE_STORAGE = "teacherQuestOnlineProfile_v1";
const CONFIG = window.TEACHER_QUEST_FIREBASE_CONFIG;
const POSITION_INTERVAL = 650;
const PRESENCE_HEARTBEAT = 20000;
const PLAYER_STALE_AFTER = 45000;
const MAX_ZONE_PLAYERS = 40;
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

function loadLocalProfile(){
  try{ return normalizeProfile(JSON.parse(localStorage.getItem(PROFILE_STORAGE) || "{}")); }
  catch(error){ console.warn("Could not load online profile",error); return normalizeProfile(); }
}

function saveLocalProfile(profile){
  try{ localStorage.setItem(PROFILE_STORAGE,JSON.stringify(normalizeProfile(profile))); }
  catch(error){ console.warn("Could not save online profile",error); }
}

const state = {
  configured,
  phase:configured ? "connecting" : "setup",
  connected:false,
  user:null,
  profile:loadLocalProfile(),
  onlineCount:0,
  totalPlayers:0,
  zone:null,
  zonePlayers:[],
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

function subscribeCounters(){
  if(onlineUnsubscribe || !database || !databaseModule) return;
  onlineUnsubscribe=databaseModule.onValue(databaseModule.ref(database,"online"),snapshot=>{
    const value=snapshot.val() || {};
    state.onlineCount=Object.keys(value).filter(uid=>value[uid] && Object.keys(value[uid]).length).length;
    emit();
  });
  totalUnsubscribe=databaseModule.onValue(databaseModule.ref(database,"visitorClaims"),snapshot=>{
    state.totalPlayers=Object.keys(snapshot.val() || {}).length;
    emit();
  });
}

async function ensurePlayerCountClaim(uid){
  const claimRef=databaseModule.ref(database,`visitorClaims/${uid}`);
  await databaseModule.runTransaction(claimRef,current=>current ? undefined : {firstSeen:Date.now()},{applyLocally:false});
}

async function attachUser(user){
  if(state.user?.uid && state.user.uid!==user.uid){
    await removePresence();
    await removeOnlineConnection();
  }
  state.user={uid:user.uid,isAnonymous:user.isAnonymous,email:user.email||"",displayName:user.displayName||"",provider:user.isAnonymous?"guest":"google"};
  try{
    const profileRef=databaseModule.ref(database,`profiles/${user.uid}`);
    const snapshot=await databaseModule.get(profileRef);
    const remote=snapshot.exists() ? normalizeProfile(snapshot.val()) : null;
    state.profile=remote || normalizeProfile({
      ...state.profile,
      nickname:user.displayName ? cleanNickname(user.displayName) : state.profile.nickname
    });
    saveLocalProfile(state.profile);
    const now=databaseModule.serverTimestamp();
    await databaseModule.update(profileRef,{
      nickname:state.profile.nickname,
      avatar:state.profile.avatar,
      provider:state.user.provider,
      createdAt:snapshot.val()?.createdAt || now,
      updatedAt:now
    });
    await ensurePlayerCountClaim(user.uid);
    subscribeCounters();
    connectedUnsubscribe?.();
    connectedUnsubscribe=databaseModule.onValue(databaseModule.ref(database,".info/connected"),connection=>{
      if(connection.val()===true){ state.connected=true; void registerOnlineConnection(); }
      else state.connected=false;
      state.phase=state.connected?"online":"connecting";
      emit();
    });
    setPhase("online");
  }catch(error){
    setPhase("error",friendlyError(error));
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
      if(user){ signingIn=false; void attachUser(user); return; }
      if(!signingIn){
        signingIn=true;
        authModule.signInAnonymously(auth).catch(error=>{signingIn=false;setPhase("error",friendlyError(error));});
      }
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
  if(database && databaseModule && state.user){
    await databaseModule.update(databaseModule.ref(database,`profiles/${state.user.uid}`),{
      nickname:next.nickname,avatar:next.avatar,provider:state.user.provider,updatedAt:databaseModule.serverTimestamp()
    });
    if(pendingWorldState) await flushPresence(true);
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
    if(auth.currentUser?.isAnonymous) await authModule.linkWithPopup(auth.currentUser,provider);
    else await authModule.signInWithPopup(auth,provider);
  }catch(error){
    if(error?.code==="auth/credential-already-in-use"){
      const credential=authModule.GoogleAuthProvider.credentialFromError?.(error);
      if(!credential) throw new Error("บัญชี Google นี้ถูกใช้อยู่แล้ว กรุณาลองออกจาก Guest แล้วเชื่อมใหม่");
      try{
        await removePresence();
        await removeOnlineConnection();
        await authModule.signInWithCredential(auth,credential);
      }catch(signInError){
        if(state.user && state.connected){
          await registerOnlineConnection();
          if(pendingWorldState) await flushPresence(true);
        }
        setPhase(state.user?"online":"error",friendlyError(signInError));
        throw new Error(friendlyError(signInError));
      }
    }else{
      setPhase(state.user?"online":"error",friendlyError(error));
      throw new Error(friendlyError(error));
    }
  }
  return publicState();
}

async function switchToGuest(){
  if(!auth || !authModule) return;
  await removePresence();
  await removeOnlineConnection();
  setPhase("connecting");
  await authModule.signOut(auth);
}

async function leaveWorld(){
  pendingWorldState=null;
  await removePresence();
}

function subscribe(listener){
  listeners.add(listener);
  listener(publicState());
  return ()=>listeners.delete(listener);
}

function simulateForTests(value={}){
  Object.assign(state,value);
  if(value.profile) state.profile=normalizeProfile(value.profile);
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
  init,getState:publicState,subscribe,updateProfile,signInGoogle,switchToGuest,
  updatePresence,leaveWorld,avatarMarkup,
  avatarOptions:AVATAR_OPTIONS,normalizeProfile,
  isConfigured:()=>configured
};
window.teacherQuestOnlineDebug={simulate:simulateForTests,getState:publicState,flushPresence,formatError:friendlyError};

window.addEventListener("pagehide",()=>{void leaveWorld();});
emit();
void init();
})();
