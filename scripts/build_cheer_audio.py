"""Pre-render a generic/chance arrangement for reliable native mobile playback."""
import array,base64,gzip,json,math,re,subprocess,wave
from pathlib import Path
root=Path(__file__).resolve().parents[1]
data=json.loads(gzip.decompress(base64.b64decode(re.search(r"atob\('([^']+)'",(root/'cheer-midi.js').read_text())[1])))
catalog=[]
for team in range(5):
 songs=[s for s in data if s['team']==team]
 song=next((s for s in songs if s.get('kind')=='chance'),songs[0]);notes=song['midi']['notes'];duration=min(24,song['midi']['duration']);rate=8000;count=int(duration*rate);step=.02;melody=[None]*int(duration/step+1)
 for at,length,pitch,velocity in notes:
  if pitch<48:continue
  for i in range(max(0,int(at/step)),min(len(melody),int((at+length)/step))):
   if melody[i] is None or pitch>melody[i][0]:melody[i]=(pitch,velocity)
 values=array.array('B');phase=0
 for n in range(count):
  note=melody[min(len(melody)-1,int(n/rate/step))]
  if note:
   pitch,velocity=note;phase=(phase+440*2**((pitch-69)/12)/rate)%1;v=(math.sin(phase*2*math.pi)+.18*math.sin(phase*6*math.pi))*.24*velocity/127
  else:v=0
  values.append(int(128+max(-1,min(1,v))*120))
 wav=Path('/private/tmp')/('cpbl-cheer-'+str(team)+'.wav')
 with wave.open(str(wav),'wb') as f:f.setnchannels(1);f.setsampwidth(1);f.setframerate(rate);f.writeframes(values.tobytes())
 target=root/'audio'/('cheer-'+str(team)+'.wav')
 target.write_bytes(wav.read_bytes())
 catalog.append({'team':team,'kind':'chance','url':'audio/'+target.name,'title':song['title']+'（器樂應援）','source':'data/cheer-sources.json','fallback':True})
catalog.append({**catalog[0],'team':5,'title':'通用器樂應援'})
(root/'cheer-files.js').write_text('window.CPBL_CHEER_FILES='+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+';\n')
print([(p.name,p.stat().st_size) for p in (root/'audio').glob('*.wav')])
