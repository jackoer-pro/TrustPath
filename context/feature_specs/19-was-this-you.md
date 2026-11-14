# 19 — "Was this you?" alert

Status: done

## Goal

When the fraud engine declines or holds a card payment, Alex's app shows a
"Was this you?" banner within 2 s. "No, it wasn't me" keeps the card locked,
raises the incident, and opens the chat with that context, ready for step
12. **Golden-path steps 10–12 (first half) work on screen.**

## Depends on

- 18 (notifications and incidents written by the fraud engine), 11 (chat
  thread), 04 (`useCustomerState` 2 s poll; notifications are already in
  `/api/customer/state`).

## Golden-path steps unlocked

- **Step 11 (customer half):** "We declined $3,580.00 at Nova Electronics
  Online. Was this you?" appears on Home within 2 s of the injected attempt.
- **Step 12 (first half):** Alex taps "No, it wasn't me", the card stays
  locked and the chat says: "Thanks for telling us. I've kept your card
  locked. Did anything else happen, like someone asking for a code?"
  Emergency protection itself is Unit 20.

## Build

- **`lib/protect/respond.ts` → `respondToNotification(id, response)`**
  (`server-only`, no `lib/ai`):
  - Load the notification; unknown → `AppError('NOT_FOUND', 404)`; already
    answered → `AppError('ALREADY_ANSWERED', 409)`. Record `response`.
  - **`denied`:** the linked card goes to `locked` (from `active` or
    `temporarily_locked`; never touches a card that's already `locked`).
    The linked `card_fraud` incident is raised to at least `high`, gets the
    measure "Customer said it wasn't them" and "Card locked" (if it changed).
  - **`confirmed`:** the incident gets the measure "Customer confirmed the
    payment". The card **stays as it is** — only staff unlock (invariant 8).
  - Audit (`customer`): `notification.answered`, plus `card.locked` when it
    changed. Returns `{ notification, card }`.
- **`POST /api/notifications/[id]/respond`**: uuid id, Zod body `{ response:
  'confirmed' | 'denied' }` → `run(respondToNotification)`. No demo key:
  it's the customer's own action (single demo profile).
- **`components/customer/AlertBanner.tsx`** (`role="alert"`, slides down
  under the app bar, `TriangleAlert`, stays until answered):
  - title "Was this you?", the notification body, buttons "Yes, it was me"
    (secondary) and "No, it wasn't me" (primary, danger tone).
  - Shows the **newest** unanswered `card_alert` only.
  - While the request runs both buttons are disabled; an error shows inline.
- **`HomeScreen`:**
  - Renders the banner from `useCustomerState().notifications`; hides it
    optimistically on answer, and the next poll confirms.
  - **Denied** → append the local assistant message above (no LLM call),
    included in the history sent with the next chat turn, and focus the chat
    input.
  - **Confirmed** → a short local assistant line: "Thanks. Your card stays
    locked until our team reviews it."

## Not in this unit

- Emergency protection and the `report_account_compromise` tool (Unit 20).
- The console's event and incident lists (Unit 23). The "Inject card
  attempt" button lives in the demo panel (Unit 25); this unit triggers it
  through the API.

## Clarify before building

Answered by the developer, Sun 15 Nov: all four proposals accepted.

1. Denied on a held ("review") payment locks the card too.
2. "Customer confirmed" goes in the incident's `measures` list.
3. Banner on Home only for now.
4. The follow-up chat message is local, not from the LLM, and is sent as
   history.

## Verify when done

After a reset:

- [x] Inject Nova $3,580 via the API → the banner appears on Home within
      2 s with the declined copy.
- [x] "No, it wasn't me" → the banner goes, the card is `locked`, the
      incident is high with the new measures, the notification is `denied`,
      and the chat shows the follow-up message with the input focused.
- [x] Answering twice → 409. Unknown id → 404. Bad body → 400.
- [x] "Yes, it was me" (fresh reset + inject) → the card stays
      `temporarily_locked`, the incident gets "Customer confirmed the
      payment".
- [x] A "review" payment + denied → the card goes `active` → `locked`.
- [x] Keyboard and screen reader: the banner is `role="alert"`, buttons are
      reachable by Tab.
- [x] `npm test`, `npm run build` and `npm run lint` pass. Deployed and
      checked on the public URL.

## Built (filled in after completion)

Sun 15 Nov.

- `lib/protect/respond.ts` → `respondToNotification()`; the answer is a
  conditional update (`response is null`), so a second answer or a race →
  409. `POST /api/notifications/[id]/respond`.
- `AlertBanner` (risk-high colours, `TriangleAlert`, `role="alert"`) sits
  under the app bar on Home; a new `danger` variant on `Button` for "No, it
  wasn't me". `ChatInput` takes an `inputRef` so Home can focus it.
- Measures on the card incident: "Customer said it wasn't them" + "Card
  locked", or "Customer confirmed the payment". Unit 18's review measure now
  reads "Payment held for review".
- Verified with headless Chrome against a production build: the banner
  appears in about 1 s, deny → the banner goes (and stays gone after the
  next poll), the follow-up message shows, the input is focused, the card is
  `locked`, and the incident is high with all four measures. API: 400 / 404
  / 200 / 409; confirmed keeps `temporarily_locked`; review + denied →
  `active` → `locked`. No console errors.
