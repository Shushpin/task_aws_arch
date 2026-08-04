# Product Catalog & Price Tracking API

API-only foundation for a microservice product catalog. The first slice contains:

- List Service: browse, filter, read product details, import product files.
- PostgreSQL: product catalog, import jobs, and immutable price history.
- Redis: short-lived cache for list/detail reads.
- Docker Compose: local Postgres, Redis, and service runtime.

## Run Locally

```bash
docker compose up --build
```

The API will be available at `http://localhost:3000`.

PostgreSQL is exposed on local port `15432`, and Redis is exposed on local port `16379` to avoid collisions with existing local services.

Optional local config:

```bash
cp .env.example .env
```

Docker Compose reads `.env` automatically. The committed defaults are enough for local development.

## Useful Requests

```bash
curl http://localhost:3000/health
curl http://localhost:3000/ready
curl http://localhost:3000/live
curl "http://localhost:3000/products?query=keyboard&category=Accessories"
curl http://localhost:3000/products/SKU-MECH-001
curl http://localhost:3000/products/SKU-MECH-001/prices
```

Verify Redis cache hits by running the same read twice:

```bash
curl http://localhost:3000/products/SKU-MECH-001
curl http://localhost:3000/products/SKU-MECH-001
```

The second response should include `"cache": "hit"` while the cache entry is still inside `CACHE_TTL_SECONDS`.

Import sample JSON:

```bash
curl -X POST "http://localhost:3000/imports/products?format=json" \
  -H "Content-Type: application/json" \
  --data-binary @services/list-service/samples/products.json
```

Import sample CSV:

```bash
curl -X POST "http://localhost:3000/imports/products?format=csv" \
  -H "Content-Type: text/csv" \
  --data-binary @services/list-service/samples/products.csv
```

## API

### `GET /health`

Compatibility health endpoint. Checks PostgreSQL and Redis and returns `503` if either dependency is unavailable.

### `GET /ready`

Readiness endpoint for containers and load balancers. Checks PostgreSQL and Redis and returns `503` if either dependency is unavailable.

### `GET /live`

Liveness endpoint. Confirms the process is running without checking dependencies.

## Production-like Container Behavior

- Configuration is read from environment variables and validated at startup.
- Request logs are JSON lines with method, path, status code, duration, and request id.
- `SIGTERM` and `SIGINT` trigger graceful shutdown of HTTP, PostgreSQL, and Redis clients.
- Dockerfile runs as the non-root `node` user.
- Docker and Compose healthchecks call `/ready`.
- Redis cache TTL is controlled by `CACHE_TTL_SECONDS`.
- In `NODE_ENV=production`, `DATABASE_URL` and `REDIS_URL` are required and must not point to localhost.

## Redis Diagnostics

On startup, the service logs the sanitized Redis target:

```json
{"message":"Connecting Redis client","redisUrl":"redis://redis:6379","configuredRedis":{"protocol":"redis","host":"redis","port":"6379"}}
```

If Redis reconnects or errors, logs include both the configured target and the socket error fields (`address`, `port`, `code`) when Node provides them. In ECS, `configuredRedis.host` should be the ElastiCache endpoint, never `127.0.0.1`.

Validate production config locally:

```bash
cd services/list-service
NODE_ENV=production \
DATABASE_URL=postgres://user:password@db.example:5432/catalog \
REDIS_URL=redis://cache.example:6379 \
npm run config:check
```

### `GET /products`

Query params:

- `query`: searches SKU, name, brand, and description.
- `category`: exact category filter.
- `limit`: default `25`, max `100`.
- `offset`: default `0`.

### `GET /products/:sku`

Returns product details by SKU.

### `GET /products/:sku/prices`

Returns historical prices for a SKU.

### `POST /imports/products?format=json|csv`

Imports product data and writes a price-history row when the incoming price differs from the latest known price.

JSON accepts either an array of products or an object with a `products` array.

CSV columns:

```text
sku,name,brand,category,description,price,currency,availability,source,observed_at
```

`observed_at` is optional. If it is missing, the service uses the import time.

## Next Services

- Search Service can consume `products` data and move full-text/indexed search out of List Service.
- PriceGraph Service can read `price_history` and expose chart-ready aggregates.
- Select Service can persist user/session selections in Redis or DynamoDB.
- S3/Lambda import can reuse the same import contract by sending normalized payloads to this service or writing an import event.
