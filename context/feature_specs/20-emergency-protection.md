# 20 — Emergency protection

Status: draft

## Goal

When Alex says they may have been scammed, the assistant protects the
account in one step: every card is locked, outgoing transfers are paused,
new payees are blocked, pending approvals are cancelled, and a critical
case is opened. An Emergency Protection card in the chat shows each measure
ticked. **Golden-path steps 12–13 and 16 work online and offline.**

## Depends on

- 19 (deny → chat context), 09 (agent loop and tools), 10 (fallback
  parser), 05 (R1 already blocks when `outgoing_paused`), 06
  (`createIncident`).

## Golden-path steps unlocked

- **Step 12 (second half):** Alex types "I think I gave someone my bank
  security code over the phone. Protect my money."
- **Step 13:** the reply "You may have shared information that could allow
  someone to access your account. Let's protect your money first." and an
  `EmergencyCard` with five ticked measures.
- **Step 16:** "Send $50 to Mum" is then blocked by R1 (outgoing paused).

## Build

- **`lib/protect/emergency.ts` → `activate(profileId, statement)`**
  (`server-only`; security-sensitive under `lib/protect`, never unlocks):
  - profile: `outgoing_paused = true`, `new_payees_blocked = true`,
    `emergency_since = now()` (kept if already set).
  - every card → `locked`; every `pending_approval` action → `cancelled`.
  - an `account_compromise` incident (critical, `contained`, with the
    customer's statement in the description and the measures list). If an
    open one already exists, it's escalated rather than duplicated. Open
    `card_fraud` incidents get the measure "Linked to emergency case".
  - audit rows (`ai_agent` when called by the tool): `emergency.activated`,
    `card.locked` per card, `action.cancelled` per action.
  - Returns `{ incidentId, measures: [{ label, done }] , cardsLocked,
    actionsCancelled }`. The case brief is Unit 24.
- **Tool `report_account_compromise({ customerStatement })`** in
  `lib/ai/tools.ts` (category **protect**: it only restricts, never moves
  money or unlocks). Returns the measures to the model and an `emergency`
  chat card. Prompt line: call it when the customer says they shared a code,
  password or card details, or think they've been scammed or hacked; then
  reply with the step-13 line.
- **Fallback parser:** phrases like "scammed", "hacked", "gave … code",
  "security code", "protect my money", "wasn't me" → the same tool, with
  the fixed step-13 reply.
- **`ChatCard`** gains `{ type: 'emergency', measures, incidentId }`.
- **`components/customer/EmergencyCard.tsx`**: `ShieldAlert` heading
  "Emergency protection is on", a ticked list (`CircleCheck`) of:
  - All cards locked
  - New outgoing transfers paused
  - New payees blocked
  - Pending approvals cancelled (with the count)
  - Critical case opened with our fraud team
  
  and a line "Only our team can lift these. We'll contact you."

## Not in this unit

- Safety guidance from the knowledge base (step 14, Unit 21). The Protect
  tab's security status (step 15, Unit 22). Lifting restrictions — staff
  only, via the resolve route (Unit 23+). The case brief (Unit 24).

## Clarify before building

1. **Adding `report_account_compromise` to the tool list.** The tool list is
   security-sensitive, so this needs your explicit OK. It's protect-only: it
   can lock and pause, never unlock, approve or move money. OK?
2. **No provenance check on this tool.** Unlike transfers, it only makes
   things safer. Worst case (a hidden instruction triggers it), the account
   is locked until staff review. Accept that trade-off? (Alternative:
   require the customer's own last message to mention a scam, code or hack.)
3. **Activating twice** re-applies the measures and escalates the existing
   case instead of opening a second one. OK?
4. **Fallback triggers** as listed above, including "wasn't me". OK?

## Verify when done

After a reset, then inject Nova and deny (Unit 19):

- [ ] Online: the step-12 message → the step-13 reply and an
      `EmergencyCard` with five ticks. The profile flags are set, the card
      is `locked`, pending approvals are `cancelled`, and there's 1
      `account_compromise` incident (critical, contained); the Nova
      incident gets "Linked to emergency case".
- [ ] Offline (no key): the same result with the fixed reply.
- [ ] Step 16: "Send $50 to Mum" → a Blocked receipt with the R1 reason.
- [ ] A second activation → still 1 `account_compromise` incident.
- [ ] Audit rows for activation, locks and cancellations.
- [ ] `npm test` (fallback-parser cases added), `npm run build` and `npm run
      lint` pass. Deployed and checked on the public URL.

## Built (filled in after completion)

-
