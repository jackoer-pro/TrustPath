# 25 — Staff review and resolve

Status: draft

## Goal

The fraud specialist closes the loop: "Mark investigated" records the
review, and "Lift restrictions & unlock card" ends emergency protection and
unlocks the cards. Only bank staff routes can do this; the AI has no path
to the same effect. **Golden-path step 18 / Act 4 passes.**

## Depends on

- 24 (incident detail), 20 (emergency flags), 18–19 (card locks).

## Golden-path steps unlocked

- **Step 18:** the specialist clicks "Mark investigated" and "Lift
  restrictions & unlock card". The audit log shows every step with its
  actor; the customer's Protect tab returns to "Protected".

## Build

- **`lib/ops/staff.ts`** (`server-only`, **security-sensitive**, never
  imported by `lib/ai`):
  - `reviewIncident(id)`: status → `investigated`, `reviewed_by =
    'demo-specialist'`, `reviewed_at = now()`. Already investigated → 409.
    Audit `bank_staff` / `incident.reviewed`.
  - `resolveIncident(id)`: only for `card_fraud` and `account_compromise`
    (else 409 `NOT_RESOLVABLE`).
    - profile: `outgoing_paused = false`, `new_payees_blocked = false`,
      `emergency_since = null`
    - cards: `locked` / `temporarily_locked` → `active`, **except** cards
      `reported_lost` (they stay locked)
    - the incident and the open incidents linked to it (same profile, last
      hour) → `investigated` with `reviewed_by`
    - audit `bank_staff`: `restrictions.lifted`, `card.unlocked` per card,
      `incident.resolved`
    - returns `{ incident, cardsUnlocked, restrictionsLifted }`.
- **Routes** (demo key required; staff actions mutate):
  - `POST /api/ops/incidents/[id]/review`
  - `POST /api/ops/incidents/[id]/resolve`
- **Console:**
  - a "Staff key" field in the ops header (demo key), kept in
    `sessionStorage` for the tab, sent as `x-demo-key`. Without it the
    buttons are disabled, with the hint "Enter the staff key to act".
  - In `IncidentDetail`: "Mark investigated" (secondary) and "Lift
    restrictions & unlock card" (primary; only for resolvable incidents).
    Resolve asks for a confirmation in a `Dialog` ("This unlocks card ••••
    4821 and lifts all restrictions for Alex Nguyen."). Errors show inline.
- **Invariant check:** a test that the tool list in `lib/ai/tools.ts` has no
  tool whose name contains `unlock`, `resolve`, `lift`, `approve` or
  `review`, and that `lib/ai/**` never imports `lib/ops/staff`.

## Not in this unit

- `/demo` harness and its buttons (Unit 26). Real staff auth (out of scope;
  `reviewed_by` is the fixed demo specialist).

## Clarify before building

1. **Staff actions require the demo key**, typed into a "Staff key" field
   in the console and kept only for that browser tab. Viewing stays open.
   OK?
2. **Resolve also marks the case (and its linked open cases) investigated**,
   so one click closes the incident group. "Mark investigated" alone is for
   cases that need no unlock (e.g. injection). OK?
3. **Lost cards stay locked** after resolve (`reported_lost`); everything
   else becomes `active`. OK?
4. **No customer notification** on resolve; the Protect tab simply returns
   to "Protected" on the next poll. OK?

## Verify when done

- [ ] Without the key → 401 for both routes; unknown id → 404; reviewing
      twice → 409; resolving an injection incident → 409.
- [ ] After steps 10–13: resolve the account-compromise case → profile
      flags cleared, card `active`, both cases `investigated` by
      `demo-specialist`, audit rows `bank_staff`. The customer's Protect
      tab shows "Protected" within 2 s, and "Send $50 to Mum" works again.
- [ ] The buttons are disabled without the key; the confirm dialog shows
      the card and customer.
- [ ] The invariant test passes (no AI path to unlock or resolve).
- [ ] `npm test`, `npm run build` and `npm run lint` pass. Deployed and
      checked on the public URL.

## Built (filled in after completion)

-
