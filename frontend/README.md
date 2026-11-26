# Frontend · Sistema de Gestión de Eventos

Interfaz web en React que consume la API REST del backend Django de este repositorio.

**Tecnologías:** React, Vite, React Router y Bootstrap 5.

## Ejecución rápida

Requiere Node.js 20.19 o superior y el backend corriendo en `http://127.0.0.1:8000`.

```bash
npm install
cp .env.example .env
npm run dev
```

Abrir `http://localhost:5173`.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Genera la versión de producción en `dist/` (no se versiona) |
| `npm run preview` | Sirve localmente la versión generada por `build` |

## Más información

- Instalación completa, configuración de CORS, usuarios de prueba y limitaciones: sección 17 del [README principal](../README.md).
- Matriz de pantallas y endpoints, permisos, escenarios manuales y capturas: [docs/FRONTEND.md](../docs/FRONTEND.md).