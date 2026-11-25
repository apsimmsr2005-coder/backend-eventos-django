import { useEffect, useState } from 'react';
import Paginacion from '../components/Paginacion';
import { API_BASE, apiFetch, obtenerMensajeError, obtenerTodos } from '../utils/api';

const API_URL = `${API_BASE}/presupuesto/`;
const FORM_INICIAL = { evento: '', proveedor: '', monto: '' };

/**
 * Pantalla del módulo Presupuesto (contrataciones de proveedores por evento).
 * GET    /api/presupuesto/?evento=&proveedor=&page=   (filtros combinables)
 * POST   /api/presupuesto/        { evento, proveedor, monto }
 * PATCH  /api/presupuesto/<id>/   { monto }
 * DELETE /api/presupuesto/<id>/
 */
export default function PresupuestoPagina() {
    const [contrataciones, setContrataciones] = useState([]);
    const [eventos, setEventos] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [filtros, setFiltros] = useState({ evento: '', proveedor: '' });
    const [formulario, setFormulario] = useState(FORM_INICIAL);
    const [editandoId, setEditandoId] = useState(null);
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalRegistros, setTotalRegistros] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    useEffect(() => {
        Promise.all([obtenerTodos(`${API_BASE}/eventos/`), obtenerTodos(`${API_BASE}/proveedores/`)])
            .then(([ev, pr]) => { setEventos(ev); setProveedores(pr); })
            .catch((err) => setError(err.message));
    }, []);

    useEffect(() => { cargar(); }, [pagina, filtros]);

    async function cargar() {
        try {
            setCargando(true);
            setError('');
            const params = new URLSearchParams({ page: pagina });
            Object.entries(filtros).forEach(([k, v]) => v && params.append(k, v));
            const r = await apiFetch(`${API_URL}?${params}`);
            if (!r.ok) throw new Error(await obtenerMensajeError(r, 'No se pudo cargar el presupuesto'));
            const datos = await r.json();
            setContrataciones(datos.resultados);
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

    function editar(c) {
        setEditandoId(c.id);
        setFormulario({ evento: String(c.evento), proveedor: String(c.proveedor), monto: c.monto });
        setMensaje('');
        setError('');
    }

    function cancelarEdicion() {
        setEditandoId(null);
        setFormulario(FORM_INICIAL);
    }

    async function guardar(e) {
        e.preventDefault();
        const monto = Number(formulario.monto);
        if (!formulario.evento || !formulario.proveedor || !(monto > 0)) {
            setError('Seleccione evento y proveedor, e ingrese un monto mayor que 0.');
            return;
        }
        const ok = await ejecutar(
            () => editandoId === null
                ? apiFetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formulario),
                })
                : apiFetch(`${API_URL}${editandoId}/`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ monto: formulario.monto }),
                }),
            editandoId === null ? 'No se pudo contratar el proveedor' : 'No se pudo actualizar el monto',
            editandoId === null ? 'Proveedor contratado.' : 'Monto actualizado.',
        );
        if (ok) cancelarEdicion();
    }

    async function eliminar(id) {
        if (!window.confirm('¿Desea eliminar esta contratación?')) return;
        await ejecutar(
            () => apiFetch(`${API_URL}${id}/`, { method: 'DELETE' }),
            'No se pudo eliminar',
            'Contratación eliminada.',
        );
    }

    async function ejecutar(operacion, mensajeError, mensajeExito) {
        try {
            setProcesando(true);
            setError('');
            setMensaje('');
            const r = await operacion();
            if (!r.ok) throw new Error(await obtenerMensajeError(r, mensajeError));
            setMensaje(mensajeExito);
            await cargar();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setProcesando(false);
        }
    }

    return (
        <div>
            <h2 className="h4 fw-bold mb-3">Presupuesto</h2>

            {error && <div className="alert alert-danger py-2">{error}</div>}
            {mensaje && <div className="alert alert-success py-2">{mensaje}</div>}

            {/* Formulario: crear o editar monto */}
            <form onSubmit={guardar} className="card card-body mb-3">
                <h3 className="h6 fw-semibold">
                    {editandoId === null ? 'Nueva contratación' : 'Editar monto de la contratación'}
                </h3>
                <div className="row g-2">
                    <div className="col-md-4">
                        <label className="form-label small" htmlFor="c-evento">Evento *</label>
                        <select id="c-evento" className="form-select" required disabled={editandoId !== null}
                                value={formulario.evento}
                                onChange={(e) => setFormulario({ ...formulario, evento: e.target.value })}>
                            <option value="">Seleccione…</option>
                            {eventos.map((ev) => (
                                <option key={ev.id} value={ev.id}>
                                    {ev.nombre} (saldo ₡{ev.saldo_disponible})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-4">
                        <label className="form-label small" htmlFor="c-proveedor">Proveedor *</label>
                        <select id="c-proveedor" className="form-select" required disabled={editandoId !== null}
                                value={formulario.proveedor}
                                onChange={(e) => setFormulario({ ...formulario, proveedor: e.target.value })}>
                            <option value="">Seleccione…</option>
                            {proveedores.map((p) => (
                                <option key={p.id} value={p.id}>{p.nombre} — {p.servicio}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label small" htmlFor="c-monto">Monto *</label>
                        <input id="c-monto" type="number" min="0.01" step="0.01" className="form-control" required
                               value={formulario.monto}
                               onChange={(e) => setFormulario({ ...formulario, monto: e.target.value })} />
                    </div>
                    <div className="col-md-2 d-flex align-items-end gap-1">
                        <button className="btn btn-primary w-100" disabled={procesando}>
                            {editandoId === null ? 'Contratar' : 'Guardar'}
                        </button>
                        {editandoId !== null && (
                            <button type="button" className="btn btn-outline-secondary" onClick={cancelarEdicion}>
                                ✕
                            </button>
                        )}
                    </div>
                </div>
                {editandoId !== null && (
                    <small className="text-muted mt-2">
                        Evento y proveedor no se pueden cambiar: elimine y cree otra contratación.
                    </small>
                )}
            </form>

            {/* Filtros combinables */}
            <div className="card card-body mb-3">
                <div className="row g-2">
                    <div className="col-md-6">
                        <label className="form-label small" htmlFor="fp-evento">Evento</label>
                        <select id="fp-evento" name="evento" className="form-select form-select-sm"
                                value={filtros.evento} onChange={cambiarFiltro}>
                            <option value="">Todos</option>
                            {eventos.map((ev) => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
                        </select>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label small" htmlFor="fp-proveedor">Proveedor</label>
                        <select id="fp-proveedor" name="proveedor" className="form-select form-select-sm"
                                value={filtros.proveedor} onChange={cambiarFiltro}>
                            <option value="">Todos</option>
                            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Listado */}
            {cargando ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" role="status" /></div>
            ) : contrataciones.length === 0 ? (
                <div className="alert alert-light border text-center">No hay contrataciones con esos filtros.</div>
            ) : (
                <div className="table-responsive">
                    <table className="table table-hover align-middle bg-white">
                        <thead className="table-light">
                            <tr>
                                <th>Evento</th>
                                <th>Proveedor</th>
                                <th className="text-end">Monto</th>
                                <th className="text-end">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contrataciones.map((c) => (
                                <tr key={c.id}>
                                    <td>{c.evento_nombre}</td>
                                    <td>{c.proveedor_nombre}</td>
                                    <td className="text-end">₡{Number(c.monto).toLocaleString('es-CR')}</td>
                                    <td className="text-end">
                                        <div className="btn-group btn-group-sm">
                                            <button className="btn btn-outline-primary" disabled={procesando}
                                                    onClick={() => editar(c)}>
                                                Editar
                                            </button>
                                            <button className="btn btn-outline-danger" disabled={procesando}
                                                    onClick={() => eliminar(c.id)}>
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
