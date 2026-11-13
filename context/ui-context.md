# UI Context

## Theme

Light only. The look is **"Westpac app, with TrustPath stamped on every
action."** Two visual layers tell the architecture story without words:

- **The bank layer** (accounts, chat, navigation, staff console) borrows
  Westpac cues: the Westpac red as a brand accent, a deep navy for headings
  and primary buttons, warm light-grey canvas, editorial serif headlines.
- **The trust layer** (Trust Receipts, shield cards, verification, the
  "Protected" status) is TrustPath's own colour: **trust teal**. Whenever
  something is being checked or guarded, it is teal.

Branding rules:

- TrustPath has its own name and logomark. Do **not** use the Westpac logo
  anywhere in the app.
- The footer says "Concept prototype for the Westpac Innovation and Coding
  Competition 2026 · Simulated data".
- The Westpac red `#DA1710` comes from the Westpac GEL design system. Verify it,
  and the navy if possible, against the "Westpac Design Resource" linked in the
  handbook on Day 1. If they differ, change the token values only.

The feel is calm, premium and trustworthy. Use generous whitespace, few
colours at a time, and no gradients except the subtle phone-frame shadow.

## Colors

Defined once as Tailwind 4 theme variables in `app/globals.css` (`@theme`),
which generates the utilities (`bg-surface`, `text-muted`, `border-line`…).
Components use utilities only; **never hex values**. Remove the template's
dark-mode block and the `font-family: Arial` override in `globals.css`.

| Role                         | CSS Variable                | Value     | Use                                                    |
| ---------------------------- | --------------------------- | --------- | ------------------------------------------------------ |
| Page background              | `--color-canvas`            | `#F4F3F0` | App and console background                             |
| Surface                      | `--color-surface`           | `#FFFFFF` | Cards, receipts, AI bubbles, dialogs                   |
| Sunken                       | `--color-sunken`            | `#EEEDEA` | Chat thread background, inputs, table stripes          |
| Border                       | `--color-line`              | `#DEDCD7` | All 1px borders and dividers                           |
| Primary text                 | `--color-ink`               | `#1B1A2E` | Body text                                              |
| Muted text                   | `--color-muted`             | `#5E6070` | Labels, meta, timestamps                               |
| Brand red (Westpac)          | `--color-brand`             | `#DA1710` | 4px top stripe, logomark dot, active tab indicator only |
| Navy                         | `--color-navy`              | `#1F1C4F` | Headings, primary buttons, customer chat bubbles, ops sidebar |
| Navy strong                  | `--color-navy-strong`       | `#15133A` | Primary button hover/active                            |
| Trust teal                   | `--color-trust`             | `#0B6E69` | Receipt header, shield icons, "Protected", verify UI   |
| Trust teal tint              | `--color-trust-bg`          | `#E3F2F0` | Receipt header strip, shield card background           |
| Risk low                     | `--color-risk-low`          | `#12733A` | Low-risk badge text/icon; success                      |
| Risk low bg                  | `--color-risk-low-bg`       | `#E6F4EA` |                                                        |
| Risk medium                  | `--color-risk-medium`       | `#9A5B00` | Medium badge; warnings                                 |
| Risk medium bg               | `--color-risk-medium-bg`    | `#FFF4DC` |                                                        |
| Risk high                    | `--color-risk-high`         | `#C2410C` | High badge; held                                       |
| Risk high bg                 | `--color-risk-high-bg`      | `#FFEDE3` |                                                        |
| Risk critical                | `--color-risk-critical`     | `#A1120D` | Critical badge; blocked; declined; emergency           |
| Risk critical bg             | `--color-risk-critical-bg`  | `#FDE7E6` |                                                        |
| Focus ring                   | `--color-focus`             | `#1D6FD8` | `focus-visible` outline on every interactive element   |

Rules:

- The brand red is **never** used for buttons or risk. Danger uses
  `risk-critical`, a deeper red, always with an icon and a label.
- Primary buttons are navy. "Approve with PIN" is the main primary button.
- Destructive or secondary buttons are outlined (`border-line`, ink text).
- Every risk or status chip has an **icon + text + colour**.

## Typography

| Role                   | Font                                      | Variable         | Use                                                    |
| ---------------------- | ----------------------------------------- | ---------------- | ------------------------------------------------------ |
| UI text                | Geist Sans (already loaded)               | `--font-sans`    | Everything by default                                  |
| Display                | Source Serif 4, weight 600 (`next/font/google`) | `--font-display` | Page titles, wordmark, big balance, receipt amount label. Echoes Westpac's editorial serif |
| Mono                   | Geist Mono (already loaded)               | `--font-mono`    | References, hashes, event JSON, audit details          |

Scale:

| Tailwind | Size  | Use                                       |
| -------- | ----- | ----------------------------------------- |
| `text-xs`  | 12px  | Meta, timestamps, "simulated" labels      |
| `text-sm`  | 14px  | Secondary text, table cells, badges       |
| `text-base`| 16px  | Chat messages, body                       |
| `text-lg`  | 18px  | Card titles                               |
| `text-2xl` | 24px  | Receipt amount                            |
| `text-3xl` | 30px  | Account balance hero, page titles (display font) |

- Money always uses `tabular-nums font-semibold`. Format it as `$1,080.00`
  through `formatAUD()`.

## Border Radius

| Context                                   | Class             |
| ----------------------------------------- | ----------------- |
| Badges, inputs, small buttons             | `rounded-md`      |
| Cards, receipts, list panels              | `rounded-xl`      |
| Dialogs, chat bubbles                     | `rounded-2xl`     |
| Pills, chips, avatars, icon buttons       | `rounded-full`    |
| Phone frame (desktop preview only)        | `rounded-[2.75rem]` |

Shadows: `shadow-sm` on cards, `shadow-xl` on dialogs and the phone frame,
and nothing else.

## Component Library

There is no component library. Our own small primitives live in
`components/ui/`:

- `Button` (variants: `primary` navy, `secondary` outline, `ghost`;
  sizes: `sm`, `md`)
- `Badge`
- `RiskBadge` (`low|medium|high|critical` → icon, label and colours)
- `Card`
- `Money`
- `Dialog`, which wraps native `<dialog>` with `showModal()`
- `Logo`, which is the inline SVG described below

Add a primitive only when a second component needs it.

Domain components:

- **`TrustReceipt`** — one component with the states `pending_approval`,
  `completed`, `cancelled`, `held`, `blocked` and `expired`.
- **`ShieldCard`** — hidden-instruction notice.
- **`EmergencyCard`** — ticked list of measures.
- **`AlertBanner`** — "Was this you?".
- **`PinDialog`** — the simulated device check.
- **`AccountSummary`**, **`SecurityStatus`**.
- **Ops:** `CardEventList`, `IncidentList`, `IncidentDetail`, `AuditLog`.

**Logo:** an inline SVG shield in navy with a teal path line running through
it, plus a small brand-red dot. The wordmark "TrustPath" is set in the display
font.

## Layout Patterns

### Customer app (`/`, `/protect`)

The column is max 420px wide, full-bleed on a real phone. On desktop it's
centred inside a phone frame on the canvas background.

```
┌──────────────────────────────┐
│▀▀▀▀▀▀▀ brand-red 4px ▀▀▀▀▀▀▀▀│
│ ◆ TrustPath           🔔  AN │  app bar: logo, notifications, avatar
│ ┌─────────────┐┌───────────┐ │
│ │Everyday     ││Goal Saver │ │  account chips, horizontal scroll
│ │$1,500.00    ││$4,200.00  │ │
│ └─────────────┘└───────────┘ │
├──────────────────────────────┤
│ (sunken)                     │
│  🤖 Hi Alex, how can I help? │  AI bubble: surface, rounded-2xl
│        [I just got paid…] 👤 │  customer bubble: navy, white text
│  ┌ Trust Receipt ─────────┐  │  cards render inline in the thread
│  └────────────────────────┘  │
├──────────────────────────────┤
│ [Message TrustPath…     ] ➤  │  input pinned above the tab bar
│   ⌂ Home          🛡 Protect  │  bottom tabs; active = brand-red underline
└──────────────────────────────┘
```

- The empty chat shows 4 suggestion chips: "Show my balance", "Pay a bill",
  "Move money to savings" and "I think I've been scammed".
- `AlertBanner` slides down under the app bar and stays until it's answered.
- The Protect tab shows:
  - a `SecurityStatus` hero: teal "Protected" or critical "Emergency
    protection on"
  - a card list with lock state
  - restrictions (transfers paused, new payees blocked)
  - incidents with case status

### Trust Receipt

```
┌─────────────────────────────────────────────┐
│ ✓ TrustPath · Trust Receipt     [● Low risk] │  trust-bg strip, teal text
├─────────────────────────────────────────────┤
│ Transfer                                     │  text-muted
│ $300.00                                      │  text-2xl tabular-nums
│ To      Goal Saver (your account)            │
│ From    Everyday                             │
│ Checks  ✓ Requested by you                   │  provenance, teal checks
│         ✓ Recipient is yours                 │
│         ✓ Funds available                    │
│ Why it can proceed: …one plain sentence…     │
│ [ Cancel ]            [ Approve with PIN ]   │
│ Simulated device check · expires in 10 min   │  text-xs muted
└─────────────────────────────────────────────┘
```

- **Blocked:** the border and header are `risk-critical`, the title is
  "Blocked", with a reason such as "This instruction didn't come from you". No
  buttons.
- **Held:** an amber (`risk-high`) note, "Held for review by our team".
- **Completed:** collapses to one line: "✓ $300.00 to Goal Saver · Completed
  2:14 pm".

### Shield card

The background is `trust-bg` with a teal left border and a `ShieldAlert`
icon. It reads "Hidden instructions ignored", followed by the removed text
quoted and truncated to 120 characters, and the source ("SoundWave Audio
product page").

### Emergency card

The header is `risk-critical-bg`: "Emergency protection on". Below it is a
checklist where each measure ticks in turn (150 ms stagger):

- cards locked
- outgoing transfers paused
- new payees blocked
- pending approvals cancelled
- case #… created

The footer reads: "We'll never ask for your code. Call us on the number on
your card."

### PIN dialog

A native `<dialog>`, centred and `rounded-2xl`. The title is "Verify on this
device", followed by the action summary line and a single
`inputMode="numeric"` password field (4 digits, autofocus). There are Cancel
and Verify buttons, and the caption "Simulated device check. Production would
use passkeys."

### Bank console (`/ops`, desktop ≥ 1280px)

```
┌────────┬───────────────────────────────────────────────────────────┐
│ navy   │ Fraud Operations (demo)          [Declined 1][Open 2][Inj 1]│ stat pills
│ sidebar├──────────────────────────────┬────────────────────────────┤
│ Live   │ Live card events             │ Incidents                  │
│ Incid. │ 2:31 Nova Elec. $3,580 DECL. │ ● Critical Account comp.   │
│ Audit  │ 2:20 Metro Café $14.50 APPR. │ ● Medium  Injection blocked│
│        ├──────────────────────────────┴────────────────────────────┤
│        │ Incident detail: AI case brief · measures · related event │
│        │ [Mark investigated]  [Lift restrictions & unlock card]    │
│        │ Audit log (mono, newest first, actor chip per row)        │
└────────┴───────────────────────────────────────────────────────────┘
```

New events fade in at the top with a 1 s highlight (`risk-*-bg` matching
the decision).

### Demo harness (`/demo`, target 1920×1080 recording)

The page has three columns:

- the customer app iframe at 420px, in a phone frame
- the ops iframe, flexible width
- the control panel at 280px, with the demo key field, the four action
  buttons and the last response in mono

### Merchant page (`/shop/[productId]`)

This deliberately does **not** use TrustPath styling, so it reads as a
third-party site. It is neutral black and white with "SoundWave Audio" set in
plain sans, and shows the product image placeholder, name, price and
description. The hidden instruction lives in an HTML comment **and** a
visually hidden element, so it can be shown via "view source".

## Icons

Lucide React, stroke icons only. Sizes are `h-4 w-4` inline in text and
`h-5 w-5` in buttons and navigation.

| Meaning            | Icon            |
| ------------------ | --------------- |
| Trust / protected  | `ShieldCheck`   |
| Injection / threat | `ShieldAlert`   |
| Transfer           | `ArrowRightLeft`|
| Bill               | `Zap`           |
| Purchase           | `ShoppingBag`   |
| Card               | `CreditCard`    |
| Locked / unlocked  | `Lock` / `LockOpen` |
| Low / success      | `CircleCheck`  |
| Medium / high      | `TriangleAlert` |
| Critical / blocked | `OctagonX`      |
| Assistant          | `Bot`           |
| Notification       | `Bell`          |
| Home tab           | `House`         |
| Live events        | `Activity`      |
| Audit              | `ScrollText`    |

## Motion

- Transitions take 150–250 ms and use `ease-out`.
- New list items, cards and banners fade in and move up 8px.
- Status flips (card → locked) pulse once.
- Respect `prefers-reduced-motion` and turn all motion off under it.

## Copy

- Use plain, calm Australian English in the second person. Don't blame the
  customer, and use no jargon on customer screens.
- Format money as `$1,080.00`, dates as "2:14 pm" and "14 Nov".
- Label anything simulated as simulated. Never say "Face ID", "guaranteed" or
  "proven fraud".
- Use this exact assistant line in the emergency moment: "You may have shared
  information that could allow someone to access your account. Let's protect
  your money first."

## Accessibility

- Text contrast is at least 4.5:1, which the tokens above meet on their
  intended backgrounds.
- Every interactive element has a visible `focus-visible` ring in
  `--color-focus`.
- Every icon-only button has an `aria-label`.
- The chat thread is `aria-live="polite"` and the alert banner is
  `role="alert"`.
- Tap targets are at least 44×44px in the customer app.
