export function loadConfig() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const config = {
    serviceName: 'list-service',
    nodeEnv,
    logLevel: process.env.LOG_LEVEL || 'info',
    port: Number.parseInt(process.env.PORT || '3000', 10),
    databaseUrl: readRequiredUrl('DATABASE_URL', 'postgres://catalog:catalog_password@localhost:5432/catalog', nodeEnv),
    redisUrl: readRequiredUrl('REDIS_URL', 'redis://localhost:6379', nodeEnv),
    cacheTtlSeconds: Number.parseInt(process.env.CACHE_TTL_SECONDS || '60', 10),
    maxBodyBytes: Number.parseInt(process.env.MAX_BODY_BYTES || `${1024 * 1024 * 5}`, 10),
    dbPoolMax: Number.parseInt(process.env.DB_POOL_MAX || '10', 10),
    dbIdleTimeoutMs: Number.parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
    dbConnectionTimeoutMs: Number.parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
    redisConnectTimeoutMs: Number.parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || '5000', 10),
    redisReconnectMaxDelayMs: Number.parseInt(process.env.REDIS_RECONNECT_MAX_DELAY_MS || '3000', 10),
    gracefulShutdownTimeoutMs: Number.parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS || '10000', 10)
  };

  validateConfig(config);
  return config;
}

export function redactUrl(value) {
  try {
    const parsed = new URL(value);
    if (parsed.password) {
      parsed.password = '***';
    }
    if (parsed.username) {
      parsed.username = '***';
    }
    return parsed.toString();
  } catch {
    return '[invalid-url]';
  }
}

export function getUrlTarget(value) {
  try {
    const parsed = new URL(value);
    return {
      protocol: parsed.protocol.replace(':', ''),
      host: parsed.hostname,
      port: parsed.port || defaultPort(parsed.protocol)
    };
  } catch {
    return {
      protocol: 'unknown',
      host: 'unknown',
      port: 'unknown'
    };
  }
}

function readRequiredUrl(name, fallback, nodeEnv) {
  const value = process.env[name];
  if (value && value.trim()) {
    return value.trim();
  }

  if (nodeEnv === 'production') {
    throw new Error(`${name} must be set in production.`);
  }

  return fallback;
}

function validateConfig(config) {
  const errors = [];

  if (!Number.isInteger(config.port) || config.port <= 0) {
    errors.push('PORT must be a positive integer.');
  }

  if (!config.databaseUrl.startsWith('postgres://') && !config.databaseUrl.startsWith('postgresql://')) {
    errors.push('DATABASE_URL must be a postgres connection string.');
  }

  if (!config.redisUrl.startsWith('redis://') && !config.redisUrl.startsWith('rediss://')) {
    errors.push('REDIS_URL must be a redis connection string.');
  }

  if (config.nodeEnv === 'production') {
    const redisTarget = getUrlTarget(config.redisUrl);
    const databaseTarget = getUrlTarget(config.databaseUrl);
    if (isLoopbackHost(redisTarget.host)) {
      errors.push('REDIS_URL must not point to localhost or 127.0.0.1 in production.');
    }
    if (isLoopbackHost(databaseTarget.host)) {
      errors.push('DATABASE_URL must not point to localhost or 127.0.0.1 in production.');
    }
  }

  if (!Number.isInteger(config.cacheTtlSeconds) || config.cacheTtlSeconds <= 0) {
    errors.push('CACHE_TTL_SECONDS must be a positive integer.');
  }

  if (!Number.isInteger(config.maxBodyBytes) || config.maxBodyBytes <= 0) {
    errors.push('MAX_BODY_BYTES must be a positive integer.');
  }

  if (!Number.isInteger(config.dbPoolMax) || config.dbPoolMax <= 0) {
    errors.push('DB_POOL_MAX must be a positive integer.');
  }

  if (!Number.isInteger(config.redisConnectTimeoutMs) || config.redisConnectTimeoutMs <= 0) {
    errors.push('REDIS_CONNECT_TIMEOUT_MS must be a positive integer.');
  }

  if (!Number.isInteger(config.redisReconnectMaxDelayMs) || config.redisReconnectMaxDelayMs <= 0) {
    errors.push('REDIS_RECONNECT_MAX_DELAY_MS must be a positive integer.');
  }

  if (!Number.isInteger(config.gracefulShutdownTimeoutMs) || config.gracefulShutdownTimeoutMs <= 0) {
    errors.push('GRACEFUL_SHUTDOWN_TIMEOUT_MS must be a positive integer.');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid configuration: ${errors.join(' ')}`);
  }
}

function isLoopbackHost(host) {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function defaultPort(protocol) {
  if (protocol === 'redis:' || protocol === 'rediss:') {
    return '6379';
  }
  if (protocol === 'postgres:' || protocol === 'postgresql:') {
    return '5432';
  }
  return '';
}
