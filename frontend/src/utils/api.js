// URL base de la API de Gestión de Eventos (usa proxy local o directo)
export const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

/** Headers para peticiones autenticadas */
export function encabezadosAuth(token) {
    return {
        'Content-Type': 'application/json',
        Authorization: `Token ${token}`,
    };
}

/** Mensajes claros por código HTTP (se usan si Django no manda uno propio). */
const MENSAJES_HTTP = {
    400: 'Hay datos inválidos. Revise el formulario.',
    401: 'Su sesión expiró o no es válida. Inicie sesión de nuevo.',
    403: 'Su perfil no tiene permiso para esta operación.',
    404: 'El registro no existe o fue eliminado.',
    409: 'No se puede completar: el registro tiene datos relacionados.',
};

/**
 * apiFetch — único punto para llamar a la API.
 * - Agrega el token guardado en la sesión.
 * - Si Django responde 401, avisa al AuthContext para cerrar la sesión.
 * - Si no hay conexión, lanza un error comprensible.
 */
export async function apiFetch(url, opciones = {}) {
    const token = localStorage.getItem('token');
    const headers = { ...(opciones.headers || {}) };
    if (token) headers.Authorization = `Token ${token}`;

    let respuesta;
    try {
        respuesta = await fetch(url, { ...opciones, headers });
    } catch {
        throw new Error('No se pudo conectar con el servidor. Verifique que el backend esté encendido.');
    }
    if (respuesta.status === 401) {
        window.dispatchEvent(new Event('sesion-expirada'));
    }
    return respuesta;
}

/**
 * Convierte la respuesta de error de Django en texto legible.
 * Maneja tanto { detail: "...", errores: { campo: [...] } } como errores directos.
 */
export async function obtenerMensajeError(respuesta, porDefecto) {
    // 401 y 403 siempre con mensaje fijo y claro
    if (respuesta.status === 401 || respuesta.status === 403) {
        return MENSAJES_HTTP[respuesta.status];
    }
    porDefecto = MENSAJES_HTTP[respuesta.status] && respuesta.status !== 400
        ? `${porDefecto}: ${MENSAJES_HTTP[respuesta.status]}`
        : porDefecto;
    try {
        const datos = await respuesta.json();
        
        // Si viene un diccionario de errores anidado (ej: custom exception handler de Django)
        const errores = datos.errores || datos;
        
        const partes = [];
        for (const [campo, valor] of Object.entries(errores)) {
            if (campo === 'detail') continue;
            const texto = Array.isArray(valor) ? valor.join(' ') : String(valor);
            partes.push(campo === 'non_field_errors' ? texto : `${campo}: ${texto}`);
        }
        
        if (partes.length > 0) return partes.join(' | ');
        if (datos.detail) return datos.detail;
        if (datos.error) return datos.error;
        return porDefecto;
    } catch {
        return porDefecto;
    }
}

/**
 * Trae todos los registros de un listado paginado (para llenar selectores).
 * Recorre las páginas que devuelve Django: { resultados, total_paginas }.
 */
export async function obtenerTodos(url) {
    let pagina = 1, total = 1, todos = [];
    do {
        const separador = url.includes('?') ? '&' : '?';
        const r = await apiFetch(`${url}${separador}page=${pagina}`);
        if (!r.ok) throw new Error(await obtenerMensajeError(r, 'No se pudo cargar la lista'));
        const datos = await r.json();
        todos = todos.concat(datos.resultados ?? datos);
        total = datos.total_paginas ?? 1;
        pagina++;
    } while (pagina <= total);
    return todos;
}

/** Formatea una fecha ISO a formato legible */
export function formatearFecha(valor) {
    if (!valor) return 'Sin indicar';
    return new Date(valor).toLocaleString('es-CR', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
}

/** Convierte datetime ISO a formato de input datetime-local */
export function aFechaHoraLocal(valor) {
    return valor ? valor.slice(0, 16) : '';
}

