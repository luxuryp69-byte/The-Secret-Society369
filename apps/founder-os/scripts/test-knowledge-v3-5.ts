import assert from "node:assert/strict";

import type { KnowledgeItem } from "../lib/knowledge/types";
import { buildTrustedAnswer } from "../lib/knowledge/answers/trustedAnswerBuilder";
import type { VerificationResult } from "../lib/knowledge/verification/verifyClaim";

function createItem(): KnowledgeItem {
  return {
    id: "item-v3-5",
    claim: "Founder OS provides verified knowledge.",
    source: {
      title: "Founder OS Official",
      url: "https://example.com/founder-os",
      publisher: "Founder OS",
      type: "official",
    },
    topic: "founder-os",
    confidence: 90,
    verificationStatus: "UNVERIFIED",
    tags: ["knowledge"],
    provenance: {
      sourceUrl: "https://example.com/founder-os",
      fetchedAt: "2026-09-10T12:00:00.000Z",
    },
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-10T12:00:00.000Z",
  };
}

function createVerification(
  overrides: Partial<VerificationResult> = {},
): VerificationResult {
  return {
    status: "VERIFIED",
    authorityScore: 90,
    corroborated: true,
    supportingSources: 2,
    conflictingSources: 0,
    reason: "The claim is supported by authoritative evidence.",
    ...overrides,
  };
}

function testTrustedAnswerContract() {
  const result = buildTrustedAnswer({
    answer: "Founder OS provides verified knowledge.",
    item: createItem(),
    verification: createVerification(),
  });

  assert.equal(
    result.answer,
    "Founder OS provides verified knowledge.",
  );

  assert.equal(result.status, "VERIFIED");
  assert.equal(result.sources.length, 1);
  assert.equal(result.evidence.length, 1);
  assert.deepEqual(result.warnings, []);
  assert.ok(result.confidence > 0);
  assert.ok(result.explanation.length > 0);

  console.log("✅ trusted answer exposes answer, evidence and source");
}

function testDisputedAnswer() {
  const result = buildTrustedAnswer({
    answer: "The claim is currently disputed.",
    item: createItem(),
    verification: createVerification({
      status: "DISPUTED",
      authorityScore: 80,
      corroborated: false,
      supportingSources: 0,
      conflictingSources: 2,
      reason: "Two independent sources conflict.",
    }),
  });

  assert.equal(result.status, "DISPUTED");
  assert.ok(result.warnings.includes("DISPUTED"));
  assert.equal(result.evidence[0]?.conflictingSources, 2);
  assert.ok(result.explanation.includes("DISPUTED"));

  console.log("✅ disputed answer exposes conflict warning");
}

function testStaleAnswer() {
  const result = buildTrustedAnswer({
    answer: "This information may be outdated.",
    item: createItem(),
    verification: createVerification({
      status: "STALE",
      authorityScore: 90,
      corroborated: true,
      reason: "The source has expired.",
    }),
  });

  assert.equal(result.status, "STALE");
  assert.ok(result.warnings.includes("STALE"));
  assert.equal(result.confidence, 40);

  console.log("✅ stale answer exposes freshness warning");
}

function testUnverifiedAnswer() {
  const result = buildTrustedAnswer({
    answer: "This claim has not been verified.",
    item: createItem(),
    verification: createVerification({
      status: "UNVERIFIED",
      authorityScore: 30,
      corroborated: false,
      supportingSources: 0,
      reason: "The evidence is insufficient.",
    }),
  });

  assert.equal(result.status, "UNVERIFIED");
  assert.ok(result.warnings.includes("UNVERIFIED"));
  assert.ok(result.confidence > 0);

  console.log("✅ unverified answer exposes verification warning");
}

function testRejectedAnswer() {
  const result = buildTrustedAnswer({
    answer: "This claim should not be trusted.",
    item: createItem(),
    verification: createVerification({
      status: "REJECTED",
      authorityScore: 10,
      corroborated: false,
      supportingSources: 0,
      reason: "The claim was rejected.",
    }),
  });

  assert.equal(result.status, "REJECTED");
  assert.equal(result.confidence, 0);
  assert.ok(result.warnings.includes("REJECTED"));

  console.log("✅ rejected answer has zero trust confidence");
}

function main() {
  testTrustedAnswerContract();
  testDisputedAnswer();
  testStaleAnswer();
  testUnverifiedAnswer();
  testRejectedAnswer();

  console.log(
    "\n🎉 Knowledge Layer v3.5 tests passed.",
  );
}

main();
