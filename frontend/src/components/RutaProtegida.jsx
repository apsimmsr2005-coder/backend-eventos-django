import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * RutaProtegida — si no hay token, redirige al login.
 * Si hay token, muestra la ruta hija (<Outlet />).
 */
export default function RutaProtegida() {
    const { token } = useAuth();
    return token ? <Outlet /> : <Navigate to="/login" replace />;
}
