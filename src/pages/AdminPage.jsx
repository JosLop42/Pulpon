import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBranches, getMenuAdmin, toggleMenuItemAvailability, signOut } from '@/lib/supabase'

export default function AdminPage() {
  const navigate = useNavigate()
  const [tab,      setTab]      = useState('menu')
  const [branches, setBranches] = useState([])
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [toggling,     setToggling]     = useState(null)
  const [toggleError,  setToggleError]  = useState(null)

  useEffect(() => {
    Promise.all([getBranches(), getMenuAdmin()])
      .then(([b, m]) => { setBranches(b || []); setItems(m || []) })
      .finally(() => setLoading(false))
  }, [])

  async function handleToggle(item) {
    setToggling(item.id)
    setToggleError(null)
    try {
      await toggleMenuItemAvailability(item.id, !item.is_available)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i))
    } catch {
      setToggleError('No se pudo actualizar el platillo. Intenta de nuevo.')
    } finally {
      setToggling(null)
    }
  }

  // Agrupar ítems por categoría
  const byCategory = items.reduce((acc, item) => {
    const cat = item.menu_categories?.name || 'Sin categoría'
    if (!acc[cat]) acc[cat] = { emoji: item.menu_categories?.emoji || '🍽️', items: [] }
    acc[cat].items.push(item)
    return acc
  }, {})

  return (
    <div style={{ minHeight:'100dvh', background:'var(--ink)' }}>

      <header style={{
        position:'sticky', top:0, zIndex:10,
        background:'rgba(10,22,40,0.93)', backdropFilter:'blur(12px)',
        borderBottom:'1px solid var(--border)', padding:'0.875rem 1.25rem',
        display:'flex', alignItems:'center', justifyContent:'space-between'
      }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.1rem' }}>
          🐙 Admin — Pulpo Zurdo
        </div>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/orders')} style={{ fontSize:'0.85rem' }}>
            Pedidos
          </button>
          <button className="btn btn-ghost" onClick={() => signOut().then(() => navigate('/login')).catch(() => navigate('/login'))} style={{ fontSize:'0.85rem' }}>
            Salir
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ borderBottom:'1px solid var(--border)', padding:'0 1.25rem' }}>
        <div style={{ display:'flex', gap:'0.25rem', maxWidth:700, margin:'0 auto' }}>
          {[['menu','🍽️ Menú'],['branches','📍 Sucursales']].map(([v,l]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              style={{
                padding:'0.75rem 1rem', fontSize:'0.875rem',
                fontFamily:'var(--font-display)', fontWeight:600,
                borderBottom: tab === v ? '2px solid var(--teal)' : '2px solid transparent',
                color: tab === v ? 'var(--teal)' : 'var(--text-3)',
                background:'none', transition:'all var(--transition)'
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:700, margin:'0 auto', padding:'1.25rem' }}>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:64 }}/>)}
          </div>
        ) : tab === 'menu' ? (

          // ── Tab Menú ──────────────────────────────────────────
          <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
            <p style={{ color:'var(--text-3)', fontSize:'0.85rem' }}>
              Desactiva un platillo para que no aparezca al tomar pedidos. Reactívalo cuando vuelva a estar disponible.
            </p>
            {toggleError && (
              <div style={{
                background:'rgba(255,80,60,0.1)', border:'1px solid rgba(255,80,60,0.25)',
                borderRadius:'var(--radius-sm)', padding:'0.5rem 0.875rem',
                color:'#ff5040', fontSize:'0.85rem'
              }}>
                {toggleError}
              </div>
            )}
            {Object.entries(byCategory).map(([catName, { emoji, items: catItems }]) => (
              <div key={catName}>
                <div style={{
                  fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.8rem',
                  color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em',
                  marginBottom:'0.625rem'
                }}>
                  {emoji} {catName}
                </div>
                <div className="card" style={{ padding:0, overflow:'hidden' }}>
                  {catItems.map((item, i) => (
                    <div key={item.id} style={{
                      display:'flex', alignItems:'center', gap:'0.875rem',
                      padding:'0.875rem 1.25rem',
                      borderBottom: i < catItems.length - 1 ? '1px solid var(--border)' : 'none',
                      opacity: item.is_available ? 1 : 0.5,
                      transition:'opacity var(--transition)'
                    }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:500, fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                          {item.name}
                          {!item.is_available && (
                            <span style={{ fontSize:'0.72rem', color:'var(--coral)', background:'rgba(255,93,59,0.12)', padding:'0.1rem 0.45rem', borderRadius:100, fontWeight:600 }}>
                              No disponible
                            </span>
                          )}
                        </div>
                        <div style={{ color:'var(--teal)', fontSize:'0.82rem', fontFamily:'var(--font-display)', fontWeight:600, marginTop:2 }}>
                          Q{Number(item.price).toFixed(2)}
                        </div>
                      </div>

                      {/* Toggle switch */}
                      <button
                        disabled={toggling === item.id}
                        onClick={() => handleToggle(item)}
                        style={{
                          width:44, height:24, borderRadius:12, flexShrink:0,
                          background: item.is_available ? 'var(--teal)' : 'var(--border-2)',
                          position:'relative', transition:'background var(--transition)',
                          opacity: toggling === item.id ? 0.5 : 1
                        }}
                      >
                        <span style={{
                          position:'absolute', top:3,
                          left: item.is_available ? 23 : 3,
                          width:18, height:18, borderRadius:'50%',
                          background:'#fff', transition:'left var(--transition)'
                        }}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        ) : (

          // ── Tab Sucursales ────────────────────────────────────
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              {branches.map((branch, i) => (
                <div key={branch.id} style={{
                  display:'flex', alignItems:'center', gap:'0.875rem',
                  padding:'0.875rem 1.25rem',
                  borderBottom: i < branches.length - 1 ? '1px solid var(--border)' : 'none'
                }}>
                  <div style={{
                    width:36, height:36, borderRadius:'50%',
                    background:'var(--surface-2)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'1.1rem', flexShrink:0
                  }}>🐙</div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:'0.95rem' }}>{branch.name}</div>
                    <div style={{ color:'var(--text-3)', fontSize:'0.78rem' }}>{branch.location}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ background:'rgba(0,201,167,0.05)', border:'1px solid rgba(0,201,167,0.15)' }}>
              <h3 style={{ fontFamily:'var(--font-display)', marginBottom:'0.625rem', color:'var(--teal)', fontSize:'0.95rem' }}>
                Gestión de cuentas
              </h3>
              <p style={{ color:'var(--text-2)', fontSize:'0.85rem', marginBottom:'0.5rem' }}>
                Para crear o cambiar contraseñas: <strong style={{ color:'var(--text-1)' }}>Supabase Dashboard → Authentication → Users</strong>.
              </p>
              <p style={{ color:'var(--text-3)', fontSize:'0.8rem' }}>
                Marcar <strong>"Auto Confirm User"</strong> al crear — no requiere verificar correo.
              </p>
            </div>
          </div>

        )}
      </div>
    </div>
  )
}
