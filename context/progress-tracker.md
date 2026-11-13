# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase A (Foundation). Unit 01 done. Unit 02 spec drafted, awaiting
  clarification.

## Current Goal

- Answer the "Clarify before building" questions in
  `context/feature_specs/02-database.md`, then build Unit 02.

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
- [ ] 02 Database schema and seed — spec drafted
- [ ] 03 Server foundations and state API
- [ ] 04 Live balances on Home (step 1)
- [ ] 05 Trust engine (pure)
- [ ] 06 Prepare transfer service
- [ ] 07 Approve and cancel routes
- [ ] 08 Trust Receipt and PIN dialog

**Phase B — The assistant**

- [ ] 09 DeepSeek client and agent loop
- [ ] 10 Offline fallback parser
- [ ] 11 Chat UI (Act 1 done)
- [ ] 12 First Vercel deploy
- [ ] 13 Mock merchant page
- [ ] 14 Product reading and shield card (step 6)
- [ ] 15 Purchase flow (steps 5–7)
- [ ] 16 Simulated compromised agent
- [ ] 17 Fraud rules (pure)
- [ ] 18 Card authorisation pipeline

**Phase C — Protection and the bank side**

- [ ] 19 "Was this you?" alert (steps 10–12)
- [ ] 20 Emergency protection (steps 12–13, 16)
- [ ] 21 Safety knowledge base (step 14)
- [ ] 22 Protect tab (step 15)
- [ ] 23 Bank console lists (steps 8, 11)
- [ ] 24 AI case brief (step 17)
- [ ] 25 Staff review and resolve (Act 4 done)
- [ ] 26 Demo harness (step 19)

**Phase D — Rehearsal**

- [ ] 27 Rehearsal and polish (feature freeze 12:00pm Tue 17 Nov)

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

## In Progress

- None yet.

## Next Up

- Developer answers the questions in `02-database.md`. The Supabase project
  (Sydney region) must exist first.
- Build and verify Unit 02, tick it above, then write `03-server-foundations.md`.

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
- **Product image** for the headphones on the shop page. Use a neutral
  placeholder or a generated image; don't use stock photos of real brands.
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
- **DeepSeek (`deepseek-flash`)** with thinking disabled, called via `fetch`
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
- **Tests run with Node's built-in runner** (Node 26 strips types), with no
  test framework dependency.
- **The teammate owns** the video (reenactment, recording, editing), testing
  the golden path and co-presenting. The developer and AI build.

## Session Notes

- The repo is a fresh `create-next-app` (Next 16.4.6, React 19.3, Tailwind
  4.3). Work happens on the branch `feature/trustpath-build`, with one commit
  per unit.
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
