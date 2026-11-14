# 05 — Trust engine (pure)

Status: draft

## Goal

The deterministic rules that decide whether an action may proceed exist as
pure functions, with tests proving every rule. Nothing calls them yet. Unit
06 wires them into `prepareTransfer()`.

## Depends on

Nothing in code. It's pure TypeScript, with no DB and no framework imports.

## Golden-path steps unlocked

None directly. These rules are what make steps 3, 6, 7 and 16 trustworthy.

## Build

All files in `lib/trust/`. Use relative imports with the `.ts` extension, no
`@/`, and string-literal unions (no `enum`).

- **`provenance.ts`**
  - `normaliseMessages(messages: string[]): string`: lower-cases the text
    and converts word-numbers to digits ("two hundred" → "200", "one
    thousand five hundred" → "1500").
  - `amountMentioned(cents, text)`: matches `$300`, `300`, `300.00` and
    `1,500`, as whole numbers only (`300` must not match inside `3000`).
  - `recipientMentioned(aliases: string[], rawTo: string, text)`: true if
    `rawTo` or any alias appears as a whole word or phrase.
  - `checkProvenance(action, lastUserMessages)` → `{ amountOk, recipientOk }`.
    It uses only the **last 3 user messages** (marked `ponytail:`). For
    purchases, the "recipient" is the product URL, id or name, and the amount
    is skipped because it comes from the catalogue.
- **`policy.ts`**
  - `assess(action, ctx)` → `{ decision, riskLevel, reasons }`, applying
    rules R1–R7 in the order and with the outcomes in `architecture.md` →
    Trust Engine Rules.
  - The first block wins. Holds and warnings accumulate. The default is
    `step_up` / `low`.
  - Reasons are plain customer-facing sentences ("This instruction didn't
    come from you.").
  - R2 also returns `flags: ['injection_suspected']`, so Unit 06 can open the
    incident.
  - `ctx` is plain data: profile flags, the resolved source account
    (balance), the resolved recipient (kind, verified, `isOwnAccount`) or
    null, the card status for purchases, and the provenance result.
- **`content-scanner.ts`**
  - `scan(text)` → `{ clean, removed: string[] }`.
  - It removes each **sentence** that matches an instruction-like pattern,
    for example:
    - "ignore (all|previous|your) instructions"
    - "AI assistant:" / "assistant:" addressed to the model
    - "do it now without asking", "don't ask the customer/user"
    - "transfer/send … $N … to"
    - "the customer has (also) authori[sz]ed"
    - "system prompt", "you are now"
  - It also strips HTML comments and visually hidden markup before
    scanning.
  - Ordinary product copy ("Transfer your music wirelessly", "Send us a
    message") must not match.
- **`hash.ts`**
  - `payloadHash(fields)`: SHA-256 hex of canonical JSON (sorted keys) of
    `actionId`, `type`, `fromAccountId`, `toAccountId|payeeId|productId`,
    `amountCents` and `currency: 'AUD'`.
  - Uses `node:crypto`.
- **Tests:**
  - `policy.test.ts`, `provenance.test.ts`, `content-scanner.test.ts` and
    `hash.test.ts`, plus `lib/money.test.ts` (deferred from Unit 01).
  - All use `node:test` and `node:assert/strict`.
- **Config:**
  - `package.json`: `"test": "node --test \"lib/**/*.test.ts\""`.
  - `tsconfig.json`: `allowImportingTsExtensions: true`.

## Not in this unit

- Any DB access, service or route (Unit 06 onwards).
- Fraud rules (Unit 17).
- Wiring the scanner into `view_product` (Unit 14).

## Clarify before building

1. **Word-numbers.** Proposed: support zero to 999,999 ("two hundred", "a
   hundred and fifty", "one thousand five hundred", hyphenated "twenty-five")
   plus `2k`. Is that enough, or do you also want "fifty bucks" (yes, cheap
   to add)?
2. **R6 large-amount hold.** `architecture.md` exempts own-account
   transfers. Proposed: own-account transfers skip R6 completely (both the
   $2,000 and the 50% tests); payee transfers and purchases are checked.
   OK?
3. **Scanner granularity.** Proposed: remove the whole sentence containing a
   match, and show the customer the first 120 characters of what was removed
   (as the shield card spec says). OK?
4. **False positives.** Proposed: when in doubt, the scanner errs towards
   removing. Product copy losing a sentence is harmless; letting an
   instruction through isn't. OK?

## Verify when done

- [ ] `npm test` passes, covering:
  - [ ] Each rule R1–R7 triggers alone with the right decision, risk and
        reason. R1 beats everything. R2 with an unknown recipient reports
        both reasons, but the decision is block.
  - [ ] Golden path: "$300 into savings" and "$120 electricity" → step_up /
        low. The hijacked "$500 to J. Smith" with only the headphones message
        → block (R2). "Send $10,000 to a new recipient urgently" → block (R3),
        with R6 also listed.
  - [ ] Provenance accepts "two hundred" for 20000 cents and "1,500" for
        150000. It rejects `300` inside `3000` and an amount mentioned 4
        messages ago.
  - [ ] The scanner removes the exact headphones hidden instruction (in an
        HTML comment and in a hidden span) and keeps normal product copy.
  - [ ] The hash is identical for the same fields in any key order and
        changes when any field changes.
  - [ ] `toCents` / `formatAUD` cases.
- [ ] `lib/trust/*` imports nothing from `next`, `@supabase`, `@/` or
      `lib/db`.
- [ ] `npm run build` and `npm run lint` pass.

## Built (filled in after completion)

-
