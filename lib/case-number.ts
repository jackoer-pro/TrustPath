/** Customer-facing case number: "#" + the first 6 hex characters of the incident id. */
export const caseNumber = (id: string) => `#${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
