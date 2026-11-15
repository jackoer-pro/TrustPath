# 29 — In-app shop and deal finder

Status: done

## Goal

Alex can buy directly in the app instead of pasting a shop link: a Shop tab to
browse, and an assistant that finds the best deal ("find me the best noise
cancelling headphones under $150"), ranked by **reliability first, then
price**. Every purchase still goes through the trust engine, a Trust Receipt
and the PIN, at the catalogue price. The Act 2 shop-link protection is
unchanged.

## Decisions (developer asked to build without stopping; Sun 15 Nov)

- **Catalogue:** 9 products in 3 categories (headphones, earbuds, kettles)
  from 6 merchants with **simulated** ratings, review counts, verified
  status, returns and delivery (labelled as simulated in the UI). Aurora ANC
  (SoundWave Audio, $129, hidden instruction) is unchanged.
- **Deal finder (`lib/shop/deals.ts`, pure, deterministic):** reliability =
  rating 50% + verified seller 20% + returns 15% + review volume 15%; score =
  0.6 × reliability + 0.4 × (cheapest trusted price ÷ price). Unverified
  sellers rated under 4.0 are **never recommended**; if one is the cheapest
  it's shown as "Not recommended" with the reason. Picks: Best overall, Most
  trusted seller (if different), Not recommended. The model never ranks or
  prices products: it only calls `find_deals` and explains the result.
- **Search reads catalogue fields only**, never page text, so searching can't
  expose a hidden instruction.
- **Buying:** a Buy tap (Shop tab or deals card) is an explicit customer
  request, so `preparePurchase({ confirmedInApp: true })` meets provenance;
  everything else (card check, trust engine, receipt, PIN, catalogue price)
  is unchanged. Audited as `customer` with `via: "app"`. In chat, buying by
  product name works too (`getProduct` accepts an exact or unique name).
- Shop tab at `/store` (`/shop/[id]` stays the third-party merchant page).

## Built

- `lib/shop/products.ts` (merchants, categories, optional image/hidden
  instruction, name lookup); `app/shop/[productId]/page.tsx` handles
  products without a photo or hidden markup.
- `lib/shop/deals.ts` + 5 tests; tool `find_deals` (read-only) + `deals`
  chat card (`DealsCard` with Buy buttons → receipt in chat);
  `POST /api/shop/buy`; `StoreView` (search, category chips, badges, Buy →
  Trust Receipt + PIN in place); Shop tab between Home and Protect.
- Offline: "find/best/cheapest/any good … <category>" → `find_deals`; "buy
  the <product name>" → `prepare_purchase`.
- Prompt: call `find_deals`, say the top pick and why; buying is a tap or the
  product name.
- `npm run eval`: 5 shop cases (29 total).

## Verify (all done)

- [x] `npm test` 92/92; build and lint clean.
- [x] `npm run eval`: 29/29 online and 29/29 offline locally.
- [x] Browser, online and offline: Shop tab (Home/Shop/Protect), badges,
      filters, Buy → receipt → PIN → paid; chat deals card → Buy → PIN.
- [x] Golden path from `/demo` and the CoachGuard check still pass.

## Not in this unit

- A cart, delivery tracking, or real merchants. Staff tools for purchases.
