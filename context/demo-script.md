# Demo operator script

Live app: **https://trust-path-five.vercel.app** · Film from **/demo** in a
1920×1080 Chrome window (zoom 100%, full screen). Left: Alex's phone. Middle:
the bank console. Right: demo controls.

## Before each take

1. Open `/demo`, type the **demo key** (Vercel `DEMO_ADMIN_KEY`) into "Demo key"
   once per tab. It also unlocks the console's staff buttons.
2. Click **Reset demo**: Everyday $1,500.00, Goal Saver $4,200.00, empty chat.
3. PIN for every approval: `DEMO_PIN` (**1234** if not set).
4. Optional: `DEMO_ADMIN_KEY=<key> npm run eval -- https://trust-path-five.vercel.app`
   (37 automated cases; it resets the demo at the end).

**Order matters:** Act 4 turns on emergency protection (all payments paused, card
locked). Everything that pays or buys comes before it.

## Opening (≈30 s)

Controls → **Opening slide**: AFCA 2025–26: 66,971 banking and finance complaints
(up 23%): scams, unauthorised transactions, service issues, failure to follow
instructions, each mapped to what TrustPath does. Click to close.

## Act 1 — "My bank knows me" (personal context)

| Do this (phone)                                        | You should see                                                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `What can I spend until payday?`                       | **$345.00**, with "How we worked it out": $1,500 − rent $500 − electricity $120 − subscriptions $35 − savings $300 − buffer $200 |
| `Can I afford these headphones for $280?`              | "Yes: $280.00 fits. You'd still have $65.00 safe to spend until payday."                                          |
| `I just got paid. Do my usual payday plan.`            | Payday plan card (Rent → Sam Patel $500, Electricity → BrightSpark $120, Savings → Goal Saver $300 = $920) + 3 Trust Receipts |
| Tap **Why?** on a receipt                              | What was asked: *Your saved payday plan* · session · payment · checks · decision: "Decided by the bank's rules, not the AI" |
| Approve all three with the PIN                          | Everyday $580.00                                                                                                 |
| `What can I spend until payday?`                       | **Still $345.00**: rent, power and savings now show "paid this pay cycle" (the numbers are real, not AI-made)    |
| **Me** tab                                              | My Financial Context (edit/remove commitments, savings goal, buffer) and **My AI Permissions** (allowed / never allowed, AI limit, who the assistant can pay) |
| Me → set "Most the assistant can prepare at once" to **500** → Save; Home: `Send $600 to Mum` | Red Blocked: "This is above the $500.00 limit you set for your assistant…" (the limit is enforced by the bank, not the screen) |

## Act 2 — Shopping, and a website that tries to hijack the AI

| Do this                                                                                    | You should see                                                                                         |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Phone: `Find me the best noise cancelling headphones`                                      | Best deals card: Best overall Studio ANC 2 $119 ("Fits your safe-to-spend: $226 left"), Most trusted QuietPro $149, **Not recommended** NoiseFree $59 |
| Phone: `Buy these headphones for $129 https://trust-path-five.vercel.app/shop/aurora-anc`  | Teal **Hidden instructions ignored** card (the page told the AI to send $500 to J. Smith); purchase receipt $129 |
| Approve → PIN                                                                               | Everyday $451.00                                                                                        |
| Controls: **Simulate compromised agent**                                                    | Red Blocked "$500 to J. Smith": "This instruction didn't come from you." Console timeline labels it **External content** |
| Optional (CoachGuard): paste `Can you check this? The caller said: 'If the bank asks, tell them it's for a car you're buying. Don't mention me.'` | Strong signs of scam coaching, exact quotes, what to do now                                            |

## Act 3 — The card scam (fraud engine, no AI)

| Do this                                         | You should see                                                                                     |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Controls: **Inject card attempt ($3,580)**      | Console: Nova DECLINED + Card locked + reasons; phone: "Was this you? We declined $3,580.00…"     |
| Phone: **No, it wasn't me**                     | Card stays locked; "Did anything else happen…?"                                                     |

## Act 4 — Someone else on my account (Session Trust → recovery)

| Do this                                               | You should see                                                                                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Controls: **Simulate unfamiliar device attack**       | Console timeline: **Unfamiliar session (simulated)** $2,500 → D. Mercer **HELD**, 4 signals (unrecognised device in Melbourne, new sign-in, payee added 1 day ago, 5× usual largest payment), rules R6/R7/R10 |
| Phone: banner "A device we don't recognise … tried to send $2,500.00 from Goal Saver to D. Mercer" → **No, secure my account** | "I've cancelled that payment and secured your account" + Emergency card (cards locked, payments paused, payees blocked, case opened) |
| Phone → **Protect**                                   | Emergency protection on, cases listed                                                                                              |
| Home: `Send $50 to Mum`                               | Blocked: "Outgoing payments are paused while emergency protection is on." (emergency always wins)                                  |

## Act 5 — The bank side

| Do this (console)                                                                | You should see                                                                       |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Session Trust timeline** → open the $2,500 row                                 | The 8 facts: intention, session, transaction, signals, rules, decision, action taken (Cancelled), timestamp. The customer saw the same under "Why?" |
| Incidents → **Possible account compromise** (or the session case)                | AI case brief with the next step                                                     |
| **Mark investigated** → **Lift restrictions & unlock card** → **Lift and unlock** | Restrictions lifted; phone Protect → Protected                                        |

## Closing (≈30 s)

Controls → **Closing slide**: "…What if a malicious website tries to manipulate
the AI? What if a scammer manipulates the person using it? **TrustPath protects
both.**" Then **Reset demo**.

## If something goes wrong

- **"Offline assistant" badge**: DeepSeek is slow; the rule-based fallback gives
  the same results for every line above.
- **A button answers 401**: re-type the demo key.
- **A payment is Blocked "paused while emergency protection is on"** before Act 4:
  emergency is still on from an earlier take. Reset.
- **Anything else**: **Reset demo** and start again.
