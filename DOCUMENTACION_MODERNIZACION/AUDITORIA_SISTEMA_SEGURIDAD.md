# Auditoría del Sistema de Seguridad Industrial Sierra Madre

**Fecha:** 22 de noviembre de 2026  
**Fase:** FASE 1 — Auditoría técnica, respaldo y plan  
**Modalidad:** solo lectura sobre código y registros; sin escrituras en Firebase, sin commits, sin push, sin despliegues  
**Alcance:** repositorio `centinela/`, repositorios relacionados, sitio publicado y respaldos existentes

---

## 1. Identificación del repositorio real

| Elemento | Resultado |
|---|---|
| Directorio de trabajo fuente | `C:\Users\Dell\Documents\pagina seguridad atentos\centinela` |
| `origin` | `https://github.com/vicozero/sierra-madre-seguridad.git` — **no es la fuente de Pages**; `main` en `76ef8c8`, dividido |
| `public-pages` | `https://github.com/vicozero/vicozero.github.io.git` — **fuente real de `https://vicozero.github.io/`** |
| Rama de publicación | `fase1-validada-2026-11-17`, HEAD `e0110f1` |
| `public-pages/main` | `e0110f1`, idéntico al HEAD local |
| Fuentes servidas | **raíz del repositorio**. `docs/` y `public/` son espejos generados por `sync-copies.mjs` (56/56 archivos idénticos por SHA-256) |
| No servidos | `dist/` (artefacto antiguo de `build.mjs`), `worker/` y `functions/` (no desplegados en Pages) |

**Conclusión:** para cualquier cambio futuro se edita la **raíz**, se sincroniza con `node sync-copies.mjs` y, solo con autorización, se hace `git push public-pages HEAD:main`. Nunca se hace push a `origin`.

Evidencia: `CHECKLIST_PUBLICACION_FASE1.md:88,156,188-191,327-348`; `sync-copies.mjs:6-23`; `build.mjs:3`; `index.html:30`.

---

## 2. Arquitectura actual

```
Navegador / PWA
├─ index.html (shell, menú, diálogos)  →  firebase-auth.js (arranque, carga de módulos)
│  ├─ Núcleo: formats.js, extended-formats.js, supervisor.js, workspace.js, progress-core.js
│  ├─ Datos: cloud-portal.js (adaptador /api/* → Firestore), cloud-live.js, cloud-sessions.js
│  ├─ Suite: safety-suite-store.js, normative-library.js, training-suite.js, regulatory-core.js
│  ├─ UI: accounts-ui.js, phase3-ui.js, integration.js, session-clock.js, session-tracker.js
│  └─ Reportes: report-pdf.js, workspace-pdf.js + assets/pdf-lib.min.js (local)
├─ sw.js (caché sm-seguridad-v13, APP_SHELL, excluye /api/)
└─ Firestore (autoridad real: firestore.rules) + localStorage (preferencias / modo local)
```

- La autoridad de acceso está en **`firestore.rules`**, no en ocultar botones.
- `cloud-portal.js` intercepta `/api/*` en el navegador: es un adaptador de comodidad, no un backend.
- En GitHub Pages **no hay servidor**: `worker/` y `functions/` no ejecutan validaciones en producción.

---

## 3. Inventario de módulos (no rehacer lo que ya funciona)

| Módulo | Archivos | Estado |
|---|---|---|
| Acceso, roles, arranque | `firebase-auth.js`, `session-clock.js` | Completo |
| Portal de datos / API cliente | `cloud-portal.js` | Completo |
| Sincronización en vivo | `cloud-live.js` | Completo |
| Sesiones y transferencia | `cloud-sessions.js`, `session-tracker.js` | Completo |
| Usuarios y permisos | `accounts-ui.js` | Completo |
| Avisos internos | `accounts-ui.js`, `index.html` | Completo (sin correo/WhatsApp) |
| Dashboard / centro de control | `workspace.js`, `supervisor.js` | Completo, con discrepancias de KPI |
| Captura de formatos | `supervisor.js`, `formats.js`, `extended-formats.js` | Completo — 17 tipos |
| Programa mensual y metas | `workspace.js`, `progress-core.js` | Completo |
| Matriz y KPI 1/2 | `progress-core.js`, `KPI_FORMULAS.md` | Completo, con precisiones pendientes |
| Acciones correctivas | `workspace.js`, `cloud-portal.js` | Completo (semáforo, verificación, historial) |
| Hallazgos | tablas `findings` en formatos + `linkFindings` | **Parcial**: sin entidad propia ni folio |
| PDF y CSV | `report-pdf.js`, `workspace-pdf.js`, `workspace.js` | Completo, con defectos de maquetación |
| Biblioteca normativa | `normative-library.js`, `regulatory-core.js`, 44 normas | Completo |
| Pláticas y capacitación | `training-suite.js`, `training-core.js`, 52 temas | Completo |
| PWA / TWA | `sw.js`, `manifest.webmanifest`, `twa-manifest.json` | Instalable; offline parcial |
| Respaldos / importación | `backup-cloud-readonly.mjs`, `verify-migration-backup.mjs` | Parcial (ver §6) |

Código muerto o duplicado: `app.js`, `identity.js`, `demo-identity.js`, `nom-data.js`, `acciones.html`, `respaldo.html`, `dist/index.html`, definición duplicada de `observation` en `formats.js:35-36`. `worker/index.js` y `worker/app.js` son dos implementaciones; `build.mjs` usa solo `worker/app.js`.

---

## 4. Hallazgos por área

### 4.1 Arquitectura y gobernanza

| ID | Hallazgo | Severidad | Evidencia |
|---|---|---|---|
| A-01 | Triplicación raíz / `docs/` / `public/`: riesgo de editar una copia equivocada | Media | `sync-copies.mjs:6-23` |
| A-02 | Documentación con fechas y caché desactualizadas respecto al estado real | Media | `CHECKLIST_PUBLICACION_FASE1.md:6,8,18` vs `sw.js:2` |
| A-03 | Código muerto con identidad demo publicada | Baja | `identity.js:10-16`, `demo-identity.js:2-6` |
| A-04 | `worker/report-rules.js` es generado; editarlo a mano se pierde | Baja | `generate-report-rules.mjs:1` |

### 4.2 Seguridad y Firebase

| ID | Hallazgo | Severidad | Evidencia |
|---|---|---|---|
| S-01 | `profiles` permite `list` a cualquier operador activo: expone correos, roles y permisos ajenos | Media | `firestore.rules:54-56` |
| S-02 | Administradores secundarios pueden alterar campos del perfil principal salvo `role`/`active` | Media | `firestore.rules:57-65` |
| S-03 | `security/authority` legible por cualquier autenticado (UID del encargado) | Bajo-Medio | `firestore.rules:26-27` |
| S-04 | `auditLog` es append-only pero lo escribe el cliente: se puede contaminar la trazabilidad | Medio | `firestore.rules:197-203`, `safety-suite-store.js:17-28` |
| S-05 | `activeMs` de sesiones lo calcula el cliente | Bajo-Medio | `cloud-sessions.js:110-120` |
| S-06 | Sesión local restaurada sin reautenticación (solo modo local) | Medio | `firebase-auth.js:31,77-90,523-528` |
| S-07 | Definición de administrador distinta entre Firestore y Storage | Medio, latente | `storage.rules:4-6` vs `firestore.rules:16-24` |
| S-08 | Fragmentos de evidencia pueden quedar huérfanos si falla la transacción | Bajo | `cloud-portal.js:191-198` |
| S-09 | Storage rules **no desplegadas**: bucket no dado de alta | Medio | `CHECKLIST_PUBLICACION_FASE1.md:292,299-307` |

No se encontraron llaves privadas, service accounts ni tokens embebidos. La API key web es pública por diseño (`firebase-auth.js:4`).

### 4.3 Datos, respaldos e integridad histórica

| ID | Hallazgo | Severidad | Evidencia |
|---|---|---|---|
| D-01 | El importador oficial rechaza respaldos con `reports`/`actions`/`plans`: no sirve para datos operativos | Alto | `migrate-verified-workspace.mjs:9,39` |
| D-02 | El importador local→nube no transfiere fotos y atribuye registros al administrador si no hay cuenta | Alto | `firebase-auth.js:404,417-420,439` |
| D-03 | Evidencia fragmentada sin garantía de completitud; fragmentos huérfanos nunca se limpian | Alto | `cloud-portal.js:57-70,192-197` |
| D-04 | Departamentos, unidades y personas se guardan como texto libre, no como IDs | Medio-Alto | `formats.js:77`, `workspace.js:50-53`, `cloud-portal.js:20,45-52` |
| D-05 | Alias convivientes `unit` / `area` / `unidad` | Medio | `cloud-portal.js:174-176`, `firestore.rules:83-89` |
| D-06 | Snapshot de nube disponible sin registros operativos (0 reports/actions/plans) | Medio | `.qa/cloud-backups/2026-11-16T17-56-30-242Z.json` |
| D-07 | Reapertura de reportes sin evento de auditoría dedicado | Medio | `supervisor.js:1`, `firestore.rules:197-203` |

### 4.4 KPIs, reportes y pruebas

| ID | Hallazgo | Severidad | Evidencia |
|---|---|---|---|
| K-01 | **Tres motores de KPI distintos** producen cifras diferentes para el mismo mes | Alto | `progress-core.js:8`, `supervisor.js:1`, `report-pdf.js:8` |
| K-02 | PDF de avances con anchos e índices de columnas calculados para 6 grupos, hoy hay 10: columnas superpuestas y recortadas | **Crítico** | `workspace-pdf.js:16,22,24` |
| K-03 | PDF no son tamaño carta (960×540 y 1240×720 pt) | Alto | `report-pdf.js:3`, `workspace-pdf.js:3` |
| K-04 | `Por verificar` vencida no cuenta como vencida; documentación dice lo contrario | Medio | `progress-core.js:6`, `KPI_FORMULAS.md:60` |
| K-05 | No existen efectividad de cierre ni reincidencia | Medio | Sin implementación |
| K-06 | Tarjetas de avances ignoran filtros de unidad/nivel que sí aplica la matriz | Medio | `workspace.js:10,28` |
| K-07 | No hay `.xlsx` real, solo CSV | Medio | `package.json`, `workspace.js:55-57` |
| K-08 | No hay gráficos estadísticos (solo barras CSS) | Medio | `workspace.js:14,22,28` |
| K-09 | 15 de 30 pruebas no están enlazadas en `package.json` | Bajo | `package.json:4-10` |
| K-10 | `test-workspace.mjs`depende de `pdf-lib` en una ruta del harness no instalada | Medio (infraestructura) | `test-workspace.mjs:24` |

### 4.5 UX, PWA, notificaciones y auditoría

| ID | Hallazgo | Severidad | Evidencia |
|---|---|---|---|
| U-01 | Offline es solo de shell: sin cola de sincronización ni borradores offline | Alto | `sw.js:57-82`, `supervisor.js:2` |
| U-02 | El usuario puede creer que guardó sin conexión | Alto | `supervisor.js:2` |
| U-03 | Notificaciones internas solo con la app abierta; sin correo/WhatsApp/push | Alto | `index.html:1`, `twa-manifest.json:13` |
| U-04 | TWA con notificaciones desactivadas y huella de firma pendiente | Alto | `twa-manifest.json:13,27,35`, `.well-known/assetlinks.json:1` |
| U-05 | Sin bitácora general consultable en UI | Alto | Sin referencia a `auditLog` en UI |
| U-06 | Historial sin valores anteriores/nuevos ni motivo | Alto | `cloud-portal.js:225` |
| U-07 | Reprogramación sin fecha original ni justificación | Alto | `workspace.js:32,49`, `cloud-portal.js:208-211` |
| U-08 | Catálogos de departamentos/áreas/turnos hardcoded o inexistentes | Medio | `formats.js:3-41`, `worker/app.js:21-23` |
| U-09 | Tablas anchas requieren scroll horizontal en móvil (verificar en dispositivo) | Bajo-Medio | `phase3.css:106-154` |

---

## 5. Respaldos existentes

Cinco `git bundle` pasaron `git bundle verify` con «complete history». Existe además un ZIP de árbol y un snapshot Firestore parcial verificado por SHA.

**Nuevo respaldo generado en esta FASE 1 (sin restore):**

| Archivo | Fecha | Tamaño | SHA-256 | Verificación |
|---|---|---|---|---|
| `..\backups\sierra-madre-fase1-auditoria-20261122.bundle` | 22-11-2026 | 24,782,391 bytes | `6B9E3061E42FC4578DEDFB24155FC46B21323A9822A0856E0FCCCB2637F7B0A2` | `git bundle verify` OK — complete history, HEAD `e0110f1` |

Detalle completo en `MODELO_DATOS_SEGURIDAD.md`, sección 6.

---

## 6. Línea base de pruebas (FASE 1)

| Prueba | Resultado |
|---|---|
| `npm.cmd run check` | PASS |
| `test-inspection-excel-formats.mjs` | PASS |
| `test-save-close-flow.mjs` | PASS |
| `test-dom.mjs` | PASS |
| `test-all-forms.mjs` | PASS |
| `test-operational-forms.mjs` | PASS |
| `test-page-shell.mjs` | PASS |
| `test-normative-library.mjs` | PASS |
| `test-training-suite.mjs` | PASS |
| `test-workspace.mjs` | Aserciones KPI PASS; fallo posterior por `pdf-lib` no instalado en la ruta del harness |

Sin escrituras en Firebase ni en registros productivos. Detalle en `REPORTE_PRUEBAS_SEGURIDAD.md`.

---

## 7. Priorización de correcciones

| Prioridad | Ítems |
|---|---|
| **P0 — antes de cualquier Fase 2** | K-02 (PDF de avances), D-01/D-02/D-03 (importación y evidencia), U-05/U-06/U-07 (auditoría y fechas), S-09 (Storage) |
| **P1 — Fases 2-5** | D-04/D-05 (IDs y catálogo), K-01/K-04/K-06 (unificación KPI), S-01/S-02/S-04/S-07, U-08 |
| **P2 — Fases 6-8** | K-03/K-05/K-07/K-08 (carta, efectividad, Excel, gráficos), U-01/U-02/U-03/U-04, A-01/A-02/A-03 |

---

## 8. Lo que NO se debe hacer

- No reconstruir la aplicación ni sustituir módulos funcionales.
- No cambiar la identidad visual Sierra Madre.
- No borrar colecciones ni registros históricos.
- No migrar datos de producción sin procedimiento verificado y autorización.
- No publicar ni hacer push sin autorización expresa.
- No introducir secretos, tokens ni credenciales en código, reportes o repositorio.
