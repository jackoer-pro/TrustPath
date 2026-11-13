# Architecture Context

## Stack

| Layer          | Technology                                           | Role                                                                     |
| -------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| Framework      | Next.js 16.4 (App Router) + React 19.3 + TypeScript  | Pages, route handlers (the backend), server-only services                |
| Styling        | Tailwind CSS 4.3 (via `@tailwindcss/turbopack`)      | All styling; tokens defined in `app/globals.css` (see ui-context.md)     |
| Icons          | `lucide-react`                                       | All icons                                                                |
| Database       | Supabase Postgres via `@supabase/supabase-js`        | Accounts, payees, cards, actions, card events, incidents, audit log      |
| Validation     | `zod`                                                | API request bodies, LLM tool arguments, LLM JSON outputs                 |
| LLM            | DeepSeek API (`deepseek-flash`), OpenAI-compatible   | Intent understanding, tool calling, replies, case briefs                 |
| Tests          | Node built-in test runner (`node --test`, Node 26)   | Pure trust, provenance, scanner and fraud-rule logic                     |
| Hosting        | Vercel (function region `syd1`)                      | Public demo URL                                                          |
| DB hosting     | Supabase project in `ap-southeast-2` (Sydney)        | Low latency to Vercel `syd1`                                             |

No other runtime dependencies. In particular:

- No shadcn/ui. Use a native `<dialog>` and our own small components.
- No OpenAI SDK. DeepSeek is called with `fetch`.
- No state library. Use React state plus polling.
- No Supabase Auth.

## High-Level Flow

```
Customer chat ──► POST /api/chat ──► lib/ai/agent (DeepSeek tool loop, max 4 rounds)
                                        │  read tools ─► lib/banking (DB reads)
                                        │  untrusted tool output ─► lib/trust/content-scanner
                                        │  prepare tools ─► lib/banking/actions.prepare()
                                        │                    └► lib/trust/policy.assess()  (deterministic)
                                        ▼
                         reply + cards (Trust Receipts, shield, emergency)
Customer taps Approve ─► PIN modal ─► POST /api/actions/[id]/approve
                                        └► verify PIN + payload hash ─► DB fn complete_action() (atomic, single-use)

Payment network (simulated) ─► POST /api/simulate/card-authorization
                                        └► lib/fraud/rules.assess() (deterministic, no AI)
                                           ─► card_event, card lock, incident, notification, audit
                                           ─► (after decision) AI case brief, template fallback

Customer app  ─ polls every 2s ─► GET /api/customer/state
Bank console  ─ polls every 2s ─► GET /api/ops/state
```

The AI layer can only **read** and **prepare**. Only the approve route can move
money, and only bank staff routes can lift restrictions.

## System Boundaries

- `app/(customer)/` — Customer phone app. `page.tsx` is Home (accounts and
  chat); `protect/page.tsx` is the Protect tab. Client components fetch from
  `/api/customer/*`.
- `app/ops/` — Bank operations console (desktop): live card events,
  incidents, audit log.
- `app/demo/` — Filming harness: iframes of `/` and `/ops`, plus the control
  panel.
- `app/shop/[productId]/` — Mock merchant product page, including the hidden
  injection text in its markup.
- `app/api/` — Route handlers only. Each one parses input with Zod, calls one
  service function in `lib/` and returns the standard response shape. No
  business rules live here.
- `lib/db.ts` — The only place a Supabase client is created (`server-only`,
  secret key).
- `lib/banking/` — Accounts, payees, transactions and pending actions:
  `prepareTransfer`, `preparePurchase`, `approveAction`, `cancelAction`.
- `lib/trust/` — **Pure** deterministic modules, with no DB and no framework
  imports:
  - `policy.ts` — risk rules
  - `provenance.ts` — intent provenance and word-number parsing
  - `content-scanner.ts` — hidden-instruction detection
  - `hash.ts` — canonical action payload hash
  
  Each has a `*.test.ts`.
- `lib/fraud/` — `rules.ts` is pure fraud signals and the decision matrix
  (with tests). `process-authorization.ts` loads card context, calls the
  rules and writes the results.
- `lib/protect/` — `emergency.ts` (activate emergency protection),
  `incidents.ts` (create, review, resolve), `notifications.ts`.
- `lib/ai/` — `deepseek.ts` (fetch client), `agent.ts` (tool loop),
  `tools.ts` (tool schemas, Zod arg schemas, handlers), `prompts.ts`,
  `fallback.ts` (rule-based parser), `knowledge.ts` (RAG docs and keyword
  retrieval), `case-brief.ts`.
- `lib/shop/products.ts` — Static mock merchant catalogue. It is the source of
  truth for prices.
- `lib/audit.ts` — `audit(actor, action, entity, details)`, the single way to
  write audit rows.
- `lib/money.ts` — Cents helpers and the AUD formatter.
- `lib/http.ts` — `ok()`, `fail()`, `run()` and `AppError`: the standard
  response shape.
- `components/ui/` — Primitives: Button, Badge, Card, Dialog wrapper,
  RiskBadge, Money.
- `components/customer/` — ChatThread, ChatInput, TrustReceipt, ShieldCard,
  EmergencyCard, AlertBanner, AccountSummary, SecurityStatus.
- `components/ops/` — CardEventList, IncidentList, IncidentDetail, AuditLog.
- `supabase/migrations/` — SQL schema, constraints, RLS, `complete_action()`
  and `reset_demo()`. Apply it in the Supabase SQL editor.
- `context/` — These context files and `specs/`.

## Storage Model

All money is stored as **integer cents** (`bigint`), in AUD only.

| Table             | Key fields                                                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`        | `id`, `name`, `default_account_id`, `outgoing_paused bool`, `new_payees_blocked bool`, `emergency_since timestamptz null`                          |
| `accounts`        | `id`, `profile_id`, `name`, `kind ('everyday'\|'savings')`, `aliases text[]`, `bsb`, `number`, `balance_cents bigint CHECK (balance_cents >= 0)`    |
| `payees`          | `id`, `profile_id`, `name`, `aliases text[]`, `kind ('person'\|'biller')`, `reference`, `verified bool`                                             |
| `cards`           | `id`, `profile_id`, `account_id`, `last_four`, `status ('active'\|'temporarily_locked'\|'locked')`, `reported_lost bool`                           |
| `transactions`    | `id`, `account_id`, `amount_cents` (signed), `description`, `counterparty`, `kind ('salary'\|'transfer'\|'payment'\|'purchase'\|'card')`, `created_at` |
| `pending_actions` | see "Customer actions" below                                                                                                                        |
| `card_events`     | `id`, `card_id`, `merchant`, `amount_cents`, `channel ('ecommerce'\|'in_store')`, `new_merchant bool`, `decision`, `risk_level`, `reasons jsonb`, `card_action`, `created_at` |
| `incidents`       | `id`, `profile_id`, `type ('card_fraud'\|'account_compromise'\|'injection_blocked')`, `severity`, `status ('open'\|'contained'\|'investigated')`, `title`, `description`, `card_event_id null`, `action_id null`, `measures jsonb`, `ai_brief text null`, `reviewed_by null`, `reviewed_at null`, `created_at` |
| `notifications`   | `id`, `profile_id`, `kind`, `title`, `body`, `card_event_id null`, `response ('confirmed'\|'denied' null)`, `created_at`                            |
| `audit_logs`      | `id`, `actor ('customer'\|'ai_agent'\|'trust_engine'\|'fraud_engine'\|'bank_staff'\|'system')`, `action`, `entity_type`, `entity_id`, `details jsonb`, `created_at` |

Notes:

- **One incident = one case.** The blueprint's `security_incidents` and
  `support_cases` are merged into `incidents`, since every incident has
  exactly one case.
- **Not in the DB:**
  - The product catalogue is in `lib/shop/products.ts`.
  - Safety knowledge docs are in `lib/ai/knowledge.ts`.
  - Chat history lives in client state and is sent with each `/api/chat`
    request (last 12 messages).
- **Seed data** lives inside the SQL function `reset_demo()`, which truncates
  every table and re-inserts the persona from project-overview.md.
  `POST /api/demo/reset` calls it through `supabase.rpc('reset_demo')`.
- **Card history** is about 15 seeded **approved** `card_events` rows. The
  fraud rules need them for the average amount and for known merchants.
- **Approved simulated card events never change balances.** Settlement is out
  of scope. This keeps invariant 2 intact.
- **The demo customer** is the single row in `profiles`. Its id is the constant
  `DEMO_PROFILE_ID` in `lib/banking/constants.ts`, and the same literal UUID is
  used in the seed.

### Customer actions (`pending_actions`) and state machine

Fields:

- `id`, `profile_id`, `type ('transfer'|'purchase')`
- `from_account_id`
- `to_account_id null`, `payee_id null`, `merchant null`, `product_id null`
- `amount_cents`, `description`
- `payload_hash`, `status`, `risk_level`, `reasons jsonb`
- `origin ('customer'|'simulated_compromised_agent')`
- `created_at`, `expires_at` (+10 min), `completed_at`

```
prepare() ─► policy.assess()
              ├─ allow/step_up ─► pending_approval ─► completed   (approve: PIN ok + hash ok + not expired)
              │                                   ├─► cancelled   (customer cancels, or emergency mode)
              │                                   └─► expired     (read-time: expires_at < now)
              ├─ hold ─────────► held       (terminal in the demo; visible to staff)
              └─ block ────────► blocked    (terminal; reasons shown to customer)
```

The blueprint's Draft → Validated steps happen inside `prepare()` in a single
request, so they are not stored.

### Card authorisation state machine

```
received ─► assessed ─► approved | declined | review
```

The event is stored once, after assessment, with `decision` and
`card_action ('none'|'temporarily_locked')`.

### Database functions (in the migration)

- **`complete_action(p_action_id uuid, p_payload_hash text)`** runs in one
  transaction:
  1. `UPDATE pending_actions SET status='completed' WHERE id=… AND
     status='pending_approval' AND payload_hash=… AND expires_at > now()`.
     If no row matches, it raises `ACTION_NOT_APPROVABLE`.
  2. Debits `from_account`; the `CHECK` constraint raises on overdraft.
  3. Credits `to_account` for internal transfers.
  4. Inserts the transaction rows and returns the action.

  This function is the **only** code path that changes balances.
- **`reset_demo()`** truncates all tables and re-seeds them.

## Auth and Access Model

- **Customer:** there is a single demo customer and no login (out of scope).
  Customer authorisation for money movement is **simulated device
  verification**: a PIN modal checked server-side against `DEMO_PIN`, labelled
  in the UI as "Simulated device check — production would use passkeys". The
  PIN is checked on every approval and never stored client-side.
- **Bank staff:** `/ops` is open in the demo, and actions are recorded with
  actor `bank_staff` and `reviewed_by: 'demo-specialist'`. Only staff routes
  can unlock cards or lift emergency restrictions.
- **Demo operator:** these routes require the header `x-demo-key` to equal
  `DEMO_ADMIN_KEY`:
  - `/api/demo/*`
  - `/api/simulate/card-authorization`

  The `/demo` panel asks for the key once and keeps it in `sessionStorage`.
- **Database:** the browser **never** talks to Supabase. RLS is enabled on
  every table with **no policies**, so the anon and authenticated roles get
  nothing. The server uses the secret key, which bypasses RLS.

## AI Model

- **Provider:** DeepSeek, OpenAI-compatible endpoint
  `https://api.deepseek.com/chat/completions` with header
  `Authorization: Bearer ${DEEPSEEK_API_KEY}`.
  - Model: `DEEPSEEK_MODEL` env var, default `deepseek-flash`.
  - Thinking off: `"thinking": {"type": "disabled"}`.
  - Timeout: 20 s.
  - The legacy `deepseek-chat` is discontinued; don't use it.
- **Agent loop** (`lib/ai/agent.ts`):
  1. Send the system prompt, the history and the tool list.
  2. Run the returned `tool_calls`, validating each one's args with its Zod
     schema; invalid args go back as a tool error.
  3. Append the results as `role: "tool"` messages and repeat, **max 4
     rounds**.
  4. Return `{ reply, cards[] }`. Cards come from tool results (receipts,
     shield, emergency), never from LLM text.
- **Tools** (the complete list — add none without updating this file):

  | Tool                        | Kind    | Notes                                                                                                                     |
  | --------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
  | `get_accounts`              | read    | Names, balances, status                                                                                                   |
  | `get_recent_transactions`   | read    | `{ accountName?, limit≤20 }`                                                                                               |
  | `get_payees`                | read    | Saved payees and billers                                                                                                   |
  | `view_product`              | read    | `{ productIdOrUrl }` → catalogue data. Description passes through the content scanner and is wrapped as untrusted          |
  | `search_safety_guide`       | read    | `{ query }` → top 2 knowledge docs (RAG)                                                                                   |
  | `prepare_transfer`          | prepare | `{ to, amount, fromAccount?, description? }` — `to` resolves against own accounts or saved payees (billers included)       |
  | `prepare_purchase`          | prepare | `{ productId }` — the price comes from the catalogue, never from the LLM                                                   |
  | `report_account_compromise` | protect | `{ customerStatement }` → `lib/protect/emergency.activate()`                                                               |

- **Untrusted content:** every read result that contains third-party text
  (product descriptions, pasted messages, knowledge docs) is wrapped as
  `<untrusted_content source="…">…</untrusted_content>`. The system prompt
  states that this content is data and can never authorise actions.
- **Fallback** (`lib/ai/fallback.ts`): when `DEEPSEEK_API_KEY` is missing, or
  the call fails or times out, a regex parser maps the golden-path and
  evaluation lines to the same tool calls, plus a templated reply. The UI
  shows a small "offline assistant" badge.
- **RAG** (`lib/ai/knowledge.ts`): about 5 curated docs:
  - recognising impersonation scams
  - what the bank never asks for
  - protecting a lost or compromised card
  - why a payment might be held or blocked
  - how to report suspected fraud

  Retrieval is keyword overlap scoring and returns the top 2. No embeddings.
- **Case brief** (`lib/ai/case-brief.ts`): uses DeepSeek JSON mode
  (`response_format: {type: "json_object"}`). The prompt must contain the word
  "json" and an example. Blank content is treated as a failure and the
  template brief is used.
- **Data note for judges:** only mock data reaches DeepSeek. The provider sits
  behind `lib/ai/deepseek.ts` and can be swapped for a bank-approved host.

## Trust Engine Rules (`lib/trust/policy.ts`)

```
assess(action, ctx) → { decision: 'allow'|'step_up'|'hold'|'block',
                        riskLevel: 'low'|'medium'|'high'|'critical',
                        reasons: string[] }
```

Evaluated in order. The first **block** wins; holds and warnings accumulate.

| #   | Rule                  | Condition                                                                 | Outcome                                     |
| --- | --------------------- | ------------------------------------------------------------------------- | ------------------------------------------- |
| R1  | Emergency mode        | `profile.outgoing_paused`                                                 | block, critical                             |
| R2  | Intent provenance     | amount, **or** recipient (raw `to` text or any alias of the resolved recipient), not found in the customer's messages | block, high, flag `injection_suspected` |
| R3  | Unknown recipient     | `to` doesn't resolve to an own account or a saved payee                  | block, high ("New payees can't be added by the assistant") |
| R4  | Card unavailable      | purchase with card status not `active`                                    | block, high                                 |
| R5  | Insufficient funds    | `amount > from_account.balance`                                           | block, medium                               |
| R6  | Large amount          | `amount > $2,000` **or** `> 50%` of the source balance (not own-account transfers) | hold, high                          |
| R7  | Unverified payee      | `payee.verified = false`                                                  | step_up, medium (warning on receipt)        |
| —   | Otherwise             | —                                                                         | step_up, low (every action needs approval)  |

**Intent provenance** (`provenance.ts`) checks the **last 3 user-role
messages** in the current request, which are the customer's own words.

The window exists so that "Send Mum some money" → "How much?" → "$200" still
matches. It also stops a number from much earlier in the chat being reused.
Mark this with `ponytail:`; the upgrade path is tracking provenance per
pending intent. They are lower-cased, and number
words are converted ("two hundred" → 200). The amount matches `$300`, `300`,
`300.00` or `1,500`.

The recipient matches if any alias of the resolved account or payee appears,
or if the raw `to` text appears. For example, "a new recipient" passes R2 and
is then blocked by R3. Both the amount and the recipient must match; either
one missing fails R2. That's why the hijacked "$500 to J. Smith" fails.

For purchases, the message must contain the product's URL, id or name, and the
amount is the catalogue price. Actions with `origin:
'simulated_compromised_agent'` have no matching customer words by
construction.

**Injection incidents.** Each of these creates one `injection_blocked`
incident plus an audit row, so the bank console shows it (golden path step 8):

- The content scanner flags text in a `view_product` result → severity medium,
  status `contained`.
- R2 blocks an action → severity high, linked to the blocked action.

**Payload hash** (`hash.ts`): SHA-256 (`node:crypto`) of canonical JSON
containing:

- `actionId`, `type`, `fromAccountId`
- `toAccountId|payeeId|productId`
- `amountCents`, `currency: 'AUD'`

It's computed in `prepare()` and stored on the action. It's sent to the client
in the receipt card and must come back unchanged on approve.

## Fraud Rules (`lib/fraud/rules.ts`)

Signals:

| Signal                        | Condition                                                                      | Level    |
| ----------------------------- | ------------------------------------------------------------------------------ | -------- |
| Card locked / reported lost   | `status != 'active'` or `reported_lost`                                        | critical |
| Unusual amount                | `amount > max(10 × avg of last 20 approved card events, $500)`                 | high     |
| Rapid repeats                 | ≥ 3 attempts on the card in 10 minutes                                         | high     |
| New merchant                  | merchant not in the card's history                                             | medium   |
| Card-not-present              | `channel = 'ecommerce'` **and** new merchant                                   | medium   |

Decision matrix:

- any critical → **declined**, `card_action: 'none'` (already locked)
- high + any other signal → **declined**, `card_action: 'temporarily_locked'`
- high alone → **review** (approve nothing; notify the customer)
- medium only → **approved**, reasons recorded
- no signals → **approved**

Every non-approved decision creates:

- an incident (`card_fraud`)
- a notification with "Was this you?"
- an audit row

**Customer response to "Was this you?"** (`POST /api/notifications/[id]/respond`):

- **`denied`:**
  - The card goes from `temporarily_locked` to `locked` and the incident is
    raised to high.
  - The client then adds an assistant message to the chat: "Thanks for
    telling us. I've kept your card locked. Did anything else happen, like
    someone asking for a code?"
  - Emergency protection itself is triggered by the customer's next chat
    message (step 12), not by this route.
- **`confirmed`:**
  - The response is recorded and the incident gets the note "customer
    confirmed".
  - The card **stays locked until staff review**, because only bank staff
    unlock cards (invariant 8). This path isn't part of the demo.

## Emergency Protection (`lib/protect/emergency.ts`)

`activate(profileId, statement)` does all of the following and returns the
list of measures:

- Sets `outgoing_paused = true`, `new_payees_blocked = true` and
  `emergency_since = now()`.
- Sets every card to `locked`.
- Cancels every `pending_approval` action.
- Creates or escalates an `account_compromise` incident (critical, status
  `contained`) and links any open `card_fraud` incident.
- Writes audit rows and generates the case brief.

**Lifting restrictions** is only possible through
`POST /api/ops/incidents/[id]/resolve` (actor `bank_staff`).

## API Routes

| Route                                   | Method | Purpose                                                    |
| --------------------------------------- | ------ | ---------------------------------------------------------- |
| `/api/chat`                             | POST   | `{ messages }` → `{ reply, cards, offline }`               |
| `/api/customer/state`                   | GET    | Accounts, cards, security status, pending actions, notifications, open incidents |
| `/api/actions/[id]/approve`             | POST   | `{ pin, payloadHash }` → completed action or error         |
| `/api/actions/[id]/cancel`              | POST   | Cancel a pending action                                    |
| `/api/notifications/[id]/respond`       | POST   | `{ response: 'confirmed'\|'denied' }`                      |
| `/api/simulate/card-authorization`      | POST   | Demo key. `{ cardId, amount, merchant, channel }` → decision |
| `/api/demo/reset`                       | POST   | Demo key. Calls `reset_demo()`                             |
| `/api/demo/compromised-agent`           | POST   | Demo key. Sends the hijacked $500 transfer through `prepare()` with `origin: 'simulated_compromised_agent'` |
| `/api/ops/state`                        | GET    | Card events, incidents, audit log (latest 50)              |
| `/api/ops/incidents/[id]/review`        | POST   | Mark investigated                                          |
| `/api/ops/incidents/[id]/resolve`       | POST   | Lift restrictions, unlock cards (bank staff only)          |

The response shape is always `{ ok: true, data }` or
`{ ok: false, error: { code, message } }`.

## Environment Variables

| Name                  | Where        | Notes                                              |
| --------------------- | ------------ | -------------------------------------------------- |
| `DEEPSEEK_API_KEY`    | server only  | Missing → fallback parser                          |
| `DEEPSEEK_MODEL`      | server only  | Default `deepseek-flash`                           |
| `SUPABASE_URL`        | server only  | Project URL                                        |
| `SUPABASE_SECRET_KEY` | server only  | `sb_secret_…` (or the legacy service_role key)     |
| `DEMO_PIN`            | server only  | Default `1234`                                     |
| `DEMO_ADMIN_KEY`      | server only  | Protects the demo and simulate routes              |

None of these has the `NEXT_PUBLIC_` prefix. Commit `.env.example`, and add
`!.env.example` to `.gitignore`, which currently ignores `.env*`.

## Invariants

1. **The LLM never executes.** AI tools can only read, prepare or trigger
   emergency protection (which only restricts). No tool approves, executes,
   unlocks, lifts restrictions or changes rules.
2. **Money moves only through `complete_action()`**, and only via
   `POST /api/actions/[id]/approve` after a PIN check and a payload-hash match.
   No other code updates `balance_cents`.
3. **Approvals are single-use and bound to the payload.** Approving the same
   action twice, approving an altered payload, or approving after expiry
   fails.
4. **Deterministic engines decide.** The trust policy and fraud rules are pure
   functions. LLM output enters them only as candidate parameters, after Zod
   validation, and can never change a verdict.
5. **Intent provenance is enforced server-side** for every prepared action.
   Amounts for purchases come from the catalogue, never from the LLM.
6. **Untrusted content is data.** Merchant pages, pasted messages and
   knowledge docs are wrapped and scanned, and never grant permissions.
7. **The fraud pathway is independent of chat.** `lib/fraud` never imports
   `lib/ai`. The decision is final before any AI case brief is written, and a
   brief failure never changes the decision.
8. **Only bank staff routes lift restrictions or unlock cards.**
9. **Every state change writes an audit row** through `lib/audit.ts` in the
   same request.
10. **Secrets stay server-side.** No `NEXT_PUBLIC_` secrets, and the browser
    never calls Supabase or DeepSeek directly. `lib/db.ts` and `lib/ai/*`
    import `server-only`, which Next 16 handles without installing a package.
11. **Simulated means labelled.** Device checks, card events and merchant
    checkout say "simulated" in the UI. Mock data only; no real customer data
    anywhere.
