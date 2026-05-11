import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getBranches, getMenuAdmin, updateBranch,
  toggleMenuItemAvailability, toggleBranchMenuItemAvailability,
  signOut
} from '@/lib/supabase'
import ReportsTab from '@/components/admin/ReportsTab'

// ── Editor de sucursal ────────────────────────────────────────────────────────
function BranchEditor({ branch, onSaved }) {
  const [editing,  setEditing]  = useState(false)
  const [name,     setName]     = useState(branch.name)
  const [location, setLocation] = useState(branch.location || '')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const updated = await updateBranch(branch.id, { name: name.trim(), location: location.trim() })
      onSaved(updated)
      setEditing(false)
    } catch {
      setError('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setName(branch.name)
    setLocation(branch.location || '')
    setError(null)
    setEditing(false)
  }

  if (!editing) return (
    <div style={{ display:'flex', alignItems:'center', gap:'0.875rem' }}>
      <div style={{
        width:40, height:40, borderRadius:'50%', background:'var(--surface-2)',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0
      }}>🐙</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, fontSize:'0.95rem' }}>{branch.name}</div>
        <div style={{ color:'var(--text-3)', fontSize:'0.78rem', marginTop:1 }}>
          {branch.location || <span style={{ fontStyle:'italic' }}>Sin ubicación</span>}
        </div>
      </div>
      <button
        className="btn btn-ghost"
        style={{ fontSize:'0.78rem', flexShrink:0 }}
        onClick={() => setEditing(true)}
      >
        ✏️ Editar
      </button>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
      <div>
        <label className="label">Nombre</label>
        <input
          className="input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nombre de la sucursal"
        />
      </div>
      <div>
        <label className="label">Ubicación</label>
        <input
          className="input"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Dirección o referencia"
        />
      </div>
      {error && (
        <div style={{ color:'#ff5040', fontSize:'0.82rem' }}>{error}</div>
      )}
      <div style={{ display:'flex', gap:'0.5rem' }}>
        <button
          className="btn btn-teal"
          style={{ flex:1, fontSize:'0.85rem' }}
          disabled={saving || !name.trim()}
          onClick={handleSave}
        >
          {saving ? <><div className="spinner"/>Guardando…</> : '✓ Guardar'}
        </button>
        <button className="btn btn-ghost" style={{ fontSize:'0.85rem' }} onClick={handleCancel}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate()

  // Reportes es la vista inicial
  const [tab,         setTab]        = useState('reports')
  const [branches,    setBranches]   = useState([])
  const [items,       setItems]      = useState([])
  const [loading,     setLoading]    = useState(true)
  const [toggling,    setToggling]   = useState(null)
  const [toggleError, setToggleError] = useState(null)
  const [menuScope,   setMenuScope]  = useState('all')

  useEffect(() => {
    Promise.all([getBranches(), getMenuAdmin()])
      .then(([b, m]) => { setBranches(b || []); setItems(m || []) })
      .finally(() => setLoading(false))
  }, [])

  function handleBranchSaved(updated) {
    setBranches(prev => prev.map(b => b.id === updated.id ? updated : b))
  }

  async function handleToggle(item) {
    const isGlobal   = menuScope === 'all'
    if (!isGlobal && !item.is_available) return

    const bmi          = !isGlobal && item.branch_menu_items?.find(b => b.branch_id === menuScope)
    const currentAvail = isGlobal ? item.is_available : (bmi?.is_available ?? true)
    const nextAvail    = !currentAvail

    setToggling(item.id)
    setToggleError(null)
    try {
      if (isGlobal) {
        await toggleMenuItemAvailability(item.id, nextAvail)
        setItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, is_available: nextAvail } : i
        ))
      } else {
        await toggleBranchMenuItemAvailability(menuScope, item.id, nextAvail)
        setItems(prev => prev.map(i =>
          i.id === item.id ? {
            ...i,
            branch_menu_items: i.branch_menu_items?.map(b =>
              b.branch_id === menuScope ? { ...b, is_available: nextAvail } : b
            )
          } : i
        ))
      }
    } catch {
      setToggleError('No se pudo actualizar el platillo. Intenta de nuevo.')
    } finally {
      setToggling(null)
    }
  }

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
        background:'rgba(255,245,235,0.93)', backdropFilter:'blur(12px)',
        borderBottom:'1px solid var(--border)', padding:'0.875rem 1.25rem',
        display:'flex', alignItems:'center', justifyContent:'space-between'
      }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.1rem' }}>
          🐙 Admin — Pulpo's
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
          {[['reports','📊 Reportes'],['menu','🍽️ Menú'],['branches','📍 Sucursales']].map(([v,l]) => (
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

        {/* ── Tab Reportes ──────────────────────────────────────── */}
        {tab === 'reports' && <ReportsTab branches={branches} />}

        {/* ── Tab Menú ──────────────────────────────────────────── */}
        {tab === 'menu' && (
          loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:64 }}/>)}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

              {/* Selector de alcance */}
              <div>
                <p style={{ color:'var(--text-3)', fontSize:'0.82rem', marginBottom:'0.75rem' }}>
                  Elige si el cambio aplica a <strong style={{ color:'var(--text-2)' }}>todas las sucursales</strong> o solo a una.
                </p>
                <div style={{ display:'flex', gap:'0.375rem', flexWrap:'wrap' }}>
                  <button
                    onClick={() => { setMenuScope('all'); setToggleError(null) }}
                    style={{
                      padding:'0.35rem 0.875rem', borderRadius:100, fontSize:'0.8rem', fontWeight:600,
                      background: menuScope === 'all' ? 'var(--teal)' : 'var(--surface-2)',
                      color:      menuScope === 'all' ? 'var(--ink)' : 'var(--text-2)',
                      border:     menuScope === 'all' ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    🌐 Todas las sucursales
                  </button>
                  {branches.map(b => (
                    <button
                      key={b.id}
                      onClick={() => { setMenuScope(b.id); setToggleError(null) }}
                      style={{
                        padding:'0.35rem 0.875rem', borderRadius:100, fontSize:'0.8rem', fontWeight:600,
                        background: menuScope === b.id ? 'var(--coral)' : 'var(--surface-2)',
                        color:      menuScope === b.id ? '#fff' : 'var(--text-2)',
                        border:     menuScope === b.id ? 'none' : '1px solid var(--border)',
                      }}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>

              {toggleError && (
                <div style={{
                  background:'rgba(255,80,60,0.1)', border:'1px solid rgba(255,80,60,0.25)',
                  borderRadius:'var(--radius-sm)', padding:'0.5rem 0.875rem',
                  color:'#ff5040', fontSize:'0.85rem'
                }}>
                  {toggleError}
                </div>
              )}

              {/* Platillos */}
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
                    {catItems.map((item, i) => {
                      const isGlobal      = menuScope === 'all'
                      const globallyOff   = !item.is_available
                      const bmi           = !isGlobal && item.branch_menu_items?.find(b => b.branch_id === menuScope)
                      const branchOff     = !isGlobal && !(bmi?.is_available ?? true)
                      const toggleOn      = isGlobal ? item.is_available : (bmi?.is_available ?? true)
                      const toggleDisabled = toggling === item.id || (!isGlobal && globallyOff)
                      const branchesOff   = isGlobal
                        ? (item.branch_menu_items || []).filter(b => !b.is_available).length
                        : 0

                      return (
                        <div key={item.id} style={{
                          display:'flex', alignItems:'center', gap:'0.875rem',
                          padding:'0.875rem 1.25rem',
                          borderBottom: i < catItems.length - 1 ? '1px solid var(--border)' : 'none',
                          opacity: globallyOff || branchOff ? 0.5 : 1,
                          transition:'opacity var(--transition)'
                        }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:500, fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'0.5rem', flexWrap:'wrap' }}>
                              {item.name}
                              {globallyOff && (
                                <span style={{ fontSize:'0.7rem', color:'var(--coral)', background:'rgba(255,93,59,0.12)', padding:'0.1rem 0.45rem', borderRadius:100, fontWeight:600 }}>
                                  No disponible (todas)
                                </span>
                              )}
                              {!isGlobal && !globallyOff && branchOff && (
                                <span style={{ fontSize:'0.7rem', color:'var(--amber)', background:'rgba(255,179,71,0.12)', padding:'0.1rem 0.45rem', borderRadius:100, fontWeight:600 }}>
                                  No disponible aquí
                                </span>
                              )}
                              {!isGlobal && globallyOff && (
                                <span style={{ fontSize:'0.7rem', color:'var(--text-3)', background:'var(--surface-2)', padding:'0.1rem 0.45rem', borderRadius:100 }}>
                                  Desactivado globalmente
                                </span>
                              )}
                              {isGlobal && item.is_available && branchesOff > 0 && (
                                <span style={{ fontSize:'0.7rem', color:'var(--amber)', background:'rgba(255,179,71,0.12)', padding:'0.1rem 0.45rem', borderRadius:100 }}>
                                  {branchesOff} sucursal{branchesOff > 1 ? 'es' : ''} lo tienen off
                                </span>
                              )}
                            </div>
                            <div style={{ color:'var(--teal)', fontSize:'0.82rem', fontFamily:'var(--font-display)', fontWeight:600, marginTop:2 }}>
                              Q{Number(item.price).toFixed(2)}
                            </div>
                          </div>

                          <button
                            disabled={toggleDisabled}
                            onClick={() => handleToggle(item)}
                            title={!isGlobal && globallyOff ? 'Activa el platillo globalmente primero' : ''}
                            style={{
                              width:44, height:24, borderRadius:12, flexShrink:0,
                              background: toggleOn
                                ? (isGlobal ? 'var(--teal)' : 'var(--coral)')
                                : 'var(--border-2)',
                              position:'relative', transition:'background var(--transition)',
                              opacity: toggleDisabled ? 0.4 : 1,
                              cursor: toggleDisabled ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <span style={{
                              position:'absolute', top:3,
                              left: toggleOn ? 23 : 3,
                              width:18, height:18, borderRadius:'50%',
                              background:'#fff', transition:'left var(--transition)'
                            }}/>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Tab Sucursales ────────────────────────────────────── */}
        {tab === 'branches' && (
          loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:80 }}/>)}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
              <p style={{ color:'var(--text-3)', fontSize:'0.82rem' }}>
                Edita el nombre o la dirección de cada sucursal. Los cambios se reflejan de inmediato en toda la app.
              </p>
              {branches.map(branch => (
                <div key={branch.id} className="card" style={{ padding:'1rem 1.25rem' }}>
                  <BranchEditor branch={branch} onSaved={handleBranchSaved} />
                </div>
              ))}
              <div className="card" style={{ background:'rgba(0,201,167,0.05)', border:'1px solid rgba(0,201,167,0.15)', marginTop:'0.25rem' }}>
                <h3 style={{ fontFamily:'var(--font-display)', marginBottom:'0.5rem', color:'var(--teal)', fontSize:'0.9rem' }}>
                  Gestión de cuentas
                </h3>
                <p style={{ color:'var(--text-2)', fontSize:'0.83rem', marginBottom:'0.375rem' }}>
                  Para crear usuarios o cambiar contraseñas: <strong style={{ color:'var(--text-1)' }}>Supabase Dashboard → Authentication → Users</strong>.
                </p>
                <p style={{ color:'var(--text-3)', fontSize:'0.78rem' }}>
                  Marcar <strong>"Auto Confirm User"</strong> al crear — no requiere verificar correo.
                </p>
              </div>
            </div>
          )
        )}

      </div>
    </div>
  )
}
