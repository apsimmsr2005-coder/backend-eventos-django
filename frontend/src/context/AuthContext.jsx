import { createContext, useContext, useState } from 'react';
import { API_BASE } from '../utils/api';

const AuthContext = createContext(null);

/**
 * AuthProvider — guarda la sesión (token y usuario) y la comparte con toda la app.
 * Se persiste en localStorage para que recargar la página no cierre la sesión.
 */
export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('token') ?? '');
    const [usuario, setUsuario] = useState(() => localStorage.getItem('usuario') ?? '');

    function login(nuevoToken, nombreUsuario) {
        localStorage.setItem('token', nuevoToken);
        localStorage.setItem('usuario', nombreUsuario);
        setToken(nuevoToken);
        setUsuario(nombreUsuario);
    }

    async function logout() {
        try {
            // El backend borra el token: queda revocado en el servidor.
            if (token) {
                await fetch(`${API_BASE}/logout/`, {
                    method: 'POST',
                    headers: { Authorization: `Token ${token}` },
                });
            }
        } catch {
            // Sin conexión: igual se limpia la sesión local.
        }
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        setToken('');
        setUsuario('');
    }

    return (
        <AuthContext.Provider value={{ token, usuario, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

/** Hook para leer la sesión desde cualquier componente. */
export function useAuth() {
    return useContext(AuthContext);
}
