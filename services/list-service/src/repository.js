export async function listProducts(pool, filters) {
  const limit = clampInteger(filters.limit, 25, 1, 100);
  const offset = clampInteger(filters.offset, 0, 0, 10_000);
  const values = [];
  const where = [];

  if (filters.category) {
    values.push(filters.category);
    where.push(`category = $${values.length}`);
  }

  if (filters.query) {
    values.push(filters.query);
    const index = values.length;
    where.push(`(
      to_tsvector('simple', coalesce(sku, '') || ' ' || coalesce(name, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(description, ''))
      @@ plainto_tsquery('simple', $${index})
      OR sku ILIKE '%' || $${index} || '%'
      OR name ILIKE '%' || $${index} || '%'
    )`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  values.push(limit, offset);

  const result = await pool.query(
    `
      SELECT id, sku, name, brand, category, description, current_price, currency, availability, updated_at
      FROM products
      ${whereSql}
      ORDER BY updated_at DESC, name ASC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `,
    values
  );

  const countValues = values.slice(0, values.length - 2);
  const count = await pool.query(`SELECT count(*)::int AS total FROM products ${whereSql}`, countValues);

  return {
    items: result.rows.map(mapProduct),
    page: {
      limit,
      offset,
      total: count.rows[0].total
    }
  };
}

export async function getProductBySku(pool, sku) {
  const result = await pool.query(
    `
      SELECT id, sku, name, brand, category, description, current_price, currency, availability, created_at, updated_at
      FROM products
      WHERE sku = $1
    `,
    [sku]
  );

  return result.rows[0] ? mapProduct(result.rows[0]) : null;
}

export async function getPriceHistory(pool, sku, limit = 100) {
  const result = await pool.query(
    `
      SELECT ph.price, ph.currency, ph.source, ph.observed_at, ph.created_at
      FROM price_history ph
      JOIN products p ON p.id = ph.product_id
      WHERE p.sku = $1
      ORDER BY ph.observed_at DESC, ph.id DESC
      LIMIT $2
    `,
    [sku, clampInteger(limit, 100, 1, 500)]
  );

  return result.rows.map((row) => ({
    price: Number(row.price),
    currency: row.currency,
    source: row.source,
    observedAt: row.observed_at,
    createdAt: row.created_at
  }));
}

export async function importProducts(pool, products, metadata) {
  const client = await pool.connect();
  const errors = [];
  let imported = 0;

  try {
    await client.query('BEGIN');

    for (const [index, product] of products.entries()) {
      try {
        const observedAt = product.observedAt || new Date().toISOString();
        const upsert = await client.query(
          `
            INSERT INTO products (sku, name, brand, category, description, current_price, currency, availability)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (sku) DO UPDATE SET
              name = EXCLUDED.name,
              brand = EXCLUDED.brand,
              category = EXCLUDED.category,
              description = EXCLUDED.description,
              current_price = EXCLUDED.current_price,
              currency = EXCLUDED.currency,
              availability = EXCLUDED.availability
            RETURNING id, current_price
          `,
          [
            product.sku,
            product.name,
            product.brand || null,
            product.category || null,
            product.description || null,
            product.price,
            product.currency,
            product.availability
          ]
        );

        const productId = upsert.rows[0].id;
        const latest = await client.query(
          `
            SELECT price, currency
            FROM price_history
            WHERE product_id = $1
            ORDER BY observed_at DESC, id DESC
            LIMIT 1
          `,
          [productId]
        );

        const latestRow = latest.rows[0];
        const shouldWritePrice =
          !latestRow ||
          Number(latestRow.price) !== Number(product.price) ||
          latestRow.currency !== product.currency;

        if (shouldWritePrice) {
          await client.query(
            `
              INSERT INTO price_history (product_id, price, currency, source, observed_at)
              VALUES ($1, $2, $3, $4, $5)
            `,
            [productId, product.price, product.currency, product.source || metadata.source, observedAt]
          );
        }

        imported += 1;
      } catch (error) {
        errors.push({
          row: index + 1,
          sku: product.sku,
          message: error.message
        });
      }
    }

    const job = await client.query(
      `
        INSERT INTO import_jobs (source, format, rows_received, rows_imported, rows_rejected, status, errors)
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
        RETURNING id, created_at
      `,
      [
        metadata.source,
        metadata.format,
        products.length,
        imported,
        errors.length,
        errors.length === 0 ? 'completed' : 'completed_with_errors',
        JSON.stringify(errors)
      ]
    );

    await client.query('COMMIT');

    return {
      importId: job.rows[0].id,
      status: errors.length === 0 ? 'completed' : 'completed_with_errors',
      rowsReceived: products.length,
      rowsImported: imported,
      rowsRejected: errors.length,
      errors,
      createdAt: job.rows[0].created_at
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function mapProduct(row) {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    brand: row.brand,
    category: row.category,
    description: row.description,
    currentPrice: Number(row.current_price),
    currency: row.currency,
    availability: row.availability,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function clampInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
}
