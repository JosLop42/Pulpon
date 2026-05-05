import { useState } from 'react'
import { useCart } from '@/context/CartContext'

export default function CartDrawer({ open, onClose, onPlaceOrder, submitting, tableNum, submitError }) {
  const { items, total, updateQty } = useCart()
  const [notes, setNotes] = useState('')

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position:'fixed', inset:0, zIndex:40,
          background:'rgba(0,0,0,0.6)', backdropFilter:'blur(3px)'
        }}
      />

      {/* Drawer */}
      <div
        className="animate-up"
        style={{
          position:'fixed', bottom:0, left:0, right:0, zIndex:50,
          background:'var(--surface)',
          borderRadius:'var(--radius-xl) var(--radius-xl) 0 0',
          border:'1px solid var(--border-2)', borderBottom:'none',
          maxHeight:'85dvh', display:'flex', flexDirection:'column',
          maxWidth:520, margin:'0 auto'
        }}
      >
        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'0.75rem 0 0' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--border-2)' }}/>
        </div>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.75rem 1.25rem 0.5rem' }}>
          <h3 style={{ fontFamily:'var(--font-display)' }}>Pedido — Mesa {tableNum}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="divider" style={{ margin:'0 1.25rem' }}/>

        {/* Ítems */}
        <div style={{ flex:1, overflowY:'auto', padding:'0 1.25rem' }}>
          {items.map(item => (
            <div key={item.id} style={{ display:'flex', gap:'0.75rem', alignItems:'center', paddingBlock:'0.75rem', borderBottom:'1px solid var(--border)' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:500, fontSize:'0.9rem' }}>{item.name}</div>
                <div style={{ color:'var(--coral)', fontSize:'0.85rem', fontFamily:'var(--font-display)', fontWeight:600 }}>
                  Q{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
              <div className="qty-control" style={{ flexShrink:0 }}>
                <button onClick={() => updateQty(item.id, item.quantity - 1)}>−</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQty(item.id, item.quantity + 1)}>+</button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding:'1rem 1.25rem 1.5rem', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:'0.875rem' }}>

          <div>
            <label className="label">Notas para cocina (opcional)</label>
            <input
              className="input"
              placeholder="Sin sal, alergias, término de cocción…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ color:'var(--text-2)', fontSize:'0.9rem' }}>Total</span>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.2rem', color:'var(--teal)' }}>
              Q{total.toFixed(2)}
            </span>
          </div>

          {submitError && (
            <div style={{
              background:'rgba(255,80,60,0.1)', border:'1px solid rgba(255,80,60,0.25)',
              borderRadius:'var(--radius-sm)', padding:'0.5rem 0.75rem',
              color:'#ff5040', fontSize:'0.82rem', textAlign:'center'
            }}>
              {submitError}
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ width:'100%', padding:'0.875rem' }}
            disabled={submitting || items.length === 0}
            onClick={() => onPlaceOrder(notes)}
          >
            {submitting
              ? <><div className="spinner"/>Enviando a cocina…</>
              : '🐙 Enviar a cocina'}
          </button>
        </div>
      </div>
    </>
  )
}
