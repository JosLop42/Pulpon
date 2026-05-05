import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  getOrdersByBranch, getOrderById, updateOrderStatus,
  markTableDelivered, markTablePaid, subscribeToOrders, signOut
} from '@/lib/supabase'

// ── Prioridad de estado para la tarjeta de mesa ───────────────────────────────
const STATUS_PRIORITY = { ready: 4, confirmed: 3, preparing: 2, delivered: 1 }

const STATUS_UI = {
  ready:     { label: 'Listo para entregar', color: '#5dda5d' },
  confirmed: { label: 'En espera (cocina)',  color: 'var(--amber)' },
  preparing: { label: 'Preparando',          color: 'var(--mist)' },
  delivered: { label: 'Todo entregado',      color: 'var(--teal)' },
}

function tableStatus(orders) {
  const active = orders.filter(o => o.status !== 'cancelled')
  if (!active.length) return 'delivered'
  return active.reduce((top, o) => {
    return (STATUS_PRIORITY[o.status] || 0) > (STATUS_PRIORITY[top] || 0) ? o.status : top
  }, 'delivered')
}

// ── Hook offline ──────────────────────────────────────────────────────────────
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

// ── Tarjeta de mesa ───────────────────────────────────────────────────────────
function TableCard({ tableNum, orders, branchId, onAction }) {
  const [delivering, setDelivering] = useState(false)
  const [paying,     setPaying]     = useState(false)
  const [confirmPay, setConfirmPay] = useState(false)
  const [actionError, setActionError] = useState(null)

  const active     = orders.filter(o => o.status !== 'cancelled')
  const status     = tableStatus(orders)
  const total      = active.reduce((s, o) => s + (o.total || 0), 0)
  const hasReady   = active.some(o => o.status === 'ready')
  const allDone    = active.length > 0 && active.every(o => o.status === 'delivered')
  const statusUI   = STATUS_UI[status] || STATUS_UI.confirmed
  const firstTime  = orders[orders.length - 1]?.created_at

  const allItems = orders
    .filter(o => o.status !== 'cancelled')
    .flatMap(o => (o.order_items || []).map(i => ({ ...i, orderStatus: o.status })))

  async function handleDeliver() {
    setDelivering(true)
    setActionError(null)
    try {
      await markTableDelivered(branchId, tableNum)
      onAction()
    } catch {
      setActionError('No se pudo marcar como entregado. Intenta de nuevo.')
    } finally {
      setDelivering(false)
    }
  }

  async function handlePay() {
    setPaying(true)
    setConfirmPay(false)
    setActionError(null)
    try {
      await markTablePaid(branchId, tableNum)
      onAction()
    } catch {
      setActionError('No se pudo registrar el cobro. Intenta de nuevo.')
      setPaying(false)
    }
  }

  return (
    <div className="card" style={{ borderLeft: `3px solid ${statusUI.color}`, padding: '1rem 1.1rem' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.625rem' }}>
        <div>
          <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.15rem' }}>
            Mesa {tableNum}
          </span>
          {firstTime && (
            <div style={{ color:'var(--text-3)', fontSize:'0.75rem', marginTop:2 }}>
              desde {new Date(firstTime).toLocaleTimeString('es-GT', { hour:'2-digit', minute:'2-digit' })}
            </div>
          )}
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{
            display:'inline-block', padding:'0.2rem 0.65rem',
            borderRadius:100, fontSize:'0.75rem', fontWeight:600,
            background: `${statusUI.color}22`, color: statusUI.color,
            border: `1px solid ${statusUI.color}44`
          }}>
            {statusUI.label}
          </div>
          <div style={{ color:'var(--teal)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1rem', marginTop:4 }}>
            Q{total.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Ítems */}
      <div style={{ marginBottom:'0.875rem', display:'flex', flexDirection:'column', gap:'0.2rem' }}>
        {allItems.map(item => (
          <div key={item.id} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.85rem' }}>
            <span style={{ color: item.orderStatus === 'delivered' ? 'var(--text-3)' : 'var(--text-1)' }}>
              {item.orderStatus === 'delivered' && <span style={{ color:'var(--teal)', marginRight:4 }}>✓</span>}
              {item.quantity}× {item.menu_items?.name || '—'}
              {item.notes && <span style={{ color:'var(--amber)', fontSize:'0.78rem' }}> · {item.notes}</span>}
            </span>
            <span style={{ color:'var(--text-3)', fontSize:'0.8rem' }}>
              Q{(item.unit_price * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
        <button
          className="btn btn-ghost"
          style={{ fontSize:'0.82rem', flex:1 }}
          onClick={() => onAction('add', tableNum)}
        >
          + Agregar ítem
        </button>

        {hasReady && (
          <button
            className="btn btn-teal"
            style={{ fontSize:'0.82rem', flex:1 }}
            disabled={delivering}
            onClick={handleDeliver}
          >
            {delivering ? <><div className="spinner"/>…</> : '🍽️ Entregar todo'}
          </button>
        )}

        {allDone && !confirmPay && (
          <button
            className="btn btn-primary"
            style={{ fontSize:'0.82rem', flex:1 }}
            onClick={() => setConfirmPay(true)}
          >
            💳 Cobrar
          </button>
        )}

        {confirmPay && (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem', width:'100%' }}>
            <button
              className="btn btn-primary"
              style={{ width:'100%', fontSize:'0.85rem', fontWeight:700, padding:'0.75rem' }}
              disabled={paying}
              onClick={handlePay}
            >
              {paying ? <><div className="spinner"/>…</> : `✓ Confirmar cobro — Q${total.toFixed(2)}`}
            </button>
            <button className="btn btn-ghost" style={{ width:'100%', fontSize:'0.82rem' }} onClick={() => setConfirmPay(false)}>
              Cancelar
            </button>
          </div>
        )}

        {actionError && (
          <div style={{
            width:'100%', marginTop:'0.25rem',
            background:'rgba(255,80,60,0.1)', border:'1px solid rgba(255,80,60,0.25)',
            borderRadius:'var(--radius-sm)', padding:'0.5rem 0.75rem',
            color:'#ff5040', fontSize:'0.8rem', textAlign:'center'
          }}>
            {actionError}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Modal selector de mesa ────────────────────────────────────────────────────
function TablePicker({ onSelect, onClose, activeTables }) {
  const [warning, setWarning] = useState(null)

  function handleSelect(n) {
    if (activeTables.has(n)) {
      setWarning(n)
      return
    }
    onSelect(n)
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position:'fixed', inset:0, zIndex:40, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(3px)' }}
      />
      <div className="animate-up" style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:50,
        background:'var(--surface)',
        borderRadius:'var(--radius-xl) var(--radius-xl) 0 0',
        border:'1px solid var(--border-2)', borderBottom:'none',
        padding:'1.25rem',
        maxWidth:520, margin:'0 auto'
      }}>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:'0.875rem' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--border-2)' }}/>
        </div>
        <h3 style={{ fontFamily:'var(--font-display)', marginBottom:'0.375rem', textAlign:'center' }}>
          ¿Para qué mesa?
        </h3>
        <p style={{ color:'var(--text-3)', fontSize:'0.8rem', textAlign:'center', marginBottom:'1rem' }}>
          Las mesas con punto naranja ya tienen pedido activo
        </p>

        {warning && (
          <div style={{
            background:'rgba(255,179,71,0.1)', border:'1px solid rgba(255,179,71,0.3)',
            borderRadius:'var(--radius-md)', padding:'0.625rem 0.875rem',
            color:'var(--amber)', fontSize:'0.83rem', marginBottom:'0.875rem', textAlign:'center'
          }}>
            Mesa {warning} ya tiene pedido activo — usa <strong>"Agregar ítem"</strong> en su tarjeta
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'0.625rem', marginBottom:'1rem' }}>
          {[1,2,3,4,5,6,7,8].map(n => {
            const isActive = activeTables.has(n)
            return (
              <button
                key={n}
                className="btn btn-ghost"
                style={{
                  padding:'0.875rem', fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.1rem',
                  position:'relative',
                  border: isActive ? '1px solid var(--amber)' : undefined,
                  color: isActive ? 'var(--amber)' : undefined,
                }}
                onClick={() => handleSelect(n)}
              >
                {n}
                {isActive && (
                  <span style={{
                    position:'absolute', top:6, right:6,
                    width:7, height:7, borderRadius:'50%',
                    background:'var(--amber)'
                  }}/>
                )}
              </button>
            )
          })}
        </div>
        <button className="btn btn-ghost" style={{ width:'100%', fontSize:'0.875rem' }} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function OrdersPage() {
  const { profile, branchId, branchName } = useAuth()
  const navigate = useNavigate()
  const online = useOnline()

  const [orders,          setOrders]         = useState([])
  const [loading,         setLoading]        = useState(true)
  const [showPicker,      setShowPicker]     = useState(false)

  // Carga inicial
  useEffect(() => {
    if (!branchId) { setLoading(false); return }
    getOrdersByBranch(branchId)
      .then(data => setOrders(data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [branchId])

  // Refetch al recuperar conexión — captura eventos perdidos mientras estaba offline
  useEffect(() => {
    if (!branchId) return
    function handleOnline() {
      getOrdersByBranch(branchId).then(data => setOrders(data || [])).catch(() => {})
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [branchId])

  // Realtime — fetch orden completa en INSERT para incluir order_items
  useEffect(() => {
    if (!branchId) return
    const sub = subscribeToOrders(branchId, async payload => {
      if (payload.eventType === 'INSERT') {
        const full = await getOrderById(payload.new.id).catch(() => null)
        if (full && full.status !== 'paid' && full.status !== 'cancelled') {
          setOrders(prev => [full, ...prev])
        }
      } else if (payload.eventType === 'UPDATE') {
        const { id, status } = payload.new
        if (status === 'paid' || status === 'cancelled') {
          setOrders(prev => prev.filter(o => o.id !== id))
        } else {
          setOrders(prev => prev.map(o => o.id === id ? { ...o, ...payload.new } : o))
        }
      }
    })
    return () => sub.unsubscribe()
  }, [branchId])

  // Refetch manual después de acciones bulk (entregar/cobrar)
  function refetch() {
    if (!branchId) return
    getOrdersByBranch(branchId).then(data => setOrders(data || [])).catch(() => {})
  }

  function handleCardAction(type, tableNum) {
    if (type === 'add') {
      navigate(`/menu?table=${tableNum}`)
    } else {
      refetch()
    }
  }

  // Agrupar pedidos por mesa
  const tables = useMemo(() => {
    const map = {}
    for (const order of orders) {
      const n = order.table_number
      if (!map[n]) map[n] = []
      map[n].push(order)
    }
    return Object.entries(map)
      .map(([n, ords]) => ({ tableNum: parseInt(n), orders: ords }))
      .sort((a, b) => {
        // Primero las mesas con comida lista, luego por número
        const sa = STATUS_PRIORITY[tableStatus(a.orders)] || 0
        const sb = STATUS_PRIORITY[tableStatus(b.orders)] || 0
        return sb - sa || a.tableNum - b.tableNum
      })
  }, [orders])

  return (
    <div className="page">

      {/* Banner offline */}
      {!online && (
        <div style={{
          background:'#7c2d2d', color:'#fecaca',
          padding:'0.6rem 1rem', textAlign:'center',
          fontSize:'0.85rem', fontWeight:500
        }}>
          ⚠️ Sin conexión — los cambios no se guardarán hasta recuperar internet
        </div>
      )}

      {/* Header */}
      <header style={{
        position:'sticky', top:0, zIndex:10,
        background:'rgba(10,22,40,0.95)', backdropFilter:'blur(12px)',
        borderBottom:'1px solid var(--border)', padding:'0.875rem 1.25rem'
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', maxWidth:700, margin:'0 auto' }}>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
              🐙 Pulpo Zurdo
              {tables.length > 0 && (
                <span style={{ background:'var(--coral)', color:'#fff', borderRadius:100, padding:'0.1rem 0.5rem', fontSize:'0.72rem', fontWeight:700 }}>
                  {tables.length} mesa{tables.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div style={{ color:'var(--text-3)', fontSize:'0.78rem' }}>{branchName}</div>
          </div>
          <div style={{ display:'flex', gap:'0.5rem' }}>
            <button className="btn btn-primary" style={{ fontSize:'0.85rem' }} onClick={() => setShowPicker(true)}>
              + Nueva orden
            </button>
            <button className="btn btn-ghost" style={{ fontSize:'0.85rem' }} onClick={() => navigate('/kitchen')}>
              Cocina
            </button>
            <button className="btn btn-ghost" style={{ fontSize:'0.85rem' }} onClick={() => signOut().then(() => navigate('/login')).catch(() => navigate('/login'))}>
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <div style={{ maxWidth:700, margin:'0 auto', width:'100%', padding:'1rem 1.25rem 2rem' }}>
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:160 }}/>)}
          </div>
        ) : tables.length === 0 ? (
          <div className="empty-state" style={{ marginTop:'3rem' }}>
            <span className="icon">🐙</span>
            <h3>Sin mesas activas</h3>
            <p>Presiona "+ Nueva orden" para comenzar</p>
            <button className="btn btn-primary" style={{ marginTop:'0.75rem' }} onClick={() => setShowPicker(true)}>
              + Nueva orden
            </button>
          </div>
        ) : (
          <div style={{ display:'grid', gap:'0.875rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {tables.map(({ tableNum, orders: tOrders }) => (
              <TableCard
                key={tableNum}
                tableNum={tableNum}
                orders={tOrders}
                branchId={branchId}
                onAction={handleCardAction}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selector de mesa */}
      {showPicker && (
        <TablePicker
          onSelect={n => { setShowPicker(false); navigate(`/menu?table=${n}`) }}
          onClose={() => setShowPicker(false)}
          activeTables={new Set(tables.map(t => t.tableNum))}
        />
      )}
    </div>
  )
}
