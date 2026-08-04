import { createClient } from 'redis';
import { getUrlTarget, redactUrl } from './config.js';

export async function createCache(config, logger = console) {
  const redisTarget = getUrlTarget(config.redisUrl);
  const client = createClient({
    url: config.redisUrl,
    socket: {
      connectTimeout: config.redisConnectTimeoutMs,
      reconnectStrategy: (retries, cause) => {
        const delay = Math.min((retries + 1) * 100, config.redisReconnectMaxDelayMs);
        logger.warn('Redis reconnect scheduled', {
          retries,
          delayMs: delay,
          configuredRedis: redisTarget,
          error: cause?.message
        });
        return delay;
      }
    }
  });

  client.on('error', (error) => {
    logger.error('Redis client error', {
      error: error.message,
      code: error.code,
      syscall: error.syscall,
      address: error.address,
      port: error.port,
      configuredRedis: redisTarget
    });
  });

  client.on('connect', () => {
    logger.info('Redis socket connected', { configuredRedis: redisTarget });
  });

  client.on('ready', () => {
    logger.info('Redis client ready', { configuredRedis: redisTarget });
  });

  client.on('end', () => {
    logger.warn('Redis client connection ended', { configuredRedis: redisTarget });
  });

  logger.info('Connecting Redis client', {
    redisUrl: redactUrl(config.redisUrl),
    configuredRedis: redisTarget
  });
  await client.connect();
  return client;
}

export async function checkCache(client) {
  if (!client.isOpen || !client.isReady) {
    return {
      ok: false,
      isOpen: client.isOpen,
      isReady: client.isReady,
      error: 'Redis client is not ready.'
    };
  }

  try {
    const response = await client.ping();
    return {
      ok: response === 'PONG',
      isOpen: client.isOpen,
      isReady: client.isReady
    };
  } catch (error) {
    return {
      ok: false,
      isOpen: client.isOpen,
      isReady: client.isReady,
      error: error.message,
      code: error.code,
      address: error.address,
      port: error.port
    };
  }
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
