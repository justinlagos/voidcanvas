# Builds the Working Designer Study emails as table-based HTML with inline styles, for MailerLite.
# Merge tags are MailerLite's: {$name} first name, {$study_ref}, {$study_token}, {$invite_deadline}, payment fields.
# Run: python3 build.py  -> writes email-N.html next to this file. These files are the source of truth for the copy.
import html, pathlib

SITE = 'https://voidcanvas.app'
LOGO = f'{SITE}/icon-192.png'
FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif"
INK, TEXT, MUTED, LINE, PANEL, ACCENT, ACCENT_DARK = '#0d0d10', '#2a2a33', '#6b6b78', '#ebeaf0', '#f6f5f9', '#8b7cff', '#5f4fe0'
FOOT = (
  'Voidcanvas is a product of MotionPlay Labs Ltd, registered in England and Wales (no. 17304660) and in Nigeria (RC 9621200). '
  'Registered office: 66 Paul Street, London, EC2A 4NA, United Kingdom.'
)
HI = 'Hi {$name|default(\'there\')},'

def p(t, size=16): return f'<p style="margin:0 0 16px;font-size:{size}px;line-height:1.65;color:{TEXT};">{t}</p>'
def h(t): return f'<p style="margin:28px 0 10px;font-size:13px;line-height:1.4;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:{INK};">{t}</p>'
def link(label, url): return f'<a href="{url}" style="color:{ACCENT_DARK};text-decoration:underline;text-underline-offset:2px;">{label}</a>'

def btn(label, url):
    return (f'<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 26px;"><tr>'
            f'<td bgcolor="{INK}" style="border-radius:10px;background:{INK};">'
            f'<a href="{url}" style="display:inline-block;padding:15px 28px;font-family:{FONT};font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:10px;">{label}&nbsp;&nbsp;&rarr;</a>'
            f'</td></tr></table>')

def bullets(items):
    r = ''.join(f'<tr><td valign="top" style="width:22px;padding:0 0 10px;"><div style="width:6px;height:6px;margin-top:10px;border-radius:3px;background:{ACCENT};font-size:0;line-height:0;">&nbsp;</div></td>'
                f'<td style="padding:0 0 10px;font-size:16px;line-height:1.65;color:{TEXT};">{i}</td></tr>' for i in items)
    return f'<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 10px;">{r}</table>'

def steps(items):
    # items: (title, body)
    r = ''.join(f'<tr><td valign="top" style="width:40px;padding:0 0 18px;"><div style="width:28px;height:28px;border-radius:14px;background:{PANEL};border:1px solid {LINE};text-align:center;font-size:13px;font-weight:700;line-height:28px;color:{ACCENT_DARK};">{n}</div></td>'
                f'<td style="padding:3px 0 18px;"><div style="font-size:16px;font-weight:600;line-height:1.4;color:{INK};">{t}</div>'
                f'<div style="margin-top:4px;font-size:15px;line-height:1.6;color:{TEXT};">{b}</div></td></tr>' for n, (t, b) in enumerate(items, 1))
    return f'<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:4px 0 12px;">{r}</table>'

def facts(pairs, note=''):
    r = ''.join(f'<tr><td style="padding:12px 0;{"border-top:1px solid " + LINE + ";" if i else ""}font-size:14px;line-height:1.4;color:{MUTED};">{k}</td>'
                f'<td align="right" style="padding:12px 0;{"border-top:1px solid " + LINE + ";" if i else ""}font-size:15px;line-height:1.4;font-weight:600;color:{INK};">{v}</td></tr>' for i, (k, v) in enumerate(pairs))
    n = f'<tr><td colspan="2" style="padding:4px 0 2px;font-size:13px;line-height:1.5;color:{MUTED};">{note}</td></tr>' if note else ''
    return (f'<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:6px 0 24px;background:{PANEL};border:1px solid {LINE};border-radius:12px;">'
            f'<tr><td style="padding:6px 20px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">{r}{n}</table></td></tr></table>')

def note(t):
    return (f'<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:4px 0 22px;"><tr>'
            f'<td style="width:3px;background:{ACCENT};border-radius:2px;font-size:0;">&nbsp;</td>'
            f'<td style="padding:4px 0 4px 16px;font-size:14.5px;line-height:1.6;color:{TEXT};">{t}</td></tr></table>')

STAGES = ['Applied', 'Selected', 'Joined', 'Complete', 'Paid']
def tracker(at):
    cells = ''
    for i, s in enumerate(STAGES, 1):
        done, now = i < at, i == at
        bar = ACCENT if i <= at else LINE
        col = INK if now else (MUTED if done else '#a4a4b0')
        cells += (f'<td width="20%" valign="top" style="padding:0 3px;">'
                  f'<div style="height:4px;border-radius:2px;background:{bar};font-size:0;line-height:0;">&nbsp;</div>'
                  f'<div style="padding-top:8px;font-size:11px;line-height:1.3;font-weight:{700 if now else 500};color:{col};">{s}</div></td>')
    return f'<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 28px;table-layout:fixed;"><tr>{cells}</tr></table>'

SIG = (f'<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:30px 0 0;border-top:1px solid {LINE};"><tr><td style="padding-top:22px;">'
       f'<div style="font-size:16px;line-height:1.5;color:{TEXT};">Thank you,</div>'
       f'<div style="font-size:16px;line-height:1.5;font-weight:600;color:{INK};">The Voidcanvas team</div>'
       f'<div style="padding-top:2px;font-size:14px;line-height:1.5;color:{MUTED};">Reply to this email or write to {link("research@voidcanvas.app", "mailto:research@voidcanvas.app")}</div>'
       f'</td></tr></table>')

def page(preview, eyebrow, title, body, stage=None):
    links = ' &nbsp;&middot;&nbsp; '.join(f'<a href="{u}" style="color:{MUTED};text-decoration:underline;">{l}</a>' for l, u in [
        ('Participant information', f'{SITE}/research/information'), ('Incentive terms', f'{SITE}/research/terms'),
        ('Privacy notice', f'{SITE}/research/privacy'), ('Unsubscribe', '{$unsubscribe}')])
    track = tracker(stage) if stage else ''
    return f'''<!doctype html><html lang="en" xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>{html.escape(title)}</title>
<style>@media (max-width:620px){{.vc-pad{{padding-left:24px!important;padding-right:24px!important}}.vc-title{{font-size:25px!important}}}}</style></head>
<body style="margin:0;padding:0;background:#efeef3;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">{html.escape(preview)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#efeef3" style="background:#efeef3;"><tr><td align="center" style="padding:32px 12px 24px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;font-family:{FONT};">
<tr><td bgcolor="{INK}" class="vc-pad" style="background:{INK};border-radius:16px 16px 0 0;padding:22px 40px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
<td valign="middle"><img src="{LOGO}" width="30" height="30" alt="" style="display:inline-block;vertical-align:middle;border:0;border-radius:7px;"><span style="display:inline-block;vertical-align:middle;padding-left:10px;font-size:17px;font-weight:700;letter-spacing:-0.01em;color:#ffffff;">Voidcanvas</span></td>
<td align="right" valign="middle" style="font-size:12px;font-weight:600;letter-spacing:0.04em;color:#b9afff;">Working Designer Study</td>
</tr></table></td></tr>
<tr><td bgcolor="{ACCENT}" style="height:3px;line-height:3px;font-size:0;background:{ACCENT};">&nbsp;</td></tr>
<tr><td bgcolor="#ffffff" class="vc-pad" style="background:#ffffff;border-radius:0 0 16px 16px;padding:36px 40px 36px;">
<div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:{ACCENT_DARK};">{eyebrow}</div>
<h1 class="vc-title" style="margin:10px 0 24px;font-size:28px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:{INK};">{title}</h1>
{track}{body}{SIG}
</td></tr>
<tr><td align="center" class="vc-pad" style="padding:26px 40px 8px;font-size:12px;line-height:1.7;color:{MUTED};">
<img src="{LOGO}" width="22" height="22" alt="Voidcanvas" style="display:block;margin:0 auto 12px;border:0;border-radius:5px;">
You are receiving this because you applied to the Voidcanvas Working Designer Study.<br>{links}<br><br>
<span style="color:#9a9aa6;">{FOOT}</span>
</td></tr>
</table></td></tr></table></body></html>'''

me = f'{SITE}/research/me?p={{$study_token}}'
studio = f'{SITE}/studio?study={{$study_token}}'
E = {}
E['0'] = ("We've received your application", "We'll reply by Monday 5 October.", page("We'll reply by Monday 5 October.",
  'Application received', 'Thanks for applying',
  p(HI) + p('We have your application for the Voidcanvas Working Designer Study.') +
  facts([('Your reference', '{$study_ref}'), ('We reply by', 'Monday 5 October')]) +
  p('We review every application and reply to everyone, whether or not you are selected. You don’t need to do anything in the meantime.') +
  p('If you have a question, reply to this email and include your reference.'), stage=1))
E['1'] = ("You're invited to the Voidcanvas Working Designer Study", "Two weeks, one real client job, £15 when you finish.", page("Two weeks, one real client job, £15 when you finish.",
  'You are invited', 'We’d like you to take part',
  p(HI) + p('Thank you for applying. Based on your answers, we would like to invite you to take part in the Voidcanvas Working Designer Study.') +
  p('The study looks at one part of design work: what happens after a client approves the key visual. Adapting it into every format, checking it, naming the files and delivering them. We want to measure how long that takes today, and whether Voidcanvas Studio makes it faster.') +
  h('What you would do') + steps([
    ('Six questions', 'About your last multi-format job, by voice note or text. About 15 minutes.'),
    ('One real client job, 6 to 20 October', 'Take it through Voidcanvas Studio, from key visual to delivery package.'),
    ('Three closing questions', 'When you finish. About 2 minutes.')]) +
  h('What you receive') + facts([('Payment', '£15 or the naira equivalent'), ('Paid within', '7 days of finishing'), ('Findings summary', 'By Friday 6 November')]) +
  note('There is nothing to buy. Voidcanvas is free, runs in your browser, and your design files stay on your device. We never upload or see them.') +
  p('Please read the ' + link('participant information sheet', f'{SITE}/research/information') + ' and the ' + link('incentive terms', f'{SITE}/research/terms') + ' before you accept.') +
  btn('Read and accept', f'{SITE}/research/consent?p={{$study_token}}') +
  p('We will hold your place until {$invite_deadline}. After that, we will offer it to the next applicant.', 14.5), stage=2))
E['2'] = ("Your application to the Voidcanvas Working Designer Study", "Thank you for applying.", page("Thank you for applying.",
  'Application update', 'Thank you for applying',
  p(HI) + p('We received more applications than we have places, and for this round we selected a mix of countries, studio sizes and kinds of work. We are not able to offer you a place this time.') +
  p('Your answers are still useful. They help us understand how designers work, and we use them only as described in our ' + link('privacy notice', f'{SITE}/research/privacy') + '. Your contact details are deleted by 31 March 2027.') +
  p('If you would like to hear about future studies, click below. If not, you don’t need to do anything.') +
  btn('Tell me about future studies', f'{SITE}/research/future?p={{$study_token}}') +
  p('Voidcanvas stays free to use at ' + link('voidcanvas.app', SITE) + '.')))
E['3'] = ("You're in. Here's how the study works", "Start with the six questions. About 15 minutes.", page("Start with the six questions. About 15 minutes.",
  'Welcome to the study', 'You’re in. Here’s how it works',
  p(HI) + p('Thank you for joining the Voidcanvas Working Designer Study. Your study page shows each step and what is left. Keep this email: the link always brings you back.') +
  facts([('Your reference', '{$study_ref}'), ('Job window', '6 to 20 October'), ('Deadline', '23:59 UK time, 20 October')]) +
  btn('Open my study page', me) +
  h('Your three steps') + steps([
    ('The six questions, now', 'Tell us about your last multi-format job, by voice note or text. You can stop and come back later. ' + link('Start the questions', f'{SITE}/research/interview?p={{$study_token}}') + '.'),
    ('One real client job, 6 to 20 October', 'When your next job with at least 3 formats comes in, open Voidcanvas through ' + link('your study link', studio) + ' and take it from key visual to delivery package. Please use a laptop or desktop with Chrome or Edge.'),
    ('Three questions, straight after', 'They appear when you download the delivery package. About 2 minutes.')]) +
  note('The study link records timing and usage only. It does not record your designs, text, images or file names. Choose a job with some slack in the deadline, and keep your usual tools open in case you need them.') +
  h('If something goes wrong') + p('Use Help, then Report a problem, inside Voidcanvas, or reply to this email. Problems are useful to the study, so please don’t hold back.') +
  h('Payment') + p('When all three steps are done, we will email you to confirm how you would like to receive your £15.'), stage=3))
E['4'] = ("The study closes on 20 October", "Your place is still open.", page("Your place is still open.",
  'Reminder', 'Your place is still open',
  p(HI) + p('We haven’t seen a job from you yet. The study closes at 23:59 UK time on Tuesday 20 October.') +
  p('If a job with at least 3 formats is coming up, open Voidcanvas through your study link and take it through to the delivery package.') +
  btn('Open Studio with my study link', studio) +
  p('Your ' + link('study page', me) + ' shows anything else that is left, including the six questions.') +
  note('If you no longer have time, that’s fine. You can withdraw from your study page, or reply “withdraw”, and we will delete your study data within 30 days.') +
  p('This is the only reminder we will send.', 14.5), stage=3))
E['5'] = ("Thank you. Your part of the study is complete", "Confirm how you'd like to receive your £15.", page("Confirm how you'd like to receive your £15.",
  'Study complete', 'Your part is done. Thank you.',
  p(HI) + p('We have your answers, your job and your closing questions. That completes your part of the Voidcanvas Working Designer Study.') +
  p('To receive your £15, please confirm your payout details. You can choose a UK bank transfer, a Nigerian bank transfer in naira, or PayPal.') +
  btn('Confirm payout details', f'{SITE}/research/payout?p={{$study_token}}') +
  facts([('Paid within', '7 days of your details'), ('Findings summary', 'By Friday 6 November')]) +
  note('<strong style="color:' + INK + ';">For your security.</strong> We will never ask for a password, card number, PIN or one-time code, and we will never ask you to pay anything to receive this payment. If anyone contacts you asking for these in our name, forward the message to research@voidcanvas.app.'), stage=4))
E['6'] = ("Your study payment has been sent", "Reference {$payment_ref}.", page("Your study payment has been sent.",
  'Payment sent', 'Your payment is on its way',
  p(HI) + p('We have sent your payment for the Voidcanvas Working Designer Study.') +
  facts([('Amount', '{$payout_amount}'), ('Method', '{$payout_method}'), ('Date sent', '{$payment_date}'), ('Reference', '{$payment_ref}')]) +
  p('Bank transfers usually arrive within 1 to 2 working days. If it hasn’t reached you by {$check_date}, reply to this email with the reference and we will look into it the same day.') +
  p('Thank you again for your time and your honest answers.'), stage=5))
E['7'] = ("An optional offer for study participants", "Separate from the study. Your payment is not affected.", page("Separate from the study. Your payment is not affected.",
  'Optional offer', 'Become a Founding member',
  p(HI) + note('This email is separate from the study. Your payment has been made, and nothing here changes that.') +
  p('All of Voidcanvas’s editing, Studio, Effects and export features stay free. We are also building Voidcanvas Pro, for the parts that cost us money to run. Pro is planned to include:') +
  bullets(['Sync across your devices, encrypted end to end', 'Studio Share: review links your clients can open without an account, with pins and approvals', 'Version history in the cloud', '25 GB of storage']) +
  p('Because you took part in the study, you can become a Founding member:') +
  facts([('Founding member, UK', '£48 a year'), ('Founding member, Nigeria', '₦28,000 a year'), ('Planned Pro price', '£60 or ₦35,000 a year')]) +
  h('How it works') + bullets(['You pay now. Your 12 months start the day Pro launches, not today.', 'Your founding price stays for as long as you remain a member.', 'Full refund at any time before Pro launches, and for 14 days after.', 'If Pro has not launched by 30 June 2027, we refund you automatically.']) +
  btn('See the Founding member offer', f'{SITE}/founding') +
  p('Full terms: ' + link('voidcanvas.app/founding-terms', f'{SITE}/founding-terms') + '. The offer closes on 30 November. If it isn’t for you, there is no need to reply.', 14.5)))

out = pathlib.Path(__file__).parent
for k, (subj, prev, body) in E.items():
    (out / f'email-{k}.html').write_text(body)
    (out / f'email-{k}.subject.txt').write_text(subj + '\n' + prev + '\n')
print('built', len(E))
