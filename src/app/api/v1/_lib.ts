import crypto from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Redis from "ioredis";
import { db } from "@/lib/db";

const redis =
  process.env.REDIS_URL && process.env.REDIS_URL.length > 0
    ? new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        lazyConnect: true,
      })
    : null;

let redisConnected = false;

async function ensureRedis() {
  if (!redis || redisConnected) {
    return;
  }
  try {
    await redis.connect();
    redisConnected = true;
  } catch {
    redisConnected = false;
  }
}

export async function authenticateApiRequest(requiredScope: string) {
  const h = await headers();
  const auth = h.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const rawKey = auth.slice("Bearer ".length).trim();
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const key = await db.apiKey.findFirst({
    where: {
      keyHash,
      isActive: true,
    },
  });
  if (!key) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 },
      ),
    };
  }
  if (key.expiresAt && key.expiresAt <= new Date()) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "API key expired" },
        { status: 401 },
      ),
    };
  }
  if (!key.scopes.includes(requiredScope) && !key.scopes.includes("*")) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Forbidden scope" },
        { status: 403 },
      ),
    };
  }

  await applyRateLimit(rawKey);
  await db.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    ok: true as const,
    accountId: key.accountId,
    apiKeyId: key.id,
  };
}

const memoryHits = new Map<string, number[]>();

async function applyRateLimit(rawKey: string) {
  const now = Date.now();
  const keyId = rawKey.slice(0, 16);
  const windowStart = now - 60 * 1000;
  await ensureRedis();
  if (redis && redisConnected) {
    const redisKey = `rate:v1:${keyId}`;
    await redis.zremrangebyscore(redisKey, 0, windowStart);
    await redis.zadd(redisKey, now, `${now}`);
    await redis.expire(redisKey, 60);
    const count = await redis.zcard(redisKey);
    if (count > 100) {
      throw new Error("RATE_LIMITED");
    }
    return;
  }
  const current = (memoryHits.get(keyId) ?? []).filter(
    (ts) => ts > windowStart,
  );
  current.push(now);
  memoryHits.set(keyId, current);
  if (current.length > 100) {
    throw new Error("RATE_LIMITED");
  }
}

export function withApiErrorHandling(
  handler: () => Promise<Response>,
): Promise<Response> {
  return handler().catch((error: unknown) => {
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return NextResponse.json(
        { error: "Rate limit exceeded (100 req/min)" },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  });
}
