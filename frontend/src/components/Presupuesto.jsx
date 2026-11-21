import { useEffect, useState } from 'react';
import { API_BASE, encabezadosAuth, obtenerMensajeError } from '../utils/api';

const PROVEEDORES_URL = `${API_BASE}/proveedores/`;
const CONTRATACIONES_URL = `${API_BASE}/presupuesto/`;

/**
 * Panel de presupuesto y contrataciones de proveedores de un evento.
 */
export default function Presupuesto({ evento, token, onCerrar, onActualizado }) {
    const [datos, setDatos] = useState(null);
    const [proveedores, setProveedores] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    // Formulario de nueva contratación
    const [proveedorSeleccionado, setProveedorSeleccionado] = useState('');
    const [montoContrato, setMontoContrato] = useState('');

    useEffect(() => {
        cargarDatos();
    }, []);

    async function cargarDatos() {
        try {
            setCargando(true);
            setError('');
            const [presupuestoRes, listaProveedores] = await Promise.all([
                obtenerPresupuesto(),
                obtenerTodosProveedores(),
            ]);
            setDatos(presupuestoRes);
            setProveedores(listaProveedores);
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    }

    async function obtenerPresupuesto() {
        const r = await fetch(`${API_BASE}/eventos/${evento.id}/presupuesto/`, {
            headers: { Authorization: `Token ${token}` },
        });
        if (!r.ok) throw new Error(`Error al consultar presupuesto: ${r.status}`);
        return r.json();
    }

    async function obtenerTodosProveedores() {
        let pag = 1, total = 1, todos = [];
        do {
            const r = await fetch(`${PROVEEDORES_URL}?page=${pag}`, {
                headers: { Authorization: `Token ${token}` },
            });
            if (!r.ok) throw new Error('No se pudieron cargar los proveedores');
            const res = await r.json();
            todos = [...todos, ...(res.resultados ?? res)];
            total = res.total_paginas ?? 1;
            pag++;
        } while (pag <= total);
        return todos;
    }

    async function asignarProveedor(e) {
        e.preventDefault();
        setMensaje('');
        setError('');

        if (!proveedorSeleccionado) {
            setError('Debe seleccionar un proveedor');
            return;
        }
        if (!montoContrato || Number(montoContrato) <= 0) {
            setError('Indique un monto mayor a 0');
            return;
        }

        try {
            setProcesando(true);
            const r = await fetch(CONTRATACIONES_URL, {
                method: 'POST',
                headers: encabezadosAuth(token),
                body: JSON.stringify({
                    evento: evento.id,
                    proveedor: Number(proveedorSeleccionado),
                    monto: Number(montoContrato),
                }),
            });

            if (!r.ok) {
                throw new Error(await obtenerMensajeError(r, 'No se pudo contratar el proveedor'));
            }

            setMensaje('Proveedor asignado y contratado correctamente');
            setProveedorSeleccionado('');
            setMontoContrato('');
            
            // Recargar datos actualizados
            const nuevoPresupuesto = await obtenerPresupuesto();
            setDatos(nuevoPresupuesto);
            if (onActualizado) onActualizado();
        } catch (err) {
            setError(err.message);
        } finally {
            setProcesando(false);
        }
    }

    async function eliminarContratacion(id) {
        if (!window.confirm('¿Desea rescindir la contratación de este proveedor?')) return;
        try {
            setProcesando(true);
            setError('');
            setMensaje('');
            const r = await fetch(`${CONTRATACIONES_URL}${id}/`, {
                method: 'DELETE',
                headers: { Authorization: `Token ${token}` },
            });
            if (!r.ok) throw new Error(await obtenerMensajeError(r, 'Error al eliminar contratación'));
            
            setMensaje('Contratación eliminada correctamente');
            const nuevoPresupuesto = await obtenerPresupuesto();
            setDatos(nuevoPresupuesto);
            if (onActualizado) onActualizado();
        } catch (err) {
            setError(err.message);
        } finally {
            setProcesando(false);
        }
    }

    const fmt = (v) =>
        Number(v).toLocaleString('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });

    const contratadosIds = (datos?.contrataciones ?? []).map((c) => c.proveedor);
    const proveedoresDisponibles = proveedores.filter((p) => !contratadosIds.includes(p.id));
    const eventoActivo = evento.estado === 'ABIERTO' || evento.estado === 'EN_CURSO';

    return (
        <div
            className="card shadow mb-4"
            style={{ borderRadius: 12, border: '2px solid #d97706' }}
        >
            <div
                className="card-header d-flex justify-content-between align-items-center"
                style={{ background: '#fef9c3', borderRadius: '10px 10px 0 0' }}
            >
                <strong style={{ color: '#a16207' }}>Presupuesto y Proveedores — {evento.nombre}</strong>
                <button type="button" className="btn-close" onClick={onCerrar} />
            </div>

            <div className="card-body">
                {mensaje && <div className="alert alert-success py-2 mb-3">{mensaje}</div>}
                {error   && <div className="alert alert-danger py-2 mb-3">{error}</div>}

                {cargando ? (
                    <div className="text-center py-3">
                        <div className="spinner-border" style={{ color: '#d97706' }} />
                    </div>
                ) : datos && (
                    <>
                        {/* Resumen financiero */}
                        <div className="row g-3 mb-4">
                            {[
                                { label: 'Presupuesto asignado', value: datos.presupuesto, bg: '#dbeafe', color: '#1d4ed8' },
                                { label: 'Gasto en proveedores',  value: datos.gasto_total,  bg: '#fee2e2', color: '#dc2626' },
                                { label: 'Saldo disponible', value: datos.saldo_disponible,
                                  bg: datos.presupuesto_agotado ? '#fee2e2' : '#dcfce7',
                                  color: datos.presupuesto_agotado ? '#dc2626' : '#16a34a' },
                            ].map(({ label, value, bg, color }) => (
                                <div className="col-sm-4" key={label}>
                                    <div style={{ background: bg, borderRadius: 10, padding: '12px 16px' }}>
                                        <div style={{ fontSize: '.8rem', color, fontWeight: 600 }}>{label}</div>
                                        <div style={{ fontSize: '1.2rem', color, fontWeight: 700 }}>{fmt(value)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Formulario para asignar proveedor */}
                        {eventoActivo ? (
                            <div className="card card-body bg-light mb-4" style={{ borderRadius: 10 }}>
                                <h6 className="fw-bold mb-3 text-dark">Asignar / Contratar proveedor</h6>
                                <form onSubmit={asignarProveedor} className="row g-2 align-items-end">
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-secondary" style={{ fontSize: '.8rem' }}>
                                            PROVEEDOR
                                        </label>
                                        <select
                                            className="form-select"
                                            value={proveedorSeleccionado}
                                            onChange={(e) => setProveedorSeleccionado(e.target.value)}
                                            disabled={procesando || proveedoresDisponibles.length === 0}
                                        >
                                            <option value="">
                                                {proveedoresDisponibles.length === 0
                                                    ? 'No hay más proveedores disponibles'
                                                    : 'Seleccione un proveedor...'}
                                            </option>
                                            {proveedoresDisponibles.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.nombre} — {p.servicio}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-semibold text-secondary" style={{ fontSize: '.8rem' }}>
                                            MONTO (CRC)
                                        </label>
                                        <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            className="form-control"
                                            placeholder="Ej. 150000"
                                            value={montoContrato}
                                            onChange={(e) => setMontoContrato(e.target.value)}
                                            disabled={procesando}
                                        />
                                    </div>
                                    <div className="col-md-2">
                                        <button
                                            type="submit"
                                            className="btn w-100 fw-semibold"
                                            style={{ background: '#d97706', color: 'white', borderRadius: 8 }}
                                            disabled={procesando || proveedoresDisponibles.length === 0}
                                        >
                                            {procesando ? 'Guardando...' : 'Asignar'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="alert alert-warning py-2 mb-3">
                                Este evento está en estado <strong>{evento.estado}</strong> y no admite nuevas contrataciones.
                            </div>
                        )}

                        {/* Listado de proveedores contratados */}
                        <h6 className="fw-semibold mb-2">Proveedores contratados en este evento</h6>
                        {datos.contrataciones.length === 0 ? (
                            <p className="text-muted">Aún no se han asignado proveedores a este evento.</p>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-sm table-hover align-middle mb-0">
                                    <thead style={{ background: '#f8fafc' }}>
                                        <tr>
                                            <th>#</th>
                                            <th>Proveedor</th>
                                            <th className="text-end">Monto acordado</th>
                                            <th className="text-end">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {datos.contrataciones.map((c, i) => (
                                            <tr key={c.id}>
                                                <td>{i + 1}</td>
                                                <td className="fw-semibold">{c.proveedor_nombre}</td>
                                                <td className="text-end fw-semibold text-primary">{fmt(c.monto)}</td>
                                                <td className="text-end">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-danger"
                                                        style={{ borderRadius: 6, fontSize: '.75rem' }}
                                                        disabled={procesando}
                                                        onClick={() => eliminarContratacion(c.id)}
                                                    >
                                                        Quitar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
