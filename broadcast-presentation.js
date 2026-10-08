/* Broadcast rundown observed in the user's complete 137.58-second recording.
   Official single-game figures and game-season figures never share a ledger. */
(()=>{
 const data=window.CPBL_BROADCAST_DATA||{batters:{},pitchers:{},positions:{}},posNames={P:'投手',C:'捕手','1B':'一壘手','2B':'二壘手','3B':'三壘手',SS:'游擊手',LF:'左外野手',CF:'中外野手',RF:'右外野手',DH:'指定打擊'},codes=Object.fromEntries(Object.entries(posNames).map(([k,v])=>[v,k]));
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function allowed(p){return new Set([codes[p.position],...Object.keys(data.positions[p.id]||{}),'DH'].filter(Boolean));}
 function lineup(index){
  const pool=rosterPlayers(index).filter(p=>!p.isPitcher),previous=PLAYERS[index]||[],rank=p=>(p.level===1?0:100)+(previous.includes(p.name)?previous.indexOf(p.name):20);
  const slots=['C','1B','2B','3B','SS','LF','CF','RF'];slots.sort((a,b)=>pool.filter(p=>allowed(p).has(a)).length-pool.filter(p=>allowed(p).has(b)).length);
  const assigned={},used=new Set();
  function match(n){if(n===slots.length)return true;const pos=slots[n],candidates=pool.filter(p=>!used.has(p.id)&&allowed(p).has(pos)).sort((a,b)=>rank(a)-rank(b)+(codes[a.position]===pos?-3:0)-(codes[b.position]===pos?-3:0));for(const p of candidates){assigned[pos]=p;used.add(p.id);if(match(n+1))return true;used.delete(p.id);}return false;}
  if(!match(0))throw Error('官網紀錄不足，無法組成合法守備陣容：'+TEAMS[index].name);
  assigned.DH=pool.filter(p=>!used.has(p.id)).sort((a,b)=>rank(a)-rank(b))[0];
  if(!assigned.DH)throw Error('打線人數不足');
  return Object.entries(assigned).map(([position,p])=>({...p,assignedPosition:position})).sort((a,b)=>rank(a)-rank(b));
 }
 lineupFor=lineup;
 function fieldPlayer(side,pos){if(pos==='P')return tv.pitchers[side];return tv.fieldLineups?.[side]?.find(p=>p.assignedPosition===pos);}
 function canReplace(side,p){const current=tv.fieldLineups?.[side]?.[state.orders[side]%9];return !!current&&allowed(p).has(current.assignedPosition);}
 const blank=()=>({pa:0,ab:0,h:0,tb:0,hr:0,bb:0,k:0,sf:0,rbi:0,outs:0,bf:0,ha:0,baa:0,abAgainst:0,rispAB:0,rispH:0,loadedAB:0,loadedH:0,g:0});
 let gameStats={},rundown=[],current=null,seenBat='',seenPitch=new Set(),seenHalf='',lastFrame=0,simulation=false;
 const stats=(store,id)=>store[id]||(store[id]=blank());
 function total(id){const a=state.mode==='season'?state.season?.playerStats?.[id]:null,b=gameStats[id],v=blank();for(const k in v)v[k]=(a?.[k]||0)+(b?.[k]||0);return v;}
 const avg=(h,ab)=>ab?Math.min(1,h/ab).toFixed(3).replace(/^0/,''):'—',rate=(value)=>Number.isFinite(value)?value.toFixed(3).replace(/^0/,''):'—';
 function values(p,kind,page=0){
  if(state.mode!=='season'){
   const r=(kind==='pitcher'?data.pitchers:data.batters)[p?.id];
   if(!r)return [['球季成績','—'],['尚無紀錄','—']];
   if(kind==='pitcher')return page?[['被打擊率',rate(r.ba)],['被上壘率',rate(r.obp)],['被長打率',rate(r.slg)]]:[['面對打席',r.pa],['三振率',(r.kp*100).toFixed(1)+'%'],['保送率',(r.bbp*100).toFixed(1)+'%']];
   return [['打席',r.pa],['打擊率',rate(r.ba)],['上壘率',rate(r.obp)],['長打率',rate(r.slg)]];
  }
  const r=total(p?.id);
  if(kind==='pitcher')return page?[['被安打',r.ha],['三振',r.k],['四壞',r.bb],['WHIP',r.outs?((r.ha+r.bb)*3/r.outs).toFixed(2):'—']]:[['登板',r.g],['局數',Math.floor(r.outs/3)+'.'+r.outs%3],['面對打席',r.bf],['被打擊率',avg(r.ha,r.abAgainst)]];
  return [['打數',r.ab],['安打',r.h],['全壘打',r.hr],['打點',r.rbi],['打擊率',avg(r.h,r.ab)]];
 }
 function subtitle(p,kind){if(state.mode==='season')return '遊戲賽季 · '+(state.season?.round+1||1)+' 場';const r=(kind==='pitcher'?data.pitchers:data.batters)[p?.id];return (data.year||2026)+' 球季'+(r?.level===2?' · 二軍':' · 一軍')+' · '+String(data.updatedAt||'').slice(0,10);}
 function situation(p){const loaded=state.bases.every(Boolean),risp=!!(state.bases[1]||state.bases[2]);if(!risp)return '';if(state.mode==='season'){const r=total(p?.id),ab=loaded?r.loadedAB:r.rispAB,h=loaded?r.loadedH:r.rispH;return '<div class="situation-strip">'+(loaded?'滿壘':'得點圈')+'打擊率 <b>'+avg(h,ab)+'</b><span>'+h+' 安打 / '+ab+' 打數</span></div>';}
  // A verified situation split must be supplied explicitly; never substitute overall AVG.
  const r=data.batters[p?.id],split=loaded?r?.loaded:r?.risp;return '<div class="situation-strip">'+(loaded?'滿壘攻勢':'得點圈機會')+'<b>'+(split?avg(split.h,split.ab):'情境成績未提供')+'</b></div>';
 }
 const overlay=document.createElement('section');overlay.className='broadcast-intro';overlay.hidden=true;overlay.setAttribute('aria-label','比賽轉播介紹');stage.append(overlay);
 function logo(index){return '<img src="'+TEAMS[index].logo+'" alt="'+escape(TEAMS[index].name)+'隊徽">';}
 function header(index,label){return '<header>'+logo(index)+'<div><small>'+escape(label)+'</small><h2>'+escape(TEAMS[index].name)+'</h2></div></header>';}
 function lineupCard(side){const index=side?state.homeIndex:state.awayIndex;return '<div class="lineup-card" style="--team:'+TEAMS[index].color+'">'+header(index,state.inning+' 局'+(state.half==='top'?'上':'下')+' · 先發打序')+'<div class="order-head"><span>棒次</span><span>球員</span><span>守位</span><span>投 / 打</span></div>'+tv.fieldLineups[side].map((p,i)=>'<div class="order-row"><b>'+(i+1)+'</b><span><small>'+escape(p.number)+'</small>'+escape(p.name)+'</span><strong>'+p.assignedPosition+'</strong><em>'+(p.hand||'?')+' / '+(p.batHand||'?')+'</em></div>').join('')+'</div>';}
 const layout={CF:[50,12],LF:[20,29],RF:[80,29],SS:[35,46],'2B':[65,46],'3B':[21,66],'1B':[79,66],P:[50,66],C:[50,87]};
 function defenseCard(side){const index=side?state.homeIndex:state.awayIndex;return '<div class="defense-card" style="--team:'+TEAMS[index].color+'">'+header(index,'先發守備陣容')+'<div class="defense-map"><div class="diagram-grass"></div><div class="diagram-diamond"></div>'+Object.entries(layout).map(([pos,[x,y]])=>{const p=fieldPlayer(side,pos);return '<div class="defense-player" style="left:'+x+'%;top:'+y+'%"><small>'+pos+'</small><b><i>'+escape(p?.number||'')+'</i>'+escape(p?.name||'未配置')+'</b></div>';}).join('')+'</div></div>';}
 function playerCard(item,page){const side=item.side,index=side?state.homeIndex:state.awayIndex,p=item.player,kind=item.kind;return '<div class="player-card" style="--team:'+TEAMS[index].color+'">'+logo(index)+'<div class="player-card-body"><header><strong><small>'+escape(p?.number||'')+'</small>'+escape(p?.name||'')+'</strong><span>'+escape(kind==='pitcher'?(p.hand==='L'?'LHP':'RHP'):p.assignedPosition||'DH')+'</span><em>'+subtitle(p,kind)+'</em></header><div class="stat-grid">'+values(p,kind,page).map(([label,value])=>'<div><small>'+escape(label)+'</small><b>'+escape(value)+'</b></div>').join('')+'</div>'+ (kind==='batter'?situation(p):'')+'</div></div>';}
 function markup(item,page){if(item.kind==='matchup')return '<div class="matchup-card"><small>2026 CPBL · '+(state.postseason?'POSTSEASON':'PLAY BALL')+'</small><h1>'+escape(CPBLStadiums.active.name||TEAMS[state.homeIndex].stadium)+'</h1><div class="matchup-teams"><div>'+logo(state.awayIndex)+'<small>AWAY</small><strong>'+escape(TEAMS[state.awayIndex].name)+'</strong></div><b>VS</b><div>'+logo(state.homeIndex)+'<small>HOME</small><strong>'+escape(TEAMS[state.homeIndex].name)+'</strong></div></div><p>'+ (state.mode==='season'?'遊戲賽季 · 第 '+(state.season.round+1)+' 場':'單場比賽')+'</p></div>';
  if(item.kind==='lineup')return lineupCard(item.side);if(item.kind==='defense')return defenseCard(item.side);return playerCard(item,page);}
 function queue(kind,side,player){rundown.push({kind,side,player,duration:kind==='matchup'?3800:kind==='lineup'?5800:kind==='defense'?5000:kind==='pitcher'?6400:4000});}
 function upcoming(){if(state.over||tv.phase!=='ready'||$('#gameScreen').classList.contains('hidden'))return;const half=state.inning+state.half;
  if(half!==seenHalf){seenHalf=half;if(state.inning===1){queue('lineup',battingTeam());queue('defense',fieldingTeam());}}
  const p=activePitcher(),pitchKey=fieldingTeam()+':'+p.id;if(!seenPitch.has(pitchKey)){seenPitch.add(pitchKey);queue('pitcher',fieldingTeam(),p);if(state.mode==='season')stats(gameStats,p.id).g++;}
  const key=battingTeam()+':'+state.orders[battingTeam()]+':'+batterName();if(key!==seenBat){seenBat=key;queue('batter',battingTeam(),tv.fieldLineups[battingTeam()][state.orders[battingTeam()]%9]);}
 }
 function showNext(now){current=rundown.shift()||null;if(current){current.start=now;lastFrame=now;current.page=-1;overlay.hidden=false;stage.classList.add('has-intro');tv.presentation=current;}else{overlay.hidden=true;stage.classList.remove('has-intro');tv.presentation=null;stage.dataset.introKind='';}}
 function draw(now){if(document.hidden||$('#gameScreen').classList.contains('hidden'))return;upcoming();if(!current&&rundown.length)showNext(now);if(!current)return;
  if(tv.paused){current.start+=Math.max(0,now-lastFrame);lastFrame=now;return;}lastFrame=now;if(now-current.start>=current.duration){showNext(now);if(!current)return;}
  const page=current.kind==='pitcher'&&now-current.start>3200?1:0;if(current.page!==page){current.page=page;overlay.innerHTML=markup(current,page)+'<button class="intro-skip" type="button">略過介紹 ›</button>';overlay.querySelector('.intro-skip').onclick=()=>showNext(performance.now());}
  stage.dataset.introKind=current.kind;
 }
 const frame=now=>{draw(now);requestAnimationFrame(frame);};requestAnimationFrame(frame);
 const baseControl=controlDown;controlDown=function(){if(current||rundown.length){showNext(performance.now());return;}baseControl();};
 function book(result,{hit=0,bases=0,runs=0,outs=0}={}){if(state.mode!=='season')return;const side=battingTeam(),id=tv.lineupIds[side][state.orders[side]%9],pid=activePitcher().id,b=stats(gameStats,id),p=stats(gameStats,pid),risp=!!(state.bases[1]||state.bases[2]),loaded=state.bases.every(Boolean),ab=!['BB','SF'].includes(result);b.pa++;p.bf++;p.outs+=outs;if(ab){b.ab++;p.abAgainst++;if(risp)b.rispAB++;if(loaded)b.loadedAB++;}if(hit){b.h++;b.tb+=bases;b.hr+=bases===4?1:0;p.ha++;if(risp)b.rispH++;if(loaded)b.loadedH++;}if(result==='BB'){b.bb++;p.bb++;}if(result==='K'){b.k++;p.k++;}if(result==='SF')b.sf++;b.rbi+=runs;}
 const oldStrike=applyStrike;applyStrike=function(...args){if(state.strikes===2)book('K',{outs:1});return oldStrike.apply(this,args);};
 const oldWalk=walk;walk=function(...args){book('BB',{runs:state.bases.every(Boolean)?1:0});return oldWalk.apply(this,args);};
 const oldHit=applyHit;applyHit=function(type){const h=tv.hit,o=h?.outcome,hit=!!h?.hitCredit||(!o&&['1B','2B','3B','HR'].includes(type)),bases=h?.hitBases||{'1B':1,'2B':2,'3B':3,HR:4}[type]||1;book(o?.event==='sacfly'?'SF':hit?'H':'OUT',{hit:hit?1:0,bases,runs:o?.runs||0,outs:o?.outsAdded??(hit?0:1)});return oldHit(type);};
 function mergeGame(){if(state.mode!=='season'||state.broadcastStatsCommitted)return;state.broadcastStatsCommitted=true;const store=state.season.playerStats||(state.season.playerStats={});for(const [id,b]of Object.entries(gameStats)){const a=stats(store,id);for(const k of Object.keys(a))a[k]+=b[k]||0;}gameStats={};saveSeason();}
 const oldFinish=finishGame;finishGame=function(...args){mergeGame();return oldFinish.apply(this,args);};
 const oldResult=addResult;addResult=function(table,fixture,runs){oldResult(table,fixture,runs);if(table!==state.season?.standings)return;if(!simulation&&fixture.away===state.awayIndex&&fixture.home===state.homeIndex)return;simulateStats(fixture,runs);};
 function simulateStats(fixture,runs){
  const store=state.season.playerStats||(state.season.playerStats={});
  for(const [side,team]of [fixture.away,fixture.home].entries()){
   const batting=lineup(team),p=stats(store,starterFor(side?fixture.away:fixture.home).id),outs=side===1&&runs[1]>runs[0]?24:27;
   const hits=Math.max(runs[side],5+Math.floor(Math.random()*8)),walks=Math.floor(Math.random()*4),ab=outs+hits,bf=ab+walks;
   p.g++;p.outs+=outs;p.ha+=hits;p.abAgainst+=ab;p.bf+=bf;p.bb+=walks;
   let k=Math.min(outs,3+Math.floor(Math.random()*8));p.k+=k;
   const boxes=batting.map(()=>blank());
   for(let n=0;n<ab;n++){const b=boxes[n%9];b.ab++;b.pa++;if(n<hits){const roll=Math.random(),bases=roll<.71?1:roll<.91?2:roll<.94?3:4;b.h++;b.tb+=bases;if(bases===4)b.hr++;}else if(k>0){b.k++;k--;}}
   for(let n=0;n<walks;n++){const b=boxes[Math.floor(Math.random()*9)];b.bb++;b.pa++;}
   // Generated box scores belong to simulated fixtures, never official-player snapshots.
   // Keep home-run RBI within the fixture's recorded score.
   let credits=runs[side];for(const b of boxes){const credited=Math.min(credits,b.hr);b.rbi+=credited;credits-=credited;if(b.hr>credited){b.tb-=(b.hr-credited)*3;b.hr=credited;}}
   for(let n=0;n<credits;n++)boxes[Math.floor(Math.random()*9)].rbi++;
   boxes.forEach((b,i)=>{const dst=stats(store,batting[i].id);for(const key in b)dst[key]+=b[key];});
  }
 }
 const oldAdvance=advanceSeason;advanceSeason=function(...args){simulation=true;try{return oldAdvance.apply(this,args);}finally{simulation=false;}};
 const oldSeries=recordSeries;recordSeries=function(fixture,runs){if(simulation)simulateStats(fixture,runs);return oldSeries(fixture,runs);};
 const oldStart=startGame;startGame=function(...args){gameStats={};rundown=[];current=null;seenBat=seenHalf='';seenPitch=new Set();tv.presentation=null;overlay.hidden=true;stage.classList.remove('has-intro');state.broadcastStatsCommitted=false;oldStart.apply(this,args);tv.fieldLineups=[lineup(state.awayIndex),lineup(state.homeIndex)];tv.fieldLineups.forEach((players,side)=>{PLAYERS[side?state.homeIndex:state.awayIndex]=players.map(p=>p.name);tv.lineupIds[side]=players.map(p=>p.id);});queue('matchup');render();};
 const oldLeave=leaveGame;leaveGame=function(...args){rundown=[];current=null;tv.presentation=null;overlay.hidden=true;stage.classList.remove('has-intro');return oldLeave.apply(this,args);};
 window.CPBLBroadcast={draw,allowed,canReplace,lineup,fieldPlayer,posNames,codes,total,values,book,simulateStats,skipAll(){rundown=[];current=null;tv.presentation=null;overlay.hidden=true;stage.classList.remove('has-intro');},preview(kind){rundown=[];current=null;queue(kind,kind==='defense'?fieldingTeam():kind==='pitcher'?fieldingTeam():battingTeam(),kind==='pitcher'?activePitcher():tv.fieldLineups?.[battingTeam()]?.[state.orders[battingTeam()]%9]);draw(performance.now());}};
})();
