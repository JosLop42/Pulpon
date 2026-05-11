-- ============================================================
-- Migración v6: image_url para los platillos del menú
-- Las imágenes se sirven como assets estáticos desde /menu-images/
-- Ejecutar en SQL Editor de Supabase
-- ============================================================

-- Ceviches Mixtos (16 y 36 oz comparten imagen)
UPDATE menu_items SET image_url = '/menu-images/ceviche_mixto_32_16.jpeg'
WHERE name IN ('Ceviche Mixto 16 oz', 'Ceviche Mixto 36 oz');

-- Ceviche de Pulpo y Cangrejo (todos comparten imagen)
UPDATE menu_items SET image_url = '/menu-images/cevivhe_pulpo_cangrejo.jpeg'
WHERE name IN (
  'Ceviche de Pulpo 16 oz',
  'Ceviche de Pulpo 36 oz',
  'Ceviche de Cangrejo 16 oz',
  'Ceviche de Cangrejo 36 oz'
);

-- Tostadas
UPDATE menu_items SET image_url = '/menu-images/tostada_mixta.jpeg'
WHERE name = 'Tostada Mixta';

UPDATE menu_items SET image_url = '/menu-images/porcion_2_tostadas.jpeg'
WHERE name = 'Porción 2 Tostadas Mixtas';

-- Bebidas
UPDATE menu_items SET image_url = '/menu-images/mineral_preparada.jpeg'
WHERE name = 'Mineral Preparada';

UPDATE menu_items SET image_url = '/menu-images/cocacola.jpeg'
WHERE name = 'Coca Cola Lata';

UPDATE menu_items SET image_url = '/menu-images/picosita_modelo.jpeg'
WHERE name = 'Picosita Modelo';

UPDATE menu_items SET image_url = '/menu-images/picosita_gallo.jpeg'
WHERE name = 'Picosita Gallo';

-- Sin imagen por ahora: Ceviche de Camarón 16/36 oz, 3 Galletas Crakeñas, Jugo Preparado
