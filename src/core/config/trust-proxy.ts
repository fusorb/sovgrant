// Parses the TRUST_PROXY env var into a value Fastify's `trustProxy` accepts.
//   ""            -> false  (do not trust X-Forwarded-* headers; default)
//   "true"/"false"-> boolean
//   "1", "2", ... -> number of proxy hops to trust
//   anything else -> comma-separated IPs / CIDR ranges to trust
export function parseTrustProxy(raw: string): boolean | number | string[] {
  const value = raw.trim();
  if (value === "" || value.toLowerCase() === "false") return false;
  if (value.toLowerCase() === "true") return true;
  if (/^\d+$/.test(value)) return Number(value);
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
