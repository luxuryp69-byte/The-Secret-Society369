import type {
  AgentKnowledgeAvailability,
  AgentKnowledgeContext,
} from "../types";

import type {
  KnowledgeDecisionEvidence,
  AgentKnowledgeDecisionContext,
} from "./types";

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function toEvidence(
  value: unknown,
): KnowledgeDecisionEvidence[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isObject)
    .map((item) => ({
      itemId:
        typeof item.itemId === "string"
          ? item.itemId
          : "",

      claim:
        typeof item.claim === "string"
          ? item.claim
          : "",

      status:
        typeof item.status === "string"
          ? item.status as KnowledgeDecisionEvidence["status"]
          : "UNVERIFIED",

      confidence:
        typeof item.confidence === "number"
          ? item.confidence
          : 0,

      authorityScore:
        typeof item.authorityScore === "number"
          ? item.authorityScore
          : 0,

      corroborated:
        typeof item.corroborated === "boolean"
          ? item.corroborated
          : false,

      supportingSources:
        typeof item.supportingSources === "number"
          ? item.supportingSources
          : 0,

      conflictingSources:
        typeof item.conflictingSources === "number"
          ? item.conflictingSources
          : 0,

      reason:
        typeof item.reason === "string"
          ? item.reason
          : "",
    }))
    .filter(
      (item) =>
        item.itemId.trim() !== "" ||
        item.claim.trim() !== "",
    );
}

function toSources(
  value: unknown,
): AgentKnowledgeDecisionContext["sources"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isObject)
    .map((source) => {
      const title =
        typeof source.title === "string"
          ? source.title.trim()
          : "";

      const publisher =
        typeof source.publisher === "string"
          ? source.publisher.trim()
          : "";

      const url =
        typeof source.url === "string"
          ? source.url.trim()
          : "";

      const type =
        typeof source.type === "string"
          ? source.type
          : "other";

      return {
        title,
        publisher,
        url,
        type: type as AgentKnowledgeDecisionContext["sources"][number]["type"],
        ...(typeof source.publishedAt === "string"
          ? { publishedAt: source.publishedAt }
          : {}),
        ...(typeof source.fetchedAt === "string"
          ? { fetchedAt: source.fetchedAt }
          : {}),
        ...(typeof source.verifiedAt === "string"
          ? { verifiedAt: source.verifiedAt }
          : {}),
      };
    })
    .filter(
      (source) =>
        source.title !== "" ||
        source.publisher !== "" ||
        source.url !== "",
    );
}

function toWarnings(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (warning): warning is string =>
      typeof warning === "string" &&
      warning.trim() !== "",
  );
}

export class KnowledgeDecisionService {
  createContext(
    value: unknown,
  ): AgentKnowledgeDecisionContext {
    if (!isObject(value)) {
      return this.buildUnknownContext(
        "",
        "NO_MATCH",
        "NO_MATCH",
        "Knowledge context is unavailable.",
      );
    }

    const context =
      value as Partial<AgentKnowledgeContext>;

    const query =
      typeof context.query === "string"
        ? context.query
        : "";

    const availability =
      this.toAvailability(
        context.availability,
      );

    const status =
      this.toStatus(
        context.status,
      );

    const canUseAsTrustedContext =
      context.canUseAsTrustedContext === true;

    const answer =
      typeof context.answer === "string" &&
      context.answer.trim() !== ""
        ? context.answer.trim()
        : null;

    const confidence =
      typeof context.confidence === "number"
        ? context.confidence
        : 0;

    const sources =
      toSources(context.sources);

    const evidence =
      toEvidence(context.evidence);

    const warnings =
      toWarnings(context.warnings);

    if (
      canUseAsTrustedContext &&
      status === "VERIFIED" &&
      answer !== null
    ) {
      return {
        query,
        availability: "AVAILABLE",
        status: "VERIFIED",
        classification: "FACT",
        canUseAsTrustedContext: true,
        answer,
        facts: [answer],
        inferences: [],
        assumptions: [],
        unknowns: [],
        confidence,
        sources,
        evidence,
        warnings,
        explanation:
          "Verified knowledge is classified as a fact and may be used as trusted agent context.",
      };
    }

    if (status === "DISPUTED") {
      return this.buildUnknownContext(
        query,
        "BLOCKED",
        "DISPUTED",
        "Disputed knowledge cannot be classified as a fact.",
        confidence,
        sources,
        evidence,
        warnings,
      );
    }

    if (status === "REJECTED") {
      return this.buildUnknownContext(
        query,
        "BLOCKED",
        "REJECTED",
        "Rejected knowledge cannot be classified as a fact.",
        0,
        sources,
        evidence,
        warnings,
      );
    }

    if (
      status === "STALE" ||
      status === "UNVERIFIED"
    ) {
      return this.buildUnknownContext(
        query,
        "WARNING",
        status,
        status === "STALE"
          ? "Stale knowledge cannot be classified as current fact."
          : "Unverified knowledge cannot be classified as fact.",
        confidence,
        sources,
        evidence,
        warnings,
      );
    }

    return this.buildUnknownContext(
      query,
      availability,
      status,
      typeof context.explanation === "string" &&
        context.explanation.trim() !== ""
        ? context.explanation.trim()
        : "Knowledge is not sufficiently verified to be classified as fact.",
      confidence,
      sources,
      evidence,
      warnings,
    );
  }

  private buildUnknownContext(
    query: string,
    availability: AgentKnowledgeAvailability,
    status: KnowledgeDecisionContextStatus,
    explanation: string,
    confidence = 0,
    sources: AgentKnowledgeDecisionContext["sources"] = [],
    evidence: KnowledgeDecisionEvidence[] = [],
    warnings: string[] = [],
  ): AgentKnowledgeDecisionContext {
    return {
      query,
      availability,
      status,
      classification: "UNKNOWN",
      canUseAsTrustedContext: false,
      answer: null,
      facts: [],
      inferences: [],
      assumptions: [],
      unknowns: [
        "No sufficiently verified knowledge is available as a trusted fact.",
      ],
      confidence,
      sources,
      evidence,
      warnings,
      explanation,
    };
  }

  private toAvailability(
    value: unknown,
  ): AgentKnowledgeAvailability {
    if (
      value === "AVAILABLE" ||
      value === "WARNING" ||
      value === "BLOCKED" ||
      value === "NO_MATCH"
    ) {
      return value;
    }

    return "NO_MATCH";
  }

  private toStatus(
    value: unknown,
  ): KnowledgeDecisionContextStatus {
    if (
      value === "UNVERIFIED" ||
      value === "VERIFIED" ||
      value === "STALE" ||
      value === "DISPUTED" ||
      value === "REJECTED" ||
      value === "NO_MATCH"
    ) {
      return value;
    }

    return "NO_MATCH";
  }
}

type KnowledgeDecisionContextStatus =
  | "UNVERIFIED"
  | "VERIFIED"
  | "STALE"
  | "DISPUTED"
  | "REJECTED"
  | "NO_MATCH";
