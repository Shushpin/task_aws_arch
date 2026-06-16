const REQUIRED_FIELDS = ['sku', 'name', 'price'];

export function parseProductsImport(rawBody, format) {
  if (format === 'json') {
    return parseJson(rawBody);
  }

  if (format === 'csv') {
    return parseCsv(rawBody);
  }

  throw Object.assign(new Error('Unsupported import format. Use json or csv.'), { statusCode: 400 });
}

function parseJson(rawBody) {
  let parsed;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw Object.assign(new Error('Invalid JSON payload.'), { statusCode: 400 });
  }

  const products = Array.isArray(parsed) ? parsed : parsed.products;
  if (!Array.isArray(products)) {
    throw Object.assign(new Error('JSON payload must be an array or an object with a products array.'), { statusCode: 400 });
  }

  return products.map(normalizeProduct);
}

function parseCsv(rawBody) {
  const rows = parseCsvRows(rawBody.trim());
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((value) => value.trim().toLowerCase());
  return rows.slice(1)
    .filter((row) => row.some((value) => value.trim() !== ''))
    .map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index] ?? '';
      });
      return normalizeProduct(record);
    });
}

function parseCsvRows(input) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  row.push(field);
  rows.push(row);
  return rows;
}

function normalizeProduct(input) {
  const product = {
    sku: stringValue(input.sku),
    name: stringValue(input.name),
    brand: stringValue(input.brand),
    category: stringValue(input.category),
    description: stringValue(input.description),
    price: Number.parseFloat(input.price ?? input.current_price),
    currency: stringValue(input.currency || 'USD').toUpperCase(),
    availability: stringValue(input.availability || 'unknown'),
    source: stringValue(input.source || 'file-import'),
    observedAt: stringValue(input.observed_at || input.observedAt)
  };

  const missingFields = REQUIRED_FIELDS.filter((field) => {
    if (field === 'price') {
      return !Number.isFinite(product.price);
    }
    return !product[field];
  });

  if (missingFields.length > 0) {
    throw Object.assign(new Error(`Missing or invalid required fields: ${missingFields.join(', ')}`), {
      statusCode: 422,
      product
    });
  }

  if (!/^[A-Z]{3}$/.test(product.currency)) {
    throw Object.assign(new Error('Currency must be a three-letter ISO code.'), {
      statusCode: 422,
      product
    });
  }

  return product;
}

function stringValue(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
}
