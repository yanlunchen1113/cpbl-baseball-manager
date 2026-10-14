/* Representative pitch families, not measured CPBL player spin/grips.
   Sources and observed/estimated distinctions: references/character-contact-20261014/README.md */
(function(root){
 const profiles={
  '四縫線':{rpm:2300,axis:[1,0,.04],seam:[0,0,0],spread:.28,offset:0,depth:0,contact:[0,1,2],label:'食、中指跨縫；拇指支撐；後旋'},
  '二縫線':{rpm:2150,axis:[.80,-.55,.16],seam:[0,Math.PI/2,0],spread:.32,offset:0,depth:0,contact:[0,1,2],label:'食、中指沿窄縫；傾斜後旋'},
  '伸卡球':{rpm:2050,axis:[.60,-.76,.25],seam:[0,Math.PI/2,.12],spread:.26,offset:.12,depth:.002,contact:[0,1,2],label:'二縫握法家族；增加側旋分量'},
  '卡特球':{rpm:2400,axis:[.92,.25,.30],seam:[0,0,.25],spread:.20,offset:-.25,depth:0,contact:[0,1,2],label:'兩指併攏偏球側；後旋混合側旋、陀螺旋'},
  '滑球':{rpm:2500,axis:[.25,.40,.88],seam:[.15,Math.PI/2,.45],spread:.18,offset:-.42,depth:.003,contact:[0,1,2],label:'中指沿縫、食指相鄰；側旋混合陀螺旋'},
  '橫掃球':{rpm:2550,axis:[-.12,.96,.24],seam:[.10,Math.PI/2,.65],spread:.24,offset:-.35,depth:.003,contact:[0,1,2],label:'採二縫滑球代表握法；較多側旋'},
  '曲球':{rpm:2650,axis:[-.94,.30,.12],seam:[0,Math.PI/2,.65],spread:.18,offset:-.40,depth:.008,contact:[0,1,2],label:'中指勾縫、球較深；前旋混合側旋'},
  '變速球':{rpm:1700,axis:[.60,-.76,.24],seam:[0,Math.PI/2,.10],spread:.28,offset:.10,depth:.007,contact:[0,2,3],label:'採中、無名指主控的代表握法；側向後旋'},
  '指叉球':{rpm:1000,axis:[.95,-.15,.25],seam:[0,Math.PI/2,0],spread:.92,offset:0,depth:.006,contact:[0,1,2],label:'食、中指分開夾球；低轉速（splitter 代表）'},
  '掌心球':{rpm:1250,axis:[.86,-.48,.12],seam:[0,.25,.15],spread:.50,offset:0,depth:.016,contact:[0,1,2,3,4],label:'球收進掌心、多指包覆；減速後旋'},
  '蝴蝶球':{rpm:45,axis:[.2,.7,.4],seam:[.4,.2,.1],spread:.35,offset:0,depth:.003,contact:[0,1,2],knuckle:true,label:'食、中指屈指、指尖抵球；極低轉速'}
 };
 profiles['快速球']=profiles['四縫線'];
 const rolls={'四縫線':0,'二縫線':-.12,'伸卡球':-.22,'卡特球':.12,'滑球':.45,'橫掃球':.60,'曲球':.72,'變速球':-.30,'指叉球':0,'掌心球':-.10,'蝴蝶球':0};for(const [type,p] of Object.entries(profiles)){p.releaseRoll=rolls[type]||0;p.seamAxis=['二縫線','伸卡球','滑球','橫掃球','變速球','指叉球'].includes(type)?[1,0,0]:[0,1,0];}
 function get(type){return profiles[type]||profiles['四縫線'];}
 function spinAxis(T,type,hand,style){const p=get(type),axis=new T.Vector3(...p.axis);if(hand==='L'){axis.y=-axis.y;axis.z=-axis.z;}if(style==='side')axis.applyAxisAngle(new T.Vector3(0,0,1),(hand==='L'?-1:1)*.45);return axis.normalize();}
 function seamQuaternion(T,type){return new T.Quaternion().setFromEuler(new T.Euler(...get(type).seam));}
 function createBall(T){
  const group=new T.Group(),radius=.037;
  const leather=new T.Mesh(new T.SphereGeometry(radius,48,32),new T.MeshStandardMaterial({color:'#fffdf4',roughness:.76}));group.add(leather);leather.castShadow=true;leather.receiveShadow=true;
  // One closed boundary divides the two figure-eight leather panels. Sample by arc length.
  const points=[];for(let i=0;i<512;i++){const t=i/512*Math.PI*2,lat=.70*Math.cos(2*t);points.push(new T.Vector3(Math.cos(t)*Math.cos(lat),Math.sin(lat),Math.sin(t)*Math.cos(lat)).multiplyScalar(radius+.00004));}
  const curve=new T.CatmullRomCurve3(points,true,'centripetal');
  const groove=new T.Mesh(new T.TubeGeometry(curve,432,.00023,5,true),new T.MeshStandardMaterial({color:'#9b7766',roughness:1}));group.add(groove);
  const positions=[],normals=[],indices=[];
  function thread(path){const start=positions.length/3,sides=5,steps=6;for(let i=0;i<=steps;i++){const u=i/steps,p=path(u),tangent=path(Math.min(1,u+.01)).sub(path(Math.max(0,u-.01))).normalize(),radial=p.clone().normalize(),cross=tangent.clone().cross(radial).normalize(),up=cross.clone().cross(tangent).normalize();for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2,n=up.clone().multiplyScalar(Math.cos(a)).addScaledVector(cross,Math.sin(a));positions.push(...p.clone().addScaledVector(n,.00022).toArray());normals.push(...n.toArray());}if(i)for(let j=0;j<sides;j++){const a=start+(i-1)*sides+j,b=start+(i-1)*sides+(j+1)%sides,c=start+i*sides+j,d=start+i*sides+(j+1)%sides;indices.push(a,b,c,b,d,c);}}}
  for(let i=0;i<108;i++){const u=(i+.5)/108,p=curve.getPointAt(u),t=curve.getTangentAt(u).normalize(),n=p.clone().normalize(),across=t.clone().cross(n).normalize();for(const sign of [-1,1])thread(v=>p.clone().addScaledVector(across,sign*(.00010+.00185*v)).addScaledVector(t,sign*.00040*v*v).normalize().multiplyScalar(radius+.00008+Math.sin(v*Math.PI)*.000035));}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setIndex(indices);
  const stitches=new T.Mesh(geometry,new T.MeshStandardMaterial({color:'#a92c2c',roughness:.83}));group.add(stitches);group.userData.radius=radius;group.userData.stitchPairs=108;return group;
 }
 root.CPBLPitchMechanics={profiles,get,spinAxis,seamQuaternion,createBall};
})(typeof window==='undefined'?globalThis:window);
