"""Synchronize all six teams from CPBL's official player directory.

No API keys or third-party proxy. Keep the last good snapshot on any source error.
The directory's current team assignment is authoritative; this is not a game-day
lineup, and it deliberately includes the second-team development roster.
"""
import argparse
import datetime as dt
import json
from pathlib import Path
import re
import urllib.request

SOURCE = 'https://stats.cpbl.com.tw/players'
TEAMS = ['中信兄弟', '統一7-ELEVEn獅', '樂天桃猿', '富邦悍將', '味全龍', '台鋼雄鷹']
POSITIONS = {'1': '投手', '2': '捕手', '3': '一壘手', '4': '二壘手', '5': '三壘手', '6': '游擊手', '7': '左外野手', '8': '中外野手', '9': '右外野手', '10': '指定打擊'}

def parse_directory(html):
    # Next.js embeds the complete directory (not just the visible paginated eight).
    # Decode its JSON string once, then parse the players array as JSON, not regex.
    parts = []
    for script in re.findall(r'<script[^>]*>(.*?)</script>', html, re.S):
        match = re.search(r'self\.__next_f\.push\((.*)\)\s*;?$', script, re.S)
        if match:
            payload = json.loads(match.group(1))
            if len(payload) > 1 and isinstance(payload[1], str):
                parts.append(payload[1])
    text = ''.join(parts)
    marker = '"players":'
    start = text.index(marker) + len(marker)
    players, _ = json.JSONDecoder().raw_decode(text[start:])
    if not isinstance(players, list) or len(players) < 150:
        raise ValueError('CPBL player directory incomplete; preserving snapshot')
    return players

def make_snapshot(players):
    teams = [{'index': i, 'name': name, 'players': []} for i, name in enumerate(TEAMS)]
    seen = set()
    for raw in players:
        team_name = raw.get('team', {}).get('name', '')
        base_name = team_name.removesuffix('二軍')
        if base_name not in TEAMS or raw.get('retiredDate') is not None:
            continue
        pid = raw['acnt']
        if pid in seen:
            raise ValueError('Duplicate CPBL player id')
        seen.add(pid)
        name = raw['chName'].lstrip('*# ').strip()
        position = str(raw.get('defendStation', ''))
        teams[TEAMS.index(base_name)]['players'].append({
            'id': pid, 'name': name, 'officialName': raw['chName'],
            'number': str(raw.get('uniformNo', '')), 'height': raw.get('height'), 'position': POSITIONS.get(position, position),
            'isPitcher': position == '1', 'level': 2 if team_name.endswith('二軍') else 1,
            'source': 'https://stats.cpbl.com.tw/players/' + pid,
        })
    for team in teams:
        if len(team['players']) < 25 or sum(p['isPitcher'] for p in team['players']) < 8:
            raise ValueError('Incomplete team roster: ' + team['name'])
        team['players'].sort(key=lambda p: (p['level'], not p['isPitcher'], int(p['number']) if p['number'].isdigit() else 999, p['name']))
    return {'schemaVersion': 1, 'updatedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
            'source': SOURCE, 'scope': '官網現有一、二軍名單；非單場登錄打線', 'teams': teams}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--html', help='Read an already downloaded official page')
    args = parser.parse_args()
    if args.html:
        html = Path(args.html).read_text(encoding='utf-8')
    else:
        request = urllib.request.Request(SOURCE, headers={'User-Agent': 'CPBL-Baseball-Manager-RosterSync/1.0'})
        with urllib.request.urlopen(request, timeout=45) as response:
            html = response.read().decode('utf-8')
    snapshot = make_snapshot(parse_directory(html))
    root = Path(__file__).resolve().parents[1]
    (root / 'data').mkdir(exist_ok=True)
    old_path = root / 'data' / 'rosters.json'
    if old_path.exists():
        old = json.loads(old_path.read_text(encoding='utf-8'))
        # Do not churn the repository when CPBL hasn't changed its directory.
        if old.get('teams') == snapshot['teams']:
            print('Official rosters unchanged; ' + str(len([p for t in snapshot['teams'] for p in t['players']])) + ' players')
            return
    serialized = json.dumps(snapshot, ensure_ascii=False, indent=2)
    old_path.write_text(serialized + '\n', encoding='utf-8')
    (root / 'rosters-data.js').write_text('window.CPBL_ROSTER = ' + json.dumps(snapshot, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    print(json.dumps({t['name']: {'players': len(t['players']), 'pitchers': sum(p['isPitcher'] for p in t['players'])} for t in snapshot['teams']}, ensure_ascii=False))

if __name__ == '__main__':
    main()
