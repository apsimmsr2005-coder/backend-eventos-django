import { useEffect, useState } from 'react';
import { API_BASE, apiFetch, encabezadosAuth, obtenerMensajeError, formatearFecha } from '../utils/api';

const PARTICIPANTES_URL = `${API_BASE}/participantes/`;

const BADGE_INSCRIPCION = {
    ACTIVA:    { bg: '#dcfce7', color: '#16a34a' },
    CANCELADA: { bg: '#f1f5f9', color: '#475569' },
};

/**
 * Panel de inscripciones de un evento.
 * GET  /api/eventos/<id>/inscripciones/
 * POST /api/inscripciones/   { evento: id, participante: id }
 */
export default function Inscripciones({ evento, token, onCerrar }) {
    const [inscripciones, setInscripciones] = useState([]);
    const [participantes, setParticipantes] = useState([]);
    const [seleccionado, setSeleccionado] = useState('');
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    const urlInscripciones = `${API_BASE}/eventos/${evento.id}/inscripciones/`;

    useEffect(() => { cargarDatos(); }, []);

    async function cargarDatos() {
        try {
            setCargando(true);
            setError('');
            const [listaI, listaP] = await Promise.all([
                obtenerInscripciones(1),
                obtenerTodosParticipantes(),
            ]);
            setInscripciones(listaI.resultados ?? listaI);
            setTotalPaginas(listaI.total_paginas ?? 1);
            setParticipantes(listaP);
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    }

    async function obtenerInscripciones(pag = 1) {
        const r = await apiFetch(`${urlInscripciones}?page=${pag}`, {
            headers: { Authorization: `Token ${token}` },
        });
        if (!r.ok) throw new Error(await obtenerMensajeError(r, 'No se pudieron cargar las inscripciones'));
        return r.json();
    }

    async function obtenerTodosParticipantes() {
        let pag = 1, total = 1, todos = [];
        do {
            const r = await apiFetch(`${PARTICIPANTES_URL}?page=${pag}`, {
                headers: { Authorization: `Token ${token}` },
            });
            if (!r.ok) throw new Error(await obtenerMensajeError(r, 'No se pudieron cargar los participantes'));
            const datos = await r.json();
            todos = [...todos, ...(datos.resultados ?? datos)];
            total = datos.total_paginas ?? 1;
            pag++;
        } while (pag <= total);
        return todos;
    }

    async function cargarPagina(pag) {
        try {
            setCargando(true);
            const datos = await obtenerInscripciones(pag);
            setInscripciones(datos.resultados ?? datos);
            setTotalPaginas(datos.total_paginas ?? 1);
            setPagina(pag);
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    }

    function nombreParticipante(id) {
        const p = participantes.find((p) => p.id === id);
        return p ? `${p.nombre}` : `ID ${id}`;
    }

    async function inscribir(e) {
        e.preventDefault();
        setMensaje(''); setError('');
        if (!seleccionado) { setError('Seleccione un participante'); return; }
        try {
            setProcesando(true);
            const r = await apiFetch(`${API_BASE}/inscripciones/`, {
                method: 'POST',
                headers: encabezadosAuth(token),
                body: JSON.stringify({ evento: evento.id, participante: Number(seleccionado) }),
            });
            if (!r.ok) throw new Error(await obtenerMensajeError(r, 'No se pudo registrar'));
            const nueva = await r.json();
            setInscripciones((prev) => [...prev, nueva]);
            setSeleccionado('');
            setMensaje(`${nombreParticipante(nueva.participante)} inscrito correctamente`);
        } catch (err) {
            setError(err.message);
        } finally {
            setProcesando(false);
        }
    }

    const idsInscritos = inscripciones.map((i) => i.participante);
    const disponibles = participantes.filter((p) => !idsInscritos.includes(p.id));
    const abierto = evento.estado === 'ABIERTO';

    return (
        <div
            className="card shadow mb-4"
            style={{ borderRadius: 12, border: '2px solid #6366f1' }}
        >
            <div
                className="card-header d-flex justify-content-between align-items-center"
                style={{ background: '#ede9fe', borderRadius: '10px 10px 0 0' }}
            >
                <strong style={{ color: '#4f46e5' }}>Inscripciones — {evento.nombre}</strong>
                <button type="button" className="btn-close" onClick={onCerrar} />
            </div>

            <div className="card-body">
                {mensaje && <div className="alert alert-success py-2 mb-3">{mensaje}</div>}
                {error   && <div className="alert alert-danger py-2 mb-3">{error}</div>}

                {cargando ? (
                    <div className="text-center py-3">
                        <div className="spinner-border" style={{ color: '#6366f1' }} />
                    </div>
                ) : (
                    <>
                        {/* Formulario nueva inscripción */}
                        {abierto ? (
                            <form onSubmit={inscribir} className="d-flex gap-2 mb-3">
                                <select
                                    className="form-select"
                                    value={seleccionado}
                                    onChange={(e) => setSeleccionado(e.target.value)}
                                    disabled={procesando || disponibles.length === 0}
                                >
                                    <option value="">
                                        {disponibles.length === 0
                                            ? 'No hay participantes disponibles'
                                            : 'Seleccione un participante...'}
                                    </option>
                                    {disponibles.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.nombre} — {p.correo}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    className="btn fw-semibold text-nowrap"
                                    style={{ background: '#6366f1', color: 'white', borderRadius: 8 }}
                                    disabled={procesando}
                                >
                                    {procesando ? 'Procesando...' : 'Inscribir'}
                                </button>
                            </form>
                        ) : (
                            <div className="alert alert-warning py-2 mb-3">
                                El evento está en estado <strong>{evento.estado}</strong>: no admite nuevas inscripciones.
                            </div>
                        )}

                        {/* Tabla */}
                        {inscripciones.length === 0 ? (
                            <p className="text-muted">Este evento no tiene inscripciones.</p>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-sm table-hover align-middle mb-0">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Participante</th>
                                            <th>Fecha</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inscripciones.map((ins, i) => {
                                            const badge = BADGE_INSCRIPCION[ins.estado] ?? { bg: '#f8fafc', color: '#64748b' };
                                            return (
                                                <tr key={ins.id}>
                                                    <td>{i + 1}</td>
                                                    <td>{nombreParticipante(ins.participante)}</td>
                                                    <td>{formatearFecha(ins.fecha)}</td>
                                                    <td>
                                                        <span style={{ background: badge.bg, color: badge.color, borderRadius: 20, padding: '2px 10px', fontSize: '.75rem', fontWeight: 700 }}>
                                                            {ins.estado}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Paginación */}
                        {totalPaginas > 1 && (
                            <div className="d-flex justify-content-center mt-3">
                                <div className="paginacion-pill">
                                    <button className="btn btn-sm btn-outline-secondary" disabled={pagina <= 1} onClick={() => cargarPagina(pagina - 1)}>‹</button>
                                    <span>Página {pagina} de {totalPaginas}</span>
                                    <button className="btn btn-sm btn-outline-secondary" disabled={pagina >= totalPaginas} onClick={() => cargarPagina(pagina + 1)}>›</button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
