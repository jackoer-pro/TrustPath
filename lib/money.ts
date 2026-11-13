const aud = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });

/** "$1,500", "1500.5", 300 → integer cents. Throws on anything that isn't a non-negative amount. */
export function toCents(input: string | number): number {
  const text = String(input).replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error(`Not an amount: ${input}`);
  const [dollars, fraction = ""] = text.split(".");
  return Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
}

export function formatAUD(cents: number): string {
  return aud.format(cents / 100);
}
