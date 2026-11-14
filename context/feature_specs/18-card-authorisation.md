# 18 — Card authorisation pipeline

Status: done

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

Answered by the developer, Sun 15 Nov: all four proposals accepted.

1. Declined + locked → incident `contained`; review → `open`. Severity = the
   fraud risk level.
2. Notifications only for declined and review.
3. The lock only moves `active` → `temporarily_locked`, never downgrades.
4. Request `{ amount, merchant, channel, cardId? }`, `cardId` defaults to the
   demo card.

## Verify when done

After a reset:

- [x] Without the demo key → 401. A bad body → 400.
- [x] `{ amount: 3580, merchant: "Nova Electronics Online", channel:
      "ecommerce" }` → `declined`, `temporarily_locked`, high. The card is
      now `temporarily_locked`; there's 1 `card_fraud` incident (high,
      contained, linked to the event) and 1 notification "Was this you?"
      with the declined body; the audit rows are `fraud_engine`. Balances
      are unchanged.
- [x] Metro Café $14.50 in store → `approved`, no incident, no notification,
      the card is unchanged, and one event plus an audit row exist.
- [x] A second attempt while locked → `declined` (critical), `cardAction:
      none`, the card stays `temporarily_locked`.
- [x] Three quick attempts → the third flags `rapid_repeats`.
- [x] `lib/fraud/**` never imports `lib/ai` (grep).
- [x] The customer state API now shows the notification and the open
      incident.
- [x] `npm test`, `npm run build` and `npm run lint` pass. Deployed and
      checked on the public URL.

## Built (filled in after completion)

Sun 15 Nov.

- `lib/fraud/process-authorization.ts` → `processAuthorization()`; it
  imports `./rules`, db, http, audit, money and `createIncident`, never
  `lib/ai`. `POST /api/simulate/card-authorization` (demo key, Zod body,
  `toCents`; a bad amount → 400, an unknown card → 404).
- Incidents carry `measures` (`Payment declined`, `Card temporarily
  locked`). Titles: "Declined $3,580.00 at Nova Electronics Online" /
  "Held $X at M".
- Verified live after a reset: Metro Café $14.50 → approved, no incident or
  notification. Nova $3,580 → declined / high / `temporarily_locked`; the
  card is locked, the incident is high + contained, the notification reads
  "We declined $3,580.00 at Nova Electronics Online. Was this you?", and the
  balances are unchanged. The retry while locked → declined / critical /
  `none`. Three quick Metro attempts → the third is `review` with
  `rapid_repeats`.
- After an approved café payment the average is $25.23 (16 events), still
  under the $500 floor.
- An attempt on an already-locked card also creates its own incident and
  "Was this you?" notification (spec: every non-approved decision). The demo
  only sends one attempt.
