-- ============================================================
-- Migración v4: Disponibilidad de platillos por sucursal
-- Ejecutar en SQL Editor de Supabase
-- ============================================================

-- Tabla de disponibilidad por sucursal
-- menu_items.is_available sigue siendo el interruptor global
-- branch_menu_items.is_available es el override por sucursal
-- Un platillo aparece en el menú solo si AMBOS son true
CREATE TABLE branch_menu_items (
  branch_id    uuid NOT NULL REFERENCES branches(id)    ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id)  ON DELETE CASCADE,
  is_available boolean NOT NULL DEFAULT true,
  PRIMARY KEY (branch_id, menu_item_id)
);

-- Poblar con todas las combinaciones actuales (todas activas por defecto)
INSERT INTO branch_menu_items (branch_id, menu_item_id)
SELECT b.id, mi.id
FROM branches b
CROSS JOIN menu_items mi
WHERE b.is_active = true;

-- Trigger: cuando se agrega un nuevo platillo, crear fila para cada sucursal
CREATE OR REPLACE FUNCTION sync_branch_menu_items()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO branch_menu_items (branch_id, menu_item_id)
  SELECT id, NEW.id FROM branches WHERE is_active = true
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_menu_item_created
  AFTER INSERT ON menu_items
  FOR EACH ROW EXECUTE FUNCTION sync_branch_menu_items();

-- RLS
ALTER TABLE branch_menu_items ENABLE ROW LEVEL SECURITY;

-- Empleados leen solo su sucursal; admin lee todo
CREATE POLICY "bmi_select" ON branch_menu_items FOR SELECT
  USING (branch_id = get_my_branch() OR get_my_role() = 'admin');

-- Solo admin puede modificar
CREATE POLICY "bmi_admin_update" ON branch_menu_items FOR UPDATE
  USING (get_my_role() = 'admin');
