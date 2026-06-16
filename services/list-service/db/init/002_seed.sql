INSERT INTO products (sku, name, brand, category, description, current_price, currency, availability)
VALUES
  ('SKU-MECH-001', 'Aurora Mechanical Keyboard', 'Northline', 'Accessories', 'Hot-swappable keyboard with tactile switches.', 119.99, 'USD', 'in_stock'),
  ('SKU-MON-027', '27 Inch Studio Monitor', 'ViewPeak', 'Displays', 'Color-accurate QHD monitor for design and development.', 329.00, 'USD', 'in_stock'),
  ('SKU-DOCK-014', 'USB-C Pro Dock', 'Portsmith', 'Accessories', 'Compact docking station with HDMI, Ethernet, and USB-C charging.', 89.50, 'USD', 'limited')
ON CONFLICT (sku) DO NOTHING;

INSERT INTO price_history (product_id, price, currency, source, observed_at)
SELECT id, current_price, currency, 'seed', now()
FROM products
WHERE sku IN ('SKU-MECH-001', 'SKU-MON-027', 'SKU-DOCK-014')
ON CONFLICT DO NOTHING;
