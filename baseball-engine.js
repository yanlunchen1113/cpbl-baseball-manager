/* Shared trajectories and fielding decisions used by both renderers.
   Coordinates are metres; playback is slowed for touch controls. */
(function(root){
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
 const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
 const bases=[{x:-19.4,z:19.4},{x:0,z:38.8},{x:19.4,z:19.4},{x:0,z:0}];
 const fielders=[{x:-20,z:20},{x:-9,z:33},{x:9,z:33},{x:20,z:20},{x:40,z:75},{x:0,z:92},{x:-40,z:75},{x:0,z:18.44}];
 const pitchSettings={
  '快速球':{side:0,drop:.04},'四縫線':{side:0,drop:.04},'二縫線':{side:-.20,drop:.14},'伸卡球':{side:-.28,drop:.19},
  '卡特球':{side:.17,drop:.09},'滑球':{side:.42,drop:.24},'橫掃球':{side:.66,drop:.25},
  '曲球':{side:.17,drop:.70},'變速球':{side:-.15,drop:.32},'指叉球':{side:-.03,drop:.56},
  '掌心球':{side:-.10,drop:.54},'蝴蝶球':{side:.06,drop:.35}
 };
 function releasePoint(f){return {x:f.hand==='L'?-.42:.42,y:f.style==='side'?1.78:1.93,z:17.5}}
 function pitchPoint(f,t){
  t=clamp(t);const config=pitchSettings[f.type]||pitchSettings['快速球'],sign=f.hand==='L'?-1:1;
  const origin=f.release||releasePoint(f),release=origin.y,end=clamp(1.1-f.y*.35,.45,release-.06);
  // A high control point delays the fall; it never creates a late upward hook.
  const control=mix((release+end)/2,release-.035,clamp(config.drop/.7));
  const start=origin.x,u=1-t;
  return {x:mix(start,(f.viewSign||1)*f.x*.3,t)+sign*config.side*4*t*(1-t),y:u*u*release+2*u*t*control+t*t*end,z:mix(origin.z,.2,t)};
 }
 function wallDistance(angle){return root.CPBLStadiums?root.CPBLStadiums.distance(angle):122-22*Math.pow(Math.min(1,Math.abs(angle)/(Math.PI/4)),1.5)}
 // Metres / seconds. CPBL exit speeds are km/h; surface/reaction parameters are model assumptions.
 const movement={reaction:.22,acceleration:5.0,runSpeed:8.1,fieldSpeed:7.7,dirtFriction:2.8,grassFriction:1.7,gravity:9.81,drag:.0062,lift:.0012};
 function runDistance(seconds,maxSpeed=movement.runSpeed){const t=Math.max(0,seconds),ramp=maxSpeed/movement.acceleration;return t<ramp?.5*movement.acceleration*t*t:.5*maxSpeed*ramp+maxSpeed*(t-ramp);}
 function runTime(distance,maxSpeed=movement.runSpeed){const ramp=maxSpeed/movement.acceleration,d=.5*maxSpeed*ramp;return distance<d?Math.sqrt(2*distance/movement.acceleration):ramp+(distance-d)/maxSpeed;}
 function samplePath(samples,time){const at=clamp(time/25,0,samples.length-1),i=Math.floor(at),f=at-i,a=samples[i],b=samples[Math.min(i+1,samples.length-1)];return {distance:mix(a.distance,b.distance,f),y:mix(a.y,b.y,f),speed:mix(a.speed,b.speed,f)};}
 function createPlay(quality,power,aim={x:0,y:0},random=Math.random,runners=[],traits={}){
  const r=random(),cal=root.CPBL_MOTION_DATA,profile=cal?.players?.[traits.id]||Object.values(cal?.players||{}).find(p=>p.name===traits.name),average=profile?.exitAvg||cal?.league?.exitAvg||135.75,max=profile?.exitMax||cal?.league?.exitMax||195.86;
  const exitSpeed=clamp(average+(quality-.65)*65+(random()-.5)*20+(power?7:0),65,max),v=exitSpeed/3.6;
  let kind=power&&quality>.8&&r>.76?'homer':r<.46?'ground':r<.685?'line':'fly';
  const launchAngle=kind==='ground'?-12+random()*18:kind==='line'?8+random()*13:kind==='homer'?25+random()*10:25+random()*32,angle=clamp((random()-.5)*1.2+aim.x*.12,-.70,.70),wall=wallDistance(angle),wallHeight=root.CPBLStadiums?.wallHeight(angle)??3.4;
  const radians=launchAngle*Math.PI/180,samples=[{distance:0,y:1.05,speed:v}],dt=.025;let vx=v*Math.cos(radians),vy=v*Math.sin(radians),distance=0,y=1.05,firstGround=null,catchAt=null,wallAt=null;
  for(let n=1;n<=720;n++){
   const speed=Math.hypot(vx,vy);if(y>.037||vy>.1){const oldVx=vx;vx-=movement.drag*speed*vx*dt;vy+=(-movement.gravity-movement.drag*speed*vy+(kind==='ground'?0:movement.lift*speed*oldVx))*dt;}else{vx=Math.max(0,vx-(distance<45?movement.dirtFriction:movement.grassFriction)*dt);vy=0;}
   distance+=vx*dt;y+=vy*dt;
   if(catchAt===null&&firstGround===null&&vy<0&&y<=1.15&&n>2)catchAt={ms:n*25,distance,y:Math.max(.037,y)};
   if(y<=.037){y=.037;if(firstGround===null)firstGround=n*25;if(Math.abs(vy)>1.0){vy=Math.abs(vy)*.36;vx*=.77;}else vy=0;}
   if(wallAt===null&&distance>=wall)wallAt={ms:n*25,y};
   // Fence collision is distinct from a home run; horizontal speed loses energy.
   if(distance>wall-.45&&y<wallHeight&&wallAt?.y<wallHeight){distance=wall-.45;vx=0;}
   samples.push({distance,y,speed:Math.hypot(vx,vy)});if(firstGround!==null&&vx<.04&&vy===0)break;
  }
  const homer=wallAt&&wallAt.y>wallHeight;if(kind==='homer'&&!homer)kind='fly';if(homer)kind='homer';
  const groundTime=firstGround||samples.length*25,descending=kind!=='ground'&&catchAt?catchAt:null;
  let fielder=0,nearest=Infinity;const targetAt=descending?.distance||samplePath(samples,groundTime).distance;fielders.forEach((p,i)=>{const d=Math.hypot(Math.sin(angle)*targetAt-p.x,Math.cos(angle)*targetAt-p.z);if(d<nearest){nearest=d;fielder=i}});
  const catchable=kind!=='ground'&&!homer&&descending&&runDistance(descending.ms/1000-movement.reaction,movement.fieldSpeed)>=nearest;
  let fieldAtMs=catchable?descending.ms:groundTime,fieldSample=samplePath(samples,fieldAtMs);
  if(!catchable&&!homer){for(let ms=groundTime;ms<samples.length*25;ms+=50){const p=samplePath(samples,ms),reachable=runDistance(ms/1000-movement.reaction,movement.fieldSpeed);let best=-1,bestDistance=Infinity;fielders.forEach((f,i)=>{const d=Math.hypot(Math.sin(angle)*p.distance-f.x,Math.cos(angle)*p.distance-f.z);if(d<=reachable&&d<bestDistance){best=i;bestDistance=d;}});if(best>=0){fielder=best;fieldAtMs=ms;fieldSample=p;break;}}
   const final=samplePath(samples,fieldAtMs);const f=fielders[fielder],need=runTime(Math.hypot(Math.sin(angle)*final.distance-f.x,Math.cos(angle)*final.distance-f.z),movement.fieldSpeed)+movement.reaction;if(need*1000>fieldAtMs){fieldAtMs=need*1000;fieldSample=samplePath(samples,fieldAtMs);}}
  const flightMs=catchable?descending.ms:groundTime,landSample=samplePath(samples,flightMs),land={x:Math.sin(angle)*landSample.distance,z:Math.cos(angle)*landSample.distance},pickup={x:Math.sin(angle)*fieldSample.distance,z:Math.cos(angle)*fieldSample.distance};
  const transferMs=kind==='ground'?850:750,pickupMs=fieldAtMs+transferMs,runnerMs=(runTime(Math.hypot(19.4,19.4),movement.runSpeed)+.35)*1000,groundOut=kind==='ground'&&fielder<4&&pickupMs+Math.hypot(pickup.x-bases[0].x,pickup.z-bases[0].z)/30*1000<runnerMs;
  const distanceHit=Math.hypot(land.x,land.z),type=homer?'HR':catchable||groundOut?'OUT':distanceHit>80&&kind!=='ground'?'2B':'1B',event=homer?'homer':catchable?'catch':groundOut?'groundout':'hit',fieldTarget=catchable?land:pickup,throwBase=groundOut?0:runners[2]||runners[1]?3:runners[0]?2:1,throwTarget=bases[throwBase],relay=fielder>=4&&fielder<=6&&Math.hypot(pickup.x-throwTarget.x,pickup.z-throwTarget.z)>55?{x:pickup.x*.36+throwTarget.x*.64,z:pickup.z*.36+throwTarget.z*.64}:null;
  const relayMs=relay?Math.max(220,Math.hypot(pickup.x-relay.x,pickup.z-relay.z)/30*1000):0,finalMs=Math.max(220,Math.hypot((relay||pickup).x-throwTarget.x,(relay||pickup).z-throwTarget.z)/30*1000),throwMs=relay?relayMs+220+finalMs:finalMs,runnerDurationMs=type==='HR'?14000:runnerMs*(type==='2B'?2:1),durationMs=homer?runnerDurationMs+500:catchable?flightMs+650:Math.max(pickupMs+throwMs+650,runnerDurationMs+300);
  return {type,kind,event,quality,exitSpeed,launchAngle,trajectory:samples,angle,fieldAtMs,transferMs,land,pickup,fieldTarget,fielder,flightMs,pickupMs,throwMs,throwBase,throwTarget,relay,relayMs,finalMs,runnerMs,runnerDurationMs,durationMs,height:Math.max(...samples.map(p=>p.y)),x:640+land.x*5,y:460-land.z*2.2};
 }
 function playPoint(h,elapsed){
  const defensive=root.CPBLRules?.point(h,elapsed);if(defensive)return defensive;
  if(h.trajectory){if((h.caught||h.event==='catch')&&elapsed>=h.flightMs)return {...h.land,y:1.15,phase:'caught'};if(h.event!=='homer'&&elapsed>=h.fieldAtMs&&elapsed<h.pickupMs)return {...h.pickup,y:.20,phase:'fielded'};if(elapsed<h.pickupMs||h.event==='homer'){const p=samplePath(h.trajectory,elapsed);return {x:Math.sin(h.angle)*p.distance,z:Math.cos(h.angle)*p.distance,y:p.y,phase:h.event==='homer'&&elapsed>=h.flightMs?'home-run':elapsed<h.flightMs?'air':'rolling',speed:p.speed};}}
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
 function fielderPoint(h,elapsed){const a=fielders[h.fielder],duration=(h.caught||h.event==='catch')?h.flightMs:(h.fieldAtMs||h.pickupMs),distance=Math.hypot(h.fieldTarget.x-a.x,h.fieldTarget.z-a.z),seconds=Math.max(0,(elapsed-220)/1000),arrival=Math.max(.01,(duration-220)/1000),total=runDistance(arrival,movement.fieldSpeed),travelled=runDistance(seconds,movement.fieldSpeed),t=clamp(travelled/Math.max(.01,total));return {x:mix(a.x,h.fieldTarget.x,t),z:mix(a.z,h.fieldTarget.z,t),moving:t>0&&t<1,speed:t<1?Math.min(movement.fieldSpeed,seconds*movement.acceleration)*distance/Math.max(.01,total):0};}
 // Every defender reacts, while one pursues and the others cover or back up.
 function supportPoint(h,index,elapsed){const start=fielders[index];if(index===h.fielder)return fielderPoint(h,elapsed);if(h.event==='homer')return {...start,moving:false,speed:0};
  const receiving=(h.throwLegs||[]).find(l=>l.receiver===index);let target,role;
  if(receiving){target=receiving.receiverPosition||receiving.to;role='cover';}
  else if(index>=4){const primary=fielders[h.fielder],d=Math.hypot(start.x-h.fieldTarget.x,start.z-h.fieldTarget.z);if(h.fielder>=4&&d<65){const dx=h.fieldTarget.x-primary.x,dz=h.fieldTarget.z-primary.z,len=Math.hypot(dx,dz)||1;target={x:h.fieldTarget.x+dx/len*7,z:h.fieldTarget.z+dz/len*7};role='backup';}else{target={x:start.x+(h.fieldTarget.x-start.x)*.20,z:start.z+(h.fieldTarget.z-start.z)*.20};role='shift';}}
  else if(index===7){const b=bases[h.throwBase??0],len=Math.hypot(b.x,b.z-18.44)||1;target={x:b.x+b.x/len*6,z:b.z+(b.z-18.44)/len*6};role='backup';}
  else{target=bases[index===0?0:index===3?2:1];role='cover';if(index===1||index===2){const other=index===1?2:1;if((h.throwLegs||[]).some(l=>l.receiver===other&&l.base===1)){target={x:h.fieldTarget.x*.45,z:h.fieldTarget.z*.45+8};role='cutoff';}}}
  const distance=Math.hypot(target.x-start.x,target.z-start.z),seconds=Math.max(0,elapsed/1000-.22),travelled=Math.min(distance,runDistance(seconds,movement.fieldSpeed)),t=distance?travelled/distance:1;return {x:mix(start.x,target.x,t),z:mix(start.z,target.z,t),moving:travelled<distance&&seconds>0,speed:travelled<distance?Math.min(movement.fieldSpeed,seconds*movement.acceleration):0,role,travelled,heading:Math.atan2(target.x-start.x,target.z-start.z)};
 }
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
 root.CPBLPhysics={releasePoint,wallDistance,bases,fielders,movement,runDistance,runTime,pitchSettings,pitchPoint,createPlay,playPoint,fielderPoint,supportPoint,delivery,clamp,smooth};
})(typeof window==='undefined'?globalThis:window);
