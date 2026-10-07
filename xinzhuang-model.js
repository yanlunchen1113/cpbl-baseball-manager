/* New Xinzhuang reference reconstruction. Metres; home (0,0,0), CF +Z.
   Published boundary distances are fixed. Occluded building dimensions are
   explicit estimates in data/xinzhuang-reconstruction.json, not survey data. */
(function(root){
 root.CPBLXinzhuang={groundGeometry(T,holes){const shape=new T.Shape();shape.moveTo(-165,-165);shape.lineTo(165,-165);shape.lineTo(165,165);shape.lineTo(-165,165);shape.closePath();for(const vertices of holes){const h=new T.Path();vertices.forEach(([x,z],i)=>i?h.lineTo(x,70-z):h.moveTo(x,70-z));h.closePath();shape.holes.push(h);}return new T.ShapeGeometry(shape,4);},build(ctx){
  const {T,parent,p,mesh,box,segment,mat,chairRows,labelTexture,wallDistance}=ctx;
  const concrete=mat('#a8ada8',{roughness:.98}),steel=mat('#788d89',{metalness:.55,roughness:.54}),pad=mat('#213c38',{roughness:.92}),night=root.CPBL_LIGHTING==='night';
  const anchors=[[-78,75],[-63,51],[-45,24],[-31,2],[-20,-14],[0,-19.538],[20,-14],[31,2],[45,24],[63,51],[78,75]];
  const route=new T.CatmullRomCurve3(anchors.map(([x,z])=>new T.Vector3(x,0,z)),false,'centripetal');
  const pose=new T.Object3D(),stepMatrices=[],railMatrices=[],columnMatrices=[];
  function sample(t,offset=0,y=0){const v=route.getPointAt(Math.max(0,Math.min(1,t))),d=route.getTangentAt(Math.max(.00001,Math.min(.99999,t))),normal=new T.Vector3(-d.z,0,d.x).normalize();v.addScaledVector(normal,-offset);v.y=y;return {v,d,normal,turn:Math.atan2(-d.z,d.x)};}
  function panel(a,b,y,h,depth,material,offset=0){const c=sample((a+b)/2,offset,y),left=sample(a,offset,y).v,right=sample(b,offset,y).v,o=box(left.distanceTo(right)+.06,h,depth,material,c.v.x,y,c.v.z,parent);o.rotation.y=c.turn;return o;}
  function strip(a,b,inner,outer,y0,y1,material,occluder=false){const v=[],idx=[],n=Math.max(3,Math.ceil((b-a)*104));for(let i=0;i<=n;i++){const t=a+(b-a)*i/n;for(const [off,y] of [[inner,y0],[outer,y1]])v.push(...sample(t,off,y).v.toArray());if(i<n){const k=i*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();const o=mesh(g,material,0,0,0,parent);if(occluder)o.userData.staticOccluder=true;return o;}
  function rail(a,b,offset,y,posts=8){for(const dy of [0,.35,.70])for(let i=0;i<posts;i++){const l=sample(a+(b-a)*i/posts,offset,y+dy),r=sample(a+(b-a)*(i+1)/posts,offset,y+dy);segment(l.v,r.v,.027,steel,parent).castShadow=false;}for(let i=0;i<=posts;i++){const c=sample(a+(b-a)*i/posts,offset,y+.33);pose.position.copy(c.v);pose.rotation.set(0,0,0);pose.scale.set(.045,.79,.045);pose.updateMatrix();railMatrices.push(pose.matrix.clone());}}
  function instanced(geometry,material,matrices){const o=new T.InstancedMesh(geometry,material,matrices.length);matrices.forEach((m,i)=>o.setMatrixAt(i,m));o.receiveShadow=true;o.castShadow=false;parent.add(o);return o;}
  // Section boundaries follow the official seating plan, with a rounded home
  // plate corner and almost straight foul-line wings. Clear aisles every block.
  const sections=26,chairs=[];
  for(const [level,front,y0,rows,rise] of [[0,1.0,1.95,17,.32],[1,8.2,9.65,10,.39]]){
   for(let s=0;s<sections;s++){
    const a=s/sections,b=(s+1)/sections,margin=.005,mid=(a+b)/2;
    strip(a,b,front,front+rows*.80,y0-.16,y0+rows*rise-.16,concrete,true);
    if(level){strip(a,b,front,front+rows*.80,y0-.42,y0+rows*rise-.42,concrete,true);panel(a,b,y0-.29,.26,.35,concrete,front-.02).userData.staticOccluder=true;}
    for(let row=0;row<rows;row++){
     const offset=front+row*.80,c=sample(mid,offset,y0+row*rise-.075),w=sample(a,offset).v.distanceTo(sample(b,offset).v);
     pose.position.copy(c.v);pose.rotation.set(0,c.turn,0);pose.scale.set(w,.15,.80);pose.updateMatrix();stepMatrices.push(pose.matrix.clone());
     // Solid risers connect the tier surfaces; no open grass gaps below seats.
     if(row)panel(a,b,y0+row*rise-rise/2,rise,.08,concrete,offset-.40).castShadow=false;
     const start=sample(a+margin,offset),end=sample(b-margin,offset),cols=Math.max(2,Math.floor(start.v.distanceTo(end.v)/.54));
     for(let col=0;col<cols;col++){
      const t=a+margin+(b-a-2*margin)*(col+.5)/cols,at=sample(t,offset,y0+row*rise+.08),block=s<13?13-s:s-12;
      // Family blocks have muted cyan; newer ordinary seats retain blue palette.
      const color=level&&block<3?'#579ba9':level?'#376a99':block<7?'#216ba4':'#3c79a4';
      chairs.push({x:at.v.x,y:at.v.y,z:at.v.z,a:at.turn,color});
     }
    }
    const side=s<13?'A':'B',number=s<13?13-s:s-12,tag=level?(side==='A'?'C':'D')+number:side+number;
    const face=panel(a,b,y0-.10,.55,.18,pad,front-.14);face.userData.section=tag;
    if(level) {const band=panel(a,b,y0+.14,.29,.21,mat('#ffffff',{map:labelTexture('FUBON GUARDIANS  ·  '+tag,'#12385e','#dae6ec',1024),emissive:'#1a4260',emissiveIntensity:night?2.5:.08}),front-.20);band.castShadow=false;}
    const signAt=sample(mid,front-.35,y0+.60),sign=mesh(new T.PlaneGeometry(1.05,.40),mat('#ffffff',{map:labelTexture(tag,'#183e66','#f2f3e8',256),side:T.DoubleSide}),signAt.v.x,signAt.v.y,signAt.v.z,parent);sign.rotation.y=signAt.turn;sign.castShadow=false;
    rail(a,b,front-.1,y0+.25,3);
    // Cross aisles and perimeter rails are continuous rather than solid slabs.
    strip(a,b,front+rows*.8,front+rows*.8+1.65,y0+rows*rise-.15,y0+rows*rise-.15,concrete,true);
    rail(a,b,front+rows*.8+1.55,y0+rows*rise+.18,3);
    const rearOffset=front+rows*.8+1.75,rearHeight=level?1.0:2.30,rearY=y0+rows*rise+rearHeight/2-.15;
    if(level===0&&s%3===1){for(const [l,r] of [[a,mid-.0045],[mid+.0045,b]])panel(l,r,rearY,rearHeight,.24,concrete,rearOffset).userData.staticOccluder=true;panel(mid-.0045,mid+.0045,rearY+rearHeight/2-.15,.30,.24,concrete,rearOffset).userData.staticOccluder=true;}
    else panel(a,b,rearY,rearHeight,.24,concrete,rearOffset).userData.staticOccluder=true;
    if(s%2===0){const c=sample(a,level?17.3:front+4,y0/2);pose.position.copy(c.v);pose.rotation.set(0,c.turn,0);pose.scale.set(.40,y0,.48);pose.updateMatrix();columnMatrices.push(pose.matrix.clone());}
    // Dark access portals occur behind the lower cross aisle, not on the field.
    if(level===0&&s%3===1){const c=sample(mid,front+rows*.8+1.5,y0+rows*rise+1.12),hole=box(2.25,2.4,.18,mat('#29332f'),c.v.x,c.v.y,c.v.z,parent);hole.rotation.y=c.turn;}
   }
  }
  instanced(new T.BoxGeometry(1,1,1),concrete,stepMatrices);instanced(new T.BoxGeometry(1,1,1),steel,railMatrices);instanced(new T.BoxGeometry(1,1,1),concrete,columnMatrices);chairRows(chairs,p.seat,parent);
  // Individual barrel-vault bays, steel arch ribs, purlins and underside.
  // The earlier undulating sheet had no load-bearing structure.
  const roofMaterial=mat('#eaeeed',{side:T.DoubleSide,roughness:.88}),roofBays=26;
  for(let bay=0;bay<roofBays;bay++){
   const a=bay/roofBays,b=(bay+1)/roofBays,verts=[],idx=[],across=10,depth=7;
   function roofPoint(u,v){const t=a+(b-a)*u,at=sample(t,8.2+v*17.5,17.0+v*1.3+Math.sin(Math.PI*u)*1.55);return at.v;}
   for(let u=0;u<=across;u++)for(let v=0;v<=depth;v++){verts.push(...roofPoint(u/across,v/depth).toArray());if(u<across&&v<depth){const k=u*(depth+1)+v;idx.push(k,k+1,k+depth+1,k+1,k+depth+2,k+depth+1);}}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();mesh(g,roofMaterial,0,0,0,parent).userData.staticOccluder=true;
   for(const v of [0,.48,1]){const points=Array.from({length:11},(_,j)=>roofPoint(j/10,v).add(new T.Vector3(0,-.08,0))),curve=new T.CatmullRomCurve3(points);mesh(new T.TubeGeometry(curve,12,.055,6,false),steel,0,0,0,parent).castShadow=false;}
   for(const u of [0,.5,1]){segment(roofPoint(u,0).add(new T.Vector3(0,-.08,0)),roofPoint(u,1).add(new T.Vector3(0,-.08,0)),.045,steel,parent).castShadow=false;}
   const columnHeight=roofPoint(.5,1).y,c=sample((a+b)/2,25.6,columnHeight/2);box(.33,columnHeight,.33,concrete,c.v.x,c.v.y,c.v.z,parent);
   const foot=sample((a+b)/2,25.6,14.5).v,top=roofPoint(.5,.76);segment(foot,top,.065,steel,parent).castShadow=false;
  }
  // Backstop follows the same fitted footprint. Dugout openings interrupt it.
  const wallPieces=78;
  for(let i=0;i<wallPieces;i++){
   const a=i/wallPieces,b=(i+1)/wallPieces,mid=(a+b)/2;
   const dug=(mid>.285&&mid<.375)||(mid>.625&&mid<.715);
   if(!dug){const w=panel(a,b,.83,1.66,.38,pad,-1.25);w.castShadow=false;
    if(mid>.37&&mid<.63){const ads=['好立善','富邦人壽','FOOTER','台灣大哥大','中保無限'],at=sample(mid,-1.49,.93),ad=mesh(new T.PlaneGeometry(sample(a,-1.25).v.distanceTo(sample(b,-1.25).v)-.04,1.12),mat('#ffffff',{map:labelTexture(ads[Math.floor((mid-.37)/.052)%ads.length],'#3f514b','#eeeee0',512),side:T.DoubleSide}),at.v.x,at.v.y,at.v.z,parent);ad.rotation.y=at.turn;ad.castShadow=false;}
   }
  }
  // The supplied aerial/behind-home photographs show a red horseshoe apron.
  const apronVertices=[],apronIndices=[];for(let i=0;i<=96;i++){const t=.025+.95*i/96;for(const off of [-6.2,-1.45]){const at=sample(t,off,.005).v;if(at.z>0&&Math.abs(at.x)<at.z+.7)at.x=Math.sign(at.x)*(at.z+.7);apronVertices.push(...at.toArray());}if(i<96){const k=i*2;apronIndices.push(k,k+2,k+1,k+1,k+2,k+3);}}
  const apronGeometry=new T.BufferGeometry();apronGeometry.setAttribute('position',new T.Float32BufferAttribute(apronVertices,3));apronGeometry.setIndex(apronIndices);apronGeometry.computeVertexNormals();mesh(apronGeometry,mat('#914337',{roughness:1,side:T.DoubleSide}),0,0,0,parent).castShadow=false;
  // Continuous infield ring stage/concourse sits above the dugout roof.
  // It closes the former grass gap between the first seating row and backstop.
  const ringFloor=mat('#8a806d',{roughness:.95});strip(0,1,-1.22,1.05,1.94,1.94,ringFloor).castShadow=false;
  for(let i=0;i<78;i++){const a=i/78,b=(i+1)/78;panel(a,b,1.72,.44,.18,mat('#214c78'),-1.18).castShadow=false;}
  const groundHoles=[];
  for(const t of [.33,.67]){
   const at=sample(t,1.3,-.45),dug=new T.Group();dug.position.copy(at.v);dug.rotation.y=at.turn;parent.add(dug);
   groundHoles.push([[-8.15,-2.45],[8.15,-2.45],[8.15,2.2],[-8.15,2.2]].map(([x,z])=>[at.v.x+x*Math.cos(at.turn)+z*Math.sin(at.turn),at.v.z-x*Math.sin(at.turn)+z*Math.cos(at.turn)]));
   box(16.3,.09,4.7,concrete,0,-.025,-.12,dug);
   box(16,2.3,.22,concrete,0,1.15,-2.3,dug);box(.25,2.3,4.5,concrete,-8,1.15,-.15,dug);box(.25,2.3,4.5,concrete,8,1.15,-.15,dug);box(16,.18,4.5,concrete,0,2.27,-.15,dug);
   box(14,.12,.58,mat('#748880'),0,.54,-1.2,dug);box(14,.5,.10,pad,0,.82,-1.45,dug);
   for(let i=0;i<8;i++)box(.07,.82,.07,steel,-7+i*2,.41,2.1,dug);
   box(16,.065,.08,steel,0,.83,2.1,dug);
   const front=mesh(new T.PlaneGeometry(13,1.0),mat('#ffffff',{map:labelTexture('FUBON GUARDIANS','#254b76','#f1f1e7',1024)}),0,1.7,-2.13,dug);front.castShadow=false;
  }
  // Two bullpen lanes are behind the foul-line wings, constrained to leave the
  // fair playing surface clear. These hidden dimensions are documented estimates.
  for(const side of [-1,1]){
   const pen=new T.Group();pen.position.set(side*77,0,60);pen.rotation.y=side<0?.77:-.77;parent.add(pen);
   box(5,.025,22,mat('#9e7357'),0,.016,0,pen).castShadow=false;
   for(const x of [-2.6,2.6]){segment(new T.Vector3(x,1.1,-11),new T.Vector3(x,1.1,11),.035,steel,pen).castShadow=false;for(let j=0;j<7;j++)box(.055,2.2,.055,steel,x,1.1,-11+j*22/6,pen);}
   for(const x of [-1.2,1.2]){const bump=mesh(new T.SphereGeometry(.85,12,6,0,Math.PI*2,0,Math.PI/2),mat('#b48162'),x,.01,7,pen);bump.scale.y=.16;box(.5,.015,.13,mat('#ece9dd'),x,.14,7,pen);}
  }
  // Separate left/right outfield bleachers and centre-field batter's eye.
  const outChairs=[],ofConcrete=mat('#a6aaa0',{side:T.DoubleSide}),stageStart=.369,stageEnd=.681,stageAngle=(stageStart+stageEnd)/2;
  const stageSector=theta=>theta>=stageStart-.00001&&theta<=stageEnd+.00001;
  const onStage=(theta,row)=>stageSector(theta)&&row<3;
  for(const side of [-1,1])for(let sector=0;sector<12;sector++){
   const a=side<0?-.785+sector*.052:.161+sector*.052,b=a+.052,mid=(a+b)/2;
   for(let row=0;row<11;row++){
    const r=wallDistance(mid)+4.5+row*.78,y=3.70+row*.34,w=r*(b-a);
    // Exact radial edges join adjacent bays; solid risers close the view from home.
    const vertices=[];for(const theta of [a,b])for(const off of [-.39,.39]){const rr=wallDistance(theta)+4.5+row*.78+off;vertices.push(Math.sin(theta)*rr,y,Math.cos(theta)*rr);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex([0,1,2,1,3,2]);g.computeVertexNormals();if(!onStage(mid,row))mesh(g,ofConcrete,0,0,0,parent).castShadow=false;
    const high=row===3&&stageSector(mid)?1.02:row?.34:3.70,rv=[];for(const theta of [a,b]){const rr=wallDistance(theta)+4.5+row*.78-.39;for(const yy of [y,y-high])rv.push(Math.sin(theta)*rr,yy,Math.cos(theta)*rr);}
    const rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute(rv,3));rg.setIndex([0,2,1,1,2,3]);rg.computeVertexNormals();if(!onStage(mid,row))mesh(rg,ofConcrete,0,0,0,parent).castShadow=false;
    const cols=Math.floor((w-1.0)/.56);for(let col=0;col<cols;col++){const t=a+.5/r+(b-a-1/r)*(col+.5)/cols,rr=wallDistance(t)+4.5+row*.78;if(onStage(t,row))continue;outChairs.push({x:Math.sin(t)*rr,y:y+.08,z:Math.cos(t)*rr,a:t+Math.PI,color:side>0&&stageSector(t)&&row>=3&&row<=5?'#d2d5d0':row<3?'#497d81':'#2f6985'});}
   }
   for(const yy of [7.42,7.76]){const l=new T.Vector3(Math.sin(a)*(wallDistance(a)+12.69),yy,Math.cos(a)*(wallDistance(a)+12.69)),r=new T.Vector3(Math.sin(b)*(wallDistance(b)+12.69),yy,Math.cos(b)*(wallDistance(b)+12.69));segment(l,r,.025,steel,parent).castShadow=false;}for(const t of [a,b]){const rr=wallDistance(t)+12.69;segment(new T.Vector3(Math.sin(t)*rr,7.10,Math.cos(t)*rr),new T.Vector3(Math.sin(t)*rr,7.80,Math.cos(t)*rr),.03,steel,parent).castShadow=false;}
  }
  chairRows(outChairs,'#36728c',parent);
  const cf=wallDistance(0);box(33,9,.6,mat('#152d21'),0,7.8,cf+3.5,parent);box(33,.14,3,concrete,0,12.4,cf+4.4,parent);
  for(const [angle,w,h] of [[-.26,25,11],[.27,19,9]]){
   const r=wallDistance(angle)+12,x=Math.sin(angle)*r,z=Math.cos(angle)*r,y=14;
   const board=new T.Group();board.position.set(x,y,z);board.rotation.y=angle+Math.PI;parent.add(board);
   box(w,h,.7,mat('#242b2b'),0,0,0,board);for(const sx of [-w*.34,w*.34])box(.55,13,.55,steel,sx,-6.5,-.25,board);
   const screenTexture=labelTexture(angle<0?'FUBON GUARDIANS':'新莊棒球場','#0d2f5f','#e6eff7',1024);const screen=mesh(new T.PlaneGeometry(w-.7,h-.7),mat('#ffffff',{map:screenTexture,emissive:'#7393c2',emissiveMap:screenTexture,emissiveIntensity:night?1.3:.12}),0,0,.38,board);screen.castShadow=false;
  }
  // Right field only: the first three seating rows are replaced, rather than
  // placing a separate box over the stairs. Length/depth are photo estimates.
  const cheer=new T.Group();cheer.name='right-outfield-front-row-stage';parent.add(cheer);
  const stageY=3.70,frontOffset=4.11,rearOffset=6.45,stageSegments=30;
  function stagePoint(theta,offset,y){const r=wallDistance(theta)+offset;return new T.Vector3(Math.sin(theta)*r,y,Math.cos(theta)*r);}
  const deck=[],di=[],front=[],fi=[],rear=[],ri=[];
  for(let i=0;i<=stageSegments;i++){const t=stageStart+(stageEnd-stageStart)*i/stageSegments;
   for(const off of [frontOffset,rearOffset])deck.push(...stagePoint(t,off,stageY).toArray());
   for(const y of [stageY,stageY+1.02])front.push(...stagePoint(t,frontOffset,y).toArray());
   for(const y of [stageY-.24,stageY])rear.push(...stagePoint(t,rearOffset,y).toArray());
   if(i<stageSegments){const k=i*2;di.push(k,k+1,k+2,k+1,k+3,k+2);fi.push(k,k+2,k+1,k+1,k+2,k+3);ri.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  function stageSurface(v,indices,material){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(indices);g.computeVertexNormals();return mesh(g,material,0,0,0,cheer);}
  stageSurface(deck,di,mat('#414542',{roughness:.94,side:T.DoubleSide})).castShadow=false;
  const retaining=[];for(let i=0;i<=stageSegments;i++){const t=stageStart+(stageEnd-stageStart)*i/stageSegments;for(const y of [0,stageY])retaining.push(...stagePoint(t,frontOffset,y).toArray());}stageSurface(retaining,fi,concrete).castShadow=false;
  const fascia=mat('#ad5f7e',{roughness:.9,side:T.DoubleSide});stageSurface(front,fi,fascia).castShadow=false;stageSurface(rear,ri,concrete).castShadow=false;
  for(let i=0;i<7;i++){const t=stageStart+(stageEnd-stageStart)*(i+.5)/7,at=stagePoint(t,frontOffset-.10,stageY+.53),sign=mesh(new T.PlaneGeometry(4.0,.68),mat('#ffffff',{map:labelTexture('Angels','#ad5f7e','#f2dde7',512)}),at.x,at.y,at.z,cheer);const l=stagePoint(t-.002,frontOffset-.10,stageY+.53),r=stagePoint(t+.002,frontOffset-.10,stageY+.53);sign.rotation.y=Math.atan2(-(r.z-l.z),r.x-l.x)+Math.PI;sign.castShadow=false;}
  for(let i=0;i<=stageSegments;i++){const t=stageStart+(stageEnd-stageStart)*i/stageSegments;segment(stagePoint(t,frontOffset+.08,stageY+.009),stagePoint(t,rearOffset-.04,stageY+.009),.009,mat('#282e2d'),cheer).castShadow=false;}
  for(const t of [stageStart,stageEnd]){const side=[],idx=[0,1,2,1,3,2];for(const off of [frontOffset,rearOffset])for(const y of [stageY-.24,stageY])side.push(...stagePoint(t,off,y).toArray());stageSurface(side,idx,concrete).castShadow=false;}
  for(let i=0;i<5;i++){const x=-44+i*2.2,z=cf+5;segment(new T.Vector3(x,10,z),new T.Vector3(x,17,z),.035,steel,parent);const flag=mesh(new T.PlaneGeometry(1.6,.85),mat(i%2?'#1d5291':'#d6e0db',{side:T.DoubleSide}),x+.75,16.4,z,parent);flag.rotation.y=.35;flag.castShadow=false;}
  // Background streetscape with actual facade components, rather than floating
  // striped cubes. Skyline positions and hidden elevations remain estimates.
  const buildings=[[-94,160,12,24],[-68,172,17,29],[-43,176,14,18],[18,184,18,25],[52,171,16,32],[87,151,13,23]];
  const windowMat=mat('#556f74',{roughness:.36,metalness:.22});const wm=[];
  for(const [x,z,w,h] of buildings){box(w,h,11,mat('#b1b1a3'),x,h/2,z,parent).castShadow=false;box(w+.45,.25,11.5,concrete,x,h,z,parent).castShadow=false;for(let yy=2;yy<h-1;yy+=2.8)for(let xx=-w/2+1;xx<w/2-1;xx+=2.3){pose.position.set(x+xx,yy,z-5.55);pose.rotation.set(0,0,0);pose.scale.set(1.1,1.25,.06);pose.updateMatrix();wm.push(pose.matrix.clone());}}
  instanced(new T.BoxGeometry(1,1,1),windowMat,wm);
  // Batch static railings and concrete details by shared material. Roof/deck
  // occluders retain separate bounds for efficient offline ray visibility.
  parent.updateMatrixWorld(true);const batches=new Map(),inverse=new T.Matrix4().copy(parent.matrixWorld).invert();parent.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!o.userData.staticOccluder&&!Array.isArray(o.material)){if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(o);}});
  for(const [material,objects] of batches){if(objects.length<3)continue;const attributes={position:[],normal:[],uv:[]};for(const o of objects){let g=o.geometry.clone();g.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld));if(g.index){const flat=g.toNonIndexed();g.dispose();g=flat;}for(const key of Object.keys(attributes)){const attr=g.attributes[key];if(attr)attributes[key].push(...attr.array);else if(key==='uv')for(let i=0;i<g.attributes.position.count;i++)attributes.uv.push(0,0);}g.dispose();o.parent.remove(o);}
   const g=new T.BufferGeometry();for(const [key,values] of Object.entries(attributes))if(values.length)g.setAttribute(key,new T.Float32BufferAttribute(values,key==='uv'?2:3));g.computeBoundingSphere();const merged=mesh(g,material,0,0,0,parent);merged.castShadow=false;for(const o of objects)o.geometry.dispose();
  }
  let surfaceIndex=0;const surfaceBake=root.CPBL_BAKED_SURFACES?.xinzhuang;parent.traverse(o=>{if(!o.userData.staticOccluder)return;o.userData.bakeSurface=surfaceIndex;const baked=surfaceBake?.[surfaceIndex++],count=o.geometry.attributes.position.count;if(baked?.count===count){const colors=new Float32Array(count*3);for(let i=0;i<count;i++){const shade=.48+.52*(baked.ambient[i]/255*.35+baked[night?'night':'day'][i]/255*.65);colors.fill(shade,i*3,i*3+3);}o.geometry.setAttribute('color',new T.BufferAttribute(colors,3));o.material=o.material.clone();o.material.vertexColors=true;}});
  parent.userData.reconstruction={version:'31.2',model:'xinzhuang-reference-footprint',lowerSections:26,upperSections:26,roofBays,stageSide:'right',stageReplacedRows:3,stageAngleBounds:[stageStart,stageEnd],upperDeckFrontOffset:8.2,lowerDeckRearOffset:14.6,infieldRingStage:true,seatCount:chairs.length+outChairs.length,groundHoles,estimated:true};
  return parent.userData.reconstruction;
 }};
})(window);
