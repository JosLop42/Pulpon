import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno de Supabase. Revisa tu .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, storageKey: 'pulpos-auth' },
  realtime: { params: { eventsPerSecond: 10 } }
})

// ── Sucursales ──────────────────────────────────────────────────────────────

export async function getBranches() {
  const { data, error } = await supabase.from('branches').select('*').eq('is_active', true).order('name')
  if (error) throw error
  return data
}

// ── Menú ─────────────────────────────────────────────────────────────────────

export async function getMenu(branchId) {
  // Fetch globally available items
  const { data: items, error: itemsError } = await supabase
    .from('menu_items')
    .select('*, menu_categories(id, name, emoji, sort_order)')
    .eq('is_available', true)
    .order('sort_order')
  if (itemsError) throw itemsError

  // Fetch items disabled for this specific branch
  const { data: disabled, error: disabledError } = await supabase
    .from('branch_menu_items')
    .select('menu_item_id')
    .eq('branch_id', branchId)
    .eq('is_available', false)
  if (disabledError) throw disabledError

  const disabledIds = new Set((disabled || []).map(r => r.menu_item_id))
  return (items || []).filter(item => !disabledIds.has(item.id))
}

export async function getMenuCategories() {
  const { data, error } = await supabase.from('menu_categories').select('*').order('sort_order')
  if (error) throw error
  return data
}

export async function getMenuAdmin() {
  // Intenta cargar con disponibilidad por sucursal (requiere migration_v4)
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, menu_categories(id, name, emoji, sort_order), branch_menu_items(branch_id, is_available)')
    .order('sort_order')
  if (!error) return data || []

  // Fallback si la migración v4 aún no se ha corrido
  const { data: fallback, error: fallbackError } = await supabase
    .from('menu_items')
    .select('*, menu_categories(id, name, emoji, sort_order)')
    .order('sort_order')
  if (fallbackError) throw fallbackError
  return (fallback || []).map(item => ({ ...item, branch_menu_items: [] }))
}

export async function updateBranch(id, { name, location }) {
  const { data, error } = await supabase
    .from('branches')
    .update({ name, location })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Desactiva/activa para TODAS las sucursales
export async function toggleMenuItemAvailability(id, is_available) {
  const { error } = await supabase
    .from('menu_items')
    .update({ is_available })
    .eq('id', id)
  if (error) throw error
}

// Desactiva/activa para UNA sucursal específica
export async function toggleBranchMenuItemAvailability(branch_id, menu_item_id, is_available) {
  const { error } = await supabase
    .from('branch_menu_items')
    .update({ is_available })
    .eq('branch_id', branch_id)
    .eq('menu_item_id', menu_item_id)
  if (error) throw error
}

// ── Pedidos ───────────────────────────────────────────────────────────────────

export async function createOrder({ branch_id, table_number, items, notes }) {
  const { data, error } = await supabase.rpc('create_order_with_items', {
    p_branch_id:    branch_id,
    p_table_number: table_number,
    p_notes:        notes || null,
    p_items:        items
  })
  if (error) throw error
  return data
}

// Todas las órdenes activas de la sucursal (excluye pagadas y canceladas)
export async function getOrdersByBranch(branch_id) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, menu_items(name, price))')
    .eq('branch_id', branch_id)
    .not('status', 'eq', 'paid')
    .not('status', 'eq', 'cancelled')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// Orden individual con sus ítems — para sincronizar realtime correctamente
export async function getOrderById(order_id) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, menu_items(name, price))')
    .eq('id', order_id)
    .single()
  if (error) throw error
  return data
}

export async function updateOrderStatus(order_id, status) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', order_id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Marca todos los pedidos 'ready' de una mesa como 'delivered'
export async function markTableDelivered(branch_id, table_number) {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'delivered' })
    .eq('branch_id', branch_id)
    .eq('table_number', table_number)
    .eq('status', 'ready')
  if (error) throw error
}

// Marca todos los pedidos activos de una mesa como 'paid'
export async function markTablePaid(branch_id, table_number) {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'paid' })
    .eq('branch_id', branch_id)
    .eq('table_number', table_number)
    .not('status', 'eq', 'cancelled')
    .not('status', 'eq', 'paid')
  if (error) throw error
}

// ── Reportes ──────────────────────────────────────────────────────────────────

export async function getReportsData(dateFrom) {
  let query = supabase
    .from('orders')
    .select('id, branch_id, total, created_at, branches(name), order_items(quantity, unit_price, menu_items(name, menu_categories(name, emoji)))')
    .eq('status', 'paid')
  if (dateFrom) query = query.gte('created_at', dateFrom)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*, branches(id, name, location)')
    .eq('id', user.id)
    .single()
  if (error) throw error
  return data
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ── Realtime ──────────────────────────────────────────────────────────────────

export function subscribeToOrders(branch_id, callback) {
  return supabase
    .channel(`orders:${branch_id}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'orders',
      filter: `branch_id=eq.${branch_id}`
    }, callback)
    .subscribe()
}
