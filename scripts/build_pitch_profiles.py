"""Extract small factual pitch fields from downloaded Taiwan Baseball Wiki pages.
No biographies or images are reproduced. Sources are linked for each profile.
"""
import html, json, re, sys
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
ALIASES = {
    '四縫線': ('四縫', '直球', '快速球', '速球'),
    '二縫線': ('二縫',), '滑球': ('滑球', '滑曲'), '曲球': ('曲球',),
    '變速球': ('變速',), '指叉球': ('指叉', '快速指叉', '叉指'),
    '卡特球': ('卡特', '切球', '切割'), '伸卡球': ('伸卡', '沉球', '下沉'),
    '橫掃球': ('橫掃', 'Sweeper'), '蝴蝶球': ('蝴蝶', '彈指'), '掌心球': ('掌心',),
}

def plain(text):
    return html.unescape(re.sub('<[^>]+>', '', text)).strip()

def field(source, key):
    match = re.search(r'<li\b[^>]*>\s*' + key + r'[：:]([\s\S]*?)</li>', source)
    return plain(match.group(1)) if match else ''

def build(directory):
    profiles = []
    roster = json.loads((ROOT / 'data/rosters.json').read_text())
    for team in roster['teams']:
        for player in team['players']:
            if not player['isPitcher']:
                continue
            path = directory / (player['id'] + '.html')
            if not path.exists():
                continue
            source = path.read_text(errors='replace')
            raw = field(source, '擅長球種') or field(source, '擅長球路') or field(source, '球種')
            if not raw or len(raw) > 180:
                continue
            pitches = []
            for token in re.split('[、，,；;]', raw):
                # Specific labels have priority over the generic "fastball" term.
                for name in ['二縫線','指叉球','卡特球','伸卡球','橫掃球','蝴蝶球','掌心球','滑球','曲球','變速球','四縫線']:
                    if any(alias in token for alias in ALIASES[name]):
                        if name not in pitches:
                            pitches.append(name)
                        break
            if not pitches:
                continue
            hand_text = field(source, '投打習慣')
            hand = 'L' if '左投' in hand_text else 'R' if '右投' in hand_text else '?'
            fast = re.search(r'\d+(?:\.\d+)?', field(source, '最快球速'))
            max_speed = float(fast.group()) if fast else None
            # Game velocity is tuning, not a claimed real average velocity.
            speed = round(min(150, max(130, max_speed * .95))) if max_speed and 100 < max_speed < 180 else 143
            profile = dict(name=player['name'], id=player['id'], hand=hand, pitches=pitches,
                           speed=speed, source='https://twbsball.dils.tku.edu.tw/wiki/index.php/' + quote(player['name']),
                           sourceLabel='台灣棒球維基館', listedPitches=raw)
            if max_speed:
                profile['listedMaxSpeed'] = max_speed
            profiles.append(profile)
    (ROOT / 'pitch-profiles.js').write_text('/* Pitch facts referenced from Taiwan Baseball Wiki; game speeds are tuning. */\nwindow.CPBL_PITCH_PROFILES=' + json.dumps(profiles, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(json.dumps({'profiles': len(profiles), 'perTeam': {t['name']: sum(p['id'] in {x['id'] for x in t['players']} for p in profiles) for t in roster['teams']}, 'examples': [p for p in profiles if p['name'] in ['李超','魏碩成','林詔恩','李東洺']]}, ensure_ascii=False))

if __name__ == '__main__':
    build(Path(sys.argv[1]))
