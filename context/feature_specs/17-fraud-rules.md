# 17 — Fraud rules (pure)

Status: done

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

Answered by the developer, Sun 15 Nov: all four proposals accepted.

1. Rapid repeats counts the current attempt (`recentAttempts + 1 ≥ 3`).
2. Reasons are written for bank staff, with numbers.
3. The average uses approved history only, with a $500 floor.
4. Merchant matching is exact and case-insensitive.

## Verify when done

- [x] `npm test` passes with a test for each matrix row and each signal.
- [x] The golden-path seed history (15 events, $8.50–$85.00) gives Nova
      $3,580 → `declined` / `temporarily_locked` / high, with reasons
      `unusual_amount`, `new_merchant` and `card_not_present`.
- [x] Metro Café $14.50 in store → `approved`, low, no signals.
- [x] `lib/fraud/rules.ts` imports nothing from `lib/ai`, `next`,
      `@supabase` or `@/`.
- [x] `npm run build` and `npm run lint` pass.

## Built (filled in after completion)

Sun 15 Nov.

- `lib/fraud/rules.ts` → `assessCardAttempt()` and 10 tests (53 total). It
  imports only `../money.ts` (for amounts in staff reasons).
- Seed history average = **$25.95**, so 10× = $259.47 and the **$500 floor**
  sets the threshold. Nova $3,580 online → `declined` /
  `temporarily_locked` / high with `unusual_amount`, `new_merchant` and
  `card_not_present`. Metro Café $14.50 in store → `approved`, low, no
  signals.
- Thresholds are exported constants (`UNUSUAL_MULTIPLIER`,
  `UNUSUAL_FLOOR_CENTS`, `RAPID_REPEAT_COUNT`). `lib/fraud/rules.ts` is
  security-sensitive (`ai-workflow-rules.md`).
