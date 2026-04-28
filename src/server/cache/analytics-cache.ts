import Redis from "ioredis";

type CacheRecord = {
  value: string;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheRecord>();

const redisClient =
  process.env.REDIS_URL && process.env.REDIS_URL.length > 0
    ? new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        lazyConnect: true,
      })
    : null;

let redisConnected = false;

async function tryConnectRedis() {
  if (!redisClient || redisConnected) {
    return;
  }
  try {
    await redisClient.connect();
    redisConnected = true;
  } catch {
    redisConnected = false;
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  await tryConnectRedis();
  if (redisClient && redisConnected) {
    const raw = await redisClient.get(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  }

  const current = memoryCache.get(key);
  if (!current) {
    return null;
  }
  if (Date.now() > current.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return JSON.parse(current.value) as T;
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  await tryConnectRedis();
  const payload = JSON.stringify(value);
  if (redisClient && redisConnected) {
    await redisClient.set(key, payload, "EX", ttlSeconds);
    return;
  }
  memoryCache.set(key, {
    value: payload,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function getOrSetCache<T>(args: {
  key: string;
  ttlSeconds: number;
  compute: () => Promise<T>;
}): Promise<T> {
  const cached = await getCache<T>(args.key);
  if (cached) {
    return cached;
  }
  const value = await args.compute();
  await setCache(args.key, value, args.ttlSeconds);
  return value;
}
