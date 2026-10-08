/* Camera plans derived from all seven user-supplied broadcast clips.
   Fixed broadcast gantries pan and use continuous optical framing. */
(function(root){
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
 const gantries={xinzhuang:{x:-7,y:26,z:-29},taoyuan:{x:-8,y:25,z:-27},asia:{x:0,y:25,z:-27},intercontinental:{x:-7,y:28,z:-28},tianmu:{x:0,y:22,z:-25},dome:{x:0,y:30,z:-30}};
 function plan(h,t,ball,actors,phase,park){
  const gantry=gantries[park]||{x:0,y:27,z:-27},legs=h.throwLegs||[],leg=legs.find(l=>t>=l.start&&t<=l.end+250),fieldAt=h.caught?h.flightMs:h.fieldAtMs,firstThrow=legs[0]?.start??Infinity,defender=actors[h.fielder]||{x:h.land.x,y:1,z:h.land.z};
  const tag=(h.basePlays||[]).find(p=>p.kind==='tag'&&t>=p.receiveAt-150&&t<=p.end);
  let shot,eye=gantry,focus,points,margin=4,minFov=4,maxFov=42;
  if(tag){shot='tag-play';eye={x:tag.contact.x+18,y:7,z:tag.contact.z-25};focus={x:tag.contact.x,y:.7,z:tag.contact.z};points=[focus,{x:tag.receiverPosition.x,y:1.8,z:tag.receiverPosition.z}];margin=2.8;minFov=7;}
  else if(t<fieldAt){
   shot=phase==='air'&&h.kind==='fly'?'full-field':'ball-tracking';
   const ahead=root.CPBLPhysics.playPoint(h,Math.min(fieldAt,t+180)),progress=clamp(t/Math.max(1,fieldAt),0,1);
   // Opening-wide shot locates the play; optical zoom grows naturally as ball and fielder converge.
   focus=mix(ball,{x:defender.x,y:1.1,z:defender.z},shot==='full-field'?.35:.18);
   points=[ball,{x:ahead.x,y:ahead.y,z:ahead.z},{x:defender.x,y:2.3,z:defender.z}];
   margin=(shot==='full-field'?7:4)+(1-progress)*6;minFov=shot==='full-field'?5:6;maxFov=48;
   if(t<350){minFov=24;}else if(t<850){minFov=24-(t-350)/500*17;}
  }
  else if(t<firstThrow){shot='fielding';focus={x:defender.x,y:1.1,z:defender.z};points=[ball,{x:defender.x,y:2.1,z:defender.z}];margin=3.5;}
  else if(leg){
   // Follow the ball toward its receiving base, widening early enough to keep the catch in view.
   shot='throw-follow';const receiver=actors[leg.receiver]||{...leg.to,y:1.2},p=clamp((t-leg.start)/Math.max(1,leg.end-leg.start),0,1),lead=clamp((p-.20)/.80,0,1);
   focus=mix(ball,{x:receiver.x,y:1.1,z:receiver.z},lead*.65);
   points=[ball,{x:receiver.x,y:2.0,z:receiver.z}];margin=4;minFov=6;maxFov=40;
   // A cut to the baseline receiver is a separate physical camera, not a flying camera.
   if(leg.base===0&&p>.45){eye={x:42,y:9,z:-12};}
   else if(leg.base===1){eye={x:-40,y:14,z:-12};}
  }
  else{
   const last=legs.at(-1),runnerActive=(h.runnerPlans||[]).some(r=>t>=r.start&&t<Math.min(r.start+r.duration,r.outAt??Infinity));
   if(last&&runnerActive&&h.event==='hit'){shot='baserunning';focus={x:0,y:1,z:27};points=(h.runnerPlans||[]).filter(r=>r.outAt===undefined).map(r=>({...root.CPBLRules.runnerPoint(r,t),y:1.5}));eye={x:-40,y:17,z:-15};margin=7;minFov=12;}
   else{shot='fielding';focus=last?{...last.to,y:1.1}:{x:defender.x,y:1.1,z:defender.z};points=[focus];eye=last?.base===0?{x:42,y:9,z:-12}:gantry;margin=4;}
  }
  return {shot,cameraId:[eye.x,eye.y,eye.z].join(':'),eye,focus,points,margin,minFov,maxFov};
 }
 // Project object extents onto the actual camera axes, including vertical ball height.
 function framing(eye,focus,points,aspect,margin,min,max){
  const dx=focus.x-eye.x,dy=focus.y-eye.y,dz=focus.z-eye.z,d=Math.hypot(dx,dy,dz)||1,fx=dx/d,fy=dy/d,fz=dz/d,flat=Math.hypot(fx,fz)||1,rx=fz/flat,rz=-fx/flat,ux=fy*rz,uy=fz*rx-fx*rz,uz=-fy*rx;
  let tangent=0;for(const p of points||[]){const x=p.x-eye.x,y=(p.y||0)-eye.y,z=p.z-eye.z,depth=Math.max(1,x*fx+y*fy+z*fz);tangent=Math.max(tangent,(Math.abs(x*rx+z*rz)+margin)/depth/Math.max(.3,aspect),(Math.abs(x*ux+y*uy+z*uz)+margin)/depth);}
  return clamp(Math.atan(tangent)*360/Math.PI,min,max);
 }
 root.CPBLCamera={plan,framing};
})(typeof window==='undefined'?globalThis:window);
