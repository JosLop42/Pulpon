import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { profile, loading: authLoading } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  // Redirigir en useEffect, nunca durante el render
  useEffect(() => {
    if (!profile) return
    const dest = profile.role === 'admin'   ? '/admin'
               : profile.role === 'kitchen' ? '/kitchen'
               : '/orders'
    navigate(dest, { replace: true })
  }, [profile, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email.trim(), password)
    } catch {
      setError('Correo o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100dvh' }}>
      <div className="spinner" style={{ width:32, height:32 }}/>
    </div>
  )

  return (
    <div className="page" style={{ alignItems:'center', justifyContent:'center', padding:'1rem' }}>

      <div style={{
        position:'fixed', inset:0, zIndex:0,
        background:'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,201,167,0.12) 0%, transparent 70%), var(--ink)'
      }}/>

      <div className="container animate-up" style={{ position:'relative', zIndex:1 }}>

        <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
          <div style={{
            width:72, height:72, borderRadius:'50%',
            background:'var(--surface)', border:'1px solid var(--border-2)',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 1rem', fontSize:'2rem'
          }}>🐙</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.9rem', marginBottom:'0.25rem' }}>
            Pulpo Zurdo
          </h1>
          <p style={{ color:'var(--text-3)', fontSize:'0.9rem' }}>Panel de empleados</p>
        </div>

        <div className="card" style={{ padding:'1.75rem' }}>
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1.1rem' }}>

            <div>
              <label className="label">Correo electrónico</label>
              <input
                className="input" type="email" autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="sucursal@pulpozurdo.com" required
              />
            </div>

            <div>
              <label className="label">Contraseña</label>
              <input
                className="input" type="password" autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
              />
            </div>

            {error && (
              <div style={{
                background:'rgba(255,80,60,0.1)', border:'1px solid rgba(255,80,60,0.2)',
                borderRadius:'var(--radius-sm)', padding:'0.625rem 0.875rem',
                color:'#ff5040', fontSize:'0.875rem'
              }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-teal" disabled={loading} style={{ marginTop:'0.5rem', width:'100%' }}>
              {loading ? <><div className="spinner"/>Iniciando sesión…</> : 'Entrar'}
            </button>

          </form>
        </div>

      </div>
    </div>
  )
}
