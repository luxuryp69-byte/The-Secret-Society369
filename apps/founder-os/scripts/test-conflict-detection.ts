import assert from "node:assert/strict";

import type { KnowledgeItem } from "../lib/knowledge/types";
import { detectConflicts } from "../lib/knowledge/conflicts/detectConflict";

const existingItem: KnowledgeItem = {
  id: "existing-positive",
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
  createdAt: "2026-09-10T12:00:00.000Z",
  updatedAt: "2026-09-10T12:00:00.000Z",
};

const conflictingItem: KnowledgeItem = {
  id: "new-negative",
  claim: "Founder OS does not provide verified knowledge.",
  source: {
    title: "Independent Test Source",
    url: "https://example.org/independent-source",
    publisher: "Independent Test Source",
    type: "research",
  },
  topic: "founder-os",
  confidence: 85,
  verificationStatus: "UNVERIFIED",
  tags: ["knowledge", "conflict-test"],
  createdAt: "2026-09-10T12:00:00.000Z",
  updatedAt: "2026-09-10T12:00:00.000Z",
};

const result = detectConflicts(
  conflictingItem,
  [existingItem],
);

console.log(
  JSON.stringify(result, null, 2),
);

assert.equal(
  result.hasConflict,
  true,
  "Expected the opposing claims to conflict.",
);

assert.ok(
  result.conflicts.length > 0,
  "Expected at least one detected conflict candidate.",
);

console.log(
  "\n✅ Conflict detector correctly identifies the contradiction.",
);
