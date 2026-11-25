import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Navbar principal — cada opción es una ruta de React Router */
const SECCIONES = [
    { ruta: '/',              texto: 'Resumen' },
    { ruta: '/eventos',       texto: 'Eventos' },
    { ruta: '/participantes', texto: 'Participantes' },
    { ruta: '/inscripciones', texto: 'Inscripciones' },
    { ruta: '/proveedores',   texto: 'Proveedores' },
    { ruta: '/presupuesto',   texto: 'Presupuesto' },
];

export default function Menu() {
    const { usuario, logout } = useAuth();
    const navigate = useNavigate();

    async function cerrarSesion() {
        await logout();
        navigate('/login', { replace: true });
    }

    return (
        <nav
            className="navbar navbar-expand-md sticky-top px-3 px-md-4"
            style={{
                background: 'linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)',
                boxShadow: '0 2px 12px rgba(99,102,241,.35)',
                minHeight: 60,
            }}
        >
            {/* Marca */}
            <span className="navbar-brand text-white fw-bold mb-0 me-4" style={{ fontSize: '1.1rem' }}>
                Gestión de Eventos
            </span>

            {/* Botón hamburguesa para celular */}
            <button
                className="navbar-toggler border-light"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#menuPrincipal"
                aria-controls="menuPrincipal"
                aria-expanded="false"
                aria-label="Mostrar menú"
            >
                <span className="navbar-toggler-icon" style={{ filter: 'invert(1)' }} />
            </button>

            <div className="collapse navbar-collapse" id="menuPrincipal">
                {/* Navegación */}
                <ul className="nav nav-pills gap-1 me-auto my-2 my-md-0">
                    {SECCIONES.map((s) => (
                        <li className="nav-item" key={s.ruta}>
                            <NavLink
                                to={s.ruta}
                                end={s.ruta === '/'}
                                className={({ isActive }) =>
                                    `nav-link fw-semibold px-3 py-1 ${
                                        isActive ? 'active bg-white text-primary' : 'text-white opacity-85'
                                    }`
                                }
                                style={{ fontSize: '.875rem', borderRadius: 20 }}
                            >
                                {s.texto}
                            </NavLink>
                        </li>
                    ))}
                </ul>

                {/* Usuario + cerrar sesión */}
                <div className="d-flex align-items-center gap-2">
                    {usuario && (
                        <span className="text-white opacity-75" style={{ fontSize: '.8rem' }}>
                            Usuario: {usuario}
                        </span>
                    )}
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-light fw-semibold"
                        style={{ borderRadius: 20, fontSize: '.8rem' }}
                        onClick={cerrarSesion}
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </nav>
    );
}
