# 08 — Trust Receipt and PIN dialog

Status: draft

## Goal

A prepared action appears on Home as a Trust Receipt. Alex approves it in the
simulated device check (PIN dialog), the receipt collapses to "Completed",
and the balances update immediately. This is the full step 3–4 experience,
triggered by a temporary dev panel until the chat exists.

## Depends on

- 04 (Home, `useCustomerState`), 06 (prepare), 07 (approve and cancel).

## Golden-path steps unlocked

- **Steps 3–4 on screen**, with the receipts triggered by the dev panel
  instead of the assistant (Unit 11 swaps that in).

## Build

- **`components/ui/Dialog.tsx`**: wraps native `<dialog>` with
  `showModal()` / `close()`. Esc and the backdrop close it. Focus goes
  inside on open and returns on close.
- **`components/customer/TrustReceipt.tsx`** (`'use client'`). It takes the
  `PreparedAction` returned by `prepareTransfer` plus callbacks. Its states
  follow `ui-context.md` → Trust Receipt:
  - **`pending_approval`:**
    - a teal header "TrustPath · Trust Receipt" with a `RiskBadge`
    - the type icon (`ArrowRightLeft` for a transfer, `Zap` for a biller)
    - the amount in `text-2xl`
    - To / From lines
    - teal-ticked checks: "Requested by you", "Recipient is yours" or
      "Saved payee", "Funds available"
    - a warning line for each reason, such as the unverified payee
    - the "Why it can proceed" sentence
    - Cancel (secondary) and "Approve with PIN" (primary) buttons
    - the footer "Simulated device check · expires at 2:24 pm"
  - **`blocked`:** `risk-critical` border and header, title "Blocked",
    `OctagonX`, the reasons, no buttons.
  - **`held`:** a `risk-high` note "Held for review by our team" with the
    reasons, no buttons.
  - **`completed`:** one line, "✓ $300.00 to Goal Saver · Completed 2:14 pm".
  - **`cancelled` / `expired`:** one muted line.
- **`components/customer/PinDialog.tsx`**: built on `Dialog`. Contents:
  - title "Verify on this device"
  - the action summary line
  - one `inputMode="numeric"` password field (4 digits, autofocus)
  - Cancel and Verify buttons
  - the caption "Simulated device check. Production would use passkeys."

  Verify calls the approve route. Errors show inline (`BAD_PIN` →
  "That PIN didn't match. Try again."). `TOO_MANY_ATTEMPTS` and 409s close
  the dialog and update the receipt's status. The PIN is never stored.
- **`HomeScreen`:**
  - Keeps a local list of receipts in the chat area.
  - The receipt status is refreshed from `state.actions` on each poll (so
    expiry and cancellation show up), and set straight to `completed` after
    a successful approve.
  - After approving, it applies the returned balances immediately (through a
    `setAccounts` helper on `useCustomerState`).
- **Temporary dev panel** (`components/customer/DevPanel.tsx`):
  - rendered only when `process.env.NODE_ENV !== 'production'`
  - the demo key is entered once and kept in `sessionStorage`
  - 3 preset buttons that call `/api/dev/prepare-transfer`:
    - "Act 1: $300 → savings"
    - "Act 1: $120 → electricity"
    - "Hijack: $500 → J. Smith"
  - Marked `ponytail:`; deleted in Unit 11 together with the dev route.

## Not in this unit

- Chat messages and the assistant (Units 09–11). Purchase receipts (Unit 15).
- Motion beyond the token rules (fade-in on new receipts only).

## Clarify before building

1. **Dev panel on Home** with 3 preset buttons, visible only in `next dev`.
   OK?
2. **"Why it can proceed" sentence**, built from the checks. Examples:
   "You asked for this, Goal Saver is your own account, and the money is
   there." / "You asked for this, BrightSpark Energy is a saved, verified
   biller, and the money is there." OK?
3. **Expiry line:** a fixed "expires at 2:24 pm" rather than a live
   countdown. It's simpler and reads fine on camera. OK?
4. **After approval:** apply the returned balances instantly; the next poll
   confirms them. OK?

## Verify when done

In `next dev`, after a reset:

- [ ] "Act 1: $300 → savings" shows a low-risk receipt with three teal
      checks and the why sentence. Approve with `1234`, and the receipt
      collapses to "✓ $300.00 to Goal Saver · Completed …". Balances show
      $1,200.00 / $4,500.00 **immediately**.
- [ ] "$120 → electricity" + approve → Everyday $1,080.00 (golden-path
      numbers).
- [ ] The hijack button shows a red "Blocked" receipt with "This instruction
      didn't come from you." and no buttons.
- [ ] A wrong PIN shows the inline error and the receipt stays pending; the
      3rd wrong PIN closes the dialog and the receipt shows cancelled.
- [ ] Cancel on a receipt → muted "Cancelled" line.
- [ ] Keyboard only: Tab reaches Approve, Enter opens the dialog with focus
      in the PIN field, Esc closes it and focus returns to Approve.
- [ ] At 390px everything fits with no horizontal scroll. Screenshot each
      receipt state.
- [ ] `next build` + `next start`: no dev panel rendered.
- [ ] `npm test`, `npm run build` and `npm run lint` pass. No console errors.

## Built (filled in after completion)

-
