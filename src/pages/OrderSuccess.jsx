import { useSearchParams } from 'react-router-dom'

export default function OrderSuccess() {
  const [p] = useSearchParams()
  const table = p.get('table')

  return (
    <div className="page" style={{ alignItems:'center', justifyContent:'center', padding:'1.5rem', textAlign:'center' }}>
      <div style={{
        position:'fixed', inset:0,
        background:'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0,201,167,0.1) 0%, transparent 70%), var(--ink)'
      }}/>
      <div className="container animate-up" style={{ position:'relative', zIndex:1 }}>
        <div style={{ fontSize:'4rem', marginBottom:'1.25rem' }}>🐙</div>
        <h1 style={{ marginBottom:'0.75rem' }}>¡Pedido enviado!</h1>
        <p style={{ color:'var(--text-2)', marginBottom:'0.5rem' }}>
          Tu pedido llegó a cocina. Pronto te lo llevamos a la mesa.
        </p>
        <p style={{ color:'var(--teal)', fontFamily:'var(--font-display)', fontWeight:600, fontSize:'1.1rem' }}>
          Mesa {table}
        </p>
        <p style={{ color:'var(--text-3)', fontSize:'0.85rem', marginTop:'2rem' }}>
          Si necesitas algo más, vuelve a escanear el QR de tu mesa.
        </p>
      </div>
    </div>
  )
}
