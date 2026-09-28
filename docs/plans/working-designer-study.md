# Working Designer Study

Paid research with up to 20 working designers in the UK and Nigeria. Each takes one real client job through Studio,
from approved key visual to delivery package, answers six interview questions and three closing questions, and
receives £10. Run by MotionPlay Labs Ltd. Programme pack (documents, emails, pass marks): the "Voidcanvas Working
Designer Study: programme pack" doc in the Claude project.

## Dates (UK time)

| | |
| --- | --- |
| Applications open | 28 September 2026 |
| Applications close | Sunday 4 October, 23:59 (the form closes itself: `DATES.closesAt` in `src/lib/research.ts`) |
| Selection emails | Monday 5 October |
| Job window | 6 to 20 October, due 23:59 on 20 October |
| Reminder | Tuesday 13 October, 10:00 (scheduled MailerLite campaign) |
| Findings sent | Friday 6 November |
| Voice notes deleted | 18 January 2027 |
| Contact details deleted | 31 March 2027 |

All participant-facing dates come from `DATES` in `src/lib/research.ts`. The emails carry their own copies
(`docs/research-emails/build.py`); change both together.

## Pages

| Route | What |
| --- | --- |
| `/research` | Landing page and application form (`src/components/research/ApplyForm.tsx`). `?src=` is stored as the source |
| `/research/information`, `/terms`, `/privacy` | Participant information sheet, incentive terms, privacy notice |
| `/research/consent?p=` | Consent form. Only works once selected |
| `/research/me?p=` | The participant's study page: each step, what is left, Studio link, withdraw |
| `/research/interview?p=` | Six questions, typed or voice note (MediaRecorder, up to 10 minutes, uploaded to a private bucket) |
| `/research/closing?p=&job=` | Fallback for the three closing questions |
| `/research/payout?p=` | UK bank, Nigerian bank or PayPal details |
| `/research/future?p=` | Opt in to future studies |
| `/founding`, `/founding-terms` | Founding member offer. Payment buttons appear when `NEXT_PUBLIC_FOUNDING_GBP_URL` / `NEXT_PUBLIC_FOUNDING_NGN_URL` are set |
| `/admin/research` | Admin view (same password as `/admin`): select, read answers, play voice notes, job timing, mark paid, scorecard |

`p` is the participant's secret token (a UUID). It only appears in their own emails and links.

## Research mode in Studio

Opening `/studio?study=<token>` stores the token (`vc-study`) and shows a small note in Studio and the Editor
(`src/components/research/StudyMode.tsx`). It records timing only, never designs, text, images or file names.

- Start key visual: `job.start`. Build formats: `job.formats`, and the active-time counter for that job starts.
- Active time counts only while the tab is visible and the person has interacted in the last 5 minutes. It carries
  across Studio and the Editor through localStorage and is saved on page hide.
- Build the package or Send as a link: `job.deliver` with the format count and active seconds, then the closing
  questions open over the Deliver tab (`src/components/research/ClosingForm.tsx`).

## Backend

- Schema `research` (participants, answers, jobs, events, payouts), not exposed through the REST API. Row level
  security on, no policies.
- Functions `public.research_*`, executable by `service_role` only. The admin check reuses `vc_admin.password_ok`
  through `public.vc_research_admin_ok`.
- Bucket `research-voice`, private.
- Edge function `research` (`supabase/functions/research/index.ts`, deployed with JWT verification off because it
  is called from public pages; it validates every input and identifies people by their secret token). Actions: apply,
  get, consent, answer, voice-url, event, closing, payout, future, withdraw, admin.
- Completed = consent + six answers + one delivered job with 3 or more formats and its closing questions answered.
- Payout details are deleted 30 days after payment (on each admin list load).

## MailerLite (Voidcanvas account)

The edge function adds people to groups; joining a group starts that step's automation. The token is secret
`MAILERLITE_API_KEY` (or `voidcanvas`) on the edge function. Addresses ending `@test.voidcanvas.app` are never sent
to MailerLite, so tests send no email.

| Group | Automation / email |
| --- | --- |
| Study: applied | Study 0 · Application received |
| Study: selected | Study 1 · Selected (consent link, invite deadline) |
| Study: not selected | Study 2 · Not selected |
| Study: active | Study 3 · Welcome (study page, interview, Studio link) |
| Study: complete | Study 5 · Complete (payout link) |
| Study: paid | Study 6 · Paid, then Founding offer after 2 days |
| Future studies | none |

Segment "Study: joined, no job yet" feeds the 13 October reminder campaign (10:00 UK). Fields: study_token, study_ref,
study_country, invite_deadline, job_started, interview_done, payout_amount, payout_method, payment_date,
payment_ref, check_date. Email HTML lives in `docs/research-emails/` (`python3 build.py` regenerates it).

Email design: dark header with the logo (`/icon-192.png`), a label and headline per email, a five-stage progress
bar (Applied, Selected, Joined, Complete, Paid), key details in a panel, numbered steps, one button. Signed
"The Voidcanvas team". Greeting falls back to "Hi there" through `{$name|default('there')}`. After editing
`build.py`, paste each file into its automation step (or the campaign, which must be unscheduled to edit).

ICO registration number: ZC258834 (shown on /research/privacy).

The MailerLite account is on a 14-day trial (from 27 September). Automations need a paid plan after it ends.

## Tests

- `e2e/research-studio.mjs`: a real Studio job through research mode, delivery, closing questions. Needs
  `STUDY_TOKEN` of an active test participant with an `@test.voidcanvas.app` email.
