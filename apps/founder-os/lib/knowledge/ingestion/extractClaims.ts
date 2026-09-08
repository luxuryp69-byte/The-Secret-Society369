import type { KnowledgeSource, KnowledgeSourceType } from "../types";
import type { SourceDocument } from "./fetchSource";

export interface ExtractedClaim {
  claim: string;
  source: KnowledgeSource;
  topic: string;
  confidence: number;
  tags: string[];
}

function inferSourceType(hostname: string): KnowledgeSourceType {
  const host = hostname.toLowerCase();

  if (host.endsWith(".gov") || host.includes(".gov.")) {
    return "government";
  }

  if (
    host.endsWith(".edu") ||
    host.includes("university") ||
    host.includes("academic")
  ) {
    return "academic";
  }

  if (
    host.includes("research") ||
    host.includes("arxiv") ||
    host.includes("pubmed")
  ) {
    return "research";
  }

  if (
    host.includes("news") ||
    host.includes("reuters") ||
    host.includes("apnews")
  ) {
    return "news";
  }

  return "other";
}

function inferTopic(document: SourceDocument): string {
  const hostname = new URL(document.finalUrl).hostname;

  return hostname.replace(/^www\./, "");
}

function splitIntoClaims(content: string): string[] {
  return content
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 40)
    .slice(0, 25);
}

export function extractClaims(
  document: SourceDocument,
): ExtractedClaim[] {
  const parsedUrl = new URL(document.finalUrl);

  const source: KnowledgeSource = {
    title: document.title,
    url: document.finalUrl,
    publisher: parsedUrl.hostname.replace(/^www\./, ""),
    type: inferSourceType(parsedUrl.hostname),
  };

  const topic = inferTopic(document);
  const claims = splitIntoClaims(document.content);

  return claims.map((claim) => ({
    claim,
    source,
    topic,
    confidence: 50,
    tags: [topic],
  }));
}
