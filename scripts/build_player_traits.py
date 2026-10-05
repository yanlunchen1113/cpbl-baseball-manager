"""Read factual throwing/batting hands from downloaded official player pages."""
import json, re, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def decoded(source):
    chunks=[]
    for script in re.findall(r'<script[^>]*>(.*?)</script>',source,re.S):
        m=re.search(r'self\.__next_f\.push\((.*)\)\s*;?$',script,re.S)
        if m:
            p=json.loads(m[1])
            if len(p)>1 and isinstance(p[1],str): chunks.append(p[1])
    return ''.join(chunks)
def build(directory):
    roster=json.loads((ROOT/'data/rosters.json').read_text());traits=[];missing=[]
    for team in roster['teams']:
        for p in team['players']:
            path=directory/(p['id']+'.html');basic=None
            if path.exists():
                text=decoded(path.read_text(errors='replace'))
                for m in re.finditer(r'"basic":',text):
                    try:
                        candidate,_=json.JSONDecoder().raw_decode(text[m.end():])
                        if candidate.get('acnt')==p['id']: basic=candidate;break
                    except (ValueError,AttributeError): pass
            if not basic: missing.append(p['id']);continue
            speeds={}
            for m in re.finditer(r'"pitchType":',text):
                start=text.rfind('{"player":',0,m.start())
                if start<0: continue
                try:
                    row,_=json.JSONDecoder().raw_decode(text[start:])
                    if (row.get('player') or {}).get('acnt')==p['id'] and row.get('kph'):
                        speeds[row['pitchType']]=round(row['kph'],1)
                except (ValueError,AttributeError): pass
            traits.append({'id':p['id'],'name':p['name'].lstrip('*#◎ '),'hand':basic.get('pitchingHabbit') or '?',
                'batHand':basic.get('strikeHabbit') or '?','birthDate':basic.get('birthDate',''),
                'height':basic.get('height') or p['height'],'number':basic.get('uniformNo') or p['number'],'pitchSpeeds':speeds})
    (ROOT/'data/player-traits.json').write_text(json.dumps(traits,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'player-traits.js').write_text('window.CPBL_PLAYER_TRAITS='+json.dumps(traits,ensure_ascii=False,separators=(',',':'))+';\n')
    Path('/private/tmp/cpbl-missing-details.json').write_text(json.dumps(missing))
    print(json.dumps({'players':len(traits),'missing':len(missing)},ensure_ascii=False))
if __name__=='__main__': build(Path(sys.argv[1]))
