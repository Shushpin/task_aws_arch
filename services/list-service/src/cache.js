import { createClient } from 'redis';

export async function createCache(redisUrl, logger = console) {
  const client = createClient({ url: redisUrl });

  client.on('error', (error) => {
    logger.error('Redis client error', { error: error.message });
  });

  await client.connect();
  return client;
}

export async function checkCache(client) {
  const response = await client.ping();
  return { ok: response === 'PONG' };
}

export async function getJson(client, key) {
  const value = await client.get(key);
  return value ? JSON.parse(value) : null;
}

export async function setJson(client, key, value, ttlSeconds) {
  await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
}

export async function invalidateCatalogCache(client) {
  let cursor = 0;
  do {
    const scan = await client.scan(cursor, { MATCH: 'list-service:*', COUNT: 100 });
    cursor = Number(scan.cursor);
    if (scan.keys.length > 0) {
      await client.del(scan.keys);
    }
  } while (cursor !== 0);
}
