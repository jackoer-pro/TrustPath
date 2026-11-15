// Safety knowledge base (architecture.md → RAG). Pure: no DB, no framework.
// Curated, bank-neutral docs; retrieval is keyword overlap, top 2. No embeddings.
// Docs are wrapped and scanned before the model sees them and never grant permissions.
// Wording avoids scanner trigger phrases (e.g. "never ask"); a test checks nothing is removed.

export type SafetyDoc = { id: string; title: string; keywords: string[]; body: string };

export const DOCS: SafetyDoc[] = [
  {
    id: "impersonation-scams",
    title: "Recognising impersonation scams",
    keywords: ["scam", "scams", "scammer", "impersonation", "call", "caller", "phone", "text", "sms", "email", "pretend", "urgent", "spot", "fake", "police", "government"],
    body:
      "Scammers often pretend to be from the bank, the police or a government agency. They create urgency, say your account is at risk, and pressure you to act straight away. " +
      "Hang up, then contact the bank yourself using the number on the back of your card or in the app. A real bank officer is happy for you to call back.",
  },
  {
    id: "what-we-wont-ask",
    title: "What we'll never ask for",
    keywords: ["code", "security", "pin", "password", "otp", "one-time", "verification", "remote", "access", "safe", "account", "share", "shared", "gave", "give", "told", "ask"],
    body:
      "The bank will not ask you for your security code, one-time code, PIN or password, by phone, text or email. " +
      "We won't request remote access to your computer or phone, and we won't tell you to move money to a so-called safe account. " +
      "If you've shared a code, contact the bank straight away so we can protect your accounts.",
  },
  {
    id: "compromised-card",
    title: "Protecting a lost or compromised card",
    keywords: ["card", "lost", "stolen", "lock", "locked", "unlock", "compromised", "replacement", "declined", "4821"],
    body:
      "If your card is lost, stolen or used without your permission, lock it in the app straight away. A locked card stops new payments but keeps your accounts open. " +
      "Only the bank's team can unlock a card after a fraud review, and they will arrange a replacement card if needed.",
  },
  {
    id: "held-or-blocked",
    title: "Why a payment might be held or blocked",
    keywords: ["why", "blocked", "held", "hold", "paused", "declined", "stopped", "payment", "transfer", "reason", "review", "rejected"],
    body:
      "Payments can be held or blocked to protect you: when emergency protection pauses outgoing payments, when the recipient is new or unknown, when the amount is unusually large, or when the request didn't come from you. " +
      "The reason is shown on the payment card. A held payment is checked by our team; a blocked one doesn't go ahead.",
  },
  {
    id: "report-fraud",
    title: "How to report suspected fraud",
    keywords: ["report", "fraud", "suspect", "suspicious", "contact", "help", "number", "hacked", "compromised", "stolen", "protect"],
    body:
      "Report suspected fraud as soon as possible through the app or the number on the back of your card. Never use a phone number or link from a call, text or email you weren't expecting. " +
      "Tell us what happened and what you shared. Our fraud team will review your case and contact you.",
  },
];

const STOP = new Set(
  "a an and are as at be but by can did do does for from has have how i i'm i've if in is it its me my of on or our so that the their them then there they this to was we were what when where which who why will with you your".split(" "),
);
const words = (s: string) => s.toLowerCase().match(/[a-z0-9'-]+/g)?.filter((w) => !STOP.has(w)) ?? [];

/** Keyword overlap: a keyword hit scores 3, a title word 2, a body word 1. Top 2 with score > 0. */
export function searchSafety(query: string, limit = 2): SafetyDoc[] {
  const q = new Set(words(query));
  if (!q.size) return [];
  const scored = DOCS.map((d, i) => {
    const kw = new Set(d.keywords);
    const title = new Set(words(d.title));
    const body = new Set(words(d.body));
    let score = 0;
    for (const w of q) score += kw.has(w) ? 3 : title.has(w) ? 2 : body.has(w) ? 1 : 0;
    return { d, i, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .map((s) => s.d);
}
