# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase A (Foundation) complete: Units 01–08 done. Phase B: Units 09–12 done;
  **Act 1 passes end to end on the public URL.** Units 13–16 done;
  **golden-path steps 1–7 pass online and offline**, and the hijack block is
  demoable on demand. Units 17–18 done; **golden-path step 10 works
  through the API.** Phases A–D complete: Units 01–27 done. **The whole golden
  path runs from `/demo`, and all 15 evaluation cases pass online and
  offline** (`npm run eval`). Only stretch Units 28–29 remain.

## Current Goal

- Answer the "Clarify before building" questions in
  the stretch units (28–29) if time allows; otherwise film with
  `context/demo-script.md`.

## Schedule

| When                  | Target                                                                                     | Who                                   |
| --------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------- |
| Sat 14 Nov            | Context approved; Units 01–08                                                              | Developer + AI                        |
| Sun 15 Nov            | Units 09–18 (first Vercel deploy is Unit 12)                                                           | Developer + AI                        |
| Sun 15 Nov            | Film scam-call reenactment (≤ 45 s); draft video script                                    | Teammate                              |
| Mon 16 Nov 10am–3pm   | Units 19–26; mentor feedback; ask the lead mentor about pre-event work; verify GEL colours | Developer + AI; teammate tests the golden path |
| Mon 16 Nov evening    | Unit 27 rehearsal and evaluation cases; fix list                                           | Both                                  |
| Tue 17 Nov 10am–12pm  | Fixes only. **Feature freeze 12:00pm**                                                     | Developer                             |
| Tue 17 Nov 1–3pm      | Screen-record the golden path, record narration, edit (≤ 10 min), upload to YouTube        | Teammate leads; developer drives demo |
| Tue 17 Nov by 3:30pm  | Submission email sent (hard deadline 4:00pm)                                               | Both                                  |
| Thu 19 Nov 2pm        | Shortlist notice                                                                           | —                                     |
| Fri 20 Nov 9:30am     | 5-minute live pitch at the Westpac Gold Coast Engineering Hub (if shortlisted)             | Both                                  |

## Build Order

Each unit gets a spec in `context/feature_specs/NN-name.md`, written just
before it's built. What each unit contains and when it counts as done is in
`context/feature_specs/00-build-plan.md`. Tick a unit here when it's done.

**Phase A — Foundation**

- [x] 01 App shell and design tokens
- [x] 02 Database schema and seed
- [x] 03 Server foundations and state API
- [x] 04 Live balances on Home (step 1)
- [x] 05 Trust engine (pure)
- [x] 06 Prepare transfer service
- [x] 07 Approve and cancel routes
- [x] 08 Trust Receipt and PIN dialog

**Phase B — The assistant**

- [x] 09 DeepSeek client and agent loop
- [x] 10 Offline fallback parser
- [x] 11 Chat UI (Act 1 done)
- [x] 12 First Vercel deploy
- [x] 13 Mock merchant page
- [x] 14 Product reading and shield card (step 6)
- [x] 15 Purchase flow (steps 5–7)
- [x] 16 Simulated compromised agent
- [x] 17 Fraud rules (pure)
- [x] 18 Card authorisation pipeline

**Phase C — Protection and the bank side**

- [x] 19 "Was this you?" alert (steps 10–12)
- [x] 20 Emergency protection (steps 12–13, 16)
- [x] 21 Safety knowledge base (step 14)
- [x] 22 Protect tab (step 15)
- [x] 23 Bank console lists (steps 8, 11)
- [x] 24 AI case brief (step 17)
- [x] 25 Staff review and resolve (Act 4 done)
- [x] 26 Demo harness (step 19)

**Phase D — Rehearsal**

- [x] 27 Rehearsal and polish (feature freeze 12:00pm Tue 17 Nov)

**Stretch (only if 27 is done)**

- [ ] 28 Scam message checker
- [ ] 29 Scam-coaching detector

## Completed

- Product scope finalised. Context files created: `project-overview.md`,
  `architecture.md`, `ui-context.md`, `code-standards.md`,
  `ai-workflow-rules.md`, `progress-tracker.md`.
- Build plan written: `context/feature_specs/00-build-plan.md` breaks the
  project into 29 units with dependencies and "done when" criteria.
- **Unit 01 App shell and design tokens** (Sat 14 Nov): tokens and fonts,
  `components/ui` primitives, the customer phone frame with Home and Protect,
  and `/ops`, `/demo` and `/shop/aurora-anc` skeletons with static data.
  `lib/money.ts`. See `feature_specs/01-app-shell.md` → Built.
- **Unit 02 Database schema and seed** (Sat 14 Nov):
  `supabase/migrations/0001_init.sql` with every table, the CHECKs, RLS,
  `complete_action()` and `reset_demo()`. Verified on Postgres (PGlite);
  applied in Supabase by the developer. See `feature_specs/02-database.md` →
  Built.
- **Unit 03 Server foundations and state API** (Sat 14 Nov): `lib/db.ts`,
  `lib/http.ts`, `lib/audit.ts`, the seed-id constants,
  `GET /api/customer/state`, `POST /api/demo/reset` and `.env.example`.
  Verified live against Supabase. See `feature_specs/03-server-foundations.md`
  → Built.
- **Unit 04 Live balances on Home** (Sat 14 Nov): the `useCustomerState`
  polling hook, `AccountSummary` and `HomeScreen`. **Golden-path step 1
  works from the DB.** See `feature_specs/04-live-balances.md` → Built.
- **Unit 05 Trust engine (pure)** (Sat 14 Nov): policy R1–R7, intent
  provenance with word-numbers, the content scanner and the payload hash.
  30 tests via `npm test`. See `feature_specs/05-trust-engine.md` → Built.
- **Unit 06 Prepare transfer service** (Sat 14 Nov): `prepareTransfer()`
  (resolve, provenance, assess, hash, store, audit), `createIncident()` with
  injection incidents on R2 blocks, and the temporary dev route. Verified
  live. See `feature_specs/06-prepare-transfer.md` → Built.
- **Unit 07 Approve and cancel routes** (Sat 14 Nov): PIN check (3 strikes
  cancel), specific not-approvable messages, `OUTGOING_PAUSED`, and the
  atomic `complete_action()`. Replay, altered hash, expiry, held/blocked and
  insufficient funds are all rejected, verified live. See
  `feature_specs/07-approve-cancel.md` → Built.
- **Unit 08 Trust Receipt and PIN dialog** (Sat 14 Nov): `TrustReceipt` (all
  states), `PinDialog` on native `<dialog>`, instant balances after approval,
  and the temporary dev panel. **Golden-path steps 3–4 work on screen**
  (triggered by the dev panel). See `feature_specs/08-trust-receipt.md` →
  Built.
- **Unit 09 DeepSeek client and agent loop** (Sat 14 Nov): `/api/chat` with 4
  validated tools and a bounded loop, using `deepseek-v4-pro` with thinking
  disabled (both measured live). **Golden-path steps 2–3 work through the
  API.** See `feature_specs/09-agent-loop.md` → Built.
- **Unit 10 Offline fallback parser** (Sat 14 Nov): a pure intent parser
  (tested) driving the same tools; automatic fallback on a missing key, an
  error or a 12 s timeout. **Golden-path steps 2–3 work with no LLM.** See
  `feature_specs/10-fallback-parser.md` → Built.
- **Unit 11 Chat UI** (Sat 14 Nov): chat thread, input, chips, typing
  indicator, offline badge, receipts inline; the dev panel and route were
  removed. **Golden-path Act 1 passes in the browser online and offline.**
  See `feature_specs/11-chat-ui.md` → Built.
- **Unit 12 First Vercel deploy** (Sat 14 Nov): **https://trust-path-five.vercel.app**,
  functions in `syd1`, no secrets in the bundles, and Act 1 verified on the
  public URL. See `feature_specs/12-first-deploy.md` → Built.
- **Unit 13 Mock merchant page** (Sat 14 Nov): the catalogue as the source of
  truth for prices, and `/shop/aurora-anc` with the hidden instruction in an
  HTML comment and a hidden span. See `feature_specs/13-merchant-page.md` →
  Built.
- **Unit 14 Product reading and shield card** (Sun 15 Nov): `view_product`
  (catalogue only, scanned, wrapped as untrusted), `ShieldCard`, and an
  `injection_blocked` incident per turn. **Golden-path step 6 works online
  and offline.** See `feature_specs/14-shield-card.md` → Built.
- **Unit 15 Purchase flow** (Sun 15 Nov): `preparePurchase` (catalogue price,
  card check), `prepare_purchase` tool, purchase receipt, offline buy path.
  **Golden-path steps 1–7 pass in one chat → Everyday $951.00.** See
  `feature_specs/15-purchase-flow.md` → Built.
- **Unit 16 Simulated compromised agent** (Sun 15 Nov): a demo route sends the
  hijacked $500 call through the real trust engine (always blocked, high
  incident), shown in the customer chat as a labelled Blocked card. See
  `feature_specs/16-compromised-agent.md` → Built.
- **Unit 17 Fraud rules** (Sun 15 Nov): pure signals and decision matrix
  with 10 tests. Nova $3,580 → declined + temporarily locked; Metro Café →
  approved. See `feature_specs/17-fraud-rules.md` → Built.
- **Unit 18 Card authorisation pipeline** (Sun 15 Nov):
  `POST /api/simulate/card-authorization` → fraud engine → card event, lock,
  incident, "Was this you?" notification and `fraud_engine` audit rows, with
  no AI. **Golden-path step 10 works through the API.** See
  `feature_specs/18-card-authorisation.md` → Built.
- **Unit 19 "Was this you?" alert** (Sun 15 Nov): `AlertBanner` on Home
  within about 1 s of the attempt; `POST /api/notifications/[id]/respond`;
  "No, it wasn't me" locks the card, raises the incident and opens the chat
  with the follow-up question. **Golden-path steps 10–12 (first half) work
  on screen.** See `feature_specs/19-was-this-you.md` → Built.
- **Unit 20 Emergency protection** (Sun 15 Nov): `activate()`, the
  protect-only `report_account_compromise` tool, the offline trigger and
  `EmergencyCard`. **Steps 12–13 and 16 pass online and offline.** Two
  prompt rules were added (always prepare, let the bank block; activate
  only on the latest message). See `feature_specs/20-emergency-protection.md`
  → Built.
- **Unit 21 Safety knowledge base** (Sun 15 Nov): 5 curated docs, keyword
  retrieval, the read-only `search_safety_guide` tool (wrapped and scanned)
  and a sources line. **Step 14 passes online and offline**; "Why was my
  payment blocked?" cites the stored reason. See
  `feature_specs/21-safety-knowledge.md` → Built.
- **Unit 22 Protect tab** (Sun 15 Nov): live `SecurityStatus` hero, cards
  with lock state, restrictions, cases with case numbers, and an alert row
  linking to Home. **Step 15 works.** See `feature_specs/22-protect-tab.md`
  → Built.
- **Unit 23 Bank console lists** (Sun 15 Nov): `GET /api/ops/state`, live
  card events with decisions and reasons, incidents by severity, the audit
  log with actor chips, stat pills and a 1 s highlight on new rows. **Steps
  8 and 11 visible in `/ops` within 1 s.** See
  `feature_specs/23-bank-console.md` → Built.
- **Unit 24 AI case brief** (Sun 15 Nov): briefs written in the background
  with `after()` (DeepSeek JSON mode, template fallback), rewritten on the
  customer's answer and on escalation; `IncidentDetail` in `/ops`. Measures
  and the next step stay anchored to the facts. **Step 17 works online and
  offline.** See `feature_specs/24-case-brief.md` → Built.
- **Unit 25 Staff review and resolve** (Sun 15 Nov): `lib/ops/staff.ts`,
  review/resolve routes (demo key), a staff key field, buttons and a confirm
  dialog in the console, and a test that the AI has no path to staff
  actions. **Step 18 / Act 4 passes.** See
  `feature_specs/25-staff-resolve.md` → Built.
- **Unit 26 Demo harness** (Sun 15 Nov): `/demo` at 1920×1080 with the phone
  scaled ×1.2, the console, four demo buttons, a shared demo/staff key, and
  reset that reloads both panes (about 0.2 s). Operator script in
  `context/demo-script.md`. **Steps 1–19 run from `/demo`.** See
  `feature_specs/26-demo-harness.md` → Built.
- **Unit 27 Rehearsal and polish** (Sun 15 Nov): `npm run eval` (15 cases),
  prompt fixes for unknown recipients and the hidden-instruction sentence,
  and a deterministic guard against "I've prepared…" claims with no tool
  call (found during rehearsal). Keyboard, reduced-motion and bundle-secret
  checks pass. See `feature_specs/27-rehearsal.md` → Built.

## In Progress

- None yet.

## Next Up

- Film with `context/demo-script.md`; re-run `npm run eval -- https://trust-path-five.vercel.app` before each filming session.
- Developer: set Vercel `DEMO_ADMIN_KEY` to the generated production key and
  redeploy (see `12-first-deploy.md` → Built).
- Stretch Units 28–29 only if time allows (each needs its own spec).

## Open Questions

- **Team name and teammate's name.** Needed for the submission email.
- **Is building before Monday OK?** The handbook has no rule against it but
  says the competition days are for building. Ask the Griffith lead mentor on
  Mon 16 Nov at about 10:15am, and be open about weekend work if asked.
- **Westpac Design Resource.** Confirm the red `#DA1710` and choose a navy
  from the official kit on Day 1. Token values only change.
- **Accounts and keys.** DeepSeek API key with credits, a Supabase project
  (Sydney region) and a Vercel account. Check that all three exist before
  Unit 02.
- **Positioning claims.** Verify the bank-feature claims (CommBank Companion,
  CommBank agentic fraud rules, Westpac SafeBlock/SaferPay/SafeCall) before
  saying them on camera.
- **Optional pitch line** on Australia's Scams Prevention Framework. Verify
  the current status and wording before using it.

## Architecture Decisions

All decided Sat 14 Nov 2026:

- **Specs live in `context/feature_specs/`, one per unit, written just before
  the unit is built.** The original 12 units were split into 29 smaller ones,
  following the split rules in `ai-workflow-rules.md`. Status is tracked only
  in this file.
- **Unknown `/shop/[productId]` returns the not-found page with HTTP 200.**
  `dynamicParams = false` conflicts with `cacheComponents`. Accepted, since
  it's off the golden path.
- **`pending_actions.recipient_label`** holds the raw recipient of a
  blocked, unresolved transfer ("J. Smith"), so the blocked receipt can name
  it. The DB allows it only on `blocked` rows.
- **Live-data `GET` routes call `await connection()`** so `cacheComponents`
  never prerenders them at build time.
- **`package.json` has `"type": "module"`** so Node runs the `.ts` tests
  without module-type warnings.
- **Wrong PINs are counted from audit rows.** The 3rd failure on a pending
  action cancels it; no extra column is needed.
- **`experimental.agentFeedback` turned off** in `next.config.ts` (developer
  asked for the optimal choice, Sat 14 Nov). It made `next dev` rewrite
  `AGENTS.md` on every run and asked agents to send feedback to Next.js;
  neither helps TrustPath.
- **`deepseek-v4-pro`, thinking explicitly disabled** (Unit 09, measured
  against `deepseek-flash` on the evaluation cases; omitting `thinking`
  turns it on).
- **The customer app stays phone-shaped on laptops** (developer asked, Unit
  11). The phone + bank console side by side is the story; Unit 26 scales
  the phone up in `/demo` so it's big on the recording.
- **Shop product photo:** Jason Leung on Unsplash (Unsplash License, no
  visible brand), chosen in Unit 13 at the developer's request.
- **No multi-user sign-in.** Asked during Unit 02 and kept out of scope.
- **lucide-react v1 icon names** (`CircleCheck`, `TriangleAlert`, `OctagonX`,
  `House`) replace the older aliases in `ui-context.md`.

- **One connected story instead of three separate demos.** Every feature
  appears once and the link between the AI and the trust layer is shown, not
  told.
- **Headline innovation: agent hijack protection.** It uses a content scanner
  plus a deterministic intent-provenance rule. Picked as the most impressive
  and memorable for judges, and it directly addresses "autonomous banking
  agents" from the brief. Not chosen: the scam-coaching detector (now a
  stretch goal) and a separate signed-approval token. Approval binding uses a
  payload hash plus a single-use status flip in the DB instead.
- **DeepSeek (`deepseek-v4-pro` since Unit 09; originally `deepseek-flash`)** with thinking disabled, called via `fetch`
  on its OpenAI-compatible API. This was the developer's choice. The legacy
  `deepseek-chat` is discontinued. A rule-based fallback protects filming day.
- **Supabase + Vercel.** This was the developer's choice over in-memory. The
  browser never talks to Supabase; RLS is on with no policies and the server
  uses the secret key. Polling every 2 s instead of Realtime means no keys in
  the browser.
- **Money moves only inside the SQL function `complete_action()`.** It runs in
  one transaction, does a single-use status flip and has a `CHECK
  (balance_cents >= 0)` constraint. The DB enforces what app code could miss.
- **Merged `security_incidents` and `support_cases` into `incidents`.** The
  relationship is 1:1.
- **Merged bill payment into `prepare_transfer`.** A biller is just a payee
  kind.
- **Cut:** investments, real auth, vector DB, shadcn/ui, the OpenAI SDK, the
  Supabase CLI and Realtime.
- **Look: "Westpac app with TrustPath stamped on every action."** Westpac red
  is used as an accent, navy as primary, and trust teal for the trust layer.
  No Westpac logo. This was the developer's call (a mix of own brand and the
  Westpac look).
- **The bank blocks, not the model (Unit 20).** The prompt tells the model
  never to refuse a payment in words and always to call the prepare tool,
  so the trust engine decides and Alex sees the reason on a card.
- **Tests run with Node's built-in runner** (Node 26 strips types), with no
  test framework dependency.
- **The teammate owns** the video (reenactment, recording, editing), testing
  the golden path and co-presenting. The developer and AI build.

## Session Notes

- **Final rehearsal (Sun 15 Nov):** production passes `npm run eval` 24/24
  (15 cases, headphones 10/10) and the full `/demo` take (steps 1–19).
- **Production URL: https://trust-path-five.vercel.app** (Vercel, `syd1`,
  auto-deploys from `main`). Hash-style deployment URLs need a Vercel login.

- The repo is a fresh `create-next-app` (Next 16.4.6, React 19.3, Tailwind
  4.3). Each unit is built on its own branch `unit/NN-name` and
  merged into `main` with `--no-ff` once verified.
- The submission email needs:
  - university
  - team name
  - at least 2 member names
  - an idea summary: what you are trying to achieve, and why it is a good
    idea. Use "Why This Idea" in `project-overview.md`.
  - a YouTube link (≤ 10 min)
  - the hosted URL
- The video script comes next, after the context is approved. Use the
  golden-path acts as its structure.
