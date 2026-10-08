/* Time-based defensive choices. Force outs, double plays and legal tag-ups. */
(function(root){const P=root.CPBLPhysics,B=P.bases;
 const travel=(a,b,speed=30)=>Math.max(220,Math.hypot(a.x-b.x,a.z-b.z)/speed*1000);
 function runnerPoint(plan,time){const t=P.clamp((Math.min(time,plan.outAt??Infinity)-plan.start)/plan.duration),total=P.runDistance(plan.duration/1000),progress=P.clamp(P.runDistance(t*plan.duration/1000)/Math.max(.01,total)),q=progress*plan.steps,i=Math.min(plan.steps-1,Math.floor(q)),f=q-i,a=B[(plan.from+i)%4],b=B[(plan.from+i+1)%4];return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f,progress,heading:Math.atan2(b.x-a.x,b.z-a.z)};}
 function finishDefense(h,context,plans,legs,caught){
  const calls=caught?[{kind:'catch',out:true,time:h.flightMs,runner:-1}]:[],plays=[];
  for(const leg of legs){if(leg.base===null)continue;
   const runner=plans.find(r=>(r.from+r.steps)%4===leg.base);if(!runner)continue;
   const arrival=runner.start+runner.duration,previousOut=calls.find(c=>c.out&&c.runner===-1&&c.time<leg.end),forced=!caught&&(runner.index===-1&&runner.steps===1||runner.index>=0&&runner.steps===1&&context.bases.slice(0,runner.index+1).every(Boolean)&&!previousOut),kind=forced?'force':'tag';
   delete runner.outAt;const time=forced?leg.end+100:Math.max(leg.end+260,arrival-140),out=time<arrival&&context.outs+calls.filter(c=>c.out).length<3;
   const incoming=B[(leg.base+3)%4],base=B[leg.base],d=Math.hypot(base.x-incoming.x,base.z-incoming.z),dx=(base.x-incoming.x)/d,dz=(base.z-incoming.z)/d;
   const contact=runnerPoint(runner,time),play={kind,base:leg.base,receiver:leg.receiver,runner:runner.index,receiveAt:leg.end,begin:forced?leg.end:Math.max(leg.end+80,arrival-420),time,end:time+950,arrival,out,contact:{x:contact.x,y:.88,z:contact.z},receiverPosition:forced?base:{x:base.x-dx*.7-dz*.35,z:base.z-dz*.7+dx*.35}};
   // Non-force plays require possession plus contact with the runner before the bag.
   play.possessionAt=leg.end;play.contactAt=kind==='tag'?time:null;play.contactDistance=Math.hypot(contact.x-play.receiverPosition.x,contact.z-play.receiverPosition.z);if(kind==='tag'&&play.contactDistance>.90)play.out=false;plays.push(play);calls.push({...play});if(play.out){runner.outAt=time;runner.outKind=kind;}else delete runner.outKind;
  }
  calls.sort((a,b)=>a.time-b.time);let outsAdded=0,third=null;for(const c of calls){if(!c.out)continue;if(context.outs+outsAdded>=3){c.out=false;const r=plans.find(p=>p.index===c.runner);if(r){delete r.outAt;delete r.outKind;}continue;}outsAdded++;if(context.outs+outsAdded===3)third=c;}
  const next=context.bases.slice(),scored=[];for(const r of plans)if(r.index>=0)next[r.index]=null;
  for(const r of plans){if(r.outAt!==undefined)continue;const name=r.index<0?context.batter:context.bases[r.index],destination=(r.from+r.steps)%4;if(destination===3)scored.push({name,time:r.start+r.duration});else if(!third)next[destination]=name;}
  const runs=scored.filter(s=>!third||third.kind!=='force'&&third.kind!=='catch'&&s.time<third.time).length;
  h.basePlays=plays;h.outCalls=calls;h.outcome.outsAdded=outsAdded;h.outcome.bases=next;h.outcome.runs=runs;h.caught=caught;
  if(plays.some(p=>p.kind==='tag'&&p.out)){h.outcome.label=caught?'接殺後觸殺':'觸殺出局';h.outcome.event=caught?'doubleplay':'tagout';h.event=h.outcome.event;h.type='OUT';}
  if(!caught&&outsAdded===0&&h.type==='OUT'){h.type='1B';h.event=h.outcome.event='hit';h.outcome.label='內野安打';}
  h.durationMs=Math.max(h.durationMs,...plays.map(p=>p.end+350),...plans.filter(p=>p.outAt!==undefined).map(p=>p.outAt+1300));return h;
 }
 function plan(h,context){const occupied=context.bases.slice(),next=occupied.slice(),outs=context.outs,batter=context.batter,run=h.runnerMs,baseRun=Math.max(1000,h.runnerMs-350),plans=[],legs=[];let outsAdded=0,runs=0,label='',event=h.event;
 const addRun=(index,steps,start=0,duration=steps===1?run:(P.runTime(27.436*steps,event==='homer'?5.5:8.1)+.35)*1000)=>{if(index<0){start+=350;if(event!=='homer')duration=Math.max(500,duration-350);}else if(event!=='homer')duration=Math.max(500,duration-350);plans.push({index,from:index<0?3:index,steps,start,duration});};
 function route(from,start,base,relay=false){let at=start,point=from;
 function legTo(foot,receiver,outBase){const d=Math.hypot(foot.x-point.x,foot.z-point.z)||1,dx=(foot.x-point.x)/d,dz=(foot.z-point.z)/d,release={x:point.x+dx*.30-dz*.18,z:point.z+dz*.30+dx*.18,y:1.35},receive={x:foot.x-dx*.38,z:foot.z-dz*.38,y:1.15},end=at+travel(release,receive,30);legs.push({from:release,to:receive,receiverPosition:foot,start:at,end,base:outBase,receiver});at=end;point=foot;return end;}
 if(relay){const cut={x:from.x*.36+B[base].x*.64,z:from.z*.36+B[base].z*.64};legTo(cut,2,null);at+=550;}
 return legTo(B[base],base===3?8:base===2?(h.fielder===3?2:3):base===1?(h.fielder===1?2:1):(h.fielder===0?7:0),base);}
 if(event==='homer'||event==='hit'&&h.kind!=='ground'||event==='hit'&&h.fielder>=4&&h.fielder<=6){const steps=h.type==='HR'?4:h.type==='2B'?2:1;next.fill(null);occupied.forEach((name,i)=>{if(name){addRun(i,Math.min(steps,3-i));if(i+steps>=3)runs++;else next[i+steps]=name;}});addRun(-1,steps);if(steps===4)runs++;else next[steps-1]=batter;if(event!=='homer')route(h.pickup,h.pickupMs,h.throwBase,h.relay!==null);label=steps===4?'全壘打':steps===2?'二壘安打':'安打';}
 else if(event==='catch'){
  outsAdded=1;label='接殺';if(outs<2&&h.kind==='fly'){
   // Runners hold their bags until the catch; attempt only when a safe advance is available.
   const returnTime=h.flightMs+650+travel(h.land,B[3])+(h.fielder>=4?220:0);
   if(occupied[2]&&Math.hypot(h.land.x,h.land.z)>60&&h.flightMs+baseRun<returnTime){next[2]=null;runs++;event='sacfly';label='高飛犧牲打';addRun(2,1,h.flightMs,run);route(h.land,h.flightMs+650,3,h.fielder>=4);}
   if(occupied[1]&&!next[2]&&(event==='sacfly'||h.land.x<-15&&Math.hypot(h.land.x,h.land.z)>90)){next[2]=occupied[1];next[1]=null;addRun(1,1,h.flightMs,run);}
  }
 }
 else{
  const atFirst=h.pickupMs+travel(h.pickup,B[0]),atSecond=h.pickupMs+travel(h.pickup,B[1]),turn=atSecond+550+travel(B[1],B[0]);
  const forceHome=occupied.every(Boolean),homeTime=h.pickupMs+travel(h.pickup,B[3]);
  let force=occupied[0]&&atSecond<baseRun?1:null;
  if(forceHome&&homeTime<baseRun&&(outs===2||context.inning>=7&&Math.abs(context.runDifference)<=2))force=3;
  if(force!==null){
   const arrival=route(h.pickup,h.pickupMs,force);outsAdded=1;event='fielderschoice';label='野手選擇';
   const removed=force===3?2:force-1;next[removed]=null;
   for(let i=2;i>=0;i--){if(!occupied[i]||i===removed)continue;const forced=occupied.slice(0,i+1).every(Boolean);if(forced){next[i]=null;if(i===2){if(outs+outsAdded<3)runs++;}else next[i+1]=occupied[i];addRun(i,1);}}
   addRun(removed,1,0,run);plans.at(-1).outAt=arrival;next[0]=batter;addRun(-1,1);
   const back=arrival+550+travel(B[force],B[0]);if(outs<2&&back<run){route(B[force],arrival+550,0);outsAdded=2;plans.find(p=>p.index===-1).outAt=back;next[0]=null;event='doubleplay';label=force===3?'本壘—一壘雙殺':'雙殺';}
  }else if(atFirst<run){outsAdded=1;event='groundout';label='刺殺';route(h.pickup,h.pickupMs,0);addRun(-1,1);plans.at(-1).outAt=atFirst;if(outs<2&&h.pickup.z>20&&occupied[2]){next[2]=null;runs++;addRun(2,1);}if(outs<2&&h.pickup.x<0&&occupied[1]&&!next[2]){next[2]=occupied[1];next[1]=null;addRun(1,1);}}
  else{event='hit';label='內野安打';next.fill(null);occupied.forEach((name,i)=>{if(name){addRun(i,1);if(i===2)runs++;else next[i+1]=name;}});next[0]=batter;addRun(-1,1);route(h.pickup,h.pickupMs,1);}
 }
 // A third force out, or the batter's third out before first, cancels runs on the play.
 if(outs+outsAdded>=3)runs=0;
 h.event=event;h.caught=h.event==='catch'||h.event==='sacfly';h.outcome={outsAdded,bases:next,runs,label,event};h.runnerPlans=plans;h.throwLegs=legs;
 h.type=outsAdded||event==='fielderschoice'?'OUT':h.type;
 if(legs.length){const last=legs.at(-1);h.throwBase=last.base;h.throwTarget=last.to;h.throwMs=last.end-h.pickupMs;}
 h.durationMs=Math.max(h.flightMs+650,...legs.map(l=>l.end+650),...plans.map(r=>r.start+r.duration+300));if(outs+outsAdded>=3)h.durationMs=Math.max(h.flightMs+650,...legs.map(l=>l.end+650));
 return finishDefense(h,context,plans,legs,h.caught);
 }
 function point(h,elapsed){if(!h.throwLegs?.length)return null;const first=h.throwLegs[0];if(elapsed<first.start)return null;let previous=null;for(const leg of h.throwLegs){if(elapsed<leg.start)return {...previous.to,y:previous.to.y||1.15,phase:'relay',receiver:previous.receiver,base:previous.base};if(elapsed<=leg.end){const t=P.clamp((elapsed-leg.start)/(leg.end-leg.start));return {x:leg.from.x+(leg.to.x-leg.from.x)*t,z:leg.from.z+(leg.to.z-leg.from.z)*t,y:(leg.from.y||1.35)+((leg.to.y||1.15)-(leg.from.y||1.35))*t+.5*9.81*Math.pow((leg.end-leg.start)/1000,2)*t*(1-t),phase:'throw',receiver:leg.receiver,base:leg.base};}previous=leg;}return {...previous.to,y:previous.to.y||1.15,phase:'received',receiver:previous.receiver,base:previous.base};}
 root.CPBLRules={plan,point,runnerPoint};
})(typeof window==='undefined'?globalThis:window);
