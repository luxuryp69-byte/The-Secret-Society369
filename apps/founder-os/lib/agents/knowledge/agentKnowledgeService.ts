import type {
  KnowledgeQueryCandidate,
  KnowledgeQueryResult,
} from "../../knowledge/query/types";
import type {
  AgentKnowledgeContext,
  AgentKnowledgeQueryOptions,
  KnowledgeQueryPort,
} from "./types";

export class AgentKnowledgeService {
  constructor(
    private readonly knowledge: KnowledgeQueryPort,
  ) {}

  async getContext(
    query: string,
    options?: AgentKnowledgeQueryOptions,
  ): Promise<AgentKnowledgeContext> {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return this.buildNoMatchContext(
        normalizedQuery,
        "Knowledge query is empty.",
      );
    }

    const result = await this.knowledge.query(
      normalizedQuery,
      options,
    );

    return this.toAgentContext(result);
  }

  private toAgentContext(
    result: KnowledgeQueryResult,
  ): AgentKnowledgeContext {
    if (
      result.status === "NO_MATCH" ||
      result.trustedAnswer === null
    ) {
      return this.buildNoMatchContext(
        result.query,
        "No verified knowledge matched the query.",
        result.matchedItems,
        result.candidates,
      );
    }

    const trustedAnswer = result.trustedAnswer;

    if (trustedAnswer.status === "REJECTED") {
      return {
        query: result.query,
        availability: "BLOCKED",
        status: "REJECTED",
        answer: null,
        confidence: 0,
        canUseAsTrustedContext: false,
        matchedItems: result.matchedItems,
        sources: trustedAnswer.sources,
        evidence: trustedAnswer.evidence,
        candidates: result.candidates,
        warnings: trustedAnswer.warnings,
        blockReason: "REJECTED",
        explanation:
          "Knowledge evidence was rejected and must not be used as trusted agent context.",
      };
    }

    if (trustedAnswer.status === "DISPUTED") {
      return {
        query: result.query,
        availability: "BLOCKED",
        status: "DISPUTED",
        answer: null,
        confidence: trustedAnswer.confidence,
        canUseAsTrustedContext: false,
        matchedItems: result.matchedItems,
        sources: trustedAnswer.sources,
        evidence: trustedAnswer.evidence,
        candidates: result.candidates,
        warnings: trustedAnswer.warnings,
        blockReason: "DISPUTED",
        explanation:
          "Conflicting evidence was detected. The agent must not treat this knowledge as trusted context.",
      };
    }

    if (
      trustedAnswer.status === "STALE" ||
      trustedAnswer.status === "UNVERIFIED"
    ) {
      return {
        query: result.query,
        availability: "WARNING",
        status: trustedAnswer.status,
        answer: trustedAnswer.answer,
        confidence: trustedAnswer.confidence,
        canUseAsTrustedContext: false,
        matchedItems: result.matchedItems,
        sources: trustedAnswer.sources,
        evidence: trustedAnswer.evidence,
        candidates: result.candidates,
        warnings: trustedAnswer.warnings,
        explanation:
          trustedAnswer.status === "STALE"
            ? "Knowledge was found, but the evidence is stale and should not be treated as trusted current context."
            : "Knowledge was found, but the evidence has not been sufficiently verified for trusted agent context.",
      };
    }

    return {
      query: result.query,
      availability: "AVAILABLE",
      status: trustedAnswer.status,
      answer: trustedAnswer.answer,
      confidence: trustedAnswer.confidence,
      canUseAsTrustedContext: true,
      matchedItems: result.matchedItems,
      sources: trustedAnswer.sources,
      evidence: trustedAnswer.evidence,
      candidates: result.candidates,
      warnings: trustedAnswer.warnings,
      explanation:
        "Verified knowledge is available and can be used as trusted agent context.",
    };
  }

  private buildNoMatchContext(
    query: string,
    explanation: string,
    matchedItems = 0,
    candidates: KnowledgeQueryCandidate[] = [],
  ): AgentKnowledgeContext {
    return {
      query,
      availability: "NO_MATCH",
      status: "NO_MATCH",
      answer: null,
      confidence: 0,
      canUseAsTrustedContext: false,
      matchedItems,
      sources: [],
      evidence: [],
      candidates,
      warnings: [],
      blockReason: "NO_MATCH",
      explanation,
    };
  }
}