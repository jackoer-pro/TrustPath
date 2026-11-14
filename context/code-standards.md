# Code Standards

## General

- Hackathon speed, not hackathon mess. Write the smallest code that makes the
  current unit's checklist pass, and nothing "for later".
- One module, one job. Route handlers parse and delegate. Services in `lib/`
  hold the logic. Pure rules hold no I/O.
- Fix root causes in the shared function, not in each caller.
- When you cut a deliberate corner, mark it with a `ponytail:` comment that
  names the limit and the upgrade path, e.g.
  `// ponytail: single demo profile, add auth + per-user ownership for real users`.
- No dead code, no commented-out code, and no TODOs without a matching open
  question in `progress-tracker.md`.

## TypeScript

- `strict` is on and stays on. No `any`. Use `unknown` plus Zod parsing at
  boundaries.
- Use string-literal unions, not `enum`. Node's type stripping, used by the
  tests, does not support enums or namespaces.
- Use `import type` for type-only imports.
- Derive types from Zod schemas (`z.infer`) wherever a schema exists. Don't
  maintain a second hand-written copy.
- Money is always `number` of **integer cents** in code and `bigint` in the
  DB. Convert at the edges only:
  - `toCents()` when parsing input
  - `formatAUD()` when rendering
  - Never use floats for arithmetic.
- Dates travel as ISO strings and are formatted in the UI with
  `Intl.DateTimeFormat('en-AU')`.

## Next.js 16 (this repo)

- **Read the relevant guide in `node_modules/next/dist/docs/` before using any
  Next API you haven't used in this repo.** This version differs from older
  training data.
- `cacheComponents: true` is enabled in `next.config.ts`. Consequences:
  - The customer app, Protect tab, ops console and demo panel are **client
    components** that fetch from `/api/*` and poll every 2 s. Server
    components render static shells only.
  - Any server component that reads uncached data must sit inside
    `<Suspense>`. Prefer not to do that at all; use the API routes.
  - Never add `"use cache"` to anything that reads balances, actions, events
    or incidents.
- Route handlers live in `app/api/**/route.ts` and export named `GET`/`POST`
  functions. Dynamic `params` is a **Promise**:
  ```ts
  export async function POST(req: Request, ctx: RouteContext<'/api/actions/[id]/approve'>) {
    const { id } = await ctx.params
  }
  ```
- `GET` route handlers that read live data start with
  `await connection()` (from `next/server`). Otherwise `cacheComponents` may
  prerender them at build time.
- Demo and simulate routes: `return checkDemoKey(req) ?? run(service)`.
- `middleware.ts` is deprecated and renamed `proxy.ts`. We don't need one; do
  not add it.
- `useEffect` callbacks use a block body. `scrollIntoView()` (and other
  scroll methods) return a Promise in current Chrome, and an arrow that
  returns it crashes React.
- Add `'use client'` only to files that use state, effects or event handlers.
  Keep it at the leaves.
- Root layout uses `LayoutProps<'/'>` (already in place). Fonts load through
  `next/font/google` in `app/layout.tsx` only.

## Styling

- Tailwind utility classes only. There are no CSS modules and no inline
  `style` except dynamic values.
- Colours come **only** from the tokens in `ui-context.md`, exposed via
  `@theme` in `app/globals.css` (e.g. `bg-surface`, `text-muted`,
  `bg-risk-high-bg`). Never write a hex value in a component.
- Use the radius, spacing and type scales from `ui-context.md`.
- Risk and status are always shown as **icon + text label + colour**, never
  colour alone.

## API Routes

Every handler follows the same shape:

```ts
const Body = z.object({ pin: z.string().regex(/^\d{4}$/), payloadHash: z.string().length(64) })

export async function POST(req: Request, ctx: RouteContext<'/api/actions/[id]/approve'>) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return fail('BAD_REQUEST', 'Invalid request', 400)
  const { id } = await ctx.params
  return run(() => approveAction(id, parsed.data)) // maps thrown AppError → fail(), success → ok()
}
```

- Helpers `ok(data)`, `fail(code, message, status)` and `run(fn)` live in
  `lib/http.ts`. The response is always `{ ok: true, data }` or
  `{ ok: false, error: { code, message } }`.
- Validate the body, params and headers **before** any logic. Demo and
  simulate routes check `x-demo-key` first.
- Services throw `AppError(code, message, status)`. Every other error becomes
  a 500 with a generic message. Log the detail server-side; never send stack
  traces or DB errors to the client.
- Error codes are SCREAMING_SNAKE, e.g. `ACTION_NOT_APPROVABLE`, `BAD_PIN`,
  `INSUFFICIENT_FUNDS`, `OUTGOING_PAUSED`, `DEMO_KEY_REQUIRED`.

## AI Layer

- All LLM calls go through `lib/ai/deepseek.ts`. No other file calls `fetch`
  to DeepSeek.
- Every tool has a JSON-schema definition (sent to the model) **and** a Zod
  schema (used to parse the model's arguments). Keep them next to each other
  in `lib/ai/tools.ts`.
- Tool handlers return plain data objects. UI cards (`TrustReceipt`,
  `ShieldCard`, `EmergencyCard`) are built from tool results by the agent,
  never parsed out of LLM prose.
- Prompts live in `lib/ai/prompts.ts` as exported constants. Use Australian
  English, AUD, and short replies (≤ 3 sentences plus cards).
- Never put secrets, PINs or full account numbers in prompts. Use last four
  digits and display names.

## Data and Storage

- All DB access goes through `lib/db.ts` (`import 'server-only'`, secret key)
  and the service modules in `lib/banking`, `lib/fraud` and `lib/protect`.
  Components and route handlers never build queries.
- Balances change **only** through the `complete_action()` SQL function.
- Schema changes go in a new numbered file in `supabase/migrations/`. Never
  edit an applied migration; add a new one.
- Every mutation calls `audit()` in the same request, with the correct actor.
- `reset_demo()` must stay in sync with the persona table in
  `project-overview.md`.

## Testing

- Pure modules in `lib/trust/` and `lib/fraud/rules.ts` each have a sibling
  `*.test.ts` using `node:test` and `node:assert/strict`.
- Run the tests with `npm test`, defined as
  `"test": "node --test \"lib/**/*.test.ts\""`. Node 26 strips types
  natively, with no test framework installed.
- Pure modules and their tests use **relative imports with the `.ts`
  extension** and no `@/` alias. `allowImportingTsExtensions` is enabled in
  `tsconfig.json` (safe because `noEmit` is on).
- Test what can lose money or let an attacker through:
  - each policy rule
  - provenance, including word-numbers
  - scanner hits and misses
  - each fraud decision path
  - the double-approve rejection, covered by the approve service's
    guard-condition test or a rehearsal case

  Skip UI tests.

## File Organization

- `app/(customer)/` — Customer pages (Home, Protect).
- `app/ops/`, `app/demo/`, `app/shop/[productId]/` — Bank console, filming
  harness, mock merchant.
- `app/api/**/route.ts` — Route handlers only.
- `components/ui/` — Generic primitives, with no domain logic.
- `components/customer/`, `components/ops/` — Domain components. Props are
  plain data, and fetching happens in the page-level client component.
- `lib/<domain>/` — Services and pure logic (`banking`, `trust`, `fraud`,
  `protect`, `ai`, `shop`).
- `lib/db.ts`, `lib/http.ts`, `lib/audit.ts`, `lib/money.ts` — Shared
  infrastructure.
- `supabase/migrations/` — SQL.
- `context/` — Context files and `feature_specs/`.
- File names are `kebab-case.ts`. React components are `PascalCase.tsx`, one
  component per file.
