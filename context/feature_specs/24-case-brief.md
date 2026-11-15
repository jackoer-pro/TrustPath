# 24 — AI case brief

Status: done

## Goal

When the specialist opens an incident in the console, they see a short
AI-written case brief: what happened, the related card event or action, the
measures taken and a suggested next step. The brief is written **after**
the decision and can never change it; if the AI is down, a template brief
is used. **Golden-path step 17 works online and offline.**

## Depends on

- 23 (console and incident selection), 18 / 20 / 14 (the three incident
  sources), 09 (`chat()` with JSON mode).

## Golden-path steps unlocked

- **Step 17:** the specialist opens the account-compromise incident and
  reads the brief, with the Nova event, the five measures and a next step.

## Build

- **`lib/ai/case-brief.ts`** (`server-only`):
  - `buildFacts(incidentId)` loads the incident, its card event or action,
    linked incidents (same profile, last hour) and the customer's
    notification response. These facts are all the model sees.
  - `templateBrief(facts)` (pure, tested): deterministic JSON from the facts.
  - `writeCaseBrief(incidentId)`: DeepSeek JSON mode (`response_format:
    json_object`; the prompt contains the word "json" and an example) →
    validated with Zod as `{ summary, timeline: string[], measures:
    string[], nextStep, source: 'ai' | 'template' }`. Any failure (no key,
    timeout, blank or invalid JSON) → the template. It writes **only**
    `incidents.ai_brief` (JSON text), plus an audit row (`ai_agent`,
    `incident.brief_written`).
- **Triggers**, all through `after()` from `next/server` so the response
  isn't delayed and the decision is already committed:
  - `POST /api/simulate/card-authorization` (when an incident was created).
    The route calls it, not `lib/fraud`, which keeps invariant 7 (fraud
    never imports `lib/ai`).
  - `/api/chat` after `report_account_compromise` (rewritten on
    escalation) and after an injection incident.
  - `POST /api/demo/compromised-agent`.
- **`components/ops/IncidentDetail.tsx`** (replaces the stub):
  - header: severity, title, case number, status, time.
  - the brief: summary, timeline, measures, **next step**, with a label
    "AI-generated summary · decisions are made by the rules engine" (or
    "Template summary · AI unavailable").
  - "Writing case brief…" while `ai_brief` is null.
  - the related card event (merchant, amount, decision, reasons) or action.
  - the raw description and measures underneath.
- `getOpsState()` parses `ai_brief` JSON (bad JSON → treated as missing).

## Not in this unit

- The "Mark investigated" and "Lift restrictions & unlock card" buttons
  (Unit 25).

## Clarify before building

Answered by the developer, Sun 15 Nov: all four proposals accepted.

1. Written in the background with `after()`.
2. Briefs for all three incident types; rewritten on escalation.
3. Stored as JSON in `ai_brief` (no migration).
4. The model sees only assembled facts; the template on any failure.

## Verify when done

- [x] `case-brief.test.ts`: the template for each incident type includes
      the event or action, the measures and a next step.
- [x] Online: Nova → within about 5 s the incident has an AI brief naming
      the $3,580 Nova attempt, the reasons and a next step; the card-auth
      response time is unchanged.
- [x] Steps 12–13 → the account-compromise brief mentions the shared code,
      the Nova event and the five measures.
- [x] Offline (no key) → template briefs, labelled as such.
- [x] The decision, card status and measures are identical with and
      without the brief (the brief only writes `ai_brief`).
- [x] `lib/fraud/**` still never imports `lib/ai` (grep).
- [x] `npm test`, `npm run build` and `npm run lint` pass. Deployed and
      checked on the public URL.

## Built (filled in after completion)

Sun 15 Nov.

- `lib/ai/case-brief-template.ts` (pure: `CaseBrief`, `CaseFacts`,
  `templateBrief()`, 3 tests → 63 total) and `lib/ai/case-brief.ts`
  (`buildFacts`, `writeCaseBrief` which never throws, `parseBrief`).
  `IncidentDetail` replaces the stub; `getOpsState()` now returns `brief`
  and the related `action`.
- **Triggers via `after()`:** card authorisation (when an incident was
  created), `/api/chat` (emergency and shield cards), the compromised-agent
  route, and also **`/api/notifications/[id]/respond`** (the customer's
  answer changes the next step). `respondToNotification` now returns
  `incidentId`. `lib/fraud` still imports nothing from `lib/ai`.
- **Facts stay authoritative:** `measures` always come from the incident
  record (the model shortened them in testing), and the model gets the
  template's `suggestedNextStep` to word (its own next step after "it
  wasn't me" was vague).
- Verified online and offline: Nova → AI brief in about 3 s (template in
  0.7 s offline); after deny → rewritten, "keep the card locked, issue a
  replacement card…"; steps 12–13 → the brief mentions the shared code, the
  Nova event and all 5 measures; `/ops` shows the brief with "AI-generated
  summary · decisions are made by the rules engine" or "Template summary ·
  AI unavailable". The decision, card lock and measures are unchanged.
