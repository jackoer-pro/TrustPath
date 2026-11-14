# 11 — Chat UI

Status: done

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

Answered by the developer, Sat 14 Nov: all four proposals accepted.

1. Chat history lives in memory only.
2. Chips send immediately.
3. The typing indicator says "Checking…".
4. The offline badge says "Offline assistant".
5. **Laptop vs phone** (asked during clarification): keep the phone-shaped
   customer app, because the side-by-side phone + bank console is the
   story. Make it **bigger for recording** in Unit 26 by scaling the phone
   frame to the full 1080px height in `/demo`. Not a laptop redesign.

## Verify when done

In the browser (Chrome, 390px), after a reset:

- [x] **Online:** type the payday message → reply + two low-risk receipts.
      Approve both with the PIN → Everyday $1,080.00, Goal Saver $4,500.00,
      both receipts show "Completed".
- [x] **Offline** (`DEEPSEEK_API_KEY` unset): the same flow works, with the
      "Offline assistant" badge.
- [x] A chip sends its text; the chips disappear once the chat has started.
- [x] Input is disabled while waiting, the typing indicator shows, and the
      thread scrolls to the newest card.
- [x] "Send Mum some money" → "How much…?" → "$200" → a receipt (history
      sent correctly).
- [x] Server stopped mid-chat → the error bubble; the next message works
      after a restart.
- [x] Keyboard: typing + Enter sends (verified). The Approve → PIN → Enter
      keyboard path was verified in Unit 08 and is unchanged.
- [x] `DevPanel` and `/api/dev/*` are gone (`grep` finds nothing).
- [x] `npm test`, `npm run build` and `npm run lint` pass. No console errors.

## Built (filled in after completion)

Sat 14 Nov.

- `ChatThread`, `ChatInput` and the `HomeScreen` message state; deleted
  `DevPanel` and `/api/dev/prepare-transfer` (`.next/dev/types` cache
  cleared).
- **Bug found and fixed:** `useEffect(() => el.scrollIntoView(…))` crashed
  the page on send ("This page couldn't load"). In current Chrome,
  `scrollIntoView()` **returns a Promise**, and React treats an effect's
  return value as its cleanup. The effect now uses a block body (commented).
- Auto-scroll leaves the thread within its 16px bottom padding of the end;
  the newest card is fully visible.
- Verified in headless Chrome at 390px against live Supabase, in production
  builds, **online (`deepseek-v4-pro`) and offline**: Act 1 typed → 2 receipts
  → both approved → $1,080.00 / $4,500.00; the "How much…" follow-up; chips;
  the typing indicator and disabled input; the outage error bubble and
  recovery; no console errors or warnings.
- **Golden-path Act 1 (steps 1–4) passes end to end.**
