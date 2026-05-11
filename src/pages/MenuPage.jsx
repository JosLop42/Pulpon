import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getMenu, getMenuCategories, createOrder } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import MenuItemCard from '@/components/menu/MenuItemCard'
import CartDrawer from '@/components/menu/CartDrawer'

export default function MenuPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { branchId, branchName } = useAuth()
  const tableNum    = parseInt(searchParams.get('table'), 10)
  const isPickup    = tableNum === 0
  const pickupName  = searchParams.get('pname')  ? decodeURIComponent(searchParams.get('pname'))  : ''
  const pickupPhone = searchParams.get('pphone') ? decodeURIComponent(searchParams.get('pphone')) : ''

  const effectiveBranchId   = searchParams.get('branch') || branchId
  const effectiveBranchName = searchParams.get('bname')
    ? decodeURIComponent(searchParams.get('bname'))
    : branchName

  const [categories,      setCategories]     = useState([])
  const [items,           setItems]          = useState([])
  const [activeCategory,  setActiveCategory] = useState(null)
  const [loading,         setLoading]        = useState(true)
  const [cartOpen,        setCartOpen]       = useState(false)
  const [submitting,      setSubmitting]     = useState(false)
  const [submitError,     setSubmitError]    = useState(null)
  const [loadError,       setLoadError]      = useState(false)

  const { itemCount, items: cartItems, clear, total } = useCart()

  useEffect(() => {
    Promise.all([getMenuCategories(), getMenu(effectiveBranchId)])
      .then(([cats, menuItems]) => {
        setCategories(cats)
        setItems(menuItems)
        setActiveCategory(cats[0]?.id ?? null)
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [])

  const filteredItems = activeCategory
    ? items.filter(i => i.category_id === activeCategory)
    : items

  async function handlePlaceOrder(kitchenNotes) {
    if (!cartItems.length) return
    setSubmitting(true)
    setSubmitError(null)
    const notes = isPickup
      ? `[PICKUP] ${pickupName} / ${pickupPhone}${kitchenNotes ? '\n' + kitchenNotes : ''}`
      : (kitchenNotes || null)
    try {
      await createOrder({
        branch_id:    effectiveBranchId,
        table_number: tableNum,
        notes,
        items: cartItems.map(i => ({ id: i.id, price: i.price, quantity: i.quantity, notes: i.notes }))
      })
      clear()
      setCartOpen(false)
      navigate('/orders')
    } catch (err) {
      const msg = err?.message || ''
      if (msg.includes('disponibles')) {
        setSubmitError('Uno o más platillos ya no están disponibles. Recarga el menú y vuelve a armar el pedido.')
      } else if (msg.includes('create_order_with_items') || msg.includes('function')) {
        setSubmitError('Error de configuración en el servidor. Contacta al administrador.')
      } else {
        setSubmitError('No se pudo enviar el pedido. Verifica tu conexión e intenta de nuevo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Sin número de mesa válido (y no es pickup) → mostrar selector
  if (isNaN(tableNum) || (!isPickup && (tableNum < 1 || tableNum > 8))) {
    return (
      <div className="page" style={{ alignItems:'center', justifyContent:'center' }}>
        <div className="empty-state">
          <span className="icon">🍽️</span>
          <h2>Selecciona una mesa</h2>
          <p>Ve al dashboard y usa "+ Nueva orden" para elegir la mesa.</p>
          <button className="btn btn-teal" style={{ marginTop:'1rem' }} onClick={() => navigate('/orders')}>
            Ir al dashboard
          </button>
        </div>
      </div>
    )
  }

  if (loadError) return (
    <div className="page" style={{ alignItems:'center', justifyContent:'center' }}>
      <div className="empty-state">
        <span className="icon">⚠️</span>
        <h2>Error al cargar el menú</h2>
        <p>Verifica tu conexión e intenta de nuevo.</p>
        <button className="btn btn-teal" style={{ marginTop:'1rem' }} onClick={() => window.location.reload()}>
          Reintentar
        </button>
      </div>
    </div>
  )

  if (loading) return (
    <div className="page" style={{ alignItems:'center', justifyContent:'center' }}>
      <div className="spinner" style={{ width:36, height:36 }}/>
    </div>
  )

  return (
    <div className="page" style={{ background:'var(--ink)' }}>

      {/* Header */}
      <header style={{
        position:'sticky', top:0, zIndex:10,
        background:'rgba(255,245,235,0.92)', backdropFilter:'blur(12px)',
        borderBottom:'1px solid var(--border)', padding:'0.875rem 1rem'
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', maxWidth:480, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => navigate('/orders')}
              style={{ fontSize:'1.1rem', padding:'0.3rem 0.5rem' }}
            >
              ←
            </button>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1rem', lineHeight:1 }}>
                🐙 {effectiveBranchName}
              </div>
              <div style={{ color:'var(--text-3)', fontSize:'0.75rem' }}>
                {isPickup ? `🛵 Para llevar — ${pickupName}` : `Mesa ${tableNum}`}
              </div>
            </div>
          </div>
          {itemCount > 0 && (
            <button
              className="btn btn-primary"
              onClick={() => setCartOpen(true)}
              style={{ position:'relative' }}
            >
              🛒 Ver pedido · Q{total.toFixed(2)}
              <span style={{
                position:'absolute', top:-6, right:-6,
                background:'var(--teal)', color:'var(--ink)',
                borderRadius:'50%', width:20, height:20,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'0.7rem', fontWeight:700
              }}>{itemCount}</span>
            </button>
          )}
        </div>
      </header>

      {/* Categorías */}
      <nav style={{
        overflowX:'auto', display:'flex', gap:'0.5rem',
        padding:'0.75rem 1rem', borderBottom:'1px solid var(--border)',
        scrollbarWidth:'none', maxWidth:480, margin:'0 auto', width:'100%'
      }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              whiteSpace:'nowrap', padding:'0.4rem 0.9rem',
              borderRadius:'100px', fontSize:'0.85rem',
              fontFamily:'var(--font-display)', fontWeight:600,
              transition:'all var(--transition)',
              background: activeCategory === cat.id ? 'var(--coral)' : 'var(--surface)',
              color:       activeCategory === cat.id ? '#fff' : 'var(--text-2)',
              border:      activeCategory === cat.id ? 'none' : '1px solid var(--border)',
              flexShrink:0
            }}
          >
            {cat.emoji} {cat.name}
          </button>
        ))}
      </nav>

      {/* Ítems */}
      <main style={{ flex:1, padding:'1rem', maxWidth:480, margin:'0 auto', width:'100%' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {filteredItems.map((item, i) => (
            <div key={item.id} className="animate-in" style={{ animationDelay:`${i*40}ms` }}>
              <MenuItemCard item={item} />
            </div>
          ))}
        </div>
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onPlaceOrder={handlePlaceOrder}
        submitting={submitting}
        tableNum={tableNum}
        isPickup={isPickup}
        pickupName={pickupName}
        submitError={submitError}
      />
    </div>
  )
}
