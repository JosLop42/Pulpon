-- ============================================================
-- Migración v5: Menú real de Pulpo Zurdo + Storage bucket
-- Ejecutar en SQL Editor de Supabase
-- ⚠️  Borra los platillos de ejemplo e inserta los reales
-- ============================================================

-- Limpiar datos de ejemplo (el orden importa por las FK)
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM branch_menu_items;
DELETE FROM menu_items;
DELETE FROM menu_categories;

-- Categorías reales
INSERT INTO menu_categories (name, sort_order, emoji) VALUES
  ('Ceviches',  1, '🦑'),
  ('Tostadas',  2, '🍤'),
  ('Extras',    3, '🪣'),
  ('Bebidas',   4, '🥤');

-- Platillos reales
INSERT INTO menu_items (category_id, name, description, price, sort_order)
SELECT c.id, items.name, items.descr, items.price, items.sort_order
FROM menu_categories c
JOIN (VALUES

  -- Ceviches
  ('Ceviches', 'Ceviche Mixto 16 oz',       'Camarón, pulpo y cangrejo',  75.00,  1),
  ('Ceviches', 'Ceviche Mixto 36 oz',       'Camarón, pulpo y cangrejo', 155.00,  2),
  ('Ceviches', 'Ceviche de Camarón 16 oz',  'Camarón fresco marinado',    75.00,  3),
  ('Ceviches', 'Ceviche de Camarón 36 oz',  'Camarón fresco marinado',   155.00,  4),
  ('Ceviches', 'Ceviche de Pulpo 16 oz',    'Pulpo fresco marinado',      75.00,  5),
  ('Ceviches', 'Ceviche de Pulpo 36 oz',    'Pulpo fresco marinado',     155.00,  6),
  ('Ceviches', 'Ceviche de Cangrejo 16 oz', 'Cangrejo fresco marinado',   75.00,  7),
  ('Ceviches', 'Ceviche de Cangrejo 36 oz', 'Cangrejo fresco marinado',  155.00,  8),

  -- Tostadas
  ('Tostadas', 'Tostada Mixta',             '1 tostada de camarón, pulpo y cangrejo',  45.00, 1),
  ('Tostadas', 'Porción 2 Tostadas Mixtas', '2 tostadas de camarón, pulpo y cangrejo', 75.00, 2),

  -- Extras
  ('Extras', '3 Galletas Crakeñas', NULL, 8.00, 1),

  -- Bebidas
  ('Bebidas', 'Mineral Preparada', 'Agua mineral con gas, limón y Tajín',                               20.00, 1),
  ('Bebidas', 'Jugo Preparado',    'Tajín, hielo, salsa inglesa, jugo de tomate, limón, sal y mineral',  30.00, 2),
  ('Bebidas', 'Coca Cola Lata',    '354 ml',                                                             15.00, 3),
  ('Bebidas', 'Picosita Modelo',   NULL,                                                                 25.00, 4),
  ('Bebidas', 'Picosita Gallo',    NULL,                                                                 30.00, 5)

) AS items(cat, name, descr, price, sort_order) ON c.name = items.cat;

-- Poblar branch_menu_items para las 4 sucursales (si migration_v4 ya fue corrida)
INSERT INTO branch_menu_items (branch_id, menu_item_id)
SELECT b.id, mi.id
FROM branches b
CROSS JOIN menu_items mi
WHERE b.is_active = true
ON CONFLICT DO NOTHING;

-- ============================================================
-- Storage bucket para imágenes del menú
-- ============================================================

-- Crear bucket público
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT DO NOTHING;

-- Cualquiera puede ver las imágenes (menú público)
CREATE POLICY "menu_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

-- Solo usuarios autenticados pueden subir (el script inicia sesión como admin)
CREATE POLICY "menu_images_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'menu-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "menu_images_auth_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'menu-images' AND auth.uid() IS NOT NULL);
