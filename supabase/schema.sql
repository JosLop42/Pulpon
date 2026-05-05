-- ============================================================
-- Pulpon — Schema SQL para Supabase
-- Ejecutar en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- Extensiones
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type order_status as enum ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled');
create type order_source as enum ('client', 'employee');
create type user_role as enum ('admin', 'employee', 'kitchen');

-- ============================================================
-- SUCURSALES
-- ============================================================
create table branches (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  location text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Insertar las 4 sucursales de Pulpo Zurdo
insert into branches (name, location) values
  ('Sucursal Centro',    'Zona 1, Ciudad de Guatemala'),
  ('Sucursal Oakland',   'Zona 10, Ciudad de Guatemala'),
  ('Sucursal Cayalá',    'Zona 16, Ciudad de Guatemala'),
  ('Sucursal Miraflores','Zona 11, Ciudad de Guatemala');

-- ============================================================
-- MESAS (8 por sucursal = 32 total)
-- ============================================================
create table tables (
  id uuid primary key default uuid_generate_v4(),
  branch_id uuid not null references branches(id) on delete cascade,
  table_number int not null check (table_number between 1 and 8),
  is_occupied boolean default false,
  qr_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  constraint unique_table_per_branch unique (branch_id, table_number)
);

-- Generar las 32 mesas automáticamente
insert into tables (branch_id, table_number)
select b.id, t.num
from branches b
cross join (select generate_series(1,8) as num) t;

-- ============================================================
-- PERFILES DE EMPLEADOS (extiende auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'employee',
  branch_id uuid references branches(id),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Trigger: crear perfil al registrar usuario
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'employee');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- CATEGORÍAS DEL MENÚ
-- ============================================================
create table menu_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sort_order int default 0,
  emoji text default '🍽️'
);

insert into menu_categories (name, sort_order, emoji) values
  ('Entradas',    1, '🦑'),
  ('Principales', 2, '🐙'),
  ('Mariscos',    3, '🦞'),
  ('Bebidas',     4, '🍹'),
  ('Postres',     5, '🍮');

-- ============================================================
-- MENÚ
-- ============================================================
create table menu_items (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references menu_categories(id),
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  is_available boolean default true,
  image_url text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Menú de ejemplo para Pulpo Zurdo
insert into menu_items (category_id, name, description, price, sort_order)
select c.id, items.name, items.descr, items.price, items.sort_order
from menu_categories c
join (values
  -- Entradas
  ('Entradas', 'Ceviche de Pulpo',     'Pulpo fresco marinado en limón con cebolla morada y chile',    95.00, 1),
  ('Entradas', 'Tostadas de Camarón',  'Tostadas crujientes con camarón al ajillo',                    75.00, 2),
  ('Entradas', 'Chicharrón de Calamar','Calamar frito con salsa de chipotle',                          80.00, 3),
  -- Principales
  ('Principales', 'Pulpo a las Brasas',    'Pulpo entero a la parrilla con papas y ensalada',          185.00, 1),
  ('Principales', 'Arroz con Mariscos',    'Arroz meloso con camarón, calamar y mejillones',           165.00, 2),
  ('Principales', 'Filete de Mero',        'Mero en salsa de mantequilla con limón y alcaparras',     175.00, 3),
  ('Principales', 'Pasta de Mar',          'Linguini con frutos del mar en salsa blanca',              145.00, 4),
  -- Mariscos
  ('Mariscos', 'Camarón al Mojo',     'Camarón jumbo salteado en mojo de ajo',                        135.00, 1),
  ('Mariscos', 'Langosta Entera',     'Langosta fresca a la mantequilla con guarnición',               395.00, 2),
  ('Mariscos', 'Mejillones al Vapor', 'Mejillones en caldo de vino blanco y hierbas',                  95.00, 3),
  -- Bebidas
  ('Bebidas', 'Limonada de Coco',  'Limonada natural con crema de coco',   35.00, 1),
  ('Bebidas', 'Agua de Jamaica',   'Jamaica artesanal sin azúcar refinada',25.00, 2),
  ('Bebidas', 'Cerveza Artesanal', 'Lager local fría',                      45.00, 3),
  ('Bebidas', 'Agua Mineral',      'Agua con o sin gas 500ml',              20.00, 4),
  -- Postres
  ('Postres', 'Flan de Coco',      'Flan casero con caramelo y coco rallado',  55.00, 1),
  ('Postres', 'Tres Leches',       'Bizcocho húmedo con crema y fresa',        60.00, 2)
) as items(cat, name, descr, price, sort_order) on c.name = items.cat;

-- ============================================================
-- PEDIDOS
-- ============================================================
create table orders (
  id uuid primary key default uuid_generate_v4(),
  branch_id uuid not null references branches(id),
  table_number int not null check (table_number between 1 and 8),
  status order_status not null default 'pending',
  source order_source not null default 'client',
  employee_id uuid references profiles(id),
  customer_name text,
  notes text,
  total numeric(10,2) generated always as (0) stored, -- se actualiza via trigger
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Columna total calculada correctamente via función
alter table orders drop column total;
alter table orders add column total numeric(10,2) default 0;

-- ============================================================
-- ITEMS DEL PEDIDO
-- ============================================================
create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id),
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  notes text,
  created_at timestamptz default now()
);

-- Trigger: actualizar total del pedido
create or replace function update_order_total()
returns trigger language plpgsql as $$
begin
  update orders
  set total = (
    select coalesce(sum(quantity * unit_price), 0)
    from order_items
    where order_id = coalesce(new.order_id, old.order_id)
  ),
  updated_at = now()
  where id = coalesce(new.order_id, old.order_id);
  return coalesce(new, old);
end;
$$;

create trigger order_items_total
  after insert or update or delete on order_items
  for each row execute procedure update_order_total();

-- Trigger: updated_at en orders
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_updated_at
  before update on orders
  for each row execute procedure touch_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table branches     enable row level security;
alter table tables       enable row level security;
alter table profiles     enable row level security;
alter table menu_categories enable row level security;
alter table menu_items   enable row level security;
alter table orders       enable row level security;
alter table order_items  enable row level security;

-- Helper: obtener rol del usuario autenticado
create or replace function get_my_role()
returns user_role language sql security definer as $$
  select role from profiles where id = auth.uid()
$$;

-- Helper: obtener sucursal del usuario autenticado
create or replace function get_my_branch()
returns uuid language sql security definer as $$
  select branch_id from profiles where id = auth.uid()
$$;

-- BRANCHES: todos pueden leer
create policy "branches_public_read" on branches for select using (true);
create policy "branches_admin_all"   on branches for all   using (get_my_role() = 'admin');

-- TABLES: todos pueden leer; empleados de la sucursal pueden modificar
create policy "tables_public_read"   on tables for select using (true);
create policy "tables_employee_update" on tables for update
  using (branch_id = get_my_branch() and get_my_role() in ('employee', 'admin'));

-- PROFILES: usuario ve su propio perfil; admin ve todos
create policy "profiles_self"        on profiles for select using (id = auth.uid());
create policy "profiles_admin_all"   on profiles for all   using (get_my_role() = 'admin');

-- MENU: todos pueden leer (vista cliente + empleados)
create policy "menu_categories_read" on menu_categories for select using (true);
create policy "menu_items_read"      on menu_items      for select using (true);
create policy "menu_admin_write"     on menu_items      for all using (get_my_role() = 'admin');

-- ORDERS: cliente puede crear (anon); empleado ve su sucursal; admin ve todo
create policy "orders_client_insert" on orders for insert
  with check (true); -- acceso anónimo por QR

create policy "orders_employee_select" on orders for select
  using (
    auth.uid() is null and source = 'client'  -- cliente anón puede ver su pedido
    or branch_id = get_my_branch()             -- empleado ve su sucursal
    or get_my_role() = 'admin'                 -- admin ve todo
  );

create policy "orders_employee_update" on orders for update
  using (
    branch_id = get_my_branch()
    or get_my_role() = 'admin'
  );

-- ORDER ITEMS: hereda seguridad de orders
create policy "order_items_insert" on order_items for insert with check (true);
create policy "order_items_select" on order_items for select
  using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
      and (o.branch_id = get_my_branch() or get_my_role() = 'admin')
    )
  );

-- ============================================================
-- REALTIME: habilitar para pedidos (cocina y empleados)
-- ============================================================
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;

-- ============================================================
-- ÍNDICES
-- ============================================================
create index idx_orders_branch    on orders(branch_id);
create index idx_orders_status    on orders(status);
create index idx_orders_created   on orders(created_at desc);
create index idx_order_items_order on order_items(order_id);
create index idx_tables_branch    on tables(branch_id);
create index idx_profiles_branch  on profiles(branch_id);
