import assert from "node:assert/strict";
import { detectConflicts } from "../lib/knowledge/conflicts/detectConflict";
import { verifyClaim } from "../lib/knowledge/verification/verifyClaim";
import type { KnowledgeItem } from "../lib/knowledge/types";

const NOW = "2026-09-10T12:00:00.000Z";

function createItem(
  overrides: Partial<KnowledgeItem>,
): KnowledgeItem {
  const sourceUrl =
    overrides.provenance?.sourceUrl ??
    overrides.source?.url ??
    "https://example.com/source";

  return {
    id: overrides.id ?? crypto.randomUUID(),
    claim:
      overrides.claim ??
      "The product supports offline operation.",
    source:
      overrides.source ?? {
        title: "Example Source",
        url: sourceUrl,
        publisher: "Example",
        type: "official",
      },
    topic: overrides.topic ?? "product-capability",
    publishedAt:
      overrides.publishedAt ?? NOW,
    verifiedAt:
      overrides.verifiedAt ?? NOW,
    confidence:
      overrides.confidence ?? 90,
    verificationStatus:
      overrides.verificationStatus ?? "UNVERIFIED",
    tags: overrides.tags ?? [],
    provenance:
      overrides.provenance ?? {
        sourceUrl,
        fetchedAt: NOW,
        publishedAt: NOW,
        verifiedAt: NOW,
      },
    createdAt:
      overrides.createdAt ?? NOW,
    updatedAt:
      overrides.updatedAt ?? NOW,
  };
}

function test(
  name: string,
  callback: () => void,
): void {
  callback();
  console.log(`✓ ${name}`);
}

test(
  "detects explicit negation from independent sources",
  () => {
    const item = createItem({
      id: "claim-a",
      claim:
        "The platform supports offline operation.",
      provenance: {
        sourceUrl:
          "https://official.example.com/platform",
        fetchedAt: NOW,
      },
    });

    const conflicting = createItem({
      id: "claim-b",
      claim:
        "The platform does not support offline operation.",
      provenance: {
        sourceUrl:
          "https://research.example.com/platform",
        fetchedAt: NOW,
      },
    });

    const result = detectConflicts(
      item,
      [conflicting],
    );

    assert.equal(result.hasConflict, true);
    assert.equal(
      result.conflicts[0]?.type,
      "EXPLICIT_NEGATION",
    );
  },
);

test(
  "does not mark the same source as a conflict",
  () => {
    const sourceUrl =
      "https://example.com/platform";

    const item = createItem({
      id: "same-source-a",
      claim:
        "The platform supports offline operation.",
      provenance: {
        sourceUrl,
        fetchedAt: NOW,
      },
    });

    const conflicting = createItem({
      id: "same-source-b",
      claim:
        "The platform does not support offline operation.",
      provenance: {
        sourceUrl,
        fetchedAt: NOW,
      },
    });

    const result = detectConflicts(
      item,
      [conflicting],
    );

    assert.equal(result.hasConflict, false);
  },
);

test(
  "detects incompatible numeric claims",
  () => {
    const item = createItem({
      id: "numeric-a",
      claim:
        "The service supports 100 concurrent users.",
      provenance: {
        sourceUrl:
          "https://source-a.example.com/limits",
        fetchedAt: NOW,
      },
    });

    const conflicting = createItem({
      id: "numeric-b",
      claim:
        "The service supports 500 concurrent users.",
      provenance: {
        sourceUrl:
          "https://source-b.example.com/limits",
        fetchedAt: NOW,
      },
    });

    const result = detectConflicts(
      item,
      [conflicting],
    );

    assert.equal(result.hasConflict, true);
    assert.equal(
      result.conflicts[0]?.type,
      "NUMERIC_DISAGREEMENT",
    );
  },
);

test(
  "does not conflict on compatible claims",
  () => {
    const item = createItem({
      id: "compatible-a",
      claim:
        "The platform supports offline operation.",
      provenance: {
        sourceUrl:
          "https://source-a.example.com/platform",
        fetchedAt: NOW,
      },
    });

    const supporting = createItem({
      id: "compatible-b",
      claim:
        "The platform supports offline operation.",
      provenance: {
        sourceUrl:
          "https://source-b.example.com/platform",
        fetchedAt: NOW,
      },
    });

    const result = detectConflicts(
      item,
      [supporting],
    );

    assert.equal(result.hasConflict, false);
  },
);

test(
  "verification refuses to verify a conflicting claim",
  () => {
    const item = createItem({
      id: "verify-a",
      claim:
        "The platform supports offline operation.",
      confidence: 100,
      source: {
        title: "Official Platform Documentation",
        url:
          "https://official.example.com/platform",
        publisher: "Official",
        type: "official",
      },
      provenance: {
        sourceUrl:
          "https://official.example.com/platform",
        fetchedAt: NOW,
      },
    });

    const conflicting = createItem({
      id: "verify-b",
      claim:
        "The platform does not support offline operation.",
      confidence: 100,
      source: {
        title: "Independent Research",
        url:
          "https://research.example.com/platform",
        publisher: "Research",
        type: "research",
      },
      provenance: {
        sourceUrl:
          "https://research.example.com/platform",
        fetchedAt: NOW,
      },
    });

    const result = verifyClaim(
      item,
      [conflicting],
      new Date(NOW),
    );

    assert.equal(result.status, "DISPUTED");
    assert.equal(result.conflictingSources, 1);
    assert.match(
      result.reason,
      /Independent sources make mutually exclusive claims/,
    );
  },
);

console.log(
  "\nKnowledge Layer v3.1 conflict detection: 5/5 tests passed.",
);
