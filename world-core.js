(()=>{
"use strict";

const WORLD_STATE_VERSION=3;
const EXPLORATION_CELL_SIZE=64;
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
  const exploration=id=>{
    const map=get(id);
    const columns=Math.ceil(map.width/EXPLORATION_CELL_SIZE);
    const rows=Math.ceil(map.height/EXPLORATION_CELL_SIZE);
    const total=columns*rows;
    const bytes=Math.ceil(total/8);
    const cellIndex=(x,y)=>{
      const column=Math.max(0,Math.min(columns-1,Math.floor((Number(x)||0)/EXPLORATION_CELL_SIZE)));
      const row=Math.max(0,Math.min(rows-1,Math.floor((Number(y)||0)/EXPLORATION_CELL_SIZE)));
      return row*columns+column;
    };
    const encode=value=>{
      const bits=new Uint8Array(bytes);
      const entries=value&&typeof value[Symbol.iterator]==="function"?value:[];
      for(const raw of entries){
        const index=Math.floor(Number(raw));
        if(index>=0&&index<total) bits[index>>3]|=1<<(index&7);
      }
      return [...bits].map(byte=>byte.toString(16).padStart(2,"0")).join("");
    };
    const decode=value=>{
      const result=new Set();
      const source=typeof value==="string"&&/^[0-9a-f]*$/i.test(value)?value.slice(0,bytes*2):"";
      for(let byteIndex=0;byteIndex<bytes;byteIndex++){
        const byte=Number.parseInt(source.slice(byteIndex*2,byteIndex*2+2)||"00",16)||0;
        for(let bit=0;bit<8;bit++){
          const index=byteIndex*8+bit;
          if(index<total&&(byte&(1<<bit))) result.add(index);
        }
      }
      return result;
    };
    const reveal=(set,x,y,radius)=>{
      const result=set&&typeof set.add==="function"&&typeof set.has==="function"?set:new Set();
      const centerColumn=Math.floor((Number(x)||0)/EXPLORATION_CELL_SIZE);
      const centerRow=Math.floor((Number(y)||0)/EXPLORATION_CELL_SIZE);
      const reach=Math.ceil((Number(radius)||0)/EXPLORATION_CELL_SIZE);
      let added=0;
      for(let row=centerRow-reach;row<=centerRow+reach;row++) for(let column=centerColumn-reach;column<=centerColumn+reach;column++){
        if(row<0||column<0||row>=rows||column>=columns) continue;
        const cellX=column*EXPLORATION_CELL_SIZE+EXPLORATION_CELL_SIZE/2;
        const cellY=row*EXPLORATION_CELL_SIZE+EXPLORATION_CELL_SIZE/2;
        if(Math.hypot(cellX-x,cellY-y)>radius+EXPLORATION_CELL_SIZE*.72) continue;
        const index=row*columns+column;
        if(!result.has(index)){result.add(index);added++;}
      }
      return added;
    };
    return Object.freeze({cellSize:EXPLORATION_CELL_SIZE,columns,rows,total,cellIndex,encode,decode,reveal});
  };
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
  return Object.freeze({version:WORLD_STATE_VERSION,defaultMapId,ids,get,has,exploration,normalizePosition});
}

window.TeacherQuestWorldCore=Object.freeze({version:WORLD_STATE_VERSION,createMapRegistry});
})();
