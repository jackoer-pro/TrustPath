# 17 — Fraud rules (pure)

Status: draft

## Goal

The card fraud engine's decision logic exists as a pure, fully tested
function: signals in, decision out. Nothing calls it yet; Unit 18 feeds it
real card events. It never imports `lib/ai` (invariant 7).

## Depends on

Nothing in code. It's pure TypeScript (no DB, no framework, relative `.ts`
imports).

## Golden-path steps unlocked

None directly. This is the brain behind step 10 (the $3,580 Nova attempt is
declined and the card temporarily locked) and the $14.50 Metro Café approval.

## Build

- **`lib/fraud/rules.ts` → `assessCardAttempt(attempt, ctx)`**
  - **Input:**
    - `attempt`: `{ amountCents, merchant, channel: 'ecommerce' | 'in_store' }`
    - `ctx`:
      - `card`: `{ status, reportedLost }`
      - `history`: the card's last 20 **approved** events
        (`{ merchant, amountCents }`)
      - `recentAttempts`: attempts on this card in the last 10 minutes,
        **not** counting this one
  - **Signals** (`architecture.md` → Fraud Rules):

    | Code             | Condition                                                  | Level    |
    | ---------------- | ---------------------------------------------------------- | -------- |
    | `card_unavailable` | `status != 'active'` or `reportedLost`                   | critical |
    | `unusual_amount`   | `amount > max(10 × average of history, $500)`            | high     |
    | `rapid_repeats`    | `recentAttempts + 1 ≥ 3`                                 | high     |
    | `new_merchant`     | merchant not in history (case-insensitive)               | medium   |
    | `card_not_present` | `ecommerce` **and** a new merchant                       | medium   |

  - **Decision matrix:**
    - any critical → `declined`, `cardAction: 'none'`
    - high + any other signal → `declined`, `temporarily_locked`
    - high alone → `review`, `none`
    - medium only → `approved`, with reasons
    - none → `approved`
  - **Output:** `{ decision, riskLevel, cardAction, newMerchant, signals: [{
    code, level, reason }] }`. The risk level is the highest signal, or `low`.
    The reasons are written for **bank staff** and include the numbers, e.g.
    "Unusual amount: $3,580.00 is over 10× this card's average of $28.65".
- **`lib/fraud/rules.test.ts`:**
  - every decision path
  - the golden-path cases:
    - Nova $3,580, ecommerce, new → declined + temporarily locked
    - Metro Café $14.50, in store → approved with no signals
  - the $500 floor when the history is empty or cheap
  - case-insensitive merchant matching
  - rapid repeats counting the current attempt

## Not in this unit

- Loading card context, writing card events, locks, incidents and
  notifications (Unit 18).

## Clarify before building

1. **Rapid repeats counts the current attempt** (two earlier attempts within
   10 minutes plus this one = 3 → high). OK?
2. **Reasons are written for bank staff, with numbers.** The customer alert
   in Unit 19 uses its own plain wording ("We declined $3,580.00 at Nova
   Electronics Online. Was this you?"). OK?
3. **The average uses only approved history** (declined attempts don't
   inflate it), and with no history the $500 floor applies. OK?
4. **Merchant matching is exact but case-insensitive** ("metro café" =
   "Metro Café"), with no fuzzy matching. OK?

## Verify when done

- [ ] `npm test` passes with a test for each matrix row and each signal.
- [ ] The golden-path seed history (15 events, $8.50–$85.00) gives Nova
      $3,580 → `declined` / `temporarily_locked` / high, with reasons
      `unusual_amount`, `new_merchant` and `card_not_present`.
- [ ] Metro Café $14.50 in store → `approved`, low, no signals.
- [ ] `lib/fraud/rules.ts` imports nothing from `lib/ai`, `next`,
      `@supabase` or `@/`.
- [ ] `npm run build` and `npm run lint` pass.

## Built (filled in after completion)

-
