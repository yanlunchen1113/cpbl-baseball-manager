/* Dead-ball timelines: one authoritative result; replay never changes game state. */
(function(root){
 const badge=document.createElement('div');badge.className='deadball-banner';badge.hidden=true;stage.append(badge);
 const clamp=CPBLPhysics.clamp,smooth=CPBLPhysics.smooth,lerp=(a,b,t)=>a+(b-a)*t;
 function start(kind,options={}){
  const side=battingTeam(),id=tv.lineupIds?.[side]?.[state.orders[side]%9],left=playerTraits.get(id)?.batHand==='L',sign=left?-1:1;
  const s={kind,start:performance.now(),batSide:side,batter:batterName(),left,sign,bases:state.bases.slice(),committed:false,flightMs:2600,...options};
  s.impact=tv.flight?CPBLPhysics.pitchPoint(tv.flight,1):{x:sign*1.1,y:1.1,z:.2};
  if(kind==='foul'){
   s.ground=options.ground??Math.random()<.35;s.caught=!s.ground&&(options.caught??Math.random()<.22);
   s.target=s.caught?{x:sign*3,z:-4.5,y:1.45}:s.ground?{x:sign*27,z:12,y:.05}:{x:sign*13,z:-17,y:.5};
   if(s.ground)s.flightMs=850;
   s.liveEnd=s.ground?3300:3100;s.replayAt=s.liveEnd+1400;s.duration=s.replayAt+s.liveEnd*2+450;
   tv.pendingPitch=null;tv.returnBall=null;if(!s.caught)foul();
   announce(s.caught?'界外飛球 · 守備追球':'FOUL · 界外球');
  }else{
   s.runStart=kind==='hbp'?2300:1200;s.runDuration=7200;s.duration=s.runStart+s.runDuration+550;
   tv.returnBall=null;announce(kind==='hbp'?'觸身球 · 死球':'四壞球保送');
  }
  tv.interlude=s;tv.phase='deadball';tv.start=s.start;tv.hit=null;state.busy=true;render();return s;
 }
 function sample(s,stamp){
  const age=Math.max(0,stamp-s.start),replay=s.kind==='foul'&&age>=s.replayAt,t=replay?Math.min(s.liveEnd,(age-s.replayAt)*.5):Math.min(age,s.liveEnd??age);
  return {age,t,replay,reaction:s.kind==='foul'&&!replay&&age>=s.liveEnd};
 }
 function ballPoint(s,t){
  const u=clamp(t/s.flightMs),from={x:0,y:1.1,z:.2},p={x:lerp(from.x,s.target.x,u),z:lerp(from.z,s.target.z,u),y:lerp(from.y,s.target.y,u)+4.905*(s.flightMs/1000)**2*u*(1-u)};
  if(s.ground&&t>s.flightMs){const q=(t-s.flightMs)/1000,roll=9*(1-Math.exp(-q*1.5))/1.5;p.x+=s.sign*roll;p.z+=roll*.4;p.y=.05+.18*Math.abs(Math.sin(q*18))*Math.exp(-q*5);}
  return p;
 }
 function runPoint(s,index,age){
  const from=index<0?{x:s.sign*1.1,y:0,z:.15}:CPBLPhysics.bases[index],to=CPBLPhysics.bases[index+1],start=s.runStart+(index<0?0:350),u=clamp((age-start)/s.runDuration),f=clamp((u-.06)/.94);
  const progress=f*f*(3-2*f),distance=Math.hypot(to.x-from.x,to.z-from.z);
  return {x:lerp(from.x,to.x,progress),z:lerp(from.z,to.z,progress),progress,travelled:distance*progress,speed:6*f*(1-f)*distance/(s.runDuration*.001*.94),heading:Math.atan2(to.x-from.x,to.z-from.z)};
 }
 function complete(s){
  if(s.committed)return;s.committed=true;
  if(s.kind==='foul'&&s.caught){root.CPBLBroadcast?.book('OUT',{outs:1});state.outs++;log(s.batter+' 界外飛球遭捕手接殺。');nextBatter();resetCount();if(state.outs>=3)endHalf();}
  if(s.kind==='hbp'){
   root.CPBLBroadcast?.book('HBP',{runs:s.bases.every(Boolean)?1:0});
   if(state.bases[0]){if(state.bases[1]){if(state.bases[2])score('觸身球擠回');state.bases[2]=state.bases[1];}state.bases[1]=state.bases[0];}state.bases[0]=s.batter;nextBatter();resetCount();log(s.batter+' 觸身球上壘。');tv.pendingPitch=null;checkWalkoff();
  }
  badge.hidden=true;tv.interlude=null;resultReset();
 }
 function tick(stamp){const s=tv.interlude;if(!s||tv.phase!=='deadball')return;const age=stamp-s.start;
  const replay=s.kind==='foul'&&age>=s.replayAt;badge.hidden=false;const mode=replay?'replay':s.kind;if(s.badgeMode!==mode){s.badgeMode=mode;badge.innerHTML=replay?'<b>REPLAY · 慢動作</b><button type="button" class="skip-foul-replay">略過重播 ›</button>':'<b>'+(s.kind==='walk'?'四壞保送':s.kind==='hbp'?'觸身球 · 死球':s.caught?'界外飛球':'界外球')+'</b>';if(replay)badge.querySelector('button').onclick=()=>root.CPBLDeadball.skipReplay();}
  if(s.kind==='foul'&&s.caught&&age>=s.flightMs&&!s.catchSound){s.catchSound=true;contactSound('glove');announce('界外飛球接殺！');}
  if(age>=s.duration)complete(s);
 }
 const oldFinish=finishPitch;finishPitch=function(){
  const f=tv.flight,p=CPBLPhysics.pitchPoint(f,1),side=battingTeam(),left=playerTraits.get(tv.lineupIds?.[side]?.[state.orders[side]%9])?.batHand==='L',sign=left?-1:1;
  if((playerBatting()?!tv.swung:!f.cpuSwing)&&Math.abs(p.x-sign*1.1)<.23&&p.y>.65&&p.y<1.6){tv.pendingPitch={hbp:true,strike:false,text:'觸身球',at:performance.now()};tv.pitchSignal='hbp';start('hbp');return;}
  oldFinish();if(tv.pitchSignal==='foul'&&tv.phase==='result'){
   // The old foul branch has already counted a strike. Undo only its own increment.
   state.strikes=tv.prePitchStrikes??state.strikes;start('foul');
  }else if(tv.pendingPitch&&!tv.pendingPitch.strike)start('walk');
 };
 const oldBegin=beginPitch;beginPitch=function(...args){tv.prePitchStrikes=state.strikes;oldBegin.apply(this,args);
  // Occasional wild release targets the body; the collision above, not chance alone, awards HBP.
  if(Math.random()<.004){const side=battingTeam(),left=playerTraits.get(tv.lineupIds?.[side]?.[state.orders[side]%9])?.batHand==='L';tv.flight.x=(left?-1:1)*1.1/((tv.flight.viewSign||1)*(tv.flight.zone?.halfWidth||.3));tv.flight.y=.15;tv.flight.cpuSwing=false;}
 };
 const oldReset=resultReset;resultReset=function(...args){tv.interlude=null;return oldReset.apply(this,args);};
 const oldStart=startGame;startGame=function(...args){badge.hidden=true;tv.interlude=null;return oldStart.apply(this,args);};
 const oldLeave=leaveGame;leaveGame=function(...args){badge.hidden=true;tv.interlude=null;return oldLeave.apply(this,args);};
 const oldPause=pause;pause=function(...args){const was=tv.paused,at=tv.pauseAt;oldPause.apply(this,args);if(was&&!tv.paused&&tv.interlude)tv.interlude.start+=performance.now()-at;};
 root.CPBLDeadball={start,sample,ballPoint,runPoint,tick,complete,skipReplay(){const s=tv.interlude;if(s?.kind==='foul'&&performance.now()-s.start>=s.replayAt)complete(s);}};
})(window);
