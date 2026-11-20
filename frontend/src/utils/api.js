// URL base de la API de Gestión de Eventos (usa proxy local o directo)
export const API_BASE = '/api';

/** Headers para peticiones autenticadas */
export function encabezadosAuth(token) {
    return {
        'Content-Type': 'application/json',
        Authorization: `Token ${token}`,
    };
}

/**
 * Convierte la respuesta de error de Django en texto legible.
 * Maneja tanto { detail: "...", errores: { campo: [...] } } como errores directos.
 */
export async function obtenerMensajeError(respuesta, porDefecto) {
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

