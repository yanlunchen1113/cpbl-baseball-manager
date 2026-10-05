const assert=require('node:assert/strict');
require('../baseball-engine.js');
const P=globalThis.CPBLPhysics;
let samples=0,seed=13579;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
for(const type of Object.keys(P.pitchSettings))for(const hand of ['L','R'])for(const style of ['over','side'])for(const target of [-1.6,0,1.6]){
 const f={type,hand,style,x:.4,y:target};let previous=Infinity;
 for(let n=0;n<=200;n++){const p=P.pitchPoint(f,n/200);assert(Object.values(p).every(Number.isFinite));assert(p.y<=previous+1e-9,`${type} ${hand} ${style}: upward pitch at ${n}`);previous=p.y;samples++}
 const end=P.pitchPoint(f,1);assert(Math.abs(end.x-.12)<1e-8);assert(Math.abs(end.z-.2)<1e-8);
 const mirrored=P.pitchPoint({...f,hand:hand==='R'?'L':'R',x:-f.x},.55);assert(Math.abs(mirrored.x+P.pitchPoint(f,.55).x)<1e-8);
}
const outcomes={},kinds={};
for(let i=0;i<20000;i++){
 const h=P.createPlay(.15+random()*.85,random()<.45,{x:(random()-.5)*3},random);outcomes[h.event]=(outcomes[h.event]||0)+1;kinds[h.kind]=(kinds[h.kind]||0)+1;
 assert(h.type!=='OUT'||['catch','groundout'].includes(h.event));assert(h.event!=='catch'||h.type==='OUT');assert(h.event!=='hit'||['1B','2B'].includes(h.type));
 for(let ms=0;ms<=h.durationMs;ms+=80){const point=P.playPoint(h,ms),fielder=P.fielderPoint(h,ms);assert(['x','y','z'].every(k=>Number.isFinite(point[k])));assert(point.y>=0);assert(Number.isFinite(fielder.x));assert(Number.isFinite(fielder.z));samples++}
 if(h.event==='catch'){const ball=P.playPoint(h,h.flightMs),fielder=P.fielderPoint(h,h.flightMs);assert(Math.hypot(ball.x-fielder.x,ball.z-fielder.z)<1e-8)}
 if(h.type==='1B'||h.type==='2B')assert(h.durationMs>=h.runnerDurationMs);
}
console.log(JSON.stringify({pitchTypes:Object.keys(P.pitchSettings).length,plays:20000,samples,outcomes,kinds}));
