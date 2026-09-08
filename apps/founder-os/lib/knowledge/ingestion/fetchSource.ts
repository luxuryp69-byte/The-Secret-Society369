import dns from "node:dns/promises";
import net from "node:net";

export interface SourceDocument {
  url: string;
  finalUrl: string;
  title: string;
  content: string;
  fetchedAt: string;
  contentType: string | null;
}

const MAX_SOURCE_BYTES = 2_000_000;
const REQUEST_TIMEOUT_MS = 15_000;

function isPrivateIPv4(address: string): boolean {
  const parts = address.split(".").map(Number);

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;

  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0
  );
}

function isPrivateIPv6(address: string): boolean {
  const normalized = address.toLowerCase();

  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

async function assertPublicHostname(hostname: string): Promise<void> {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");

  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  ) {
    throw new Error("Private/local hosts are not allowed.");
  }

  if (net.isIP(normalized)) {
    if (
      isPrivateIPv4(normalized) ||
      isPrivateIPv6(normalized)
    ) {
      throw new Error("Private IP addresses are not allowed.");
    }

    return;
  }

  const addresses = await dns.lookup(normalized, {
    all: true,
    verbatim: true,
  });

  if (!addresses.length) {
    throw new Error("Unable to resolve source hostname.");
  }

  for (const entry of addresses) {
    if (
      (entry.family === 4 && isPrivateIPv4(entry.address)) ||
      (entry.family === 6 && isPrivateIPv6(entry.address))
    ) {
      throw new Error("Source hostname resolves to a private address.");
    }
  }
}

async function validateSourceUrl(url: string): Promise<URL> {
  const parsed = new URL(url);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS sources are supported.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("URLs with embedded credentials are not allowed.");
  }

  await assertPublicHostname(parsed.hostname);

  return parsed;
}

function extractTitle(html: string, fallback: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  return (
    titleMatch?.[1]
      ?.replace(/\s+/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim() || fallback
  );
}

function extractReadableText(text: string): string {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchSource(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SourceDocument> {
  const parsed = await validateSourceUrl(url);

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml,text/plain",
        "User-Agent": "FounderOS-KnowledgeBot/1.0",
      },
      redirect: "error",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Source returned HTTP ${response.status}.`);
    }

    const contentType = response.headers.get("content-type");

    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml+xml") &&
      !contentType.includes("text/plain")
    ) {
      throw new Error(`Unsupported source content type: ${contentType}.`);
    }

    const contentLength = response.headers.get("content-length");

    if (
      contentLength &&
      Number(contentLength) > MAX_SOURCE_BYTES
    ) {
      throw new Error("Source exceeds the maximum supported size.");
    }

    const text = await response.text();

    if (Buffer.byteLength(text, "utf8") > MAX_SOURCE_BYTES) {
      throw new Error("Source exceeds the maximum supported size.");
    }

    const content = extractReadableText(text);

    if (!content) {
      throw new Error("Source did not contain readable content.");
    }

    return {
      url,
      finalUrl: response.url || parsed.toString(),
      title: extractTitle(text, parsed.hostname),
      content,
      fetchedAt: new Date().toISOString(),
      contentType,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Source request timed out.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
