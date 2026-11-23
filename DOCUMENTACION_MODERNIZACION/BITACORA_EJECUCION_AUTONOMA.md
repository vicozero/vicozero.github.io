# Bitácora de ejecución autónoma — Centinela Seguridad Industrial

Fecha de inicio: 2026-11-22  
Modo: autónomo; implementación y verificación locales hasta autorización expresa, con cierre publicado y desplegado el 22-11-2026.  
Línea base: `e0110f11e7f1eafaa5f52b7c4a12332654a21233` (FASE 2 cerrada localmente).

## Punto de recuperación

- Ruta: `..\backups\centinela-pre-autonomo-20261122-2325`
- Archivos copiados: 191
- `MANIFEST.sha256`: `B0808F193EFA2D3C876CE3A9767B620738521FF8659B9313E4AB3C8DA14F9A5D`
- Verificación: manifiesto vuelto a calcular al cierre; SHA-256 idéntico.

## Correcciones previas a FASE 3

### Q-01 — `pdf-lib`

- Causa: los harnesses `test-workspace.mjs` y `test-operational-pdf.mjs` intentaban resolver `pdf-lib` desde una ruta externa inexistente (`C:/Users/Dell/.cache/codex-runtimes/...`).
- Corrección: se usa la copia vendored `assets/pdf-lib.min.js`, cargada con `vm.runInThisContext` y `globalThis.self=globalThis` para compatibilidad UMD en ESM.
- No se instalaron dependencias externas ni se ocultó el error.
- Resultado:
  - `node test-workspace.mjs`: PASS.
  - `node test-operational-pdf.mjs`: PASS (PDF de matriz y 3 formatos operativos válidos).

### `test-workspace-linking.mjs`

- Causa 1: los scripts se evaluaban por separado y `esc` no compartía ámbito, a diferencia de los scripts clásicos del navegador.
- Corrección 1: evaluación concatenada de `formats.js`, `extended-formats.js`, `progress-core.js`, `supervisor.js`, `workspace.js` y `accounts-ui.js`.
- Causa 2: los fixtures de reporte no incluían `updated`, necesario para ordenar registros recientes.
- Corrección 2: se agregó `updated` determinista a los tres fixtures.
- Resultado: PASS. Se conservan las aserciones de vinculación sin duplicados, VEO/INC/OBS, permisos nuevos sin concesión automática y transferencia administrativa separada.

### `test-ui-accounts.mjs`

- Causa: el harness asumía scripts `type="module"` y una API worker inalcanzable desde JSDOM 31; además la app actual instala un store local que intercepta `/api/`.
- Corrección: harness reescrito sobre la arquitectura real:
  - se eliminan los `import` de `firebase-auth.js` y se sustituyen por stubs explícitos de Firebase en el límite de autenticación;
  - se cargan los scripts clásicos reales en el mismo orden que el navegador;
  - se usa `sm-local-session` para abrir la sesión local real;
  - se conservan las verificaciones de tema, alta de usuario con contraseña obligatoria, rol, captura propia, aislamiento de espacio, avisos vinculados, notificaciones y portada sin acceso.
- No se debilitaron validaciones de seguridad: la creación de usuario ahora cumple el requisito real de contraseña.
- Resultado: PASS.

### Integración de regresión

- `package.json` ejecuta las pruebas de regresión previas y las nuevas suites aditivas.
- Resultado final: `npm.cmd test` PASS (22 suites).

## FASE 3 — Supervisiones avanzadas

- Objetivo: supervisión avanzada aditiva sin reemplazar los 17 formatos históricos.
- Cambios:
  - `advanced-core.js`: folio único por tipo/fecha, `dedupeKey` determinista, clasificación de riesgo, cierres, reprogramación y helpers de auditoría.
  - `advanced-ui.js`: vista de supervisión avanzada con checklist, evidencias, borrador/finalización/reapertura, historial y plantillas reutilizables.
  - Persistencia local y nube para `findings` e `inspectionTemplates` sin reescribir `reports`/`actions`/`plans`.
- Corrección real detectada: la lista de supervisiones solo leía arreglos globales; ahora también consume `/api/reports` y `/api/actions` cuando los globales están vacíos.
- Pruebas: `test-advanced-core.mjs` y `test-advanced-ui.mjs` PASS.
- Pendiente: la carga de fotografías dependiente de Storage no se activa.

## FASE 4 — Hallazgos y acciones

- Objetivo: hallazgo vinculado, riesgo, semáforo independiente y seguimiento visual.
- Cambios:
  - Tabla y Kanban de hallazgos, filtros por riesgo/semáforo/búsqueda y cierre con verificación de seguridad para riesgos críticos.
  - Un incumplimiento genera exactamente un hallazgo y una acción vinculada; los reintentos se bloquean por deduplicación.
  - Semáforo `Rojo/Amarillo/Verde/Gris` calculado desde compromiso real; `Gris` aplica cuando no hay fecha o el registro está cancelado.
  - Exportación Excel y PDF de hallazgos; evidencias antes/después se conservan en el modelo histórico de `photos`/`photoChunkIds`.
- Corrección real: la aserción del semáforo como `Gris` se ajustó a la semántica correcta; no se debilitó la lógica de riesgo.
- Pruebas: `test-advanced-core.mjs` y `test-advanced-ui.mjs` PASS.

## FASE 5 — Dashboard y KPIs

- Objetivo: centro ejecutivo azul marino con 10 indicadores, gráficos reales y matriz por departamento.
- Cambios:
  - `computeKpis()` calcula programadas, realizadas, cumplimiento, pendientes, atrasadas, hallazgos abiertos, acciones en proceso/vencidas/cerradas, criticidad y tendencia.
  - Los borradores no cuentan como finalizados: solo `status === 'Finalizado'` suma a realizadas.
  - Matriz expandible por departamento con filtros de periodo, unidad, supervisor, tipo y riesgo.
- Pruebas: `test-advanced-core.mjs` y `test-advanced-ui.mjs` validan 10 KPIs y matriz; PASS.

## FASE 6 — Reportes y calendario

- Objetivo: PDF carta, reporte mensual ejecutivo, Excel y calendario con reprogramación controlada.
- Cambios:
  - `advanced-pdf.js`: PDF de supervisión y reporte mensual ejecutivo en carta, con metadatos de folio/periodo verificables.
  - Calendario mensual/semanal; reprogramación exige nueva fecha válida y motivo, guarda fecha original, autor y contador.
- Defecto real corregido: el helper de colores devolvía objetos planos y `pdf-lib` rechazaba el color; se sustituyó por `PDFLib.rgb(...)`. La prueba de bytes crudos también era inválida porque el texto PDF va comprimido; ahora carga el PDF y valida metadatos, páginas y tamaño carta.
- Prueba: `test-advanced-pdf.mjs` PASS.

## FASE 7 — Diseño, accesibilidad y PWA

- Objetivo: experiencia responsive y PWA sin sincronización offline insegura.
- Cambios:
  - `phase3.css`: breakpoints para 800px y 480px, `focus-visible` y `prefers-reduced-motion`.
  - `index.html`: `lang="es"`, viewport, manifiesto, `aria-label` en control de menú y `role="status"` en avisos.
  - `sw.js`: caché `sm-seguridad-v15`, APP_SHELL con los tres módulos avanzados, respuesta 503 explícita para recursos no disponibles.
- Límite verificado: la caché es estática; `/api/` se excluye, no hay `sync` events ni colas de escrituras offline. La sincronización offline segura queda documentada como pendiente, no simulada.
- Prueba: `test-pwa.mjs` PASS.

## FASE 8 — Reglas, notificaciones internas y auditoría

- Objetivo: colecciones aditivas con permisos reales en Firestore y trazabilidad inmutable.
- Cambios:
  - `firestore.rules`: reglas para `findings`, `inspectionTemplates`, `advanceAlerts` y `auditTrail`; match unificada `match /{kind}/{recordId}` conservada para `reports`/`actions`/`plans`.
  - `firestore.indexes.json`: índices para hallazgos, alertas y auditoría.
  - `cloud-portal.js`: GET de `auditTrail` solo administrativo; listado de alertas filtrado por destinatario y plantillas sin filtro de propietario.
  - `firebase-auth.js`: filtro local de alertas por destinatario y `createdAt` por defecto.
  - `advanced-ui.js`: Generación de alertas internas para hallazgos `Crítico`/`Alto` dirigidas a cuentas administrativas/supervisoras activas; `createdAt` se fija en servidor en la nube.
- Defectos reales detectados y corregidos por las pruebas de reglas:
  1. Un operador podía cambiar `ownerAccountId`/`assignedAccountId` de un hallazgo.
  2. `canEdit()` usa valor por defecto `true`; se añadió `canEditAdvanced()` con concesión explícita para las colecciones nuevas.
  3. Cualquier miembro podía listar todas las alertas; ahora el listado exige filtro por destinatario o administrador.
  4. `/api/auditTrail` no tenía endpoint GET en la nube; ahora está disponible solo para administradores.
- Límites: no se activaron Storage, envíos externos, cuentas QA reales ni evasión de accesos.
- Prueba: `test-firestore-rules.mjs` ampliado con 30+ aserciones de permisos; `npm.cmd run test:rules` PASS (4 suites).

## FASE 9 — Integración, optimización y consistencia

- `npm.cmd run check`: PASS.
- `npm.cmd test`: PASS, 24 suites tras la validación autenticada (22 en la publicación inicial, 23 en el primer cierre).
- `npm.cmd run test:rules`: PASS, 6 suites (reglas, portal, departamentos, suite, Storage y reporte admin) tras el cierre técnico; 4 en la publicación inicial.
- Espejos: `npm.cmd run sync` → 61 archivos web, 122 copias; verificación SHA-256 61/61 archivos en raíz, `docs/` y `public/` sin discrepancias.
- Scripts y estilos nuevos incluidos en `index.html`, `phase3.css`, `sw.js` y `package.json`.
- Commit de publicación: `3818b776ea7d75a33e987a6df2ac2d3e08960d87` — `feat: modernizacion aditiva FASES 3-9 con reglas, PWA y documentacion final`.
- `origin/main`: `76ef8c864c02bf30488a3493e1e379b6210eb262` (sin cambios).
- `public-pages/main`: `3818b776ea7d75a33e987a6df2ac2d3e08960d87`; push fast-forward `e0110f1..3818b77`, sin `--force`.
- Despliegue: reglas compilaron y 4 índices se desplegaron en `sierra-madre-seguridad` con Firebase CLI autenticado.
- Verificación en vivo de la publicación inicial: `sw.js` con `CACHE_NAME = 'sm-seguridad-v15'`, módulos avanzados HTTP 200 y `Cache-Control: max-age=600`. Los cierres posteriores elevaron la caché a v16 y v17.
- Los 7 artefactos sin versionar se conservan: `archive-verified-backup.mjs`, `download-nom-pdfs.mjs`, `enrich_talks.py`, `extract_nom_meta.py`, `extract_nom_meta2.py`, `verify_noms.py`, `verify_noms2.py`.

## Estado de autorizaciones y dependencias

- Autorización recibida: «autorizo , continua», aplicada a publicación en `public-pages` y despliegue de reglas/índices.
- Ejecutado: commit, push a `public-pages/main` y deploy de Firestore. No se tocó `origin`, no se usó `--force` y no se crearon Functions.
- Sitio en vivo verificado con parámetro de caché: PWA v15 inicial, v16 en el primer cierre y v17 tras corregir la navegación; módulos avanzados disponibles.
- Firebase Storage sigue sin bucket (`403 accountDisabled`), pero el propietario descartó facturación: ya no es dependencia. No se evadió facturación.
- Validación navegada con cuenta real del propietario: realizada, sin cuentas QA ni simulación.
- Publicaciones futuras solo a `public-pages`, sin `--force`, nunca a `origin`, con autorización expresa.
- Clasificación final: **LISTO PARA PUBLICACIÓN** (desplegado y validado con sesión real).

## Cierre técnico adicional (23-11-2026)

- Defecto detectado en navegador real: la portada pública consultaba seis rutas `/api/` sin sesión y GitHub Pages respondía 404. Corrección: `advanced-ui.js` espera a `sm:auth`; `firebase-auth.js` emite el evento en `launch()`, `launchFirebaseAdmin()` y `launchLocal()`.
- Nueva prueba `test-advanced-ui-auth-gate.mjs`: sin sesión no hay llamadas `/api/`; con `sm:auth` se cargan las seis colecciones. `npm.cmd test`: 23/23 PASS.
- Consulta de infraestructura: `defaultBucket` → 404; Firestore en `nam5`; bucket planeado `sierra-madre-seguridad.firebasestorage.app` en `US`.
- Intento autorizado de creación del bucket: `403 accountDisabled` («billing account … disabled in state absent»). Sin evasión, sin cambios de facturación.
- `storage.rules` alineada con `firestore.rules` (S-07): principal + perfil admin activo, `activeOperator`, `allowedUnitIds`, `canViewAll`/`canRead`/`canEdit`, evidencia inmutable y avisos restringidos. Verificada con emulador Storage.
- `npm.cmd run test:rules` ampliado a 6 suites con emuladores Firestore y Storage: 6/6 PASS. PWA elevada a `sm-seguridad-v16`; `npm.cmd run check` PASS; `npm.cmd run sync` 61 archivos / 122 copias.
- Verificación en vivo tras la propagación: `sw.js` v16, módulos actualizados, 0 errores de consola y 0 solicitudes `/api/` en la portada pública.

## Validación navegada autenticada (23-11-2026)

- El propietario inició sesión con su cuenta real. `AUTH`: UID `Kgwk4gK0yxYJQMZZaggIyl2xtnh2`, correo `vicozero559@gmail.com`, rol `admin`, activo, 15/15 permisos en `true`. Pantalla de acceso oculta y `body.dataset.role = admin`.
- Recorrido sin escrituras por `dashboard`, `notices`, `users`, `departments`, `reports`, `actions`, `progress`, `team` y `program`: 0 errores de consola. Datos observados: 5 formatos (1 finalizado), 1 acción vencida, 4 avisos con adjuntos, 0 departamentos.
- Defecto encontrado: las cuatro vistas de «GESTIÓN AVANZADA» lanzaban `TypeError: Cannot read properties of undefined (reading '0')` en `supervisor.js` y no abrían. Causa: `supervisor.js` se carga después y sobrescribe `globalThis.navigate` con una función que solo conoce vistas históricas.
- Corrección en `advanced-ui.js` (`openView` local con marca `__smAdvanced`, reinstalación en `sm:auth`, delegación histórica) y en `supervisor.js` (delegación de `advanced*` a `SMAdvancedUI.navigate` y ocultado de secciones avanzadas). Nueva suite `test-advanced-navigation-conflict.mjs`.
- `npm.cmd run check`: PASS. `npm.cmd test`: 24/24 PASS. `npm.cmd run test:rules`: 6/6 PASS. `npm.cmd run sync`: 61 archivos / 122 copias; SHA-256 61/61 sin discrepancias.
- Commit `93e23e373ea086ca1425263d46fee3dbad671609`: PWA `sm-seguridad-v17` y navegación avanzada corregida; push fast-forward a `public-pages/main`, sin `--force`, `origin/main` intacto.
- Tras la propagación se repitió la navegación en navegador con la sesión real: cuatro vistas avanzadas y nueve históricas sin `TypeError` y consola en 0 errores. Sin datos modificados.
- Clasificación: **LISTO PARA PUBLICACIÓN**. Storage/facturación descartados por decisión del propietario.
