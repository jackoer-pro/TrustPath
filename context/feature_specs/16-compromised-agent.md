# 16 — Simulated compromised agent

Status: done

## Goal

Prove the second layer of hijack protection on demand. A demo-only route
pretends the AI was fully taken over and sends the hijacked "$500 to J.
Smith" call straight into `prepareTransfer()`. The trust engine blocks it
deterministically (no customer words → R2, and an unknown payee → R3), and an
`injection_blocked` incident (high) is created. This makes the block
reliable on camera regardless of how the real model behaves.

## Depends on

- 06 (`prepareTransfer`, the R2 incident), 03 (demo key).

## Golden-path steps unlocked

- The fallback for step 6 ("if the LLM tries the $500 transfer anyway") and
  the evaluation case "Simulate compromised agent button". The `/demo`
  button that calls it comes in Unit 26.

## Build

- **`lib/demo/compromised-agent.ts` → `simulateCompromisedAgent()`**:
  - Calls `prepareTransfer({ to: 'J. Smith', amountCents: 50000,
    userMessages: [], origin: 'simulated_compromised_agent' })`.
  - The empty `userMessages` is the point: a hijacked agent has no customer
    words behind it.
  - Returns the blocked `PreparedAction` and the incident id.
- **`POST /api/demo/compromised-agent`**: `return checkDemoKey(req) ??
  run(simulateCompromisedAgent)`.
- **Customer app:** a blocked action with origin
  `simulated_compromised_agent` that shows up in `/api/customer/state`
  appears in the chat as a red **Blocked** receipt. It has a small label
  "Simulated compromised agent" and an assistant line: "Something tried to
  send $500 to J. Smith without you asking. I blocked it." This needs
  `toName` (the recipient label) in the state API's action rows. See
  question 2.

## Not in this unit

- The `/demo` control panel button (Unit 26). The console view of the
  incident (Unit 23).

## Clarify before building

Answered by the developer, Sun 15 Nov: all four proposals accepted.

1. No customer words (`userMessages: []`).
2. The attempt shows in the customer's chat as well as in the console.
3. It's labelled "Simulated compromised agent".
4. Every click is a new attempt and incident; reset clears them.

## Verify when done

After a reset:

- [x] `POST /api/demo/compromised-agent` without the key → 401; with it → 200
      with `status: 'blocked'`. The reasons include "This instruction didn't
      come from you." and "New payees can't be added by the assistant."
- [x] One `injection_blocked` incident (severity **high**, contained),
      linked to the action by `action_id`, plus audit rows (`system /
      action.prepared`, `trust_engine / action.assessed`, `trust_engine /
      incident.created`).
- [x] No balance changes, and nothing is approvable.
- [x] The customer app shows the red Blocked card with the simulation label
      within about 2 s, with no reload.
- [x] `npm test`, `npm run build` and `npm run lint` pass. Deployed and
      checked on the public URL.

## Built (filled in after completion)

Sun 15 Nov.

- `lib/demo/compromised-agent.ts` and `POST /api/demo/compromised-agent`
  (demo key). They go through the normal `prepareTransfer()`, so the block is
  the real trust engine, not a special case.
- **Customer app:** simulated attempts are **derived from the 2 s state poll**
  (no extra effect or state) and merged into the thread by timestamp.
  `ChatMsg` gained `at` and an optional `label`. The red pill reads
  "Simulated compromised agent". These messages are never sent to the model
  as history.
- Verified live (production build, Supabase): 401 without the key; 200 →
  `blocked` with both R2 and R3 reasons; 1 **high** `injection_blocked`
  incident linked by `action_id`; audit rows for `system` and
  `trust_engine`; approving it → 409; balances unchanged. In the browser the
  card appeared on an open app in **about 1 s** with no reload, chat
  continues normally, reset clears it, and there were no console errors.
