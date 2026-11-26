import { formatearFecha } from '../utils/api';

const BADGE_ESTADO = {
    ABIERTO:    { bg: '#dcfce7', color: '#16a34a' },
    EN_CURSO:   { bg: '#dbeafe', color: '#1d4ed8' },
    FINALIZADO: { bg: '#f1f5f9', color: '#475569' },
    CANCELADO:  { bg: '#fee2e2', color: '#dc2626' },
};

export default function EventoCard({
    evento,
    seleccionado,
    onEditar,
    onEliminar,
    onVerInscripciones,
    onVerPresupuesto,
    deshabilitado,
}) {
    const badge = BADGE_ESTADO[evento.estado] ?? { bg: '#f8fafc', color: '#64748b' };

    return (
        <div className="col-md-6">
            <div
                className={`card h-100 shadow-sm ${seleccionado ? 'border-accent' : ''}`}
                style={{ borderRadius: 12, transition: 'box-shadow .2s' }}
            >
                <div className="card-body d-flex flex-column">
                    {/* Cabecera */}
                    <div className="d-flex justify-content-between align-items-start mb-2">
                        <h3 className="h6 fw-bold mb-0 text-dark">{evento.nombre}</h3>
                        <span
                            style={{
                                background: badge.bg,
                                color: badge.color,
                                borderRadius: 20,
                                padding: '2px 10px',
                                fontSize: '.75rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {evento.estado}
                        </span>
                    </div>

                    {/* Detalles */}
                    <div style={{ fontSize: '.875rem', color: '#475569' }} className="flex-grow-1">
                        <p className="mb-1"><strong>Lugar:</strong> {evento.lugar}</p>
                        <p className="mb-1"><strong>Fecha:</strong> {formatearFecha(evento.fecha)}</p>
                        <p className="mb-1">
                            <strong>Inscritos:</strong>{' '}
                            {evento.inscritos_activos ?? 0} / {evento.cupo}
                        </p>
                        <p className="mb-2">
                            <strong>Presupuesto:</strong>{' '}
                            {Number(evento.presupuesto).toLocaleString('es-CR', {
                                style: 'currency', currency: 'CRC', maximumFractionDigits: 0,
                            })}
                        </p>
                    </div>

                    {/* Acciones */}
                    <div className="d-flex flex-wrap gap-2 mt-2">
                        <button
                            className="btn btn-sm fw-semibold"
                            style={{ background: '#e0e7ff', color: '#4f46e5', borderRadius: 8 }}
                            disabled={deshabilitado}
                            onClick={() => onVerInscripciones(evento)}
                        >
                            Inscripciones
                        </button>
                        <button
                            className="btn btn-sm fw-semibold"
                            style={{ background: '#fef9c3', color: '#a16207', borderRadius: 8 }}
                            disabled={deshabilitado}
                            onClick={() => onVerPresupuesto(evento)}
                        >
                            Presupuesto
                        </button>
                        <button
                            className="btn btn-sm fw-semibold"
                            style={{ background: '#fff7ed', color: '#c2410c', borderRadius: 8 }}
                            disabled={deshabilitado}
                            onClick={() => onEditar(evento)}
                        >
                            Editar
                        </button>
                        <button
                            className="btn btn-sm fw-semibold"
                            style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8 }}
                            disabled={deshabilitado}
                            onClick={() => onEliminar(evento.id)}
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
