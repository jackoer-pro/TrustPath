# 35 — Morning briefing (spoken) and CoachGuard removed from screens

Status: done (Mon 16 Nov)

## Goal

Open the film with the assistant speaking first, from Alex's own context: "Good
morning, Alex. It's Mum's birthday today. Last year you sent her $50. Want to
send her something?" One tap sends a normal request (Trust Receipt + PIN).

## Decisions (developer: build the small real version, skip the microphone)

- **Real, not filmed-only:** judges get the live link, so the briefing must exist.
- **Deterministic:** `lib/context/briefing.ts` (pure, 3 tests) builds every line
  from saved data: payee birthday, last year's transfer to them (300–430 days
  ago), the largest commitment still due, next payday's weekday, safe-to-spend.
  The suggestion only sends "Send $50 to Mum" as a chat message; nothing is
  prepared without Alex.
- **Migration 0004** (run by the developer): `payees.birthday`; the seed sets
  Mum's birthday to today's Sydney date and adds last year's $50 transfer.
- **Voice:** browser speech (no library). `/demo` speaks the briefing itself
  (browsers only allow speech after a click in that page); the phone has a
  Listen button on the card and a speaker toggle (spoken replies on/off,
  remembered per browser). No microphone input.
- **CoachGuard removed from screens:** the Protect "Check a message" box, the
  coaching cards, the chat tool, its demo steps and its slide mention are gone.
  Kept invisibly: pasted text is never the customer's words (provenance),
  reaches the model only as untrusted content, and can't trigger a lockdown;
  offline it gets a fixed reply ("I won't act on instructions in a pasted
  message…").

## Built

- `lib/context/briefing.ts` + test; `getBriefing()` / `setPayeeBirthday()` in
  `lib/context/context.ts`; `GET /api/briefing`; `POST /api/demo/briefing`
  (demo key; creates a `briefing` notification and returns the words).
- `BriefingCard`, `components/customer/speech.ts`, speaker toggle in the chat
  bar, "Good morning (briefing)" in `/demo`, birthday field on the Me tab.
- Deleted: `CheckMessage.tsx`, `CoachingCard.tsx`, `/api/protect/check-message`.
- `npm run eval`: 9 CoachGuard cases replaced by "pasted message is untrusted"
  and "morning briefing" (30 total).

## Verify (all done)

- [x] `npm test` 105/105; build and lint clean.
- [x] `npm run eval` 30/30 online and offline.
- [x] Browser, online and offline: Good morning → briefing on the phone, /demo
      speaks it → Send Mum $50 → receipt → PIN → $1,450; reset clears it.
- [x] Regression, online and offline: golden path, shop, Units 30–34 screens.
- [x] The new demo-script order (Acts 0–5) end to end, twice.
