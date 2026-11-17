# Auditoría Fase 1 — Corregida y validada

**Fecha:** 17 de noviembre de 2026 (validación final)  
**Proyecto:** `centinela/` — **Sitio:** `https://vicozero.github.io/`  
**Referencia:** `AUDITORIA_FASE1_2026-11-17.md` y correcciones previas de Fase 1.  
**Estado:** **Fase 1 técnicamente validada y consolidada en un punto de restauración Git.** No se desplegó en GitHub Pages, no se publicaron reglas de Firebase, no se migraron/restauraron datos productivos ni se inició la Fase 2. Detalle en `CHECKLIST_PUBLICACION_FASE1.md`.

---

## 1. Estado final

| Concepto | Resultado |
|---|---|
| Java para emuladores | **RESUELTO** — JDK 21 ya instalado (OpenJDK 21.0.9 en `C:\Program Files\Android\Android Studio\jbr`). No requirió instalación ni autorización. Se configuró `JAVA_HOME`/`PATH` solo para la sesión de pruebas. |
| Pruebas críticas Firebase Emulator | **4/4 PASS** (`test-firestore-rules.mjs`, `test-cloud-portal.mjs`, `test-phase1-units.mjs`, `test-phase1-storage.mjs`). |
| Pruebas adicionales Emulator | **2/2 PASS** (`test-phase1-extras.mjs`, `test-suite-store.mjs`). |
| Pruebas locales (suite + nuevas) | **17/17 PASS**. |
| Total | **23 PASS · 0 FAIL · 0 BLOCKED** (pruebas críticas). |
| Sincronización `docs/` y `public/` | **OK** — 55 archivos, 112 copias; hashes coinciden en los archivos modificados. |
| Despliegue | **NO REALIZADO** (requiere autorización expresa). |

---

## 2. Java / entorno (sección 1 del instructivo)

- `java -version` (PATH original): **Java 8 (1.8.0_503)** → insuficiente para `firebase-tools` 15.
- `JAVA_HOME` apuntaba a `C:\Program Files\Android\Android Studio\jbr`.
- Se comprobó ese JBR: **openjdk version "21.0.9"** (OpenJDK 64-Bit Server VM) → compatible.
- `winget` disponible, pero **no se instaló nada** (JDK compatible ya presente).
- Se exportó en cada sesión: `$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"; $env:PATH="$env:JAVA_HOME\bin;$env:PATH"`.
- **Firebase Emulator inició correctamente** (Firestore + Storage, proyecto `demo-sierra-madre`, puertos 8087/9199 según `firebase.json`).

---

## 3. Corrección adicional detectada y aplicada en esta validación

**Causa comprobada:** la validación estricta agregada en la revisión anterior a `firestore.rules` exigía `type`, `date` y `supervisor` en **toda** escritura de reportes, `description`/`owner` no vacíos en acciones y `person`/`unit`/`department` en planes. Esto bloqueaba operaciones legítimas reales:

- `supervisor.js` crea borradores sin `supervisor` (solo lo asigna para cuentas no administrador).
- `workspace.js` crea acciones con `description:''`, `unit:''`, `owner` posiblemente vacío.
- `workspace.js` crea planes con `{period, kpi, targets, revision}` (sin `person`/`unit`/`department`).

**Corrección mínima (no desactivar reglas):** se reescribieron `validActionWrite`, `validReportWrite` y `validPlanWrite` para:
- exigir `status` válido (enum) en reportes/acciones;
- **verificar tipo/formato/rango de cada campo crítico cuando está presente** (fechas `YYYY-MM-DD`, `progress` 0–100 entero, longitudes, enum de prioridad/estado, `photos`/`photoChunkIds` como listas, `targets` como mapa);
- exigir coherencia solo en estados terminales: acción `Cerrado` ⇒ `progress == 100`, `verifiedDate` válida y `verifier` no vacío (el portal ya asigna `record.verifier = me.name` para administradores).

Se mantuvieron intactas propiedad/asignación, unidad/área, permiso por operación, `revision + 1`, inmutabilidad y reglas de Storage. **No se deshabilitaron reglas de seguridad.**

---

## 4. Correcciones existentes validadas (sección 3 del instructivo)

| # | Verificación | Resultado / evidencia |
|---|---|---|
| 1 | Fotografías no desaparecen en ediciones parciales | **PASS** — `test-cloud-portal.mjs` guarda evidencia fragmentada, hace PUT solo con metadatos y comprueba que `photos` se conserva; línea 223 de `cloud-portal.js` (`body.photos===undefined ? old.photos/photoChunkIds : ...`). |
| 2 | Fragmentos incompletos generan avisos | **PASS** — `test-phase1-extras.mjs`: con un `photoChunkIds` con un fragmento ausente, `list()` recupera el disponible y expone `_missingPhotoChunks` + `_photoRecoveryError`. |
| 3 | Supervisores por UID cuando existe | **PASS** — `test-phase1-extras.mjs`: acción con `assignedAccountId:'op2'` conserva el UID y actualiza el nombre desde el perfil. |
| 4 | Sin reasignación ante responsables ambiguos | **PASS** — `test-phase1-extras.mjs`: dos perfiles homónimos (`Juan Perez` / `Juan Pérez` normalizan igual) ⇒ no se asigna `assignedAccountId` y se marca `_identityWarning`. |
| 5 | `/api/inconsistencies` solo administradores | **PASS** — `test-phase1-extras.mjs`: admin → 200 con homónimos, evidencia incompleta y fragmentos huérfanos; operador → 403. |
| 6 | Respaldos detectan duplicados y campos sensibles | **PASS** — `test-migration-backup.mjs` + `test-phase1-backup-preview.mjs` (huella, duplicados, IDs, `passwordHash`, `accessToken`). |
| 7 | Previsualización de importaciones sin escrituras | **PASS** — `test-phase1-backup-preview.mjs`: `preview:true` produce plan {1 a agregar} y **cero** PUT/POST; la importación confirmada sí emite PUT. |
| 8 | Compatibilidad de registros históricos | **PASS** — `test-cloud-portal.mjs` importa todos los registros operativos de `.qa/operational/records.json` (9 formatos) y los guarda/finaliza/reabre correctamente. |
| 9 | Modo local con advertencias | **PASS (estático + suite)** — `firebase-auth.js` marca `SM_LOCAL_MODE`/`data-storage="local"`, actualiza `#sync` y muestra aviso; `brand.css` agrega el distintivo. Cubierto por `test-page-shell.mjs` y `test-auth-theme.mjs`. |
| 10 | Formatos existentes siguen funcionando | **PASS** — `test-all-forms.mjs` (15 formatos) y `test-operational-forms.mjs` (VEO/INC/TRN): borrador, finalización, bloqueo, reapertura y edición. |

---

## 5. Exportaciones (sección 4 del instructivo)

| Prueba | Comando | Resultado |
|---|---|---|
| PDF operativo (VEO, INC, TRN) | `node test-operational-pdf.mjs` | **PASS** — PDF válidos de 3, 3 y 2 páginas. |
| PDF matriz/acciones (workspace) | `node test-workspace.mjs` | **PASS** — PDF de matriz generado y reabierto. |
| CSV (nueva prueba enfocada) | `node test-phase1-csv.mjs` | **PASS** — BOM UTF-8, acentos, comillas dobles, neutralización de fórmulas (`=`, `+`, `@`, `-`), CRLF y `Blob` con `text/csv;charset=utf-8;`. |
| Descarga real en navegador autenticado | — | **PENDIENTE (validación manual)** — no hay navegador automatizado con cuenta autorizada. No se declara aprobada. |

No existía prueba CSV previa; se agregó `test-phase1-csv.mjs`. Las exportaciones no fueron modificadas en esta fase.

---

## 6. Comandos ejecutados

```powershell
java -version
# JAVA_HOME = C:\Program Files\Android\Android Studio\jbr  (OpenJDK 21.0.9)

$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"

.\node_modules\.bin\firebase.cmd emulators:exec --only firestore,storage --project demo-sierra-madre `
  "node test-firestore-rules.mjs && node test-cloud-portal.mjs && node test-phase1-units.mjs && node test-phase1-storage.mjs"

.\node_modules\.bin\firebase.cmd emulators:exec --only firestore --project demo-sierra-madre "node test-phase1-extras.mjs"
.\node_modules\.bin\firebase.cmd emulators:exec --only firestore --project demo-sierra-madre "node test-suite-store.mjs"

node test-page-shell.mjs
node test-auth-theme.mjs
node test-cloud-session-ui.mjs
node test-session-clock.mjs
node test-regulatory-training.mjs
node test-normative-library.mjs
node test-training-suite.mjs
node test-all-forms.mjs
node test-operational-forms.mjs
node test-operational-pdf.mjs
node test-dom.mjs
node test-workspace.mjs
node test-migration-backup.mjs
node test-backup-page.mjs
node test-migration-preflight.mjs
node test-phase1-backup-preview.mjs
node test-phase1-csv.mjs

node sync-copies.mjs
node --check firestore.rules   # (reglas validadas por el emulador al cargarlas)
```

**Nota:** los mensajes `PERMISSION_DENIED` en la salida del emulador corresponden a casos `assertFails` esperados; el script del emulador terminó con **code 0** en todas las ejecuciones.

---

## 7. Archivos modificados

**Fuente (Fase 1 + esta validación):**
- `firestore.rules` — validaciones compatibles de campos críticos (esta validación); permisos/unidades/evidencias de la revisión previa.
- `cloud-portal.js` — recuperación de evidencias, no reasignación ambigua, `/api/inconsistencies`, preservación de fotos (revisión previa; **sin cambios en esta validación**).
- `firebase-auth.js` — previsualización de importación, bloqueo de campos sensibles, indicadores de modo local (revisión previa; **sin cambios en esta validación**).
- `verify-migration-backup.mjs` — detección de credenciales, advertencias, `planImport` (revisión previa).
- `brand.css` — estilos de modo local (revisión previa).

**Pruebas agregadas en esta validación:**
- `test-phase1-extras.mjs` — evidencias/fragmentos, homónimos, UID, inconsistencias solo admin.
- `test-phase1-backup-preview.mjs` — credenciales/duplicados y preview sin escrituras.
- `test-phase1-csv.mjs` — exportación CSV.

**Copias sincronizadas:** `docs/` y `public/` de los archivos web (`cloud-portal.js`, `firebase-auth.js`, `brand.css`, etc.). Hashes verificados: **MATCH**.

---

## 8. Clasificación final

- **CORREGIDO Y PROBADO:** validaciones Firestore y Storage en emulador; aislamiento por unidad/permiso; portal (guardado/consulta/conflicto/avisos/cuenta no autorizada); suite normativa/pláticas; evidencias fragmentadas y huérfanas; no reasignación ambigua; UID; `/api/inconsistencias` admin-only; respaldos (integridad, duplicados, credenciales); previsualización sin escrituras; modo local; 15 formatos + 3 operativos; PDF y CSV.
- **CORREGIDO, PENDIENTE DE VALIDACIÓN EN NAVEGADOR:** descarga real de PDF/CSV con cuenta autenticada; flujo visual de importación con previsualización y del reporte de inconsistencias; avisos visuales de modo local/sin conexión en dispositivo real.
- **PENDIENTE:** conciliación administrativa de identidades/unidades históricas ambiguas (por diseño no se reasigna automáticamente); certificación de restauración completa de todos los casos/evidencias.
- **REQUIERE AUTORIZACIÓN:** publicación de reglas Firebase, despliegue web a GitHub Pages, migración/restauración de datos productivos, cambios de configuración/plan/credenciales.

---

## 9. Riesgos restantes

- **MEDIO:** las reglas modificadas están probadas en emulador con datos de prueba, no con el volumen/casos límite de producción. Requiere despliegue en/staging con autorización.
- **MEDIO:** la verificación de descarga PDF/CSV en navegador autenticado es manual y no automatizada.
- **BAJO:** el reporte de fragmentos huérfanos depende de que el administrador pueda listar `evidenceChunks` (permiso `list` ya restringido a administrador). No se elimina nada automáticamente.
- **BAJO:** el modo local no equivale a un entorno multiusuario protegido; queda señalizado en la UI.

---

## 10. Requisitos antes de producción (sin ejecutar)

1. Obtener **autorización expresa** para publicar reglas y desplegar la app.
2. Ejecutar validación manual autenticada de PDF/CSV, importación con previsualización, `/api/inconsistencias` y avisos de modo local/sin conexión.
3. Revisar el reporte de inconsistencias con datos reales **antes** de cualquier reasignación (nunca automática).
4. Verificar respaldos verificados y previsualización antes de cualquier restauración.

---

## 11. Conclusión

**La Fase 1 se considera técnicamente validada:** todas las pruebas críticas de seguridad pasan (23 PASS, 0 FAIL, 0 BLOCKED) y no existen fallos críticos reproducibles. No se realizó ningún despliegue ni modificación de datos productivos. **Detenido a la entrega del informe; no se inició la Fase 2.**

---

## 12. Cierre de preparación de publicación (esta entrega)

| Concepto | Resultado |
|---|---|
| Punto de restauración | **Creado** — rama `fase1-validada-2026-11-17` desde `main` @ `312da55`, etiqueta `fase1-validada-2026-11-17-final`, con el estado validado confirmado. Sin `push`. |
| Versionado | 79 archivos modificados + 19 nuevos esenciales (informes, `test-*.mjs`, `library-page.js` y sus copias, `verify-migration-backup.mjs`, `migrate-verified-workspace.mjs`) incluidos. Artefactos puntuales y `firebase-migration-config.json` quedan fuera (`.gitignore` / criterio de alcance). |
| Credenciales / datos sensibles | **Sin secretos privados.** Solo la API key pública web de Firebase en `firebase-auth.js` y sus copias `docs/` y `public/`; `passwordHash` aparece como nombre de campo y lógica de exclusión. `firebase-migration-config.json` no se versiona. |
| Sitio live (solo lectura) | `https://vicozero.github.io/` carga con título correcto, pantalla de acceso y **0 errores de consola**. Sin sesión autenticada. |
| Validaciones manuales autenticadas | **PENDIENTES** — descarga PDF/CSV, previsualización visual de respaldos, `/api/inconsistencies` admin (200) y no-admin (403), avisos en dispositivo. Sin cuentas de prueba autorizadas; la lógica ya está cubierta en emulador. **No se declaran aprobadas.** |
| Documento de despliegue | **Creado** — `CHECKLIST_PUBLICACION_FASE1.md`: estado de pruebas, validaciones completadas/pendientes, archivos a publicar, orden de despliegue, reversión web y de reglas, riesgos y confirmación de no modificación de datos. |
| Datos productivos | **Sin cambios.** Pruebas en emulador `demo-sierra-madre` y archivos aislados; sin migración, restauración ni publicación de reglas. |

**Conclusión de cierre:** la Fase 1 queda lista para publicación pero **detenida a la espera de autorización expresa**. No se ejecutó `git push`, `firebase deploy` ni ninguna acción sobre datos reales. Se requieren cuentas de prueba autorizadas para cerrar las validaciones manuales antes de publicar.
