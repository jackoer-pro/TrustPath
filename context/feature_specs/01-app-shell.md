# 01 — App shell and design tokens

Status: done

## Goal

Every route exists and renders with static placeholder data in the final
layout, colours and fonts. Later units swap the placeholders for live data
without touching the layout.

## Depends on

Nothing. This is the first unit.

## Golden-path steps unlocked

None (foundation). Step 1's layout is visible, with static balances.

## Build

**Tokens and fonts**

- `app/globals.css`:
  - Remove the template `:root` variables, the dark-mode block and the
    `body` background/colour rules.
  - Add every colour token from `ui-context.md` → Colors under `@theme`
    (`--color-canvas` … `--color-focus`).
  - Map `--font-sans`, `--font-mono` and `--font-display` to the `next/font`
    variables.
  - Add a global `focus-visible` outline in `--color-focus`.
  - Add a `prefers-reduced-motion` rule that turns transitions and
    animations off.
- `app/layout.tsx`: add Source Serif 4 (weight 600) via `next/font/google` as
  `--font-source-serif`. Set `body` to `bg-canvas text-ink`.

**Shared code**

- `lib/money.ts`: `toCents(input: string | number): number` and
  `formatAUD(cents: number): string` (`Intl.NumberFormat('en-AU')`,
  e.g. `$1,080.00`). It's pure, so it gets a small `lib/money.test.ts` once
  Unit 05 adds `npm test`. Until then, check it by hand.
- `components/ui/`:
  - `Button.tsx`: variants `primary` (navy), `secondary` (outline) and
    `ghost`; sizes `sm` and `md`.
  - `Badge.tsx`
  - `RiskBadge.tsx`: `low|medium|high|critical` → icon, label and colours.
  - `Card.tsx`: surface, `rounded-xl`, `shadow-sm`, `border-line`.
  - `Money.tsx`: `formatAUD` with `tabular-nums font-semibold`.
  - `Logo.tsx`: an inline SVG shield in navy with a teal path line and a
    brand-red dot, plus the "TrustPath" wordmark in the display font.
- Install `lucide-react`. This is the first unit that uses icons.

**Customer app** (`app/(customer)/`)

- Move `app/page.tsx` to `app/(customer)/page.tsx`.
- `app/(customer)/layout.tsx`: a phone frame (max 420px, centred on the
  canvas on desktop, full-bleed on a phone, `rounded-[2.75rem]` and
  `shadow-xl` only at desktop widths). It contains:
  - a 4px brand-red top stripe
  - an app bar with the logo, a bell icon button (`aria-label`) and an "AN"
    avatar
  - the page content
  - the bottom tab bar
  - the footer line: "Concept prototype for the Westpac Innovation and Coding
    Competition 2026 · Simulated data"
- `components/customer/TabBar.tsx` (`'use client'`, uses `usePathname`): Home
  and Protect tabs, active tab underlined in brand red, 44px tap targets.
- `app/(customer)/page.tsx` (Home): static account chips (Everyday
  $1,500.00, Goal Saver $4,200.00), a sunken chat area with the greeting "Hi
  Alex, how can I help?" and the 4 suggestion chips, and a disabled input
  pinned above the tab bar.
- `app/(customer)/protect/page.tsx`: a static `SecurityStatus`-style hero
  ("Protected", teal, `ShieldCheck`), card •••• 4821 "Active", and "No open
  cases".

**Other surfaces**

- `app/ops/page.tsx`: desktop console skeleton with a navy sidebar (Live,
  Incidents, Audit), the header "Fraud Operations (demo)" with stat pills
  showing 0, and empty panels for events, incidents, detail and the audit log.
- `app/demo/page.tsx`: three columns: an iframe of `/` (420px, phone
  frame), an iframe of `/ops` (flexible) and a 280px control panel with the
  four buttons disabled and the label "Wired up in Unit 26".
- `app/shop/[productId]/page.tsx`: plain black-and-white "SoundWave Audio"
  page with a placeholder product block. Use `generateStaticParams` returning
  `[{ productId: 'aurora-anc' }]`, so `cacheComponents` doesn't need a
  Suspense boundary around `params`. Unknown ids call `notFound()`. The full
  catalogue and the hidden instruction come in Unit 13.

## Not in this unit

- Any data fetching, DB or API route (Units 03–04).
- `Dialog` and `PinDialog` (Unit 08). Add primitives only when used.
- The receipt, shield, emergency and alert components.
- The product catalogue and the hidden instruction (Unit 13).

## Clarify before building

Answered by the developer, Sat 14 Nov:

1. **Westpac red and navy:** use `#DA1710` and `#1F1C4F` now and confirm them
   on Day 1 against the Westpac Design Resource. Only the token values would
   change.
2. **Logo:** no design in mind, so use a simple hand-written SVG (shield,
   teal line, red dot).
3. **Suggestion chips:** render them disabled until Unit 11.

## Verify when done

- [x] `/`, `/protect`, `/ops`, `/demo` and `/shop/aurora-anc` render;
      `/shop/unknown` shows the not-found page (HTTP 200, see Built).
- [x] Desktop: the customer app sits in a centred phone frame. At 390px width
      it is full-bleed with no horizontal scroll.
- [x] The tab bar switches between Home and Protect, and the active tab has
      the red underline.
- [x] No hex values in any component (`grep -rn "#[0-9A-Fa-f]\{6\}" components app --include=*.tsx`
      returns nothing).
- [x] Headings and balances use the serif display font; body text uses Geist.
- [x] Tab through the customer app: every interactive element shows the
      blue focus ring.
- [x] `formatAUD(108000)` returns `$1,080.00`, and `toCents('1,500')` returns
      `150000`.
- [x] `npm run build` and `npm run lint` pass. No console errors.

## Built (filled in after completion)

Sat 14 Nov.

- Built as specced. Primitives: `Button`, `Badge`, `RiskBadge`, `Card`,
  `Money`, `Logo` in `components/ui/`, and `TabBar` in
  `components/customer/`. Added `lucide-react` (v1.x).
- **Icon names:** lucide v1 renamed some icons, so the current names are
  used: `CircleCheck` (was `CheckCircle2`), `TriangleAlert` (was
  `AlertTriangle`), `OctagonX` (was `XOctagon`), and `House` for the Home tab.
  `ui-context.md` is updated to match.
- **Unknown shop ids:** `notFound()` renders the not-found page, but the HTTP
  status is 200 because the page streams. `dynamicParams = false` would
  give a real 404, but it isn't allowed with `cacheComponents` (build error).
  This isn't on the golden path, so it's accepted.
- The footer sits under the tab bar inside the phone frame, at 10px, so it
  doesn't take space from the chat.
- Checked with headless Chrome screenshots at 1280px (phone frame), 390px
  (full-bleed, no horizontal scroll), `/ops` and `/demo` at 1920×1080. The
  focus ring is a global `:focus-visible` rule; keyboard tabbing wasn't
  recorded on video.
