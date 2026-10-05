"""Turn publicly shared fan MIDI arrangements into compact note data.
No YouTube audio is extracted. Archive source and arranger are retained here.
"""
import base64,gzip,json,struct,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
TEAMS={'brothers':0,'lions':1,'monkeys':2,'fubon':3,'dragons':4}
SOURCE='https://drive.google.com/drive/folders/1joT1RlpZJ3fUD3UbN-nUP7FCi2BK51oE'
def read_midi(path):
    data=path.read_bytes()
    if data[:4]!=b'MThd': raise ValueError('Not MIDI')
    header_size=int.from_bytes(data[4:8],'big');fmt,tracks,division=struct.unpack('>HHH',data[8:14])
    if division&32768:raise ValueError('SMPTE unsupported')
    pos=8+header_size;tempo=[(0,500000)];events=[]
    for track in range(tracks):
        if data[pos:pos+4]!=b'MTrk':raise ValueError('Track missing')
        end=pos+8+int.from_bytes(data[pos+4:pos+8],'big');pos+=8;tick=0;running=0
        def vlq():
            nonlocal pos
            value=0
            while True:
                b=data[pos];pos+=1;value=(value<<7)|(b&127)
                if b<128:return value
        while pos<end:
            tick+=vlq();status=data[pos]
            if status>=128:pos+=1;running=status if status<240 else running
            else:status=running
            if status==255:
                kind=data[pos];pos+=1;n=vlq();payload=data[pos:pos+n];pos+=n
                if kind==81:tempo.append((tick,int.from_bytes(payload,'big')))
            elif status in [240,247]:pos+=vlq()
            else:
                kind=status&240;channel=status&15;n=1 if kind in [192,208] else 2;args=data[pos:pos+n];pos+=n
                if kind in [128,144] and channel!=9:events.append((tick,track,channel,kind,args[0],args[1]))
        pos=end
    tempos=sorted(dict(tempo).items())
    def seconds(tick):
        last=0;us=500000;result=0
        for change,value in tempos:
            if change>tick:break
            result+=(change-last)*us/1000000/division;last=change;us=value
        return result+(tick-last)*us/1000000/division
    active={};notes=[]
    for tick,track,channel,kind,pitch,velocity in sorted(events):
        key=(track,channel,pitch)
        if kind==144 and velocity:active[key]=(tick,velocity)
        elif key in active:
            start,volume=active.pop(key);duration=seconds(tick)-seconds(start)
            if duration>.02:notes.append([round(seconds(start),3),round(duration,3),pitch,volume])
    if not notes:return None
    start=min(n[0] for n in notes)
    for n in notes:n[0]=round(n[0]-start,3)
    duration=max(n[0]+n[1] for n in notes)+.4
    if duration>180:return None
    return {'notes':notes,'duration':round(duration,3)}
def build(directory):
    songs=[]
    for folder,team in TEAMS.items():
        for path in sorted((directory/folder).rglob('*.mid')):
            content=read_midi(path)
            if not content:continue
            name=path.stem
            chance=any(x in name.lower() for x in ['chance','嗆司','得分','突破','衝鋒'])
            songs.append({'team':team,'title':name,'batter':None if chance else name.removeprefix('UL').rstrip('0123456789'),
                'kind':'chance' if chance else 'normal','midi':content})
    payload=base64.b64encode(gzip.compress(json.dumps(songs,ensure_ascii=False,separators=(',',':')).encode())).decode()
    script="""/* Fan arrangements by Toshihiko Hayashi, public CPBL MIDI pack (2019/2020). */
window.CPBL_CHEER_MIDI=[];
(async()=>{const bytes=Uint8Array.from(atob('%s'),c=>c.charCodeAt(0));const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));window.CPBL_CHEER_MIDI=JSON.parse(await new Response(stream).text());window.dispatchEvent(new Event('cheerready'));})().catch(error=>console.warn('Cheer pack unavailable',error));
"""%payload
    (ROOT/'cheer-midi.js').write_text(script)
    (ROOT/'data/cheer-sources.json').write_text(json.dumps({'arranger':'Toshihiko Hayashi','source':SOURCE,'format':'MIDI','year':2020,'songs':len(songs)},ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'songs':len(songs),'perTeam':{k:sum(s['team']==v for s in songs) for k,v in TEAMS.items()}},ensure_ascii=False))
if __name__=='__main__':build(Path(sys.argv[1]))
