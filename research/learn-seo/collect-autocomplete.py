#!/usr/bin/env python3
"""
Google autocomplete collector for the Voidcanvas Learn research.

Method (recorded so the dataset can be audited later):
  Endpoint : https://suggestqueries.google.com/complete/search?client=firefox
             This is the public suggest endpoint the Firefox search bar uses. It returns the same
             suggestions Google shows in its search box for the given locale, without personalisation
             (no cookies, no account, no history are sent).
  Locale   : hl=en, gl=gb (English, United Kingdom) for the main run. A smaller gl=us pass on the base
             seeds records how much suggestions shift by country.
  Queries  : for every seed, the bare seed, then seed + " " + each letter a-z (the A-Z matrix), then a set
             of question and comparison modifiers (how to, what is, why, can i, vs, without, for, free).
  Throttle : one request every 0.25 s with exponential backoff on 429 or network errors.
  Output   : raw/<run>.jsonl   one line per request: params, timestamp, HTTP status, full JSON response
             autocomplete.csv  flat table: seed, kind, modifier, query_sent, rank, suggestion, gl
  Limits   : autocomplete is evidence of what people type, not a volume metric. Suggestions vary a little
             by country, language, time and (when signed in) by history. This run is unpersonalised.
"""
import csv, json, os, sys, time, urllib.parse, urllib.request, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'raw')
os.makedirs(RAW, exist_ok=True)

# Seeds from the brief
BRIEF_SEEDS = [
  'graphic design', 'graphic design tools', 'design software', 'online graphic design', 'photo editing', 'image editing',
  'photoshop alternative', 'photoshop for beginners', 'graphic design workflow', 'brand design', 'brand identity',
  'social media design', 'poster design', 'print design', 'ai design', 'ai graphic design', 'ai image editing',
  'design effects', 'halftone', 'photo effects', 'design templates', 'creative workflow', 'design studio',
  'client design workflow', 'graphic design freelancing', 'design production', 'design file formats', 'psd editing',
  'browser based design', 'offline graphic design', 'design collaboration',
]
# Seeds derived from what Voidcanvas actually does (Editor, Studio, Effects, quick tools)
PRODUCT_SEEDS = [
  'halftone effect', 'dither effect', 'glitch effect', 'duotone effect', 'risograph effect', 'pixel sort',
  'remove background', 'edit psd', 'open psd', 'layer mask', 'adjustment layer', 'blend modes', 'clipping mask',
  'resize image', 'image resolution', 'dpi for print', 'bleed printing', 'cmyk', 'print ready pdf', 'export pdf',
  'flyer design', 'brand guidelines', 'brand kit', 'colour palette', 'color palette', 'typography', 'font pairing',
  'social media sizes', 'instagram post size', 'canva alternative', 'photopea alternative', 'free photo editor',
  'online photo editor', 'retouch photo', 'crop image', 'posterize', 'photo editor no upload', 'private photo editor',
  'design brief', 'mood board', 'logo design', 'artboards', 'batch resize', 'transparent png', 'vector vs raster',
  'image looks blurry', 'print looks different', 'a5 flyer', 'poster size', 'business card size', 'crop marks',
  'safe area', 'design handoff', 'design review', 'client feedback design', 'design versioning', 'brand consistency',
  'screen print effect', 'comic book effect', 'newspaper effect', 'vintage photo effect', 'photo to sketch',
]
SEEDS = BRIEF_SEEDS + PRODUCT_SEEDS
LETTERS = [chr(c) for c in range(ord('a'), ord('z') + 1)]
MODIFIERS = [
  ('prefix', 'how to'), ('prefix', 'how to make'), ('prefix', 'what is'), ('prefix', 'why is'), ('prefix', 'why does'),
  ('prefix', 'can i'), ('prefix', 'best'), ('prefix', 'free'),
  ('suffix', 'vs'), ('suffix', 'without'), ('suffix', 'for'), ('suffix', 'online'), ('suffix', 'free'), ('suffix', 'not working'),
]

def fetch(q, gl, hl='en', tries=6):
  url = 'https://suggestqueries.google.com/complete/search?' + urllib.parse.urlencode({'client': 'firefox', 'hl': hl, 'gl': gl, 'q': q})
  wait = 2.0
  for i in range(tries):
    try:
      req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0'})
      with urllib.request.urlopen(req, timeout=20) as r:
        body = r.read().decode('utf-8', 'replace')
        return r.status, json.loads(body)
    except urllib.error.HTTPError as e:
      if e.code in (429, 503):
        time.sleep(wait); wait *= 2; continue
      return e.code, None
    except Exception:
      time.sleep(wait); wait *= 2
  return 0, None

def run(gl, seeds, with_letters, with_mods, tag):
  stamp = datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
  raw_path = os.path.join(RAW, f'{tag}-{gl}-{stamp}.jsonl')
  rows = []
  jobs = []
  for s in seeds:
    jobs.append((s, 'base', '', s))
    if with_letters:
      for L in LETTERS: jobs.append((s, 'letter', L, f'{s} {L}'))
    if with_mods:
      for kind, m in MODIFIERS:
        jobs.append((s, kind, m, f'{m} {s}' if kind == 'prefix' else f'{s} {m}'))
  print(f'[{tag} gl={gl}] {len(jobs)} requests', flush=True)
  with open(raw_path, 'w') as raw:
    for n, (seed, kind, mod, q) in enumerate(jobs):
      status, data = fetch(q, gl)
      rec = {'ts': datetime.datetime.utcnow().isoformat() + 'Z', 'gl': gl, 'hl': 'en', 'seed': seed, 'kind': kind, 'modifier': mod, 'q': q, 'status': status, 'response': data}
      raw.write(json.dumps(rec, ensure_ascii=False) + '\n')
      if data and isinstance(data, list) and len(data) > 1:
        for rank, sug in enumerate(data[1], 1):
          rows.append({'seed': seed, 'kind': kind, 'modifier': mod, 'query_sent': q, 'rank': rank, 'suggestion': sug, 'gl': gl})
      if n % 100 == 0: print(f'  {n}/{len(jobs)} {q!r} -> {status} {len(data[1]) if data else 0}', flush=True)
      time.sleep(0.25)
  return rows, raw_path

if __name__ == '__main__':
  which = sys.argv[1] if len(sys.argv) > 1 else 'all'
  all_rows = []
  if which in ('all', 'gb'):
    rows, p = run('gb', SEEDS, True, True, 'main'); all_rows += rows; print('raw ->', p)
  if which in ('all', 'us'):
    rows, p = run('us', SEEDS, False, False, 'country-check'); all_rows += rows; print('raw ->', p)
  out = os.path.join(HERE, 'autocomplete.csv' if which == 'all' else f'autocomplete-{which}.csv')
  with open(out, 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=['seed', 'kind', 'modifier', 'query_sent', 'rank', 'suggestion', 'gl'])
    w.writeheader(); w.writerows(all_rows)
  print(f'wrote {len(all_rows)} suggestion rows -> {out}')
