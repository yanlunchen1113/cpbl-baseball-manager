"""Photo-referenced editable glove models. Blender -> GLB, dimensions in metres.
References and observed/inferred details: references/blender-gloves/README.md
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];OUT=R/'assets/equipment';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def xyz(p):return (p[0],-p[2],p[1])
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def material(name,color,rough=.72):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Roughness'].default_value=rough
 # Fine leather grain is retained in the editable source; runtime supplies its existing leather bump map.
 noise=m.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=650;noise.inputs['Roughness'].default_value=.75;bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.10;bump.inputs['Distance'].default_value=.00025;m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],n.inputs['Normal']);return m
palmMat=material('Warm tan palm leather',(.48,.255,.105));backMat=material('Chestnut outer leather',(.20,.085,.035));bindingMat=material('Rolled leather binding',(.36,.18,.075));laceMat=material('Dark leather laces',(.065,.038,.021));linerMat=material('Suede wrist lining',(.12,.065,.035),.95)
field=[(-.070,-.108),(-.105,-.082),(-.124,-.005),(-.123,.095),(-.117,.150),(-.100,.173),(-.084,.172),(-.078,.158),(-.075,.184),(-.062,.198),(-.049,.197),(-.044,.181),(-.043,.202),(-.029,.215),(-.015,.212),(-.012,.191),(-.009,.200),(.006,.207),(.020,.200),(.025,.179),(.028,.100),(.052,.088),(.096,.157),(.122,.150),(.137,.104),(.132,.040),(.109,-.042),(.058,-.102),(0,-.115)]
mitt=[(-.055,-.128),(-.118,-.102),(-.151,-.045),(-.157,.025),(-.145,.094),(-.110,.151),(-.055,.174),(.002,.165),(.042,.122),(.056,.082),(.080,.112),(.122,.115),(.151,.073),(.158,.009),(.134,-.063),(.079,-.115),(.015,-.135)]
def catmull(points,steps=5):
 out=[]
 for i in range(len(points)):
  a,b,c,d=[Vector(points[j%len(points)]) for j in [i-1,i,i+1,i+2]]
  for k in range(steps):
   t=k/steps;v=.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);out.append(tuple(v))
 return out
all_objects=[]
for kind in ['field','pitch','catch']:
 coll=bpy.data.collections.new(kind+' glove');bpy.context.scene.collection.children.link(coll);objects=[];outline=catmull(mitt if kind=='catch' else field)
 def link(o):
  for c in list(o.users_collection):c.objects.unlink(o)
  coll.objects.link(o);objects.append(o);return o
 def surface(x,y,back=False):
  if kind=='catch':z=.022+.073*(x/.16)**2+.037*((y-.005)/.18)**2
  else:z=.009+.070*(x/.135)**2+.032*((y-.02)/.205)**2+.012*math.exp(-((x-.11)/.033)**2-((y-.07)/.08)**2)
  if back:
   edge=min((Vector((x,y))-Vector(a)).length if Vector(b).to_2d()==Vector(a).to_2d() else (Vector((x,y))- (Vector(a)+(Vector(b)-Vector(a))*max(0,min(1,(Vector((x,y))-Vector(a)).dot(Vector(b)-Vector(a))/(Vector(b)-Vector(a)).length_squared)))).length for a,b in zip(outline,outline[1:]+outline[:1]))
   cap=smooth(edge/.025) if not(y<-.070 and abs(x)<.065) else 1
   z-=.006+.046*cap+.012*cap*math.exp(-(x/.07)**2-((y+.015)/.1)**2)
   if kind!='catch':z-=.012*cap*sum(math.exp(-((x-c)/.014)**2)*smooth((y-.005)/.07)*(1-smooth((y-tip+.015)/.025)) for c,tip in [(-.10,.173),(-.064,.198),(-.027,.215),(.007,.207)])
   if kind!='catch':z-=.011*cap*math.exp(-((x-.112)/.027)**2-((y-.055)/.095)**2)
  return z
 def boundary(cx,cy,a):
  dx,dy=math.cos(a),math.sin(a);best=1
  for i,p in enumerate(outline):
   q=outline[(i+1)%len(outline)];ex,ey=q[0]-p[0],q[1]-p[1];den=dx*ey-dy*ex
   if abs(den)<1e-9:continue
   t=((p[0]-cx)*ey-(p[1]-cy)*ex)/den;u=((p[0]-cx)*dy-(p[1]-cy)*dx)/den
   if t>0 and 0<=u<=1:best=min(best,t)
  return best
 def mesh(name,verts,faces,mat):
  data=bpy.data.meshes.new(name);data.from_pydata([xyz(v) for v in verts],[],faces);data.update();o=bpy.data.objects.new(name,data);coll.objects.link(o);objects.append(o);data.materials.append(mat)
  for poly in data.polygons:poly.use_smooth=True
  return o
 def tube(name,pts,r,mat,cyclic=False):
  data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=2;data.bevel_depth=r;data.bevel_resolution=2;data.resolution_u=3;spl=data.splines.new('POLY');spl.points.add(len(pts)-1)
  for p,v in zip(spl.points,pts):p.co=(*xyz(v),1)
  spl.use_cyclic_u=cyclic;o=bpy.data.objects.new(name,data);coll.objects.link(o);objects.append(o);o.data.materials.append(mat);return o
 def strip(name,points,width):
  verts=[];faces=[]
  for i,p in enumerate(points):
   a=Vector(points[max(0,i-1)]);b=Vector(points[min(len(points)-1,i+1)]);d=(b-a).normalized();n=Vector((-d.y,d.x,0)).normalized()*width/2
   for side,z in [(-1,-.002),(1,-.002),(1,.002),(-1,.002)]:verts.append(tuple(Vector(p)+n*side+Vector((0,0,z))))
   if i:
    k=i*4
    for j in range(4):faces.append([k-4+j,k-4+(j+1)%4,k+(j+1)%4,k+j])
  faces.extend([[3,2,1,0],list(range(len(verts)-4,len(verts)))]);o=mesh(name,verts,faces,backMat);bevel=o.modifiers.new('Soft leather edges','BEVEL');bevel.width=.001;bevel.segments=2
 N=112;M=16
 # Front leather pocket: shallow for fielders, deeper rounded pad for catchers.
 for back in [False,True]:
  cx,cy=(0,-.060) if back else (-.012,.018);verts=[];faces=[]
  for j in range(M+1):
   t=j/M
   for i in range(N):
    a=2*math.pi*i/N;r=boundary(cx,cy,a);inner=1/math.sqrt((math.cos(a)/.050)**2+(math.sin(a)/.032)**2) if back else 0
    rho=inner+(r-inner)*t;x=cx+rho*math.cos(a);y=cy+rho*math.sin(a);verts.append((x,y,surface(x,y,back)))
  for j in range(M):
   for i in range(N):
    ids=[j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i];x=sum(verts[k][0] for k in ids)/4;y=sum(verts[k][1] for k in ids)/4
    web=kind!='catch' and ((x-.057)/.031)**2+((y-.106)/.029)**2<1
    if web:continue
    faces.append(ids if back else ids[::-1])
  mesh(('Dorsal wrist aperture' if back else 'Continuous concave palm'),verts,faces,backMat if back else palmMat)
 # Connect front/back perimeter, giving leather panels actual thickness.
 verts=[];faces=[]
 for x,y in outline:verts.extend([(x,y,surface(x,y)),(x,y,surface(x,y,True))])
 for i in range(len(outline)):
  k=2*i;n=2*((i+1)%len(outline));x,y=outline[i];xx,yy=outline[(i+1)%len(outline)]
  if not(abs((x+xx)/2)<.056 and (y+yy)/2<-.09):faces.append([k,n,n+1,k+1])
 mesh('Leather perimeter thickness',verts,faces,backMat)
 tube('Soft rear edge',[(x,y,surface(x,y,True)-.001) for x,y in outline],.004,bindingMat,True)
 tube('Continuous rolled edge',[(x,y,surface(x,y)+.001) for x,y in outline],.008 if kind=='catch' else .0035,bindingMat,True)
 # Rear wrist opening: leather aperture through the back panel, not a handle in front of the hand.
 hole=[(.050*math.cos(a),-.060+.032*math.sin(a)) for a in [2*math.pi*i/64 for i in range(64)]]
 tube('Wrist aperture binding',[(x,y,surface(x,y,True)-.001) for x,y in hole],.0038,bindingMat,True)
 tube('Soft inner wrist lining',[(x*.97,-.06+(y+.06)*.97,surface(x,y,True)+.005) for x,y in hole],.003,linerMat,True)
 if kind!='catch':
  # Four connected finger channels with paired narrow welting, matching dorsal reference photo.
  for n,(x,tip) in enumerate([(-.104,.163),(-.066,.190),(-.030,.195),(.006,.182)]):
   for side in [-1,1]:
    pts=[]
    for i in range(25):
     t=i/24;y=-.013+(tip+.013)*t;xx=x+side*.012*(.8+.2*math.sin(math.pi*t));pts.append((xx,y,surface(xx,y,True)-.002))
    tube('Finger %d welting %d'%(n+1,side),pts,.0018,bindingMat)
  for x,tip in [(-.102,.158),(-.065,.183),(-.027,.198),(.008,.183)]:
   tube('Palm finger seam',[(x,.07+t*(tip-.07),surface(x,.07+t*(tip-.07))+.0008) for t in [i/20 for i in range(21)]],.00085,backMat)
  tube('Thumb inner bolster',[(.087+.025*math.sin(t*math.pi),-.055+t*.197,surface(.087+.025*math.sin(t*math.pi),-.055+t*.197)+.002) for t in [i/28 for i in range(29)]],.010,palmMat)
  tube('Pinky heel bolster',[(x*.93,y*.94,surface(x,y)-.002) for x,y in outline[:32]],.0065,palmMat)
  # Web spans the thumb-index cleft; field glove is H-web, pitcher has a closed leather panel.
  if kind=='pitch':
   verts=[];faces=[];res=16
   for row in range(res+1):
    v=row/res
    for col in range(res+1):
     u=col/res;x=(.025+.002*v)*(1-u)+(.110-.015*v)*u
     y=(.078+.065*v)*(1-u)+(.073+.060*v)*u
     verts.append((x,y,surface(x,y)+.006+.009*math.sin(math.pi*u)))
   for row in range(res):
    for col in range(res):
     a=row*(res+1)+col;faces.append((a,a+1,a+res+2,a+res+1))
   o=mesh('Closed pitcher web',verts,faces,backMat);solid=o.modifiers.new('Web leather thickness','SOLIDIFY');solid.thickness=.006
  else:
   strip('Index-side web anchor',[(.027,y,surface(.027,y)+.003) for y in [.080,.095,.112,.130,.143]],.013)
   strip('Thumb-side web anchor',[(.096,y,surface(.096,y)+.003) for y in [.073,.087,.102,.118,.133]],.013)
   strip('Recessed H web crosspiece',[(x,y,surface(x,y)+rise) for x,y,rise in [(.028,.112,.003),(.048,.108,.012),(.072,.102,.012),(.096,.097,.003)]],.016)
  tube('Thumb padded seam',[(.092+.021*math.sin(i/24*math.pi),-.041+i/24*.181,surface(.092+.021*math.sin(i/24*math.pi),-.041+i/24*.181,True)-.002) for i in range(25)],.0022,bindingMat)
 else:
  # Catcher's mitt: broad crescent cushions, closed fingers and a separate thumb pad.
  finger=outline[:int(len(outline)*.55)];thumb=outline[int(len(outline)*.57):]
  tube('Finger crescent padding',[(x*.92,y*.92,surface(x,y)-.005) for x,y in finger],.0135,palmMat)
  tube('Thumb crescent padding',[(x*.91,y*.92,surface(x,y)-.004) for x,y in thumb],.0145,palmMat)
  strip('Catcher web bridge',[(.026,.122,.065),(.05,.129,.075),(.075,.12,.085),(.092,.108,.09)],.022)
  strip('Catcher web lower',[(.035,.102,.055),(.055,.11,.065),(.078,.098,.08)],.012)
 # Short laces sit against the leather, with small knots rather than long spaghetti.
 for i in range(0,len(outline),3 if kind=='catch' else 5):
  x,y=outline[i];xx,yy=outline[(i+2)%len(outline)];inset=.94
  rise=.017 if kind=='catch' else .005
  tube('Perimeter stitch',[(x*inset,y*inset,surface(x,y)+rise),(x,y,surface(x,y)+rise),(xx,yy,surface(xx,yy)+rise),(xx*inset,yy*inset,surface(xx,yy)+rise)],.0027 if kind=='catch' else .0019,laceMat)
 if kind!='catch':
  for y in [.083,.101,.119,.135]:
   tube('Web cross lace',[(.028,y,surface(.028,y)+.008),(.046,y+.009,surface(.046,y)+.008),(.07,y,surface(.07,y)+.008),(.092,y+.007,surface(.092,y)+.008)],.0018,laceMat)
 # Bake editable curves/modifiers into a single GLB mesh with material groups and two closure shapes.
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();o=bpy.context.object;o.name=kind+' glove';bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.remove_doubles(threshold=.000002);bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
 for poly in o.data.polygons:poly.use_smooth=True
 # Planar leather coordinates for runtime grain.
 uv=o.data.uv_layers.new(name='LeatherUV')
 for loop in o.data.loops:
  v=o.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(v.x*3+.5,v.z*3+.5)
 o.shape_key_add(name='Basis')
 def fold(v,amount):
  x,y,z=v;heel=smooth((y+.080)/.115);side=-1 if x<.025 else 1;wing=smooth(abs(x-.018)/.11)*heel;a=-side*(1.05 if side<0 else 1.10)*amount*wing
  dx=x-.018;dz=z-.005;x=.018+dx*math.cos(a)+dz*math.sin(a);z=.005-dx*math.sin(a)+dz*math.cos(a)
  curl=.28*amount*smooth((y-.045)/.15);dy=y-.045;dz=z-.025;y=.045+dy*math.cos(curl)-dz*math.sin(curl);z=.025+dy*math.sin(curl)+dz*math.cos(curl);return (x,y,z)
 # Bake the natural cupped rest pose into Basis. 'Open' is not an unfolded flat pattern.
 def proportions(v):
  x,y,z=v
  if kind!='catch':x=x*1.10+(.015*smooth((y+.01)/.14) if x>.07 else 0);y=y if y<.03 else .03+(y-.03)*.78
  else:x*=1.08;y*=.94
  return (x,y,z)
 rest=[proportions((v.co.x,v.co.z,-v.co.y)) for v in o.data.vertices]
 neutral=.38 if kind!='catch' else .28
 for v,base in zip(o.data.vertices,rest):v.co=xyz(fold(base,neutral))
 for k,base in zip(o.data.shape_keys.key_blocks['Basis'].data,rest):k.co=xyz(fold(base,neutral))
 for name,amount in [('HalfClose',.5),('Close',1)]:
  key=o.shape_key_add(name=name)
  for base,k in zip(rest,key.data):k.co=xyz(fold(base,neutral+(1-neutral)*amount))
 o.active_shape_key_index=0;o.show_only_shape_key=False
 for key in o.data.shape_keys.key_blocks:key.value=0
 o['reference']='User images-18/19 for field glove, images-10 for pitcher, images-17/12 for catcher';o['units']='metres; authored approximation, not scan';o['pocket']=json.dumps([.018,.025,.065]);o.location.x={'field':-.40,'pitch':0,'catch':.40}[kind]
 all_objects.append(o)
 # Save selected object with its local model at origin, export native GLB morphs.
 x=o.location.x;o.location.x=0;bpy.ops.export_scene.gltf(filepath=str(OUT/(kind+'-glove.glb')),export_format='GLB',use_selection=True,export_yup=True,export_morph=True,export_normals=True,export_materials='EXPORT',export_animations=False,export_cameras=False,export_lights=False);o.location.x=x;o.active_shape_key_index=0;o.show_only_shape_key=False
 for key in o.data.shape_keys.key_blocks:key.value=0
# Studio scene for editable source and photographic comparison renders.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.render.resolution_x=1100;scene.render.resolution_y=650;scene.render.resolution_percentage=100
scene.world.color=(.25,.25,.25)
bpy.ops.object.camera_add(location=(0,-1.50,.30));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.04))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=1.16;scene.camera=cam
for loc,energy,size in [((0,-1,1.4),130,1.4),((-.8,.6,1),90,1.1)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=energy;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
text=bpy.data.texts.new('REFERENCE AND ANATOMY');text.write('Compare supplied images-18 (front/back channels), images-19 (wrist insertion), images-10 (closed pitcher web), images-17/12 (catcher mitt). Geometry and closure are hand-authored, not scans. Source curves are baked in meshes; generator retained in repository. GLB contains HalfClose / Close morph targets.\n')
bpy.ops.wm.save_as_mainfile(filepath=str(R/'assets/players/blender/baseball-gloves.blend'))
scene.render.filepath=str(R/'references/blender-gloves/studio-front.png');bpy.ops.render.render(write_still=True)
cam.location=(0,1.5,.30);cam.rotation_euler=(Vector((0,0,.04))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(R/'references/blender-gloves/studio-back.png');bpy.ops.render.render(write_still=True)
print('Saved editable Blender gloves, three GLBs, and front/back renders')
