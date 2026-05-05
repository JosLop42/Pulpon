-- ============================================================
-- MIGRACIÓN: Flujo "pedir la cuenta"
-- Ejecutar en SQL Editor de Supabase después del schema inicial
-- ============================================================

-- Estado de la solicitud de cuenta
create type bill_status as enum ('pending', 'paid');

-- Tabla de solicitudes de cuenta
-- Una por mesa activa — se evita duplicar con la constraint unique
create table bill_requests (
  id           uuid primary key default uuid_generate_v4(),
  branch_id    uuid not null references branches(id) on delete cascade,
  table_number int  not null check (table_number between 1 and 8),
  status       bill_status not null default 'pending',
  total        numeric(10,2) not null default 0,
  paid_by      uuid references profiles(id),  -- empleado que marcó como pagado
  created_at   timestamptz default now(),
  paid_at      timestamptz,

  -- Solo puede haber una solicitud pendiente por mesa a la vez
  constraint unique_pending_bill
    exclude using btree (branch_id with =, table_number with =)
    where (status = 'pending')
);

-- RLS
alter table bill_requests enable row level security;

-- Cliente (anon) puede crear solicitudes
create policy "bill_requests_client_insert" on bill_requests
  for insert with check (true);

-- Empleados ven las de su sucursal; admin ve todas
create policy "bill_requests_employee_select" on bill_requests
  for select using (
    branch_id = get_my_branch()
    or get_my_role() = 'admin'
  );

-- Solo empleados/admin pueden actualizar (marcar como pagado)
create policy "bill_requests_employee_update" on bill_requests
  for update using (
    branch_id = get_my_branch()
    or get_my_role() = 'admin'
  );

-- Realtime para que empleados reciban notificaciones al instante
alter publication supabase_realtime add table bill_requests;

-- Índice para queries por sucursal + estado
create index idx_bill_requests_branch_status
  on bill_requests(branch_id, status);
