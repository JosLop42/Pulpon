import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="page" style={{ alignItems:'center', justifyContent:'center' }}>
      <div className="empty-state">
        <span className="icon">🐙</span>
        <h2>Página no encontrada</h2>
        <p>El pulpo no sabe dónde está esto.</p>
        <button className="btn btn-teal" onClick={() => navigate(-1)} style={{ marginTop:'0.5rem' }}>
          Regresar
        </button>
      </div>
    </div>
  )
}
