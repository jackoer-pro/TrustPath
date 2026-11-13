# 02 — Database schema and seed

Status: draft

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

1. **Supabase project.** Does the project exist yet, in the Sydney region? If
   not, create it first. Proposed: you create it, I give you the SQL to
   paste.
2. **Fixed UUIDs.** Proposed: readable literal UUIDs such as
   `00000000-0000-4000-8000-000000000001` for the profile. Unit 03 puts the
   same value in `DEMO_PROFILE_ID`. OK?
3. **Recent transactions seed.** Proposed: the salary credit plus 4 older
   rows (rent share, groceries, phone bill, a transfer from savings) so
   "show my recent transactions" reads naturally. Or salary only?
4. **Transactions for payments to Mum and billers.** Proposed: only the
   source-account debit is recorded (the money leaves the bank). OK?

## Verify when done

- [ ] The migration runs cleanly in the SQL editor on an empty project.
- [ ] After `select reset_demo();`: 1 profile, 2 accounts ($1,500.00 and
      $4,200.00), 1 active card, 2 payees, 15 approved card events, 0
      actions/incidents/notifications/audit rows.
- [ ] By hand in SQL: insert a `pending_approval` transfer of $300 Everyday →
      Goal Saver, call `complete_action` with the right hash → balances become
      $1,200.00 and $4,500.00, and two transaction rows exist.
- [ ] Calling it again with the same id → `ACTION_NOT_APPROVABLE`.
- [ ] A wrong hash, or an `expires_at` in the past → `ACTION_NOT_APPROVABLE`.
- [ ] An action larger than the balance → the CHECK raises and nothing
      changes (status still `pending_approval`).
- [ ] With the anon key, `select` on any table returns nothing, and
      `rpc('reset_demo')` is denied.
- [ ] `reset_demo()` brings everything back to the seed state.

## Built (filled in after completion)

-
