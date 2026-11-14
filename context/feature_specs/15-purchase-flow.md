# 15 — Purchase flow

Status: draft

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

1. **No card event for a chat purchase.** Proposed: the purchase is a
   PIN-approved TrustPath action, while card events are the simulated
   payment network used by the fraud engine (Act 3). Keeping them separate
   keeps the fraud demo clean. OK?
2. **The catalogue price always wins.** If Alex types a different price
   ("buy it for $100"), the receipt still says $129.00, and the reply points
   out the real price. OK?
3. **Receipt wording** as above ("Price from SoundWave Audio's catalogue",
   "Debit card •••• 4821"). OK?
4. **Order of cards:** the shield card first, then the purchase receipt,
   matching steps 6 → 7. OK?

## Verify when done

After a reset, online and offline, in the browser at 390px:

- [ ] **Act 1, then step 5** (the headphones message with the link) → a
      shield card, then a purchase receipt (low risk, $129.00, SoundWave
      Audio, card •••• 4821).
- [ ] Approve with the PIN → **Everyday $951.00** and the receipt shows
      "Completed". Goal Saver stays $4,500.00.
- [ ] Still exactly 1 `injection_blocked` incident, and no $500 transfer.
- [ ] With the card set to `locked` in SQL → the purchase receipt is
      **Blocked** ("Your card is locked…") with no buttons.
- [ ] "Buy it for $100" + link → the receipt is $129.00.
- [ ] A purchase without the product in Alex's words (via the tool directly
      in a test) → blocked by R2.
- [ ] `npm test`, `npm run build` and `npm run lint` pass. Deployed and
      checked on the public URL.

## Built (filled in after completion)

-
