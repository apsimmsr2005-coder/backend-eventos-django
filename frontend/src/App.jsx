import { useState } from 'react';
import Login from './components/Login';
import Menu from './components/Menu';
import Resumen from './components/Resumen';
import Eventos from './components/Eventos';
import Participantes from './components/Participantes';
import Proveedores from './components/Proveedores';

/**
 * App — coordina autenticación y navegación entre secciones.
 */
export default function App() {
    const [token, setToken] = useState('');
    const [usuario, setUsuario] = useState('');
    const [seccionActiva, setSeccionActiva] = useState('resumen');

    function manejarLogin(nuevoToken, nombreUsuario) {
        setToken(nuevoToken);
        setUsuario(nombreUsuario ?? '');
        setSeccionActiva('resumen');
    }

    function cerrarSesion() {
        setToken('');
        setUsuario('');
        setSeccionActiva('resumen');
    }

    if (!token) return <Login onLogin={manejarLogin} />;

    return (
        <>
            <Menu
                seccionActiva={seccionActiva}
                onCambiarSeccion={setSeccionActiva}
                usuario={usuario}
                onCerrarSesion={cerrarSesion}
            />
            <main className="container-xl py-4 px-3 px-md-4">
                {seccionActiva === 'resumen'       && <Resumen       token={token} />}
                {seccionActiva === 'eventos'       && <Eventos        token={token} />}
                {seccionActiva === 'participantes' && <Participantes  token={token} />}
                {seccionActiva === 'proveedores'   && <Proveedores    token={token} />}
            </main>
        </>
    );
}

