# AI Workflow Rules

## Approach

- Build TrustPath incrementally, against specs. The full unit list and the per-unit loop
  (spec → clarify → build → verify → record → next) are in
  `context/feature_specs/00-build-plan.md`.
- The context files define what to build, how it fits together and where
  the project stands.
- Each unit of work has a spec in `context/feature_specs/NN-name.md`. Implement
  exactly what the spec says, no more and no less.
- **The golden path in `project-overview.md` is the acceptance test.** A
  feature that isn't on the golden path or the evaluation list doesn't get
  built until the golden path works end to end.
- Time is the hardest constraint:
  - **Feature freeze is 12:00pm Tue 17 Nov.**
  - From then on, fix only bugs that would show up on camera.

## Scoping Rules

- Work on one unit at a time. Finish it, verify it, update the tracker, then
  move on.
- Prefer small, verifiable steps over large speculative changes.
- Do not combine unrelated system boundaries in one step. For example, don't
  change the DB schema and the chat UI together.
- Install a dependency only in the unit where it first does real work. The
  approved list is in `architecture.md`. Adding anything else needs an
  explicit instruction.
- Don't add features, options, settings or abstractions the spec doesn't ask
  for: no config for values that never change, and no interfaces with one
  implementation.

## When to Split Work

Split a step if it combines any of:

- A DB migration and UI work.
- More than one route handler with unrelated purposes.
- AI prompt/tool changes and trust-engine rule changes. They are reviewed
  separately because one is fuzzy and one is deterministic.
- Behaviour that isn't clearly defined in the context files.

If a change can't be verified end to end in about 10 minutes, the scope is too
broad. Split it.

## Handling Missing Requirements

- Do not invent product behaviour that isn't defined in the context files.
- If a requirement is ambiguous, pick the option that keeps the golden path
  simplest. Write the decision into the relevant context file and note it in
  `progress-tracker.md` under Architecture Decisions.
- If a requirement is missing and the choice changes what the customer or
  judge sees, add it under Open Questions in `progress-tracker.md` and ask
  before building it.
- Never weaken a rule in `architecture.md` → Trust Engine Rules, Fraud Rules
  or Invariants to make something work. Stop and ask instead.

## Security-Sensitive Areas (explicit instruction required)

Do not change these without an explicit instruction from the developer. When
a change is instructed, explain it in the summary.

- `lib/trust/**`: policy rules, provenance, the content scanner and payload
  hashing.
- `lib/fraud/rules.ts`: thresholds and the decision matrix.
- `supabase/migrations/**`: especially `complete_action()`, the CHECK
  constraints and RLS. Add a new migration instead of editing an applied one.
- The tool list in `lib/ai/tools.ts`. Adding a tool that can execute, approve,
  unlock or change rules is **never** allowed.
- `app/api/actions/[id]/approve/route.ts` and `app/api/ops/incidents/[id]/resolve/route.ts`.

## Protected Files

Do not modify these unless explicitly instructed:

- The `<!-- BEGIN:nextjs-agent-rules -->` … `<!-- END:nextjs-agent-rules -->`
  block in `AGENTS.md`. Next.js manages it.
- `package-lock.json` by hand. Change it only through `npm install`.
- `next.config.ts`, including `cacheComponents` and the turbopack CSS rule.
  (`experimental.agentFeedback` was removed on the developer's instruction.)
- `.env*` files with real keys. Never print, log or commit secrets. Only
  `.env.example` is committed.

## Keeping Docs in Sync

Update the relevant context file **in the same step** whenever the
implementation changes:

- Architecture, boundaries, routes, tools or invariants → `architecture.md`.
- Tables, columns or seed data → `architecture.md` (Storage Model) and
  `project-overview.md` (Demo Persona).
- Conventions → `code-standards.md`.
- Tokens, components or layouts → `ui-context.md`.
- Scope, the golden path or evaluation cases → `project-overview.md`.
- Always update `progress-tracker.md` at the end of a unit.

## Verification Before Moving On

A unit is done only when all of these are true:

1. Every item in the unit spec's "Verify when done" checklist passes.
2. `npm run build` passes, with no TypeScript errors.
3. `npm run lint` passes.
4. `npm test` passes, if the unit touched `lib/trust` or `lib/fraud`.
5. The golden-path steps this unit enables run by hand in the browser, and
   every earlier step still works. Use "Reset demo" between runs.
6. No invariant in `architecture.md` is violated. Check invariants 1, 2 and 10
   explicitly whenever routes or AI tools change.
7. No console errors in the browser or server log during the run.
8. `progress-tracker.md` reflects the completed work and any decisions made.

## Demo-Day Discipline

- After each completed unit:
  1. Commit to the unit branch `unit/NN-name`, push it, merge it into
     `main` with `--no-ff` and push `main` (see `00-build-plan.md` → The
     Loop).
  2. Push.
  3. Confirm that the Vercel preview works once deployment exists.
- Keep the "Reset demo" path working at all times. A broken reset blocks
  filming.
- If the DeepSeek API fails during a rehearsal, the fallback parser must still
  carry the golden path. Test with `DEEPSEEK_API_KEY` unset at least once
  before Tuesday.
- Anything simulated must be labelled as simulated in the UI (Invariant 11).
