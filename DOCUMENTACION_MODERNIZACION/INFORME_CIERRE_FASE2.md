# Informe de Cierre — Modernización FASE 2

**Fecha:** 22 de noviembre de 2026  
**Estado general:** ✅ **FASE 2 implementada y validada en local/emulador** · ⛔ **sin publicar** · ⛔ FASE 3 no iniciada  
**Autorización recibida:** texto exacto del usuario: «si autorizo» (FASE 2). La publicación requiere autorización expresa separada.  
**Tipo de cambio:** aditivo. No se renombraron ni eliminaron campos históricos; no se modificaron datos de producción.

---

## 1. Qué se revisó

1. **Modelo de datos:** coexistencia de `department`, `unit`, `area`, `unidad` con el nuevo `departmentId`.
2. **Reglas Firestore:** validación opcional de campos nuevos y catálogo `departments` con escritura admin-only.
3. **API del portal:** `/api/departments`, permisos por ID de departamento, `/api/directory` y `/api/inconsistencies`.
4. **Interfaz:** nuevo catálogo, editor de departamentos, campo `allowedUnitIds` y filtro de avances por departamento.
5. **Permisos:** cuatro superficies sincronizadas (`DEFAULT_PERMS` de `firebase-auth.js`; `DEFAULT_PERMS`, `SUITE_PERMS` y `PERM_KEYS` de `accounts-ui.js`; `navMap`).
6. **Operación:** motores `matrix()` / `departmentMatrix()`, exportación y verificación/importación de respaldos.
7. **PWA y espejos:** `APP_SHELL`, versión de caché y sincronía raíz → `docs/` → `public/`.

---

## 2. Problemas encontrados

### Corregidos durante esta fase

| ID | Problema | Corrección |
|---|---|---|
| F2-01 | `ReferenceError: Cannot access 'departmentOf' before initialization` al cargar el portal | Se movió la asignación de `me.departmentId` después de definir los helpers de departamento. |
| F2-02 | Un perfil con **solo** `allowedUnitIds` no activaba la rama de consultas filtradas y podía recibir `PERMISSION_DENIED` | La condición de `list()` ahora considera `allowedUnits` **o** `allowedUnitIds`; `allowedUnits` se trata como arreglo opcional en todas las ramas. |
| F2-03 | Espejos `docs/` y `public/` desactualizados tras el último fix | `node sync-copies.mjs`: 56 archivos web, 116 copias. Se verificaron 11 hashes raíz/espejo idénticos. |
| F2-04 | Catálogo ausente en respaldos podía invalidar verificaciones | `verify-migration-backup.mjs` acepta `departments` como colección opcional; los respaldos FASE 1 siguen siendo válidos. |

### Preexistentes / no corregidos en FASE 2

| ID | Situación | Estado |
|---|---|---|
| Q-01 | `test-workspace.mjs` y `test-operational-pdf.mjs` dependen de `pdf-lib` en una ruta del harness ausente | Confirmado; reparación prevista en FASE 6, sin tocar la app. |
| P-01 | `test-ui-accounts.mjs` termina con `UI timeout:` | Confirmado contra archivos `public/` de HEAD; no es regresión de FASE 2. |
| P-02 | `test-workspace-linking.mjs` falla por `ReferenceError: esc is not defined` | Confirmado contra HEAD; no es regresión de FASE 2. |
| S-09 | Storage sin bucket en `sierra-madre-seguridad` | Bloquea preverificación de deploy; requiere decisión/alta del dueño. |
| QA-01 | Validación navegador autenticada de la sección «Departamentos» y de la cuenta `qa-op-…` | Pendiente: requiere sesión del dueño. No se crearon cuentas desde automatización. |

---

## 3. Archivos

### Nuevos

- `departments.js` — catálogo por defecto (10 departamentos) y helpers `id`, `of`, `name`, `byDepartment`, `duplicateAliases`, `withoutId`, `setCatalog`.
- `departments-ui.js` — alta/edición del catálogo, resumen y tabla; operaciones admin-only.
- `import-workspace-operational.mjs` — importador operativo en modo planificación por defecto; conserva `photos` y `photoChunkIds` y remapea UIDs.
- `test-departments.mjs` — prueba aislada de catálogo, IDs, agrupamiento e importador en modo seco.
- `test-departments-portal.mjs` — prueba con emulador Firestore de catálogo admin-only, `allowedUnitIds[]`, inconsistencias y normalización.
- `DOCUMENTACION_MODERNIZACION/INFORME_CIERRE_FASE2.md` — este entregable.

### Modificados en raíz

`formats.js`, `progress-core.js`, `firestore.rules`, `cloud-portal.js`, `firebase-auth.js`, `accounts-ui.js`, `workspace.js`, `supervisor.js`, `index.html`, `sw.js`, `sync-copies.mjs`, `package.json`, `verify-migration-backup.mjs`, `migrate-verified-workspace.mjs`.

### Espejos

`docs/` y `public/` regenerados desde la raíz. Se verificaron hashes idénticos para `cloud-portal.js`, `index.html`, `firebase-auth.js`, `accounts-ui.js`, `workspace.js`, `supervisor.js`, `sw.js`, `formats.js`, `progress-core.js`, `departments.js` y `departments-ui.js`.

### Conservados sin versionar

Los 7 artefactos preexistentes siguen fuera de commits: `archive-verified-backup.mjs`, `download-nom-pdfs.mjs`, `enrich_talks.py`, `extract_nom_meta.py`, `extract_nom_meta2.py`, `verify_noms.py`, `verify_noms2.py`.

---

## 4. Funcionalidades entregadas

1. **Catálogo aditivo:** `departments` con `id` estable, `name`, `aliases[]`, `activo`, `validFrom`/`validTo`, auditado con `createdBy`/`updatedBy`.
2. **UI admin-only:** botón «Departamentos», sección, diálogo de alta/edición, resumen y tabla. Bloquea alias duplicados.
3. **API:** `GET /api/departments` para miembros; `POST`/`PUT` solo administradores; `DELETE` bloqueado.
4. **Espejo `departmentId`:** se agrega a reportes, acciones, planes y perfiles sin borrar ni reescribir los textos históricos.
5. **Permisos por ID:** `allowedUnitIds[]` convive con `allowedUnits`; los nombres se normalizan a IDs estables y se deduplican.
6. **Reporte de avances:** `matrix()` acepta `department`, expone `departmentId` por fila y agrega `departmentMatrix()`; filtro, resumen y columna de ID en exportación.
7. **Inconsistencias:** `/api/inconsistencies` reporta registros con texto pero sin ID, departamentos no resolubles, aliases duplicados y agrupación `byDepartment`.
8. **Reglas Firestore:** campos nuevos opcionales y validados; catálogo solo administrable por admins; `deny` universal intacto; sin matches específicos para `reports`, `actions` ni `plans`.
9. **Respaldos e importación:** verificación admite catálogo ausente o presente; importador operativo funciona en modo planificación y conserva evidencia.
10. **PWA:** caché `sm-seguridad-v14` con los dos scripts nuevos en `APP_SHELL`.

---

## 5. Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| `npm.cmd run check` | PASS |
| `npm.cmd run test:rules` | PASS — 4 suites: reglas, portal, departamentos, suite normativa/capacitación |
| `test-departments.mjs` | PASS |
| `test-departments-portal.mjs` | PASS (emulador Firestore) |
| `npm.cmd test` | Avanza con 11 suites OK y se detiene en Q-01 (`pdf-lib`) |
| `test-migration-backup.mjs` | PASS |
| `test-backup-page.mjs` | PASS |
| `test-migration-preflight.mjs` | PASS |
| `test-inspection-excel-formats.mjs` | PASS |
| `test-save-close-flow.mjs` | PASS |
| `test-access.mjs` | PASS |
| `test-phase1-csv.mjs` | PASS |
| `test-phase1-backup-preview.mjs` | PASS |
| `test-page-shell.mjs` | PASS |
| `test-admin-users-ui.mjs` | PASS |
| `test-dom.mjs` | PASS |
| `test-ui-accounts.mjs`, `test-workspace-linking.mjs` | FAIL preexistentes, confirmados contra HEAD |
| `node sync-copies.mjs` | 56 archivos, 116 copias |
| Hashes raíz/`docs`/`public` (11 archivos) | Idénticos |

Los mensajes `PERMISSION_DENIED` durante `test:rules` corresponden a casos negativos intencionales; el script terminó con código 0.

---

## 6. Resultados

- **0 regresiones funcionales nuevas** detectadas en las superficies probadas.
- **0 escrituras a producción**, **0 migraciones**, **0 restauraciones**.
- **0 commits, 0 push, 0 deploy**. HEAD local y `public-pages/main` siguen en `e0110f1`; `origin/main` en `76ef8c8`.
- **0 secretos, tokens o credenciales** introducidos.
- Los campos `department`, `unit`, `area`, `unidad`, los mensajes «Avance Guardado» / «Finalizado» y el campo obligatorio «Persona observada» de «Liderazgo visible» se conservan.
- El sitio en vivo sigue sirviendo la versión previa; el cambio de caché a `v14` solo existe en el árbol local hasta que se publique.

---

## 7. Riesgos

| Prioridad | Riesgo | Mitigación / estado |
|---|---|---|
| **P0** | Registros históricos sin `departmentId` no son legibles por un perfil que solo tenga `allowedUnitIds` | Se conserva `allowedUnits` para esos casos y el importador aditivo puede agregar el ID en QA. No se reescribió producción. |
| **P0** | Storage sin bucket bloquea la preverificación de deploy | Requiere alta/decisión del dueño; no se intentaron escrituras remotas. |
| **P1** | Alias ambiguos entre departamentos | La API rechaza aliases duplicados y `/api/inconsistencies` los reporta. |
| **P1** | Sin validación navegador autenticada de la sección 7 ni de `qa-op-…` | Pendiente de sesión del dueño; no se crearon usuarios reales. |
| **P1** | Q-01 y dos fallos de prueba preexistentes | Documentados; se reparan en fases posteriores sin alterar la app. |
| **P2** | Cuatro pruebas FASE 1 requieren emuladores en puertos 8087/9199 | No se ejecutaron en este cierre; `test:rules` cubre Firestore en 8087. |

---

## 8. Pendiente

1. **Autorización expresa para publicar FASE 2** solo a `public-pages`, sin `--force`, sin Functions y sin tocar `origin`. Orden: frontend con PWA `v14` primero, reglas después.
2. Definir el alta del bucket de Storage antes de cualquier deploy que lo exija.
3. Validar en navegador, con sesión del dueño, la sección «Departamentos», el editor de `allowedUnitIds` y el reporte agrupado.
4. Ejecutar el importador operativo únicamente en QA/dry-run; cualquier aplicación a datos reales requiere autorización y respaldo verificados.
5. Reparar Q-01 en FASE 6 y los fallos P-01/P-02 en la fase correspondiente.
6. No iniciar FASE 3 sin nueva autorización.

---

## 9. Reversión

No hubo cambios de datos ni despliegue, por lo que no se requiere restaurar información. Para descartar los cambios de código basta con volver al árbol de HEAD `e0110f1`; el punto de restauración verificado sigue siendo `..\backups\sierra-madre-fase1-auditoria-20261122.bundle` (SHA-256 `6B9E3061E42FC4578DEDFB24155FC46B21323A9822A0856E0FCCCB2637F7B0A2`).

**Entrega:** FASE 2 cerrada en local con catálogo de departamentos, IDs estables de forma aditiva, permisos por ID, inconsistencias extendidas, importador operativo en modo planificación, reglas y PWA validadas. Sin publicar.
