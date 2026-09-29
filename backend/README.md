# IssueDesk API · FastAPI

API REST para la gestión de incidencias. Usa autenticación JWT, contraseñas con hash Argon2id y persistencia en Google Firestore.

- **Producción:** https://issue-tracker-api-426124835343.us-central1.run.app/api
- **Swagger UI:** https://issue-tracker-api-426124835343.us-central1.run.app/api/docs

## Stack

| Tecnología | Uso |
| --- | --- |
| Python 3.13 / FastAPI | Framework HTTP y documentación OpenAPI automática |
| Pydantic v2 + pydantic-settings | Validación de datos y configuración tipada por variables de entorno |
| PyJWT | Emisión y validación de JWT (HS256, `exp`, `iat`, `iss`) |
| pwdlib (Argon2id) | Hash seguro de contraseñas |
| google-cloud-firestore (async) | Persistencia |
| pytest + httpx, ruff | Pruebas y linting |

## Arquitectura en capas

```
app/
├── main.py               Application factory: middlewares, routers y handlers
├── core/
│   ├── config.py         Settings (12-factor): todo se configura por entorno
│   ├── security.py       PasswordHasher, TokenService, LoginRateLimiter
│   └── container.py      Composition root: arma repositorios y servicios
├── domain/
│   ├── models.py         Entidades y enums inmutables (dataclasses)
│   └── errors.py         Errores de negocio, sin dependencia de HTTP
├── repositories/
│   ├── base.py           Contratos (typing.Protocol)
│   ├── firestore.py      Implementación Firestore
│   └── memory.py         Implementación en memoria (tests / desarrollo local)
├── services/
│   ├── auth_service.py   Login, emisión de token y resolución del usuario actual
│   └── issue_service.py  Casos de uso de incidencias
├── schemas/              DTOs de entrada y salida (Pydantic)
└── api/
    ├── dependencies.py   Inyección de dependencias de FastAPI
    ├── error_handlers.py Traducción de errores a respuestas HTTP uniformes
    ├── middleware.py     Cabeceras de seguridad
    └── routers/          auth, issues y health
```

**Principios aplicados**

- **Responsabilidad única (SRP):** los routers solo traducen HTTP, los servicios aplican reglas de negocio y los repositorios se encargan de la persistencia.
- **Inversión de dependencias (DIP):** los servicios dependen de `Protocol`s y no de Firestore. `container.py` es el único lugar donde se eligen las implementaciones.
- **Abierto/cerrado (OCP):** agregar otra base de datos solo requiere escribir un nuevo repositorio.
- **Patrones:**
  - *Repository* para aislar la persistencia.
  - *Application Factory* (`create_app`) para construir la app.
  - *Composition Root* para armar las dependencias.
  - *Decorator* (`translate_errors`) para convertir errores de Google Cloud en errores de dominio.
  - *DTO/Mapper* entre los schemas y el dominio.

## Endpoints

Todos bajo el prefijo `/api`. Los endpoints de `/issues` requieren `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | Estado del servicio |
| POST | `/auth/login` | Recibe `{username, password}` y devuelve `{access_token, token_type, expires_in, user}` |
| GET | `/auth/me` | Usuario autenticado |
| GET | `/issues?status=&priority=&limit=` | Listado con filtros combinables, ordenado por fecha de creación descendente |
| GET | `/issues/summary` | `{total, by_status: {open, in_progress, done}}` |
| POST | `/issues` | Crea una incidencia: `{title, description, priority}` |
| GET | `/issues/{id}` | Detalle de una incidencia |
| PATCH | `/issues/{id}` | Actualiza `status` y/o `priority` |

Valores permitidos:
- `status`: `open` · `in_progress` · `done`
- `priority`: `high` · `medium` · `low`

**Cierre de sesión:** el JWT no guarda estado en el servidor. El cliente cierra la sesión descartando el token, y el token expira solo según `ACCESS_TOKEN_EXPIRE_MINUTES`.

## Manejo de errores

Todas las respuestas de error comparten el mismo contrato:

```json
{ "error": { "code": "issue_not_found", "message": "La incidencia 'x' no existe." } }
```

| Código HTTP | `code` | Origen |
| --- | --- | --- |
| 401 | `invalid_credentials` / `invalid_token` | Login fallido, o token ausente, alterado o expirado (incluye `WWW-Authenticate: Bearer`) |
| 404 | `issue_not_found` | Incidencia inexistente |
| 422 | `validation_error` | Datos inválidos, con `details[]` por campo |
| 429 | `too_many_attempts` | Límite de intentos de login (incluye `Retry-After`) |
| 503 | `repository_unavailable` | Firestore no disponible |
| 500 | `internal_error` | Error inesperado; se registra en el log sin exponer detalles al cliente |

## Seguridad

- **Contraseñas:** se guardan con hash Argon2id. Cuando el usuario no existe, igual se verifica contra un hash ficticio, para que el tiempo de respuesta no revele qué usuarios existen.
- **Mensajes de login:** son idénticos para un usuario inexistente y para una contraseña incorrecta.
- **JWT:** se exigen `exp`, `iat`, `iss` y `sub`, y el algoritmo queda fijado en la configuración.
- **Límite de intentos:** 5 intentos fallidos por usuario por minuto (configurable).
- **Cabeceras de seguridad:** `nosniff`, `X-Frame-Options: DENY`, `HSTS`, `no-referrer` y `Cache-Control: no-store`.
- **Validación estricta de entrada:** `extra="forbid"`, longitudes máximas y patrón para los IDs.
- **Contenedor:** se ejecuta con un usuario sin privilegios (`uid 10001`) y con una imagen multi-stage mínima.
- **Secretos:** ninguno en el repositorio. En producción la clave JWT viene de Secret Manager.

## Configuración

Variables de entorno (ver `.env.example`):

| Variable | Default | Descripción |
| --- | --- | --- |
| `JWT_SECRET_KEY` | requerido (mín. 32 caracteres) | Clave de firma del JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Vigencia del token |
| `REPOSITORY_BACKEND` | `firestore` | `firestore` o `memory` |
| `GCP_PROJECT_ID` | — | Proyecto de Firestore |
| `CORS_ORIGINS` | `[]` | Orígenes permitidos (solo para desarrollo) |
| `LOGIN_MAX_ATTEMPTS` / `LOGIN_WINDOW_SECONDS` | `5` / `60` | Límite de intentos de login |
| `DOCS_ENABLED` | `true` | Publica Swagger en `/api/docs` |

## Desarrollo local

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

```bash
pytest
ruff check .
```

### Carga de usuarios (seed)

```bash
cp scripts/seed_data.example.json scripts/seed_data.json
python -m scripts.seed scripts/seed_data.json
```

El script guarda los usuarios con su contraseña hasheada. Las incidencias de ejemplo solo se crean si la colección está vacía. `seed_data.json` está en `.gitignore`.

### Índices de Firestore

Los filtros combinados con el orden por `created_at` requieren estos índices compuestos, que crea `infra/deploy.sh`:
- `status ASC, created_at DESC`
- `priority ASC, created_at DESC`
- `status ASC, priority ASC, created_at DESC`

El resumen usa **consultas de agregación `count()`**, que se ejecutan en paralelo con `asyncio.gather`. Así no se leen los documentos completos.
