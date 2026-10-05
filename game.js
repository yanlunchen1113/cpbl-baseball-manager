const TEAMS=[
  {name:'中信兄弟',mark:'兄',color:'#e8b421',stadium:'臺中洲際棒球場'},
  {name:'統一7-ELEVEn獅',mark:'獅',color:'#f2b82d',stadium:'亞太成棒主球場'},
  {name:'樂天桃猿',mark:'猿',color:'#b52c36',stadium:'樂天桃園棒球場'},
  {name:'富邦悍將',mark:'悍',color:'#1c4777',stadium:'新莊棒球場'},
  {name:'味全龍',mark:'龍',color:'#ae292b',stadium:'臺北大巨蛋'},
  {name:'台鋼雄鷹',mark:'鷹',color:'#1c563c',stadium:'澄清湖棒球場'}
];
const PLAYERS=[
  ['詹子賢','岳東華','許基宏','陳子豪','江坤宇','王威晨','陳文杰','高宇杰','岳政華'],
  ['陳傑憲','林安可','蘇智傑','陳鏞基','潘傑楷','林子豪','林岱安','邱智呈','林靖凱'],
  ['林立','梁家榮','陳晨威','廖健富','朱育賢','林承飛','成晉','嚴宏鈞','余德龍'],
  ['張育成','王正棠','范國宸','戴培峰','高國麟','申皓瑋','孔念恩','陳真','李宗賢'],
  ['吉力吉撈・鞏冠','李凱威','林孝程','劉基鴻','張祐銘','郭天信','吳東融','蔣少宏','曾傳昇'],
  ['王柏融','曾子祐','魔鷹','吳念庭','葉保弟','陳文杰','杜家明','張肇元','林家鋐']
];
const $=s=>document.querySelector(s);
const state={mode:'single',homeIndex:4,awayIndex:0,inning:1,half:'top',outs:0,balls:0,strikes:0,bases:[null,null,null],runs:[0,0],orders:[0,0],over:false,busy:false,logs:[],season:null};
let chosenPitch='速球',chosenZone=4,chosenSwing='一般';
const zones=['內高','中高','外高','內中','中間','外中','內低','中低','外低'];
state.playerSide=1;
function playerBatting(){return battingTeam()===state.playerSide}
function playerTeamIndex(){return state.playerSide===1?state.homeIndex:state.awayIndex}

function init(){
  $('#teamSelect').innerHTML=TEAMS.map((t,i)=>'<option value="'+i+'" '+(i===4?'selected':'')+'>'+t.name+'</option>').join('');
  $('#teamSelect').onchange=updateOpponent;
  document.querySelectorAll('.mode-tab').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
  $('#startGame').onclick=launchFromSetup;
  $('#newGame').onclick=leaveGame;
  $('#backToSetup').onclick=showSetup;
  $('#nextSeasonGame').onclick=()=>{if(state.season)startGame(state.season.team)};
  $('#soundToggle').onclick=e=>e.currentTarget.classList.toggle('muted');
  $('#subButton').onclick=openSubModal;
  $('#stealButton').onclick=openRunModal;
  $('#strategyButton').onclick=openDefenseModal;
  updateOpponent();
}
function setMode(mode){
  state.mode=mode;
  document.querySelectorAll('.mode-tab').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  $('#setupTitle').textContent=mode==='season'?'開啟 20 場賽季':'開啟一場比賽';
  $('#modeEyebrow').textContent=mode==='season'?'SEASON MODE':'GAME SETUP';
  $('#setupFoot').textContent=mode==='season'?'每場比賽都會更新戰績與排名':'2026 中華職棒六隊・模擬賽事';
  $('#seasonSummary').classList.toggle('hidden',mode!=='season');
  if(mode==='season') refreshSeasonSummary();
}
function updateOpponent(){
  const team=+$('#teamSelect').value;
  const opponent=(team+1)%TEAMS.length;
  $('#opponentPreview').textContent=TEAMS[opponent].name;
  if(state.mode==='season')refreshSeasonSummary();
}
function newSeason(team){
  return {team,game:0,total:20,standings:TEAMS.map((_,i)=>({w:0,l:0,i}))};
}
function refreshSeasonSummary(){
  const team=+$('#teamSelect').value;
  if(!state.season||state.season.team!==team)state.season=newSeason(team);
  const me=state.season.standings[team];
  $('#seasonSummary').innerHTML='<b>'+TEAMS[team].name+'</b>・第 '+(state.season.game+1)+' / '+state.season.total+' 場<br>目前戰績 '+me.w+' 勝 '+me.l+' 敗';
}
function launchFromSetup(){
  const team=+$('#teamSelect').value;
  if(state.mode==='season'){
    if(!state.season||state.season.team!==team)state.season=newSeason(team);
    showSeason();
  }else startGame(team);
}
function startGame(homeIndex){
  state.homeIndex=homeIndex;
  state.awayIndex=(homeIndex+1+Math.floor(Math.random()*5))%6;
  Object.assign(state,{inning:1,half:'top',outs:0,balls:0,strikes:0,bases:[null,null,null],runs:[0,0],orders:[0,0],over:false,busy:false,logs:[]});
  $('#setupScreen').classList.add('hidden');$('#seasonScreen').classList.add('hidden');$('#gameScreen').classList.remove('hidden');
  $('#seasonLabel').innerHTML='<i></i> 2026 球季・'+(state.mode==='season'?'賽季模式':'單場模式');
  $('#gameModeLabel').textContent=state.mode==='season'?'2026 CPBL 賽季賽':'中華職棒・例行賽';
  $('#stadiumName').textContent=TEAMS[homeIndex].stadium;
  $('#fieldOverlay').classList.add('dismiss');
  say('第 1 局上半，客隊進攻。');
  log('比賽開始，鏡頭帶到投手丘。','賽前');
  render();
}
function leaveGame(){state.busy=false;state.mode==='season'?showSeason():showSetup()}
function showSetup(){
  $('#gameScreen').classList.add('hidden');$('#seasonScreen').classList.add('hidden');$('#setupScreen').classList.remove('hidden');
  $('#seasonLabel').innerHTML='<i></i> 2026 球季・'+(state.mode==='season'?'賽季模式':'單場模式');
  if(state.mode==='season')refreshSeasonSummary();
}
function showSeason(){
  $('#setupScreen').classList.add('hidden');$('#gameScreen').classList.add('hidden');$('#seasonScreen').classList.remove('hidden');
  renderSeason();
}
function battingTeam(){return state.half==='top'?0:1}
function fieldingTeam(){return 1-battingTeam()}
function batterName(){const team=battingTeam()===0?state.awayIndex:state.homeIndex;return PLAYERS[team][state.orders[battingTeam()]%9]}
function pitcherName(){const team=fieldingTeam()===0?state.awayIndex:state.homeIndex;return PLAYERS[team][0]}
function teamFor(side){return side===0?TEAMS[state.awayIndex]:TEAMS[state.homeIndex]}

function render(){
  const away=TEAMS[state.awayIndex],home=TEAMS[state.homeIndex],batting=battingTeam();
  $('#awayName').textContent=away.name;$('#homeName').textContent=home.name;
  $('#awayMark').textContent=away.mark;$('#awayMark').style.background=away.color;
  $('#homeMark').textContent=home.mark;$('#homeMark').style.background=home.color;
  $('#awayScore').textContent=state.runs[0];$('#homeScore').textContent=state.runs[1];
  $('#inningNumber').textContent=state.inning;$('#inningHalf').textContent=state.half==='top'?'▲':'▼';
  $('#gameStatus').textContent=state.over?'終場':state.busy?'球正在進場':'比賽進行中';
  $('#roleLabel').textContent=(batting===1?'打擊':'投球')+'・第 '+(state.orders[batting]%9+1)+' 棒';
  $('#batterName').textContent=batterName();$('#batterAvatar').textContent=batterName().slice(0,1);
  $('#batterStats').textContent='本場 '+Math.floor(state.orders[batting]/9)+' 打數・'+Math.min(2,Math.floor(state.orders[batting]/4))+' 安打';
  $('#batterBadge').textContent=batting===1?'打':'投';
  $('#pitchReadout').textContent=state.busy?'球路進行中':pitcherName()+' 準備投球';
  renderCount();renderBases();renderLogs();renderActions();
}
function renderCount(){
  $('#strikeLights').textContent='●'.repeat(state.strikes)+'○'.repeat(2-state.strikes);
  $('#ballLights').textContent='●'.repeat(state.balls)+'○'.repeat(3-state.balls);
  $('#outLights').textContent='●'.repeat(state.outs)+'○'.repeat(3-state.outs);
}
function renderBases(){
  const pos=[[66,62],[50,35],[34,62]];
  ['base1','base2','base3'].forEach((id,i)=>$('#'+id).style.background=state.bases[i]?'#e7b951':'#fff8dc');
  $('#runnerDots').innerHTML=state.bases.map((r,i)=>r?'<i class="runner-dot" style="left:'+pos[i][0]+'%;top:'+pos[i][1]+'%" title="'+r+'"></i>':'').join('');
}
function renderLogs(){$('#logList').innerHTML=state.logs.map((x,i)=>'<article class="log-item '+(i===0?'latest':'')+'"><time>'+x.tag+'</time>'+x.text+'</article>').join('')}
function renderActions(){
  const root=$('#actionContent');
  if(state.over){root.innerHTML='<div class="action-title">比賽結束</div><div class="action-hint">'+winnerText()+'</div><button class="action-button" onclick="leaveGame()">返回 '+(state.mode==='season'?'賽季中心':'設定頁')+'</button>';return}
  if(state.busy){root.innerHTML='<div class="action-title">轉播鏡頭跟隨這一球</div><div class="action-hint">等待球路結果。</div><button class="action-button" disabled>進行中…</button>';return}
  if(battingTeam()===0){
    root.innerHTML='<div class="action-title">由你配球</div><div class="action-hint">選擇球種與目標位置，動態鏡頭會呈現投球軌跡。</div>'+choiceGrid([['速球','球速快'],['滑球','橫向位移'],['變速球','速度落差']],chosenPitch,'setPitch')+zoneGrid()+'<button class="action-button" onclick="throwPitch()">投出這一球　→</button><div class="pitch-topline"><span>投手：'+pitcherName()+'</span><span>體力 100%</span></div>';
  }else{
    root.innerHTML='<div class="action-title">輪到你打擊</div><div class="action-hint">選擇揮棒策略與鎖定區域，等待投手出手。</div>'+choiceGrid([['一般','穩定打擊'],['積極','長打優先'],['等待','選球攻擊']],chosenSwing,'setSwing')+zoneGrid()+'<button class="action-button" onclick="requestPitch()">等待投球　→</button>';
  }
}
function choiceGrid(items,selected,fn){return '<div class="option-grid">'+items.map(x=>'<button class="choice '+(selected===x[0]?'selected':'')+'" onclick="'+fn+'(\''+x[0]+'\')"><b>'+x[0]+'</b><small>'+x[1]+'</small></button>').join('')+'</div>'}
function zoneGrid(){return '<div class="zone-grid">'+zones.map((z,i)=>'<button class="zone '+(chosenZone===i?'selected':'')+'" onclick="setZone('+i+')">'+z+'</button>').join('')+'</div>'}
function setPitch(v){chosenPitch=v;renderActions()}function setSwing(v){chosenSwing=v;renderActions()}function setZone(v){chosenZone=v;renderActions()}

function requestPitch(){
  state.busy=true;render();announce('投手出手！');
  animatePitch(()=>{
    const zone=Math.floor(Math.random()*9),ball=Math.random()<.31;
    state.pending={zone,ball,pitch:['速球','滑球','變速球'][Math.floor(Math.random()*3)]};
    $('#pitchReadout').textContent=state.pending.pitch+'・'+zones[zone]+' '+(ball?'偏離好球帶':'進入好球帶');
    state.busy=false;render();
    const root=$('#actionContent');
    root.innerHTML='<div class="action-title">球已到本壘板</div><div class="action-hint">'+state.pending.pitch+'，'+zones[zone]+'。決定是否揮棒。</div><div class="duel-actions"><button class="action-button" onclick="swingAtPitch()">揮棒！</button><button class="action-button secondary" onclick="takePitch()">看球</button></div>';
  });
}
function throwPitch(){
  state.busy=true;render();announce(chosenPitch+' 出手！');
  animatePitch(()=>{
    const strikeChance=chosenZone===4?.72:.55, strike=Math.random()<strikeChance, swing=Math.random()<(strike?.57:.34);
    if(swing&&Math.random()<.38)resolveBattedBall(Math.random(),true);
    else if(swing){applyStrike('對方揮棒落空，三振機率上升。','揮棒落空！')}
    else if(strike)applyStrike('主審判定好球。','好球！')
    else applyBall('投球偏出好球帶。','壞球！');
  });
}
function takePitch(){
  state.busy=true;render();
  const p=state.pending;state.pending=null;
  if(p.ball){animatePitch(()=>applyBall('成功選到壞球。','壞球！'))}
  else animatePitch(()=>applyStrike('放掉好球帶內的球。','好球！'));
}
function swingAtPitch(){
  state.busy=true;render();
  const p=state.pending;state.pending=null;
  const match=Math.abs(Math.floor(chosenZone/3)-Math.floor(p.zone/3))===0&&Math.abs(chosenZone%3-p.zone%3)<=1;
  let hit=.22+(p.ball?-.06:.18)+(match?.16:0)+(chosenSwing==='積極'?.08:0);
  animatePitch(()=>{
    if(Math.random()<hit)resolveBattedBall(Math.random(),false);
    else if(Math.random()<.14){animateFoul(()=>{foul();finishPlay('界外球。','界外！')})}
    else if(p.ball&&chosenSwing==='等待')applyBall('耐心選球，這球偏低。','壞球！');
    else applyStrike('揮棒沒有碰到球。','揮棒落空！');
  });
}
function animatePitch(done){
  const ball=$('#baseball');ball.className='baseball';void ball.offsetWidth;ball.classList.add('pitched');
  setTimeout(()=>{ball.className='baseball';done()},700);
}
function animateFoul(done){const ball=$('#baseball');ball.className='baseball';void ball.offsetWidth;ball.classList.add('foul');setTimeout(()=>{ball.className='baseball';done()},730)}
function resolveBattedBall(r,opponent){
  const power=opponent?Math.random()<.35:chosenSwing==='積極';
  const type=r>.92&&power?'HR':r>.79?'2B':r>.55?'1B':r>.26?'OUT':'1B';
  const targets={HR:[50,15],'2B':[23+Math.random()*54,30+Math.random()*10],'1B':[28+Math.random()*44,49+Math.random()*12],OUT:[31+Math.random()*36,55+Math.random()*12]};
  const [x,y]=targets[type];
  const ball=$('#baseball'),land=$('#landing'),impact=$('#impact');
  ball.style.setProperty('--land-x',x+'%');ball.style.setProperty('--land-y',y+'%');
  land.style.left=x+'%';land.style.top=y+'%';
  impact.classList.add('active');setTimeout(()=>impact.classList.remove('active'),350);
  announce(type==='OUT'?'擊球形成守備機會！':type==='HR'?'全壘打方向！':'球飛向空檔！');
  ball.className='baseball';void ball.offsetWidth;ball.classList.add(type==='OUT'?'grounder':'hit');land.classList.add('active');
  setTimeout(()=>{ball.className='baseball';land.classList.remove('active');applyHit(type)},1200);
}
function applyStrike(text,call){state.strikes++;if(state.strikes>=3){state.outs++;log(batterName()+' 三振出局。');nextBatter();resetCount();if(state.outs>=3)endHalf()}finishPlay(text,call)}
function applyBall(text,call){state.balls++;if(state.balls>=4)walk();finishPlay(text,call)}
function foul(){if(state.strikes<2)state.strikes++}
function walk(){const b=batterName();if(state.bases[0]){if(state.bases[1]){if(state.bases[2])score('保送擠回');state.bases[2]=state.bases[1]}state.bases[1]=state.bases[0]}state.bases[0]=b;nextBatter();resetCount();log(b+' 獲得四壞保送。')}
function applyHit(type){
  const b=batterName();
  if(type==='OUT'){state.outs++;log(b+' 擊出滾地球，守備完成刺殺。');nextBatter();resetCount();if(state.outs>=3)endHalf();finishPlay('滾地球被處理，出局。','出局！');return}
  const bases=type==='HR'?4:type==='2B'?2:1;let runs=0;
  if(bases===4){runs=1+state.bases.filter(Boolean).length;state.bases=[null,null,null]}else{
    for(let i=2;i>=0;i--){if(state.bases[i]){if(i+bases>=3)runs++;else state.bases[i+bases]=state.bases[i];state.bases[i]=null}}
    state.bases[bases-1]=b;
  }
  for(let i=0;i<runs;i++)score(type==='HR'?'全壘打':'長打');
  nextBatter();resetCount();
  const label={HR:'全壘打！','2B':'二壘安打！','1B':'安打！'}[type];
  log(b+' 擊出'+label+(runs?' 帶有 '+runs+' 分打點。':''));
  finishPlay(runs?label+' 跑者回本壘得分！':label,label);
}
function finishPlay(text,call){announce(call);say(text);state.busy=false;render()}
function score(reason){state.runs[battingTeam()]++;log(teamFor(battingTeam()).name+' 跑回本壘得分（'+reason+'）。')}
function nextBatter(){state.orders[battingTeam()]++}
function resetCount(){state.balls=0;state.strikes=0;state.pending=null}
function endHalf(){
  resetCount();state.outs=0;
  if(state.half==='top'){state.half='bottom';say('第 '+state.inning+' 局下半，輪到你進攻。')}
  else if(state.inning>=9&&state.runs[0]!==state.runs[1]){state.over=true;finishGame()}
  else if(state.inning>=12){state.over=true;finishGame()}
  else{state.inning++;state.half='top';if(state.inning>=10)state.bases[1]='突破僵局跑者';say('第 '+state.inning+' 局上半開始。')}
}
function winnerText(){return state.runs[0]===state.runs[1]?'十二局戰成平手。':(state.runs[0]>state.runs[1]?TEAMS[state.awayIndex].name:TEAMS[state.homeIndex].name)+' 獲勝！'}
function finishGame(){
  log('終場：'+state.runs[0]+' 比 '+state.runs[1]+'，'+winnerText(),'終場');
  announce('FINAL  '+state.runs[0]+' : '+state.runs[1]);
  if(state.mode==='season'&&state.season)recordSeasonGame();
  state.busy=false;render();
}
function log(text,tag){state.logs.unshift({text,tag:tag||state.inning+'局'+(state.half==='top'?'上':'下')});state.logs=state.logs.slice(0,10)}
function say(text){$('#coachMessage').textContent=text}
function announce(text){const call=$('#broadcastCall');call.textContent=text;call.classList.add('show');clearTimeout(state.callTimer);state.callTimer=setTimeout(()=>call.classList.remove('show'),1600)}

function recordSeasonGame(){
  const season=state.season,me=season.standings[season.team],win=state.runs[1]>state.runs[0];
  me[win?'w':'l']++;
  TEAMS.forEach((_,i)=>{if(i!==season.team){const row=season.standings[i];if(Math.random()<.5)row.w++;else row.l++}});
  season.game++;localStorage.setItem('cpbl-season-v1',JSON.stringify(season));
}
function renderSeason(){
  const s=state.season;
  if(!s){showSetup();return}
  const me=s.standings[s.team];
  $('#seasonTeamTitle').textContent=TEAMS[s.team].name+'・賽季進度';
  $('#seasonProgress').innerHTML='<div class="season-stat"><span>目前戰績</span><strong>'+me.w+' - '+me.l+'</strong></div><div class="progress-bar"><i style="width:'+(s.game/s.total*100)+'%"></i></div><div class="season-stat"><span>已完成賽程</span><b>'+s.game+' / '+s.total+' 場</b></div>';
  $('#nextSeasonGame').textContent=s.game>=s.total?'賽季已完成':('第 '+(s.game+1)+' 場・進入球場 →');
  $('#nextSeasonGame').disabled=s.game>=s.total;
  const sorted=[...s.standings].sort((a,b)=>b.w-a.w||a.l-b.l);
  $('#standingsTable').innerHTML='<div class="stand-row"><b>#</b><b>球隊</b><b>勝</b><b>敗</b></div>'+sorted.map((r,i)=>'<div class="stand-row '+(r.i===s.team?'me':'')+'"><span>'+(i+1)+'</span><span>'+TEAMS[r.i].name+'</span><span>'+r.w+'</span><span>'+r.l+'</span></div>').join('');
  $('#scheduleList').innerHTML=Array.from({length:Math.min(5,s.total-s.game)},(_,i)=>{const away=(s.team+i+1)%6;return '<div class="schedule-item"><span>第 '+(s.game+i+1)+' 場</span><b>'+TEAMS[away].name+' @ '+TEAMS[s.team].name+'</b></div>'}).join('')||'<div class="schedule-item">本季賽程已完成</div>';
}

function modal(title,subtitle,content){$('#modalRoot').innerHTML='<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><div class="modal"><button class="modal-close" onclick="closeModal()">×</button><span class="eyebrow">MANAGER DECISION</span><h2>'+title+'</h2><p>'+subtitle+'</p><div class="modal-list">'+content+'</div><button class="cancel-button" onclick="closeModal()">取消</button></div></div>'}
function closeModal(){$('#modalRoot').innerHTML=''}
function openSubModal(){if(state.busy||state.over)return;modal('教練調度','此版本可在轉播過程中進行基本調度。','<button class="roster-option" onclick="closeModal();say(\'牛棚已熱身，下一個打席可換投。\')"><strong>準備牛棚投手</strong><small>下一個打席提高投球壓制力</small></button><button class="roster-option" onclick="closeModal();say(\'代打已在準備區待命。\')"><strong>安排代打</strong><small>下一個主隊打席啟用</small></button>')}
function openRunModal(){if(state.busy||state.over)return;const onBase=state.bases.some(Boolean);modal('跑壘戰術',onBase?'選擇跑者的下一步。':'目前沒有跑者，先讓打者上壘。',onBase?'<button class="roster-option" onclick="steal()"><strong>盜壘</strong><small>成功率 65%，失敗將增加一個出局數</small></button>':'')}
function steal(){closeModal();const i=state.bases[0]?0:1;if(Math.random()<.65){state.bases[i+1]=state.bases[i];state.bases[i]=null;log('跑者盜壘成功！','戰術');announce('SAFE！');say('跑者成功推進。')}else{state.bases[i]=null;state.outs++;log('盜壘遭阻殺。','戰術');announce('OUT！');if(state.outs>=3)endHalf()}render()}
function openDefenseModal(){if(state.busy||state.over)return;modal('守備佈陣','守備選擇將影響下一球擊球機率。','<button class="roster-option" onclick="closeModal();state.defense=\'in\';say(\'內野前移，準備處理短打。\')"><strong>內野前移</strong><small>提高阻止短打的機會</small></button><button class="roster-option" onclick="closeModal();state.defense=\'deep\';say(\'外野後退，守住長打。\')"><strong>外野後退</strong><small>降低長打落地機率</small></button>')}
init();
