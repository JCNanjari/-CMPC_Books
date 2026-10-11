import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          <div>
            <strong>CMPC Libros</strong>
            <small>Inventario</small>
          </div>
        </div>
        <nav className="nav">
          <NavLink to="/libros" className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Libros
          </NavLink>
          <NavLink to="/auditoria" className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Auditoría
          </NavLink>
        </nav>
        <div className="session">
          <span>{user?.name}</span>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Salir
          </button>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
