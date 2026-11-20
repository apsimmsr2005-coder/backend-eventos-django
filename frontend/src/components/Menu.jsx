/** Navbar principal — sección activa llega por props desde App */
const SECCIONES = [
    { valor: 'resumen',       texto: 'Resumen' },
    { valor: 'eventos',       texto: 'Eventos' },
    { valor: 'participantes', texto: 'Participantes' },
    { valor: 'proveedores',   texto: 'Proveedores' },
];

export default function Menu({ seccionActiva, onCambiarSeccion, usuario, onCerrarSesion }) {
    return (
        <nav
            className="navbar sticky-top px-3 px-md-4"
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

            {/* Navegación */}
            <ul className="nav nav-pills gap-1 me-auto">
                {SECCIONES.map((s) => (
                    <li className="nav-item" key={s.valor}>
                        <button
                            type="button"
                            className={`nav-link fw-semibold px-3 py-1 ${
                                seccionActiva === s.valor
                                    ? 'active bg-white text-primary'
                                    : 'text-white opacity-85'
                            }`}
                            style={{ fontSize: '.875rem', borderRadius: 20 }}
                            onClick={() => onCambiarSeccion(s.valor)}
                        >
                            {s.texto}
                        </button>
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
                    onClick={onCerrarSesion}
                >
                    Cerrar sesión
                </button>
            </div>
        </nav>
    );
}
