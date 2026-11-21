/** Módulo de Eventos — CRUD completo + inscripciones + presupuesto */
import { useEffect, useState } from 'react';
import EventoCard from './EventoCard';
import Inscripciones from './Inscripciones';
import Presupuesto from './Presupuesto';
import { API_BASE, encabezadosAuth, obtenerMensajeError, aFechaHoraLocal } from '../utils/api';

const API_URL = `${API_BASE}/eventos/`;

const ESTADOS = ['ABIERTO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO'];

const formularioInicial = {
    nombre: '',
    fecha: '',
    lugar: '',
    cupo: 1,
    estado: 'ABIERTO',
    presupuesto: 0,
};

export default function Eventos({ token }) {
    const [eventos, setEventos] = useState([]);
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [filtroEstado, setFiltroEstado] = useState('');
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [formulario, setFormulario] = useState(formularioInicial);
    const [editandoId, setEditandoId] = useState(null);
    const [panelInscripciones, setPanelInscripciones] = useState(null);
    const [panelPresupuesto, setPanelPresupuesto] = useState(null);

    useEffect(() => { cargar(pagina, filtroEstado); }, [pagina, filtroEstado]);

    async function cargar(pag, estado) {
        try {
            setCargando(true);
            setError('');
            const params = new URLSearchParams({ page: pag });
            if (estado) params.append('estado', estado);
            const r = await fetch(`${API_URL}?${params}`, {
                headers: { Authorization: `Token ${token}` },
            });
            if (!r.ok) throw new Error(`Error HTTP: ${r.status}`);
            const datos = await r.json();
            setEventos(datos.resultados);
            setTotalPaginas(datos.total_paginas);
            if (datos.pagina_actual !== pag) setPagina(datos.pagina_actual);
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    }

    function manejarCambio(e) {
        const { name, value } = e.target;
        setFormulario({ ...formulario, [name]: value });
    }

    function validar() {
        if (!formulario.nombre.trim()) return 'El nombre es obligatorio';
        if (!formulario.fecha) return 'La fecha es obligatoria';
        if (!formulario.lugar.trim()) return 'El lugar es obligatorio';
        if (Number(formulario.cupo) < 1) return 'El cupo debe ser al menos 1';
        if (Number(formulario.presupuesto) < 0) return 'El presupuesto no puede ser negativo';
        return '';
    }

    function datosEnvio() {
        return {
            ...formulario,
            cupo: Number(formulario.cupo),
            presupuesto: Number(formulario.presupuesto),
        };
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
                    body: JSON.stringify(datosEnvio()),
                });
                if (!r.ok) throw new Error(await obtenerMensajeError(r, 'No se pudo crear el evento'));
                setMensaje('Evento creado correctamente');
                await cargar(pagina, filtroEstado);
            } else {
                const r = await fetch(`${API_URL}${editandoId}/`, {
                    method: 'PATCH',
                    headers: encabezadosAuth(token),
                    body: JSON.stringify(datosEnvio()),
                });
                if (!r.ok) throw new Error(await obtenerMensajeError(r, 'No se pudo actualizar'));
                const actualizado = await r.json();
                setEventos((prev) =>
                    filtroEstado && actualizado.estado !== filtroEstado
                        ? prev.filter((ev) => ev.id !== actualizado.id)
                        : prev.map((ev) => (ev.id === actualizado.id ? actualizado : ev))
                );
                if (panelInscripciones?.id === actualizado.id) setPanelInscripciones(actualizado);
                if (panelPresupuesto?.id === actualizado.id) setPanelPresupuesto(actualizado);
                setMensaje('Evento actualizado correctamente');
            }
            setFormulario(formularioInicial);
            setEditandoId(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setProcesando(false);
        }
    }

    function iniciarEdicion(evento) {
        setEditandoId(evento.id);
        setFormulario({
            nombre: evento.nombre ?? '',
            fecha: aFechaHoraLocal(evento.fecha),
            lugar: evento.lugar ?? '',
            cupo: evento.cupo ?? 1,
            estado: evento.estado ?? 'ABIERTO',
            presupuesto: evento.presupuesto ?? 0,
        });
        setMensaje(''); setError('');
    }

    function cancelarEdicion() {
        setEditandoId(null);
        setFormulario(formularioInicial);
        setMensaje(''); setError('');
    }

    async function eliminar(id) {
        if (!window.confirm('¿Desea eliminar este evento?')) return;
        try {
            setProcesando(true); setError(''); setMensaje('');
            const r = await fetch(`${API_URL}${id}/`, {
                method: 'DELETE',
                headers: { Authorization: `Token ${token}` },
            });
            if (!r.ok) throw new Error(await obtenerMensajeError(r, 'Error al eliminar'));
            setMensaje('Evento eliminado correctamente');
            if (editandoId === id) cancelarEdicion();
            if (panelInscripciones?.id === id) setPanelInscripciones(null);
            if (panelPresupuesto?.id === id) setPanelPresupuesto(null);
            await cargar(pagina, filtroEstado);
        } catch (err) {
            setError(err.message);
        } finally {
            setProcesando(false);
        }
    }

    return (
        <section>
            {/* Cabecera */}
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <h2 className="fw-bold mb-0" style={{ color: '#1e293b' }}>Eventos</h2>
                <div className="d-flex align-items-center gap-2">
                    <label className="form-label mb-0 fw-semibold text-secondary" style={{ fontSize: '.85rem' }}>
                        ESTADO:
                    </label>
                    <select
                        className="form-select form-select-sm"
                        value={filtroEstado}
                        onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1); setPanelInscripciones(null); setPanelPresupuesto(null); }}
                        style={{ borderRadius: 8, minWidth: 130 }}
                    >
                        <option value="">Todos</option>
                        {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
            </div>

            {mensaje && <div className="alert alert-success py-2">{mensaje}</div>}
            {error   && <div className="alert alert-danger py-2">{error}</div>}

            <div className="row g-4">
                {/* Formulario */}
                <div className="col-lg-4">
                    <form
                        onSubmit={guardar}
                        className="card card-body shadow-sm"
                        style={{ borderRadius: 12 }}
                    >
                        <h3 className="h6 fw-bold mb-3">
                            {editandoId ? 'Editar evento' : 'Nuevo evento'}
                        </h3>

                        {[
                            { label: 'Nombre', name: 'nombre', type: 'text' },
                            { label: 'Lugar',  name: 'lugar',  type: 'text' },
                        ].map(({ label, name, type }) => (
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
                                />
                            </div>
                        ))}

                        <div className="mb-3">
                            <label className="form-label fw-semibold text-secondary" style={{ fontSize: '.8rem' }}>FECHA Y HORA</label>
                            <input
                                type="datetime-local"
                                className="form-control"
                                name="fecha"
                                value={formulario.fecha}
                                onChange={manejarCambio}
                            />
                        </div>

                        <div className="row">
                            <div className="col-6 mb-3">
                                <label className="form-label fw-semibold text-secondary" style={{ fontSize: '.8rem' }}>CUPO</label>
                                <input
                                    type="number" min="1"
                                    className="form-control"
                                    name="cupo"
                                    value={formulario.cupo}
                                    onChange={manejarCambio}
                                />
                            </div>
                            <div className="col-6 mb-3">
                                <label className="form-label fw-semibold text-secondary" style={{ fontSize: '.8rem' }}>PRESUPUESTO</label>
                                <input
                                    type="number" min="0" step="0.01"
                                    className="form-control"
                                    name="presupuesto"
                                    value={formulario.presupuesto}
                                    onChange={manejarCambio}
                                />
                            </div>
                        </div>

                        <div className="mb-3">
                            <label className="form-label fw-semibold text-secondary" style={{ fontSize: '.8rem' }}>ESTADO</label>
                            <select className="form-select" name="estado" value={formulario.estado} onChange={manejarCambio}>
                                {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>

                        <div className="d-flex gap-2 mt-1">
                            <button
                                className="btn fw-semibold flex-grow-1"
                                style={{ background: '#6366f1', color: 'white', borderRadius: 8 }}
                                disabled={procesando}
                            >
                                {procesando ? 'Procesando...' : editandoId ? 'Actualizar' : 'Guardar'}
                            </button>
                            {editandoId && (
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary fw-semibold"
                                    style={{ borderRadius: 8 }}
                                    onClick={cancelarEdicion}
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Listado */}
                <div className="col-lg-8">
                    {/* Paneles */}
                    {panelInscripciones && (
                        <Inscripciones
                            key={panelInscripciones.id}
                            evento={panelInscripciones}
                            token={token}
                            onCerrar={() => setPanelInscripciones(null)}
                        />
                    )}
                    {panelPresupuesto && (
                        <Presupuesto
                            key={panelPresupuesto.id}
                            evento={panelPresupuesto}
                            token={token}
                            onCerrar={() => setPanelPresupuesto(null)}
                            onActualizado={() => cargar(pagina, filtroEstado)}
                        />
                    )}

                    {cargando ? (
                        <div className="d-flex justify-content-center py-5">
                            <div className="spinner-border" style={{ color: '#6366f1' }} role="status" />
                        </div>
                    ) : eventos.length === 0 ? (
                        <div className="alert alert-secondary">No hay eventos para mostrar.</div>
                    ) : (
                        <div className="row g-3">
                            {eventos.map((ev) => (
                                <EventoCard
                                    key={ev.id}
                                    evento={ev}
                                    seleccionado={panelInscripciones?.id === ev.id || panelPresupuesto?.id === ev.id}
                                    onEditar={iniciarEdicion}
                                    onEliminar={eliminar}
                                    onVerInscripciones={setPanelInscripciones}
                                    onVerPresupuesto={setPanelPresupuesto}
                                    deshabilitado={procesando}
                                />
                            ))}
                        </div>
                    )}

                    {/* Paginación */}
                    {totalPaginas > 1 && (
                        <div className="d-flex justify-content-center mt-4">
                            <div className="paginacion-pill">
                                <button
                                    className="btn btn-sm btn-outline-secondary"
                                    disabled={pagina <= 1 || cargando}
                                    onClick={() => setPagina(pagina - 1)}
                                >
                                    ‹ Anterior
                                </button>
                                <span>Página {pagina} de {totalPaginas}</span>
                                <button
                                    className="btn btn-sm btn-outline-secondary"
                                    disabled={pagina >= totalPaginas || cargando}
                                    onClick={() => setPagina(pagina + 1)}
                                >
                                    Siguiente ›
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
