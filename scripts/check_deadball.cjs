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
for(const file of ['game.js','motion-calibration.js','stadium-data.js','baseball-engine.js','baseball-rules.js','broadcast.js','rosters-data.js','pitch-profiles.js','player-traits.js','roster.js','season.js','stadium-setup.js','xinzhuang-model.js','deadball-scenes.js','broadcast-camera.js','stadium3d.js','broadcast-data.js','broadcast-presentation.js'])run(fs.readFileSync(path.join(root,file),'utf8'));
run('musicEnabled=false;effectsEnabled=false;');

function tick(ms=100){time+=ms;const current=frames;frames=[];for(const fn of current)fn(time)}


function begin(kind,options={}){run("state.mode='season';state.season=newSeason(3);startGame(3);CPBLBroadcast.draw(performance.now());CPBLBroadcast.skipAll();state.half='top';state.playerSide=1;");run('CPBLDeadball.start('+JSON.stringify(kind)+','+JSON.stringify(options)+')');}
for(const bases of [[null,null,null],['R1',null,'R3'],['R1','R2','R3']]){
 begin('walk');run('state.balls=3;state.bases='+JSON.stringify(bases)+';tv.interlude.bases=state.bases.slice();tv.pendingPitch={strike:false,text:"四壞保送",at:performance.now()};');const batter=run('batterName()'),id=run('tv.lineupIds[0][0]');
 tick(2000);assert.equal(run('batterName()'),batter);assert.equal(run('state.orders[0]'),0);assert.equal(run('tv.phase'),'deadball');assert.equal(run('stage.dataset.cameraMode'),'walk-to-first');
 tick(9000);assert.equal(run('state.bases[0]'),batter);assert.equal(run('state.orders[0]'),1);assert.equal(run('CPBLBroadcast.total('+JSON.stringify(id)+').bb'),1);assert.equal(run('state.runs[0]'),bases.every(Boolean)?1:0);
 if(bases[2]&&!bases[1])assert.equal(run('state.bases[2]'),'R3');
}
begin('foul',{caught:false,ground:false});run('state.strikes=2');const before=run('JSON.stringify({orders:state.orders,outs:state.outs,runs:state.runs})');tick(5000);assert.equal(run('stage.dataset.replay'),'true');tick(7000);assert.equal(run('JSON.stringify({orders:state.orders,outs:state.outs,runs:state.runs})'),before);assert.equal(run('state.strikes'),2);
begin('foul',{caught:true,ground:false});tick(6000);assert.equal(run('state.outs'),0);tick(6000);assert.equal(run('state.outs'),1);assert.equal(run('state.orders[0]'),1);tick(6000);assert.equal(run('state.outs'),1);
begin('hbp');const hbpId=run('tv.lineupIds[0][0]');tick(500);assert.equal(run('stage.dataset.cameraMode'),'deadball-batter-reaction');tick(1000);assert.equal(run('stage.dataset.cameraMode'),'deadball-pitcher-reaction');tick(11000);assert.equal(run('state.orders[0]'),1);assert.equal(run('CPBLBroadcast.total('+JSON.stringify(hbpId)+').ab'),0);assert.equal(run('CPBLBroadcast.total('+JSON.stringify(hbpId)+').bb'),0);assert.equal(run('CPBLBroadcast.total('+JSON.stringify(hbpId)+').hbp'),1);
begin('walk');run('pause()');tick(25000);assert.equal(run('tv.phase'),'deadball');assert.equal(run('state.orders[0]'),0);run('pause()');tick(400);assert.equal(run('tv.phase'),'deadball');run('leaveGame();startGame(3)');assert.equal(run('tv.interlude'),null);
begin('foul',{caught:true,ground:false});run("state.outs=2");tick(12000);assert.equal(run("state.half"),'bottom');assert.equal(run('state.outs'),0);
run("state.mode='single';startGame(3);CPBLBroadcast.draw(performance.now());CPBLBroadcast.skipAll();state.playerSide=0;state.half='top';state.strikes=2;beginPitch();tv.flight.x=0;tv.flight.y=0;tv.swung=true;tv.swingTime=1.04;tv.swingAim={x:0,y:0};finishPitch();");assert.equal(run('tv.phase'),'deadball');assert.equal(run('state.strikes'),2);assert.equal(run('state.orders[0]'),0);
assert.equal(errors.length,0,errors.join('\n'));console.log('Dead-ball scenes: walk/loaded forced advances, unforced runner holds, replay without duplicate rules, caught foul, HBP separate from BB/AB, pause and restart passed.');
