# Demo operator script

For filming at **https://trust-path-five.vercel.app/demo** in a 1920×1080
browser window (Chrome, zoom 100%, full screen). Left: Alex's phone. Middle:
the bank console. Right: demo controls.

## Before each take

1. Open `/demo`, type the **demo key** into "Demo key" once per browser tab
   (it also unlocks the console's staff buttons).
2. Click **Reset demo**. Both panes reload: $1,500.00 / $4,200.00, empty
   chat, no incidents. The response box shows the time (normally < 0.5 s).
3. PIN for every approval: **1234** (or the value of `DEMO_PIN`).

## The take

| Step | Who      | Do this                                                                                                            | You should see                                                                                     |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| 1    | —        | (Start on the clean phone.)                                                                                        | Everyday $1,500.00, Goal Saver $4,200.00                                                           |
| 2–3  | Phone    | Type: `I just got paid $1,500. Move $300 into savings, pay my $120 electricity bill and tell me what I have left.` | Two low-risk Trust Receipts; "You'll have $1,080 left in Everyday."                                |
| 4    | Phone    | Approve each receipt → PIN                                                                                         | $1,080.00 / $4,500.00; both Completed                                                              |
| 5–6  | Phone    | Type: `Buy these headphones for $129 https://trust-path-five.vercel.app/shop/aurora-anc`                           | Teal "Hidden instructions ignored" card                                                            |
| 7    | Phone    | Approve the purchase receipt → PIN                                                                                 | Everyday $951.00                                                                                   |
| 8    | Console  | (Point at Incidents.)                                                                                              | "Injection blocked" (medium)                                                                       |
| opt. | Controls | **Simulate compromised agent**                                                                                     | Red Blocked "$500 to J. Smith" card labelled "Simulated compromised agent"                         |
| 9    | Video    | Scam-call reenactment (not in the app)                                                                             | —                                                                                                  |
| opt. | Controls | **Inject normal purchase ($14.50)** (before step 10 only)                                                          | Console: Metro Café APPROVED, nothing on the phone (normal spending is silent)                     |
| 10   | Controls | **Inject card attempt ($3,580)**                                                                                   | Console: Nova DECLINED + Card locked + 3 reasons (highlighted)                                     |
| 11   | Phone    | (Wait ~1 s.)                                                                                                       | "Was this you? We declined $3,580.00 at Nova Electronics Online."                                  |
| 12   | Phone    | Tap **No, it wasn't me**, then type: `I think I gave someone my bank security code over the phone. Protect my money.` | Follow-up question, then the reply below                                                        |
| 13   | Phone    | (Read the reply.)                                                                                                  | "You may have shared information…" + Emergency card, 5 ticks appearing in turn                     |
| 14   | Phone    | (Same reply.)                                                                                                      | Guidance: the bank never asks for your code; call the number on your card; sources line            |
| 15   | Phone    | Tap **Protect**                                                                                                    | "Emergency protection on", card Locked, transfers paused, payees blocked, 2+ cases                 |
| 16   | Phone    | Home → type: `Send $50 to Mum`                                                                                     | Red Blocked card: "Outgoing payments are paused while emergency protection is on."                 |
| 17   | Console  | Click the **Possible account compromise** incident                                                                 | AI case brief: summary, timeline, measures, suggested next step                                    |
| 18   | Console  | **Mark investigated**, then **Lift restrictions & unlock card** → **Lift and unlock**                              | "Restrictions lifted, card •••• 4821 unlocked"; audit log shows `bank_staff` rows; phone Protect → Protected |
| 19   | Controls | **Reset demo**                                                                                                     | Both panes back to step 1                                                                          |

## If something goes wrong

- **The assistant shows "Offline assistant"**: DeepSeek is slow or down;
  the rule-based fallback handles every line above with the same results.
- **A button answers 401**: the demo key is missing or wrong (re-type it).
- **Don't inject the $14.50 purchase after step 10**: the card is locked, so
  it's declined and raises a second "Was this you?" alert mid-take.
- **Anything else**: click **Reset demo** and start the take again.
