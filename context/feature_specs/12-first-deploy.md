# 12 — First Vercel deploy

Status: done

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

- [x] The public URL loads `/`, `/protect`, `/ops`, `/demo` and
      `/shop/aurora-anc`.
- [x] Act 1 typed on the public URL → 2 receipts → approve both → $1,080.00 /
      $4,500.00.
- [x] Offline path: verified with the production build locally in Unit 11
      (same code). Production itself runs online, and the test asserted no
      offline badge.
- [x] `POST /api/demo/reset` without a key → 401; with the configured key →
      200 (see Built: the key is currently the local one).
- [x] The response header `x-vercel-id` shows `syd1`.
- [x] No secrets in the client bundle (grep the downloaded JS for `sb_secret`
      and `sk-`).
- [ ] Merging to `main` triggers a new production deploy automatically.
      (Confirm on the next code merge; Git integration is connected.)

## Built (filled in after completion)

Sat 14 Nov.

- **Production URL: https://trust-path-five.vercel.app** (public).
  Deployment-specific URLs (`trust-path-<hash>-jackoer-pros-projects…`) sit
  behind Vercel login (Deployment Protection), so always share the
  production domain. `trust-path.vercel.app` belongs to an unrelated site.
- `vercel.json` → every route is served from `syd1` (`x-vercel-id`).
  `/api/chat` has `maxDuration = 60`.
- Verified live: all pages are 200, `/api/customer/state` is live, and **Act 1
  in headless Chrome on the public URL** gives 2 low-risk receipts →
  $1,080.00 / $4,500.00, plus the follow-up and chips, with no console
  errors, using DeepSeek (no offline badge). The DB was reset afterwards.
- **Secret scan:** 9 JS bundles contain neither the Supabase secret, the
  Supabase URL, the DeepSeek key nor any demo key, and no `sb_secret_` or
  `sk-…` patterns.
- **Open (developer):** Vercel's `DEMO_ADMIN_KEY` is the **local** key, not
  the generated production key. It still works and is still protected, but
  the keys aren't separated. To fix: set it to the value in
  `production-demo-key.txt` in Vercel → Environment Variables, then
  redeploy.
