/** Módulo de Proveedores — CRUD completo */
import { useEffect, useState } from 'react';
import { API_BASE, encabezadosAuth, obtenerMensajeError } from '../utils/api';

const API_URL = `${API_BASE}/proveedores/`;

const formularioInicial = { nombre: '', servicio: '', contacto: '' };

export default function Proveedores({ token }) {
    const [proveedores, setProveedores] = useState([]);
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
            setProveedores(datos.resultados ?? datos);
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
        if (!formulario.servicio.trim()) return 'El servicio es obligatorio';
        if (!formulario.contacto.trim()) return 'El contacto es obligatorio';
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
                setMensaje('Proveedor creado correctamente');
            } else {
                const r = await fetch(`${API_URL}${editandoId}/`, {
                    method: 'PATCH',
                    headers: encabezadosAuth(token),
                    body: JSON.stringify(formulario),
                });
                if (!r.ok) throw new Error(await obtenerMensajeError(r, 'No se pudo actualizar'));
                const actualizado = await r.json();
                setProveedores((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)));
                setMensaje('Proveedor actualizado correctamente');
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
        setFormulario({ nombre: p.nombre ?? '', servicio: p.servicio ?? '', contacto: p.contacto ?? '' });
        setMensaje(''); setError('');
    }

    function cancelarEdicion() {
        setEditandoId(null);
        setFormulario(formularioInicial);
        setMensaje(''); setError('');
    }

    async function eliminar(id) {
        if (!window.confirm('¿Desea eliminar este proveedor?')) return;
        try {
            setProcesando(true); setError(''); setMensaje('');
            const r = await fetch(`${API_URL}${id}/`, {
                method: 'DELETE',
                headers: { Authorization: `Token ${token}` },
            });
            if (!r.ok) throw new Error(await obtenerMensajeError(r, 'Error al eliminar'));
            if (editandoId === id) cancelarEdicion();
            setMensaje('Proveedor eliminado correctamente');
            await cargar(pagina);
        } catch (err) {
            setError(err.message);
        } finally {
            setProcesando(false);
        }
    }

    return (
        <section>
            <h2 className="fw-bold mb-3" style={{ color: '#1e293b' }}>Proveedores</h2>

            {mensaje && <div className="alert alert-success py-2">{mensaje}</div>}
            {error   && <div className="alert alert-danger py-2">{error}</div>}

            <div className="row g-4">
                {/* Formulario */}
                <div className="col-lg-4">
                    <form onSubmit={guardar} className="card card-body shadow-sm" style={{ borderRadius: 12 }}>
                        <h3 className="h6 fw-bold mb-3">
                            {editandoId ? 'Editar proveedor' : 'Nuevo proveedor'}
                        </h3>

                        {[
                            { label: 'Nombre',   name: 'nombre',   placeholder: 'Empresa S.A.' },
                            { label: 'Servicio', name: 'servicio', placeholder: 'Catering, sonido, etc.' },
                            { label: 'Contacto', name: 'contacto', placeholder: 'Teléfono o correo' },
                        ].map(({ label, name, placeholder }) => (
                            <div className="mb-3" key={name}>
                                <label className="form-label fw-semibold text-secondary" style={{ fontSize: '.8rem' }}>
                                    {label.toUpperCase()}
                                </label>
                                <input
                                    className="form-control"
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
                    ) : proveedores.length === 0 ? (
                        <div className="alert alert-secondary">No hay proveedores registrados.</div>
                    ) : (
                        <div className="row g-3">
                            {proveedores.map((p) => (
                                <div className="col-md-6" key={p.id}>
                                    <div className="card h-100 shadow-sm" style={{ borderRadius: 12 }}>
                                        <div className="card-body">
                                            <div className="d-flex align-items-start gap-2 mb-2">
                                                <div>
                                                    <h3 className="h6 fw-bold mb-0">{p.nombre}</h3>
                                                    <span
                                                        style={{
                                                            background: '#ede9fe',
                                                            color: '#6d28d9',
                                                            borderRadius: 20,
                                                            padding: '1px 8px',
                                                            fontSize: '.75rem',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {p.servicio}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-muted mb-3" style={{ fontSize: '.875rem' }}>
                                                Contacto: {p.contacto}
                                            </p>
                                            <div className="d-flex gap-2">
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
                                        </div>
                                    </div>
                                </div>
                            ))}
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
