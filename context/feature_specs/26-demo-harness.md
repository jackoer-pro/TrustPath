# 26 — Demo harness

Status: done

## Goal

One page for filming the whole golden path at 1920×1080: the customer phone
(scaled up so it's readable on video), the bank console, and a control panel
with the four demo buttons. "Reset demo" puts everything back to step 1 in
under 3 seconds. **Step 19 passes and the full golden path runs from
`/demo`.**

## Depends on

- 16 (compromised agent), 18 (card authorisation), 25 (staff actions), 03
  (`/api/demo/reset`).

## Golden-path steps unlocked

- **Step 19:** "Reset demo" restores the seed state; both iframes reload to
  a clean screen.
- **Steps 1–18** can be filmed from this one page.

## Build

- **`app/demo/page.tsx` → `DemoHarness`** (client), three columns at
  1920×1080:
  - **Customer:** `/` in an iframe rendered at 420×860 and **scaled ×1.2**
    (CSS transform) to about 1032 px tall, inside the phone frame.
  - **Bank console:** `/ops` in the flexible middle column.
  - **Control panel** (280 px): the demo key field (shared with the
    console's staff key: same `sessionStorage` entry, since the iframes are
    same-origin), the four buttons, and the last response in monospace:
    1. **Inject card attempt ($3,580)** → `POST
       /api/simulate/card-authorization` (Nova, ecommerce)
    2. **Inject normal purchase ($14.50)** → Metro Café, in store
    3. **Simulate compromised agent** → `POST /api/demo/compromised-agent`
    4. **Reset demo** → `POST /api/demo/reset`, then reload both iframes;
       shows the time taken.
  - Each button is disabled while its request runs; errors (e.g. 401
    without the key) show in the response box.
- **Seed timestamps** (new migration `0002_seed_times.sql`, replacing
  `reset_demo()` only): the 15 approved card events are spread over the
  past 14 days instead of sharing one timestamp. Nothing else in the
  function changes.
- **Polish from earlier units:**
  - `EmergencyCard` ticks appear one by one (150 ms stagger,
    `ui-context.md`); reduced motion shows them all at once.
- A short **operator script** in `context/demo-script.md`: which button or
  message to use for each golden-path step, in order.

## Not in this unit

- Rehearsal, evaluation cases and the fix list (Unit 27).

## Clarify before building

Answered by the developer, Sun 15 Nov: all four proposals accepted.

1. Reset reloads both iframes.
2. One key for the harness and the console.
3. Migration 0002 approved, but turned out unnecessary (see Built).
4. Phone ×1.2 and staggered Emergency ticks.

## Verify when done

- [x] At 1920×1080: three columns, no scrollbars on the page, the phone
      about 1030 px tall and readable.
- [x] Without the key, the buttons answer 401 in the response box; with it,
      each works and the iframes update within 3 s.
- [x] The full golden path (steps 1–18) runs from `/demo`, online and
      offline.
- [x] "Reset demo" → seed state in under 3 s; both iframes are back to step
      1 (empty chat, Protected, no incidents).
- [x] ~~After migration 0002~~ Not needed: the seed events were already on
      different days (see Built); the console now shows their dates.
- [x] `npm test`, `npm run build` and `npm run lint` pass. Deployed and
      checked on the public URL.

## Built (filled in after completion)

Sun 15 Nov.

- `components/demo/DemoHarness.tsx` (`app/demo/page.tsx` renders it): phone
  iframe 420×860 scaled ×1.2 (1032 px) in a frame, `/ops` iframe, control
  panel with the four buttons and the response box (status + ms + JSON).
  A successful reset bumps a key that reloads both iframes.
- `components/ops/staffKey.ts`: one `sessionStorage` key for the harness
  and the console's staff key (`useSyncExternalStore` + the `storage`
  event, so typing it in the harness fills the console live).
- **No migration.** `reset_demo()` already spreads the seed card events over
  1–29 days; they only *looked* identical because the console showed time of
  day only, and every seed event is at the same hour. `clock()` now shows
  "12 Nov 05:47" for anything not from today.
- Console at harness width (~1000 px): two columns from `lg`, the sidebar
  only from `xl`, and event rows with merchant/amount/decision on line one
  and time/channel/card/reasons on line two (merchant names no longer
  truncate).
- `EmergencyCard` ticks rise in one by one (150 ms stagger,
  `animation-fill-mode: both`); reduced motion shows them at once.
- `context/demo-script.md`: the operator script, step by step.
- Verified in headless Chrome at 1920×1080, online and offline, driving both
  iframes: no page scroll, phone 1032 px; no key → 401; the key typed once
  reaches the console; Acts 1–4 (payday → $1,080, headphones → $951 + shield,
  simulated hijack, Nova → alert → deny → emergency → $50 blocked, case
  brief, mark investigated, lift & unlock); reset in 150–260 ms with both
  panes back to step 1. No console errors. The Unit 23 console check still
  passes (one assertion updated for the Unit 24 severity badge).
