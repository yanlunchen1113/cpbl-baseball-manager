"""Extract public 2026 exit-velocity rows from a saved CPBL player page.
Usage: python3 scripts/build_motion_calibration.py /path/to/official-player.html
The page embeds the league benchmark and player PR table as Next.js data.
"""
import datetime as dt
import json
import re
import sys
from pathlib import Path
from build_player_traits import decoded

root = Path(__file__).resolve().parents[1]
text = decoded(Path(sys.argv[1]).read_text())
decoder = json.JSONDecoder()
league = None
players = {}
for match in re.finditer(r'\{"player":', text):
    try:
        row, _ = decoder.raw_decode(text[match.start():])
    except ValueError:
        continue
    if not row.get('ev'):
        continue
    if row.get('player'):
        players[row['player']['acnt']] = {
            'name': row['player']['name'], 'exitAvg': round(row['ev'], 2),
            'exitMax': round(row.get('maxEv') or row['ev'], 2), 'pa': row.get('pa', 0),
        }
    elif league is None:
        league = {'exitAvg': round(row['ev'], 2), 'exitMax': round(row['maxEv'], 2)}
if league is None or len(players) < 50:
    raise ValueError('Incomplete official data; preserving the current calibration')
data = {'source': 'https://stats.cpbl.com.tw/players/0000007239', 'season': 2026,
        'retrievedAt': dt.date.today().isoformat(), 'league': league, 'players': players}
(root/'data/motion-calibration.json').write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')
(root/'motion-calibration.js').write_text('window.CPBL_MOTION_DATA='+json.dumps(data, ensure_ascii=False, separators=(',', ':'))+';\n')
print(json.dumps({'players': len(players), 'league': league}, ensure_ascii=False))
