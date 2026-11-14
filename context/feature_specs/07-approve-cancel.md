# 07 — Approve and cancel routes

Status: done

> **Security-sensitive** (`ai-workflow-rules.md`): `app/api/actions/[id]/approve/route.ts`
> may only change with explicit instruction. Approving this spec is that
> instruction for Unit 07.

## Goal

A prepared action can be approved with the PIN, which moves the money through
`complete_action()` exactly once, or cancelled. Every way an approval can be
abused (replay, altered payload, expiry, wrong PIN, held or blocked action)
fails safely.

## Depends on

- 02 (`complete_action()`), 03 (http, audit), 06 (prepared actions).

## Golden-path steps unlocked

- **Step 4** (money moves on approve) works through the API. Unit 08 puts
  it on screen.

## Build

- **`lib/banking/approve.ts`**
  - `approveAction(id, { pin, payloadHash })`:
    1. Check the PIN against `DEMO_PIN` (default `1234`) with
       `timingSafeEqual`. If wrong → `AppError('BAD_PIN', 403)`, audit
       `customer / action.approval_failed`, and the action stays pending.
    2. Read the action and the profile.
       - If `profile.outgoing_paused` → `OUTGOING_PAUSED` (409). This is
         defence in depth; emergency mode also cancels pending actions.
       - If the status isn't `pending_approval`, or it has expired, or the
         hash differs → `ACTION_NOT_APPROVABLE` (409), with a specific
         message:
         - "Already approved"
         - "This request expired — ask again"
         - "This action changed since you saw it"
         - "Held for review" / "Blocked"

       This read only picks the message; the DB function still enforces
       everything.
    3. `rpc('complete_action', { p_action_id, p_payload_hash })`.
       - `ACTION_NOT_APPROVABLE` from the DB (a race) → 409.
       - The `accounts_balance_nonnegative` violation →
         `INSUFFICIENT_FUNDS` (409).
    4. Audit `customer / action.approved`.
    5. Return the completed action plus the fresh account balances, so Home
       updates instantly instead of waiting for the next poll.
  - `cancelAction(id)`:
    - `UPDATE … SET status='cancelled' WHERE id=… AND
      status='pending_approval'`.
    - No row → `ACTION_NOT_CANCELLABLE` (409).
    - Audit `customer / action.cancelled`.
- **Routes:**
  - `POST /api/actions/[id]/approve`: Zod body `{ pin: /^\d{4}$/,
    payloadHash: 64 hex }`; `id` must be a UUID. Then `run(approveAction)`.
  - `POST /api/actions/[id]/cancel`: `id` must be a UUID. Then
    `run(cancelAction)`.
- Nothing else may call `complete_action` (invariant 2). Checked by grep.

## Not in this unit

- The PIN dialog and receipt UI (Unit 08).
- Emergency cancellation of all pending actions (Unit 20).

## Clarify before building

Answered by the developer, Sat 14 Nov: all four proposals accepted. This is
the explicit instruction for the approve route.

1. **3 wrong PINs** on the same pending action cancel it ("Too many attempts
   — ask again"), counted from `action.approval_failed` audit rows.
2. **Specific error messages** come from a pre-read of the action; the DB
   still enforces everything.
3. **`OUTGOING_PAUSED` check** in approve, as defence in depth.
4. **Approve returns fresh balances.**

## Verify when done

After a reset, prepare actions through the dev route, then:

- [x] Approving $300 to savings with PIN `1234` and the right hash → 200;
      balances $1,200.00 and $4,500.00; one `customer / action.approved`
      audit row.
- [x] The same approve again → 409 "Already approved"; balances unchanged.
- [x] Wrong PIN → 403 `BAD_PIN`; the action stays `pending_approval`.
      (If option 1 is chosen: the third wrong PIN cancels it.)
- [x] Hash with one character changed → 409 "changed since you saw it".
- [x] `expires_at` set to the past in SQL → 409 "expired".
- [x] A held action and a blocked action → 409; no money moves.
- [x] Insufficient funds (balance lowered after prepare) → 409
      `INSUFFICIENT_FUNDS`; nothing changes.
- [x] Cancel a pending action → `cancelled`; cancelling again → 409.
- [x] Bad id, bad PIN format or bad hash format → 400.
- [x] `grep -rn complete_action app lib` matches only `lib/banking/approve.ts`.
- [x] `npm test`, `npm run build` and `npm run lint` pass.

## Built (filled in after completion)

Sat 14 Nov.

- `lib/banking/approve.ts` (`approveAction`, `cancelAction`) and the two
  routes. `complete_action` is called only from `approve.ts`.
- **Check order:** the action exists (404) → PIN (403 `BAD_PIN`; the 3rd
  failure cancels it with `TOO_MANY_ATTEMPTS`) → `OUTGOING_PAUSED` → status,
  expiry and hash messages → `complete_action()`. DB errors map to
  `INSUFFICIENT_FUNDS` and `ACTION_NOT_APPROVABLE`.
- Verified live via `next dev`. All 10 scenarios passed, including
  insufficient funds raised by the DB `CHECK` itself (the balance was lowered
  after prepare) and nothing changing on every rejection.
- Success returns `{ action: { id, status, completedAt }, accounts: [{ id,
  balanceCents }] }`.
