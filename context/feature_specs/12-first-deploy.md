# 12 — First Vercel deploy

Status: approved — config merged, awaiting the developer's Vercel import

## Goal

TrustPath runs on a public Vercel URL in the Sydney region, and golden-path
Act 1 works there online and offline. From now on, every merge to `main`
redeploys automatically, so the public URL always matches `main`.

## Depends on

- 11 (Act 1 in the browser).

## Golden-path steps unlocked

- Act 1 on the public URL (Goal 7 and Success Criterion 9 need a hosted
  URL).

## Build

**Developer's steps** (secrets and accounts; I never see the values):

1. In the Vercel dashboard: **Add New → Project → Import**
   `jackoer-pro/TrustPath` (Framework: Next.js, defaults).
2. **Settings → Environment Variables**, for Production **and** Preview:
   - `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `DEEPSEEK_API_KEY`
   - `DEEPSEEK_MODEL=deepseek-v4-pro`, `DEMO_PIN=1234`
   - `DEMO_ADMIN_KEY` = a **new** production key (see question 2)

   None of these use the `NEXT_PUBLIC_` prefix.
3. Deploy, then send me the production URL.

**My steps:**

- `vercel.json` with `{ "regions": ["syd1"] }`, so functions run next to the
  Sydney Supabase.
- `export const maxDuration = 60` on `/api/chat` only. Its worst case is 4
  rounds × the 12 s timeout plus tools; the other routes finish in under
  1 s.
- After deploy, run the Unit 11 checks against the public URL and confirm in
  the response headers that the function region is `syd1`.
- Add the production URL to `progress-tracker.md` (Session Notes).

## Not in this unit

- A custom domain, analytics, or the `/demo` harness (Unit 26).
- A rate limiter (decided in Unit 09: none for now).

## Clarify before building

Answered Sat 14 Nov. The developer has a Vercel account and asked for the
best option on 2–4:

1. **Vercel:** the developer imports `jackoer-pro/TrustPath` through the
   dashboard (Git integration).
2. **A separate production `DEMO_ADMIN_KEY`:** generated into the session
   scratchpad (`production-demo-key.txt`), never committed.
3. **Preview deployments on**, with env vars for Preview too. Vercel's
   default Deployment Protection keeps preview URLs behind the owner's
   Vercel login.
4. **`DEMO_PIN=1234` in production:** it's a labelled simulated check, and
   judges can try it.

## Verify when done

- [ ] The public URL loads `/`, `/protect`, `/ops`, `/demo` and
      `/shop/aurora-anc`.
- [ ] Act 1 typed on the public URL → 2 receipts → approve both → $1,080.00 /
      $4,500.00.
- [ ] Offline path on production: set `DEEPSEEK_MODEL` to an invalid value
      in a Preview deploy (or test locally with the production build) → the
      "Offline assistant" badge, and the flow still works.
- [ ] `POST /api/demo/reset` with the production key → 200, and without it →
      401.
- [ ] The response header `x-vercel-id` shows `syd1`.
- [ ] No secrets in the client bundle (grep the downloaded JS for `sb_secret`
      and `sk-`).
- [ ] Merging to `main` triggers a new production deploy automatically.

## Built (filled in after completion)

-
