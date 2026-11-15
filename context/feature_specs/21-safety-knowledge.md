# 21 — Safety knowledge base (RAG)

Status: done

## Goal

The assistant answers safety questions from a small, curated knowledge base
instead of making things up. Right after emergency protection, it adds the
guidance: the bank will never ask for a security code, and Alex should
contact the bank through the number on the card or in the app. **Golden-path
step 14 works online and offline.**

## Depends on

- 09 (agent and tools), 10 (fallback), 14 (untrusted-content wrapping and
  the scanner), 20 (step 13 comes right before).

## Golden-path steps unlocked

- **Step 14:** after the Emergency Protection card, the reply includes
  "We will never ask for your security code…" and how to contact the bank,
  with a source line under it.
- Also: "Why was my payment blocked?" explains the stored reason and cites
  the relevant doc.

## Build

- **`lib/ai/knowledge.ts`** (pure, tested): 5 short docs, each `{ id, title,
  keywords, body }`, written in plain Australian English and bank-neutral
  ("the bank", never a real brand):
  1. Recognising impersonation scams
  2. What we'll never ask for (codes, PINs, passwords, remote access, moving
     money to a "safe account")
  3. Protecting a lost or compromised card
  4. Why a payment might be held or blocked
  5. How to report suspected fraud (the number on the back of your card or
     in the app; never a number from a call or message)

  `searchSafety(query)` scores keyword overlap (title + keywords + body
  words, stop-words removed) and returns the top 2 with a score above 0.
- **Tool `search_safety_guide({ query })`** (read): returns the top 2 docs
  wrapped as `<untrusted_content source="safety-guide:ID">…` after the
  content scanner (architecture: knowledge docs are wrapped and scanned and
  never grant permissions). It adds a `{ type: 'sources', items: [title] }`
  chat card, so the reply shows "From our safety guide: …".
  It also returns `latestBlocked`, the newest blocked or held action from
  the last hour with its stored reasons, so "Why was my payment blocked?"
  can cite the real reason.
- **Prompt:** after `report_account_compromise`, also call
  `search_safety_guide` in the same turn and add one or two sentences of
  guidance. For any safety or "why was this blocked" question, search first
  and answer only from the results.
- **Offline:** after the emergency reply, the fallback appends the fixed
  guidance from doc 2 + 5 and the same sources card. Questions with "scam",
  "safe", "blocked", "held", "why" or "fraud" (and no compromise trigger)
  → `search_safety_guide`, and the reply is the top doc's first two
  sentences.
- **`SourcesCard`**: a quiet line under the reply, `BookOpen` icon, "From our
  safety guide: What we'll never ask for · How to report suspected fraud".

## Not in this unit

- Embeddings or a vector DB (cut). Editing docs from the console. The
  Protect tab (Unit 22).

## Clarify before building

Answered by the developer, Sun 15 Nov: all four proposals accepted.

1. Step 14 in the same turn as step 13.
2. Bank-neutral copy, no real numbers or brand.
3. A visible sources line under the reply.
4. `latestBlocked` inside `search_safety_guide` (one new read-only tool).

## Verify when done

- [x] `knowledge.test.ts`: the step-12 sentence ranks "What we'll never ask
      for" in the top 2; "Why was my payment blocked?" ranks doc 4 first;
      nonsense → no results.
- [x] Online and offline after steps 10–13: the guidance about never asking
      for a code and contacting via the card or app appears in the same
      turn, with the sources line.
- [x] After step 16, "Why was my payment blocked?" → names the R1 reason
      (outgoing payments paused) and cites doc 4.
- [x] "How do I spot a scam?" → doc 1 guidance, protection **not** turned on.
- [x] Doc text goes to the model wrapped as untrusted content.
- [x] `npm test`, `npm run build` and `npm run lint` pass. Deployed and
      checked on the public URL.

## Built (filled in after completion)

Sun 15 Nov.

- `lib/ai/knowledge.ts`: 5 docs and `searchSafety()` (keyword hit 3, title
  word 2, body word 1; stop-words removed; top 2 with score > 0). 5 tests,
  including one that checks **no doc trips the content scanner**. The copy
  says "will not ask" rather than "never ask", which is a scanner pattern.
- `search_safety_guide` tool: docs wrapped as `<untrusted_content
  source="safety-guide:ID">` after `scan()`, plus `latestBlocked`. One
  `sources` card per turn → `SourcesCard` ("From our safety guide: …",
  `BookOpen`).
- Offline: the compromise trigger now also searches, and the reply appends
  the fixed `SAFETY_GUIDANCE`. Safety words (`scam`, `safe`, `blocked`,
  `held`, `why`, `fraud`, `suspicious`) search only when nothing else
  matched. "Why … blocked" also states the latest blocked payment's
  reason. 60 tests total.
- Verified in headless Chrome, online and offline: step 14 guidance
  ("never asks for your security code … number on the back of your card or
  in the app") + sources in the same turn as the Emergency card; after step
  16, "Why was my payment blocked?" → the R1 reason + doc 4; "How do I spot
  a scam?" → doc 1 with protection **not** turned on.
