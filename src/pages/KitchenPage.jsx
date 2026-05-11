import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getOrdersByBranch, getOrderById, updateOrderStatus, subscribeToOrders } from '@/lib/supabase'

const KITCHEN_STATUSES = ['confirmed', 'preparing']

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return online
}

export default function KitchenPage() {
  const { branchId, branchName } = useAuth()
  const navigate = useNavigate()
  const online = useOnline()

  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [now,     setNow]     = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])

  // Carga inicial
  useEffect(() => {
    if (!branchId) { setLoading(false); return }
    getOrdersByBranch(branchId)
      .then(data => {
        setOrders((data || [])
          .filter(o => KITCHEN_STATUSES.includes(o.status))
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [branchId])

  // Refetch al recuperar conexión
  useEffect(() => {
    if (!branchId) return
    function handleOnline() {
      getOrdersByBranch(branchId)
        .then(data => setOrders((data || [])
          .filter(o => KITCHEN_STATUSES.includes(o.status))
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))))
        .catch(() => {})
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [branchId])

  // Realtime — fetch orden completa en INSERT para incluir order_items
  useEffect(() => {
    if (!branchId) return
    const sub = subscribeToOrders(branchId, async payload => {
      if (payload.eventType === 'INSERT') {
        if (!KITCHEN_STATUSES.includes(payload.new.status)) return
        const full = await getOrderById(payload.new.id).catch(() => null)
        if (full) setOrders(prev => prev.some(o => o.id === full.id) ? prev : [...prev, full])
      } else if (payload.eventType === 'UPDATE') {
        const { id, status } = payload.new
        if (KITCHEN_STATUSES.includes(status)) {
          setOrders(prev => prev.map(o => o.id === id ? { ...o, ...payload.new } : o))
        } else {
          setOrders(prev => prev.filter(o => o.id !== id))
        }
      }
    })
    return () => sub.unsubscribe()
  }, [branchId])

  function minutesAgo(ts) {
    const mins = Math.floor((now - new Date(ts)) / 60000)
    return mins === 0 ? 'Ahora' : `${mins} min`
  }

  function urgencyColor(ts) {
    const mins = Math.floor((now - new Date(ts)) / 60000)
    if (mins >= 20) return 'var(--coral)'
    if (mins >= 10) return 'var(--amber)'
    return 'var(--teal)'
  }

  const confirmed = orders.filter(o => o.status === 'confirmed')
  const preparing = orders.filter(o => o.status === 'preparing')

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100dvh' }}>
      <div className="spinner" style={{ width:40, height:40 }}/>
    </div>
  )

  return (
    <div style={{ minHeight:'100dvh', background:'var(--ink)', paddingBottom:'2rem' }}>

      {!online && (
        <div style={{ background:'#7c2d2d', color:'#fecaca', padding:'0.6rem 1rem', textAlign:'center', fontSize:'0.85rem', fontWeight:500 }}>
          ⚠️ Sin conexión — los cambios no se guardarán hasta recuperar internet
        </div>
      )}

      <header style={{
        position:'sticky', top:0, zIndex:10,
        background:'#0b2545',
        borderBottom:'1px solid rgba(255,255,255,0.12)', padding:'1rem 1.5rem',
        display:'flex', alignItems:'center', justifyContent:'space-between'
      }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.2rem', color:'#fff5eb' }}>
          🍳 Cocina — {branchName}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
          <div style={{ color:'rgba(255,245,235,0.7)', fontSize:'0.85rem', display:'flex', gap:'1rem' }}>
            <span>Nuevos: <strong style={{ color:'#ffb347' }}>{confirmed.length}</strong></span>
            <span>En progreso: <strong style={{ color:'#7eb8d4' }}>{preparing.length}</strong></span>
          </div>
          <button className="btn btn-ghost" style={{ fontSize:'0.82rem', color:'#fff5eb', borderColor:'rgba(255,255,255,0.2)' }} onClick={() => navigate('/orders')}>
            ← Pedidos
          </button>
        </div>
      </header>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', padding:'1.5rem', maxWidth:900, margin:'0 auto' }}>

        {/* Nuevos (confirmed) */}
        <div>
          <div style={{
            fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.85rem',
            color:'var(--amber)', textTransform:'uppercase', letterSpacing:'0.08em',
            marginBottom:'0.875rem', display:'flex', alignItems:'center', gap:'0.5rem'
          }}>
            ⏳ Por preparar
            <span style={{ background:'rgba(255,179,71,0.2)', color:'var(--amber)', borderRadius:100, padding:'0.1rem 0.5rem', fontSize:'0.8rem' }}>
              {confirmed.length}
            </span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {confirmed.length === 0 ? (
              <div className="empty-state" style={{ padding:'2rem 1rem' }}>
                <span>✅</span>
                <span style={{ fontSize:'0.875rem' }}>Sin pedidos pendientes</span>
              </div>
            ) : confirmed.map(order => (
              <KitchenCard
                key={order.id}
                order={order}
                minutesAgo={minutesAgo(order.created_at)}
                urgencyColor={urgencyColor(order.created_at)}
                action={{ label:'🔥 Preparando', fn: () => updateOrderStatus(order.id, 'preparing') }}
              />
            ))}
          </div>
        </div>

        {/* En preparación */}
        <div>
          <div style={{
            fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.85rem',
            color:'var(--mist)', textTransform:'uppercase', letterSpacing:'0.08em',
            marginBottom:'0.875rem', display:'flex', alignItems:'center', gap:'0.5rem'
          }}>
            🔥 Preparando
            <span style={{ background:'rgba(126,184,212,0.15)', color:'var(--mist)', borderRadius:100, padding:'0.1rem 0.5rem', fontSize:'0.8rem' }}>
              {preparing.length}
            </span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {preparing.length === 0 ? (
              <div className="empty-state" style={{ padding:'2rem 1rem' }}>
                <span>🍽️</span>
                <span style={{ fontSize:'0.875rem' }}>Sin pedidos en preparación</span>
              </div>
            ) : preparing.map(order => (
              <KitchenCard
                key={order.id}
                order={order}
                minutesAgo={minutesAgo(order.created_at)}
                urgencyColor={urgencyColor(order.created_at)}
                action={{ label:'✓ Listo para entregar', fn: () => updateOrderStatus(order.id, 'ready') }}
                accent="var(--mist)"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function parsePickup(notes) {
  if (!notes?.startsWith('[PICKUP] ')) return null
  const firstLine = notes.split('\n')[0]
  const match = firstLine.match(/^\[PICKUP\] (.+) \/ (.+)$/)
  return match ? { name: match[1], phone: match[2] } : null
}

function KitchenCard({ order, minutesAgo, urgencyColor, action, accent }) {
  const [loading, setLoading] = useState(false)
  const pickup = order.table_number === 0 ? parsePickup(order.notes) : null
  const kitchenNotes = pickup
    ? (order.notes?.split('\n').slice(1).join('\n').trim() || null)
    : order.notes

  async function handle() {
    setLoading(true)
    try { await action.fn() } finally { setLoading(false) }
  }
  return (
    <div className="card" style={{ borderLeft:`3px solid ${accent || urgencyColor}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.625rem' }}>
        <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.1rem' }}>
          {pickup ? `🛵 ${pickup.name}` : `Mesa ${order.table_number}`}
        </span>
        <span style={{ color:urgencyColor, fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.85rem' }}>
          {minutesAgo}
        </span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'0.2rem', marginBottom:'0.75rem' }}>
        {(order.order_items || []).map(item => (
          <div key={item.id} style={{ fontSize:'0.875rem', color:'var(--text-2)' }}>
            <strong style={{ color:'var(--text-1)' }}>{item.quantity}×</strong> {item.menu_items?.name}
            {item.notes && <span style={{ color:'var(--amber)', fontSize:'0.8rem' }}> · {item.notes}</span>}
          </div>
        ))}
        {pickup?.phone && (
          <div style={{ color:'var(--text-3)', fontSize:'0.78rem', marginTop:'0.15rem' }}>📞 {pickup.phone}</div>
        )}
        {kitchenNotes && (
          <div style={{ color:'var(--amber)', fontSize:'0.8rem', marginTop:'0.25rem' }}>📝 {kitchenNotes}</div>
        )}
      </div>
      <button
        className="btn btn-teal"
        style={{ width:'100%', fontSize:'0.875rem' }}
        disabled={loading}
        onClick={handle}
      >
        {loading ? <><div className="spinner"/>…</> : action.label}
      </button>
    </div>
  )
}
