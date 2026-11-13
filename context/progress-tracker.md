# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Planning complete. Context files written on Sat 14 Nov; awaiting the
  developer's review. Build not started.

## Current Goal

- Approve the six context files, then write `context/specs/00-build-plan.md`
  and the spec for Unit 01.

## Schedule

| When                  | Target                                                                                     | Who                                   |
| --------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------- |
| Sat 14 Nov            | Context approved; Units 01–04                                                              | Developer + AI                        |
| Sun 15 Nov            | Units 05–08; first Vercel deploy                                                           | Developer + AI                        |
| Sun 15 Nov            | Film scam-call reenactment (≤ 45 s); draft video script                                    | Teammate                              |
| Mon 16 Nov 10am–3pm   | Units 09–10; mentor feedback; ask the lead mentor about pre-event work; verify GEL colours | Developer + AI; teammate tests the golden path |
| Mon 16 Nov evening    | Unit 11 rehearsal and evaluation cases; fix list                                           | Both                                  |
| Tue 17 Nov 10am–12pm  | Fixes only. **Feature freeze 12:00pm**                                                     | Developer                             |
| Tue 17 Nov 1–3pm      | Screen-record the golden path, record narration, edit (≤ 10 min), upload to YouTube        | Teammate leads; developer drives demo |
| Tue 17 Nov by 3:30pm  | Submission email sent (hard deadline 4:00pm)                                               | Both                                  |
| Thu 19 Nov 2pm        | Shortlist notice                                                                           | —                                     |
| Fri 20 Nov 9:30am     | 5-minute live pitch at the Westpac Gold Coast Engineering Hub (if shortlisted)             | Both                                  |

## Build Order (units — each gets a spec in `context/specs/`)

1. **01 App shell and tokens**
   - Tokens and fonts in `globals.css` and `layout.tsx`.
   - Routes `/`, `/protect`, `/ops`, `/demo`, `/shop/[productId]` with static
     placeholder data.
   - Phone frame, tab bar, `components/ui` primitives.
2. **02 Database and state API**
   - Supabase project.
   - Migration: tables, CHECK constraints, RLS, `complete_action()`,
     `reset_demo()` with the full seed.
   - `lib/db.ts`, `lib/http.ts`, `lib/audit.ts`, `lib/money.ts`.
   - `GET /api/customer/state`, `POST /api/demo/reset`.
   - Home shows live balances.
3. **03 Trust engine (pure)**
   - `policy.ts`, `provenance.ts`, `content-scanner.ts`, `hash.ts`, plus
     `node --test` tests and the `npm test` script.
4. **04 Actions and Trust Receipt**
   - `prepareTransfer` and `preparePurchase` services.
   - Approve and cancel routes with PIN, hash and expiry checks.
   - `TrustReceipt` and `PinDialog`.
   - Verify with a temporary dev-only trigger, removed in 05.
5. **05 AI assistant**
   - `deepseek.ts`, tools with Zod, the agent loop, prompts, the fallback
     parser, `/api/chat` and the chat UI.
   - Done when golden-path Act 1 passes.
6. **06 Shop and agent hijack**
   - Catalogue, `/shop/aurora-anc` with the hidden instruction,
     `view_product`, `prepare_purchase`, `ShieldCard`.
   - `injection_blocked` incident and `/api/demo/compromised-agent`.
   - Done when Act 2 passes.
7. **07 Fraud engine**
   - `rules.ts` with tests, `process-authorization.ts` and the simulate route.
   - Notifications, `AlertBanner`, the respond route.
   - Done when Act 3 steps 10–11 pass.
8. **08 Emergency protection and RAG**
   - `report_account_compromise`, `emergency.ts`, knowledge docs,
     `search_safety_guide`, the Protect tab.
   - Done when Act 3 steps 12–16 pass.
9. **09 Bank console**
   - `/api/ops/state`, the event and incident lists, the AI case brief with
     template fallback, the review and resolve routes, the audit log.
   - Done when Act 4 passes.
10. **10 Demo harness and deploy**
    - `/demo` split view and control panel.
    - Vercel production deploy with env vars, `syd1` region.
11. **11 Rehearsal and polish**
    - Run every evaluation case and fix failures.
    - Copy pass, motion pass, empty and error states.
    - Run once with the LLM offline.
12. **12 Stretch (only if 11 is done)**
    - Scam message checker, then the scam-coaching detector.

## Completed

- Product scope finalised. Context files created: `project-overview.md`,
  `architecture.md`, `ui-context.md`, `code-standards.md`,
  `ai-workflow-rules.md`, `progress-tracker.md`.

## In Progress

- None yet.

## Next Up

- Developer reviews the context files.
- Write `context/specs/00-build-plan.md` (expanding the build order above
  with dependencies and per-unit "done").
- Write `context/specs/01-app-shell.md` and start Unit 01.

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
  4.3). Work is happening in the worktree branch
  `claude/trustpath-financial-assistant-fb2141`.
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
