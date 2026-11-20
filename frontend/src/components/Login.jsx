import { useState } from 'react';
import { API_BASE } from '../utils/api';

const TOKEN_URL = `${API_BASE}/token/`;

/**
 * Login — solo gestiona la autenticación.
 * Devuelve el token a App mediante la prop onLogin.
 */
export default function Login({ onLogin }) {
    const [credenciales, setCredenciales] = useState({ username: '', password: '' });
    const [autenticando, setAutenticando] = useState(false);
    const [error, setError] = useState('');

    function manejarCambio(e) {
        setCredenciales({ ...credenciales, [e.target.name]: e.target.value });
    }

    async function iniciarSesion(e) {
        e.preventDefault();
        if (!credenciales.username.trim() || !credenciales.password) {
            setError('Debe ingresar usuario y contraseña');
            return;
        }
        try {
            setAutenticando(true);
            setError('');
            const form = new URLSearchParams();
            form.append('username', credenciales.username);
            form.append('password', credenciales.password);

            const respuesta = await fetch(TOKEN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: form,
            });
            if (!respuesta.ok) throw new Error('Usuario o contraseña incorrectos');
            const datos = await respuesta.json();
            onLogin(datos.token, credenciales.username);
        } catch (err) {
            setError(
                err.message === 'Failed to fetch'
                    ? 'No se pudo conectar con el servidor'
                    : err.message
            );
        } finally {
            setAutenticando(false);
        }
    }

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center login-bg">
            <div style={{ width: '100%', maxWidth: 400, padding: '0 16px' }}>
                <div className="text-center mb-4">
                    <h1 className="fw-bold text-white mb-0" style={{ fontSize: '1.75rem', letterSpacing: '-0.5px' }}>
                        Gestión de Eventos
                    </h1>
                    <p className="text-white-50 mb-0 mt-1" style={{ fontSize: '.9rem' }}>
                        Sistema de administración y logística
                    </p>
                </div>

                <form
                    onSubmit={iniciarSesion}
                    className="card card-body shadow"
                    style={{ borderRadius: 16, padding: '28px 32px' }}
                >
                    <h2 className="h5 text-center mb-4 fw-semibold text-dark">Iniciar sesión</h2>

                    {error && (
                        <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '.9rem' }}>
                            {error}
                        </div>
                    )}

                    <div className="mb-3">
                        <label className="form-label fw-semibold text-secondary" style={{ fontSize: '.85rem' }}>
                            USUARIO
                        </label>
                        <input
                            className="form-control"
                            name="username"
                            value={credenciales.username}
                            onChange={manejarCambio}
                            autoFocus
                            placeholder="Ingrese su usuario"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label fw-semibold text-secondary" style={{ fontSize: '.85rem' }}>
                            CONTRASEÑA
                        </label>
                        <input
                            type="password"
                            className="form-control"
                            name="password"
                            value={credenciales.password}
                            onChange={manejarCambio}
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        className="btn btn-primary w-100 fw-semibold"
                        style={{ background: '#6366f1', border: 'none', borderRadius: 8, padding: '10px' }}
                        disabled={autenticando}
                    >
                        {autenticando ? (
                            <>
                                <span className="spinner-border spinner-sm me-2" role="status" />
                                Autenticando...
                            </>
                        ) : (
                            'Iniciar sesión'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
