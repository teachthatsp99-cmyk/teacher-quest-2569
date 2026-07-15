const SDK_VERSION = "12.16.0";
const STORAGE = "teacherQuest2569_v3";
const config = window.FIREBASE_CONFIG;
const status = {configured:Boolean(config?.apiKey && config?.projectId && config?.appId),loading:false,user:null,error:""};
let auth=null, db=null, firebase=null;

const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char]);
const dispatch=()=>window.dispatchEvent(new CustomEvent("teacherquest:cloud-status",{detail:{...status,user:status.user?{uid:status.user.uid,email:status.user.email}:null}}));
const readLocal=()=>window.TeacherQuestV4?.readState?.() || JSON.parse(localStorage.getItem(STORAGE)||"{}");
const writeLocal=state=>window.TeacherQuestV4?.writeState?.(state,{touch:false}) || localStorage.setItem(STORAGE,JSON.stringify(state));

async function init(){
  if(!status.configured || status.loading || firebase) return;
  status.loading=true; dispatch();
  try{
    const appModule=await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`);
    const authModule=await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`);
    const storeModule=await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`);
    const app=appModule.getApps().length?appModule.getApp():appModule.initializeApp(config);
    auth=authModule.getAuth(app);
    db=storeModule.getFirestore(app);
    await authModule.setPersistence(auth,authModule.browserLocalPersistence);
    firebase={...authModule,...storeModule};
    authModule.onAuthStateChanged(auth,user=>{status.user=user;status.loading=false;status.error="";dispatch();});
  }catch(error){status.loading=false;status.error=error.message||String(error);dispatch();}
}

function cloudDoc(){
  if(!status.user||!db||!firebase) throw new Error("กรุณาเข้าสู่ระบบก่อน");
  return firebase.doc(db,"users",status.user.uid);
}

async function signUp(email,password){
  await init();
  if(!firebase) throw new Error(status.error||"เชื่อม Firebase ไม่สำเร็จ");
  return firebase.createUserWithEmailAndPassword(auth,email,password);
}
async function signIn(email,password){
  await init();
  if(!firebase) throw new Error(status.error||"เชื่อม Firebase ไม่สำเร็จ");
  return firebase.signInWithEmailAndPassword(auth,email,password);
}
async function signOutUser(){ if(firebase&&auth) await firebase.signOut(auth); }
async function resetPassword(email){
  await init();
  if(!email) throw new Error("กรอกอีเมลก่อน");
  await firebase.sendPasswordResetEmail(auth,email);
}

async function pushProgress(){
  const state=readLocal();
  const now=Date.now();
  state.cloudUpdatedAt=now;
  writeLocal(state);
  await firebase.setDoc(cloudDoc(),{
    schema:4,
    app:"teacher-quest-2569",
    email:status.user.email||"",
    clientUpdatedAt:now,
    updatedAt:firebase.serverTimestamp(),
    state
  },{merge:true});
  return now;
}

async function pullProgress(){
  const snapshot=await firebase.getDoc(cloudDoc());
  if(!snapshot.exists()) throw new Error("ยังไม่มีข้อมูลสำรองบนคลาวด์");
  const payload=snapshot.data();
  if(!payload?.state||typeof payload.state!=="object") throw new Error("ข้อมูลบนคลาวด์ไม่สมบูรณ์");
  writeLocal(payload.state);
  return payload;
}

function modalElements(){
  return {modal:document.querySelector("#modal"),body:document.querySelector("#modalBody")};
}
function openModal(html){
  const {modal,body}=modalElements();
  if(!modal||!body) return;
  body.innerHTML=html;
  modal.classList.remove("hidden");
}
function setMessage(message,type=""){
  const box=document.querySelector("#cloudMessage");
  if(box){box.className=`v4-alert ${type}`;box.textContent=message;box.hidden=false;}
}
function friendlyError(error){
  const code=error?.code||"";
  const map={
    "auth/email-already-in-use":"อีเมลนี้มีบัญชีแล้ว ให้กดเข้าสู่ระบบ",
    "auth/invalid-email":"รูปแบบอีเมลไม่ถูกต้อง",
    "auth/weak-password":"รหัสผ่านควรมีอย่างน้อย 6 ตัวอักษร",
    "auth/invalid-credential":"อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    "auth/too-many-requests":"ลองหลายครั้งเกินไป กรุณารอสักครู่",
    "auth/network-request-failed":"เชื่อมต่ออินเทอร์เน็ตไม่สำเร็จ"
  };
  return map[code]||error?.message||"เกิดข้อผิดพลาด";
}

function renderUnconfigured(){
  openModal(`<div class="v4-account-box"><div class="eyebrow">FREE CLOUD SYNC</div><h2 id="modalTitle">ยังต้องใส่ค่าจาก Firebase</h2><div class="v4-alert">ตัวเว็บและระบบบัญชีเตรียมไว้แล้ว แต่ต้องสร้าง Firebase Project ฟรีหนึ่งครั้งและนำ Web App Config มาใส่ในไฟล์ firebase-config.js</div><p class="hint">ใช้เฉพาะ Authentication แบบอีเมล/รหัสผ่านและ Cloud Firestore ไม่ใช้ SMS, Cloud Functions, Storage หรือระบบชำระเงิน</p><div class="v4-actions"><a class="v4-btn sky" href="FIREBASE_SETUP.md" target="_blank" rel="noopener">เปิดคู่มือตั้งค่า</a></div></div>`);
}

function renderSignedOut(){
  openModal(`<div class="v4-account-box"><div class="eyebrow">FREE CLOUD SYNC</div><h2 id="modalTitle">บัญชีครูเควสต์</h2><div id="cloudMessage" hidden></div><label>อีเมล<input id="cloudEmail" type="email" autocomplete="email" placeholder="name@example.com"></label><label>รหัสผ่าน<input id="cloudPassword" type="password" autocomplete="current-password" minlength="6" placeholder="อย่างน้อย 6 ตัวอักษร"></label><div class="v4-actions"><button class="v4-btn mint" id="cloudLogin">เข้าสู่ระบบ</button><button class="v4-btn sky" id="cloudRegister">สมัครบัญชีฟรี</button><button class="v4-btn dark" id="cloudReset">ลืมรหัสผ่าน</button></div><p class="hint">ระบบไม่ใช้เบอร์โทรศัพท์และไม่ส่ง OTP ทาง SMS</p></div>`);
  const email=()=>document.querySelector("#cloudEmail")?.value.trim()||"";
  const password=()=>document.querySelector("#cloudPassword")?.value||"";
  document.querySelector("#cloudLogin").onclick=async()=>{try{setMessage("กำลังเข้าสู่ระบบ...");await signIn(email(),password());renderSignedIn();}catch(error){setMessage(friendlyError(error));}};
  document.querySelector("#cloudRegister").onclick=async()=>{try{setMessage("กำลังสร้างบัญชี...");await signUp(email(),password());await pushProgress();renderSignedIn("สมัครสำเร็จและสำรองข้อมูลเครื่องนี้แล้ว");}catch(error){setMessage(friendlyError(error));}};
  document.querySelector("#cloudReset").onclick=async()=>{try{await resetPassword(email());setMessage("ส่งอีเมลตั้งรหัสผ่านใหม่แล้ว");}catch(error){setMessage(friendlyError(error));}};
}

function renderSignedIn(message=""){
  const local=readLocal();
  const date=local.cloudUpdatedAt?new Date(local.cloudUpdatedAt).toLocaleString("th-TH"):"ยังไม่เคยสำรอง";
  openModal(`<div class="v4-account-box"><div class="eyebrow">CONNECTED</div><h2 id="modalTitle">${esc(status.user?.email||"บัญชีครูเควสต์")}</h2><div id="cloudMessage" ${message?"":"hidden"} class="v4-alert">${esc(message)}</div><div class="v4-status"><span class="v4-dot online"></span><span>เชื่อมบัญชีออนไลน์แล้ว</span></div><p class="hint">ข้อมูลในเครื่องอัปเดตล่าสุด: ${esc(date)}</p><div class="v4-actions"><button class="v4-btn mint" id="cloudPush">อัปโหลดข้อมูลเครื่องนี้</button><button class="v4-btn sky" id="cloudPull">ดึงข้อมูลจากคลาวด์</button><button class="v4-btn dark" id="cloudLogout">ออกจากระบบ</button></div><div class="v4-alert">เพื่อป้องกันข้อมูลทับกัน ระบบจะไม่ซิงก์อัตโนมัติ ให้เลือกทิศทางด้วยตัวเองทุกครั้ง</div></div>`);
  document.querySelector("#cloudPush").onclick=async()=>{try{setMessage("กำลังอัปโหลด...");await pushProgress();setMessage("สำรองข้อมูลบนคลาวด์สำเร็จ");}catch(error){setMessage(friendlyError(error));}};
  document.querySelector("#cloudPull").onclick=async()=>{if(!confirm("ดึงข้อมูลจากคลาวด์มาแทนข้อมูลในเครื่องนี้หรือไม่?"))return;try{setMessage("กำลังดาวน์โหลด...");await pullProgress();alert("ดึงข้อมูลสำเร็จ ระบบจะโหลดหน้าใหม่");location.reload();}catch(error){setMessage(friendlyError(error));}};
  document.querySelector("#cloudLogout").onclick=async()=>{await signOutUser();renderSignedOut();};
}

async function openAccountDialog(){
  if(!status.configured){renderUnconfigured();return;}
  if(!firebase){openModal(`<div class="v4-account-box"><h2 id="modalTitle">กำลังเชื่อมต่อ...</h2><p class="hint">กำลังโหลดระบบบัญชี Firebase</p></div>`);await init();}
  if(status.error){openModal(`<div class="v4-account-box"><h2 id="modalTitle">เชื่อมต่อไม่สำเร็จ</h2><div class="v4-alert">${esc(status.error)}</div></div>`);return;}
  status.user?renderSignedIn():renderSignedOut();
}

window.TeacherQuestCloud={
  init,
  getStatus:()=>({configured:status.configured,loading:status.loading,error:status.error,user:status.user?{uid:status.user.uid,email:status.user.email}:null}),
  openAccountDialog,
  pushProgress,
  pullProgress
};
dispatch();
if(status.configured) init();
