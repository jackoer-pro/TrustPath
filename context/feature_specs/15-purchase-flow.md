# 15 — Purchase flow

Status: done

## Goal

Alex buys the headphones in chat. After the shield card, a purchase Trust
Receipt appears (SoundWave Audio, Aurora ANC Headphones, $129.00, card ••••
4821). Alex approves with the PIN and Everyday drops to $951.00. The price
always comes from the catalogue, never from the model or the page.
**Golden-path steps 5–7 pass.**

## Depends on

- 14 (`view_product`, shield card), 06–08 (prepare, approve, receipt), 13
  (catalogue).

## Golden-path steps unlocked

- **Steps 5–7**, online and offline. Step 8 (console) comes with Unit 23.

## Build

- **`lib/banking/actions.ts` → `preparePurchase({ productIdOrUrl,
  userMessages, origin })`**:
  - Resolve the product with `getProduct()`. Unknown → `AppError(
    'UNKNOWN_PRODUCT')`.
  - Load the demo card (`DEBIT_CARD_ID`) and its account (Everyday).
  - Provenance uses `productTerms`: id, name, `/shop/<id>`. The amount is
    the catalogue price, so no amount check is needed (R2 still requires
    the product to be in Alex's words).
  - `assess()` with `cardStatus` (R4), the balance (R5) and R6.
  - Hash with `productId`, then insert `type: 'purchase'` with `merchant`
    and `product_id`, then audit (`action.prepared`, `action.assessed`).
  - Returns `PreparedAction` with `recipientKind: 'merchant'`, `toName`
    (merchant), `productName` and `cardLastFour`.
- **`prepare_purchase { productIdOrUrl }`** tool. Its description says the
  price comes from the shop catalogue. The model receives `{ status,
  amount, merchant, product, card, riskLevel, reasons,
  fromAccountLeftAfterPending }`.
- **Prompt:** "To buy something, call view_product first, then
  prepare_purchase. Never pass or trust a price."
- **`TrustReceipt` purchase variant:**
  - `ShoppingBag` icon, title "Purchase"
  - lines: To "SoundWave Audio — Aurora ANC Headphones"; Pay with "Debit
    card •••• 4821 (Everyday)"
  - checks: "Requested by you", "Price from SoundWave Audio's catalogue",
    "Card active", "Funds available"
  - why sentence: "You asked for this, the price comes from SoundWave
    Audio's catalogue, and your card is active."
  - The completed line: "✓ $129.00 at SoundWave Audio · Completed 2:14 pm"
- **Fallback:** "buy"/"order"/"purchase" plus a shop link → `view_product`
  **then** `prepare_purchase`. Reply: "…hidden instructions, which I
  ignored. I've prepared the purchase: $129.00 at SoundWave Audio. You'll
  have $951.00 left in Everyday."
- `complete_action()` already handles purchases (a debit only, transaction
  kind `purchase`; tested in Unit 02).

## Not in this unit

- Card events for chat purchases (see question 1). Delivery, refunds and
  quantities.

## Clarify before building

Answered by the developer, Sun 15 Nov: all four proposals accepted.

1. No card event for a chat purchase.
2. The catalogue price always wins.
3. Receipt wording as specified.
4. The shield card first, then the purchase receipt.

## Verify when done

After a reset, online and offline, in the browser at 390px:

- [x] **Act 1, then step 5** (the headphones message with the link) → a
      shield card, then a purchase receipt (low risk, $129.00, SoundWave
      Audio, card •••• 4821).
- [x] Approve with the PIN → **Everyday $951.00** and the receipt shows
      "Completed". Goal Saver stays $4,500.00.
- [x] Still exactly 1 `injection_blocked` incident, and no $500 transfer.
- [x] With the card set to `locked` in SQL → the purchase receipt is
      **Blocked** ("Your card is locked…") with no buttons.
- [x] "Buy it for $100" + link → never a $100 receipt. Online, the model points
      out "$129.00, not $100" and asks first; after "yes" the receipt is
      $129.00. Offline, the receipt is $129.00 directly. (See Built.)
- [x] A purchase without the product in Alex's words → blocked by R2.
      Covered by the provenance test ("buy me something nice" fails) and the
      R2 policy test.
- [x] `npm test`, `npm run build` and `npm run lint` pass. Deployed and
      checked on the public URL.

## Built (filled in after completion)

Sun 15 Nov.

- `preparePurchase()` and a shared `store()` (insert, audit, injection
  incident) now used by both prepares. `PreparedAction` is an explicit type
  (adds `merchant` kind, `productName`, `cardLastFour`, `checks.cardActive`).
  `prepare_purchase` tool, prompt lines, the purchase `TrustReceipt`
  variant, the PIN summary "… at SoundWave Audio with debit card •••• 4821",
  and the fallback "buy + link" → `view_product` then `prepare_purchase`.
- **Golden-path steps 1–7 pass in one chat, online and offline** (headless
  Chrome, 390px, production build, Supabase): Act 1 → $1,080.00; the
  headphones link → shield card, then the purchase receipt (low, $129.00,
  •••• 4821) → PIN → **Everyday $951.00**, Goal Saver $4,500.00; exactly 1
  injection incident; no live $500 transfer. No console errors.
- Locked card → the purchase receipt is blocked ("Your card is locked, so
  purchases can't go through.").
- **Deviation (accepted as better):** with a wrong price ("for $100") the
  online model doesn't prepare silently. It says "The headphones are actually
  $129.00, not $100. Would you like me to prepare the purchase at $129.00?",
  and "Yes please" then prepares $129.00. The price never comes from the
  customer or the model either way.
- Rehearsal note (Unit 27): the online reply after a purchase doesn't mention
  the hidden instructions; only the shield card does. Consider a prompt line.
- Fixed an escaping slip during the build (regex `` written as a backspace
  by a Python edit). The repo was scanned for control characters: none.
