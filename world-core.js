(()=>{
"use strict";

const WORLD_STATE_VERSION=2;
const DIRECTIONS=Object.freeze(["up","down","left","right"]);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const safeId=(value,fallback="")=>{
  const id=String(value||"").toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,40);
  return id||fallback;
};

function createMapRegistry(definitions=[]){
  if(!Array.isArray(definitions)||!definitions.length) throw new Error("World map registry requires at least one map");
  const maps=new Map();
  definitions.forEach((definition,index)=>{
    const id=safeId(definition?.id,`map-${index+1}`);
    if(maps.has(id)) throw new Error(`Duplicate world map id: ${id}`);
    const width=Math.max(320,Math.round(Number(definition?.width)||0));
    const height=Math.max(240,Math.round(Number(definition?.height)||0));
    const spawn={
      x:clamp(definition?.spawn?.x,40,width-40),
      y:clamp(definition?.spawn?.y,64,height-32)
    };
    maps.set(id,Object.freeze({
      id,
      title:String(definition?.title||id).slice(0,80),
      short:String(definition?.short||definition?.title||id).slice(0,30),
      width,
      height,
      tile:Math.max(16,Math.min(64,Math.round(Number(definition?.tile)||32))),
      spawn:Object.freeze(spawn),
      musicScene:safeId(definition?.musicScene,"plaza")
    }));
  });
  const ids=Object.freeze([...maps.keys()]);
  const defaultMapId=ids[0];
  const get=id=>maps.get(safeId(id))||maps.get(defaultMapId);
  const has=id=>maps.has(safeId(id));
  const normalizePosition=(value={},fallback={})=>{
    const requestedMap=safeId(value?.mapId||fallback?.mapId,defaultMapId);
    const map=get(requestedMap);
    const baseX=Number.isFinite(Number(fallback?.x))?Number(fallback.x):map.spawn.x;
    const baseY=Number.isFinite(Number(fallback?.y))?Number(fallback.y):map.spawn.y;
    const rawX=Number.isFinite(Number(value?.x))?Number(value.x):baseX;
    const rawY=Number.isFinite(Number(value?.y))?Number(value.y):baseY;
    return {
      version:WORLD_STATE_VERSION,
      mapId:map.id,
      x:clamp(rawX,40,map.width-40),
      y:clamp(rawY,64,map.height-32),
      direction:DIRECTIONS.includes(value?.direction)?value.direction:(DIRECTIONS.includes(fallback?.direction)?fallback.direction:"down")
    };
  };
  return Object.freeze({version:WORLD_STATE_VERSION,defaultMapId,ids,get,has,normalizePosition});
}

window.TeacherQuestWorldCore=Object.freeze({version:WORLD_STATE_VERSION,createMapRegistry});
})();
