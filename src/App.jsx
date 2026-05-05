import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'

import MenuPage    from '@/pages/MenuPage'
import LoginPage   from '@/pages/LoginPage'
import OrdersPage  from '@/pages/OrdersPage'
import KitchenPage from '@/pages/KitchenPage'
import AdminPage   from '@/pages/AdminPage'
import NotFound    from '@/pages/NotFound'

function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100dvh' }}>
      <div className="spinner" style={{ width:32, height:32 }}/>
    </div>
  )

  if (!user || !profile) return <Navigate to="/login" replace />
  if (roles && !roles.includes(profile.role)) return <Navigate to="/orders" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Tomar orden — solo empleados autenticados */}
      <Route path="/menu" element={
        <ProtectedRoute roles={['employee', 'admin', 'kitchen']}>
          <CartProvider>
            <MenuPage />
          </CartProvider>
        </ProtectedRoute>
      }/>

      {/* Auth */}
      <Route path="/login" element={<LoginPage />}/>

      {/* Dashboard de mesas — empleados */}
      <Route path="/orders" element={
        <ProtectedRoute roles={['employee', 'admin']}>
          <OrdersPage />
        </ProtectedRoute>
      }/>

      {/* Cocina */}
      <Route path="/kitchen" element={
        <ProtectedRoute roles={['kitchen', 'admin', 'employee']}>
          <KitchenPage />
        </ProtectedRoute>
      }/>

      {/* Admin */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}>
          <AdminPage />
        </ProtectedRoute>
      }/>

      <Route path="/"  element={<Navigate to="/login" replace />}/>
      <Route path="*"  element={<NotFound />}/>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
