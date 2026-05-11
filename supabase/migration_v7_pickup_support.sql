-- ============================================================
-- Migración v7: permitir table_number = 0 para órdenes pickup
-- El CHECK original solo permitía values 1-8 (mesas físicas).
-- Ahora permitimos 0 = pickup / para llevar.
-- Ejecutar en SQL Editor de Supabase
-- ============================================================

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_table_number_check;
ALTER TABLE orders ADD CONSTRAINT orders_table_number_check CHECK (table_number >= 0);
