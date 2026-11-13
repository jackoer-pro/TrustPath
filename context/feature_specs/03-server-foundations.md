# 03 — Server foundations and state API

Status: approved — built, awaiting live verification

## Goal

The server can talk to Supabase safely, and two routes work end to end:
`GET /api/customer/state` returns the demo customer's live data, and
`POST /api/demo/reset` restores the seed. Every later route reuses the
helpers built here.

## Depends on

- 02 (migration applied in Supabase).

## Golden-path steps unlocked

None visible yet. Step 19 (reset) works through `curl`. Unit 04 puts step 1
on screen.

## Build

**Dependencies** (first real use, both on the approved list):
`@supabase/supabase-js`, `zod`.

**Shared infrastructure**

- `lib/db.ts`: `import 'server-only'`. Creates one Supabase client from
  `SUPABASE_URL` and `SUPABASE_SECRET_KEY` with `auth: { persistSession:
  false }`. Throws at first use if either variable is missing, naming the
  variable (never its value).
- `lib/http.ts`:
  - `AppError(code, message, status)`
  - `ok(data)` → `{ ok: true, data }`
  - `fail(code, message, status)` → `{ ok: false, error: { code, message } }`
  - `run(fn)`: awaits `fn`; `AppError` → `fail()`; anything else is logged
    server-side and becomes `500 INTERNAL` with a generic message
  - `requireDemoKey(req)`: throws `AppError('DEMO_KEY_REQUIRED', …, 401)`
    unless `x-demo-key` equals `DEMO_ADMIN_KEY`. Uses
    `crypto.timingSafeEqual`.
- `lib/audit.ts`: `audit(actor, action, entityType, entityId, details)`
  inserts one `audit_logs` row. `Actor` is the string-literal union from the
  architecture.
- `lib/banking/constants.ts`: `DEMO_PROFILE_ID` and the other fixed seed ids
  from `architecture.md` → Storage Model.
- `.env.example` with every variable from `architecture.md` → Environment
  Variables and empty or default values. Add `!.env.example` to
  `.gitignore`.

**Services**

- `lib/banking/state.ts` → `getCustomerState()`. Reads, for the demo profile:
  - the profile's security flags (`outgoingPaused`, `newPayeesBlocked`,
    `emergencySince`)
  - accounts (id, name, kind, balance, last four of the number only)
  - cards
  - pending actions from the last hour, where `pending_approval` past
    `expires_at` is reported as `expired` (read-time, no DB write)
  - unanswered notifications
  - incidents that aren't `investigated`

  Returns camelCase plain data. Money stays integer cents.
- `lib/demo/reset.ts` → `resetDemo()`. Calls `rpc('reset_demo')` and writes
  an audit row (`system`, `demo.reset`).

**Routes**

- `app/api/customer/state/route.ts`: `GET` → `run(getCustomerState)`.
- `app/api/demo/reset/route.ts`: `POST`. Checks the demo key first, then
  `run(resetDemo)`.

## Not in this unit

- Any UI change. Home goes live in Unit 04.
- `lib/money.ts` tests (Unit 05 adds `npm test`).
- Any other route.

## Clarify before building

Answered by the developer, Sat 14 Nov:

1. **Migration:** applied in Supabase and ran cleanly.
2. **Keys:** I created `.env.local` from `.env.example`. `SUPABASE_URL`,
   `SUPABASE_SECRET_KEY` and `DEEPSEEK_API_KEY` are left blank for the
   developer to fill in.
3. **`DEMO_ADMIN_KEY`:** generated (24 random bytes, base64url) into
   `.env.local`.
4. **Account numbers:** only the BSB and last 4 digits leave the server.

## Verify when done

- [ ] `curl localhost:3000/api/customer/state` → `ok: true` with Everyday
      150000 and Goal Saver 420000 cents, card `4821` active, empty
      actions, notifications and incidents.
- [ ] `curl -X POST localhost:3000/api/demo/reset` without the header → 401
      `DEMO_KEY_REQUIRED` ✓. With the wrong key → 401 ✓. With the right key →
      `ok: true`, and one `demo.reset` audit row exists.
- [ ] Reset takes under 3 seconds.
- [x] With the Supabase keys missing → `500 INTERNAL` with a generic
      message; the server log names the missing variable.
- [x] `grep -rn "NEXT_PUBLIC_" .` (excluding `node_modules`/`.next`) finds
      nothing. `.env.local` isn't tracked and `.env.example` is.
- [x] `npm run build` and `npm run lint` pass.

## Built (filled in after completion)

-
