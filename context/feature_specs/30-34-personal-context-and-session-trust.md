# 30–34 — Personal context, AI mandate, Session Trust, "Why?" and the story slides

Status: done (Sun 15 Nov)

## Goal

Make every feature feel like one intelligent system built around Alex's own
context: a bank that knows your commitments, organises payday, checks
affordability, enforces the limits you set for your assistant, notices when
someone else is using your account, explains every decision the same way to
you and to staff, and helps you recover in two taps.

## Decisions (developer: "pick the best option for everything")

- **One migration (0003, run by the developer):** `customer_preferences`,
  `commitments`, `payees.ai_approved`, `pending_actions.trace`, the
  `session_risk` case type, the `simulated_unfamiliar_device` origin, the rent
  payee Sam Patel, and Alex's synthetic context (payday 20 Nov, income $3,000,
  rent $500, electricity $120, subscriptions $35, savings $300 → Goal Saver,
  buffer $200, AI limit $1,000).
- **All numbers are deterministic** (`lib/context/safe-to-spend.ts`); the LLM
  only understands and explains. Safe-to-spend = Everyday − commitments still
  to pay this pay cycle − savings not yet made − buffer − other pending
  payments. Items paid or waiting for approval are never counted twice, so
  approving the payday plan leaves it at **$345**.
- **Payday plan:** the saved plan is the intent record (exact payee and
  amount), only when Alex asks for it ("payday"/"usual"/"plan" in their own
  words). Every item is a normal Trust Receipt with PIN.
- **R9 AI mandate** (server-side, `lib/trust/policy.ts`): over the AI limit or
  to a payee not allowed for the AI → block; below the buffer → extra check.
  Applies to anything an assistant or agent prepares; the customer's own Buy
  taps aren't limited by it. The assistant can change only the buffer and
  savings goal, and only with the amount in Alex's own words.
- **R10 Session Trust** (synthetic signals only): unfamiliar device +2, new
  sign-in +1, payee added < 7 days +2, amount > 3× the usual largest payment
  +2. ≥5 → hold; ≥2 → extra check (an unfamiliar device alone never means
  "compromised"); emergency (R1) always wins. Wording never claims who is
  using the device.
- **Recovery:** the unfamiliar-device attack raises a "Was this you?" alert;
  "No, secure my account" cancels the held payment and turns on the
  existing emergency protection (the customer's own answer, never a
  classification). "Yes" never releases the payment.
- **One explanation:** every assessed action stores a decision trace (intent
  source, session, transaction, signals, rules with ids, decision, outcome).
  Customers see it under **Why?** on the receipt; staff see the same in the
  **Session Trust timeline**, with customer instructions labelled apart from
  external content, the saved plan and other sessions.
- **CoachGuard stays** in the app (optional beat in the demo).
- **AFCA figures** checked against AFCA's Annual Review 2025–26 banking and
  finance page before going on the opening slide.

## Built

- Unit 30: `lib/context/safe-to-spend.ts` (+5 tests), `lib/context/context.ts`
  (context with paid/pending/due status, payday plan, edits),
  `/api/me/*` routes, **Me** tab (`MeView`): safe-to-spend, payday, editable
  and removable commitments, savings goal, preferred account, buffer.
- Unit 31: tools `get_safe_to_spend`, `get_financial_context`,
  `prepare_payday_plan`, `update_financial_preference`; `SafeToSpendCard`,
  `PaydayPlanCard`; deals show "fits your safe-to-spend"; offline parser and
  replies for all of them (+1 test).
- Unit 32: R9 + My AI Permissions (allowed / never allowed, AI limit,
  per-payee toggles) (+2 tests).
- Unit 33: R10, `lib/protect/session.ts`, `POST /api/demo/unfamiliar-device`,
  session alert → secure account, demo button, `session_risk` cases and briefs
  (+2 tests).
- Unit 34: `lib/banking/trace.ts`, `WhyTrace` on receipts, console
  `DecisionTimeline` (8 facts), opening/closing slides in `/demo`.
- `npm run eval`: 8 new cases (37 total).

## Verify (all done)

- [x] `npm test` 102/102 (92 before); build and lint clean.
- [x] `npm run eval` 37/37 online and 37/37 offline locally.
- [x] Browser, online and offline: $345 card, payday plan + 3 receipts +
      "Why?", Me tab, unfamiliar-device alert → secure → Emergency card,
      console timeline with 8 facts, both slides.
- [x] Regression, online and offline: full golden path from `/demo`,
      CoachGuard, shop.
