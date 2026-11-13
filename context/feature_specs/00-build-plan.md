# 00 — Build Plan

The whole of TrustPath, broken into small units that each build on the one
before. Each unit gets its own spec file in this folder, written **just before**
it is built, so it can use what the earlier units actually produced.

Status (done / in progress / next) is tracked in **one place only**:
`context/progress-tracker.md`. This file holds what each unit is and when it
counts as done.

## The Loop (repeat for every unit)

1. **Write the spec.** Create `context/feature_specs/NN-name.md` from the
   template below. Fill "Clarify before building" with every question whose
   answer changes what the customer or judge sees.
2. **Clarify.** The developer answers the questions or approves the spec.
   Write the answers into the spec. Decisions that change architecture, scope
   or standards also go into the matching context file.
3. **Build.** Implement exactly what the spec says, no more and no less.
4. **Verify.** Every "Verify when done" item passes, plus the general checks
   in `ai-workflow-rules.md` → Verification Before Moving On.
5. **Record.** Tick the unit in `progress-tracker.md`, move it to Completed,
   and note any decisions. Add a short "Built" note at the end of the spec:
   what was built and how it differs from the plan.
6. **Push and merge.** Each unit is built on its own branch
   `unit/NN-name`, cut from an up-to-date `main`. When the unit is verified:
   commit, push the branch, then merge it into `main` with
   `git merge --no-ff` and push `main`. Every unit is then one merge commit
   on `main`, so `git log --first-parent main` reads as the unit list, and a
   unit that breaks the app can be found and reverted on its own
   (`git revert -m 1 <merge>`).
7. **Next.** Write the spec for the next unit and go back to step 1.

## Spec Template

```markdown
# NN — Unit name

Status: draft | approved | done

## Goal
One or two sentences: what works after this unit that didn't before.

## Depends on
Earlier units this one builds on.

## Golden-path steps unlocked
Step numbers from project-overview.md, or "none (foundation)".

## Build
- Concrete list of files, functions, routes and components.

## Not in this unit
- Things that are tempting but belong to a later unit.

## Clarify before building
- Questions for the developer, each with a proposed default answer.

## Verify when done
- [ ] Checks that prove the unit works, run by hand or with `npm test`.

## Built (filled in after completion)
- What was built and how it differs from the plan.
```

## Units

Unit numbers are build order. A unit can start only when the units it depends
on are done. "Act" and "step" refer to the golden path in
`project-overview.md`.

### Phase A — Foundation (target Sat 14 Nov)

| #  | Unit                         | Builds                                                                                                                                       | Depends on | Done when                                                                                  |
| -- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------ |
| 01 | App shell and design tokens  | Tokens and fonts, `components/ui` primitives, `Logo`, phone frame, tab bar, placeholder routes `/`, `/protect`, `/ops`, `/demo`, `/shop/[productId]`, `lib/money.ts` | —          | Every route renders with static data in the right layout and colours                      |
| 02 | Database schema and seed     | `supabase/migrations/0001_init.sql`: tables, CHECKs, RLS with no policies, `complete_action()`, `reset_demo()` with the full persona seed    | —          | Migration applied in Supabase; `select reset_demo()` produces the persona rows            |
| 03 | Server foundations and state API | `lib/db.ts`, `lib/http.ts`, `lib/audit.ts`, `lib/banking/constants.ts`, `.env.example`; `GET /api/customer/state`, `POST /api/demo/reset` (demo key) | 02         | `curl` returns live accounts; reset works and rejects a missing key                       |
| 04 | Live balances on Home        | Home becomes a client component polling `/api/customer/state` every 2 s; `AccountSummary`                                                     | 01, 03     | Golden-path **step 1**: Home shows $1,500.00 and $4,200.00 from the DB                    |
| 05 | Trust engine (pure)          | `lib/trust/policy.ts`, `provenance.ts`, `content-scanner.ts`, `hash.ts` with `*.test.ts`; `npm test` script                                    | —          | `npm test` passes: every rule R1–R7, word-numbers, scanner hits and misses, stable hash    |
| 06 | Prepare transfer service     | `lib/banking/actions.ts` → `prepareTransfer()` (resolve recipient, assess, hash, store, audit); R2 block creates an `injection_blocked` incident (`lib/protect/incidents.ts`) | 03, 05     | Calling it from a script creates `pending_approval`, `held` and `blocked` rows as expected |
| 07 | Approve and cancel routes    | `approveAction()`, `cancelAction()`; `POST /api/actions/[id]/approve` (PIN, hash, expiry → `complete_action()`), `POST /api/actions/[id]/cancel` | 06         | Approve moves money once; second approve, wrong PIN, altered hash and expired all fail    |
| 08 | Trust Receipt and PIN dialog | `TrustReceipt` (all six states), `PinDialog` on native `<dialog>`, `Dialog` primitive; a temporary dev-only trigger to prepare a transfer     | 04, 07     | Receipt approved through the PIN dialog updates the balances on Home                      |

### Phase B — The assistant (target Sun 15 Nov)

| #  | Unit                         | Builds                                                                                                                       | Depends on | Done when                                                                                    |
| -- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| 09 | DeepSeek client and agent loop | `lib/ai/deepseek.ts`, `tools.ts` (read tools + `prepare_transfer`), `prompts.ts`, `agent.ts` (max 4 rounds); `POST /api/chat` | 06         | `curl` with the payday message returns a reply plus two receipt cards                       |
| 10 | Offline fallback parser      | `lib/ai/fallback.ts`; agent falls back when the key is missing, the call fails or it times out; `offline` flag in the response | 09         | With `DEEPSEEK_API_KEY` unset, the payday message still returns two receipt cards            |
| 11 | Chat UI                      | `ChatThread`, `ChatInput`, suggestion chips, cards inline, "offline assistant" badge, last 12 messages sent; remove the dev trigger from 08 | 08, 10     | **Act 1 (steps 1–4)** passes in the browser, online and offline                              |
| 12 | First Vercel deploy          | Vercel project, env vars, `syd1` region                                                                                       | 11         | Act 1 passes on the public URL                                                               |
| 13 | Mock merchant page           | `lib/shop/products.ts` catalogue; `/shop/aurora-anc` in neutral styling with the hidden instruction in an HTML comment and a visually hidden element | 01         | The page renders like a third-party shop; "view source" shows the instruction               |
| 14 | Product reading and shield card | `view_product` tool: catalogue lookup → content scanner → `<untrusted_content>` wrap; `ShieldCard`; scanner hit creates an `injection_blocked` incident (medium, contained) | 11, 13     | **Step 6**: the shield card appears and the incident row exists                              |
| 15 | Purchase flow                | `preparePurchase()` (catalogue price, card check R4), `prepare_purchase` tool, purchase variant of `TrustReceipt`, fallback lines for Act 2 | 14         | **Steps 5–7** pass: approve the $129 purchase, Everyday drops to $951.00                    |
| 16 | Simulated compromised agent  | `POST /api/demo/compromised-agent` (demo key) sends the $500 J. Smith transfer through `prepareTransfer()` with `origin: 'simulated_compromised_agent'` | 06         | Returns a blocked action (R2) and creates an `injection_blocked` incident (high)            |
| 17 | Fraud rules (pure)           | `lib/fraud/rules.ts` signals and decision matrix, `rules.test.ts`                                                             | —          | `npm test` covers every decision path                                                        |
| 18 | Card authorisation pipeline  | `lib/fraud/process-authorization.ts`; `POST /api/simulate/card-authorization` (demo key) → card event, card lock, incident, notification, audit | 03, 17     | $3,580 Nova attempt is declined and the card temporarily locked; $14.50 Metro Café is approved |

### Phase C — Protection and the bank side (target Mon 16 Nov)

| #  | Unit                         | Builds                                                                                                                       | Depends on | Done when                                                                                    |
| -- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| 19 | "Was this you?" alert        | Notifications in `/api/customer/state`; `AlertBanner`; `POST /api/notifications/[id]/respond`; "No, it wasn't me" opens the chat with context | 11, 18     | **Steps 10–12 (first half)**: alert appears within 2 s, deny keeps the card locked           |
| 20 | Emergency protection         | `lib/protect/emergency.ts` `activate()`; `report_account_compromise` tool; `EmergencyCard`; fallback line                    | 11, 19     | **Steps 12–13 and 16**: every measure applied; "Send $50 to Mum" is then blocked by R1      |
| 21 | Safety knowledge base (RAG)  | `lib/ai/knowledge.ts` (5 docs, keyword top 2), `search_safety_guide` tool                                                    | 09         | **Step 14** guidance appears; "Why was my payment blocked?" cites the stored reason and a doc |
| 22 | Protect tab                  | `SecurityStatus` hero, card list with lock state, restrictions, incidents with case status                                   | 04, 20     | **Step 15**: status matches the DB in normal and emergency mode                              |
| 23 | Bank console lists           | `GET /api/ops/state`; `CardEventList`, `IncidentList`, `AuditLog`, stat pills, 2 s polling, fade-in highlight                | 18, 20     | **Steps 8 and 11** visible in `/ops`; a new event appears within 3 s                         |
| 24 | AI case brief                | `lib/ai/case-brief.ts` (JSON mode, template fallback), written after fraud and emergency decisions; `IncidentDetail`        | 23         | **Step 17**: brief shows what happened, the related event, measures and a next step; offline uses the template |
| 25 | Staff review and resolve     | `POST /api/ops/incidents/[id]/review`, `POST /api/ops/incidents/[id]/resolve` (lift restrictions, unlock cards)             | 24         | **Step 18 / Act 4** passes; the AI has no path to the same effect                            |
| 26 | Demo harness                 | `/demo` three columns: customer iframe, ops iframe, control panel with demo key and the four buttons                        | 16, 18, 25 | **Step 19**: Reset demo restores seed state in under 3 s; full golden path runs from `/demo` |

### Phase D — Rehearsal (Mon 16 evening → Tue 17 Nov 12:00pm freeze)

| #  | Unit                         | Builds                                                                                       | Depends on | Done when                                                                       |
| -- | ---------------------------- | -------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| 27 | Rehearsal and polish         | Run every evaluation case; fix failures; copy, motion, empty and error states; one offline run; final production deploy | 26         | All evaluation cases pass; golden path in one take under 5 min on the public URL |

### Stretch (only after 27 is done)

| #  | Unit                         | Builds                                                                             | Depends on |
| -- | ---------------------------- | ---------------------------------------------------------------------------------- | ---------- |
| 28 | Scam message checker         | Protect tab: paste an SMS or email → verdict plus indicators (never "proven")      | 27         |
| 29 | Scam-coaching detector       | "Move money to a safe account" phrases put a cooling-off hold on the payment       | 27         |

## Why Units Are Split This Way

The split follows `ai-workflow-rules.md` → When to Split Work:

- The DB migration (02) is separate from the UI that reads it (04).
- Pure rules (05, 17) are separate from the services that call them (06, 18),
  so the tests land before any I/O.
- AI prompt and tool work (09, 14, 20, 21) is separate from trust-engine rule
  work (05).
- Security-sensitive routes (07 approve, 25 resolve) each get their own unit.
- Unit 08 has a temporary dev trigger so the receipt can be tested before the
  chat exists. Unit 11 removes it.
