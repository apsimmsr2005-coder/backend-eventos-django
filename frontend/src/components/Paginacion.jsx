/**
 * Paginacion — botones Anterior / Siguiente reutilizables.
 * Usa los datos de paginación que devuelve Django.
 */
export default function Paginacion({ pagina, totalPaginas, totalRegistros, onCambiar }) {
    if (totalPaginas <= 1) return null;
    return (
        <div className="d-flex justify-content-between align-items-center mt-3">
            <small className="text-muted">
                Página {pagina} de {totalPaginas}
                {totalRegistros != null && ` · ${totalRegistros} registros`}
            </small>
            <div className="btn-group btn-group-sm">
                <button className="btn btn-outline-secondary" disabled={pagina <= 1}
                        onClick={() => onCambiar(pagina - 1)}>
                    Anterior
                </button>
                <button className="btn btn-outline-secondary" disabled={pagina >= totalPaginas}
                        onClick={() => onCambiar(pagina + 1)}>
                    Siguiente
                </button>
            </div>
        </div>
    );
}
