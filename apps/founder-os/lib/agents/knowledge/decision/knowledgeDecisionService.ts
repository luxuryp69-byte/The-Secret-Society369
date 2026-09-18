import type {
  AgentKnowledgeAvailability,
  AgentKnowledgeContext,
} from "../types";

import type {
  KnowledgeDecisionEvidence,
  AgentKnowledgeDecisionContext,
  KnowledgeDecisionLLMMetadata,
  KnowledgeDecisionValidationResult,
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
  candidates: AgentKnowledgeContext["candidates"] = [],
): KnowledgeDecisionEvidence[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sourceUrlsByItemId = new Map<string, string[]>();

  for (const candidate of candidates) {
    const itemId = candidate.item.id.trim();
    const sourceUrl = candidate.item.source.url.trim();

    if (!itemId || !sourceUrl) {
      continue;
    }

    sourceUrlsByItemId.set(itemId, [sourceUrl]);
  }

  return value
    .filter(isObject)
    .map((item) => {
      const itemId =
        typeof item.itemId === "string"
          ? item.itemId.trim()
          : "";

      const sourceUrls =
        Array.isArray(item.sourceUrls)
          ? item.sourceUrls.filter(
              (sourceUrl): sourceUrl is string =>
                typeof sourceUrl === "string" &&
                sourceUrl.trim() !== "",
            ).map((sourceUrl) => sourceUrl.trim())
          : sourceUrlsByItemId.get(itemId) ?? [];

      return {
        itemId,
        claim:
          typeof item.claim === "string"
            ? item.claim
            : "",
        status:
          typeof item.status === "string"
            ? item.status as KnowledgeDecisionEvidence["status"]
            : "UNVERIFIED",
        ...(sourceUrls.length > 0 ? { sourceUrls } : {}),
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
      };
    })
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

function normalizeClaim(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function claimsMatch(
  left: string,
  right: string,
): boolean {
  const a = normalizeClaim(left);
  const b = normalizeClaim(right);

  return (
    a.length > 0 &&
    b.length > 0 &&
    a === b
  );
}

function normalizeSourceUrl(value: string): string {
  return value
    .trim()
    .replace(/\/+$/, "");
}

function isVerifiedDecisionContext(
  context: AgentKnowledgeDecisionContext,
): boolean {
  return (
    context.availability === "AVAILABLE" &&
    context.status === "VERIFIED" &&
    context.classification === "FACT" &&
    context.canUseAsTrustedContext &&
    context.answer !== null &&
    context.sources.length > 0 &&
    context.evidence.length > 0 &&
    context.evidence.every(
      (item) => item.status === "VERIFIED",
    )
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
      toEvidence(
        context.evidence,
        context.candidates ?? [],
      );

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
        knowledgeConfidence: confidence,
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

  validateLLMDecision(
    context: AgentKnowledgeDecisionContext,
    metadata?: KnowledgeDecisionLLMMetadata,
  ): KnowledgeDecisionValidationResult {
    const verifiedContext =
      isVerifiedDecisionContext(context);

    if (metadata === undefined) {
      if (!verifiedContext) {
        return {
          valid: false,
          classification: context.classification,
          reason:
            "Non-FACT knowledge requires explicit LLM classification metadata.",
        };
      }

      return {
        valid: true,
        classification: "FACT",
        reason:
          "Legacy CEO output is accepted because the Knowledge Layer supplied a verified FACT context.",
      };
    }

    const classification =
      metadata.classification ??
      context.classification;

    if (
      context.classification !== "FACT" &&
      metadata.classification === undefined
    ) {
      return {
        valid: false,
        classification,
        reason:
          "LLM output must classify non-trusted knowledge explicitly.",
      };
    }

    if (
      metadata.knowledgeConfidence !== undefined &&
      metadata.knowledgeConfidence !==
        context.knowledgeConfidence
    ) {
      return {
        valid: false,
        classification,
        reason:
          "LLM knowledgeConfidence does not match the Knowledge Layer confidence.",
      };
    }

    if (
      metadata.decisionConfidence !== undefined &&
      (
        !Number.isFinite(metadata.decisionConfidence) ||
        metadata.decisionConfidence < 0 ||
        metadata.decisionConfidence > 100
      )
    ) {
      return {
        valid: false,
        classification,
        reason:
          "LLM decisionConfidence must be between 0 and 100.",
      };
    }

    const evidenceById = new Map(
      context.evidence.map((item) => [
        item.itemId,
        item,
      ]),
    );

    const sourceUrls = new Set(
      context.sources.map((source) =>
        normalizeSourceUrl(source.url),
      ),
    );

    if (metadata.sources !== undefined) {
      for (const sourceUrl of metadata.sources) {
        if (
          !sourceUrls.has(
            normalizeSourceUrl(sourceUrl),
          )
        ) {
          return {
            valid: false,
            classification,
            reason:
              "LLM cited a source URL absent from the Knowledge Layer context.",
          };
        }
      }
    }

    if (metadata.evidence !== undefined) {
      if (metadata.evidence.length === 0) {
        return {
          valid: false,
          classification,
          reason:
            "LLM supplied an empty evidence list for a grounded decision.",
        };
      }

      for (const citation of metadata.evidence) {
        const evidence = evidenceById.get(
          citation.itemId,
        );

        if (!evidence) {
          return {
            valid: false,
            classification,
            reason:
              "LLM cited an evidence item absent from the Knowledge Layer context.",
          };
        }

        if (
          citation.claim === undefined ||
          citation.sourceUrl === undefined ||
          citation.status === undefined
        ) {
          return {
            valid: false,
            classification,
            reason:
              "LLM evidence citations must include itemId, claim, source URL, and status.",
          };
        }

        if (!claimsMatch(citation.claim, evidence.claim)) {
          return {
            valid: false,
            classification,
            reason:
              "LLM cited a claim that is not backed by the Knowledge Layer evidence.",
          };
        }

        if (citation.status !== evidence.status) {
          return {
            valid: false,
            classification,
            reason:
              "LLM evidence status does not match the verified Knowledge Layer status.",
          };
        }

        if (
          citation.confidence !== undefined &&
          citation.confidence !== evidence.confidence
        ) {
          return {
            valid: false,
            classification,
            reason:
              "LLM evidence confidence does not match the Knowledge Layer confidence.",
          };
        }

        const evidenceSourceUrls = new Set(
          (evidence.sourceUrls ?? []).map(
            normalizeSourceUrl,
          ),
        );

        if (
          !evidenceSourceUrls.has(
            normalizeSourceUrl(citation.sourceUrl),
          )
        ) {
          return {
            valid: false,
            classification,
            reason:
              "LLM cited a source URL that does not belong to the cited Knowledge Layer evidence item.",
          };
        }
      }
    }

    const verifiedClaims = context.evidence
      .filter((item) => item.status === "VERIFIED")
      .map((item) => item.claim);

    if (
      context.classification !== "FACT" &&
      metadata.facts !== undefined &&
      metadata.facts.length > 0
    ) {
      return {
        valid: false,
        classification,
        reason:
          "Non-FACT decisions cannot assert Knowledge Layer facts.",
      };
    }

    if (
      metadata.facts !== undefined &&
      metadata.facts.some(
        (fact) =>
          !verifiedClaims.some((claim) =>
            claimsMatch(fact, claim),
          ),
      )
    ) {
      return {
        valid: false,
        classification,
        reason:
          "LLM presented a fact that is not supported by the Knowledge Layer context.",
      };
    }

    if (
      classification === "FACT" &&
      !verifiedContext
    ) {
      return {
        valid: false,
        classification,
        reason:
          "LLM classified knowledge as FACT without a verified trusted context.",
      };
    }

    if (
      classification === "FACT" &&
      (
        metadata.evidence === undefined ||
        metadata.evidence.length === 0 ||
        metadata.evidence.some(
          (citation) => citation.status !== "VERIFIED",
        )
      )
    ) {
      return {
        valid: false,
        classification,
        reason:
          "FACT decisions require explicit VERIFIED evidence citations.",
      };
    }

    if (
      classification === "UNKNOWN" &&
      metadata.facts !== undefined &&
      metadata.facts.length > 0
    ) {
      return {
        valid: false,
        classification,
        reason:
          "UNKNOWN decisions cannot include asserted facts.",
      };
    }

    return {
      valid: true,
      classification,
      reason:
        "LLM decision metadata is consistent with the Knowledge Layer boundary.",
    };
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
      knowledgeConfidence: confidence,
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
