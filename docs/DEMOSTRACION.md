# Guía de demostración y defensa

## Preparación

1. Instalar según README, crear base MySQL y aplicar migraciones.
2. Configurar las tres contraseñas demo en `.env` y ejecutar `seed_demo`.
3. Ejecutar pruebas con MySQL y guardar la salida real. Confirmar que las dos de concurrencia se ejecutan y no aparecen como omitidas.
4. Iniciar API e importar colección y entorno Postman. Completar contraseñas solo en el entorno local.

## Recorrido sugerido

| Paso | Demostración | Qué explicar |
|---|---|---|
| 1 | POST token con los tres perfiles | Usuario, grupo, autenticación y autorización son conceptos distintos |
| 2 | Crear evento con cupo 2 y presupuesto 1000 | Evento es el punto de encuentro de módulos |
| 3 | Crear tres personas y dos proveedores | Identidad única por cédula y datos de servicios |
| 4 | Inscribir dos personas y rechazar la tercera | Conteo de ACTIVA, validación 400 y bloqueo del evento |
| 5 | Cancelar una inscripción y utilizar su cupo | El estado participa en la decisión de aforo |
| 6 | Reactivar la cancelada con PATCH sin cupo | PATCH debe preservar las mismas reglas que POST |
| 7 | Contratar 600 y rechazar otro gasto de 400.01 | Agregación de montos y mensaje de saldo |
| 8 | Contratar 300 y consultar balance | Presupuesto 1000, gasto 900, saldo 100 |
| 9 | PATCH presupuesto a 899.99 | Una modificación del padre no puede invalidar contratos existentes |
| 10 | DELETE evento con inscritos | 409; explicar PROTECT y borrado explícito de hijos |
| 11 | Consultas por estado/lugar y persona/evento | Composición de filtros, relaciones y paginación |
| 12 | Consulta intenta editar; petición sin token | 403 frente a 401 |
| 13 | Organizador modifica proveedor pero no inscribe personas | Matriz por módulo y operación |
| 14 | Reporte y prueba automatizada seleccionada | Count, Sum, F, Subquery, select_related |

La colección completa realiza este recorrido y limpia sus propios registros. Al final revoca los tokens demo.

## Flujo de una solicitud

Ejemplo: `POST /api/inscripciones/`.

1. La ruta global incluye `inscripciones.urls`.
2. `TokenAuthentication` identifica al usuario y los permisos revisan su perfil.
3. La propia vista funcional valida los datos y abre la transacción, sin un módulo CRUD compartido.
4. El serializador valida campos y referencias; la vista bloquea el evento dentro de una transacción.
5. Se valida otra vez con valores actuales y se comprueban estado, fecha, duplicidad y cupo.
6. El ORM crea la fila; las FK y la unicidad también se verifican en la base.
7. Se devuelve JSON con HTTP 201; un fallo de negocio devuelve 400 sin guardar.

## Preguntas para preparar

- ¿Por qué el monto está en Contratacion y no en Proveedor?
- ¿Cómo se reactiva una inscripción sin crear un duplicado?
- ¿Qué pasaría si PATCH solo validara los campos enviados?
- ¿Por qué se excluye el contrato actual al sumar el gasto de una actualización?
- ¿Qué significa PROTECT y cuándo responde 409?
- ¿Cómo evita la subconsulta que dos inscripciones dupliquen el gasto de dos contratos?
- ¿Qué diferencia hay entre 401 y 403?
- ¿Por qué SQLite no prueba los bloqueos de MySQL?
- ¿Qué reglas podrían saltarse al escribir directamente mediante el ORM?

Cada integrante debe explicar una parte implementada/revisada por otra persona y mostrar contribuciones sustantivas reales.

