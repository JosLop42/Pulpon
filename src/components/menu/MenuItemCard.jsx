import { useRef } from 'react'
import { useCart } from '@/context/CartContext'

export default function MenuItemCard({ item }) {
  const { addItem, items, updateQty, removeItem } = useCart()
  const cartItem = items.find(i => i.id === item.id)
  const qty = cartItem?.quantity ?? 0
  const adding = useRef(false)

  function handleAdd() {
    if (adding.current) return
    adding.current = true
    addItem(item)
    setTimeout(() => { adding.current = false }, 400)
  }

  return (
    <div className="card card-hover" style={{ display:'flex', gap:'0.875rem', alignItems:'flex-start' }}>

      {/* Emoji placeholder o imagen */}
      <div style={{
        width:64, height:64, borderRadius:'var(--radius-sm)',
        background:'var(--surface-2)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:'1.75rem', flexShrink:0
      }}>
        {item.image_url
          ? <img src={item.image_url} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'var(--radius-sm)' }}/>
          : '🍽️'
        }
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.95rem', marginBottom:'0.2rem' }}>
          {item.name}
        </div>
        {item.description && (
          <div style={{ color:'var(--text-3)', fontSize:'0.8rem', lineHeight:1.4, marginBottom:'0.5rem',
            overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
            {item.description}
          </div>
        )}
        <div style={{ color:'var(--coral)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1rem' }}>
          Q{item.price.toFixed(2)}
        </div>
      </div>

      {/* Qty control */}
      <div style={{ display:'flex', alignItems:'center', flexShrink:0 }}>
        {qty === 0 ? (
          <button
            className="btn btn-primary"
            style={{ padding:'0.4rem 0.9rem', fontSize:'0.85rem' }}
            onClick={handleAdd}
          >
            + Agregar
          </button>
        ) : (
          <div className="qty-control animate-pop">
            <button onClick={() => updateQty(item.id, qty - 1)}>−</button>
            <span>{qty}</span>
            <button onClick={() => updateQty(item.id, qty + 1)}>+</button>
          </div>
        )}
      </div>
    </div>
  )
}
