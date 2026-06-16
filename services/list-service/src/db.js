import pg from 'pg';

export function createDb(config, logger = console) {
  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    max: config.dbPoolMax,
    idleTimeoutMillis: config.dbIdleTimeoutMs,
    connectionTimeoutMillis: config.dbConnectionTimeoutMs
  });

  pool.on('error', (error) => {
    logger.error('Unexpected PostgreSQL pool error', { error: error.message });
  });

  return pool;
}

export async function checkDb(pool) {
  const result = await pool.query('SELECT now() AS now');
  return { ok: true, now: result.rows[0].now };
}
