/* CC0 MakeHuman anatomy and clothed mesh, skinned to the baseball pose hierarchy. */
(function(root){
 let asset=null,loading=false;
 function load(T){if(loading)return;loading=true;
  Promise.all([fetch('assets/players/human.json?v=31.6').then(r=>{if(!r.ok)throw Error('Human manifest unavailable');return r.json()}),fetch('assets/players/human.bin?v=31.6').then(r=>{if(!r.ok)throw Error('Human mesh unavailable');return r.arrayBuffer()}),new Promise((resolve,reject)=>new T.TextureLoader().load('assets/players/skin-asian-male.png',resolve,undefined,reject))]).then(([manifest,buffer,skin])=>{
   skin.colorSpace=T.SRGBColorSpace;skin.anisotropy=4;
   const geometries=manifest.sections.map(s=>{const g=new T.BufferGeometry();for(const k of ['position','uv','skinIndex','skinWeight']){const a=s[k];g.setAttribute(k,new T.BufferAttribute(new Float32Array(buffer,a.offset,a.count),k==='position'?3:k==='uv'?2:4));}if(s.positionGrip){g.morphAttributes.position=[new T.BufferAttribute(new Float32Array(buffer,s.positionGrip.offset,s.positionGrip.count),3)];}g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,s.index.offset,s.index.count),1));g.computeVertexNormals();return g;});
   const handGeometries={},bodyGeometry=geometries[0],position=bodyGeometry.attributes.position,index=bodyGeometry.index.array,ids=bodyGeometry.attributes.skinIndex,weights=bodyGeometry.attributes.skinWeight,buckets={body:[],left:[],right:[]};const handSide=v=>{if(position.getZ(v)<.245)return '';for(let k=0;k<4;k++){const bone=ids.array[v*4+k];if(weights.array[v*4+k]>.75&&(bone===3||bone===5))return bone===3?'left':'right';}return '';};for(let i=0;i<index.length;i+=3){const sides=[0,1,2].map(k=>handSide(index[i+k])),side=sides[0]&&sides.every(s=>s===sides[0])?sides[0]:'body';buckets[side].push(index[i],index[i+1],index[i+2]);}for(const side of ['left','right']){handGeometries[side]=bodyGeometry.clone();handGeometries[side].setIndex(buckets[side]);}bodyGeometry.setIndex(buckets.body);asset={manifest,geometries,skin,handGeometries};
  }).catch(error=>{root.CPBL_HUMAN_ERROR=String(error);console.warn('Human assets',error)});
 }
 function attach(a,T,skinMaterial,darkMaterial){if(!asset||a.human)return false;
  // Retain the pose hierarchy, baseball equipment, cap, belt and shoes.
  a.group.traverse(o=>{if(!o.isMesh)return;const material=o.material,cap=a.capMeshes?.includes(o),sock=material===a.uniform&&o.position.y<-.35;
   if(material===a.pants||material===skinMaterial||material===a.uniform&&!cap&&!sock||o.parent===a.body&&!cap&&o.position.y>.5&&o.position.y<.73&&o!==a.front&&o!==a.back&&['SphereGeometry','CylinderGeometry'].includes(o.geometry?.type)||o.parent===a.body&&material===darkMaterial)o.visible=false;
  });
  const saved=[];for(const side of ['left','right']){for(const part of ['Arm','Elbow','Leg','Knee']){const bone=a.parts[side+part];saved.push([bone,bone.rotation.clone()]);bone.rotation.set(0,0,0);}a.parts[side+'Arm'].rotation.z=side==='left'?.70:-.70;a.parts[side+'Elbow'].rotation.x=-.75;a.parts[side+'Leg'].rotation.z=side==='left'?.17:-.17;a.parts[side+'Knee'].rotation.z=side==='left'?.10:-.10;}
  // Bind each arm at the measured MakeHuman helper joints, in the mesh's own rest pose.
  // Animation uses a straight local -Y chain; inverse bind matrices retain the original A pose.
  const hands={},gripNormals={};
  for(const side of ['left','right']){
   const j=asset.manifest.armJoints?.[side];if(!j)throw Error('Missing anatomical arm joints');
   const shoulder=new T.Vector3(...j.shoulder),end=new T.Vector3(...j.elbow),palm=new T.Vector3(...j.palm),upper=end.clone().sub(shoulder),lower=palm.clone().sub(end),arm=a.parts[side+'Arm'],elbow=a.parts[side+'Elbow'],down=new T.Vector3(0,-1,0);
   arm.position.copy(shoulder).sub(new T.Vector3(0,1.18,0));
   const hinge=upper.clone().cross(lower).normalize(),y=upper.clone().normalize().negate(),z=hinge.clone().cross(y).normalize();arm.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(hinge,y,z));
   elbow.position.set(0,-upper.length(),0);elbow.rotation.set(Math.acos(Math.max(-1,Math.min(1,upper.clone().normalize().dot(lower.clone().normalize())))),0,0);
   hands[side]=new T.Vector3(0,-lower.length(),0);
   const restFore=arm.quaternion.clone().multiply(elbow.quaternion);gripNormals[side]=new T.Vector3(side==='left'?-1:1,0,0).applyQuaternion(restFore.invert());
  }
  const legs={};
  for(const side of ['left','right']){
   const j=asset.manifest.legJoints[side],hipPoint=new T.Vector3(...j.hip),kneePoint=new T.Vector3(...j.knee),ankle=new T.Vector3(...j.ankle),upper=kneePoint.clone().sub(hipPoint),lower=ankle.clone().sub(kneePoint),hip=a.parts[side+'Leg'],knee=a.parts[side+'Knee'],down=new T.Vector3(0,-1,0);
   hip.position.copy(hipPoint).sub(new T.Vector3(0,1.02,0));hip.quaternion.setFromUnitVectors(down,upper.clone().normalize());knee.position.set(0,-upper.length(),0);knee.quaternion.copy(hip.quaternion).invert().multiply(new T.Quaternion().setFromUnitVectors(down,lower.clone().normalize()));
   legs[side]={upper:upper.length(),lower:lower.length()};
   for(const child of knee.children)if(child.isMesh&&child.material===darkMaterial)child.position.y=-lower.length();
  }
  a.group.updateMatrixWorld(true);
  const bones=asset.manifest.bones.map(n=>a[n]||a.parts[n]),skeleton=new T.Skeleton(bones),skin=new T.MeshPhysicalMaterial({map:asset.skin,roughness:.62,metalness:0,clearcoat:.035,clearcoatRoughness:.7});
  skin.envMapIntensity=a.uniform.envMapIntensity;const materials=[skin,a.uniform,a.pants];a.uniform.roughness=.95;a.pants.roughness=.98;
  const meshes=asset.geometries.map((g,i)=>{const m=new T.SkinnedMesh(g,materials[i]);m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;a.group.add(m);m.updateMatrixWorld(true);m.bind(skeleton);return m;});
  for(const [bone,rotation] of saved)bone.rotation.copy(rotation);
  if(['ump','baseump','catch'].includes(a.kind)){a.front.visible=false;a.back.visible=false;}a.front.position.z=.205;a.back.position.z=-.20;a.front.renderOrder=a.back.renderOrder=1;
  const handMeshes={};for(const side of ['left','right']){const m=new T.SkinnedMesh(asset.handGeometries[side],skin);m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;a.group.add(m);m.bind(skeleton,meshes[0].bindMatrix);handMeshes[side]=m;}a.human={meshes,skeleton,hands,handMeshes,legs,gripNormals};a.key='';return true;
 }
 root.CPBLHuman={load,attach,get ready(){return !!asset}};
})(window);
