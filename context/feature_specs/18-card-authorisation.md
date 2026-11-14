# 18 — Card authorisation pipeline

Status: draft

## Goal

A simulated payment-network event hits the bank, the fraud engine decides
it with no AI and no chat, and every consequence is written in one
request: the card event, the card lock, the incident, the customer
notification and the audit rows. **Golden-path step 10 works through the
API.**

## Depends on

- 17 (`assessCardAttempt`), 03 (db, http, audit, demo key), 06
  (`createIncident`).

## Golden-path steps unlocked

- **Step 10:** the $3,580 Nova attempt is declined and the card temporarily
  locked. Steps 11 (alert and console) follow in Units 19 and 23.

## Build

- **`lib/fraud/process-authorization.ts` → `processAuthorization({ cardId,
  amountCents, merchant, channel })`** (`server-only`, never imports
  `lib/ai`):
  1. Load the card (status, `reported_lost`, profile), its last 20 approved
     `card_events`, and the count of `card_events` in the last 10 minutes.
     An unknown card → `AppError('UNKNOWN_CARD', 404)`.
  2. Run `assessCardAttempt()`.
  3. Insert the `card_events` row: decision, `risk_level`, `reasons` (the
     signals), `new_merchant` and `card_action`.
  4. If `temporarily_locked`, set the card to `temporarily_locked`, but only
     if it's still `active`, so an emergency `locked` is never downgraded.
  5. If the decision isn't approved:
     - `createIncident({ type: 'card_fraud', severity: riskLevel, status:
       cardAction === 'temporarily_locked' ? 'contained' : 'open', title,
       description, cardEventId })`
     - a notification `{ kind: 'card_alert', title: 'Was this you?', body,
       card_event_id }`
  6. Audit (`fraud_engine`): `card_event.assessed` always, plus
     `card.temporarily_locked`, `notification.sent` and the incident row.
     **Approved simulated events never change balances** (settlement is out
     of scope).
  7. Returns `{ event, assessment, incidentId?, notificationId? }`.
- **`POST /api/simulate/card-authorization`**: `checkDemoKey(req) ??` Zod
  body `{ cardId?: uuid (default: the demo card), amount: string | number,
  merchant: 1–80 chars, channel: 'ecommerce' | 'in_store' }`. The amount
  goes through `toCents()`. Then `run(processAuthorization)`.
- **Customer copy** (shown in Unit 19):
  - declined: "We declined $3,580.00 at Nova Electronics Online. Was this
    you?"
  - review: "We've paused a $X payment at M while we check it. Was this
    you?"

## Not in this unit

- The alert banner and the respond route (Unit 19). The console lists (Unit
  23). The AI case brief (Unit 24; it's written after the decision and can
  never change it).

## Clarify before building

1. **Incident status:** declined + locked → `contained` (the threat is
   already stopped); review → `open`. Severity = the fraud risk level (high
   for Nova). OK?
2. **Notifications only for declined and review.** Approved payments are
   silent, like a real bank. OK?
3. **The card lock never downgrades an emergency lock** (only `active` →
   `temporarily_locked`). OK?
4. **Request shape** `{ amount, merchant, channel, cardId? }`, with `cardId`
   defaulting to the demo card so the demo panel only needs the first three.
   OK?

## Verify when done

After a reset:

- [ ] Without the demo key → 401. A bad body → 400.
- [ ] `{ amount: 3580, merchant: "Nova Electronics Online", channel:
      "ecommerce" }` → `declined`, `temporarily_locked`, high. The card is
      now `temporarily_locked`; there's 1 `card_fraud` incident (high,
      contained, linked to the event) and 1 notification "Was this you?"
      with the declined body; the audit rows are `fraud_engine`. Balances
      are unchanged.
- [ ] Metro Café $14.50 in store → `approved`, no incident, no notification,
      the card is unchanged, and one event plus an audit row exist.
- [ ] A second attempt while locked → `declined` (critical), `cardAction:
      none`, the card stays `temporarily_locked`.
- [ ] Three quick attempts → the third flags `rapid_repeats`.
- [ ] `lib/fraud/**` never imports `lib/ai` (grep).
- [ ] The customer state API now shows the notification and the open
      incident.
- [ ] `npm test`, `npm run build` and `npm run lint` pass. Deployed and
      checked on the public URL.

## Built (filled in after completion)

-
