/* Shared trajectories and fielding decisions used by both renderers.
   Coordinates are metres; playback is slowed for touch controls. */
(function(root){
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
 const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
 const bases=[{x:-19.4,z:19.4},{x:0,z:38.8},{x:19.4,z:19.4},{x:0,z:0}];
 const fielders=[{x:-20,z:20},{x:-9,z:33},{x:9,z:33},{x:20,z:20},{x:40,z:75},{x:0,z:92},{x:-40,z:75},{x:0,z:18.44}];
 const pitchSettings={
  '快速球':{side:0,drop:.04},'變化球':{side:.20,drop:.32},'四縫線':{side:0,drop:.04},'二縫線':{side:-.20,drop:.14},'伸卡球':{side:-.28,drop:.19},
  '卡特球':{side:.17,drop:.09},'滑球':{side:.42,drop:.24},'橫掃球':{side:.66,drop:.25},
  '曲球':{side:.17,drop:.70},'變速球':{side:-.15,drop:.32},'指叉球':{side:-.03,drop:.56},
  '掌心球':{side:-.10,drop:.54},'蝴蝶球':{side:.06,drop:.35}
 };
 function releasePoint(f){return {x:f.hand==='L'?-.42:.42,y:f.style==='side'?1.78:1.93,z:17.5}}
 function pitchPoint(f,t){
  t=clamp(t);const config=pitchSettings[f.type]||pitchSettings['變速球'],sign=f.hand==='L'?-1:1;
  const origin=f.release||releasePoint(f),release=origin.y,end=clamp(1.1-f.y*.35,.45,release-.06);
  // A high control point delays the fall; it never creates a late upward hook.
  const control=mix((release+end)/2,release-.035,clamp(config.drop/.7));
  const start=origin.x,u=1-t;
  return {x:mix(start,(f.viewSign||1)*f.x*.3,t)+sign*config.side*4*t*(1-t),y:u*u*release+2*u*t*control+t*t*end,z:mix(origin.z,.2,t)};
 }
 function wallDistance(angle){return 122-22*Math.pow(Math.min(1,Math.abs(angle)/(Math.PI/4)),1.5)}
 function createPlay(quality,power,aim={x:0,y:0},random=Math.random,runners=[]){
  const r=random(),kind=power&&quality>.8&&r>.76?'homer':r<.43?'ground':r<.74?'line':'fly';
  const angle=clamp((random()-.5)*1.2+aim.x*.12,-.70,.70);
  const rawDistance=kind==='homer'?125+random()*20:kind==='ground'?12+random()*49:kind==='line'?48+random()*48:55+random()*54;
  const distance=kind==='homer'?rawDistance:Math.min(rawDistance,wallDistance(angle)-3);
  const land={x:Math.sin(angle)*distance,z:Math.cos(angle)*distance};
  const roll=kind==='ground'?14+random()*12:kind==='line'?7+random()*10:4+random()*7;
  const pickupDistance=Math.min(distance+roll,wallDistance(angle)-1);
  const pickup={x:Math.sin(angle)*pickupDistance,z:Math.cos(angle)*pickupDistance};
  let fielder=0,nearest=Infinity;fielders.forEach((p,i)=>{const d=Math.hypot((kind==='ground'?pickup.x:land.x)-p.x,(kind==='ground'?pickup.z:land.z)-p.z);if(d<nearest){nearest=d;fielder=i}});
  const flightMs=kind==='ground'?650:kind==='line'?1550:kind==='homer'?4400:3500+random()*800;
  const runMs=nearest/7*1000,catchable=kind!=='ground'&&kind!=='homer'&&runMs+180<flightMs;
  const pickupMs=Math.max(flightMs+(kind==='ground'?1400:1100),runMs+200);
  const firstThrowMs=clamp(Math.hypot(pickup.x-bases[0].x,pickup.z-bases[0].z)/28*1000,500,3000);
  const runnerMs=4000+(1-quality)*350;
  const groundOut=kind==='ground'&&fielder<4&&pickupMs+firstThrowMs<runnerMs;
  const type=kind==='homer'?'HR':catchable||groundOut?'OUT':distance>82&&! (kind==='ground')?'2B':'1B';
  const event=kind==='homer'?'homer':catchable?'catch':groundOut?'groundout':'hit';
  const fieldTarget=catchable?land:pickup;
  const throwBase=groundOut?0:runners[2]||runners[1]?3:runners[0]?2:1;
  const throwTarget=bases[throwBase],relay=fielder>=4&&fielder<=6&&Math.hypot(pickup.x-throwTarget.x,pickup.z-throwTarget.z)>55?{x:pickup.x*.36+throwTarget.x*.64,z:pickup.z*.36+throwTarget.z*.64}:null;
  const relayMs=relay?Math.max(500,Math.hypot(pickup.x-relay.x,pickup.z-relay.z)/30*1000):0;
  const finalMs=Math.max(500,Math.hypot((relay||pickup).x-throwTarget.x,(relay||pickup).z-throwTarget.z)/28*1000);
  const throwMs=relay?relayMs+220+finalMs:finalMs;
  const runnerDurationMs=type==='HR'?12000:runnerMs*(type==='2B'?2:1);const durationMs=kind==='homer'?runnerDurationMs+500:catchable?flightMs+650:Math.max(pickupMs+throwMs+650,runnerDurationMs+300);
  return {type,kind,event,quality,land,pickup,fieldTarget,fielder,flightMs,pickupMs,throwMs,throwBase,throwTarget,relay,relayMs,finalMs,runnerMs,runnerDurationMs,durationMs,
   height:kind==='ground'?.30:kind==='line'?3.8:kind==='homer'?25:18,
   x:640+land.x*5,y:460-land.z*2.2};
 }
 function playPoint(h,elapsed){
  const defensive=root.CPBLRules?.point(h,elapsed);if(defensive)return defensive;
  const t=clamp(elapsed/h.flightMs);
  if(elapsed<h.flightMs)return {x:h.land.x*t,y:mix(1.1,(h.caught||h.event==='catch')?1.1:.07,t)+Math.sin(Math.PI*t)*h.height,z:h.land.z*t,phase:'air'};
  if(h.event==='homer')return {x:h.land.x,y:.07,z:h.land.z,phase:'home-run'};
  if(h.caught||h.event==='catch')return {x:h.land.x,y:1.1,z:h.land.z,phase:'caught'};
  if(elapsed<h.pickupMs){const u=clamp((elapsed-h.flightMs)/(h.pickupMs-h.flightMs)),p=(1-Math.exp(-3*u))/(1-Math.exp(-3));return {x:mix(h.land.x,h.pickup.x,p),y:.07+.28*Math.exp(-u*5)*Math.abs(Math.sin(u*Math.PI*4)),z:mix(h.land.z,h.pickup.z,p),phase:'rolling'};}
  const passed=elapsed-h.pickupMs,target=h.throwTarget||bases[h.throwBase??0];
  let a=h.pickup,b=target,u=clamp(passed/h.throwMs);
  if(h.relay){if(passed<h.relayMs){b=h.relay;u=clamp(passed/h.relayMs)}else if(passed<h.relayMs+220)return {...h.relay,y:1.2,phase:'relay'};else{a=h.relay;u=clamp((passed-h.relayMs-220)/h.finalMs)}}
  return {x:mix(a.x,b.x,u),y:1.2+Math.sin(Math.PI*u)*Math.min(2.6,Math.hypot(b.x-a.x,b.z-a.z)*.025),z:mix(a.z,b.z,u),phase:u<1?'throw':'received'};
 }
 function fielderPoint(h,elapsed){const a=fielders[h.fielder],duration=(h.caught||h.event==='catch')?h.flightMs:h.pickupMs;const t=smooth(elapsed/duration);return {x:mix(a.x,h.fieldTarget.x,t),z:mix(a.z,h.fieldTarget.z,t),moving:t>0&&t<1};}
 // Lift, stride, arm cock, release, follow-through and recovery keyframes.
 const deliveryKeys=[
  [0,0,0,-.25,-.5,-.7,0,0,0],
  [420,1.25,-1.55,-1.2,-1.2,-1.1,.40,.03,0],
  [780,.65,-.8,-2.25,-1.35,-1.05,.65,.12,.35],
  [1030,-.40,-.15,-2.6,-.85,-.6,.15,.28,.78],
  [1180,-.55,-.10,.20,-.30,-.25,-.65,.58,.9],
  [1480,-.25,0,.85,-.1,.05,-.8,.66,.85],
  [2000,0,0,-.25,-.5,-.7,0,0,0]
 ];
 function delivery(elapsed){let a=deliveryKeys[0],b=a;for(let i=1;i<deliveryKeys.length;i++){b=deliveryKeys[i];if(elapsed<=b[0])break;a=b;}const t=smooth((elapsed-a[0])/(b[0]-a[0]||1));return a.slice(1).map((v,i)=>mix(v,b[i+1],t));}
 root.CPBLPhysics={releasePoint,wallDistance,bases,fielders,pitchSettings,pitchPoint,createPlay,playPoint,fielderPoint,delivery,clamp,smooth};
})(typeof window==='undefined'?globalThis:window);
