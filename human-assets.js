/* CC0 MakeHuman anatomy and clothed mesh, skinned to the baseball pose hierarchy. */
(function(root){
 let asset=null,loading=false;
 function load(T){if(loading)return;loading=true;
  Promise.all([fetch('assets/players/human.json').then(r=>{if(!r.ok)throw Error('Human manifest unavailable');return r.json()}),fetch('assets/players/human.bin').then(r=>{if(!r.ok)throw Error('Human mesh unavailable');return r.arrayBuffer()}),new Promise((resolve,reject)=>new T.TextureLoader().load('assets/players/skin-asian-male.png',resolve,undefined,reject))]).then(([manifest,buffer,skin])=>{
   skin.colorSpace=T.SRGBColorSpace;skin.anisotropy=4;
   const geometries=manifest.sections.map(s=>{const g=new T.BufferGeometry();for(const k of ['position','uv','skinIndex','skinWeight']){const a=s[k];g.setAttribute(k,new T.BufferAttribute(new Float32Array(buffer,a.offset,a.count),k==='position'?3:k==='uv'?2:4));}g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,s.index.offset,s.index.count),1));g.computeVertexNormals();return g;});
   asset={manifest,geometries,skin};
  }).catch(error=>{root.CPBL_HUMAN_ERROR=String(error);console.warn('Human assets',error)});
 }
 function attach(a,T,skinMaterial,darkMaterial){if(!asset||a.human)return false;
  // Retain the pose hierarchy, baseball equipment, cap, belt and shoes.
  a.group.traverse(o=>{if(!o.isMesh)return;const material=o.material,cap=o.parent===a.body&&material===a.uniform&&o.position.y>.73,sock=material===a.uniform&&o.position.y<-.35;
   if(material===a.pants||material===skinMaterial||material===a.uniform&&!cap&&!sock||o.parent===a.body&&o.position.y>.5&&o.position.y<.73&&o!==a.front&&o!==a.back&&['SphereGeometry','CylinderGeometry'].includes(o.geometry?.type)||o.parent===a.body&&material===darkMaterial)o.visible=false;
  });
  const saved=[];for(const side of ['left','right']){for(const part of ['Arm','Elbow','Leg','Knee']){const bone=a.parts[side+part];saved.push([bone,bone.rotation.clone()]);bone.rotation.set(0,0,0);}a.parts[side+'Arm'].rotation.z=side==='left'?.70:-.70;a.parts[side+'Elbow'].rotation.x=-.75;a.parts[side+'Leg'].rotation.z=side==='left'?.17:-.17;a.parts[side+'Knee'].rotation.z=side==='left'?.10:-.10;}
  a.group.updateMatrixWorld(true);
  const bones=asset.manifest.bones.map(n=>a[n]||a.parts[n]),skeleton=new T.Skeleton(bones),skin=new T.MeshPhysicalMaterial({map:asset.skin,roughness:.62,metalness:0,clearcoat:.035,clearcoatRoughness:.7});
  skin.envMapIntensity=a.uniform.envMapIntensity;const materials=[skin,a.uniform,a.pants];a.uniform.roughness=.95;a.pants.roughness=.98;
  const meshes=asset.geometries.map((g,i)=>{const m=new T.SkinnedMesh(g,materials[i]);m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;a.group.add(m);m.updateMatrixWorld(true);m.bind(skeleton);return m;});
  for(const [bone,rotation] of saved)bone.rotation.copy(rotation);
  if(['ump','baseump','catch'].includes(a.kind)){a.front.visible=false;a.back.visible=false;}a.front.position.z=.205;a.back.position.z=-.20;a.front.renderOrder=a.back.renderOrder=1;
  a.human={meshes,skeleton};a.key='';return true;
 }
 root.CPBLHuman={load,attach,get ready(){return !!asset}};
})(window);
