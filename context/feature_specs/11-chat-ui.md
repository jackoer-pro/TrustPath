# 11 — Chat UI

Status: draft

## Goal

Alex types to TrustPath on Home and gets replies with Trust Receipts inline,
online or offline. **Golden-path Act 1 (steps 1–4) runs end to end in the
browser.** The temporary dev panel and dev route are removed.

## Depends on

- 08 (receipts, PIN dialog), 10 (`/api/chat` with fallback).

## Golden-path steps unlocked

- **Act 1, steps 1–4**, by typing the real payday message.

## Build

- **`components/customer/ChatThread.tsx`**:
  - Renders messages in order. Customer bubbles are navy and right-aligned;
    assistant bubbles are surface-coloured with the `Bot` avatar.
  - Each assistant message's cards (`TrustReceipt`) render directly under
    it.
  - `aria-live="polite"`.
  - Auto-scrolls to the newest message or card (carried over from Unit 08).
- **`components/customer/ChatInput.tsx`**:
  - A text field plus the Send button. Enter sends; empty or whitespace-only
    input is ignored; maximum 2,000 characters.
  - Disabled while a reply is pending.
- **Suggestion chips** (empty chat only): "Show my balance", "Pay a bill",
  "Move money to savings" and "I think I've been scammed". Tapping one
  sends it as a message.
- **Typing indicator** while waiting: an assistant bubble saying "Checking…"
  with three animated dots (static under `prefers-reduced-motion`).
- **Offline badge:** when `offline: true`, a small muted pill "Offline
  assistant" under that assistant message.
- **`HomeScreen`:**
  - Owns `messages`: `{ role, content, cards?, offline? }[]`.
  - Sends the last 12 `{ role, content }` pairs to `/api/chat`.
  - Receipt status, PIN dialog, cancel and instant balances work as in
    Unit 08, now keyed by the cards attached to messages.
  - Network or 5xx error: an assistant bubble saying "I couldn't reach the
    bank just now. Please try again." The customer's message stays.
- **Delete:** `components/customer/DevPanel.tsx` and
  `app/api/dev/prepare-transfer/` (`ponytail:` debt from Units 06–08).

## Not in this unit

- The "Was this you?" alert context (Unit 19), the emergency card (Unit 20)
  and the shield card (Unit 14).
- Persisting chat across reloads.

## Clarify before building

1. **Chat history lives in memory only.** A reload or "Reset demo" plus a
   reload starts a fresh chat. It's simplest, and a clean take every time.
   OK, or keep it in `sessionStorage` across reloads?
2. **Suggestion chips send immediately** on tap (e.g. "Pay a bill" → the
   assistant asks which bill and how much). OK, or should they just fill the
   input?
3. **Typing indicator text "Checking…"**, which hints at the trust layer.
   OK?
4. **Offline badge wording "Offline assistant".** OK?

## Verify when done

In the browser (Chrome, 390px), after a reset:

- [ ] **Online:** type the payday message → reply + two low-risk receipts.
      Approve both with the PIN → Everyday $1,080.00, Goal Saver $4,500.00,
      both receipts show "Completed".
- [ ] **Offline** (`DEEPSEEK_API_KEY` unset): the same flow works, with the
      "Offline assistant" badge.
- [ ] A chip sends its text; the chips disappear once the chat has started.
- [ ] Input is disabled while waiting, the typing indicator shows, and the
      thread scrolls to the newest card.
- [ ] "Send Mum some money" → "How much…?" → "$200" → a receipt (history
      sent correctly).
- [ ] Server stopped mid-chat → the error bubble; the next message works
      after a restart.
- [ ] Keyboard only: type, Enter to send, Tab to Approve, PIN, Enter.
- [ ] `DevPanel` and `/api/dev/*` are gone (`grep` finds nothing).
- [ ] `npm test`, `npm run build` and `npm run lint` pass. No console errors.

## Built (filled in after completion)

-
