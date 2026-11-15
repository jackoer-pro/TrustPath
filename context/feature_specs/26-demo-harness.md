# 26 — Demo harness

Status: draft

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

1. **Reset reloads both iframes**, because the customer chat lives in the
   page's memory and would otherwise still show the last take. OK?
2. **One key for everything:** the harness key field and the console's
   staff key share the same tab storage, so you type it once. OK?
3. **Migration `0002_seed_times.sql`** (security-sensitive: migrations)
   replaces `reset_demo()` only to spread the seed card times over 14 days.
   You'd run it in the Supabase SQL editor, like 0001. OK?
4. **Phone scale ×1.2** (about 1032 px tall in a 1080 recording), and the
   staggered ticks on the Emergency card. OK?

## Verify when done

- [ ] At 1920×1080: three columns, no scrollbars on the page, the phone
      about 1030 px tall and readable.
- [ ] Without the key, the buttons answer 401 in the response box; with it,
      each works and the iframes update within 3 s.
- [ ] The full golden path (steps 1–18) runs from `/demo`, online and
      offline.
- [ ] "Reset demo" → seed state in under 3 s; both iframes are back to step
      1 (empty chat, Protected, no incidents).
- [ ] After migration 0002: the console shows the seed events on different
      days; the fraud tests still pass (the average is unchanged).
- [ ] `npm test`, `npm run build` and `npm run lint` pass. Deployed and
      checked on the public URL.

## Built (filled in after completion)

-
