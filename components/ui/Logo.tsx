export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 24 28" className="h-7 w-6" aria-hidden>
        <path d="M12 1 L22 5 V13 C22 20 17.5 24.5 12 27 C6.5 24.5 2 20 2 13 V5 Z" className="fill-navy" />
        <path
          d="M7 20 C9 15 15 15 16 9"
          className="stroke-trust-bg"
          strokeWidth="2.25"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="16.5" cy="7.5" r="2" className="fill-brand" />
      </svg>
      <span className="font-display text-xl text-navy">TrustPath</span>
    </span>
  );
}
