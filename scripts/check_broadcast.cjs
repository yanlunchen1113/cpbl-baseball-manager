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
for(const file of ['game.js','motion-calibration.js','stadium-data.js','baseball-engine.js','baseball-rules.js','broadcast.js','rosters-data.js','pitch-profiles.js','player-traits.js','roster.js','season.js','stadium-setup.js','xinzhuang-model.js','broadcast-camera.js','stadium3d.js','broadcast-data.js','broadcast-presentation.js'])run(fs.readFileSync(path.join(root,file),'utf8'));
run('musicEnabled=false;effectsEnabled=false;');

function tick(ms=100){time+=ms;const current=frames;frames=[];for(const fn of current)fn(time)}

run("state.mode='single';startGame(3);CPBLBroadcast.draw(performance.now());");
assert.equal(run('tv.presentation.kind'),'matchup');
for(let t=0;t<6;t++)assert.equal(run('CPBLBroadcast.lineup('+t+').length'),9);
for(let t=0;t<6;t++)assert.equal(run('CPBLBroadcast.lineup('+t+').every(p=>CPBLBroadcast.allowed(p).has(p.assignedPosition))'),true);
assert.equal(run('new Set(CPBLBroadcast.lineup(3).map(p=>p.id)).size'),9);
let kinds=[];for(let n=0;n<7;n++){if(run('tv.presentation'))kinds.push(run('tv.presentation.kind'));tick(6600);}
assert.deepEqual(kinds,['matchup','lineup','defense','pitcher','batter']);
assert.equal(run('tv.presentation'),null);
run("state.half='bottom';CPBLBroadcast.draw(performance.now());");assert.equal(run('tv.presentation.kind'),'lineup');
for(let n=0;n<5;n++)tick(6600);
run("state.inning=2;state.half='top';CPBLBroadcast.draw(performance.now());");assert.equal(run('tv.presentation.kind'),'batter');tick(6600);assert.equal(run('tv.presentation'),null);
run("state.strikes=1;render();CPBLBroadcast.draw(performance.now());");assert.equal(run('tv.presentation'),null);
run("state.orders[0]++;CPBLBroadcast.draw(performance.now());");assert.equal(run('tv.presentation.kind'),'batter');tick(6600);
run("tv.pitchers[1]={...tv.pitchers[1],id:'test-relief',name:'替補投手'};CPBLBroadcast.draw(performance.now());");assert.equal(run('tv.presentation.kind'),'pitcher');tick(6600);
run("CPBLBroadcast.skipAll();state.mode='season';state.season=newSeason(3);startGame(3);CPBLBroadcast.draw(performance.now());CPBLBroadcast.skipAll();");
const id=run('tv.lineupIds[0][0]');
run("state.half='top';state.bases=['一壘','二壘','三壘'];CPBLBroadcast.book('H',{hit:1,bases:2,runs:2,outs:0});");
assert.equal(run('CPBLBroadcast.total('+JSON.stringify(id)+').h'),1);assert.equal(run('CPBLBroadcast.total('+JSON.stringify(id)+').loadedAB'),1);assert.equal(run('CPBLBroadcast.total('+JSON.stringify(id)+').rispH'),1);
run("CPBLBroadcast.book('SF',{runs:1,outs:1});CPBLBroadcast.book('BB',{});");assert.equal(run('CPBLBroadcast.total('+JSON.stringify(id)+').ab'),1);assert.equal(run('CPBLBroadcast.total('+JSON.stringify(id)+').pa'),3);
run("state.runs=[1,2];finishGame();");assert.equal(run('state.season.playerStats['+JSON.stringify(id)+'].h'),1);assert.equal(run('CPBLBroadcast.total('+JSON.stringify(id)+').h'),1);
run("advanceSeason(true);");assert.ok(run('Object.keys(state.season.playerStats).length')>18);
const primary=run("rosterPlayers(3).find(p=>p.position==='捕手')");
assert.equal(run("CPBLBroadcast.allowed(rosterPlayers(3).find(p=>p.id==='"+primary.id+"')).has('C')"),true);
assert.equal(errors.length,0,errors.join('\n'));
console.log('Broadcast simulation: six legal lineups, first-inning-only cards, batter/relief entry, no repeat pitch cards, separate ledgers, RISP/loaded/SF/walk, saved season and simulated matches passed.');
