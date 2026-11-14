# 06 — Prepare transfer service

Status: draft

## Goal

One server function turns a candidate transfer (from the AI or the demo
panel) into a stored, assessed `pending_actions` row: resolved, checked by
the trust engine, hashed and audited. Blocked hijack attempts also open an
`injection_blocked` incident. Nothing moves money yet.

## Depends on

- 03 (db, audit), 05 (trust engine).

## Golden-path steps unlocked

None on screen yet. This is the engine behind steps 3, 6 (hijack block) and
16. Unit 07 adds approval, and Unit 08 shows the receipt.

## Build

- **`lib/banking/actions.ts` → `prepareTransfer(input)`**
  - `input`: `{ to: string, amountCents: number, fromAccount?: string,
    description?: string, userMessages: string[], origin: 'customer' |
    'simulated_compromised_agent' }`
  - Steps:
    1. Load the profile, its accounts and its payees for `DEMO_PROFILE_ID`.
    2. **Resolve the source:** `fromAccount` against account names and
       aliases; if absent, use `default_account_id`. If it's given but
       doesn't resolve → `AppError('UNKNOWN_ACCOUNT')`.
    3. **Resolve the recipient:** normalise `to` (lower-case, strip a
       leading "my " and a trailing " account"), then match it **exactly**
       against own account names and aliases first, then payee names and
       aliases. No fuzzy matching. If it doesn't resolve, the recipient is
       null and `recipient_label = to`.
    4. If the source and destination are the same account →
       `AppError('SAME_ACCOUNT')` (input validation, not a trust decision).
    5. Run `checkProvenance()` with the resolved aliases and the raw `to`,
       then `assess()`.
    6. Generate the id with `crypto.randomUUID()` and compute
       `payloadHash()`.
    7. Map the decision to a status: `step_up` → `pending_approval`, `hold`
       → `held`, `block` → `blocked`.
    8. Insert the row (`reasons`, `risk_level`, `origin`).
    9. Write audit rows:
       - `ai_agent` (or `system` for the simulated origin): `action.prepared`
       - `trust_engine`: `action.assessed` with `{ decision, riskLevel,
         reasons }`
    10. If the assessment flags `injection_suspected`, call
        `createIncident()`: type `injection_blocked`, severity high, status
        `contained`, linked by `action_id`, title "Injection blocked",
        description naming the amount and recipient. Audit it.
  - Returns receipt data:
    - the action fields
    - display names (`toName`, `fromName`, recipient kind)
    - `checks`: `requestedByYou`, `recipientKnown`, `fundsAvailable`
- **`lib/protect/incidents.ts` → `createIncident(fields)`**: insert plus an
  audit row. Unit 18 and Unit 20 reuse it.
- **Temporary dev route** `POST /api/dev/prepare-transfer`:
  - demo key required
  - returns 404 when `NODE_ENV === 'production'`
  - body validated with Zod, then calls `prepareTransfer`
  - It exists only to verify Units 06–08 before the chat exists. Unit 11
    deletes it (`ponytail:` comment).

## Not in this unit

- Approve or cancel (Unit 07), the receipt UI (Unit 08), purchases (Unit 15).
- The AI tool that calls this (Unit 09).

## Clarify before building

1. **Amount units.** Proposed: the service takes integer cents; the AI tool
   layer (Unit 09) converts the model's "$300" with `toCents()`. OK?
2. **Exact-match resolution only.** Proposed: "Mum", "my savings" and
   "electricity" resolve; "Mumm" or "Linh N." don't (→ unknown recipient →
   blocked). It's safer and predictable on camera. OK?
3. **Same source and destination** → a validation error, not a stored
   blocked action. OK?
4. **Temporary dev route** for verification (removed in Unit 11). Services
   use `server-only`, so a plain Node script can't call them. OK?

## Verify when done

Through the dev route, after a reset:

- [ ] `to: "savings", 30000, messages ["Move $300 into savings"]` →
      `pending_approval`, low risk, a valid 64-character hash, 2 audit rows.
- [ ] `to: "electricity", 12000` → `pending_approval`, low, payee
      BrightSpark Energy.
- [ ] `to: "J. Smith", 50000, messages ["Buy these headphones for $129 …"]`
      → `blocked`, `recipient_label` "J. Smith", plus one
      `injection_blocked` incident (high, contained, linked).
- [ ] `to: "a new recipient", 1000000` with a matching message → `blocked`
      (R3), with no incident.
- [ ] `to: "Mum", 80000` with a matching message → `held` (R6, over half
      the balance).
- [ ] `to: "everyday"` from Everyday → 400 `SAME_ACCOUNT`, nothing stored.
- [ ] No balance changes in any case.
- [ ] Without the demo key → 401. `next build` + `next start` → 404.
- [ ] `npm test`, `npm run build` and `npm run lint` pass.

## Built (filled in after completion)

-
