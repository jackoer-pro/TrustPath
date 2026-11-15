"use client";

import { useEffect } from "react";
import { Logo } from "@/components/ui/Logo";

export type SlideId = "opening" | "closing";

// AFCA Annual Review 2025–26, banking and finance complaints (afca.org.au/annual-review-banking-and-finance-complaints).
const COMPLAINTS = [
  { issue: "Scams", count: "6,580", answer: "Hijacked AI blocked · CoachGuard · scam-call recovery" },
  { issue: "Unauthorised transactions", count: "6,038", answer: "Fraud engine · Session Trust · two-tap recovery" },
  { issue: "Service issues", count: "4,315", answer: "Safe-to-spend · plain “Why?” for every decision" },
  { issue: "Failure to follow instructions", count: "3,825", answer: "Trust Receipts bound to your exact words · your AI permissions" },
];

const CLOSING = [
  "We already know AI can understand natural language and perform complex tasks.",
  "But when AI starts interacting with financial infrastructure, there is a second problem: trust.",
  "What if a malicious website tries to manipulate the AI?",
  "What if a scammer manipulates the person using it?",
];

/** Full-screen story slides for filming (click or press Esc to close). */
export function Slides({ slide, onClose }: { slide: SlideId; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={slide === "opening" ? "Opening slide" : "Closing slide"} onClick={onClose} className="fixed inset-0 z-50 flex cursor-pointer flex-col justify-center bg-navy px-24 text-white">
      <div className="absolute top-10 left-24 rounded-xl bg-white px-4 py-2">
        <Logo />
      </div>
      {slide === "opening" ? (
        <div className="max-w-6xl">
          <p className="text-2xl text-white/70">People don&apos;t complain because they can&apos;t find their balance.</p>
          <h1 className="mt-3 font-display text-6xl leading-tight">They complain when something important goes wrong.</h1>
          <p className="mt-8 text-3xl">
            <span className="font-semibold tabular-nums">66,971</span> banking and finance complaints to AFCA in 2025–26,{" "}
            <span className="font-semibold text-brand-light">up 23%</span>.
          </p>
          <ul className="mt-8 space-y-4">
            {COMPLAINTS.map((c) => (
              <li key={c.issue} className="grid grid-cols-[22rem_8rem_1fr] items-baseline gap-6 border-b border-white/15 pb-3 text-2xl">
                <span>{c.issue}</span>
                <span className="text-right font-semibold tabular-nums">{c.count}</span>
                <span className="text-xl text-trust-light">→ {c.answer}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-base text-white/60">Source: Australian Financial Complaints Authority, Annual Review 2025–26 (banking and finance complaints).</p>
        </div>
      ) : (
        <div className="max-w-5xl">
          {CLOSING.map((line, i) => (
            <p key={line} className={`mt-5 text-3xl leading-snug ${i >= 2 ? "text-white" : "text-white/75"}`}>
              {line}
            </p>
          ))}
          <p className="mt-12 font-display text-7xl">TrustPath protects both.</p>
          <p className="mt-8 text-3xl leading-snug text-white/85">
            It makes banking easier while ensuring that neither malicious instructions nor unauthorised actors gain control over customers&apos; money.
          </p>
        </div>
      )}
      <p className="absolute right-24 bottom-8 text-sm text-white/40">Concept prototype · simulated data · click to close</p>
    </div>
  );
}
