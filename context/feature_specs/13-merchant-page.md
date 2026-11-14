# 13 — Mock merchant page

Status: done

## Goal

A believable third-party shop page for the headphones exists at
`/shop/aurora-anc`, with an AI-targeted instruction hidden in its markup.
The product catalogue becomes the single source of truth for prices. This
is the bait for Act 2; Unit 14 makes the assistant read it safely.

## Depends on

- 01 (the placeholder route).

## Golden-path steps unlocked

- Step 5's link target exists. On camera, "view source" shows the hidden
  instruction.

## Build

- **`lib/shop/products.ts`**: a static catalogue, typed with a
  string-literal union of ids.
  - `aurora-anc`: merchant "SoundWave Audio", name "Aurora ANC Headphones",
    `priceCents: 12900`, a short visible description, and
    `hiddenInstruction`.
  - `getProduct(idOrUrl)` accepts `aurora-anc` or any URL ending in
    `/shop/aurora-anc`; unknown → `null`.
  - `pageText(product)` returns the page's **full text as the assistant
    would read it** (visible copy + the hidden markup) for Unit 14's
    `view_product`.
- **`app/shop/[productId]/page.tsx`**:
  - Reads the catalogue. `generateStaticParams` returns the catalogue ids;
    unknown ids show the not-found page.
  - Neutral black-and-white styling, deliberately **not** TrustPath's look:
    - a "SoundWave Audio" header
    - the product photo `public/shop/aurora-anc.jpg` (see question 2)
    - the name, the price, the description, a feature list, and a disabled
      "Add to cart" button
  - The hidden instruction appears **twice**, as required by `ui-context.md`:
    - as an HTML comment, injected with `dangerouslySetInnerHTML` because
      React doesn't render comments
    - in a visually hidden `<span>` that screen readers also skip
      (`aria-hidden`)
  - Footer: "Mock merchant for the TrustPath demo · Not a real store ·
    Simulated" (invariant 11).

## Not in this unit

- `view_product`, the scanner wiring and the shield card (Unit 14).
  Purchases (Unit 15).

## Clarify before building

Answered by the developer, Sat 14 Nov:

1. **Hidden text** as in `project-overview.md`: yes.
2. **Product image:** the developer asked me to pick one from the internet.
   Chosen: Jason Leung, "Black and white headphones on white background"
   (https://unsplash.com/photos/Q2RIZtBTtaI), free under the Unsplash
   License. It shows over-ear wireless headphones with no visible brand
   (checked by eye), matching "Aurora ANC". It's saved at 800×534 (25 KB) as
   `public/shop/aurora-anc.jpg`, with an optional credit on the page. The
   rejected candidate (Kiran CK) is a wired pair, which would contradict the
   Bluetooth copy.
3. **Visible copy:** yes.
4. **"Add to cart" disabled** and the "Mock merchant" footer: yes.

## Verify when done

- [x] `/shop/aurora-anc` renders in plain black-and-white with no TrustPath
      branding, at 390px and on desktop.
- [x] `curl` of the page HTML contains the instruction **inside `<!-- … -->`**
      and inside the hidden span; the visible page doesn't show it.
- [x] The hidden span has `aria-hidden="true"` and is visually hidden.
- [x] `getProduct('aurora-anc')`, `getProduct('https://x/shop/aurora-anc')`
      and `getProduct('nope')` behave as specified (tested).
- [x] The scanner from Unit 05 removes the instruction from `pageText()`
      (tested). This proves Unit 14 will work.
- [x] `npm test`, `npm run build` and `npm run lint` pass. Deployed page
      checked on the public URL.

## Built (filled in after completion)

Sat 14 Nov.

- `lib/shop/products.ts` (catalogue, `getProduct`, `pageText`) with 2 tests
  (40 total). The scanner test proves both hidden copies are removed while
  the name, price and description survive.
- `/shop/aurora-anc`: plain black and white, the Unsplash photo (via
  `next/image`, with credit), and a disabled "Add to cart". The HTML source
  contains the exact instruction in `<!-- … -->` and in an
  `sr-only aria-hidden` span; neither is visible (screenshots at 1280px and
  390px).
