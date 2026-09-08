export type FreshnessStatus = "FRESH" | "STALE";

export interface FreshnessResult {
  status: FreshnessStatus;
  ageDays: number;
  expiresAt?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function calculateFreshness(
  publishedAt: string | undefined,
  expiresAt: string | undefined,
  now = new Date(),
): FreshnessResult {
  if (expiresAt) {
    const expiration = new Date(expiresAt);

    if (!Number.isNaN(expiration.getTime()) && expiration <= now) {
      return {
        status: "STALE",
        ageDays: publishedAt
          ? Math.max(
              0,
              Math.floor(
                (now.getTime() - new Date(publishedAt).getTime()) / DAY_MS,
              ),
            )
          : 0,
        expiresAt: expiration.toISOString(),
      };
    }
  }

  if (!publishedAt) {
    return {
      status: "FRESH",
      ageDays: 0,
      expiresAt,
    };
  }

  const published = new Date(publishedAt);

  if (Number.isNaN(published.getTime())) {
    return {
      status: "FRESH",
      ageDays: 0,
      expiresAt,
    };
  }

  const ageDays = Math.max(
    0,
    Math.floor((now.getTime() - published.getTime()) / DAY_MS),
  );

  return {
    status: "FRESH",
    ageDays,
    expiresAt,
  };
}
