# Sistema de Gestión de Eventos (Backend)

API REST para administrar eventos, participantes, inscripciones, proveedores y presupuesto. Desarrollada con Python, Django y Django REST Framework.

## 1. Planteamiento del problema

**Usuarios:** organizadores de eventos de una asociación, municipalidad o colegio, y las personas que se inscriben a esos eventos.

**Necesidad:** hoy las inscripciones y los gastos se llevan en hojas de cálculo, sin control de cupo ni de presupuesto. Esto genera sobrecupo, inscripciones duplicadas y gastos que superan lo planificado.

**Qué automatiza el sistema:**
- Control de cupo y bloqueo de inscripciones cuando el evento está lleno.
- Control de estados del evento (programado, cancelado, finalizado).
- Control del gasto: no permite contratar proveedores si se excede el presupuesto.

## 2. Módulos

| App | Responsabilidad | Relaciones |
|---|---|---|
| `eventos` | Nombre, fecha, lugar, cupo, estado, presupuesto | 1:N con inscripciones; N:M con proveedores |
| `participantes` | Nombre, correo, cédula (única) | 1:N con inscripciones |
| `inscripciones` | Registro de un participante en un evento | Une participantes y eventos |
| `proveedores` | Nombre, servicio, contacto | N:M con eventos |
| `presupuesto` | Contrataciones: evento, proveedor, monto | Tabla intermedia de la N:M eventos ↔ proveedores |

**Flujo de datos:** se crea un evento con cupo y presupuesto → se registran participantes → se inscriben al evento → se contratan proveedores → se controla el gasto contra el presupuesto.

## 3. Reglas de negocio

1. No se puede inscribir a un evento que ya alcanzó su cupo.
2. Un participante no puede inscribirse dos veces al mismo evento.
3. No se puede inscribir a un evento cancelado o finalizado.
4. La fecha de un evento no puede estar en el pasado.
5. El cupo debe ser mayor que 0.
6. No se puede contratar un proveedor si el gasto total supera el presupuesto del evento.
7. No se puede reducir el cupo por debajo de la cantidad de inscritos (también en PATCH).
8. No se puede borrar un evento con inscripciones activas (responde 409).

## 4. Roles y permisos

| Rol | Permisos |
|---|---|
| Administrador | Todas las operaciones |
| Organizador | Gestiona eventos, proveedores y presupuesto |
| Consulta | Solo lectura |

La matriz completa por endpoint está en el documento técnico.

## 5. Requisitos

- Python 3.10 o superior
- MySQL o PostgreSQL
- Git
- Postman (para probar la API)

## 6. Instalación

```bash
# 1. Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>
cd <NOMBRE_DEL_PROYECTO>

# 2. Crear y activar el entorno virtual
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux / macOS:
source venv/bin/activate

# 3. Instalar dependencias
pip install -r requirements.txt
```

## 7. Configuración

Copiar `.env.example` a `.env` y completar los valores:

```bash
cp .env.example .env
```

Variables esperadas: `SECRET_KEY`, `DEBUG`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`.

## 8. Base de datos

Crear la base de datos vacía antes de migrar.

MySQL:
```sql
CREATE DATABASE eventos_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

PostgreSQL:
```sql
CREATE DATABASE eventos_db;
```

## 9. Migraciones y superusuario

```bash
python manage.py migrate
python manage.py createsuperuser
```

## 10. Ejecución

```bash
python manage.py runserver
```

La API queda disponible en `http://127.0.0.1:8000/`.

## 11. Pruebas automatizadas

```bash
python manage.py test
```

## 12. Postman

Importar la colección desde `postman/` junto con el archivo de variables de entorno de ejemplo. La colección incluye al menos 20 solicitudes con sus respuestas esperadas.

## 13. Equipo

| Integrante | Módulos a cargo |
|---|---|
| Integrante A | `eventos`, `presupuesto` |
| Integrante B | `participantes`, `inscripciones` |
| Integrante C | `proveedores`, seguridad (roles y tokens) |

Todo el código se revisa de forma cruzada mediante pull requests.

## 14. Limitaciones conocidas

_Se completará al finalizar el proyecto._
