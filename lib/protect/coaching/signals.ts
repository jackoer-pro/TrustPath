// CoachGuard (Unit 28): scam-coaching signals in a message or call transcript the customer shares.
// Pure: no DB, no framework, no AI. The rule-based detector is always on (and the whole detector when DeepSeek is
// unavailable); assessment, explanation and next step are deterministic templates, so the wording never claims a
// message is definitely fraudulent.

export const SIGNAL_TYPES = [
  "coached_bank_response",
  "concealment",
  "third_party_influence",
  "safe_account_transfer",
  "urgency_or_pressure",
  "credential_request",
  "remote_access_request",
  "secrecy_instruction",
] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];
export type Signal = { type: SignalType; evidence: string; source: "ai" | "rules" };
export type Assessment = "no_signs" | "some_signs" | "strong_signs";
export type CoachingSummary = { assessment: Assessment; signals: Signal[]; explanation: string; nextAction: string };

/** Plain-English "it …" phrases for the customer and the receipt. */
export const LABEL: Record<SignalType, string> = {
  coached_bank_response: "tells you what to say if the bank asks about the payment",
  concealment: "tells you to hide something from the bank",
  third_party_influence: "has someone else directing what you do with your money",
  safe_account_transfer: "asks you to move money to a so-called safe account",
  urgency_or_pressure: "pressures you to act quickly",
  credential_request: "asks for a code, PIN or password",
  remote_access_request: "asks you to install remote-access software",
  secrecy_instruction: "tells you to keep it secret",
};

/** Any one of these is a strong sign on its own. Urgency and third-party influence alone are only "some signs". */
export const STRONG: ReadonlySet<SignalType> = new Set([
  "coached_bank_response",
  "concealment",
  "safe_account_transfer",
  "credential_request",
  "remote_access_request",
  "secrecy_instruction",
]);

const PATTERNS: Record<SignalType, RegExp[]> = {
  coached_bank_response: [
    /\b(if|when)\s+(the\s+)?(bank|teller|staff|branch|they|anyone)\s+(asks?|calls?|questions?|rings?)\b/i,
    /(?<!\b(?:don'?t|do not|never)\s)\b(tell|say to|explain to)\s+(the\s+)?(bank|teller|staff|branch)\b/i,
    /\b(say|tell them)\s+(it'?s|it is|that it'?s|you'?re|you are)\s+(for|a|an|buying|paying|renovating|investing|helping)\b/i,
    /\blie\s+to\s+(the\s+)?(bank|teller|staff)\b/i,
  ],
  concealment: [
    /\b(don'?t|do not|never)\s+(tell|mention|say|let)\b[^.!?\n]{0,40}\b(bank|teller|staff|me|us|this call|who you|about me)\b/i,
    /\b(hide|conceal)\b/i,
    /\bdon'?t mention\b/i,
  ],
  third_party_influence: [
    /\b(i'?ll|we'?ll|i will|we will)\s+(guide|walk|talk)\s+you\b/i,
    /\bdo\s+(exactly\s+)?(what|as)\s+i\s+(say|tell you)\b/i,
    /\bfollow\s+my\s+instructions\b/i,
    /\bstay\s+on\s+the\s+(line|phone|call)\b/i,
    /\bi'?m\s+(calling\s+)?from\s+(the|your)\s+bank\b/i,
  ],
  safe_account_transfer: [
    /\bsafe\s+(account|wallet)\b/i,
    /\bsecure\s+(holding\s+)?account\b/i,
    /\bmove\s+(your|all|the)\s+(money|funds|savings)\b[^.!?\n]{0,40}\b(protect|safe|secure)/i,
  ],
  urgency_or_pressure: [
    /\b(right now|immediately|urgent(ly)?|act now|hurry|as soon as possible|before it'?s too late)\b/i,
    /\bwithin\s+(the\s+)?(next\s+)?\d+\s+(minutes?|hours?)\b/i,
    /\b(account|money|savings|funds)\s+will\s+be\s+(frozen|lost|closed|taken|stolen)\b/i,
  ],
  credential_request: [
    /\b(read|give|tell|send|share)\s+(me|us)\b[^.!?\n]{0,30}\b(code|pin|password|passcode|one[- ]time|otp)\b/i,
    /\b(code|pin|password|otp)\b[^.!?\n]{0,30}\b(we (just )?sent|you (just )?(got|received)|on your phone)\b/i,
  ],
  remote_access_request: [
    /\b(anydesk|teamviewer|quicksupport|quick assist|rustdesk|remote (access|desktop|support))\b/i,
    /\b(install|download)\b[^.!?\n]{0,40}\b(app|software|program)\b[^.!?\n]{0,40}\b(so (i|we) can|to (fix|secure|check|access|protect))/i,
  ],
  secrecy_instruction: [
    /\b(keep (this|it) (a )?secret|between (us|you and me)|confidential|(don'?t|do not) (tell|discuss with) (anyone|anybody|your family|your partner|your (husband|wife|kids|children)))\b/i,
    /\b(ongoing|internal|secret)\s+investigation\b/i,
  ],
};

/** Sentences and lines, each an exact substring of the input (so evidence can be quoted verbatim). */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function detectByRules(text: string): Signal[] {
  const found = new Map<SignalType, Signal>();
  for (const s of sentences(text))
    for (const type of SIGNAL_TYPES)
      if (!found.has(type) && PATTERNS[type].some((p) => p.test(s))) found.set(type, { type, evidence: s, source: "rules" });
  return SIGNAL_TYPES.flatMap((t) => (found.has(t) ? [found.get(t)!] : []));
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** The AI may only point at text that's really there: evidence must be an exact excerpt (whitespace-insensitive). */
export const isExactExcerpt = (evidence: string, text: string) => evidence.trim().length >= 4 && squash(text).includes(squash(evidence));

/** Rules first, then AI signals of types the rules didn't find. One signal per type. */
export function mergeSignals(rules: Signal[], ai: Signal[]): Signal[] {
  const byType = new Map<SignalType, Signal>();
  for (const s of [...rules, ...ai]) if (!byType.has(s.type)) byType.set(s.type, s);
  return SIGNAL_TYPES.flatMap((t) => (byType.has(t) ? [byType.get(t)!] : []));
}

const list = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

export function summarise(signals: Signal[]): CoachingSummary {
  const strong = signals.some((s) => STRONG.has(s.type)) || signals.length >= 3;
  const assessment: Assessment = strong ? "strong_signs" : signals.length ? "some_signs" : "no_signs";
  const labels = list(signals.map((s) => LABEL[s.type]));
  const explanation = {
    strong_signs: `This message shows strong signs of scam coaching: it ${labels}. A genuine bank, police officer or business won't ask you to do this. We can't be certain who sent it, but please treat it as suspicious.`,
    some_signs: `This message shows some warning signs: it ${labels}. It may be genuine, but take care before you act.`,
    no_signs: "We didn't find signs of scam coaching in this message. That doesn't guarantee it's safe, so if something feels wrong, check with us first.",
  }[assessment];
  const nextAction = {
    strong_signs:
      "Don't send money, share codes or install anything. Stop replying or hang up, then call us on the number on the back of your card. Any payment to a new payee stays on hold until we've spoken with you.",
    some_signs: "Pause before acting. Contact the person or company using details you find yourself, not the ones in the message.",
    no_signs: "No action needed. If anyone asks you to move money or share a code, check with us first.",
  }[assessment];
  return { assessment, signals, explanation, nextAction };
}

/** One-line reason for the Trust Receipt, quoting the first strong (else first) piece of evidence. */
export function receiptSummary(signals: Signal[]): string {
  const s = signals.find((x) => STRONG.has(x.type)) ?? signals[0];
  if (!s) return "";
  const quote = s.evidence.length > 90 ? `${s.evidence.slice(0, 89).trimEnd()}…` : s.evidence;
  return `a message you shared ${LABEL[s.type]} ("${quote}")`;
}
