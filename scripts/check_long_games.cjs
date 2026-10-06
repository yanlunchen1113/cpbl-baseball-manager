/* Full state + CPU Three.js scene regression. Does not emulate a real GPU. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),elements=new Map();let time=1000,frames=[];
class Element{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this._html='';this.textContent='';this.value='';this.options=[];this.dataset={};this.style={setProperty(k,v){this[k]=v}};this.hidden=false;this.clientWidth=390;this.clientHeight=780;this.events={};const classes=new Set();this.classList={add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x)),contains:x=>classes.has(x),toggle:(x,on)=>{on=on===undefined?!classes.has(x):on;on?classes.add(x):classes.delete(x);return on}};}
 set innerHTML(html){this._html=html;for(const m of html.matchAll(/id="([^"]+)"/g)){if(!elements.has('#'+m[1]))elements.set('#'+m[1],new Element())}this.options=[...html.matchAll(/<option value="([^"]+)"/g)].map(m=>({value:m[1]}));}
 get innerHTML(){return this._html}
 append(...xs){for(const x of xs)x.parent=this}prepend(x){this.append(x)}after(){}replaceWith(){}
 querySelector(selector){return get(selector)}querySelectorAll(){return []}
 setAttribute(k,v){this[k]=v}getAttribute(k){return this[k]}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn)}setPointerCapture(){}
 getBoundingClientRect(){return {width:this.clientWidth,height:this.clientHeight,left:0,top:0}}
 getContext(){return canvasContext}
}
const canvasContext=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:(()=>{})});
function get(selector){if(!elements.has(selector)){const element=new Element(selector.includes('Canvas')?'canvas':'div');if(['#gameScreen','#seasonScreen'].includes(selector))element.classList.add('hidden');if(selector==='#opponentSelect')element.value='random';if(selector==='#stadiumSelect')element.value='home';elements.set(selector,element)}return elements.get(selector)}
const events={},storage=new Map(),errors=[];
const sandbox={console:{log(){},warn(){},error:(...a)=>errors.push(a.join(' '))},document:{hidden:false,querySelector:get,querySelectorAll:()=>[],createElement:t=>new Element(t),addEventListener:(k,fn)=>(events[k]??=[]).push(fn)},performance:{now:()=>time},navigator:{getGamepads:()=>[]},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},location:{protocol:'https:'},requestAnimationFrame:fn=>frames.push(fn),setInterval(){},setTimeout(){},fetch:async()=>({ok:false,status:503}),Audio:class{constructor(){this.paused=true}pause(){this.paused=true}play(){this.paused=false;return Promise.resolve()}load(){}removeAttribute(){}},AudioContext:class{constructor(){this.state='running'}},Float32Array,Uint8Array,Set,Map,Math,Date,JSON};
sandbox.window=sandbox;sandbox.addEventListener=(k,fn)=>(events[k]??=[]).push(fn);sandbox.CPBLMusic={stop(){},play(){}};
const THREE={...require('../vendor/three.min.js')};
THREE.WebGLRenderer=class{constructor(){this.domElement=new Element('canvas');this.shadowMap={};this.pixelRatio=1}setPixelRatio(n){this.pixelRatio=n}setSize(){}setViewport(){}setScissor(){}setScissorTest(){}render(scene,camera){scene.updateMatrixWorld();camera.updateMatrixWorld()}getContext(){return {getExtension:()=>({restoreContext(){}})}}};sandbox.THREE=THREE;
const context=vm.createContext(sandbox),run=code=>vm.runInContext(code,context);
for(const file of ['game.js','motion-calibration.js','stadium-data.js','baseball-engine.js','baseball-rules.js','broadcast.js','rosters-data.js','pitch-profiles.js','player-traits.js','roster.js','season.js','stadium-setup.js','stadium3d.js'])run(fs.readFileSync(path.join(root,file),'utf8'));
run('musicEnabled=false;effectsEnabled=false;');
const pitcherAudit=run(`TEAMS.flatMap((_,i)=>rosterPlayers(i)).filter(p=>p.isPitcher).map(p=>pitchProfile(p))`);for(const p of pitcherAudit){assert(p.pitches.some(x=>['快速球','四縫線','二縫線','伸卡球','卡特球'].includes(x)),p.name+' missing fastball');assert(!p.pitches.includes('變化球'));}

function tick(ms=100){time+=ms;const current=frames;frames=[];for(const fn of current)fn(time)}
let games=0,pitches=0,contacts=0,catches=0,grounders=0,rolled=0;const cameraFrames={};
for(let game=0;game<24;game++){
 get('#opponentSelect').value='random';get('#stadiumSelect').value=sandbox.CPBLStadiums.parks[game%11].id;run(`state.mode='single';stage.clientWidth=${game%2?900:390};stage.clientHeight=${game%2?500:780};startGame(${game%6});`);
 for(let attempts=0;attempts<22000&&!run('state.over');attempts++){
  const phase=run('tv.phase');assert(!run('tv.paused'),'Unexpected pause: '+errors.join('\n'));
  if(phase==='ready'){run('controlDown();controlUp();');pitches++;}
  else if(phase==='pitch'&&run('playerBatting()&&!tv.swung')){const progress=run('(performance.now()-tv.start)/tv.flight.duration');if(progress>.72&&progress<.98)run('tv.aim={x:tv.flight.x,y:tv.flight.y};controlDown();');}
  if(phase==='hit'){
   if(run('!tv.hit.counted')){contacts++;if(run('tv.hit.event==="catch"'))catches++;if(run('tv.hit.kind==="ground"'))grounders++;run('tv.hit.counted=true');}
   if(run('CPBLPhysics.playPoint(tv.hit,performance.now()-tv.hit.start).phase==="rolling"'))rolled++;
  }
  tick(120);const mode=run('stage.dataset.cameraMode');cameraFrames[mode]=(cameraFrames[mode]||0)+1;
  assert(run('Number.isFinite(state.runs[0])&&Number.isFinite(state.runs[1])'));
  assert(run('state.bases.length===3'));assert(run('state.outs>=0&&state.outs<3'));
  if(attempts===21999)throw Error('Game did not finish: '+run('JSON.stringify({inning:state.inning,half:state.half,phase:tv.phase,runs:state.runs,outs:state.outs})'));
 }
 assert(run('state.over'),'Expected a completed game');games++;
}
assert(run('(CPBL_RENDER_STATS.maxGroundGap||0)<.009'),'Visible actors must plant a foot on the terrain');
assert(run('(CPBL_RENDER_STATS.releaseError||0)<.08'),'Pitch release must originate at throwing hand');
assert(run('(CPBL_RENDER_STATS.shoulderLoadError||0)<.001'),'Throwing shoulder must move behind glove shoulder while loading');
assert(run('(CPBL_RENDER_STATS.shoulderReleaseError||0)<.001'),'Throwing shoulder must move toward home at release');
assert(cameraFrames['ball-tracking']>100&&cameraFrames.baserunning>100&&cameraFrames['throw-follow']>100&&cameraFrames['catcher-return']>100,'Adaptive full-screen cameras and catcher return must all be used');assert.equal(errors.length,0,errors.join('\n'));assert(contacts>100&&catches>30&&grounders>30&&rolled>50);
console.log(JSON.stringify({pitchers: pitcherAudit.length,parks:11,cameraFrames,games,pitches,contacts,catches,grounders,rollingFrames:rolled,renderedFrames:run('CPBL_RENDER_STATS.frames'),renderErrors:run('CPBL_RENDER_STATS.errors')}));
