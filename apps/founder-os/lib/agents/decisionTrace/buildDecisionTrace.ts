import type {
  AgentKnowledgeDecisionContext,
  KnowledgeDecisionEvidence,
} from "../knowledge/decision/types";
import type {
  DecisionTrace,
  DecisionTraceBuildInput,
  TraceCEOOutput,
  TraceEvidenceReference,
  TraceExcludedInformation,
  TraceKnowledge,
  TraceSourceReference,
} from "./types";

function copyStringArray(
  values: readonly string[] | undefined,
): string[] {
  return values === undefined ? [] : [...values];
}

function copyExcludedInformation(
  values: readonly TraceExcludedInformation[] | undefined,
): TraceExcludedInformation[] {
  return (values ?? []).map((value) => ({
    category: value.category,
    ...(value.reference !== undefined
      ? { reference: value.reference }
      : {}),
    reason: value.reason,
  }));
}

export function projectTraceEvidence(
  evidence: KnowledgeDecisionEvidence,
): TraceEvidenceReference {
  const sourceUrls = copyStringArray(
    evidence.sourceUrls,
  );

  return {
    itemId: evidence.itemId,
    claim: evidence.claim,
    ...(sourceUrls[0] !== undefined
      ? { sourceUrl: sourceUrls[0] }
      : {}),
    sourceUrls,
    status: evidence.status,
    confidence: evidence.confidence,
    authorityScore: evidence.authorityScore,
    corroborated: evidence.corroborated,
    supportingSources: evidence.supportingSources,
    conflictingSources: evidence.conflictingSources,
    reason: evidence.reason,
  };
}

function copyEvidenceReference(
  evidence: TraceEvidenceReference,
): TraceEvidenceReference {
  return {
    itemId: evidence.itemId,
    claim: evidence.claim,
    ...(evidence.sourceUrl !== undefined
      ? { sourceUrl: evidence.sourceUrl }
      : {}),
    sourceUrls: [...evidence.sourceUrls],
    status: evidence.status,
    confidence: evidence.confidence,
    authorityScore: evidence.authorityScore,
    corroborated: evidence.corroborated,
    supportingSources: evidence.supportingSources,
    conflictingSources: evidence.conflictingSources,
    reason: evidence.reason,
  };
}

function copySources(
  sources: readonly TraceSourceReference[],
): TraceSourceReference[] {
  return sources.map((source) => ({
    title: source.title,
    publisher: source.publisher,
    url: source.url,
    type: source.type,
    ...(source.publishedAt !== undefined
      ? { publishedAt: source.publishedAt }
      : {}),
    ...(source.fetchedAt !== undefined
      ? { fetchedAt: source.fetchedAt }
      : {}),
    ...(source.verifiedAt !== undefined
      ? { verifiedAt: source.verifiedAt }
      : {}),
  }));
}

function copyKnowledge(
  knowledge: AgentKnowledgeDecisionContext,
  excludedInformation: readonly TraceExcludedInformation[],
): TraceKnowledge {
  return {
    query: knowledge.query,
    availability: knowledge.availability,
    status: knowledge.status,
    classification: knowledge.classification,
    canUseAsTrustedContext:
      knowledge.canUseAsTrustedContext,
    knowledgeConfidence:
      knowledge.knowledgeConfidence,
    evidence: knowledge.evidence.map(projectTraceEvidence),
    sources: copySources(knowledge.sources),
    warnings: copyStringArray(knowledge.warnings),
    excludedInformation:
      copyExcludedInformation(excludedInformation),
  };
}

function copyOutput(
  output: TraceCEOOutput,
): TraceCEOOutput {
  return {
    primaryPriority: output.primaryPriority,
    why: output.why,
    plan: [...output.plan],
    successCriteria: [...output.successCriteria],
    whatNotToPrioritize:
      output.whatNotToPrioritize,
  };
}

function copyValidation(
  validation: NonNullable<
    DecisionTraceBuildInput["decision"]["metadata"]["validation"]
  >,
) {
  return {
    valid: validation.valid,
    classification: validation.classification,
    reason: validation.reason,
  };
}

export function buildDecisionTrace(
  input: DecisionTraceBuildInput,
): DecisionTrace {
  const excludedInformation =
    copyExcludedInformation(
      input.excludedInformation,
    );

  const knowledge = copyKnowledge(
    input.knowledge,
    excludedInformation,
  );

  const metadata = input.decision.metadata;

  const explanation = {
    facts: copyStringArray(input.knowledge.facts),
    inferences: [
      ...copyStringArray(input.knowledge.inferences),
      ...copyStringArray(metadata.inferences),
    ],
    assumptions: [
      ...copyStringArray(input.knowledge.assumptions),
      ...copyStringArray(metadata.assumptions),
    ],
    unknowns: [
      ...copyStringArray(input.knowledge.unknowns),
      ...copyStringArray(metadata.unknowns),
    ],
    warnings: [
      ...copyStringArray(input.knowledge.warnings),
      ...copyStringArray(metadata.warnings),
    ],
    strategicConstraints: [
      input.strategicSignal.constraint,
    ],
    excludedInformation:
      copyExcludedInformation(excludedInformation),
  };

  return {
    traceId: input.traceId,
    createdAt: input.createdAt,
    input: {
      message: input.input.message,
    },
    strategicSignal: {
      constraint:
        input.strategicSignal.constraint,
      evidence: [
        ...input.strategicSignal.evidence,
      ],
      confidence:
        input.strategicSignal.confidence,
    },
    knowledge,
    decision: {
      output: copyOutput(
        input.decision.output,
      ),
      resolution: metadata.resolution,
      ...(metadata.classification !== undefined
        ? {
            classification:
              metadata.classification,
          }
        : {}),
      ...(metadata.decisionConfidence !== undefined
        ? {
            decisionConfidence:
              metadata.decisionConfidence,
          }
        : {}),
      knowledgeConfidence:
        input.knowledge.knowledgeConfidence,
      acceptedEvidence: (
        metadata.acceptedEvidence ?? []
      ).map(copyEvidenceReference),
      ...(metadata.validation !== undefined
        ? {
            validation: copyValidation(
              metadata.validation,
            ),
          }
        : {}),
      ...(metadata.fallbackReason !== undefined
        ? {
            fallbackReason:
              metadata.fallbackReason,
          }
        : {}),
    },
    explanation,
  };
}
