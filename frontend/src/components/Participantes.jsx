/** Módulo de Participantes — CRUD completo + paginación */
import { useEffect, useState } from 'react';
import { API_BASE, encabezadosAuth, obtenerMensajeError } from '../utils/api';

const API_URL = `${API_BASE}/participantes/`;

const formularioInicial = { nombre: '', correo: '', cedula: '' };

export default function Participantes({ token }) {
    const [participantes, setParticipantes] = useState([]);
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [formulario, setFormulario] = useState(formularioInicial);
    const [editandoId, setEditandoId] = useState(null);

    useEffect(() => { cargar(pagina); }, [pagina]);

    async function cargar(pag) {
        try {
            setCargando(true); setError('');
            const r = await fetch(`${API_URL}?page=${pag}`, {
                headers: { Authorization: `Token ${token}` },
            });
            if (!r.ok) throw new Error(`Error HTTP: ${r.status}`);
            const datos = await r.json();
            setParticipantes(datos.resultados ?? datos);
            setTotalPaginas(datos.total_paginas ?? 1);
            if (datos.pagina_actual && datos.pagina_actual !== pag) setPagina(datos.pagina_actual);
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    }

    function manejarCambio(e) {
        setFormulario({ ...formulario, [e.target.name]: e.target.value });
    }

    function validar() {
        if (!formulario.nombre.trim()) return 'El nombre es obligatorio';
        if (!formulario.correo.trim()) return 'El correo es obligatorio';
        if (!formulario.cedula.trim()) return 'La cédula es obligatoria';
        return '';
    }

    async function guardar(e) {
        e.preventDefault();
        setMensaje(''); setError('');
        const err = validar();
        if (err) { setError(err); return; }

        try {
            setProcesando(true);
            if (editandoId === null) {
                const r = await fetch(API_URL, {
                    method: 'POST',
                    headers: encabezadosAuth(token),
                    body: JSON.stringify(formulario),
                });
                if (!r.ok) throw new Error(await obtenerMensajeError(r, 'No se pudo crear'));
                await cargar(pagina);
                setMensaje('Participante creado correctamente');
            } else {
                const r = await fetch(`${API_URL}${editandoId}/`, {
                    method: 'PATCH',
                    headers: encabezadosAuth(token),
                    body: JSON.stringify(formulario),
                });
                if (!r.ok) throw new Error(await obtenerMensajeError(r, 'No se pudo actualizar'));
                const actualizado = await r.json();
                setParticipantes((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)));
                setMensaje('Participante actualizado correctamente');
            }
            setFormulario(formularioInicial);
            setEditandoId(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setProcesando(false);
        }
    }

    function iniciarEdicion(p) {
        setEditandoId(p.id);
        setFormulario({ nombre: p.nombre ?? '', correo: p.correo ?? '', cedula: p.cedula ?? '' });
        setMensaje(''); setError('');
    }

    function cancelarEdicion() {
        setEditandoId(null);
        setFormulario(formularioInicial);
        setMensaje(''); setError('');
    }

    async function eliminar(id) {
        if (!window.confirm('¿Desea eliminar este participante?')) return;
        try {
            setProcesando(true); setError(''); setMensaje('');
            const r = await fetch(`${API_URL}${id}/`, {
                method: 'DELETE',
                headers: { Authorization: `Token ${token}` },
            });
            if (!r.ok) throw new Error(await obtenerMensajeError(r, 'Error al eliminar'));
            if (editandoId === id) cancelarEdicion();
            setMensaje('Participante eliminado correctamente');
            await cargar(pagina);
        } catch (err) {
            setError(err.message);
        } finally {
            setProcesando(false);
        }
    }

    return (
        <section>
            <h2 className="fw-bold mb-3" style={{ color: '#1e293b' }}>Participantes</h2>

            {mensaje && <div className="alert alert-success py-2">{mensaje}</div>}
            {error   && <div className="alert alert-danger py-2">{error}</div>}

            <div className="row g-4">
                {/* Formulario */}
                <div className="col-lg-4">
                    <form onSubmit={guardar} className="card card-body shadow-sm" style={{ borderRadius: 12 }}>
                        <h3 className="h6 fw-bold mb-3">
                            {editandoId ? 'Editar participante' : 'Nuevo participante'}
                        </h3>

                        {[
                            { label: 'Nombre', name: 'nombre', type: 'text', placeholder: 'Juan Pérez' },
                            { label: 'Correo', name: 'correo', type: 'email', placeholder: 'correo@ejemplo.com' },
                            { label: 'Cédula', name: 'cedula', type: 'text', placeholder: '1-0001-0001' },
                        ].map(({ label, name, type, placeholder }) => (
                            <div className="mb-3" key={name}>
                                <label className="form-label fw-semibold text-secondary" style={{ fontSize: '.8rem' }}>
                                    {label.toUpperCase()}
                                </label>
                                <input
                                    className="form-control"
                                    type={type}
                                    name={name}
                                    value={formulario[name]}
                                    onChange={manejarCambio}
                                    placeholder={placeholder}
                                />
                            </div>
                        ))}

                        <div className="d-flex gap-2 mt-1">
                            <button
                                className="btn fw-semibold flex-grow-1"
                                style={{ background: '#6366f1', color: 'white', borderRadius: 8 }}
                                disabled={procesando}
                            >
                                {procesando ? 'Procesando...' : editandoId ? 'Actualizar' : 'Guardar'}
                            </button>
                            {editandoId && (
                                <button type="button" className="btn btn-outline-secondary" style={{ borderRadius: 8 }} onClick={cancelarEdicion}>
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Listado */}
                <div className="col-lg-8">
                    {cargando ? (
                        <div className="d-flex justify-content-center py-5">
                            <div className="spinner-border" style={{ color: '#6366f1' }} />
                        </div>
                    ) : participantes.length === 0 ? (
                        <div className="alert alert-secondary">No hay participantes registrados.</div>
                    ) : (
                        <div className="card shadow-sm" style={{ borderRadius: 12 }}>
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead style={{ background: '#f8fafc' }}>
                                        <tr>
                                            <th>Nombre</th>
                                            <th>Correo</th>
                                            <th>Cédula</th>
                                            <th className="text-end">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {participantes.map((p) => (
                                            <tr key={p.id}>
                                                <td className="fw-semibold">{p.nombre}</td>
                                                <td className="text-muted">{p.correo}</td>
                                                <td>{p.cedula}</td>
                                                <td className="text-end">
                                                    <div className="d-flex gap-2 justify-content-end">
                                                        <button
                                                            className="btn btn-sm btn-outline-secondary fw-semibold"
                                                            style={{ borderRadius: 8 }}
                                                            disabled={procesando}
                                                            onClick={() => iniciarEdicion(p)}
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            className="btn btn-sm fw-semibold"
                                                            style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8 }}
                                                            disabled={procesando}
                                                            onClick={() => eliminar(p.id)}
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {totalPaginas > 1 && (
                        <div className="d-flex justify-content-center mt-3">
                            <div className="paginacion-pill">
                                <button className="btn btn-sm btn-outline-secondary" disabled={pagina <= 1 || cargando} onClick={() => setPagina(pagina - 1)}>‹ Anterior</button>
                                <span>Página {pagina} de {totalPaginas}</span>
                                <button className="btn btn-sm btn-outline-secondary" disabled={pagina >= totalPaginas || cargando} onClick={() => setPagina(pagina + 1)}>Siguiente ›</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
