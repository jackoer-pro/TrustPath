// Light Markdown in assistant replies (bullets, **bold**), parsed into plain blocks. Pure: no React, no HTML.
// Anything else (# headings, `code`, *italics*) keeps its words and loses its symbols.

const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+/;

/** Strip inline symbols other than **bold** (which the renderer turns into <strong>). */
export const stripInline = (s: string) =>
  s
    .replace(/^#{1,6}\s+/, "")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(^|\s)\*(\S[^*]*?)\*(?=\s|[.,!?]|$)/g, "$1$2");

/** Split a line into plain and bold segments. */
export function segments(line: string): { bold: boolean; text: string }[] {
  return stripInline(line)
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((p) => (/^\*\*[^*]+\*\*$/.test(p) ? { bold: true, text: p.slice(2, -2) } : { bold: false, text: p.replace(/\*\*/g, "") }));
}

export type Block = { list: boolean; lines: string[] };

/** Paragraphs and bullet lists. Models sometimes inline bullets ("…: - **A** … - **B** …"); those are split too. */
export function blocks(text: string): Block[] {
  const normalised = text.replace(/:\s+-\s+(?=\*\*)/g, ":\n- ").replace(/\s+-\s+(?=\*\*)/g, "\n- ");
  const out: Block[] = [];
  for (const raw of normalised.split("\n")) {
    const line = raw.trim();
    if (!line) {
      out.push({ list: false, lines: [] });
      continue;
    }
    const item = BULLET.test(line);
    const value = item ? line.replace(BULLET, "") : line;
    const last = out.at(-1);
    if (last && last.lines.length && last.list === item) last.lines.push(value);
    else out.push({ list: item, lines: [value] });
  }
  return out.filter((b) => b.lines.length);
}

/** Plain text for speech: no symbols; list items read as separate sentences. */
export function plainText(text: string): string {
  return blocks(text)
    .flatMap((b) => (b.list ? b.lines : [b.lines.join(" ")]))
    .map((l) => segments(l).map((s) => s.text).join("").trim())
    .map((l) => (/[.!?:]$/.test(l) ? l : `${l}.`))
    .join(" ");
}
