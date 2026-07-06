import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'

// Code splitting por rota: cada pagina vira um arquivo separado que so e
// baixado quando o usuario navega ate ela. O painel Admin (o maior de todos)
// nao entra mais no carregamento inicial de quem nem e admin.
const Home = lazy(() => import('./pages/Home'))
const Events = lazy(() => import('./pages/Events'))
const Finance = lazy(() => import('./pages/Finance'))
const Ranking = lazy(() => import('./pages/Ranking'))
const Rules = lazy(() => import('./pages/Rules'))
const Admin = lazy(() => import('./pages/admin/Admin'))

function ScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-600">Carregando...</div>
    </div>
  )
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-gray-600">Carregando...</div>
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <ScreenLoader />
  }

  return user ? children : <Navigate to="/login" />
}

function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth()

  if (loading) {
    return <ScreenLoader />
  }

  if (!user) return <Navigate to="/login" />
  if (!isAdmin) return <Navigate to="/" />

  return children
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route
              index
              element={
                <Suspense fallback={<PageLoader />}>
                  <Home />
                </Suspense>
              }
            />
            <Route
              path="events"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Events />
                </Suspense>
              }
            />
            <Route
              path="finance"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Finance />
                </Suspense>
              }
            />
            <Route
              path="ranking"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Ranking />
                </Suspense>
              }
            />
            <Route
              path="rules"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Rules />
                </Suspense>
              }
            />
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <Suspense fallback={<PageLoader />}>
                    <Admin />
                  </Suspense>
                </AdminRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
