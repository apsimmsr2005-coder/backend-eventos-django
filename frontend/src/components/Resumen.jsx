import { useEffect, useState } from 'react';
import { API_BASE, apiFetch, obtenerMensajeError } from '../utils/api';

/**
 * Resumen — dashboard con estadísticas generales del sistema.
 */
export default function Resumen({ token }) {
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        cargarResumen();
    }, []);

    async function cargarResumen() {
        try {
            setCargando(true);
            setError('');
            const respuesta = await apiFetch(`${API_BASE}/reportes/resumen/`, {
                headers: { Authorization: `Token ${token}` },
            });
            if (!respuesta.ok) throw new Error(await obtenerMensajeError(respuesta, 'No se pudo cargar el resumen'));
            setDatos(await respuesta.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    }

    const COLORES_ESTADO = {
        ABIERTO:    { bg: '#dcfce7', color: '#16a34a' },
        EN_CURSO:   { bg: '#dbeafe', color: '#1d4ed8' },
        FINALIZADO: { bg: '#f1f5f9', color: '#475569' },
        CANCELADO:  { bg: '#fee2e2', color: '#dc2626' },
    };

    if (cargando) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
                <div className="spinner-border" style={{ color: '#6366f1' }} role="status" />
            </div>
        );
    }

    if (error) {
        return <div className="alert alert-danger mt-3">{error}</div>;
    }

    return (
        <div>
            <h2 className="fw-bold mb-4" style={{ color: '#1e293b' }}>Panel de control</h2>

            {/* Tarjetas de estadísticas */}
            <div className="row g-3 mb-4">
                <div className="col-sm-6 col-lg-3">
                    <div className="stat-card">
                        <div>
                            <div className="stat-value">{datos?.participantes ?? 0}</div>
                            <div className="stat-label">Participantes registrados</div>
                        </div>
                    </div>
                </div>
                <div className="col-sm-6 col-lg-3">
                    <div className="stat-card">
                        <div>
                            <div className="stat-value">{datos?.proveedores ?? 0}</div>
                            <div className="stat-label">Proveedores activos</div>
                        </div>
                    </div>
                </div>
                <div className="col-sm-6 col-lg-3">
                    <div className="stat-card">
                        <div>
                            <div className="stat-value">
                                {Number(datos?.presupuesto_total ?? 0).toLocaleString('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 })}
                            </div>
                            <div className="stat-label">Presupuesto total</div>
                        </div>
                    </div>
                </div>
                <div className="col-sm-6 col-lg-3">
                    <div className="stat-card">
                        <div>
                            <div className="stat-value">
                                {Number(datos?.gasto_total ?? 0).toLocaleString('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 })}
                            </div>
                            <div className="stat-label">Gasto total</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-3">
                {/* Eventos por estado */}
                <div className="col-lg-5">
                    <div className="card shadow-sm h-100" style={{ borderRadius: 12 }}>
                        <div className="card-body">
                            <h5 className="fw-semibold mb-3">Eventos por estado</h5>
                            {(datos?.eventos_por_estado ?? []).length === 0 ? (
                                <p className="text-muted">No hay eventos registrados.</p>
                            ) : (
                                <div className="d-flex flex-column gap-2">
                                    {(datos.eventos_por_estado ?? []).map(({ estado, total }) => {
                                        const info = COLORES_ESTADO[estado] ?? { bg: '#f8fafc', color: '#64748b' };
                                        return (
                                            <div
                                                key={estado}
                                                className="d-flex justify-content-between align-items-center px-3 py-2"
                                                style={{ background: info.bg, borderRadius: 8 }}
                                            >
                                                <span style={{ color: info.color, fontWeight: 600 }}>
                                                    {estado}
                                                </span>
                                                <span
                                                    className="fw-bold"
                                                    style={{
                                                        background: info.color,
                                                        color: 'white',
                                                        borderRadius: 20,
                                                        padding: '2px 12px',
                                                        fontSize: '.85rem',
                                                    }}
                                                >
                                                    {total}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Eventos con cupo disponible */}
                <div className="col-lg-7">
                    <div className="card shadow-sm h-100" style={{ borderRadius: 12 }}>
                        <div className="card-body">
                            <h5 className="fw-semibold mb-3">Eventos abiertos con cupo disponible</h5>
                            {(datos?.eventos_con_cupo ?? []).length === 0 ? (
                                <p className="text-muted">No hay eventos abiertos con cupo disponible.</p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-sm table-hover align-middle mb-0">
                                        <thead>
                                            <tr>
                                                <th>Evento</th>
                                                <th className="text-center">Inscritos</th>
                                                <th className="text-center">Cupo</th>
                                                <th className="text-center">Disponible</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(datos.eventos_con_cupo ?? []).map((ev) => (
                                                <tr key={ev.id}>
                                                    <td className="fw-semibold">{ev.nombre}</td>
                                                    <td className="text-center">{ev._inscritos_activos}</td>
                                                    <td className="text-center">{ev.cupo}</td>
                                                    <td className="text-center">
                                                        <span
                                                            style={{
                                                                background: '#dcfce7',
                                                                color: '#16a34a',
                                                                borderRadius: 20,
                                                                padding: '2px 10px',
                                                                fontSize: '.8rem',
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {ev.cupo - ev._inscritos_activos}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Evento con mayor participación */}
                            {datos?.evento_mayor_participacion && (
                                <div
                                    className="mt-3 p-3"
                                    style={{ background: '#ede9fe', borderRadius: 10 }}
                                >
                                    <strong style={{ color: '#6d28d9' }}>Mayor participación:</strong>{' '}
                                    <span>
                                        {datos.evento_mayor_participacion.nombre} —{' '}
                                        <strong>{datos.evento_mayor_participacion.inscritos}</strong> inscritos
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
