# 20 — Emergency protection

Status: done

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

Answered by the developer, Sun 15 Nov: all four proposals accepted.

1. `report_account_compromise` added to the tool list (protect-only).
2. No provenance check on this tool; the worst case is a lockdown until
   staff review.
3. Activating twice escalates the existing case.
4. Fallback triggers as listed, including "wasn't me".

## Verify when done

After a reset, then inject Nova and deny (Unit 19):

- [x] Online: the step-12 message → the step-13 reply and an
      `EmergencyCard` with five ticks. The profile flags are set, the card
      is `locked`, pending approvals are `cancelled`, and there's 1
      `account_compromise` incident (critical, contained); the Nova
      incident gets "Linked to emergency case".
- [x] Offline (no key): the same result with the fixed reply.
- [x] Step 16: "Send $50 to Mum" → a Blocked receipt with the R1 reason.
- [x] A second activation → still 1 `account_compromise` incident.
- [x] Audit rows for activation, locks and cancellations.
- [x] `npm test` (fallback-parser cases added), `npm run build` and `npm run
      lint` pass. Deployed and checked on the public URL.

## Built (filled in after completion)

Sun 15 Nov.

- `lib/protect/emergency.ts` → `activate()`; `report_account_compromise`
  tool (protect-only, added on the developer's explicit OK); `EmergencyCard`
  (critical colours, `ShieldAlert`, `CircleCheck` ticks); `ChatCard` gains
  `emergency`. `EMERGENCY_REPLY` in `lib/ai/tools.ts` is the offline reply
  and the line the prompt asks for. If DeepSeek fails after the tool ran,
  the agent keeps the card and that reply (it never activates twice).
- The fallback trigger is `scammed`, `hacked`, `security code`, `protect my
  money/account`, `wasn't me` (straight or curly apostrophe), and `gave …
  code/password/pin/card details`. A bare "scam" doesn't trigger, so "How do
  I spot a scam?" stays a question for Unit 21. 1 new parser test (54
  total).
- **Prompt changes, found by testing:**
  - "Never refuse a transfer or purchase in words; always call the prepare
    tool and let the bank's checks decide". Without it the model refused
    step 16 in words, so no Blocked card appeared.
  - "Only if Alex's **latest** message reports it". Without it the model
    re-activated on the next turn because the scam statement was still in
    the history.
  - After both, step 16 gave a Blocked R1 card 5 of 5 times online.
- Verified in headless Chrome, online and offline: step 13 reply + 5
  ticks (3.7 s online, 1.2 s offline); flags set, card `locked`, the
  earlier "$300 to savings" approval → Cancelled on screen, 1 critical
  contained `account_compromise` case, the Nova incident "Linked to
  emergency case", `ai_agent` audit rows; step 16 Blocked with "Outgoing
  payments are paused while emergency protection is on."; a second
  activation still gives 1 case. Unit 15 check (Act 1 + steps 5–7) still
  passes online and offline.
- Still open for Unit 27: "$10,000 to a new recipient" is still refused in
  words online (the prompt also says new payees can't be added), so no
  Blocked card. The offline "I think I've been scammed" chip now turns
  protection on, which is intended.
