# Demo operator script

Live app: **https://trust-path-five.vercel.app** · Film from **/demo** in a
1920×1080 Chrome window (zoom 100%, full screen). Left: Alex's phone. Middle:
the bank console. Right: demo controls.

## Before each take

1. Open `/demo`, type the **demo key** into "Demo key" once per tab (it also
   unlocks the console's staff buttons).
2. Click **Reset demo**: Everyday $1,500.00, Goal Saver $4,200.00, empty chat.
3. PIN for every approval: `DEMO_PIN` (**1234** if not set).
4. **Recording**: click **Camera on** (allow camera + microphone) so your face
   shows bottom-right, then **Record** → choose **This tab** (tick "Also share tab
   audio") → film → **Stop** downloads a `.webm`. The spoken briefing comes from
   the computer's voice, which tab audio may not capture: if it's missing, pick
   **Entire screen** with "Share system audio" instead. Use **Next step** in
   Workflow to show which act you're in.
5. Turn the computer's sound on (the briefing is spoken). Optional:
   `npm run eval -- https://trust-path-five.vercel.app` (31 automated cases; resets at the end). Full checklist: `context/test-script.md`.

**Order matters:** Act 4 turns on emergency protection (payments paused, card
locked). Everything that pays or buys comes before it.

## Opening (≈30 s)

Controls → **Opening slide** (AFCA 2025–26: 66,971 banking and finance complaints,
up 23%, mapped to what TrustPath does). Click to close.

## Act 0 — Waking up (≈30 s)

| Do this                                         | You should see / hear                                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| (Video: Alex wakes up, picks up the phone.)     | —                                                                                                                         |
| Controls: **Good morning (briefing)**           | The phone shows the briefing and the computer **speaks it**: "Good morning, Alex. It's Mum's birthday today. Last year you sent her $50. Want to send her something? Rent of $500 is still to pay before payday (in 14 days). You can safely spend $345 until then." |
| Phone: tap **Send Mum $50** → Approve → PIN     | A normal Trust Receipt to Linh Nguyen → Everyday **$1,450.00**. (The AI suggested; Alex decided; the bank checked.)       |

## Act 1 — "My bank knows me"

| Do this (phone)                                        | You should see                                                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `What can I spend until payday?`                       | **$295.00** with "How we worked it out": $1,450 − rent $500 − electricity $120 − subscriptions $35 − savings $300 − buffer $200 |
| `Can I afford these headphones for $280?`              | "Yes: $280.00 fits. You'd still have $15.00 safe to spend until payday."                                          |
| **Me** tab                                              | My Financial Context (Mum's birthday, commitments, savings goal, buffer, all editable) and **My AI Permissions** |
| Me → "Most the assistant can prepare at once" → **500** → Save; Home: `Send $600 to Mum` | Red Blocked: "This is above the $500.00 limit you set for your assistant…" (enforced by the bank, not the screen) |
| `I just got paid. Do my usual payday plan.`            | Payday plan card (Rent → Sam Patel $500, Electricity → BrightSpark $120, Savings → Goal Saver $300 = $920) + 3 Trust Receipts |
| Tap **Why?** on a receipt                              | What was asked: *Your saved payday plan* · session · payment · checks · decision: "Decided by the bank's rules, not the AI" |
| Approve all three with the PIN                          | Everyday **$530.00**                                                                                             |
| `What can I spend until payday?`                       | **Still $295.00**: rent, power and savings now show "paid this pay cycle" (real numbers, not AI-made)            |

## Act 2 — Shopping, and a website that tries to hijack the AI

| Do this                                                                                    | You should see                                                                                         |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Phone: `Find me the best noise cancelling headphones`                                      | Best deals: Best overall Studio ANC 2 $119 ("Fits your safe-to-spend: $176 left"), Most trusted QuietPro $149, **Not recommended** NoiseFree $59 |
| Phone: `Buy these headphones for $129 https://trust-path-five.vercel.app/shop/aurora-anc`  | Teal **Hidden instructions ignored** card (the page told the AI to send $500 to J. Smith); purchase receipt $129 |
| Approve → PIN                                                                               | Everyday **$401.00**                                                                                   |
| Controls: **Simulate compromised agent**                                                    | Red Blocked "$500 to J. Smith": "This instruction didn't come from you." Console timeline: **External content** |

## Act 3 — The card scam (fraud engine, no AI)

| Do this                                         | You should see                                                                                     |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Controls: **Inject card attempt ($3,580)**      | Console: Nova DECLINED + Card locked + reasons; phone: "Was this you? We declined $3,580.00…"     |
| Phone: **No, it wasn't me**                     | Card stays locked; "Did anything else happen…?"                                                     |

## Act 4 — Someone else on my account (Session Trust → recovery)

| Do this                                               | You should see                                                                                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Controls: **Simulate unfamiliar device attack**       | Console timeline: **Unfamiliar session (simulated)** $2,500 → D. Mercer **HELD**, 4 signals (unrecognised device in Melbourne, new sign-in, payee added 1 day ago, 5× usual largest payment), rules R6/R7/R10 |
| Phone: banner "A device we don't recognise … tried to send $2,500.00 from Goal Saver to D. Mercer" → **No, secure my account** | "I've cancelled that payment and secured your account" + Emergency card |
| Phone → **Protect**                                   | Emergency protection on, cases listed                                                                                              |
| Home: `Send $50 to Mum`                               | Blocked: "Outgoing payments are paused while emergency protection is on." (emergency always wins)                                  |

## Act 5 — The bank side

| Do this (console)                                                                | You should see                                                                       |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Session Trust timeline** → open the $2,500 row                                 | The 8 facts: intention, session, transaction, signals, rules, decision, action taken (Cancelled), timestamp. The customer saw the same under "Why?" |
| Incidents → **Possible account compromise**                                      | AI case brief with the next step                                                     |
| **Mark investigated** → **Lift restrictions & unlock card** → **Lift and unlock** | Restrictions lifted; phone Protect → Protected                                        |

## Closing (≈30 s)

Controls → **Closing slide** ("…TrustPath protects both."). Then **Reset demo**.

## If something goes wrong

- **No voice**: check the computer's sound; the phone's 🔈 toggle (left of the
  message box) turns spoken replies on/off; the briefing card has a **Listen** button.
- **"Offline assistant" badge**: DeepSeek is slow; the rule-based fallback gives the
  same results for every line above.
- **A button answers 401**: re-type the demo key.
- **Payments Blocked "paused while emergency protection is on"** before Act 4: an
  earlier take left emergency on. Reset.
- **Anything else**: **Reset demo** and start again.
