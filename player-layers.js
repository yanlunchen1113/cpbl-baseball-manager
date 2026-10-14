/* Photo-observed base layers, skinned to the same anatomy as the player. */
(function(root){
 function clear(a){for(const m of a.baseLayers?.meshes||[]){a.group.remove(m);m.geometry.dispose();m.material.dispose();}a.baseLayers=null;if(a.human)a.human.sleeveMeshes=[];}
 function geometry(T,a,kind,length){
  const source=a.human.meshes[0].geometry,p=source.attributes.position,n=source.attributes.normal,ids=source.attributes.skinIndex,w=source.attributes.skinWeight,index=source.index.array;
  const positions=[],indices=[],weights=[];
  const vertex=i=>{const skin=new Map();for(let k=0;k<4;k++)if(w.getComponent(i,k)>0)skin.set(ids.getComponent(i,k),w.getComponent(i,k));return {p:new T.Vector3().fromBufferAttribute(p,i),n:new T.Vector3().fromBufferAttribute(n,i),skin};};
  const blend=(a,b,t)=>{const skin=new Map();for(const [id,v]of a.skin)skin.set(id,v*(1-t));for(const[id,v]of b.skin)skin.set(id,(skin.get(id)||0)+v*t);return {p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize(),skin};};
  const clip=(polygon,distance)=>{const out=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],da=distance(a),db=distance(b);if(da<=0)out.push(a);if((da<=0)!==(db<=0))out.push(blend(a,b,da/(da-db)));}return out;};
  let cut;if(kind==='neck'){cut=v=>v.p.y-(1.695-.032*T.MathUtils.smoothstep(v.p.z,0,.09));}else{const j=a.human.armJoints[kind],e=new T.Vector3(...j.elbow),axis=new T.Vector3(...j.palm).sub(e),limit=length==='long'?.91:.08;cut=v=>v.p.clone().sub(e).dot(axis)/axis.lengthSq()-limit;}
  const armWeight=(v,side)=>{let sum=0;for(const [id,weight]of v.skin)if((side==='left'?[2,3,10]:[4,5,11]).includes(id))sum+=weight;return sum;};
  for(let i=0;i<index.length;i+=3){let polygon=[0,1,2].map(k=>vertex(index[i+k]));
   if(kind==='neck'){if(polygon.some(v=>Math.abs(v.p.x)>.21)||polygon.reduce((s,v)=>s+v.p.y,0)/3<1.45)continue;polygon=clip(polygon,v=>1.46-v.p.y);}else if(polygon.reduce((s,v)=>s+armWeight(v,kind),0)<1.35)continue;
   polygon=clip(polygon,cut);if(polygon.length<3)continue;
   for(let k=1;k<polygon.length-1;k++)for(const v of [polygon[0],polygon[k],polygon[k+1]]){const pt=v.p.clone().addScaledVector(v.n,.003);positions.push(pt.x,pt.y,pt.z);const packed=[...v.skin].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=packed.reduce((s,p)=>s+p[1],0);for(let j=0;j<4;j++){indices.push(packed[j]?.[0]||0);weights.push((packed[j]?.[1]||0)/(sum||1));}}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('skinIndex',new T.Float32BufferAttribute(indices,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));root.CPBLHuman.smoothNormals(T,g);return g;
 }
 function apply(T,a,p,team){if(!a.human)return;const name=(p.name||'').replace(/^[◎#*\s]+/,''),profile=root.CPBLLayering?.[team+'/'+name],key=team+'/'+name+'/'+JSON.stringify(profile||null);if(a.baseLayers?.key===key)return;clear(a);a.baseLayers={key,meshes:[],profile};if(!profile)return;
  const add=(kind,length,color)=>{const g=geometry(T,a,kind,length);if(!g.attributes.position.count){g.dispose();return;}const mesh=new T.SkinnedMesh(g,new T.MeshStandardMaterial({color,roughness:.93,side:T.DoubleSide}));mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;a.group.add(mesh);mesh.bind(a.human.skeleton,a.human.meshes[0].bindMatrix);a.baseLayers.meshes.push(mesh);};
  if(profile.neck)add('neck','short',profile.neck);for(const side of ['left','right'])if(profile[side]?.length!=='none')add(side,profile[side].length,profile[side].color);
  a.human.sleeveMeshes=a.baseLayers.meshes;
 }
 root.CPBLBaseLayers={apply,clear};
})(window);
