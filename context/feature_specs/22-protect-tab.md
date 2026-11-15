# 22 — Protect tab

Status: draft

## Goal

The Protect tab shows Alex's live security status from the database: a
"Protected" or "Emergency protection on" hero, each card's lock state, the
active restrictions and the open cases. **Golden-path step 15 works.**

## Depends on

- 04 (`useCustomerState`, 2 s poll; profile flags, cards and incidents are
  already in `/api/customer/state`), 20 (emergency mode), 19 (alerts).

## Golden-path steps unlocked

- **Step 15:** after step 13, Protect shows: card •••• 4821 locked, transfers
  paused, new payees blocked, case open.

## Build

- **`components/customer/SecurityStatus.tsx`** (hero):
  - normal: teal `ShieldCheck`, "Protected", "No restrictions on your
    accounts."
  - emergency (`outgoingPaused`): critical `ShieldAlert`, "Emergency
    protection on", "Since 3:42 pm. Only our team can lift this."
  - a card is locked but no emergency: medium `TriangleAlert`, "Card
    locked", "We paused your card to protect you."
- **Cards:** one row per card. `active` → green `LockOpen` "Active";
  `temporarily_locked` → "Temporarily locked"; `locked` → critical `Lock`
  "Locked". Helper text: "Only our team can unlock it. We'll contact you."
  **No unlock button** (invariant 8).
- **Restrictions** (shown only when on): "New outgoing transfers paused",
  "New payees blocked", each with `CircleCheck` in critical colour.
- **Cases:** non-investigated incidents, newest first: friendly title, case
  number `#` + the first 6 characters of the id in capitals, status pill
  (Open / Contained → "We're on it"), time, and the measures as a short
  list. Customer-facing titles:
  - `account_compromise` → "Account protection case"
  - `card_fraud` → the stored title ("Declined $3,580.00 at Nova…")
  - `injection_blocked` → "Hidden instructions blocked"
- **Pending alert:** if there's an unanswered "Was this you?", a row at the
  top: "You have a security alert" with a link to Home, where it's answered.
- `app/(customer)/protect/page.tsx` becomes a client view on
  `useCustomerState()`; loading and error states match Home.
- **`EmergencyCard`** also shows the same case number (`ui-context.md`:
  "case #…").

## Not in this unit

- Lifting restrictions (staff, Units 23+). The notification bell's list.
  The tick stagger animation on `EmergencyCard` (polish, Unit 26).

## Clarify before building

1. **The alert on Protect is a link to Home**, not a second banner, because
   answering it adds the follow-up message to the Home chat. OK?
2. **Show all three incident types** to Alex, including "Hidden
   instructions blocked", so the protections are visible. OK?
3. **No unlock button anywhere for the customer**; locked cards say "Only
   our team can unlock it". OK?
4. **Case numbers** are `#` + the first 6 characters of the incident id
   (e.g. `#3F9A1C`), also shown on the Emergency card. OK?

## Verify when done

- [ ] After a reset: "Protected", card Active, no restrictions, "No open
      cases".
- [ ] After Nova (step 10): "Card locked" hero, card "Temporarily locked",
      the alert row, 1 case "Declined $3,580.00 at Nova Electronics Online"
      contained.
- [ ] After steps 12–13: "Emergency protection on" with the time, card
      "Locked", both restrictions, 2 cases (account protection + Nova), the
      case number matches the Emergency card's.
- [ ] Updates within 2 s while the tab is open (no reload).
- [ ] Phone width 390 px: no horizontal scroll; screen reader labels on
      status icons.
- [ ] `npm test`, `npm run build` and `npm run lint` pass. Deployed and
      checked on the public URL.

## Built (filled in after completion)

-
