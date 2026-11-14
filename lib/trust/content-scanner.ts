// Untrusted-content scanner: removes instruction-like sentences before the LLM sees third-party text.
// Pure: no DB, no framework imports. Errs towards removing (developer decision, Unit 05).

const PATTERNS: RegExp[] = [
  /\bignore\b.{0,30}\binstructions?\b/i,
  /\bdisregard\b.{0,30}\b(instructions?|above|previous)\b/i,
  /\b(ai\s+)?assistant\s*[:,]/i,
  /\bwithout\s+(asking|confirm(ing|ation)|approval|checking)\b/i,
  /\b(don'?t|do\s+not|never)\s+ask\b/i,
  /\b(customer|user)\s+has\s+(also\s+)?(authori[sz]ed|approved|confirmed|agreed)\b/i,
  /\b(transfer|send|pay|wire|move)\b[^.!?]{0,40}\$\s?\d[^.!?]{0,40}\bto\b/i,
  /\$\s?\d[\d,.]*\s*(transfer|payment)\s+to\b/i,
  /\bsystem\s+prompt\b/i,
  /\byou\s+are\s+now\b/i,
  /\bnew\s+instructions?\b/i,
];

const isInstruction = (s: string) => PATTERNS.some((p) => p.test(s));

const INITIAL = "\u0000"; // protects "J. Smith" from being split as a sentence end

function sentences(text: string): string[] {
  return text
    .replace(/\b([A-Z])\.\s/g, `$1.${INITIAL}`)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.replaceAll(INITIAL, " ").trim())
    .filter(Boolean);
}

export type ScanResult = { clean: string; removed: string[] };

/** HTML comments are never content; remaining tags (incl. visually hidden ones) are stripped so their text is scanned. */
export function scan(input: string): ScanResult {
  const removed: string[] = [];
  const withoutComments = input.replace(/<!--([\s\S]*?)-->/g, (_, body: string) => {
    for (const s of sentences(body)) if (isInstruction(s)) removed.push(s);
    return " ";
  });
  const text = withoutComments.replace(/<[^>]+>/g, " ").replace(/[ \t]+/g, " ");

  const kept: string[] = [];
  for (const s of sentences(text)) (isInstruction(s) ? removed : kept).push(s);
  return { clean: kept.join(" "), removed };
}
