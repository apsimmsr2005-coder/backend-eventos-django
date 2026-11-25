import { useEffect, useState } from 'react';
import Paginacion from '../components/Paginacion';
import { API_BASE, apiFetch, obtenerMensajeError, obtenerTodos, formatearFecha } from '../utils/api';

const API_URL = `${API_BASE}/inscripciones/`;

const BADGE = {
    ACTIVA:    'bg-success-subtle text-success',
    CANCELADA: 'bg-secondary-subtle text-secondary',
};

/**
 * Pantalla del módulo Inscripciones.
 * GET    /api/inscripciones/?estado=&evento=&participante=&page=   (filtros combinables)
 * POST   /api/inscripciones/        { evento, participante }
 * PATCH  /api/inscripciones/<id>/   { estado }   (cancelar / reactivar)
 * DELETE /api/inscripciones/<id>/
 */
export default function InscripcionesPagina() {
    const [inscripciones, setInscripciones] = useState([]);
    const [eventos, setEventos] = useState([]);
    const [participantes, setParticipantes] = useState([]);
    const [filtros, setFiltros] = useState({ estado: '', evento: '', participante: '' });
    const [formulario, setFormulario] = useState({ evento: '', participante: '' });
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalRegistros, setTotalRegistros] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    // Catálogos para los selectores (una sola vez)
    useEffect(() => {
        Promise.all([obtenerTodos(`${API_BASE}/eventos/`), obtenerTodos(`${API_BASE}/participantes/`)])
            .then(([ev, pa]) => { setEventos(ev); setParticipantes(pa); })
            .catch((err) => setError(err.message));
    }, []);

    // Listado: se recarga al cambiar página o filtros
    useEffect(() => { cargar(); }, [pagina, filtros]);

    async function cargar() {
        try {
            setCargando(true);
            setError('');
            const params = new URLSearchParams({ page: pagina });
            Object.entries(filtros).forEach(([k, v]) => v && params.append(k, v));
            const r = await apiFetch(`${API_URL}?${params}`);
            if (!r.ok) throw new Error(await obtenerMensajeError(r, 'No se pudieron cargar las inscripciones'));
            const datos = await r.json();
            setInscripciones(datos.resultados);
            setTotalPaginas(datos.total_paginas);
            setTotalRegistros(datos.total_registros);
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    }

    function cambiarFiltro(e) {
        setFiltros({ ...filtros, [e.target.name]: e.target.value });
        setPagina(1);
    }

    async function crear(e) {
        e.preventDefault();
        if (!formulario.evento || !formulario.participante) {
            setError('Seleccione un evento y un participante.');
            return;
        }
        await ejecutar(
            () => apiFetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formulario),
            }),
            'No se pudo registrar la inscripción',
            'Inscripción registrada.',
        );
        setFormulario({ evento: '', participante: '' });
    }

    async function cambiarEstado(inscripcion) {
        const nuevo = inscripcion.estado === 'ACTIVA' ? 'CANCELADA' : 'ACTIVA';
        await ejecutar(
            () => apiFetch(`${API_URL}${inscripcion.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevo }),
            }),
            'No se pudo cambiar el estado',
            nuevo === 'ACTIVA' ? 'Inscripción reactivada.' : 'Inscripción cancelada.',
        );
    }

    async function eliminar(id) {
        if (!window.confirm('¿Desea eliminar esta inscripción?')) return;
        await ejecutar(
            () => apiFetch(`${API_URL}${id}/`, { method: 'DELETE' }),
            'No se pudo eliminar',
            'Inscripción eliminada.',
        );
    }

    /** Ejecuta una operación, muestra el resultado y recarga la lista. */
    async function ejecutar(operacion, mensajeError, mensajeExito) {
        try {
            setProcesando(true);
            setError('');
            setMensaje('');
            const r = await operacion();
            if (!r.ok) throw new Error(await obtenerMensajeError(r, mensajeError));
            setMensaje(mensajeExito);
            await cargar();
        } catch (err) {
            setError(err.message);
        } finally {
            setProcesando(false);
        }
    }

    return (
        <div>
            <h2 className="h4 fw-bold mb-3">Inscripciones</h2>

            {error && <div className="alert alert-danger py-2">{error}</div>}
            {mensaje && <div className="alert alert-success py-2">{mensaje}</div>}

            {/* Nueva inscripción */}
            <form onSubmit={crear} className="card card-body mb-3">
                <h3 className="h6 fw-semibold">Nueva inscripción</h3>
                <div className="row g-2">
                    <div className="col-md-5">
                        <label className="form-label small" htmlFor="nuevo-evento">Evento *</label>
                        <select id="nuevo-evento" className="form-select" required value={formulario.evento}
                                onChange={(e) => setFormulario({ ...formulario, evento: e.target.value })}>
                            <option value="">Seleccione…</option>
                            {eventos.map((ev) => (
                                <option key={ev.id} value={ev.id}>{ev.nombre} ({ev.estado})</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-5">
                        <label className="form-label small" htmlFor="nuevo-participante">Participante *</label>
                        <select id="nuevo-participante" className="form-select" required value={formulario.participante}
                                onChange={(e) => setFormulario({ ...formulario, participante: e.target.value })}>
                            <option value="">Seleccione…</option>
                            {participantes.map((p) => (
                                <option key={p.id} value={p.id}>{p.nombre} — {p.cedula}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-2 d-flex align-items-end">
                        <button className="btn btn-primary w-100" disabled={procesando}>Inscribir</button>
                    </div>
                </div>
            </form>

            {/* Filtros combinables (se envían al backend) */}
            <div className="card card-body mb-3">
                <div className="row g-2">
                    <div className="col-md-3">
                        <label className="form-label small" htmlFor="f-estado">Estado</label>
                        <select id="f-estado" name="estado" className="form-select form-select-sm"
                                value={filtros.estado} onChange={cambiarFiltro}>
                            <option value="">Todos</option>
                            <option value="ACTIVA">Activa</option>
                            <option value="CANCELADA">Cancelada</option>
                        </select>
                    </div>
                    <div className="col-md-4">
                        <label className="form-label small" htmlFor="f-evento">Evento</label>
                        <select id="f-evento" name="evento" className="form-select form-select-sm"
                                value={filtros.evento} onChange={cambiarFiltro}>
                            <option value="">Todos</option>
                            {eventos.map((ev) => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
                        </select>
                    </div>
                    <div className="col-md-5">
                        <label className="form-label small" htmlFor="f-participante">Participante</label>
                        <select id="f-participante" name="participante" className="form-select form-select-sm"
                                value={filtros.participante} onChange={cambiarFiltro}>
                            <option value="">Todos</option>
                            {participantes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Listado */}
            {cargando ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" role="status" /></div>
            ) : inscripciones.length === 0 ? (
                <div className="alert alert-light border text-center">No hay inscripciones con esos filtros.</div>
            ) : (
                <div className="table-responsive">
                    <table className="table table-hover align-middle bg-white">
                        <thead className="table-light">
                            <tr>
                                <th>Participante</th>
                                <th>Evento</th>
                                <th>Fecha</th>
                                <th>Estado</th>
                                <th className="text-end">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inscripciones.map((i) => (
                                <tr key={i.id}>
                                    <td>{i.participante_nombre}</td>
                                    <td>{i.evento_nombre}</td>
                                    <td>{formatearFecha(i.fecha)}</td>
                                    <td><span className={`badge ${BADGE[i.estado]}`}>{i.estado}</span></td>
                                    <td className="text-end">
                                        <div className="btn-group btn-group-sm">
                                            <button className="btn btn-outline-warning" disabled={procesando}
                                                    onClick={() => cambiarEstado(i)}>
                                                {i.estado === 'ACTIVA' ? 'Cancelar' : 'Reactivar'}
                                            </button>
                                            <button className="btn btn-outline-danger" disabled={procesando}
                                                    onClick={() => eliminar(i.id)}>
                                                Eliminar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Paginacion pagina={pagina} totalPaginas={totalPaginas}
                        totalRegistros={totalRegistros} onCambiar={setPagina} />
        </div>
    );
}
