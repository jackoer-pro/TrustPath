# 16 — Simulated compromised agent

Status: draft

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

1. **No customer words** (`userMessages: []`), so R2 always fails. Proposed:
   yes. That's exactly the "agent acting on its own" case.
2. **Show it in the customer's chat** (proposed) or only in the bank
   console? Showing a red Blocked card on the phone while the incident lands
   in the console is the most visual for the split-screen video. OK?
3. **Label:** the Blocked card carries "Simulated compromised agent" so it's
   clearly a simulation (invariant 11). OK?
4. **Each click is a new attempt:** a new blocked action plus a new incident,
   with no deduplication. Reset clears them. OK?

## Verify when done

After a reset:

- [ ] `POST /api/demo/compromised-agent` without the key → 401; with it → 200
      with `status: 'blocked'`. The reasons include "This instruction didn't
      come from you." and "New payees can't be added by the assistant."
- [ ] One `injection_blocked` incident (severity **high**, contained),
      linked to the action by `action_id`, plus audit rows (`system /
      action.prepared`, `trust_engine / action.assessed`, `trust_engine /
      incident.created`).
- [ ] No balance changes, and nothing is approvable.
- [ ] The customer app shows the red Blocked card with the simulation label
      within about 2 s, with no reload.
- [ ] `npm test`, `npm run build` and `npm run lint` pass. Deployed and
      checked on the public URL.

## Built (filled in after completion)

-
