#!/usr/bin/env python3
"""
Annotates every unique autocomplete suggestion with a cluster, an intent, a likely audience, a relevance rating for
Voidcanvas and the existing guide that answers it (if any). Rules based and transparent: every rule is in this file,
so the labels can be audited and re-run. Output:
  autocomplete-annotated.csv   one row per unique suggestion
  clusters.md                  cluster sizes with example queries, generated from the same rules
Nothing here is a volume or difficulty metric.
"""
import csv, json, re, collections, os

HERE = os.path.dirname(os.path.abspath(__file__))
rows = list(csv.DictReader(open(os.path.join(HERE, 'autocomplete.csv'))))

# ── existing guides: slug -> phrases (answers + title + keywords) pulled from the audit data and signposts
audit = json.load(open(os.path.join(HERE, 'audit-data.json')))
guides = {}
for a in audit['articles']:
    guides[a['slug']] = (a['title'] + ' ' + a['keywords'] + ' ' + a['summary']).lower()
# new cornerstones and their answer phrases
guides.update({
  'prepare-a-poster-for-print': 'how to prepare a poster for print poster print ready size dpi bleed pdf a3 a2 18x24',
  'make-a-halftone-portrait': 'how to make a halftone portrait halftone effect halftone image generator halftone settings screen printing comic dots pop art',
  'edit-a-psd-without-photoshop': 'how to edit a psd without photoshop open psd file online free is psd editable psd editor psd to png psd viewer',
  'make-your-design-look-less-generic': 'design look less generic amateur professional template look poster flyer look better',
})

# ── clusters: (id, human name, regex). First match wins, so specific rules come before broad ones.
CLUSTERS = [
  ('out-of-scope', 'Out of scope (careers, education paths, hardware, other industries, non-English)',
   r'\b(salary|salaries|jobs?|career|careers|hiring|internship|apprenticeship|degree|university|universit|college|school|after (10th|12th)|nift|syllabus|exam|quiz|questions? paper|fees?|certificate|bootcamp|masters?|bachelor|phd|laptop|monitor|tablet for|ipad for|pc build|gpu|cpu|hadoop|hive|sap|power bi|excel|autocad|altium|alteryx|cad|dwg|cricut|avery|epson|hp |canon|printer not|printer printing|kerberos|gis|mt4|mt5|hplc|kyocera|arch linux|ubuntu|adalah|zu |kostenlos|gratis|freeware|en linea|gratuito|desain|yang menarik|qurban|kemerdekaan|bao gồm|hindi|meaning in|llc|ltd|inc\b|near me|waterford|arlington|victoria|quadra|design x|goodreads|reddit|youtube channel|tiktok trend|movie|film review|architects?|agency|agencies|studio near|company|companies)\b'),
  ('print-prep', 'Preparing artwork for print (bleed, dpi, CMYK, print-ready, sizes)',
   r'\b(bleed|crop marks?|safe area|print ready|print-ready|press ready|prepress|cmyk|300 ?dpi|dpi for print|resolution for print|print resolution|paper size|a5 flyer|a4 flyer|a3 poster|a2 poster|poster size|flyer size|business card size|print pdf|pdf for print|print looks? different|print(ed|s)? (come|came|look|looks|is|are) (out )?(blurry|dark|wrong|dull|different)|for printing|to print|print design|print shop|printer needs?|printer wants?|trim size|gsm)\b'),
  ('blurry-resolution', 'Blurry, pixelated or low-resolution images',
   r'\b(blurry|blurred|pixelated|pixelat|low resolution|low res|resolution|upscale|upscaling|sharpen|dpi|ppi|image quality|lose quality|without losing quality|enlarge)\b'),
  ('psd', 'PSD files without Photoshop',
   r'\b(psd|photoshop file|photoshop document|\.psb|smart object)\b'),
  ('photoshop-alternative', 'Photoshop alternatives and switching',
   r'\b(photoshop alternative|alternative(s)? (to|of|for) (adobe )?photoshop|photoshop (free|online|without|no subscription|alternative|vs|replacement)|instead of photoshop|like photoshop|photopea|gimp|affinity|photoshop for beginners|photoshop basics|learn photoshop|photoshop tutorial)\b'),
  ('canva-alternative', 'Canva alternatives and limits',
   r'\b(canva)\b'),
  ('halftone', 'Halftone',
   r'\b(halftone|half tone|ben ?day)\b'),
  ('dither', 'Dither and pixel looks',
   r'\b(dither|dithering|pixel art|8[- ]?bit|1[- ]?bit|pixelate|pixel sort)\b'),
  ('glitch', 'Glitch and distortion effects',
   r'\b(glitch|datamosh|rgb shift|rgb split|vhs|crt|scanline)\b'),
  ('duotone-colour-effects', 'Duotone, gradient map, posterize and colour looks',
   r'\b(duotone|gradient map|posteri[sz]e|two tone|two colou?r|monochrome|sepia|colou?r grade|colou?r grading|vintage (photo|effect|filter|look)|retro (photo|effect|filter|look)|cyberpunk)\b'),
  ('print-look-effects', 'Risograph, screen-print, comic and texture looks',
   r'\b(risograph|riso|screen ?print|silkscreen|comic|newspaper|photo to sketch|sketch effect|pencil|watercolou?r|oil paint|stipple|woodcut|linocut|grain|texture)\b'),
  ('photo-effects', 'Photo effects in general',
   r'\b(photo effects?|image effects?|design effects?|picture effects?|filters? (for|on) (photos?|images?)|photo filter|effect (online|generator|app|free)|effects? (online|generator|app|free))\b'),
  ('remove-background', 'Remove a background, cut out, transparent PNG',
   r'\b(remove (the )?background|background remov|background eraser|cut ?out|transparent (png|background)|isolate|erase background|bg remov)\b'),
  ('retouch-adjust', 'Retouching, colour and tone adjustment',
   r'\b(retouch|blemish|skin|heal|clone|curves|levels|exposure|white balance|colou?r correct|brightness|contrast|hue|saturation|adjustment layer)\b'),
  ('layers-masks', 'Layers, masks, selections and blend modes',
   r'\b(layer mask|clipping mask|masks?|masking|layers?|blend(ing)? modes?|opacity|selection|select subject|magic wand|lasso|feather)\b'),
  ('photo-editing', 'Photo and image editing tools and how-to',
   r'\b(photo edit|image edit|picture edit|edit (a |my |your )?(photo|image|picture)s?|photo editor|image editor|editing (app|software|website|online|tool))\b'),
  ('brand', 'Brand identity, guidelines, kits and consistency',
   r'\b(brand|branding|logo|style guide|visual identity)\b'),
  ('social', 'Social media design and sizes',
   r'\b(social media|instagram|insta|facebook|tiktok|linkedin|youtube|thumbnail|story|stories|reel|carousel|banner|header|pinterest|twitter|x header)\b'),
  ('poster-flyer', 'Poster, flyer and print piece design',
   r'\b(poster|flyer|leaflet|brochure|business card|invitation|menu design|signage|billboard)\b'),
  ('resize-formats', 'Resizing and producing many formats',
   r'\b(resize|resizing|batch|multiple (sizes|formats)|every (size|format)|all sizes|aspect ratio|crop)\b'),
  ('typography-colour', 'Typography and colour craft',
   r'\b(typography|font|fonts|typeface|kerning|tracking|leading|line height|colou?r palette|colou?r scheme|colou?r theory|palette|hex|contrast ratio|wcag|accessible colou?r)\b'),
  ('client-workflow', 'Client work: briefs, review, handoff, versions, freelancing',
   r'\b(client|clients|brief|briefs|freelanc|handoff|hand-off|handover|review process|design review|feedback|approval|deliverables?|versioning|version control|invoice|contract|pricing|rates?|proposal|revision)\b'),
  ('collaboration', 'Design collaboration and teams',
   r'\b(collaborat|team|teams|share|sharing|together|real[- ]?time)\b'),
  ('private-offline', 'Private, offline and browser-based tools',
   r'\b(offline|no internet|without internet|private|privacy|no upload|without upload|no sign ?up|no account|browser[- ]based|in (the |your )?browser|web[- ]based|online (free )?(tool|editor|software)|pwa|install)\b'),
  ('ai', 'AI in design and image editing',
   r'\b(ai|artificial intelligence|generative|generator|chatgpt|gemini|midjourney|grok|prompt)\b'),
  ('templates', 'Templates',
   r'\b(templates?)\b'),
  ('file-formats', 'File formats',
   r'\b(file format|file type|png|jpe?g|webp|svg|pdf|vector|raster|eps|tiff|gif|avif|heic|extension)\b'),
  ('workflow-process', 'Design workflow and process',
   r'\b(workflow|process|steps|checklist|pipeline|production|how designers|organi[sz]e|file naming|folder structure)\b'),
  ('learn-design', 'Learning graphic design',
   r'\b(learn|learning|beginner|beginners|basics|fundamentals|principles|tutorial|course|courses|self[- ]taught|how to (do|start|get into|become))\b'),
  ('tools-comparison', 'Design software and app comparisons',
   r'\b(software|app|apps|tool|tools|program|programs|website|websites|best|free|vs|alternative|online)\b'),
]
CL = [(i, n, re.compile(rx)) for i, n, rx in CLUSTERS]

def cluster(q):
    for i, n, rx in CL:
        if rx.search(q): return i
    return 'other'

def intent(q):
    if re.search(r'\b(how (to|do|can)|what (is|are|does|size|resolution)|why|can (i|you)|should|which|when|explained|meaning|definition|vs\b|difference)', q): return 'informational'
    if re.search(r'\b(best|free|cheap|price|pricing|alternative|download|app|software|tool|online|generator|editor|template|website|buy|subscription)\b', q): return 'commercial'
    if re.search(r'\b(canva|photoshop|photopea|figma|illustrator|indesign|procreate|affinity|gimp|pixlr|capcut|instagram|tiktok|adobe|google|microsoft|word|powerpoint)\b', q): return 'navigational'
    if re.search(r'\b(workflow|process|checklist|steps|guide|setup|settings)\b', q): return 'workflow'
    return 'informational'

def audience(q):
    if re.search(r'\b(beginner|beginners|basics|learn|for dummies|easy|simple|start)\b', q): return 'beginner'
    if re.search(r'\b(client|freelanc|agency|deliver|handoff|brief|invoice|proposal)\b', q): return 'freelancer'
    if re.search(r'\b(small business|business|brand for|company|shop|store|restaurant|salon)\b', q): return 'brand owner'
    if re.search(r'\b(marketing|marketer|campaign|ads?|social media manager|content)\b', q): return 'marketing person'
    if re.search(r'\b(student|school|class|assignment|project)\b', q): return 'student'
    if re.search(r'\b(print|printer|prepress|bleed|cmyk|lpi|screen print|dtf)\b', q): return 'print designer'
    if re.search(r'\b(settings|advanced|pro|professional|workflow|shortcut|batch)\b', q): return 'professional'
    return 'designer'

# Relevance: does Voidcanvas have a real answer? high = a feature does exactly this; medium = a craft topic Voidcanvas can teach and demonstrate; low = adjacent; none = not for us.
HIGH = re.compile(r'\b(halftone|dither|glitch|duotone|psd|remove background|background remov|cut ?out|transparent png|bleed|dpi|print ready|resize|layer mask|masks?|adjustment layer|blend mode|brand kit|brand guidelines?|style guide|no upload|offline|private|browser|photoshop alternative|photopea|canva alternative|poster|flyer|social media (post|size|graphics?)|instagram (post|story) size|export|pdf|png|retouch|effects?)\b')
MED = re.compile(r'\b(brand|logo|typography|font|colou?r|palette|layout|composition|hierarchy|client|brief|feedback|review|workflow|process|templates?|photo edit|image edit|poster design|social media design|print design|learn|beginner|basics)\b')

def relevance(q, cl):
    if cl == 'out-of-scope': return 'none'
    if HIGH.search(q): return 'high'
    if MED.search(q): return 'medium'
    return 'low'

def existing(q):
    words = [w for w in re.findall(r'[a-z0-9]+', q) if len(w) > 2 and w not in ('how', 'the', 'and', 'for', 'with', 'you', 'can', 'free', 'online', 'best', 'app', 'design', 'graphic', 'make', 'what', 'why', 'does')]
    if not words: return ''
    best, score = '', 0
    for slug, hay in guides.items():
        s = sum(1 for w in words if re.search(r'\b' + re.escape(w), hay))
        if s > score: best, score = slug, s
    return best if score >= max(2, len(words) // 2) else ''

# ── aggregate per unique suggestion
agg = {}
for r in rows:
    q = r['suggestion'].strip().lower()
    a = agg.setdefault(q, {'suggestion': q, 'seeds': set(), 'modifiers': set(), 'letters': set(), 'hits': 0, 'best_rank': 99, 'gl': set()})
    a['seeds'].add(r['seed']); a['hits'] += 1; a['gl'].add(r['gl'])
    if r['kind'] == 'letter': a['letters'].add(r['modifier'])
    elif r['modifier']: a['modifiers'].add(f"{r['kind']}:{r['modifier']}")
    a['best_rank'] = min(a['best_rank'], int(r['rank']))

out = []
for q, a in agg.items():
    cl = cluster(q)
    out.append({
        'suggestion': q, 'cluster': cl, 'intent': intent(q), 'audience': audience(q), 'relevance': relevance(q, cl),
        'existing_guide': existing(q) if cl != 'out-of-scope' else '',
        'seeds': ' | '.join(sorted(a['seeds'])), 'letters': ''.join(sorted(a['letters'])), 'modifiers': ' | '.join(sorted(a['modifiers'])),
        'times_seen': a['hits'], 'best_rank': a['best_rank'], 'countries': ''.join(sorted(a['gl'])),
    })
out.sort(key=lambda x: (x['cluster'], -x['times_seen'], x['suggestion']))
with open(os.path.join(HERE, 'autocomplete-annotated.csv'), 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(out[0].keys())); w.writeheader(); w.writerows(out)

# ── cluster summary
by = collections.defaultdict(list)
for o in out: by[o['cluster']].append(o)
names = {i: n for i, n, _ in CLUSTERS}; names['other'] = 'Unclustered'
lines = ['# Search-intent clusters', '', f'{len(rows)} suggestion rows, {len(out)} unique suggestions, from {len(set(r["seed"] for r in rows))} seeds (A to Z plus question and comparison modifiers), Google Suggest, hl=en, gl=gb, 27 September 2026. A smaller gl=us pass on the bare seeds is included for comparison. Rules in `annotate.py`. Counts are numbers of distinct suggestions, which measures breadth of query behaviour, not volume.', '']
lines += ['| Cluster | Unique suggestions | High relevance | Medium | Informational | Commercial | Has a guide already |', '|---|---|---|---|---|---|---|']
for cl, items in sorted(by.items(), key=lambda kv: -len(kv[1])):
    hi = sum(1 for i in items if i['relevance'] == 'high'); me = sum(1 for i in items if i['relevance'] == 'medium')
    inf = sum(1 for i in items if i['intent'] == 'informational'); com = sum(1 for i in items if i['intent'] == 'commercial')
    has = sum(1 for i in items if i['existing_guide'])
    lines.append(f'| {names[cl]} | {len(items)} | {hi} | {me} | {inf} | {com} | {has} |')
lines += ['', '## Examples by cluster', '', 'The most repeated suggestions per cluster (seen across several seeds or letters), with the intent and the guide that currently answers them, if any.', '']
for cl, items in sorted(by.items(), key=lambda kv: -len(kv[1])):
    if cl == 'out-of-scope': continue
    lines.append(f'### {names[cl]} ({len(items)})'); lines.append('')
    lines.append('| Suggestion | Intent | Audience | Relevance | Existing guide |'); lines.append('|---|---|---|---|---|')
    for i in sorted(items, key=lambda x: (-x['times_seen'], x['best_rank']))[:30]:
        lines.append(f"| {i['suggestion']} | {i['intent']} | {i['audience']} | {i['relevance']} | {i['existing_guide']} |")
    lines.append('')
# question / problem / desire / comparison / workflow shapes across the whole set
shapes = {
  'Questions': r'^(how|what|why|can|which|should|when|is|are|does|do) ',
  'Problems': r'\b(not working|blurry|pixelated|wrong|different|too (big|small|dark|light)|missing|lost|slow|crash|error|won\'?t|cannot|can\'?t|problem|issue|fix)\b',
  'Desires': r'\b(make|create|build|design|turn|convert|professional|better|faster|easy|quick|without|free)\b',
  'Comparisons': r'\b(vs|versus|alternative|better than|instead of|or|difference|compare|best)\b',
  'Workflow': r'\b(workflow|process|steps|checklist|organi[sz]e|manage|pipeline|handoff|deliver|brief|review)\b',
}
lines += ['## Query shapes across the dataset', '', '| Shape | Unique suggestions (in scope) | Examples |', '|---|---|---|']
inscope = [o for o in out if o['cluster'] != 'out-of-scope']
for name, rx in shapes.items():
    m = [o for o in inscope if re.search(rx, o['suggestion'])]
    ex = '; '.join(x['suggestion'] for x in sorted(m, key=lambda x: -x['times_seen'])[:6])
    lines.append(f'| {name} | {len(m)} | {ex} |')
open(os.path.join(HERE, 'clusters.md'), 'w').write('\n'.join(lines) + '\n')
print(f'{len(out)} unique suggestions annotated')
for cl, items in sorted(by.items(), key=lambda kv: -len(kv[1])): print(f'{len(items):6d}  {cl}')
