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
for(const file of ['game.js','motion-calibration.js','stadium-data.js','baseball-engine.js','baseball-rules.js','broadcast.js','rosters-data.js','pitch-profiles.js','player-traits.js','roster.js','season.js','stadium-setup.js','xinzhuang-model.js','stadium3d.js'])run(fs.readFileSync(path.join(root,file),'utf8'));
run('musicEnabled=false;effectsEnabled=false;');

function tick(ms=100){time+=ms;const current=frames;frames=[];for(const fn of current)fn(time)}
function thirdStrike({side=0,outs=0,inning=1,final=false,swing=false}={}){
 run(`state.mode='single';startGame(0);state.playerSide=${side};state.half='top';state.inning=${inning};state.outs=${outs};state.strikes=2;state.runs=[0,${final?1:0}];beginPitch();tv.flight.x=0;tv.flight.y=0;tv.flight.cpuSwing=${swing};tv.swung=${swing};tv.swingTime=0;tv.swingStart=performance.now()-170;`);
 const original=run('batterName()'),orders=run('JSON.stringify(state.orders)');
 run('finishPitch()');
 assert.equal(run('tv.pitchSignal'),'strikeout');
 assert.equal(run('batterName()'),original);
 assert.equal(run('JSON.stringify(state.orders)'),orders);
 assert.equal(run('state.over'),false);
 assert.equal(run('state.busy'),true);
 assert.match(get('#tvCount').innerHTML,/3 S/);
 for(let i=0;i<21;i++){tick(100);assert.equal(run('batterName()'),original);assert.equal(run('state.half'),'top');}
 assert.equal(run('tv.phase'),'result');
 tick(200);assert.equal(run('tv.phase'),'return');
 assert.equal(run('stage.dataset.batterName'),original);
 if(side===1)assert.equal(run('stage.dataset.batterVisible'),'true');
 for(let i=0;i<23;i++){tick(100);assert.equal(run('batterName()'),original);assert.equal(run('state.half'),'top');}
 assert.equal(run('tv.phase'),'return');
 tick(200);assert.equal(run('tv.phase'),'ready');
 assert.equal(run('state.orders[0]'),1);
 assert.equal(run('tv.pendingPitch'),null);
 if(outs===2&&!final)assert.equal(run('state.half'),'bottom');
 else if(final)assert.equal(run('state.over'),true);
 else assert.equal(run('state.outs'),outs+1);
 const completed=run('JSON.stringify({orders:state.orders,outs:state.outs,half:state.half})');
 tick(100);assert.equal(run('JSON.stringify({orders:state.orders,outs:state.outs,half:state.half})'),completed);
}
thirdStrike();thirdStrike({swing:true});thirdStrike({side:1});thirdStrike({outs:2});thirdStrike({outs:2,inning:9,final:true});
run("startGame(0);state.half='top';state.strikes=2;beginPitch();tv.flight.x=0;tv.flight.y=0;tv.flight.cpuSwing=false;tv.swung=false;finishPitch();pause();");
const beforePause=run('batterName()');tick(10000);assert.equal(run('batterName()'),beforePause);assert.equal(run('tv.phase'),'result');
run('pause()');tick(100);assert.equal(run('tv.phase'),'result');assert.equal(run('batterName()'),beforePause);
run("leaveGame();startGame(0)");assert.equal(run('tv.pendingPitch'),null);assert.equal(run('state.outs'),0);assert.equal(run('state.strikes'),0);
run("state.half='top';state.balls=3;beginPitch();tv.flight.x=1.6;tv.flight.y=1.6;tv.flight.cpuSwing=false;tv.swung=false;finishPitch();");
const walked=run('batterName()');assert.equal(run('tv.pendingPitch.strike'),false);tick(1600);assert.equal(run('tv.phase'),'return');assert.equal(run('batterName()'),walked);tick(2500);assert.equal(run('state.orders[0]'),1);assert.equal(run('state.bases[0]'),walked);
assert.equal(errors.length,0,errors.join('\n'));console.log('At-bat transitions: looking/swinging K, both player sides, third out, final out, pause/resume, restart and walk passed; 0 render errors.');
