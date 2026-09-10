import { createHash } from "node:crypto";

function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeClaim(claim: string): string {
  return normalizeText(claim);
}

export function canonicalizeSourceUrl(sourceUrl: string): string {
  const url = new URL(sourceUrl);

  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();

  if (
    (url.protocol === "https:" && url.port === "443") ||
    (url.protocol === "http:" && url.port === "80")
  ) {
    url.port = "";
  }

  url.hash = "";

  const sortedParams = [...url.searchParams.entries()].sort(
    ([keyA, valueA], [keyB, valueB]) => {
      const keyComparison = keyA.localeCompare(keyB);

      if (keyComparison !== 0) {
        return keyComparison;
      }

      return valueA.localeCompare(valueB);
    },
  );

  url.search = "";

  for (const [key, value] of sortedParams) {
    url.searchParams.append(key, value);
  }

  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}

export function createKnowledgeFingerprint(
  claim: string,
  sourceUrl: string,
): string {
  const normalizedClaim = normalizeClaim(claim);
  const canonicalSource = canonicalizeSourceUrl(sourceUrl);

  return createHash("sha256")
    .update(`${normalizedClaim}\n${canonicalSource}`, "utf8")
    .digest("hex");
}
