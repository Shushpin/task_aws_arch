export function loadConfig() {
  const config = {
    serviceName: 'list-service',
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    port: Number.parseInt(process.env.PORT || '3000', 10),
    databaseUrl: process.env.DATABASE_URL || 'postgres://catalog:catalog_password@localhost:5432/catalog',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    cacheTtlSeconds: Number.parseInt(process.env.CACHE_TTL_SECONDS || '60', 10),
    maxBodyBytes: Number.parseInt(process.env.MAX_BODY_BYTES || `${1024 * 1024 * 5}`, 10),
    dbPoolMax: Number.parseInt(process.env.DB_POOL_MAX || '10', 10),
    dbIdleTimeoutMs: Number.parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
    dbConnectionTimeoutMs: Number.parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
    gracefulShutdownTimeoutMs: Number.parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS || '10000', 10)
  };

  validateConfig(config);
  return config;
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

  if (!Number.isInteger(config.cacheTtlSeconds) || config.cacheTtlSeconds <= 0) {
    errors.push('CACHE_TTL_SECONDS must be a positive integer.');
  }

  if (!Number.isInteger(config.maxBodyBytes) || config.maxBodyBytes <= 0) {
    errors.push('MAX_BODY_BYTES must be a positive integer.');
  }

  if (!Number.isInteger(config.dbPoolMax) || config.dbPoolMax <= 0) {
    errors.push('DB_POOL_MAX must be a positive integer.');
  }

  if (!Number.isInteger(config.gracefulShutdownTimeoutMs) || config.gracefulShutdownTimeoutMs <= 0) {
    errors.push('GRACEFUL_SHUTDOWN_TIMEOUT_MS must be a positive integer.');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid configuration: ${errors.join(' ')}`);
  }
}
