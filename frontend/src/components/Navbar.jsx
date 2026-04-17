import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">⚡</span>
          <span className="brand-text">DocuGen</span>
        </Link>
        <div className="navbar-actions">
          {user ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <div className="nav-divider" />
              <span className="nav-user">{user.name}</span>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm" id="logout-btn">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
