/*
  Public Firebase Web App identifiers for Teacher Quest.
  Localhost stays offline so automated tests never write production data.
  Never place a service-account JSON, private key or admin credential here.
*/
(()=>{
"use strict";
const localHosts=new Set(["localhost","127.0.0.1","::1"]);
const productionConfig=Object.freeze({
  apiKey:"AIzaSyA5nQhIvdZ4JL5sPgxDOJcxoCY9hNEysLY",
  authDomain:"teacher-quest-2569.firebaseapp.com",
  databaseURL:"https://teacher-quest-2569-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:"teacher-quest-2569",
  storageBucket:"teacher-quest-2569.firebasestorage.app",
  messagingSenderId:"365104476742",
  appId:"1:365104476742:web:881dca909587e72a005047",
  measurementId:"G-EJ95RZ6KR2"
});
window.TEACHER_QUEST_FIREBASE_CONFIG=localHosts.has(location.hostname)?null:productionConfig;
})();
