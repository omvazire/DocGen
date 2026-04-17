import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectView from './pages/ProjectView';

function PrivateRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return null;
  return token ? children : <Navigate to="/login" />;
}

function GuestRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return null;
  return !token ? children : <Navigate to="/dashboard" />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/project/:id" element={<PrivateRoute><ProjectView /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </>
  );
}
