# 02 — Database schema and seed

Status: done

## Goal

The Supabase database holds the whole data model, with the money rules
enforced by Postgres itself. One call to `reset_demo()` restores the demo
persona exactly.

## Depends on

Nothing in code. Needs a Supabase project in `ap-southeast-2` (Sydney).

## Golden-path steps unlocked

None directly. Step 19 (reset) and step 4 (money moves) rely on the two
functions built here.

## Build

One file: `supabase/migrations/0001_init.sql`, pasted into the Supabase SQL
editor. No app code changes in this unit.

**Tables** (columns exactly as in `architecture.md` → Storage Model):

- `profiles`, `accounts`, `payees`, `cards`, `transactions`,
  `pending_actions`, `card_events`, `incidents`, `notifications`,
  `audit_logs`.
- `id uuid primary key default gen_random_uuid()` and
  `created_at timestamptz not null default now()` where listed.
- Foreign keys between them (`accounts.profile_id → profiles`,
  `cards.account_id → accounts`, `incidents.card_event_id → card_events`, …).
  `profiles.default_account_id` is added after `accounts` exists.
- Every enum-like column is `text` with a `CHECK (… in (…))` matching the
  architecture lists. That follows the no-`enum` rule and keeps the values
  readable.
- Money columns are `bigint`. `accounts.balance_cents` has
  `CHECK (balance_cents >= 0)` and `pending_actions.amount_cents` has
  `CHECK (amount_cents > 0)`.
- `pending_actions.expires_at` defaults to `now() + interval '10 minutes'`.
- `pending_actions` has a `CHECK` that a `transfer` has exactly one of
  `to_account_id` or `payee_id`, and a `purchase` has `merchant` and
  `product_id`.

**Security**

- `alter table … enable row level security` on every table, with **no
  policies**.
- `revoke execute on function complete_action, reset_demo from public, anon,
  authenticated`, so only the server's secret key can call them.

**`complete_action(p_action_id uuid, p_payload_hash text) returns pending_actions`**

Runs as one transaction, as described in `architecture.md` → Database
functions:

1. `UPDATE pending_actions SET status = 'completed', completed_at = now()
   WHERE id = p_action_id AND status = 'pending_approval' AND payload_hash =
   p_payload_hash AND expires_at > now() RETURNING *`. No row → `raise
   exception 'ACTION_NOT_APPROVABLE'`.
2. Debit `from_account_id`. The CHECK raises on overdraft, which rolls the
   whole thing back.
3. If `to_account_id` is set (own-account transfer), credit it.
4. Insert transaction rows: a negative row on the source account and, for own
   transfers, a positive row on the destination. The kind is `transfer` for
   accounts and person payees, `payment` for billers and `purchase` for
   purchases.
5. Return the updated action.

**`reset_demo() returns void`**

Truncates every table (`restart identity cascade`) and inserts the persona
from `project-overview.md` with **fixed literal UUIDs** for the profile,
both accounts, the card and both payees, so app constants can refer to them:

- profile Alex Nguyen, default account Everyday, no restrictions
- Everyday $1,500.00 (`aliases {'everyday','main'}`), Goal Saver $4,200.00
  (`aliases {'savings','goal saver','saver'}`), mock BSB and account numbers
- card `4821`, linked to Everyday, `active`, not reported lost
- payee Linh Nguyen (`person`, aliases `{'mum','mom','linh'}`, verified)
- biller BrightSpark Energy (`biller`, aliases `{'electricity','power',
  'brightspark'}`, verified, with a customer reference)
- transactions: a $1,500.00 salary credit today plus a few older Everyday
  rows, so "recent transactions" isn't empty
- 15 approved `card_events` over the last 30 days, $8–$85, at Corner Grocer,
  Metro Café and CityLink Transit (`in_store`, `new_merchant false`,
  `risk_level low`), with timestamps relative to `now()`
- no actions, incidents, notifications or audit rows

The migration ends with `select reset_demo();` so a fresh apply is already
seeded.

## Not in this unit

- `lib/db.ts`, any route or any UI (Unit 03 onwards).
- Supabase CLI, Realtime or Auth (cut in `architecture.md`).

## Clarify before building

Answered by the developer, Sat 14 Nov:

1. **Supabase project:** exists. The developer pastes the SQL into the SQL
   editor.
2. **Fixed UUIDs:** yes, `00000000-0000-4000-8000-0000000000NN`.
3. **Recent transactions seed:** the salary plus 4 older rows.
4. **Payments to people and billers:** record only the source-account debit.
5. **Multi-user sign-in** (asked during clarification): no. It stays out of
   scope (see `project-overview.md` → Out of Scope). Transfers to the saved
   payee Linh Nguyen show money moving, and the pitch names passkeys and real
   accounts as the production path.

## Verify when done

- [ ] The migration runs cleanly in the Supabase SQL editor on an empty project
      (developer's step; first item in Unit 03's clarify list).
- [x] After `select reset_demo();`: 1 profile, 2 accounts ($1,500.00 and
      $4,200.00), 1 active card, 2 payees, 15 approved card events, 0
      actions/incidents/notifications/audit rows.
- [x] By hand in SQL: insert a `pending_approval` transfer of $300 Everyday →
      Goal Saver, call `complete_action` with the right hash → balances become
      $1,200.00 and $4,500.00, and two transaction rows exist.
- [x] Calling it again with the same id → `ACTION_NOT_APPROVABLE`.
- [x] A wrong hash, or an `expires_at` in the past → `ACTION_NOT_APPROVABLE`.
- [x] An action larger than the balance → the CHECK raises and nothing
      changes (status still `pending_approval`).
- [x] With the anon key, `select` on any table returns nothing, and
      `rpc('reset_demo')` is denied.
- [x] `reset_demo()` brings everything back to the seed state.

## Built (filled in after completion)

Sat 14 Nov.

- `supabase/migrations/0001_init.sql`: 10 tables, CHECKs, RLS with no policies,
  `complete_action()`, `reset_demo()` (security definer), execute revoked from
  `public`, `anon` and `authenticated` and granted to `service_role`. It ends
  with `select reset_demo();`.
- **Added column `pending_actions.recipient_label`.** A transfer to an unknown
  recipient (the hijacked "$500 to J. Smith", or "a new recipient") resolves
  to no account or payee, but the blocked receipt must still say who it was
  for. The target CHECK allows a transfer with no account and no payee
  **only** when `recipient_label` is set and the status is `blocked`.
- Fixed UUIDs: profile `…001`, Everyday `…011`, Goal Saver `…012`, card
  `…021`, Linh Nguyen `…031`, BrightSpark Energy `…032`.
- Mock BSB `999-001`, which isn't a real bank's range. BrightSpark reference
  `BSE-204918`.
- Verified against Postgres via PGlite (a WASM build of real Postgres) with
  Supabase's roles and default grants recreated: all checks above pass,
  including the purchase path ($951.00 after Act 1 + the headphones). Applying
  it on the real Supabase project is the developer's step.
