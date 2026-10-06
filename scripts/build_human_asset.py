"""Build a clothed CC0 MakeHuman mesh for the game's existing pose rig.

Usage: python3 scripts/build_human_asset.py <base.obj> <male.target> <weights.mhw> <system-assets.zip>
Only exposed skin and clothed geometry are exported; helper/nude covered faces are omitted.
"""
import json, struct, sys, zipfile
from pathlib import Path
from collections import defaultdict

def obj(text):
    vertices, uv, faces = [], [], []
    group = 'body'
    for line in text.splitlines():
        p = line.split()
        if not p: continue
        if p[0] == 'v': vertices.append(list(map(float, p[1:4])))
        elif p[0] == 'vt': uv.append(list(map(float, p[1:3])))
        elif p[0] == 'g': group = p[1]
        elif p[0] == 'f': faces.append((group, [(int(q.split('/')[0])-1, int(q.split('/')[1])-1) for q in p[1:]]))
    return vertices, uv, faces

base, target, weight_file, pack = map(Path, sys.argv[1:])
v, uv, faces = obj(base.read_text())
for line in target.read_text().splitlines():
    p = line.split()
    if p and not p[0].startswith('#'):
        i = int(p[0])
        for a in range(3): v[i][a] += float(p[a+1])
body_ids = {i for g,f in faces if g == 'body' for i,t in f}
floor = min(v[i][1] for i in body_ids)
height = max(v[i][1] for i in body_ids) - floor
scale = 1.98 / height
weights = [defaultdict(float) for _ in v]
names = ['pelvis','body','leftArm','leftElbow','rightArm','rightElbow','leftLeg','leftKnee','rightLeg','rightKnee']
for bone, entries in json.loads(weight_file.read_text())['weights'].items():
    side = 'left' if bone.endswith('.L') else 'right'
    if any(t in bone for t in ['finger','metacarpal','wrist','lowerarm']): name = side+'Elbow'
    elif 'upperarm' in bone: name = side+'Arm'
    elif any(t in bone for t in ['lowerleg','foot','toe']): name = side+'Knee'
    elif 'upperleg' in bone: name = side+'Leg'
    elif bone == 'root' or 'pelvis' in bone: name = 'pelvis'
    else: name = 'body'
    for i,w in entries: weights[i][names.index(name)] += w

z = zipfile.ZipFile(pack)
outfit = 'clothes/male_casualsuit06/male_casualsuit06'
ov, ou, of = obj(z.read(outfit+'.obj').decode())
clo = z.read(outfit+'.mhclo').decode()
mapping_text = clo.split('verts 0\n')[1].split('delete_verts')[0]
mapping = [line.split() for line in mapping_text.splitlines() if line.strip() and not line.startswith('#')]
ow = []
for i,p in enumerate(mapping[:len(ov)]):
    ids, bary, offset = list(map(int,p[:3])), list(map(float,p[3:6])), list(map(float,p[6:9]))
    ov[i] = [sum(v[j][a]*w for j,w in zip(ids,bary))+offset[a] for a in range(3)]
    w = defaultdict(float)
    for j,b in zip(ids,bary):
        for bone,value in weights[j].items(): w[bone] += value*b
    ow.append(w)
deleted = set()
p = clo.split('delete_verts')[1].split()
i = 0
while i < len(p):
    if p[i].isdigit():
        n = int(p[i])
        if i+2 < len(p) and p[i+1] == '-': deleted.update(range(n,int(p[i+2])+1)); i += 3
        else: deleted.add(n); i += 1
    else: i += 1

sections = [[],[],[]]
for g,f in faces:
    if g != 'body' or any(i in deleted for i,t in f): continue
    if sum(v[i][1] for i,t in f)/len(f) < floor+.12/scale: continue
    sections[0].append((v,uv,weights,f))
for g,f in of:
    y = sum(ov[i][1] for i,t in f)/len(f)
    sections[1 if (y-floor)*scale>1.03 else 2].append((ov,ou,ow,f))
buffers = bytearray(); manifest = {'license':'CC0','heightMetres':1.98,'bones':names,'sections':[]}
for material, polygons in enumerate(sections):
    lookup, positions, texcoords, ids, ws, indices = {}, [], [], [], [], []
    for vv, uu, ww, face in polygons:
        face_indices=[]
        for i,t in face:
            key=(i,t)
            if key not in lookup:
                lookup[key]=len(positions)//3
                positions.extend([vv[i][0]*scale,(vv[i][1]-floor)*scale,vv[i][2]*scale])
                texcoords.extend(uu[t])
                blend=sorted(ww[i].items(),key=lambda x:x[1],reverse=True)[:4]
                total=sum(max(0,w) for b,w in blend) or 1
                blend=[(b,max(0,w)/total) for b,w in blend]
                blend += [(0,0)]*(4-len(blend))
                ids.extend(b for b,w in blend);ws.extend(w for b,w in blend)
            face_indices.append(lookup[key])
        for j in range(1,len(face_indices)-1): indices.extend([face_indices[0],face_indices[j],face_indices[j+1]])
    item={'material':material,'vertices':len(positions)//3,'triangles':len(indices)//3}
    for key,arr,fmt in [('position',positions,'f'),('uv',texcoords,'f'),('skinIndex',ids,'f'),('skinWeight',ws,'f'),('index',indices,'I')]:
        item[key]={'offset':len(buffers),'count':len(arr)}
        buffers.extend(struct.pack('<'+fmt*len(arr),*arr))
    manifest['sections'].append(item)
out=Path('assets/players');out.mkdir(parents=True,exist_ok=True)
(out/'human.bin').write_bytes(buffers)
(out/'human.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'bytes':len(buffers),'vertices':sum(s['vertices'] for s in manifest['sections']),'triangles':sum(s['triangles'] for s in manifest['sections'])}))
