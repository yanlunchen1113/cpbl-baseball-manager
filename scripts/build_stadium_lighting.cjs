/* Full state + CPU Three.js scene regression. Does not emulate a real GPU. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
let bakeScene;
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
THREE.WebGLRenderer=class{constructor(){this.domElement=new Element('canvas');this.shadowMap={};this.pixelRatio=1}setPixelRatio(n){this.pixelRatio=n}setSize(){}setViewport(){}setScissor(){}setScissorTest(){}render(scene,camera){bakeScene=scene;scene.updateMatrixWorld();camera.updateMatrixWorld()}getContext(){return {getExtension:()=>({restoreContext(){}})}}};sandbox.THREE=THREE;
const context=vm.createContext(sandbox),run=code=>vm.runInContext(code,context);
for(const file of ['game.js','motion-calibration.js','stadium-data.js','baseball-engine.js','baseball-rules.js','broadcast.js','rosters-data.js','pitch-profiles.js','player-traits.js','roster.js','season.js','stadium-setup.js','xinzhuang-model.js','stadium3d.js'])run(fs.readFileSync(path.join(root,file),'utf8'));
run('musicEnabled=false;effectsEnabled=false;');

// Offline visibility bake against actual canopy/deck triangles; no baking during play.
const directions=[[0,1,0],[.65,.76,0],[-.65,.76,0],[0,.76,.65],[0,.76,-.65]].map(v=>new THREE.Vector3(...v).normalize());
const ray=new THREE.Raycaster(),origin=new THREE.Vector3(),direction=new THREE.Vector3(),buffers=[],profiles={},surfaceProfiles={};let offset=0;
const priorManifest=process.env.BAKE_PARK?JSON.parse(fs.readFileSync(path.join(root,'assets/lighting/stadium-bake.json'),'utf8')):null;if(priorManifest){const previous=fs.readFileSync(path.join(root,'assets/lighting/stadium-bake.bin'));buffers.push(previous);offset=previous.length;Object.assign(profiles,priorManifest.profiles);Object.assign(surfaceProfiles,priorManifest.surfaceProfiles||{});}
function visible(point,vector,far){origin.copy(point);origin.y+=.04;ray.set(origin,vector);ray.near=.01;ray.far=far;return ray.intersectObjects(occluders,false).length?0:1;}
let occluders=[];
for(const park of sandbox.CPBLStadiums.parks.filter(p=>!process.env.BAKE_PARK||p.id===process.env.BAKE_PARK)){
 get('#stadiumSelect').value=park.id;run('startGame(0)');time+=100;const current=frames;frames=[];current.forEach(fn=>fn(time));assert.equal(run('CPBL_RENDER_STATS.errors'),0);
 bakeScene.updateMatrixWorld(true);occluders=[];const groups=[],surfaces=[];bakeScene.traverse(o=>{if(o.userData.staticOccluder)occluders.push(o);if(o.userData.bakeSeats)groups.push(o);if(o.userData.bakeSurface!==undefined)surfaces.push(o)});groups.sort((a,b)=>a.userData.bakeBatch-b.userData.bakeBatch);profiles[park.id]=[];
 for(const group of groups){const points=group.userData.bakeSeats,ambient=Buffer.alloc(points.length),day=Buffer.alloc(points.length),night=Buffer.alloc(points.length);
  for(let i=0;i<points.length;i++){
   const p=new THREE.Vector3(...points[i]);ambient[i]=Math.round(255*directions.reduce((a,v)=>a+visible(p,v,32),0)/directions.length);
   day[i]=park.indoor?255:255*visible(p,direction.set(-35,55,30).normalize(),160);
   let lit=0;for(const [x,z] of [[-55,15],[55,15],[-75,90],[75,90]]){const v=new THREE.Vector3(x,37,z).sub(p),length=v.length();lit+=visible(p,v.normalize(),length);}
   night[i]=park.indoor?255:Math.round(255*(lit/4*.8+visible(p,direction.set(park.id==='taoyuan'?55:-55,38,15).normalize(),160)*.2));
  }
  const record={count:points.length};for(const [key,b] of Object.entries({ambient,day,night})){record[key]=offset;offset+=b.length;buffers.push(b);}profiles[park.id].push(record);
 }
 surfaceProfiles[park.id]=[];surfaces.sort((a,b)=>a.userData.bakeSurface-b.userData.bakeSurface);for(const object of surfaces){const attr=object.geometry.attributes.position,count=attr.count,ambient=Buffer.alloc(count),day=Buffer.alloc(count),night=Buffer.alloc(count);for(let i=0;i<count;i++){const p=new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(object.matrixWorld);ambient[i]=Math.round(255*directions.reduce((sum,v)=>sum+visible(p,v,32),0)/directions.length);day[i]=255*visible(p,direction.set(-35,55,30).normalize(),160);let lit=0;for(const [x,z] of [[-55,15],[55,15],[-75,90],[75,90]]){const v=new THREE.Vector3(x,37,z).sub(p),length=v.length();lit+=visible(p,v.normalize(),length);}night[i]=Math.round(255*(lit/4*.8+visible(p,direction.set(-55,38,15).normalize(),160)*.2));}const record={count};for(const [key,b] of Object.entries({ambient,day,night})){record[key]=offset;offset+=b.length;buffers.push(b);}surfaceProfiles[park.id].push(record);}
 console.log('Baked',park.id,'seats',groups.reduce((n,g)=>n+g.userData.bakeSeats.length,0),'occluders',occluders.length);
}
const packed=Buffer.concat(buffers),compact=[];let compactOffset=0;for(const groups of [...Object.values(profiles),...Object.values(surfaceProfiles)])for(const record of groups)for(const key of ['ambient','day','night']){compact.push(packed.subarray(record[key],record[key]+record.count));record[key]=compactOffset;compactOffset+=record.count;}
fs.writeFileSync(path.join(root,'assets/lighting/stadium-bake.bin'),Buffer.concat(compact));fs.writeFileSync(path.join(root,'assets/lighting/stadium-bake.json'),JSON.stringify({version:31,method:'Five sky rays, one sun ray and five floodlight visibility rays per seat or surface vertex, against roof and deck triangles',profiles,surfaceProfiles},null,2)+'\n');console.log('Visibility bake bytes',compactOffset);
