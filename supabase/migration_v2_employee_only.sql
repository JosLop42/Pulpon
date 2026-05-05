-- ============================================================
-- Migración v2: Arquitectura employee-only
-- Ejecutar en SQL Editor de Supabase
-- ============================================================

-- 1. Agregar estado 'paid' al enum (idempotente)
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'paid';

-- 2. Actualizar sucursales con nombres y ubicaciones reales
UPDATE branches SET name = 'Arrazola',      location = 'Km 16.5 Carretera al Salvador, Plaza Arrazola'                          WHERE name = 'Sucursal Centro';
UPDATE branches SET name = 'Km 19.5',       location = 'Km 19.5 Carretera al Salvador'                                          WHERE name = 'Sucursal Oakland';
UPDATE branches SET name = 'Lo de Diéguez', location = 'Km 20 entrada a Fraijanes, Coliseo Xtreme Park, Lo de Diéguez'          WHERE name = 'Sucursal Cayalá';
UPDATE branches SET name = 'Metroplaza',    location = 'Metroplaza, Ciudad de Guatemala'                                         WHERE name = 'Sucursal Miraflores';

-- 3. Eliminar política INSERT anónima en orders (ya no hay clientes QR)
DROP POLICY IF EXISTS "orders_client_insert" ON orders;
CREATE POLICY "orders_employee_insert" ON orders
  FOR INSERT WITH CHECK (
    branch_id = get_my_branch()
    OR get_my_role() = 'admin'
  );

-- 4. Eliminar política INSERT anónima en order_items
DROP POLICY IF EXISTS "order_items_insert" ON order_items;
CREATE POLICY "order_items_employee_insert" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND (o.branch_id = get_my_branch() OR get_my_role() = 'admin')
    )
  );

-- 5. Limpiar política SELECT de orders (ya no hay clientes anónimos)
DROP POLICY IF EXISTS "orders_employee_select" ON orders;
CREATE POLICY "orders_employee_select" ON orders
  FOR SELECT USING (
    branch_id = get_my_branch()
    OR get_my_role() = 'admin'
  );
