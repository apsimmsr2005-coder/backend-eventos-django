# Sistema de Gestión de Eventos 

API REST para administrar eventos, participantes, inscripciones, proveedores y presupuesto. Desarrollada con Python, Django y Django REST Framework, con MySQL como base de datos y autenticación por tokens. Incluye un frontend en React (sección 17).

## 1. Planteamiento del problema

**Usuarios:** organizadores de eventos de una asociación, municipalidad o colegio, y las personas que se inscriben a esos eventos.

**Necesidad:** hoy las inscripciones y los gastos se llevan en hojas de cálculo, sin control de cupo ni de presupuesto. Esto genera sobrecupo, inscripciones duplicadas y gastos que superan lo planificado.

**Qué automatiza el sistema:**
- Control de cupo: se bloquean las inscripciones cuando el evento está lleno.
- Control de estados del evento (abierto, en curso, finalizado, cancelado).
- Control del gasto: no se pueden contratar proveedores por encima del presupuesto del evento.

## 2. Módulos

| App | Responsabilidad | Relaciones |
|---|---|---|
| `eventos` | Nombre, fecha, lugar, cupo, estado, presupuesto | 1:N con inscripciones y con contrataciones |
| `participantes` | Nombre, correo, cédula (única) | 1:N con inscripciones |
| `inscripciones` | Registro de un participante en un evento | Une participantes y eventos |
| `proveedores` | Nombre, servicio, contacto | 1:N con contrataciones |
| `presupuesto` | Contrataciones: evento, proveedor, monto | Tabla intermedia de la N:M eventos ↔ proveedores |

**Flujo de datos:** se crea un evento con cupo y presupuesto → se registran participantes → se inscriben al evento → se contratan proveedores → se controla el gasto contra el presupuesto.

## 3. Reglas de negocio

1. No se puede inscribir a un evento que ya alcanzó su cupo.
2. Un participante no puede inscribirse dos veces al mismo evento.
3. No se puede inscribir (ni contratar proveedores) en un evento cancelado o finalizado.
4. La fecha de un evento no puede estar en el pasado.
5. El cupo debe ser mayor que 0 y el presupuesto no puede ser negativo.
6. No se puede contratar un proveedor si el gasto total supera el presupuesto del evento.
7. No se puede reducir el cupo por debajo de los inscritos activos (también en PATCH y PUT).
8. No se puede borrar un evento con inscripciones o contrataciones (responde 409). Lo mismo aplica a participantes y proveedores relacionados.

## 4. Roles y permisos

| Recurso | Administrador | Organizador | Consulta |
|---|---|---|---|
| Eventos | Todo | Todo | Solo lectura |
| Proveedores | Todo | Todo | Solo lectura |
| Presupuesto (contrataciones) | Todo | Todo | Solo lectura |
| Participantes | Todo | Solo lectura | Solo lectura |
| Inscripciones | Todo | Solo lectura | Solo lectura |

Un usuario sin rol recibe 403. Sin token, la API responde 401. La matriz completa por endpoint está en `docs/DOCUMENTO_TECNICO.md`.

## 5. Requisitos

- **Python 3.12 o 3.13.** Con Python 3.14 en Windows, `mysqlclient` no instala sin herramientas de compilación de C++.
- **MySQL 8.x** en ejecución.
- Git y Postman.

## 6. Instalación

```bash
# 1. Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>
cd <NOMBRE_DEL_PROYECTO>

# 2. Crear y activar el entorno virtual
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux / macOS:
source .venv/bin/activate

# 3. Instalar dependencias
pip install -r requirements.txt
```

En Windows con varias versiones de Python, use `py -3.13 -m venv .venv` para elegir la versión.

## 7. Configuración (.env)

Copie `.env.example` a `.env` y complete los valores:

```bash
cp .env.example .env
```

| Variable | Descripción |
|---|---|
| `DJANGO_SECRET_KEY` | Clave secreta de Django (use una cadena aleatoria) |
| `DJANGO_DEBUG` | `True` para uso local (con `False` el admin se ve sin estilos con `runserver`) |
| `DJANGO_ALLOWED_HOSTS` | `127.0.0.1,localhost` |
| `DB_NAME` | `gestion_eventos` |
| `DB_USER` | `eventos_app` |
| `DB_PASSWORD` | Debe coincidir con la clave del usuario creado en MySQL |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` |
| `DEMO_ADMIN_PASSWORD`, `DEMO_ORGANIZADOR_PASSWORD`, `DEMO_CONSULTA_PASSWORD` | Contraseñas de los usuarios de demostración. Las usa solo `seed_demo` |

Nunca suba el archivo `.env` al repositorio.

## 8. Base de datos

Entre a MySQL como administrador (`mysql -u root -p`) y ejecute:

```sql
CREATE DATABASE gestion_eventos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'eventos_app'@'localhost' IDENTIFIED BY 'la_misma_clave_del_env';
GRANT ALL PRIVILEGES ON gestion_eventos.* TO 'eventos_app'@'localhost';
GRANT ALL PRIVILEGES ON `test\_%`.* TO 'eventos_app'@'localhost';
```

La última línea es necesaria para las pruebas: Django crea una base temporal `test_gestion_eventos` y la elimina al terminar. Para solo ejecutar el servidor bastan las primeras tres.

## 9. Migraciones, superusuario y datos de demostración

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_demo
```

`seed_demo` crea los usuarios `admin_demo`, `organizador_demo` y `consulta_demo` con sus roles, usando las contraseñas `DEMO_*_PASSWORD` del `.env`, y carga datos ficticios. Es idempotente: ejecutarlo de nuevo no duplica registros.

## 10. Ejecución

```bash
python manage.py runserver
```

La API queda en `http://127.0.0.1:8000/`.

## 11. Autenticación

La API usa tokens de DRF (`authtoken`).

1. Obtener el token con `POST /api/token/` y el cuerpo:
   ```json
   {"username": "admin_demo", "password": "<DEMO_ADMIN_PASSWORD>"}
   ```
2. Enviar el token en cada solicitud: `Authorization: Token <token>`.
3. Ver el perfil con `GET /api/me/` y cerrar sesión con `POST /api/logout/` (204).

## 12. Endpoints principales

| Recurso | Ruta |
|---|---|
| Eventos | `/api/eventos/` |
| Participantes | `/api/participantes/` |
| Inscripciones | `/api/inscripciones/` |
| Proveedores | `/api/proveedores/` |
| Presupuesto (contrataciones) | `/api/presupuesto/` |
| Balance de un evento | `/api/eventos/{id}/presupuesto/` |
| Inscripciones de un evento | `/api/eventos/{id}/inscripciones/` |
| Resumen agregado | `/api/reportes/resumen/` |

Los listados son paginados y admiten filtros, por ejemplo `/api/eventos/?estado=ABIERTO&lugar=Puntarenas&search=Feria&ordering=-presupuesto&page=1`. El catálogo completo está en `docs/DOCUMENTO_TECNICO.md`.

## 13. Pruebas automatizadas

Antes de correr es necesario ejecutar el siguiente comando en MySQL:
GRANT ALL PRIVILEGES ON test_gestion_eventos.* TO 'eventos_app'@'localhost';
FLUSH PRIVILEGES;

```bash
python manage.py test tests -v 2
```

Son 15 pruebas: 5 de CRUD, 5 de reglas de negocio, 3 de permisos y 2 de consultas (paginación y filtros). Se ejecutan contra MySQL y requieren el permiso `test\_%` del paso 8.

## 14. Postman

En la carpeta `postman/` están la colección (`gestion_eventos.postman_collection.json`) y el entorno de ejemplo (`local.postman_environment.json`).

1. Importe ambos archivos en Postman y elija el entorno.
2. Escriba en el entorno las contraseñas de `password_admin`, `password_organizador` y `password_consulta` (las mismas de `DEMO_*_PASSWORD`).
3. Con el servidor corriendo, ejecute la colección con el Collection Runner. Contiene 20 solicitudes con la respuesta esperada en su descripción.

## 15. Equipo

| Integrante | Módulos a cargo |
|---|---|
| Integrante A | `eventos`, `presupuesto` |
| Integrante B | `participantes`, `inscripciones` |
| Integrante C | `proveedores`, seguridad (roles y tokens) |

El código se revisó de forma cruzada mediante pull requests.

## 16. Limitaciones conocidas

- `mysqlclient` requiere Python 3.12 o 3.13 en Windows. En Linux necesita `libmysqlclient-dev` y `pkg-config` instalados antes de `pip install`.
- Las pruebas y la API están validadas solo con MySQL 8.x.
- La colección de Postman deja en la base los datos que crea (con sufijo `run_id`); se recomienda ejecutarla en una base de pruebas.

## 17. Frontend (React + Vite)

Aplicación SPA en `frontend/` que consume esta misma API. Construida con React, Vite, React Router y Bootstrap 5.

### 17.1 Requisitos

- Node.js 20.19 o superior (incluye npm).
- El backend corriendo en `http://127.0.0.1:8000` (secciones 6 a 10).

### 17.2 Instalación y configuración

```bash
cd frontend
npm install
cp .env.example .env
```

`frontend/.env` tiene una sola variable:

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `VITE_API_URL` | `/api` | URL base de la API. Si no se define, el código usa `/api`. |

No contiene secretos. El archivo `.env` real no se sube al repositorio.

### 17.3 Ejecución (dos terminales)

| Terminal | Carpeta | Comando |
|---|---|---|
| 1 · Backend | raíz del proyecto (con el entorno virtual activo) | `python manage.py runserver` |
| 2 · Frontend | `frontend/` | `npm run dev` |

Abrir `http://localhost:5173`.

### 17.4 Comunicación con la API y CORS

En desarrollo, Vite actúa como **proxy**: toda petición que empieza con `/api` se reenvía a `http://127.0.0.1:8000` (ver `frontend/vite.config.js`). Para el navegador, el frontend y la API están en el mismo origen (`localhost:5173`), por lo que **no se necesita configurar CORS en Django**.

Si se quisiera apuntar el frontend directo al backend (`VITE_API_URL=http://127.0.0.1:8000/api`), habría que instalar y configurar `django-cors-headers` para permitir el origen `http://localhost:5173`. Esta configuración no se incluye porque el proxy la hace innecesaria.

### 17.5 Usuarios de prueba (ficticios)

Los crea `python manage.py seed_demo` con las contraseñas definidas en el `.env` del backend:

| Usuario | Rol | Qué puede hacer en la interfaz |
|---|---|---|
| `admin_demo` | Administrador | Todas las operaciones |
| `organizador_demo` | Organizador | Gestiona eventos, proveedores y presupuesto; solo consulta participantes e inscripciones |
| `consulta_demo` | Consulta | Solo lectura; al intentar modificar recibe un mensaje 403 |

### 17.6 Pantallas y rutas

| Ruta | Pantalla |
|---|---|
| `/login` | Inicio de sesión (pública) |
| `/` | Resumen (dashboard con indicadores) |
| `/eventos` | Eventos: CRUD, filtro por estado, búsqueda y ordenamiento |
| `/participantes` | Participantes: CRUD y paginación |
| `/inscripciones` | Inscripciones: filtros combinables, inscribir, cancelar/reactivar |
| `/proveedores` | Proveedores: CRUD y paginación |
| `/presupuesto` | Presupuesto: filtros combinables, contratar, editar monto |

Todas las rutas excepto `/login` están protegidas: sin sesión redirigen al login.

### 17.7 Estructura

```
frontend/src/
├── main.jsx            # BrowserRouter + AuthProvider
├── App.jsx             # Definición de rutas
├── context/            # AuthContext: sesión compartida (token y usuario)
├── utils/api.js        # URL base, apiFetch (token + manejo de 401) y mensajes de error
├── components/         # Layout, Menu, RutaProtegida, Paginacion y módulos
└── pages/              # Pantallas de Inscripciones y Presupuesto
```

### 17.8 Autenticación y manejo de errores

- El login obtiene el token desde `POST /api/token/` y lo guarda en `localStorage`, por lo que recargar la página no cierra la sesión.
- **Cerrar sesión** llama a `POST /api/logout/`: el backend **elimina el token**, que queda revocado en el servidor. Después se limpia el navegador.
- Si cualquier petición recibe **401**, la sesión se cierra y se redirige al login con un aviso.
- Los errores **403** muestran "Su perfil no tiene permiso para esta operación". También se muestran mensajes claros para 400, 404, 409 y fallos de red.
- Los permisos los aplica Django: ocultar o mostrar botones no reemplaza la validación del servidor.

### 17.9 Limitaciones del frontend

- El token se guarda en `localStorage`; en un entorno de producción convendría una cookie `HttpOnly` para reducir el riesgo ante ataques XSS.
- Los tokens de DRF no expiran por tiempo: solo se invalidan al cerrar sesión.
- La configuración está pensada para desarrollo local con el proxy de Vite; no se incluye despliegue a producción.
- Los selectores de eventos, participantes y proveedores cargan todos los registros recorriendo la paginación, lo que es adecuado para volúmenes pequeños.