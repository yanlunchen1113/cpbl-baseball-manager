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
sandbox.assertRig=(condition,message)=>assert(condition,message);
const context=vm.createContext(sandbox),run=code=>vm.runInContext(code,context);
for(const file of ['game.js','motion-calibration.js','stadium-data.js','baseball-engine.js','baseball-rules.js','broadcast.js','rosters-data.js','pitch-profiles.js','player-traits.js','roster.js','season.js','stadium-setup.js','xinzhuang-model.js','broadcast-camera.js','stadium3d.js']){let source=fs.readFileSync(path.join(root,file),'utf8');if(file==='stadium3d.js')source=source.replace(/\}\)\(\);\s*$/,"window.RIG_TEST={pitcher,batter,catcher,resetPose,armTo,runningPose,battingPose,catcherPose,catcherReturnPose,applyDelivery,actorHand,groundActor,chalkMarks,homeCircleChalk};})();");run(source);}
run('musicEnabled=false;effectsEnabled=false;');

function tick(ms=100){time+=ms;const current=frames;frames=[];for(const fn of current)fn(time)}

sandbox.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,'assets/players/human.json'),'utf8')),arrayBuffer:async()=>{const b=fs.readFileSync(path.join(root,'assets/players/human.bin'));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}});
THREE.TextureLoader=class{load(url,onLoad){const texture=new THREE.Texture();if(onLoad)Promise.resolve().then(()=>onLoad(texture));return texture;}};
run(fs.readFileSync(path.join(root,'human-assets.js'),'utf8'));run('CPBLHuman.load(THREE)');
(async()=>{await new Promise(setImmediate);await new Promise(setImmediate);assert(run('CPBLHuman.ready'),'Human mesh should load');
 for(const side of [0,1]){run(`state.mode='single';startGame(0);state.playerSide=${side};state.half='top';`);tick(100);assert.equal(run('stage.dataset.characterModel'),'makehuman-skinned');
  run('state.strikes=2;beginPitch();tv.flight.x=0;tv.flight.y=0;tv.flight.cpuSwing=false;tv.swung=false;');tick(100);run('finishPitch()');tick(1600);tick(800);assert.equal(run('tv.phase'),'return');
  assert.equal(run('stage.dataset.firstPersonReturn'),String(side===0));
  if(side===0){assert.equal(run('stage.dataset.ballPhase'),'catcher-transfer');}
  tick(1000);assert.equal(run('stage.dataset.ballPhase'),'return-throw');tick(1600);assert.equal(run('tv.phase'),'ready');
 }
 run(`const rig=RIG_TEST;assertRig(rig.chalkMarks.every(m=>m.geometry.type==='BufferGeometry'&&!m.castShadow),'Chalk must be flat mesh without pipe shadow');assertRig(rig.homeCircleChalk.geometry.type==='RingGeometry','Home circle must be flat');for(const a of [rig.pitcher,rig.batter,rig.catcher]){
  assertRig(a.human,'Missing skinned actor');assertRig(a.capMeshes.every(m=>m.visible),'Cap was hidden with helper head meshes');
  for(const side of ['left','right']){
   const elbow=a.parts[side+'Elbow'],palm=a.human.hands[side];assertRig(Math.abs(palm.x)<1e-8&&Math.abs(palm.z)<1e-8,'Palm must share anatomical forearm axis');
   for(const target of [[0,.1,.1],[.6,.4,.2],[-.4,.7,.3],[.1,-.2,.3]]){
    rig.resetPose(a);rig.armTo(a,side,new THREE.Vector3(...target));assertRig(Math.abs(elbow.rotation.y)<1e-8&&Math.abs(elbow.rotation.z)<1e-8,'Elbow must remain a hinge');assertRig(elbow.rotation.x>=.20&&elbow.rotation.x<=2.357,'Anatomical flexion limits');
   }
  }
 }
 for(const hand of ['R','L']){let previous=null;tv.phase='windup';tv.deliveryAt=1000;for(let age=0;age<=3400;age+=20){rig.resetPose(rig.pitcher);rig.pitcher.group.rotation.y=Math.PI;rig.applyDelivery(rig.pitcher,{hand,style:'over'},1000+age);const side=hand==='L'?'left':'right',elbow=rig.pitcher.parts[side+'Elbow'];assertRig(Math.abs(elbow.rotation.y)<1e-8&&Math.abs(elbow.rotation.z)<1e-8,'Delivery elbow twists');const point=rig.actorHand(rig.pitcher,side);assertRig(Number.isFinite(point.y),'Invalid pitch hand');if(age===0){const direction=new THREE.Vector3(0,0,1).transformDirection(rig.pitcher.body.matrixWorld);assertRig(Math.abs(direction.z)<.01,'Pitcher must begin sideways');}if(age===1100){const release=CPBLPhysics.releasePoint({hand,style:'over'});assertRig(point.distanceTo(new THREE.Vector3(release.x,release.y,release.z))<.08,'Release detached '+hand+' '+point.distanceTo(new THREE.Vector3(release.x,release.y,release.z)));}if(age>=1200)assertRig(rig.pitcher.body.rotation.x<.45,'Pitcher torso falls excessively');if(previous)assertRig(point.distanceTo(previous)<.30,'Pitch hand jumps '+hand+' '+age+' '+point.distanceTo(previous));previous=point;}}
 for(const left of [false,true])for(const aimY of [-1,0,1]){tv.aim={x:0,y:aimY};tv.swingAim={...tv.aim};tv.swung=true;tv.swingStart=1000;for(let age=0;age<=1050;age+=10){rig.resetPose(rig.batter);rig.batter.group.position.set(left?-1.1:1.1,0,.15);rig.batter.group.rotation.y=left?Math.PI/2:-Math.PI/2;rig.battingPose(rig.batter,left,1000+age);assertRig(Math.abs(rig.batter.pelvis.position.y-.98)<1e-8,'Batting pelvis must not bob with low aim');if(age===0)assertRig(Math.abs(rig.batter.pelvis.position.x-(left?.075:-.075))<1e-8,'Load must stay over rear foot');if(age===80)assertRig(Math.abs(rig.batter.pelvis.position.x)>.125,'Visible rearward load is missing');if(age===220){const back=left?'left':'right';assertRig(rig.batter.parts[back+'Knee'].quaternion.angleTo(new THREE.Quaternion())>.45,'Rear knee must flex through hip rotation');}if(age===140){const front=left?'right':'left';assertRig(rig.batter.parts[front+'Knee'].quaternion.angleTo(new THREE.Quaternion())<.45,'Front leg must brace at contact '+rig.batter.parts[front+'Knee'].quaternion.angleTo(new THREE.Quaternion()));}for(const side of ['left','right']){assertRig(Math.abs(rig.batter.parts[side+'Elbow'].rotation.z)<1e-8,'Batting elbow twists');const grip=rig.batter.bat.position.clone(),direction=new THREE.Vector3(0,-1,0).applyQuaternion(rig.batter.bat.quaternion);grip.addScaledVector(direction,left?(side==='left'?.035:-.025):(side==='left'?-.025:.035));const palm=rig.batter.body.worldToLocal(rig.actorHand(rig.batter,side));assertRig(palm.distanceTo(grip)<.012,'Batting wrist cannot reach bat grip: '+age+' '+side+' '+palm.distanceTo(grip)+' aim '+aimY+' grip '+grip.toArray()+' shoulder '+rig.batter.parts[side+'Arm'].position.toArray());}}}
 for(const hand of ['R','L']){tv.phase='windup';tv.deliveryAt=1000;const rear=hand==='L'?'left':'right',lead=hand==='L'?'right':'left';let previous=null;for(let age=2100;age<=3100;age+=20){rig.resetPose(rig.pitcher);rig.pitcher.group.rotation.y=Math.PI;rig.applyDelivery(rig.pitcher,{hand,style:'over'},1000+age);rig.pitcher.group.updateMatrixWorld(true);const side=age<=2600?rear:lead,leg=rig.pitcher.human.legs[side],foot=rig.pitcher.parts[side+'Knee'].localToWorld(new THREE.Vector3(0,-leg.lower,0));if(previous&&previous.side===side)assertRig(Math.abs(foot.z-previous.z)<.012,'Recovery support foot slides '+hand+' '+age);previous={side,z:foot.z};}assertRig(Math.abs(rig.pitcher.group.position.z-18.32)<.001,'Pitcher recovery position');}
 for(let frame=0;frame<60;frame++){rig.resetPose(rig.batter);rig.runningPose(rig.batter,frame*.12,6);for(const side of ['left','right'])assertRig(Math.abs(rig.batter.parts[side+'Elbow'].rotation.z)<1e-8,'Running elbow twists');}`);
  run(`const z=window.CPBL_BATTER_ZONE;assertRig(z.top>z.bottom&&z.bottom<.65&&z.top<1.4,'Zone must extend below waist to knees');
 const zoneFrame={type:'四縫線',hand:'R',x:0,y:0,zone:z};assertRig(CPBLPhysics.isStrike(zoneFrame),'Centre must be a strike');
 for(const height of [165,183,198]){const zone=CPBLPhysics.batterZone({height});const f={...zoneFrame,zone};
  f.y=1;assertRig(Math.abs(CPBLPhysics.pitchPoint(f,1).y-zone.bottom)<1e-8,'Aim bottom must equal zone bottom');assertRig(CPBLPhysics.isStrike(f),'Knee edge must be strike');
  f.y=-1;assertRig(Math.abs(CPBLPhysics.pitchPoint(f,1).y-zone.top)<1e-8,'Aim top must equal zone top');
  f.y=-1-.08/zone.halfHeight;assertRig(!CPBLPhysics.isStrike(f),'Above upper edge must be ball');
  f.y=1+.08/zone.halfHeight;assertRig(!CPBLPhysics.isStrike(f),'Below knee edge must be ball');
  f.y=0;f.x=1+.036/zone.halfWidth;assertRig(CPBLPhysics.isStrike(f),'Ball radius touching plate must count');f.x=1+.04/zone.halfWidth;assertRig(!CPBLPhysics.isStrike(f),'Entire ball beyond plate must be ball');
 }
 assertRig(CPBLPhysics.batterZone({height:165}).top<CPBLPhysics.batterZone({height:198}).top,'Height must affect zone');`);
 assert.equal(errors.length,0,errors.join('\n'));console.log('Skinned human mesh, both player views and first-person return passed; anatomical arm binding, hinge limits and running poses passed; zero scene errors.');
})().catch(error=>{console.error(error);process.exitCode=1});
