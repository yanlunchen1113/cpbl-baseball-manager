"""Map existing MakeHuman UV vertices to original CC0 finger joints/weights.
Usage: python3 scripts/build_hand_rig.py /path/base.obj /path/default_weights.mhw
"""
import json,sys,struct,math
from collections import defaultdict
from pathlib import Path
v=[];uv=[];faces=[];groups=defaultdict(set);group=''
for line in Path(sys.argv[1]).read_text().splitlines():
 p=line.split()
 if not p:continue
 if p[0]=='v':v.append(list(map(float,p[1:4])))
 elif p[0]=='vt':uv.append(list(map(float,p[1:3])))
 elif p[0]=='g':group=p[1]
 elif p[0]=='f':
  face=[tuple(int(x)-1 for x in q.split('/')[:2]) for q in p[1:]]
  for i,t in face:groups[group].add(i)
  faces.extend(face)
def joint(g):
 ids=groups[g];return [sum(v[i][a] for i in ids)/len(ids) for a in range(3)]
def sub(a,b):return [x-y for x,y in zip(a,b)]
def length(a):return math.sqrt(sum(x*x for x in a))
d=json.loads(Path('assets/players/human.json').read_text());blob=Path('assets/players/human.bin').read_bytes();sec=d['sections'][0]
def data(key):
 a=sec[key];return struct.unpack_from('<'+'f'*a['count'],blob,a['offset'])
ps=data('position');us=data('uv');lookup=defaultdict(set)
for i,t in faces:lookup[tuple(round(x,6) for x in uv[t])].add(i)
weights=json.loads(Path(sys.argv[2]).read_text())['weights'];fingerweights=defaultdict(list)
for name,rows in weights.items():
 if name.startswith('finger'):
  finger,segment=map(int,name.split('.')[0][6:].split('-'));side='left' if name.endswith('.L') else 'right'
  for i,w in rows:fingerweights[i].append([side,finger,segment,w])
result={'source':'MakeHuman CC0 base.obj/default_weights.mhw','hands':{},'vertices':[]}
scales={};offsets={};transforms={};mappers={}
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def cross(a,b):return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
for side,short in [('left','l'),('right','r')]:
 srcw=joint('joint-'+short+'-hand');srcm=joint('joint-'+short+'-finger-3-1');dstw=d['handFrames'][side]['wrist'];dstm=d['handFrames'][side]['middle'];scale=length(sub(dstm,dstw))/length(sub(srcm,srcw));offset=sub(dstw,[x*scale for x in srcw]);scales[side]=scale;offsets[side]=offset
 srca=sub(joint(f'joint-{short}-finger-2-1'),srcw);srcb=sub(joint(f'joint-{short}-finger-5-1'),srcw);srcn=cross(srca,srcb);srcn=[x/length(srcn) for x in srcn]
 dsta=sub(d['handFrames'][side]['index'],dstw);dstb=sub(d['handFrames'][side]['pinky'],dstw);dstn=cross(dsta,dstb);dstn=[x/length(dstn)*scale for x in dstn];det=dot(srca,cross(srcb,srcn));transforms[side]=(srcw,dstw,srca,srcb,srcn,dsta,dstb,dstn,det)
 def mapped(p):
  delta=sub(p,srcw);q=[dot(delta,cross(srcb,srcn))/det,dot(srca,cross(delta,srcn))/det,dot(srca,cross(srcb,delta))/det]
  return [dstw[a]+dsta[a]*q[0]+dstb[a]*q[1]+dstn[a]*q[2] for a in range(3)]
 mappers[side]=mapped
 result['hands'][side]={str(f):[mapped(joint(f'joint-{short}-finger-{f}-{j}')) for j in range(1,5)] for f in range(1,6)}
correspondence={'left':{},'right':{}}
for k in range(len(ps)//3):
 candidates=lookup.get(tuple(round(x,6) for x in us[k*2:k*2+2]),[]);side='left' if ps[k*3]>0 else 'right'
 if not candidates:continue
 source=min(candidates,key=lambda i:sum((v[i][a]*scales[side]+offsets[side][a]-ps[k*3+a])**2 for a in range(3)))
 correspondence[side][source]=list(ps[k*3:k*3+3])
 rows=[r[1:] for r in fingerweights[source] if r[0]==side]
 if rows:result['vertices'].append([k,side,rows])
# Fit each helper joint against the actual mesh surface around it, rather than
# extending a single wrist/index/pinky transform over all distal fingers.
def solve(a,b):
 a=[r[:]+[y] for r,y in zip(a,b)]
 for i in range(4):
  pivot=max(range(i,4),key=lambda j:abs(a[j][i]));a[i],a[pivot]=a[pivot],a[i]
  if abs(a[i][i])<1e-16:return None
  f=a[i][i];a[i]=[x/f for x in a[i]]
  for j in range(4):
   if j!=i:
    f=a[j][i];a[j]=[x-f*y for x,y in zip(a[j],a[i])]
 return [r[4] for r in a]
for side,short in [('left','l'),('right','r')]:
 pairs=correspondence[side]
 for finger in range(1,6):
  for j in range(1,5):
   source=joint(f'joint-{short}-finger-{finger}-{j}')
   nearby=sorted(pairs,key=lambda i:sum(x*x for x in sub(v[i],source)))[:48]
   matrix=[[0.0]*4 for _ in range(4)];rhs=[[0.0]*4 for _ in range(3)]
   for i in nearby:
    delta=sub(v[i],source);weight=1/(sum(x*x for x in delta)+.0001);row=delta+[1]
    for a in range(4):
     for b in range(4):matrix[a][b]+=weight*row[a]*row[b]
     for axis in range(3):rhs[axis][a]+=weight*row[a]*pairs[i][axis]
   fitted=[solve(matrix,r) for r in rhs]
   if all(r is not None for r in fitted):result['hands'][side][str(finger)][j-1]=[r[3] for r in fitted]
Path('assets/players/hand-rig.json').write_text(json.dumps(result,separators=(',',':'))+'\n');print({'fingerVertices':len(result['vertices'])})
