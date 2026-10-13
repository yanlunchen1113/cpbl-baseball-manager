"""Blender 5: editable photo-reference prototypes and sampled authoring curves.
Run: Blender --background --python scripts/build_blender_characters.py
Coordinates convert runtime Y-up to Blender Z-up. Not mocap or scans.
"""
import bpy, json, struct, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
meta=json.loads((ROOT/'assets/players/human.json').read_text())
author=json.loads((ROOT/'data/character-authoring.json').read_text())
blob=(ROOT/'assets/players/human.bin').read_bytes()
def values(s,k,fmt='f'):
 a=s[k]; return struct.unpack_from('<'+fmt*a['count'],blob,a['offset'])
def remap(points,v):
 for a,b in zip(points,points[1:]):
  if v<=b[0]:return a[1]+(b[1]-a[1])*(v-a[0])/(b[0]-a[0])
 return v
def xyz(v):return (v[0],-v[2],v[1])
def smooth(a,b,v):
 t=max(0,min(1,(v-a)/(b-a)));return t*t*(3-2*t)
def delta(v,f):
 x,y,z=v; w=smooth(1.63,1.70,y)*(1-smooth(1.90,1.95,y)); front=smooth(.025,.10,z)
 cheek=math.exp(-((y-1.80)/.065)**2);jaw=math.exp(-((y-1.73)/.045)**2);nose=math.exp(-((x/.029)**2+((y-1.802)/.025)**2))*front
 dx=x*w*((f['cheek']-1)*cheek+(f['jaw']-1)*jaw)
 if abs(x)>.075:dx+=x*w*(f['ear']-1)*math.exp(-((y-1.82)/.05)**2)
 dx+=x*(f['noseWidth']-1)*nose
 dy=(y-1.86)*(f['faceLength']-1)*w*front
 dz=f['noseProjection']*nose+ .003*(f['lip']-1)*math.exp(-((y-1.76)/.018)**2)*front
 return (dx,dy,dz)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.fps=50
export={'revision':author['revision'],'method':'Blender AUTO_CLAMPED authored controls + runtime contact IK','players':{}}
for n,(name,p) in enumerate(author['players'].items()):
 coll=bpy.data.collections.new(name);scene.collection.children.link(coll)
 def move(o):
  for c in list(o.users_collection):c.objects.unlink(o)
  coll.objects.link(o);return o
 arm=bpy.data.armatures.new(p['id']+' Anatomy');rig=bpy.data.objects.new(p['id']+' Rig',arm);coll.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 definitions={'pelvis':((0,1.02,0),(0,1.18,0),None),'body':((0,1.18,0),(0,1.62,0),'pelvis'),'neck':((0,1.62,0),(0,1.70,0),'body'),'head':((0,1.70,0),(0,1.98,0),'neck')}
 for side in ['left','right']:
  a=meta['armJoints'][side];l=meta['legJoints'][side];h=meta['handFrames'][side]
  definitions.update({side+'Arm':(a['shoulder'],a['elbow'],'body'),side+'Elbow':(a['elbow'],h['wrist'],side+'Arm'),side+'Wrist':(h['wrist'],h['middle'],side+'Elbow'),side+'Leg':(l['hip'],l['knee'],'pelvis'),side+'Knee':(l['knee'],l['ankle'],side+'Leg'),side+'Foot':(l['ankle'],(l['ankle'][0],.04,.19),side+'Knee')})
 for b,(h,t,parent) in definitions.items():
  bone=arm.edit_bones.new(b);bone.head=xyz(h);bone.tail=xyz(t)
 for b,(_,_,parent) in definitions.items():
  if parent:arm.edit_bones[b].parent=arm.edit_bones[parent]
 bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True;rig.location.x=n*2.8
 headmat=bpy.data.materials.new(p['id']+' face');headmat.use_nodes=True;nodes=headmat.node_tree.nodes;tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(ROOT/('assets/players/characters/'+p['id']+'-head.webp')));headmat.node_tree.links.new(tex.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color']);nodes.get('Principled BSDF').inputs['Roughness'].default_value=.62
 # Anatomical eyeballs: source skin has no separate eye material.
 for sign in [-1,1]:
  for label,radius,offset,color,scale in [('sclera',.014,0,(.70,.65,.58,1),(1.05,.86,.65)),('iris',.006,.011,(.055,.024,.014,1),(1,.22,1)),('pupil',.0028,.0125,(.005,.004,.003,1),(1,.12,1))]:
   bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,radius=radius,location=Vector(xyz((sign*.043,1.844,.149+offset)))+rig.location);eye=move(bpy.context.object);eye.name=name+' '+label;eye.scale=scale
   em=bpy.data.materials.new(eye.name);em.diffuse_color=color;eye.data.materials.append(em)
   matrix=eye.matrix_world.copy();eye.parent=rig;eye.parent_type='BONE';eye.parent_bone='head';eye.matrix_world=matrix
 deltas=[]
 for si,s in enumerate(meta['sections']):
  pos=values(s,'position');uv=values(s,'uv');indices=values(s,'index','I');ids=values(s,'skinIndex');weights=values(s,'skinWeight');verts=[pos[i:i+3] for i in range(0,len(pos),3)]
  mesh=bpy.data.meshes.new(p['id']+[' skin',' jersey',' trousers'][si]);mesh.from_pydata([xyz(v) for v in verts],[],[indices[i:i+3] for i in range(0,len(indices),3)]);mesh.update();o=bpy.data.objects.new(mesh.name,mesh);coll.objects.link(o);o.parent=rig
  layer=mesh.uv_layers.new(name='Original UV')
  for loop in mesh.loops:
   i=loop.vertex_index;u,v=uv[i*2:i*2+2]
   if si==0 and verts[i][1]>1.63 and u>.60 and .12<v<.88:u,v=remap(p['uvMap']['u'],u),remap(p['uvMap']['v'],v)
   layer.data[loop.index].uv=(u,v)
  mat=bpy.data.materials.new(mesh.name+' material');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.9,.92,.95,1) if si else (.55,.32,.19,1);bs.inputs['Roughness'].default_value=.95 if si else .62
  if si==0:
   tx=mat.node_tree.nodes.new('ShaderNodeTexImage');tx.image=bpy.data.images.load(str(ROOT/'assets/players/skin-asian-male.png'));mat.node_tree.links.new(tx.outputs['Color'],bs.inputs['Base Color'])
  mesh.materials.append(mat)
  if si==0:
   mesh.materials.append(headmat)
   for face in mesh.polygons:
    if all(verts[i][1]>1.63 and uv[i*2]>.60 and .12<uv[i*2+1]<.88 for i in face.vertices):face.material_index=1
   o.shape_key_add(name='Basis');key=o.shape_key_add(name=name+' photo proportions');key.value=1
   for i,v in enumerate(verts):
    d=delta(v,p['face']);key.data[i].co=Vector(xyz([v[k]+d[k] for k in range(3)]))
    if max(abs(x) for x in d)>1e-6:deltas.append([i,*[round(x,7) for x in d]])
  groups={b:o.vertex_groups.new(name=b) for b in definitions}
  for i,v in enumerate(verts):
   if si==0 and v[1]>1.63 and abs(v[0])<.16:
    h=smooth(1.63,1.70,v[1]);groups['head'].add([i],h,'REPLACE');groups['neck'].add([i],1-h,'REPLACE')
   else:
    for k in range(4):
     w=weights[i*4+k]
     if w>0:groups[meta['bones'][int(ids[i*4+k])]].add([i],w,'ADD')
  mod=o.modifiers.new('Anatomical skinning','ARMATURE');mod.object=rig
  for poly in mesh.polygons:poly.use_smooth=True
 curves={}
 for control,rows in p['controls'].items():
  obj=bpy.data.objects.new(name+' / '+control,None);coll.objects.link(obj);obj.empty_display_type='PLAIN_AXES';obj['units']='milliseconds; runtime Y-up meters and radians';count=len(rows[0])-1
  for row in rows:
   for k in range(count):obj['v'+str(k)]=float(row[k+1]);obj.keyframe_insert(data_path='["v'+str(k)+'"]',frame=row[0]/20)
  action=obj.animation_data.action;action.name=name+' '+control
  # Blender 5 actions store curves in slots/channel bags.
  fcurves=[fc for layer in action.layers for strip in layer.strips for bag in strip.channelbags for fc in bag.fcurves]
  for fc in fcurves:
   for key in fc.keyframe_points:key.interpolation='BEZIER';key.handle_left_type=key.handle_right_type='AUTO_CLAMPED'
  times=list(range(0,int(rows[-1][0]),20))+[rows[-1][0]]
  curves[control]=[[t,*[round(next(fc for fc in fcurves if fc.data_path=='["v'+str(k)+'"]').evaluate(t/20),6) for k in range(count)]] for t in times]
 # Pose armature in the timeline with hand/foot IK targets. Both control actions remain editable.
 targets={}
 for side in ['left','right']:
  for part,end,chain in [('hand','Elbow',2),('foot','Knee',2)]:
   target=bpy.data.objects.new(name+' '+side+' '+part+' IK',None);coll.objects.link(target);target.empty_display_type='SPHERE';target.empty_display_size=.035;target.location=Vector(xyz(meta['armJoints'][side]['palm'] if part=='hand' else meta['legJoints'][side]['ankle']))+rig.location;targets[side+part]=target
   con=rig.pose.bones[side+end].constraints.new('IK');con.target=target;con.chain_count=chain;con.use_stretch=False
 def interp(rows,t):
  for a,b in zip(rows,rows[1:]):
   if t<=b[0]:
    u=max(0,(t-a[0])/(b[0]-a[0]));return [x+(y-x)*u for x,y in zip(a[1:],b[1:])]
  return rows[-1][1:]
 active='batting' if p['role']=='batter' else 'delivery'
 for row in curves[active]:
  t=row[0];m=row[1:];frame=t/20
  pelvis=rig.pose.bones['pelvis'];chest=rig.pose.bones['body'];pelvis.rotation_mode=chest.rotation_mode='XYZ';pelvis.rotation_euler.z=m[0];chest.rotation_euler.z=m[1];chest.rotation_euler.x=m[2];pelvis.keyframe_insert('rotation_euler',frame=frame);chest.keyframe_insert('rotation_euler',frame=frame)
  if active=='batting':
   hands=[(m[3]+.04,1.18+m[4],m[5]),(m[3]-.04,1.18+m[4],m[5])];feet=[(.30,.08,.02),(-.30,.08,-.08)]
  else:
   y=interp(curves['pitchHands'],t)[0];hands=[(.18,1.24,0),(-.30,y,.35 if t<1100 else -.3)];feet=[(.12,.08+m[5],-.32-m[4]),(-.12,.08+interp(curves['trailingFoot'],t)[0],-.1)]
  for side,h,f in zip(['left','right'],hands,feet):
   for part,v in [('hand',h),('foot',f)]:targets[side+part].location=Vector(xyz(v))+rig.location;targets[side+part].keyframe_insert('location',frame=frame)
 rig.animation_data.action.name=name+' contact IK prototype'
 export['players'][name]={**{k:v for k,v in p.items() if k!='controls'},'controls':curves,'headDeltas':deltas,'texture':'assets/players/characters/'+p['id']+'-head.webp'}
 rig.select_set(False)
scene.frame_end=170;scene.frame_set(0)
world=bpy.data.worlds.new('Neutral studio') if not scene.world else scene.world;scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.15,.2,1)
bpy.ops.object.camera_add(location=(1.4,-5.8,1.6));camera=bpy.context.object;camera.rotation_euler=(Vector((1.4,0,1.0))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=50;scene.camera=camera
bpy.ops.object.light_add(type='AREA',location=(0,-3,4));bpy.context.object.data.energy=400;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=4
for image in bpy.data.images:
 if image.source=='FILE':image.pack()
(ROOT/'assets/players/characters/manifest.json').write_text(json.dumps(export,ensure_ascii=False,separators=(',',':')))
readme=bpy.data.texts.new('READ ME — reference limits');readme.write('Photo-referenced editable prototypes, not scanned faces or captured motion. Fan two-hand finish; Tseng compact delivery. See references/blender-characters-20261013/README.md. Control actions sample back into runtime IK. Skin / clothing inherited CC0 MakeHuman mesh. Game equipment and cloth adaptations stay in runtime. IK preview is an authoring guide, not the final game pose.\n')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/players/blender/fubon-individual-prototypes.blend'))
print('Saved Blender source and runtime manifest')
