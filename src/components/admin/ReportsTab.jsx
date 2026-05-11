import { useEffect, useState, useMemo } from 'react'
import { getReportsData } from '@/lib/supabase'

const RANGES = [
  { key: 'today', label: 'Hoy' },
  { key: 'week',  label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
  { key: 'all',   label: 'Todo' },
]

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function getDateFrom(range) {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (range === 'today') return today.toISOString()
  if (range === 'week') {
    const d = new Date(today)
    d.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    return d.toISOString()
  }
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  return null
}

function getDaysInRange(range) {
  const today = new Date()
  const result = []
  if (range === 'week') {
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    for (let d = new Date(monday); d <= today; d.setDate(d.getDate() + 1)) {
      result.push(new Date(d).toISOString().slice(0, 10))
    }
  } else if (range === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      result.push(new Date(d).toISOString().slice(0, 10))
    }
  }
  return result
}

function processData(orders) {
  const totalRevenue = orders.reduce((s, o) => s + (Number(o.total) || 0), 0)
  const totalOrders  = orders.length
  const avgOrder     = totalOrders ? totalRevenue / totalOrders : 0

  const branchMap = {}
  const dishMap   = {}
  const dayMap    = {}
  let pickupCount = 0, pickupRevenue = 0
  let dineInCount = 0, dineInRevenue = 0

  for (const o of orders) {
    const bId   = o.branch_id
    const bName = o.branches?.name || '—'
    if (!branchMap[bId]) branchMap[bId] = { id: bId, name: bName, revenue: 0, orders: 0 }
    branchMap[bId].revenue += Number(o.total) || 0
    branchMap[bId].orders  += 1

    if (o.table_number === 0) {
      pickupCount++
      pickupRevenue += Number(o.total) || 0
    } else {
      dineInCount++
      dineInRevenue += Number(o.total) || 0
    }

    const day = o.created_at?.slice(0, 10)
    if (day) {
      if (!dayMap[day]) dayMap[day] = { revenue: 0, count: 0 }
      dayMap[day].revenue += Number(o.total) || 0
      dayMap[day].count++
    }

    for (const item of (o.order_items || [])) {
      const name  = item.menu_items?.name || '—'
      const emoji = item.menu_items?.menu_categories?.emoji || '🍽️'
      if (!dishMap[name]) dishMap[name] = { name, emoji, qty: 0, revenue: 0 }
      dishMap[name].qty     += item.quantity
      dishMap[name].revenue += item.quantity * Number(item.unit_price)
    }
  }

  const byBranch  = Object.values(branchMap).sort((a, b) => b.revenue - a.revenue)
  const topDishes = Object.values(dishMap).sort((a, b) => b.qty - a.qty).slice(0, 10)

  return { totalRevenue, totalOrders, avgOrder, byBranch, topDishes, dayMap, pickupCount, pickupRevenue, dineInCount, dineInRevenue }
}

function exportCSV(orders, rangeLabel) {
  const { byBranch, topDishes, totalRevenue, totalOrders, pickupCount, pickupRevenue, dineInCount, dineInRevenue } = processData(orders)
  const rows = [
    ["Reporte Pulpo's", rangeLabel],
    [`Generado el ${new Date().toLocaleDateString('es-GT')}`],
    [],
    ['INGRESOS POR SUCURSAL'],
    ['Sucursal', 'Pedidos', 'Ingreso (Q)'],
    ...byBranch.map(b => [b.name, b.orders, b.revenue.toFixed(2)]),
    ['TOTAL', totalOrders, totalRevenue.toFixed(2)],
    [],
    ['MESA VS PICKUP'],
    ['Tipo', 'Pedidos', 'Ingreso (Q)'],
    ['En mesa', dineInCount, dineInRevenue.toFixed(2)],
    ['Para llevar (pickup)', pickupCount, pickupRevenue.toFixed(2)],
    [],
    ['TOP PLATILLOS MÁS PEDIDOS'],
    ['#', 'Platillo', 'Unidades vendidas', 'Ingreso (Q)'],
    ...topDishes.map((d, i) => [i + 1, d.name, d.qty, d.revenue.toFixed(2)]),
  ]
  const BOM = '﻿'
  const csv = BOM + rows.map(r =>
    r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: `reporte-pulpos-${rangeLabel.toLowerCase().replace(/ /g, '-')}.csv` })
  a.click()
  URL.revokeObjectURL(url)
}

function exportPDF(orders, rangeLabel) {
  const { byBranch, topDishes, totalRevenue, totalOrders, avgOrder, pickupCount, pickupRevenue, dineInCount, dineInRevenue } = processData(orders)
  const maxRev = byBranch[0]?.revenue || 1

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Reporte Pulpo's — ${rangeLabel}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,sans-serif;color:#111;padding:2rem;font-size:13px}
  h1{font-size:1.4rem;margin-bottom:.2rem}
  .sub{color:#777;font-size:.8rem;margin-bottom:1.5rem}
  .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:.875rem;margin-bottom:1.5rem}
  .kpi{border:1px solid #ddd;border-radius:8px;padding:.875rem 1rem;text-align:center}
  .kpi-v{font-size:1.3rem;font-weight:700;color:#0a9e87}
  .kpi-l{font-size:.72rem;color:#888;margin-top:3px}
  h2{font-size:.85rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#555;margin:1.25rem 0 .75rem;padding-bottom:.375rem;border-bottom:1px solid #eee}
  .split{display:grid;grid-template-columns:1fr 1fr;gap:.875rem;margin-bottom:1.5rem}
  .split-box{border:1px solid #eee;border-radius:8px;padding:.875rem;text-align:center}
  .split-v{font-size:1.1rem;font-weight:700}
  .split-l{font-size:.72rem;color:#888;margin-top:3px}
  .bar-row{display:flex;align-items:center;gap:.625rem;margin-bottom:.5rem}
  .bar-lbl{width:130px;font-size:.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bar-track{flex:1;background:#f0f0f0;border-radius:4px;height:10px}
  .bar-fill{background:#0a9e87;border-radius:4px;height:10px}
  .bar-val{font-size:.78rem;font-weight:600;min-width:80px;text-align:right}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:.72rem;color:#888;padding:.375rem .5rem;border-bottom:2px solid #eee}
  td{padding:.5rem;border-bottom:1px solid #f0f0f0;font-size:.85rem}
  .r{text-align:right;font-weight:600}
  footer{margin-top:2rem;font-size:.72rem;color:#bbb;text-align:center}
</style></head><body>
  <h1>🐙 Pulpo's — Reporte de ventas</h1>
  <div class="sub">${rangeLabel} &nbsp;·&nbsp; Generado el ${new Date().toLocaleDateString('es-GT', { dateStyle: 'long' })}</div>
  <div class="kpis">
    <div class="kpi"><div class="kpi-v">Q${totalRevenue.toFixed(2)}</div><div class="kpi-l">Total ingresos</div></div>
    <div class="kpi"><div class="kpi-v">${totalOrders}</div><div class="kpi-l">Pedidos pagados</div></div>
    <div class="kpi"><div class="kpi-v">Q${avgOrder.toFixed(2)}</div><div class="kpi-l">Promedio por pedido</div></div>
  </div>
  <h2>Mesa vs Pickup</h2>
  <div class="split">
    <div class="split-box"><div class="split-v" style="color:#0a9e87">Q${dineInRevenue.toFixed(2)}</div><div class="split-l">🪑 ${dineInCount} pedidos en mesa</div></div>
    <div class="split-box"><div class="split-v" style="color:#c87400">Q${pickupRevenue.toFixed(2)}</div><div class="split-l">🛵 ${pickupCount} pedidos pickup</div></div>
  </div>
  ${byBranch.length > 1 ? `
  <h2>Ingresos por sucursal</h2>
  ${byBranch.map(b => `
    <div class="bar-row">
      <div class="bar-lbl">${b.name}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(b.revenue/maxRev*100).toFixed(1)}%"></div></div>
      <div class="bar-val">Q${b.revenue.toFixed(2)}</div>
    </div>`).join('')}` : ''}
  <h2>Top platillos más pedidos</h2>
  <table>
    <thead><tr><th>#</th><th>Platillo</th><th class="r">Unidades</th><th class="r">Ingreso</th></tr></thead>
    <tbody>${topDishes.map((d, i) => `
      <tr><td>${i+1}</td><td>${d.emoji} ${d.name}</td><td class="r">${d.qty}</td><td class="r">Q${d.revenue.toFixed(2)}</td></tr>`).join('')}
    </tbody>
  </table>
  <footer>Pulpo's · Sistema de gestión de pedidos</footer>
</body></html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 400)
}

function DailyChart({ dayMap, range }) {
  const days = useMemo(() => getDaysInRange(range), [range])
  if (!days.length) return null

  const data    = days.map(d => ({ day: d, revenue: dayMap[d]?.revenue || 0, count: dayMap[d]?.count || 0 }))
  const maxRev  = Math.max(...data.map(d => d.revenue), 1)
  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div className="card" style={{ marginBottom:'1.25rem', padding:'1rem 1.25rem' }}>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.78rem', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.875rem' }}>
        Ventas por día
      </div>
      <div style={{ display:'flex', alignItems:'flex-end', gap: range === 'month' ? 2 : 6, height:80 }}>
        {data.map(d => {
          const pct     = d.revenue / maxRev
          const date    = new Date(d.day + 'T12:00:00')
          const isToday = d.day === todayStr
          const dayNum  = parseInt(d.day.slice(8, 10), 10)
          return (
            <div
              key={d.day}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', gap:3, height:'100%' }}
            >
              <div
                title={d.revenue > 0 ? `Q${d.revenue.toFixed(2)} · ${d.count} pedido${d.count !== 1 ? 's' : ''}` : 'Sin ventas'}
                style={{
                  width:'100%', minHeight:2,
                  height:`${Math.max(pct * 56, d.revenue > 0 ? 4 : 2)}px`,
                  background: isToday ? 'var(--coral)' : (d.revenue > 0 ? 'var(--teal)' : 'var(--border)'),
                  borderRadius:'3px 3px 0 0',
                  transition:'height 0.4s ease'
                }}
              />
              {range === 'week' && (
                <div style={{ fontSize:'0.62rem', color: isToday ? 'var(--coral)' : 'var(--text-3)', fontWeight: isToday ? 700 : 400 }}>
                  {DAY_NAMES[date.getDay()]}
                </div>
              )}
              {range === 'month' && dayNum % 5 === 1 && (
                <div style={{ fontSize:'0.58rem', color:'var(--text-3)' }}>
                  {dayNum}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ReportsTab({ branches }) {
  const [range,      setRange]      = useState('month')
  const [orders,     setOrders]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [loadError,  setLoadError]  = useState(false)
  const [branchView, setBranchView] = useState('all')

  useEffect(() => {
    setLoading(true)
    setLoadError(false)
    getReportsData(getDateFrom(range))
      .then(data => setOrders(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [range])

  const rangeLabel = RANGES.find(r => r.key === range)?.label || ''

  const visibleOrders = useMemo(
    () => branchView === 'all' ? orders : orders.filter(o => o.branch_id === branchView),
    [orders, branchView]
  )

  const {
    totalRevenue, totalOrders, avgOrder, byBranch, topDishes,
    dayMap, pickupCount, pickupRevenue, dineInCount, dineInRevenue
  } = useMemo(() => processData(visibleOrders), [visibleOrders])

  const maxRevenue = byBranch[0]?.revenue || 1

  return (
    <div>

      {/* Controles superiores */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'0.75rem', marginBottom:'1.25rem' }}>
        <div style={{ display:'flex', gap:'0.375rem', flexWrap:'wrap' }}>
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              style={{
                padding:'0.4rem 0.875rem', borderRadius:100, fontSize:'0.82rem',
                fontFamily:'var(--font-display)', fontWeight:600,
                background: range === r.key ? 'var(--teal)' : 'var(--surface-2)',
                color:      range === r.key ? 'var(--ink)' : 'var(--text-2)',
                border:     range === r.key ? 'none' : '1px solid var(--border)',
                transition:'all var(--transition)'
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize:'0.82rem' }}
            disabled={loading || !visibleOrders.length}
            onClick={() => exportCSV(visibleOrders, rangeLabel)}
          >
            📊 Excel
          </button>
          <button
            className="btn btn-ghost"
            style={{ fontSize:'0.82rem' }}
            disabled={loading || !visibleOrders.length}
            onClick={() => exportPDF(visibleOrders, rangeLabel)}
          >
            📄 PDF
          </button>
        </div>
      </div>

      {/* Filtro por sucursal */}
      <div style={{ display:'flex', gap:'0.375rem', flexWrap:'wrap', marginBottom:'1.5rem' }}>
        <button
          onClick={() => setBranchView('all')}
          style={{
            padding:'0.35rem 0.75rem', borderRadius:100, fontSize:'0.8rem', fontWeight:600,
            background: branchView === 'all' ? 'var(--coral)' : 'var(--surface-2)',
            color:      branchView === 'all' ? '#fff' : 'var(--text-2)',
            border:     branchView === 'all' ? 'none' : '1px solid var(--border)',
          }}
        >
          🌐 General
        </button>
        {branches.map(b => (
          <button
            key={b.id}
            onClick={() => setBranchView(b.id)}
            style={{
              padding:'0.35rem 0.75rem', borderRadius:100, fontSize:'0.8rem', fontWeight:600,
              background: branchView === b.id ? 'var(--coral)' : 'var(--surface-2)',
              color:      branchView === b.id ? '#fff' : 'var(--text-2)',
              border:     branchView === b.id ? 'none' : '1px solid var(--border)',
            }}
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:64 }}/>)}
        </div>
      ) : loadError ? (
        <div style={{ textAlign:'center', padding:'2rem', color:'var(--coral)' }}>
          Error al cargar los reportes. Verifica tu conexión.
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.625rem', marginBottom:'1.25rem' }}>
            {[
              { label:'Total ingresos',     value:`Q${totalRevenue.toFixed(2)}`, color:'var(--teal)'  },
              { label:'Pedidos cobrados',   value:String(totalOrders),           color:'var(--mist)'  },
              { label:'Ticket promedio',    value:`Q${avgOrder.toFixed(2)}`,     color:'var(--amber)' },
            ].map(k => (
              <div key={k.label} className="card" style={{ textAlign:'center', padding:'0.875rem 0.5rem' }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'clamp(0.85rem, 3.2vw, 1.2rem)', color:k.color, wordBreak:'break-all' }}>
                  {k.value}
                </div>
                <div style={{ color:'var(--text-3)', fontSize:'clamp(0.62rem, 1.8vw, 0.73rem)', marginTop:4 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Gráfica diaria */}
          {(range === 'week' || range === 'month') && (
            <DailyChart dayMap={dayMap} range={range} />
          )}

          {/* Mesa vs Pickup */}
          {totalOrders > 0 && (
            <div className="card" style={{ marginBottom:'1.25rem', padding:'1rem 1.25rem' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.78rem', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.875rem' }}>
                Mesa vs Pickup
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.875rem' }}>
                <div style={{ textAlign:'center', padding:'0.875rem 0.75rem', background:'var(--surface-2)', borderRadius:'var(--radius)' }}>
                  <div style={{ fontSize:'1.1rem', marginBottom:3 }}>🪑</div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.05rem', color:'var(--teal)' }}>
                    Q{dineInRevenue.toFixed(2)}
                  </div>
                  <div style={{ color:'var(--text-3)', fontSize:'0.72rem', marginTop:3 }}>
                    {dineInCount} pedido{dineInCount !== 1 ? 's' : ''} en mesa
                  </div>
                </div>
                <div style={{ textAlign:'center', padding:'0.875rem 0.75rem', background:'var(--surface-2)', borderRadius:'var(--radius)' }}>
                  <div style={{ fontSize:'1.1rem', marginBottom:3 }}>🛵</div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.05rem', color:'var(--amber)' }}>
                    Q{pickupRevenue.toFixed(2)}
                  </div>
                  <div style={{ color:'var(--text-3)', fontSize:'0.72rem', marginTop:3 }}>
                    {pickupCount} pedido{pickupCount !== 1 ? 's' : ''} pickup
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Barras por sucursal — solo en vista general */}
          {branchView === 'all' && byBranch.length > 1 && (
            <div className="card" style={{ marginBottom:'1.25rem', padding:'1rem 1.25rem' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.78rem', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.875rem' }}>
                Ingresos por sucursal
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                {byBranch.map(b => (
                  <div key={b.id}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', fontSize:'0.83rem', marginBottom:5 }}>
                      <span style={{ fontWeight:500 }}>{b.name}</span>
                      <span>
                        <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--teal)' }}>Q{b.revenue.toFixed(2)}</span>
                        <span style={{ color:'var(--text-3)', fontSize:'0.75rem', marginLeft:6 }}>{b.orders} pedidos</span>
                      </span>
                    </div>
                    <div style={{ height:8, borderRadius:4, background:'var(--border)', overflow:'hidden' }}>
                      <div style={{
                        height:'100%', borderRadius:4, background:'var(--teal)',
                        width:`${(b.revenue / maxRevenue * 100).toFixed(1)}%`,
                        transition:'width 0.5s ease'
                      }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top platillos */}
          {topDishes.length > 0 ? (
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <div style={{ padding:'0.875rem 1.25rem', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.78rem', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                  Top platillos más pedidos
                </span>
              </div>
              {topDishes.map((d, i) => (
                <div key={d.name} style={{
                  display:'flex', alignItems:'center', gap:'0.875rem',
                  padding:'0.75rem 1.25rem',
                  borderBottom: i < topDishes.length - 1 ? '1px solid var(--border)' : 'none'
                }}>
                  <span style={{ color:'var(--text-3)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.85rem', minWidth:18, textAlign:'center' }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize:'1rem' }}>{d.emoji}</span>
                  <span style={{ flex:1, fontWeight:500, fontSize:'0.9rem' }}>{d.name}</span>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.9rem', color:'var(--teal)' }}>
                      Q{d.revenue.toFixed(2)}
                    </div>
                    <div style={{ color:'var(--text-3)', fontSize:'0.73rem' }}>{d.qty} unidades</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding:'2.5rem 1rem' }}>
              <span>📊</span>
              <span style={{ fontSize:'0.875rem' }}>Sin ventas registradas en este período</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
