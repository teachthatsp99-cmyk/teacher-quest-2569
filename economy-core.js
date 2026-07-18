(()=>{
"use strict";

const VERSION=1;
const MAX_CONSUMABLE=9;
const CATALOG=Object.freeze([
  Object.freeze({id:"hint",type:"consumable",category:"helper",name:"เลนส์คำใบ้",icon:"◉",price:10,description:"เปิดคำใบ้จากคำอธิบายของข้อนั้น ใช้ได้ 1 ครั้ง"}),
  Object.freeze({id:"shield",type:"consumable",category:"helper",name:"โล่ตั้งสติ",icon:"◈",price:12,description:"ป้องกันความเสียหายเมื่อพลาดคำตอบครั้งถัดไป"}),
  Object.freeze({id:"heal",type:"consumable",category:"helper",name:"ชาสมุนไพร",icon:"+",price:12,description:"ฟื้นพลัง 25 HP ระหว่างภารกิจ"}),
  Object.freeze({id:"fifty",type:"consumable",category:"helper",name:"กรรไกร 50:50",icon:"✂",price:18,description:"ตัดตัวลวงออก 2 ตัวเลือก ใช้ได้ 1 ครั้ง"}),
  Object.freeze({id:"emote-wave",type:"unlock",category:"emote",value:"wave",name:"โบกมือ",icon:"ヾ",price:45,description:"ทักทายผู้เล่นที่เดินมาเจอกัน"}),
  Object.freeze({id:"emote-cheer",type:"unlock",category:"emote",value:"cheer",name:"ดีใจ",icon:"★",price:75,description:"กระโดดเชียร์ด้วยประกาย Pixel"}),
  Object.freeze({id:"emote-spin",type:"unlock",category:"emote",value:"spin",name:"หมุนตัว",icon:"↻",price:95,description:"หมุนตัวฉลองหลังผ่านทางลัด"}),
  Object.freeze({id:"cosmetic-cape",type:"unlock",category:"cosmetic",value:"cape",name:"ผ้าคลุมนักปราชญ์",icon:"◆",price:120,description:"ผ้าคลุม Pixel ที่ผู้เล่นอื่นมองเห็นได้"}),
  Object.freeze({id:"cosmetic-book",type:"unlock",category:"cosmetic",value:"book",name:"คัมภีร์ลอยฟ้า",icon:"▤",price:180,description:"คัมภีร์คู่ใจลอยตามตัวละคร"}),
  Object.freeze({id:"cosmetic-crown",type:"unlock",category:"cosmetic",value:"crown",name:"มงกุฎผู้พิชิต",icon:"♛",price:260,description:"เครื่องหมายของนักผจญภัยระดับสูง"})
]);
const BY_ID=new Map(CATALOG.map(item=>[item.id,item]));
const STARTER=Object.freeze({
  version:VERSION,
  inventory:Object.freeze({hint:2,shield:2,heal:2,fifty:2}),
  owned:Object.freeze(["emote-wave"]),
  equipped:Object.freeze({emote:"wave",accessory:"none"}),
  purchases:Object.freeze({})
});
const clone=value=>JSON.parse(JSON.stringify(value));
const integer=value=>Math.max(0,Math.floor(Number(value)||0));

function defaults(){return clone(STARTER);}

function normalize(value={}){
  const inventory={};
  for(const item of CATALOG.filter(item=>item.type==="consumable")){
    const fallback=STARTER.inventory[item.id]||0;
    inventory[item.id]=Math.min(MAX_CONSUMABLE,integer(value?.inventory?.[item.id] ?? fallback));
  }
  const owned=[...new Set(["emote-wave",...(Array.isArray(value?.owned)?value.owned:[])])]
    .filter(id=>BY_ID.get(id)?.type==="unlock");
  const emotes=owned.map(id=>BY_ID.get(id)).filter(item=>item?.category==="emote").map(item=>item.value);
  const cosmetics=owned.map(id=>BY_ID.get(id)).filter(item=>item?.category==="cosmetic").map(item=>item.value);
  const equipped={
    emote:emotes.includes(value?.equipped?.emote)?value.equipped.emote:"wave",
    accessory:cosmetics.includes(value?.equipped?.accessory)?value.equipped.accessory:"none"
  };
  const purchases={};
  for(const [id,count] of Object.entries(value?.purchases||{})) if(BY_ID.has(id)) purchases[id]=integer(count);
  return {version:VERSION,inventory,owned,equipped,purchases};
}

function purchase(value,coins,id){
  const economy=normalize(value);
  const balance=integer(coins);
  const item=BY_ID.get(String(id||""));
  if(!item) return {ok:false,reason:"not-found",economy,coins:balance};
  if(item.type==="unlock"&&economy.owned.includes(item.id)) return {ok:false,reason:"owned",economy,coins:balance,item};
  if(item.type==="consumable"&&economy.inventory[item.id]>=MAX_CONSUMABLE) return {ok:false,reason:"full",economy,coins:balance,item};
  if(balance<item.price) return {ok:false,reason:"coins",economy,coins:balance,item};
  if(item.type==="consumable") economy.inventory[item.id]++;
  else economy.owned.push(item.id);
  economy.purchases[item.id]=(economy.purchases[item.id]||0)+1;
  return {ok:true,economy:normalize(economy),coins:balance-item.price,item};
}

function consume(value,id){
  const economy=normalize(value);
  const item=BY_ID.get(String(id||""));
  if(!item||item.type!=="consumable") return {ok:false,reason:"not-consumable",economy,item};
  if(!economy.inventory[item.id]) return {ok:false,reason:"empty",economy,item};
  economy.inventory[item.id]--;
  return {ok:true,economy:normalize(economy),item};
}

function equip(value,id){
  const economy=normalize(value);
  if(id==="cosmetic-none"){
    economy.equipped.accessory="none";
    return {ok:true,economy:normalize(economy),item:{id,name:"ไม่สวมเครื่องประดับ",category:"cosmetic",value:"none"}};
  }
  const item=BY_ID.get(String(id||""));
  if(!item||item.type!=="unlock") return {ok:false,reason:"not-equipment",economy,item};
  if(!economy.owned.includes(item.id)) return {ok:false,reason:"locked",economy,item};
  if(item.category==="emote") economy.equipped.emote=item.value;
  else if(item.category==="cosmetic") economy.equipped.accessory=item.value;
  else return {ok:false,reason:"not-equipment",economy,item};
  return {ok:true,economy:normalize(economy),item};
}

window.TeacherQuestEconomyCore=Object.freeze({version:VERSION,maxConsumable:MAX_CONSUMABLE,catalog:CATALOG,defaults,normalize,purchase,consume,equip});
})();
