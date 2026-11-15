# 23 — Bank console lists

Status: draft

## Goal

The bank's fraud team sees what's happening live: card events with their
decision and reasons, incidents by severity, and the audit log, all
updating within 3 s with no reload. **Golden-path steps 8 and 11 are
visible in `/ops`.**

## Depends on

- 18 (card events), 20 (emergency incidents), 14 (injection incidents), 03
  (audit rows).

## Golden-path steps unlocked

- **Step 8:** "Injection blocked" (medium) appears in Incidents after the
  headphone purchase.
- **Step 11 (console half):** "Nova Electronics Online $3,580.00 DECLINED"
  appears in Live card events with its reasons, and the card-fraud incident
  appears in Incidents.

## Build

- **`lib/ops/state.ts` → `getOpsState()`** (`server-only`, read only):
  - the latest 50 card events (newest first) with the card's last four
  - all incidents, newest first, with `severity`, `status`, `title`,
    `measures`, `card_event_id`, `action_id`, `ai_brief`, `reviewed_by`
  - the latest 50 audit rows
  - stats: declined events today, incidents not investigated, injection
    incidents
- **`GET /api/ops/state`** (`await connection()` first) → `run(getOpsState)`.
- **`components/ops/useOpsState.ts`**: 2 s poll, pauses while hidden (same
  pattern as `useCustomerState`).
- **`CardEventList`**: time, merchant, amount, channel, a decision badge
  (APPROVED green / DECLINED critical / REVIEW medium), "Card locked" when
  `card_action` locked it, and the reasons (staff wording) on a second line.
- **`IncidentList`**: severity dot + label, title, type, status, case number
  (same as the customer's), time. Clicking selects it (the detail panel is
  Unit 24); the selection is kept across polls.
- **`AuditLog`**: monospace, newest first, an actor chip per row
  (`customer`, `ai_agent`, `trust_engine`, `fraud_engine`, `bank_staff`,
  `system`, each with its own colour), action, entity, short details.
- **Stat pills** in the header (Declined · Open · Injection) and the **fade-in
  highlight**: rows that weren't in the previous poll fade in with a 1 s
  `risk-*-bg` highlight matching the decision or severity.
- Desktop layout from `ui-context.md` (≥ 1280 px): navy sidebar, events and
  incidents side by side, audit log below. At narrower widths the columns
  stack.

## Not in this unit

- Incident detail, the AI case brief (Unit 24). Mark investigated and
  lift/unlock (Unit 25). The `/demo` harness (Unit 26).

## Clarify before building

1. **`/ops` and `GET /api/ops/state` stay open, with no demo key**
   (`architecture.md`: "`/ops` is open in the demo"), so judges can open the
   console from the public URL. It's read-only and all data is mock. The
   staff actions in Unit 25 will need the demo key. OK?
2. **Customer-visible card numbers only** (last four), never full ids, in
   the console. OK?
3. **The audit log shows the latest 50 rows**, with no paging or filters.
   OK?
4. **The highlight is computed client-side** by diffing ids between polls
   (no "new" flag in the DB). The first load highlights nothing. OK?

## Verify when done

- [ ] After a reset: 15 approved seed events, no incidents, stat pills 0 /
      0 / 0.
- [ ] Headphone purchase (steps 5–7) → "Injection blocked" (medium)
      appears within 3 s, highlighted; Injection pill 1.
- [ ] Nova (step 10) → DECLINED with "Card locked" and the three reasons
      appears within 3 s; Declined 1; the card-fraud incident is listed.
- [ ] Steps 12–13 → the critical "Possible account compromise" incident;
      the audit log shows `customer`, `ai_agent` and `fraud_engine` rows.
- [ ] Selecting an incident survives the next poll.
- [ ] 1280 px wide: no horizontal scroll; 390 px: columns stack.
- [ ] `npm test`, `npm run build` and `npm run lint` pass. Deployed and
      checked on the public URL.

## Built (filled in after completion)

-
