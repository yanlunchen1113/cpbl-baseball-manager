const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{},Math};context.window=context;vm.createContext(context);
for(const file of ['motion-calibration.js','baseball-engine.js'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8'),context);
const P=context.CPBLPhysics,stats=context.CPBL_MOTION_DATA;assert(Object.keys(stats.players).length>=170);
assert(P.runTime(27.436)>3.5&&P.runTime(27.436)<4.6);
for(const speed of [6,7.7,8.1,9])for(const distance of [2,10,27.436,54.872])assert(Math.abs(P.runDistance(P.runTime(distance,speed),speed)-distance)<1e-8);
let seed=4567;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
let air=0,ground=0,caught=0;
for(let n=0;n<5000;n++){
 const h=P.createPlay(rand(),rand()<.4,{x:rand()*2-1},rand,[],{id:n%2?'0000007239':'unknown'});
 assert(h.exitSpeed>=65&&h.exitSpeed<=195.87);assert(Math.abs(h.trajectory[0].speed-h.exitSpeed/3.6)<1e-8);
 if(h.kind==='ground')ground++;else air++;if(h.event==='catch')caught++;
 for(const point of h.trajectory)assert(Number.isFinite(point.distance)&&point.y>=.037&&point.speed>=0);
 if(h.event!=='homer')assert(h.pickupMs>=h.fieldAtMs+400);
 const f=P.fielderPoint(h,h.caught?h.flightMs:h.fieldAtMs);assert(Math.hypot(f.x-h.fieldTarget.x,f.z-h.fieldTarget.z)<1e-5);
}
assert(air&&ground&&caught);console.log(JSON.stringify({officialPlayers:Object.keys(stats.players).length,plays:5000,air,ground,caught,homeToFirstSeconds:P.runTime(27.436)+.35}));
