# Sistema de Gestión de Eventos (Backend)

API REST para administrar eventos, participantes, inscripciones, proveedores y presupuesto. Desarrollada con Python, Django y Django REST Framework, con MySQL como base de datos y autenticación por tokens.

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
