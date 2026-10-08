"""Official CPBL season-rate snapshot and evidenced defensive eligibility.
Read-only public endpoints observed in stats.cpbl.com.tw's own client.
No position extrapolation: current registration + recorded 2024–2026 assignments.
"""
import concurrent.futures as futures
import datetime as dt
import json
from pathlib import Path
import urllib.parse
import urllib.request
import argparse
import subprocess
import re
import tempfile
ROOT=Path(__file__).resolve().parents[1]
BASE='https://stats.cpbl.com.tw/api/proxy'
POSITIONS={'投手':'P','捕手':'C','一壘手':'1B','二壘手':'2B','三壘手':'3B','游擊手':'SS','左外野手':'LF','中外野手':'CF','右外野手':'RF','指定打擊':'DH'}
def fetch(path,params):
 url=BASE+path+'?'+urllib.parse.urlencode(params)
 result=subprocess.run(['curl','-L','-s','--fail','--retry','2','--retry-all-errors','--max-time','35',url],capture_output=True,check=True)
 obj=json.loads(result.stdout)
 return obj.get('Data',obj.get('data',{}))
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--history',action='store_true');parser.add_argument('--retry-failed',action='store_true');args=parser.parse_args()
 now=dt.datetime.now(dt.timezone(dt.timedelta(hours=8)));year=now.year
 oldpath=ROOT/'data/broadcast-data.json';old=json.loads(oldpath.read_text()) if oldpath.exists() else {}
 snapshot={'version':1,'year':year,'updatedAt':now.isoformat(),'source':'https://stats.cpbl.com.tw/rankings','batters':{},'pitchers':{},'positions':old.get('positions',{}),'historyYears':[year-2,year-1,year],'positionUpdatedAt':old.get('positionUpdatedAt')}
 for kind,key in [('batter','batters'),('pitcher','pitchers')]:
  for level,code in [(1,'A'),(2,'D')]:
   data=fetch('/v1/leaderboards/pr-table',{'searchType':kind,'gameKind':code,'year':year})
   rows=data.get('Leaderboard',data.get('leaderboard',[]))
   if not isinstance(rows,list):raise ValueError('Invalid official statistics')
   for raw in rows:
    row={k.lower():v for k,v in raw.items()};player=row.get('player') or {};pid=player.get('Acnt',player.get('acnt'))
    if not pid:continue
    record={k:row.get(k) for k in ['pa','ba','obp','slg','kp','bbp']};record.update({'name':player.get('Name',player.get('name')),'level':level})
    # Main-team season figures take precedence over farm-team figures.
    if pid not in snapshot[key]:snapshot[key][pid]=record
 roster=json.loads((ROOT/'data/rosters.json').read_text());players=[p for t in roster['teams'] for p in t['players'] if not p['isPitcher']]
 years=[(year,'A'),(year,'D')]+([(year-1,'A'),(year-2,'A')] if args.history else [])
 pending=[(p,y,c) for p in players for y,c in years]
 if args.retry_failed:
  by_id={p['id']:p for p in players};errors=json.loads((Path(tempfile.gettempdir())/'cpbl-position-fetch-errors.json').read_text());pending=[(by_id[e['id']],e['year'],e.get('kindCode') or re.search(r'kindCode=([AD])',e['error']).group(1)) for e in errors if e['id'] in by_id]
 results={p['id']:{POSITIONS[p['position']]:{'basis':'registration','source':p['source']}} for p in players if p['position'] in POSITIONS};failures=[]
 def read(job):
  p,y,code=job
  data=fetch('/v1/players/logs',{'playerType':'batter','acnt':p['id'],'year':y,'kindCode':code});logs=data.get('Logs',data.get('logs',[]));found={}
  for row in logs:
   pid=row.get('HitterAcnt',row.get('hitterAcnt'));pos=row.get('DefendStationCode',row.get('defendStationCode'))
   if pid==p['id'] and pos in POSITIONS.values() and pos not in ['P','DH']:
    found[pos]={'basis':'game-log','year':y,'kindCode':code,'gameSno':row.get('GameSno',row.get('gameSno')),'source':'https://stats.cpbl.com.tw/players/'+p['id']}
  return p['id'],found
 with futures.ThreadPoolExecutor(max_workers=4) as pool:
  jobs={pool.submit(read,j):j for j in pending}
  for n,f in enumerate(futures.as_completed(jobs),1):
   try:
    pid,found=f.result();results.setdefault(pid,{}).update(found)
   except Exception as error:failures.append({'id':jobs[f][0]['id'],'year':jobs[f][1],'kindCode':jobs[f][2],'error':str(error)})
   if n%80==0:print('Official position records',n,'/',len(pending),flush=True)
 for pid,record in results.items():snapshot['positions'].setdefault(pid,{}).update(record)
 snapshot['positionUpdatedAt']=now.isoformat();snapshot['historyFailures']=len(failures)
 (Path(tempfile.gettempdir())/'cpbl-position-fetch-errors.json').write_text(json.dumps(failures))
 if not snapshot['batters'] or not snapshot['pitchers']:raise ValueError('Empty official rates; preserving prior snapshot')
 oldpath.write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n')
 (ROOT/'broadcast-data.js').write_text('window.CPBL_BROADCAST_DATA='+json.dumps(snapshot,ensure_ascii=False,separators=(',',':'))+';\n')
 print(json.dumps({'batters':len(snapshot['batters']),'pitchers':len(snapshot['pitchers']),'positionPlayers':len(snapshot['positions']),'updatedAt':snapshot['updatedAt']},ensure_ascii=False),flush=True)
if __name__=='__main__':main()
