# 28 — CoachGuard (scam-coaching detector)

Status: done

Replaces the planned stretch Units 28 (scam message checker) and 29 (scam-coaching
detector): CoachGuard covers both.

## Goal

Customers can paste a message or call transcript, in chat or on the Protect tab.
CoachGuard finds scam-coaching and social-engineering instructions, quotes the
exact evidence, explains it in plain English with a safe next step, and passes
the signals to the deterministic trust engine. A strong assessment plus a new
payee holds the payment, with the exact reason on the Trust Receipt. It never
locks accounts on its own and never says a message is definitely fraud.

## Decisions (developer asked to build without stopping; brief on Sun 15 Nov)

- **Signals:** `coached_bank_response`, `concealment`,
  `third_party_influence`, `safe_account_transfer`, `urgency_or_pressure`,
  `credential_request`, `remote_access_request`, `secrecy_instruction`.
- **The LLM only extracts evidence** (DeepSeek JSON mode, the paste wrapped as
  untrusted content). Any quote that isn't an exact excerpt of the paste is
  dropped. The rule-based detector always runs too, and is the whole detector
  when DeepSeek is unavailable.
- **Deterministic wording:** assessment (`no_signs` / `some_signs` /
  `strong_signs`), explanation and next step are templates, so nothing ever
  claims certainty. Strong = any of coached response, concealment, safe
  account, credential request, remote access or secrecy, or 3+ signals.
- **Trust engine R8** (explicitly instructed change to `lib/trust/policy.ts`):
  a strong assessment in the last hour + a transfer to a new payee (added under
  7 days ago) or an unknown recipient → **hold**, high, with the reason
  "Possible scam coaching: a message you shared … ("exact quote"). This payee
  is new, so our team will check with you before it goes ahead." An
  established payee gets a warning (step-up) instead. Own accounts and
  purchases are unaffected. Unknown recipients stay blocked by R3; the
  coaching reason is listed too.
- **Linking:** a payment already waiting for approval is re-checked when a
  message is shared later (held, or a warning added). A payment held after
  the message is recorded on the open coaching case.
- **Pasted text is untrusted:** a chat message with strong signs, or a "check
  this message: …" request with content, is a paste. It never counts as the
  customer's words for provenance (R2), reaches the model only inside
  `<untrusted_content source="pasted message">`, is always checked by
  CoachGuard before the model runs, and can't trigger emergency protection
  unless it contains the customer's own first-person disclosure ("I gave…").
- **Migration `0002_coachguard.sql`** (run by the developer): `scam_coaching`
  incident type, `coaching_assessments`, `incidents.coaching_assessment_id`,
  and the demo payee **D. Mercer**, added 1 day ago and unverified (the scam
  caller had Alex add them).

## Built

- `lib/protect/coaching/signals.ts` (pure: patterns, exact-excerpt check,
  merge, templates) + 10 tests; `lib/protect/coaching/analyse.ts` (AI
  extraction, storage, audit `coaching.assessed`, linking, the
  `scam_coaching` incident, `recentCoaching`, `noteCoachingHold`).
- `lib/trust/policy.ts`: R8 `coachingHit()` + 3 tests; `NEW_PAYEE_DAYS = 7`.
- `lib/ai/paste.ts` (`looksPasted`, `ownWords`, `wrapPasted`) + 3 tests,
  including test 8 (instructions in a paste are untrusted).
- Tool `check_message_for_scam_coaching` (no arguments: it analyses the
  paste itself, so the model can't alter the text); the agent runs it
  before the model whenever there's a paste; offline parser and fallback
  reply; `report_account_compromise` refuses for a paste alone.
- UI: `CoachingCard` (evidence quotes, explanation, held payments, "What to
  do now", "can't prove who sent a message"), "Check a message" on Protect
  (`POST /api/protect/check-message`), receipts that pick up a later hold,
  "Scam coaching" cases in `/ops` (resolve button only for resolvable types).
- Case brief: facts include the coaching evidence; template branch with a
  safe next step ("call the customer on their registered number, never a
  number from the message").
- Fallback parser keeps initials with names ("D. Mercer").
- `npm run eval`: 9 new CoachGuard cases (tests 1–6, 6b, no-lock, 8).
- `lib/ai/no-staff-path.test.ts`: test 7 (CoachGuard can't approve, unlock,
  execute or lock).

## Verify (all done)

- [x] `npm test` 85/85; build and lint clean.
- [x] `npm run eval`: 24/24 online and 24/24 offline locally.
- [x] Browser (online and offline): coaching card with quoted evidence;
      "$400 to D. Mercer" Held with the exact reason and no PIN button; the
      account is not locked; Protect "Check a message" flags AnyDesk; the
      console shows the Scam coaching case with its brief and the
      `coaching.assessed` / `action.assessed` audit rows.
- [x] Golden path from `/demo` unchanged, online and offline.

## Not in this unit

- Staff releasing or cancelling a held payment from the console (held
  payments expire; staff can mark the case investigated).
