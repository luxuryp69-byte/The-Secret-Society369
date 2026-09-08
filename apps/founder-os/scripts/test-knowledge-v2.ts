import assert from "node:assert/strict";
import { extractClaims } from "../lib/knowledge/ingestion/extractClaims";
import { fetchSource } from "../lib/knowledge/ingestion/fetchSource";
import { calculateFreshness } from "../lib/knowledge/freshness/calculateFreshness";
import { getSourceAuthority } from "../lib/knowledge/verification/authority";
import { verifyClaim } from "../lib/knowledge/verification/verifyClaim";
import type { KnowledgeItem } from "../lib/knowledge/types";

const NOW = new Date("2026-01-01T00:00:00.000Z");

function makeItem(
  overrides: Partial<KnowledgeItem> = {},
): KnowledgeItem {
  return {
    id: "item-1",
    claim: "The official government program provides support for founders.",
    source: {
      title: "Government Program",
      url: "https://example.gov/program",
      publisher: "example.gov",
      type: "government",
    },
    topic: "founder-support",
    confidence: 90,
    verificationStatus: "UNVERIFIED",
    tags: ["founders"],
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

async function testFetchSource() {
  const html = `
    <html>
      <head>
        <title>Founder OS Test</title>
        <script>ignore this</script>
      </head>
      <body>
        <h1>Founder OS</h1>
        <p>This is a sufficiently long factual sentence that should become readable source content.</p>
        <style>ignore this too</style>
      </body>
    </html>
  `;

  const fakeFetch: typeof fetch = async () =>
    new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });

  const result = await fetchSource(
    "https://example.com/article",
    fakeFetch,
  );

  assert.equal(result.title, "Founder OS Test");
  assert.equal(result.content.includes("ignore this"), false);
  assert.equal(
    result.content.includes("sufficiently long factual sentence"),
    true,
  );
}

async function testPrivateHostsRejected() {
  await assert.rejects(
    () =>
      fetchSource(
        "http://127.0.0.1/internal",
        async () => new Response("blocked"),
      ),
    /Private IP addresses are not allowed/,
  );

  await assert.rejects(
    () =>
      fetchSource(
        "http://localhost/internal",
        async () => new Response("blocked"),
      ),
    /Private\/local hosts are not allowed/,
  );
}

async function testUnsupportedProtocolRejected() {
  await assert.rejects(
    () =>
      fetchSource(
        "file:///etc/passwd",
        async () => new Response("blocked"),
      ),
    /Only HTTP and HTTPS sources are supported/,
  );
}

async function testAuthority() {
  assert.equal(getSourceAuthority("government"), 100);
  assert.equal(getSourceAuthority("academic"), 95);
  assert.equal(getSourceAuthority("official"), 90);
  assert.equal(getSourceAuthority("news"), 70);
  assert.equal(getSourceAuthority("community"), 45);
  assert.equal(getSourceAuthority("other"), 25);
}

async function testFreshness() {
  const stale = calculateFreshness(
    "2025-01-01T00:00:00.000Z",
    "2025-12-01T00:00:00.000Z",
    NOW,
  );

  assert.equal(stale.status, "STALE");

  const fresh = calculateFreshness(
    "2025-12-20T00:00:00.000Z",
    "2026-02-01T00:00:00.000Z",
    NOW,
  );

  assert.equal(fresh.status, "FRESH");
  assert.equal(fresh.ageDays, 12);
}

async function testClaimExtraction() {
  const document = {
    url: "https://example.gov/founders",
    finalUrl: "https://example.gov/founders",
    title: "Founder Support",
    content:
      "The government program supports eligible founders. " +
      "Applications are reviewed according to published eligibility criteria. " +
      "Applicants must provide documentation before receiving support.",
    fetchedAt: NOW.toISOString(),
    contentType: "text/html",
  };

  const claims = extractClaims(document);

  assert.equal(claims.length, 3);
  assert.equal(claims[0].source.type, "government");
  assert.equal(claims[0].source.publisher, "example.gov");
  assert.equal(claims[0].topic, "example.gov");
}

async function testHighAuthorityVerification() {
  const item = makeItem();

  const result = verifyClaim(item, [], NOW);

  assert.equal(result.status, "VERIFIED");
  assert.equal(result.authorityScore, 100);
  assert.equal(result.corroborated, false);
}

async function testCorroboration() {
  const item = makeItem({
    id: "item-2",
    confidence: 75,
  });

  const existing = makeItem({
    id: "item-1",
    claim: item.claim,
  });

  const result = verifyClaim(item, [existing], NOW);

  assert.equal(result.status, "VERIFIED");
  assert.equal(result.corroborated, true);
  assert.equal(result.supportingSources, 1);
}

async function testLowAuthorityRemainsUnverified() {
  const item = makeItem({
    source: {
      title: "Community Post",
      url: "https://community.example.com/post",
      publisher: "community.example.com",
      type: "community",
    },
    confidence: 99,
  });

  const result = verifyClaim(item, [], NOW);

  assert.equal(result.status, "UNVERIFIED");
}

async function testExplicitRejectedAndDisputed() {
  const rejected = verifyClaim(
    makeItem({
      verificationStatus: "REJECTED",
    }),
    [],
    NOW,
  );

  assert.equal(rejected.status, "REJECTED");

  const disputed = verifyClaim(
    makeItem({
      verificationStatus: "DISPUTED",
    }),
    [],
    NOW,
  );

  assert.equal(disputed.status, "DISPUTED");
}

async function testExpiredClaimWins() {
  const item = makeItem({
    confidence: 99,
    expiresAt: "2025-12-31T23:59:59.000Z",
  });

  const result = verifyClaim(item, [], NOW);

  assert.equal(result.status, "STALE");
}

async function run() {
  await testFetchSource();
  await testPrivateHostsRejected();
  await testUnsupportedProtocolRejected();
  await testAuthority();
  await testFreshness();
  await testClaimExtraction();
  await testHighAuthorityVerification();
  await testCorroboration();
  await testLowAuthorityRemainsUnverified();
  await testExplicitRejectedAndDisputed();
  await testExpiredClaimWins();

  console.log("Knowledge Layer v2 tests passed.");
}

run().catch((error) => {
  console.error("Knowledge Layer v2 tests failed.");
  console.error(error);
  process.exit(1);
});
