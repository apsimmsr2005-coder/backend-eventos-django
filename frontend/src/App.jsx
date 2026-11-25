import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import RutaProtegida from './components/RutaProtegida';
import Resumen from './components/Resumen';
import Eventos from './components/Eventos';
import Participantes from './components/Participantes';
import Proveedores from './components/Proveedores';
import InscripcionesPagina from './pages/InscripcionesPagina';
import PresupuestoPagina from './pages/PresupuestoPagina';

/**
 * App — define las rutas de la SPA.
 * /login es pública; el resto pasa por RutaProtegida y usa el Layout con el menú.
 * Cinco módulos: eventos, participantes, inscripciones, proveedores y presupuesto.
 */
export default function App() {
    const { token } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<RutaProtegida />}>
                <Route element={<Layout />}>
                    <Route index element={<Resumen token={token} />} />
                    <Route path="eventos" element={<Eventos token={token} />} />
                    <Route path="participantes" element={<Participantes token={token} />} />
                    <Route path="proveedores" element={<Proveedores token={token} />} />
                    <Route path="inscripciones" element={<InscripcionesPagina />} />
                    <Route path="presupuesto" element={<PresupuestoPagina />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
