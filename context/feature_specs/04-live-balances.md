# 04 — Live balances on Home

Status: draft

## Goal

Home shows the real balances from Supabase and keeps them fresh by polling,
so a change anywhere (approval, reset) appears within about 2 seconds.

## Depends on

- 01 (Home layout), 03 (`GET /api/customer/state`).

## Golden-path steps unlocked

- **Step 1:** Alex opens Home and sees Everyday $1,500.00 and Goal Saver
  $4,200.00, from the database.
- Step 19 becomes visible: after "Reset demo", Home snaps back within 2 s.

## Build

- `components/customer/useCustomerState.ts` (`'use client'` hook):
  - fetches `/api/customer/state` on mount, then every 2 s
  - skips a tick while the browser tab is hidden
  - returns `{ state, error }`, where `state` is the last good
    `CustomerState` (type imported from `lib/banking/state.ts` with
    `import type`)
  - never throws
  - Later units (receipts, alerts, Protect tab) reuse this hook.
- `components/customer/AccountSummary.tsx`: the account chips from Unit 01,
  moved out of the page. Props are `accounts` (plain data). Each chip shows
  the name, the balance in the display font and `•••• 5678` in muted text.
- `app/(customer)/page.tsx`:
  - Becomes a thin page rendering a new client component
    `components/customer/HomeScreen.tsx`.
  - `HomeScreen` uses the hook and renders `AccountSummary` plus the
    existing static chat area (still disabled until Unit 11).
- **Loading:** two chip-shaped placeholders in `bg-sunken` (no spinner).
- **Error:** keep showing the last good balances, plus a small muted line
  "Reconnecting…" under the chips. If there has never been a good response,
  show "Can't load your accounts right now."

## Not in this unit

- The Protect tab going live (Unit 22) and the notification bell (Unit 19).
- Recent transactions on screen. They aren't on the golden path; the
  assistant reads them in Unit 09.
- Any motion beyond the existing token rules.

## Clarify before building

1. **Polling while the tab is hidden.** Proposed: pause it, so a forgotten
   tab doesn't hammer Supabase. It resumes instantly when the tab is shown.
   OK?
2. **Last four digits on the chips** (`•••• 5678`). Proposed: yes, small and
   muted, like a real banking app. Or name and balance only?
3. **Error copy.** "Reconnecting…" and "Can't load your accounts right now."
   OK?

## Verify when done

- [ ] Home shows $1,500.00 and $4,200.00 from the DB (change a balance in the
      Supabase table editor and it updates within 2 s; then reset).
- [ ] `POST /api/demo/reset` puts Home back within 2 s, with no reload.
- [ ] Network tab: one request every 2 s; none while the tab is hidden.
- [ ] Stop the dev server: the balances stay and "Reconnecting…" appears.
      Start it again and the note disappears.
- [ ] The first paint shows placeholders, not $0.00.
- [ ] `npm run build` and `npm run lint` pass. No console errors.

## Built (filled in after completion)

-
