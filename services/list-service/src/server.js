import http from 'node:http';
import crypto from 'node:crypto';
import { URL } from 'node:url';
import { loadConfig } from './config.js';
import { createDb, checkDb } from './db.js';
import { createCache, checkCache, getJson, invalidateCatalogCache, setJson } from './cache.js';
import { getPriceHistory, getProductBySku, importProducts, listProducts } from './repository.js';
import { parseProductsImport } from './importParser.js';
import { createLogger } from './logger.js';

const config = loadConfig();
const logger = createLogger(config.serviceName, config.logLevel);
const db = createDb(config, logger);
const cache = await createCache(config.redisUrl, logger);

const server = http.createServer(async (request, response) => {
  const startedAt = process.hrtime.bigint();
  const requestId = request.headers['x-request-id'] || crypto.randomUUID();
  response.setHeader('X-Request-Id', requestId);

  response.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const logLevel = isProbeRequest(request.url) ? 'debug' : 'info';
    logger[logLevel]('HTTP request completed', {
      requestId,
      method: request.method,
      path: request.url,
      statusCode: response.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      userAgent: request.headers['user-agent'] || ''
    });
  });

  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const route = matchRoute(request.method, url.pathname);

    if (!route) {
      return sendJson(response, 404, { error: 'Not found' });
    }

    if (route.name === 'health') {
      return handleHealth(response, false);
    }

    if (route.name === 'ready') {
      return handleHealth(response, true);
    }

    if (route.name === 'live') {
      return sendJson(response, 200, {
        service: config.serviceName,
        status: 'ok'
      });
    }

    if (route.name === 'listProducts') {
      return handleListProducts(url, response);
    }

    if (route.name === 'getProduct') {
      return handleGetProduct(route.params.sku, response);
    }

    if (route.name === 'getPriceHistory') {
      return handleGetPriceHistory(route.params.sku, url, response);
    }

    if (route.name === 'importProducts') {
      return handleImportProducts(request, url, response);
    }

    return sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    logger.error('Request failed', {
      requestId,
      error: error.message,
      stack: config.nodeEnv === 'production' ? undefined : error.stack
    });
    return sendJson(response, error.statusCode || 500, {
      error: error.message || 'Internal server error'
    });
  }
});

server.listen(config.port, () => {
  logger.info('Service started', {
    port: config.port,
    nodeEnv: config.nodeEnv,
    cacheTtlSeconds: config.cacheTtlSeconds
  });
});

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  logger.info('Shutdown requested');
  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out');
    process.exit(1);
  }, config.gracefulShutdownTimeoutMs);

  server.close(async () => {
    await Promise.allSettled([db.end(), cache.quit()]);
    clearTimeout(forceExit);
    logger.info('Shutdown completed');
    process.exit(0);
  });
}

function isProbeRequest(path = '') {
  return path === '/ready' || path === '/live' || path === '/health';
}

function matchRoute(method, pathname) {
  if (method === 'GET' && pathname === '/health') {
    return { name: 'health', params: {} };
  }

  if (method === 'GET' && pathname === '/ready') {
    return { name: 'ready', params: {} };
  }

  if (method === 'GET' && pathname === '/live') {
    return { name: 'live', params: {} };
  }

  if (method === 'GET' && pathname === '/products') {
    return { name: 'listProducts', params: {} };
  }

  if (method === 'POST' && pathname === '/imports/products') {
    return { name: 'importProducts', params: {} };
  }

  const productMatch = pathname.match(/^\/products\/([^/]+)$/);
  if (method === 'GET' && productMatch) {
    return { name: 'getProduct', params: { sku: decodeURIComponent(productMatch[1]) } };
  }

  const priceMatch = pathname.match(/^\/products\/([^/]+)\/prices$/);
  if (method === 'GET' && priceMatch) {
    return { name: 'getPriceHistory', params: { sku: decodeURIComponent(priceMatch[1]) } };
  }

  return null;
}

async function handleHealth(response, readiness) {
  const dependencies = await checkDependencies();
  const statusCode = dependencies.postgres.ok && dependencies.redis.ok ? 200 : 503;

  return sendJson(response, statusCode, {
    service: config.serviceName,
    status: statusCode === 200 ? 'ok' : 'unavailable',
    readiness,
    dependencies
  });
}

async function checkDependencies() {
  const [postgres, redis] = await Promise.allSettled([checkDb(db), checkCache(cache)]);
  return {
    postgres: normalizeDependency(postgres),
    redis: normalizeDependency(redis)
  };
}

function normalizeDependency(result) {
  if (result.status === 'fulfilled') {
    return result.value;
  }

  return {
    ok: false,
    error: result.reason.message
  };
}

async function handleListProducts(url, response) {
  const filters = {
    query: url.searchParams.get('query') || '',
    category: url.searchParams.get('category') || '',
    limit: url.searchParams.get('limit') || '25',
    offset: url.searchParams.get('offset') || '0'
  };
  const cacheKey = `list-service:products:${JSON.stringify(filters)}`;
  const cached = await getJson(cache, cacheKey);

  if (cached) {
    return sendJson(response, 200, { ...cached, cache: 'hit' });
  }

  const result = await listProducts(db, filters);
  await setJson(cache, cacheKey, result, config.cacheTtlSeconds);
  return sendJson(response, 200, { ...result, cache: 'miss' });
}

async function handleGetProduct(sku, response) {
  const cacheKey = `list-service:product:${sku}`;
  const cached = await getJson(cache, cacheKey);

  if (cached) {
    return sendJson(response, 200, { item: cached, cache: 'hit' });
  }

  const product = await getProductBySku(db, sku);
  if (!product) {
    return sendJson(response, 404, { error: 'Product not found' });
  }

  await setJson(cache, cacheKey, product, config.cacheTtlSeconds);
  return sendJson(response, 200, { item: product, cache: 'miss' });
}

async function handleGetPriceHistory(sku, url, response) {
  const limit = url.searchParams.get('limit') || '100';
  const cacheKey = `list-service:prices:${sku}:${limit}`;
  const cached = await getJson(cache, cacheKey);

  if (cached) {
    return sendJson(response, 200, { items: cached, cache: 'hit' });
  }

  const product = await getProductBySku(db, sku);
  if (!product) {
    return sendJson(response, 404, { error: 'Product not found' });
  }

  const history = await getPriceHistory(db, sku, limit);
  await setJson(cache, cacheKey, history, config.cacheTtlSeconds);
  return sendJson(response, 200, { items: history, cache: 'miss' });
}

async function handleImportProducts(request, url, response) {
  const format = (url.searchParams.get('format') || inferFormat(request.headers['content-type'])).toLowerCase();
  const source = url.searchParams.get('source') || 'local-api';
  const body = await readBody(request, config.maxBodyBytes);
  const products = parseProductsImport(body, format);
  const result = await importProducts(db, products, { source, format });
  await invalidateCatalogCache(cache);
  return sendJson(response, 201, result);
}

function inferFormat(contentType = '') {
  if (contentType.includes('text/csv')) {
    return 'csv';
  }
  return 'json';
}

function readBody(request, maxBytes) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    let body = '';

    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > maxBytes) {
        reject(Object.assign(new Error('Payload too large.'), { statusCode: 413 }));
        request.destroy();
        return;
      }
      body += chunk;
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  response.end(body);
}
