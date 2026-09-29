# IssueDesk Web · Angular

SPA para la gestión de incidencias, construida con **Angular 22** sin Zone.js, con componentes standalone y en modo estricto.

- **Producción:** https://issue-tracker-web-426124835343.us-central1.run.app

## Requisitos del examen y cómo se cumplen

| Requisito | Implementación |
| --- | --- |
| Standalone Components | Todos los componentes son standalone (`strictStandalone: true`); no existe ningún `NgModule` |
| Routing | `app.routes.ts` con guards funcionales `canMatch` (`authGuard` y `guestGuard`) y títulos por ruta mediante un `TitleStrategy` propio |
| Lazy loading | La pantalla de login, el shell y las incidencias se cargan bajo demanda (`loadComponent` / `loadChildren`) |
| Reactive Forms | Login y creación de incidencias con `NonNullableFormBuilder`, formularios tipados y validadores propios |
| HttpClient | `provideHttpClient(withFetch(), withInterceptors([authInterceptor]))` |
| Strict typing | `strict`, `strictTemplates`, `noImplicitReturns`, `noUnusedLocals` y `noPropertyAccessFromIndexSignature` |

## Arquitectura

```
src/app/
├── core/                         Servicios singleton y piezas transversales
│   ├── auth/                     AuthService (signals), SessionStorage, guards e interceptor
│   ├── config/api-base-url.ts    InjectionToken con la URL de la API
│   ├── http/api-error.ts         Traduce errores HTTP a mensajes para el usuario
│   ├── layout/shell/             Layout autenticado (barra superior y cierre de sesión)
│   ├── notifications/            ToastService
│   └── routing/                  PageTitleStrategy
├── features/
│   ├── auth/login-page/          Pantalla de inicio de sesión
│   └── issues/
│       ├── data/                 Modelos, textos de la interfaz, IssuesApi (HTTP) e IssuesStore (estado)
│       ├── components/           summary-cards, issue-toolbar, issue-table e issue-create-drawer
│       ├── pages/issues-page/    Página contenedora (container component)
│       └── issues.routes.ts
└── shared/                       Componentes de presentación reutilizables (badge, field-error, toast, logo)
```

**Decisiones de diseño**

- **Container / Presentational.**
  - `IssuesPage` es la única pieza que conoce el store.
  - `SummaryCards`, `IssueToolbar` e `IssueTable` son componentes de presentación: reciben datos por `input()` y emiten eventos con `output()`.
- **Estado con signals.** `IssuesStore` se provee a nivel de página:
  - Usa `rxResource` para la lista (reactiva a los filtros) y para el resumen.
  - Usa `computed()` para la búsqueda local.
  - Aplica **actualización optimista** al cambiar el estado o la prioridad, con rollback si falla.
- **Separación de responsabilidades.**
  - `IssuesApi` solo habla HTTP y convierte los DTO `snake_case` a modelos `camelCase`.
  - El store solo maneja el estado.
  - Los componentes solo se encargan de la presentación.
- **Sin comentarios en el código.** Los nombres son descriptivos y la documentación vive en los README.
- **DRY.** Los textos visibles y colores de estado y prioridad están centralizados en `issue.labels.ts`. El sistema de diseño se define con tokens CSS en `src/styles/`.

## Sesión y seguridad

- **Almacenamiento del JWT:** se guarda en `sessionStorage`, que se limpia al cerrar la pestaña. La sesión se valida al leerla (estructura y vencimiento).
- **Interceptor:** agrega `Authorization: Bearer` solo a las peticiones dirigidas a la API. Ante un `401` cierra la sesión y redirige al login con el aviso "sesión expirada".
- **Cierre automático:** un `effect()` programa el cierre de sesión en el momento exacto en que vence el token.
- **nginx en producción:**
  - Aplica una **Content Security Policy** estricta (`script-src 'self'`) y `frame-ancestors 'none'`.
  - Agrega HSTS, `nosniff`, `Referrer-Policy` y `Permissions-Policy`.
  - Se ejecuta con una imagen `nginx-unprivileged` (sin root).

## Rendimiento

- **Sin Zone.js:** la detección de cambios es por signals y todos los componentes usan `OnPush`.
- **Carga inicial pequeña:** ~85 kB transferidos; cada pantalla es un chunk lazy de entre 1 y 8 kB.
- **Caché y compresión:** assets con hash y `Cache-Control: immutable` por un año, `index.html` con `no-cache`, y compresión gzip en nginx.
- **Una sola petición por filtro:** los filtros de estado y prioridad se resuelven en Firestore con índices compuestos; la búsqueda de texto es local.

## Desarrollo

```bash
npm ci
npm start
npm test
npm run build
```

`npm start` levanta la aplicación en `http://localhost:4200` con proxy de `/api` hacia `http://localhost:8000` (ver `proxy.conf.json`).

## Despliegue

`Dockerfile` multi-stage:
1. Node 24 compila la aplicación.
2. `nginx-unprivileged` sirve el resultado.

La URL de la API se inyecta en tiempo de ejecución con la variable `API_UPSTREAM`, que el template de nginx resuelve con `envsubst`. Así una misma imagen sirve para cualquier ambiente.
