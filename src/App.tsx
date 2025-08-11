import { Routes, Route, Navigate, Link } from 'react-router-dom'
import Signup from '../src/pages/Signup'
import Confirm from '../src/pages/Confirm'
import Login from '../src/pages/Login'
import Dashboard from '../src/pages/Dashboard'
import { useAuth } from './lib/auth-context'

function RequireAuth({ children }: { children: JSX.Element }) {
  const { tokens } = useAuth()
  if (!tokens?.AccessToken) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <>
      <div className="container" style={{paddingBottom: 0}}>
        <div className="row" style={{justifyContent:'space-between'}}>
          <Link to="/" style={{fontWeight:800, fontSize:18, color:'white', textDecoration:'none'}}>Lab4All</Link>
          <nav className="row">
            <Link to="/signup">Sign up</Link>
            <Link to="/login">Login</Link>
            <Link to="/dashboard">Dashboard</Link>
          </nav>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard/></RequireAuth>} />
        <Route path="*" element={<div className="centered"><div className="card">Not Found</div></div>} />
      </Routes>
    </>
  )
}
