-- ============================================================
-- Migración v3: createOrder atómica y segura via RPC
-- Ejecutar en SQL Editor de Supabase
-- ============================================================

-- La función hace dos cosas críticas que el cliente no puede evadir:
--  1. Ignora el precio enviado por el cliente y lee el precio real de la BD
--  2. Verifica que todos los ítems existen y están disponibles (is_available = true)
--  3. Orden + ítems en una sola transacción — si algo falla, nada queda guardado

CREATE OR REPLACE FUNCTION create_order_with_items(
  p_branch_id    uuid,
  p_table_number int,
  p_notes        text,
  p_items        jsonb
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_order       orders;
  v_input_count int;
  v_inserted    int;
BEGIN
  -- Crear la orden (RLS "orders_employee_insert" aplica aquí)
  INSERT INTO orders (branch_id, table_number, source, notes, status)
  VALUES (p_branch_id, p_table_number, 'employee', p_notes, 'confirmed')
  RETURNING * INTO v_order;

  -- Contar cuántos ítems vienen del cliente
  SELECT COUNT(*) INTO v_input_count FROM jsonb_array_elements(p_items);

  -- Insertar ítems usando el precio real de la BD (ignora el precio del cliente)
  -- El JOIN con is_available = true rechaza platillos desactivados
  INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, notes)
  SELECT
    v_order.id,
    mi.id,
    (item->>'quantity')::int,
    mi.price,
    NULLIF(item->>'notes', '')
  FROM jsonb_array_elements(p_items) AS item
  JOIN menu_items mi
    ON mi.id = (item->>'id')::uuid
   AND mi.is_available = true;

  -- Verificar que todos los ítems se insertaron
  -- (falla si algún ítem no existe o está desactivado)
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted != v_input_count THEN
    RAISE EXCEPTION 'Uno o más platillos no están disponibles';
  END IF;

  RETURN row_to_json(v_order);
END;
$$;

-- Solo usuarios autenticados pueden ejecutarla (empleados y admin)
REVOKE EXECUTE ON FUNCTION create_order_with_items(uuid, int, text, jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION create_order_with_items(uuid, int, text, jsonb) TO authenticated;
