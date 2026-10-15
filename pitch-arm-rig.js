/* One bilateral pitching rig. Channel angles are authored from reference,
   not measured motion capture. Canonical release = 1100 ms; the player's
   delivery clock maps the entire rig together into real preview time. */
(function(){
 const throwingPersonal=[[560,28,12,0,24,0],[680,52,12,8,50,0],[780,70,8,0,55,0],[940,90,4,10,85,0],[980,92,4,75,90,0],[1040,95,-5,140,90,4],[1100,128,25,28,25,18],[1180,84,65,-24,30,48],[1320,48,125,-35,48,65],[1460,28,125,-12,55,38],[1680,48,30,30,82,16],[1880,82,18,70,100,0],[2100,80,22,65,90,0],[2400,24,40,28,105,0],[2800,20,45,20,110,0],[3400,20,45,20,110,0]];
 const throwingDefault=[[560,28,12,0,24,0],[660,52,16,30,65,0],[780,78,12,75,90,0],[940,90,4,95,92,0],[1040,92,-5,145,85,4],[1100,90,12,28,25,18],[1180,76,65,-24,30,48],[1320,48,125,-35,48,65],[1460,28,125,-12,55,38],[1680,38,30,30,82,16],[1880,58,18,78,100,0],[2100,48,22,65,100,0],[2400,24,40,28,105,0],[2800,20,45,20,110,0],[3400,20,45,20,110,0]];
 // ms, world upper-arm direction x/y/z, elbow flexion degrees, palm roll.
 // Fixed lateral hinge guide stays well conditioned when the arm points forward.
 const lead=[
  [500,.10,-1,-.05,8,0],[560,.10,-1,-.05,8,0],
  [620,.10,-.98,-.20,8,0],[680,.10,-.85,-.50,8,0],
  [780,.08,-.25,-1,8,0],[860,.06,0,-1,8,0],
  [940,.12,-.15,-1,28,0],[980,.18,-.65,-.60,65,0],
  [1040,.24,-.96,-.12,95,0],[1100,.35,-1,-.05,100,0],
  [1320,.40,-1,-.05,75,0],[1460,.30,-1,-.05,70,0],
  [1680,.25,-1,-.05,70,0],[2100,.22,-1,-.05,78,0],
  [2400,.18,-1,-.05,100,0],[3400,.18,-1,-.05,100,0]
 ];
 function basis(T,direction,hingeGuide){
  const hinge=hingeGuide.clone().addScaledVector(direction,-hingeGuide.dot(direction)).normalize();
  const y=direction.clone().negate(),z=hinge.clone().cross(y).normalize();
  return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(hinge,y,z));
 }
 function throwingPose(T,values,lateral){
  const [a,h,e,f]=values.map(v=>v*Math.PI/180),d=new T.Vector3(lateral*Math.sin(a)*Math.cos(h),-Math.cos(a),Math.sin(a)*Math.sin(h)).normalize(),front=new T.Vector3(0,0,1).addScaledVector(d,-d.z).normalize();
  return {shoulder:new T.Quaternion().setFromAxisAngle(d,lateral===-1?e:-e).multiply(basis(T,d,d.clone().cross(front))),elbow:new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.max(0,Math.min(135,f*180/Math.PI))*Math.PI/180)};
 }
 function leadPose(T,values,sign,bodyInverse){
  const d=new T.Vector3(sign*values[0],values[1],values[2]).normalize().applyQuaternion(bodyInverse),hinge=new T.Vector3(1,0,0).applyQuaternion(bodyInverse);
  return {shoulder:basis(T,d,hinge),elbow:new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.max(0,Math.min(135,values[3]))*Math.PI/180)};
 }
 window.CPBLPitchArmRig=Object.freeze({version:'21',throwingPersonal,throwingDefault,lead,throwingPose,leadPose});
})();
