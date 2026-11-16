import { blocks, segments } from "@/lib/ui/rich-text";

/** Assistant text with light Markdown rendered as real elements (paragraphs, bullet lists, bold). No HTML injection. */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const line = (l: string) => segments(l).map((s, i) => (s.bold ? <strong key={i} className="font-semibold">{s.text}</strong> : s.text));
  return (
    <div className={`space-y-2 ${className}`}>
      {blocks(text).map((b, i) =>
        b.list ? (
          <ul key={i} className="space-y-1">
            {b.lines.map((l, j) => (
              <li key={j} className="flex gap-2">
                <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
                <span>{line(l)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>{line(b.lines.join(" "))}</p>
        ),
      )}
    </div>
  );
}
