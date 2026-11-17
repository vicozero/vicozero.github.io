# Checklist de publicación — Fase 1 (Sierra Madre Seguridad)

**Fecha:** 17 de noviembre de 2026  
**Proyecto:** `centinela/`  
**Sitio actual:** `https://vicozero.github.io/`  
**Rama de restauración:** `fase1-validada-2026-11-17` (creada desde `main` @ `312da55`) — etiqueta `fase1-validada-2026-11-17-final`  
**Estado:** **PREPARADO PARA PUBLICACIÓN — NO DESPLEGADO.** Requiere autorización expresa antes de cualquier `push`, `firebase deploy` o migración.

---

## 1. Estado de pruebas

| Concepto | Resultado |
|---|---|
| Pruebas críticas con Firebase Emulator | **4/4 PASS** — `test-firestore-rules.mjs`, `test-cloud-portal.mjs`, `test-phase1-units.mjs`, `test-phase1-storage.mjs` |
| Pruebas adicionales con Emulator | **2/2 PASS** — `test-phase1-extras.mjs`, `test-suite-store.mjs` |
| Pruebas locales (regresión + enfocadas) | **17/17 PASS** |
| **Total Fase 1** | **23 PASS · 0 FAIL · 0 BLOCKED** |
| Sincronización `docs/` y `public/` | **OK** — 55 archivos web, 112 copias; hashes coinciden en source / `docs/` / `public/` |
| Carga del sitio publicado actual | **OK** — título `Sierra Madre · Programa de Seguridad`, pantalla de acceso, **0 errores de consola** (navegador, sin sesión) |
| Cambios de código desde la validación | **Ninguno.** No se repitieron pruebas ya aprobadas, conforme a la restricción. |

Detalle de cobertura ya aprobada (no repetir salvo cambio de código relacionado):

- Reglas Firestore/Storage: propiedad, unidad/área, permiso por operación, `revision + 1`, inmutabilidad, adjuntos y evidencias fragmentadas.
- Portal: conservación de `photos` en ediciones parciales, recuperación de fragmentos, avisos `_missingPhotoChunks` / `_photoRecoveryError`, homónimos sin reasignación, resolvedor por UID, `/api/inconsistencies` **200 para admin / 403 para operador**.
- Respaldos: huella SHA-256, duplicados, campos sensibles, `planImport` con `preview:true` y **cero escrituras**.
- Formatos: 15 formatos + 3 operativos (VEO/INC/TRN), borrador → finalización → bloqueo → reapertura.
- Exportaciones: PDF operativo y de matriz/acciones; CSV con BOM UTF-8, acentos, comillas dobles, neutralización de fórmulas y CRLF (`test-phase1-csv.mjs`).

---

## 2. Validaciones manuales

### Completadas

| Validación | Evidencia |
|---|---|
| Carga del sitio live en navegador | `https://vicozero.github.io/` abre correctamente, sin errores en consola. |
| Pantalla de acceso | Se muestra el formulario de inicio de sesión; no hay sesión autenticada previa. |
| Revisión estática de credenciales | Sin llaves privadas, tokens ni hashes reales. Único valor sensible-aparente: la **API key pública web de Firebase** (`AIza…`) en `firebase-auth.js`, `docs/firebase-auth.js` y `public/firebase-auth.js`, necesaria y diseñada para ser pública. Las coincidencias de `passwordHash` son nombres de campo / lógica de exclusión. |
| Versionado | 79 archivos modificados + 19 archivos nuevos esenciales (informes, pruebas, módulos `library-page.js`, utilidades de migración/verificación) incluidos en el punto de restauración. `firebase-migration-config.json`, `.qa/`, `.firebase/` y `node_modules/` quedan fuera por `.gitignore`. |

### Pendientes / bloqueadas

| Validación | Estado | Motivo |
|---|---|---|
| Descarga real de **PDF** desde navegador autenticado | **PENDIENTE — requiere cuenta de prueba autorizada** | No se proporcionaron credenciales. El modo local usa cuentas creadas dentro de la app y **no equivale** a una cuenta cloud autorizada. La generación de PDF ya pasó en `test-operational-pdf.mjs` y `test-workspace.mjs`. |
| Descarga real de **CSV** desde navegador autenticado | **PENDIENTE — requiere cuenta de prueba autorizada** | Misma razón. El contenido/escapado está cubierto por `test-phase1-csv.mjs`. |
| Revisión **visual** de la importación de respaldos en modo previsualización | **PENDIENTE — requiere sesión autenticada** | El comportamiento sin escrituras está probado en `test-phase1-backup-preview.mjs`; falta la comprobación visual de avisos/UI. |
| `/api/inconsistencies` con cuenta **administradora** | **PENDIENTE en live** (cubierto en emulador: 200) | Requiere cuenta admin autorizada en el proyecto real. |
| Negación de `/api/inconsistencies` a usuario **sin permisos** | **PENDIENTE en live** (cubierto en emulador: 403) | Requiere cuenta no admin autorizada. |
| Avisos visuales de modo local / sin conexión en dispositivo real | **PENDIENTE** | Cubierto estáticamente y por suite; requiere dispositivo con la build actual (ver nota de caché PWA). |

> **No se declaran aprobadas** las validaciones anteriores. Emulator demuestra la lógica; el navegador autenticado demuestra el flujo real. Ambas son necesarias antes de dar por cerrada la publicación.

---

## 3. Archivos que deberán publicarse

**Fuentes de la Fase 1 (raíz de `centinela/`):**

- `firestore.rules` — validaciones de campos críticos compatibles (estado terminal), sin desactivar seguridad.
- `storage.rules` — autorización de evidencias/adjuntos (cambios previos de Fase 1).
- `cloud-portal.js` — recuperación de evidencias, homónimos, UID, `/api/inconsistencies`, conservación de fotos.
- `firebase-auth.js` — previsualización de importación, bloqueo de campos sensibles, indicadores de modo local.
- `brand.css` — distintivo visual de modo local.
- `verify-migration-backup.mjs` — verificación de respaldos y `planImport`.
- `migrate-verified-workspace.mjs` — migración explícita (solo con autorización).
- `library-page.js`, `docs/library-page.js`, `public/library-page.js` — módulo de biblioteca normativa (sincronizado).

**Espejos web:** las copias en `docs/` y `public/` de los 55 archivos web (112 copias). El sitio publicado se sirve desde esos espejos; **no publicar si `node sync-copies.mjs` no reporta coincidencia de hashes.**

**Pruebas y documentación incluidas en el punto de restauración:** `test-*.mjs` (incluidas `test-phase1-extras.mjs`, `test-phase1-backup-preview.mjs`, `test-phase1-csv.mjs`), `AUDITORIA_FASE1_2026-11-17.md`, `AUDITORIA_FASE1_CORREGIDA.md` y este checklist.

**No incluidos / no publicar:** `firebase-migration-config.json` (gitignored; contiene configuración local de migración), `.qa/`, `.firebase/`, `node_modules/`, `output/`, `*.log`, ni los artefactos puntuales no versionados (`archive-verified-backup.mjs`, `download-nom-pdfs.mjs`, `enrich_talks.py`, `extract_nom_meta*.py`, `verify_noms*.py`, `package-lock.json`). Permanecen en disco, pero no forman parte del estado validado.

---

## 4. Orden correcto del despliegue

**Precondición:** autorización expresa del usuario. Hasta entonces, **no ejecutar ninguno de estos comandos**.

1. **Verificar el punto de restauración**
   ```powershell
   git checkout fase1-validada-2026-11-17
   git status               # debe estar limpio
   git log -1 --oneline     # commit validado
   ```
2. **Comprobar el árbol web**
   ```powershell
   npm run check
   node sync-copies.mjs     # 55 archivos / 112 copias, hashes MATCH
   ```
3. **(Solo si se autoriza) Publicar reglas de Firebase** — antes que el web, porque el portal nuevo depende de ellas:
   ```powershell
   firebase deploy --only firestore:rules,storage:rules --project sierra-madre-seguridad
   ```
   Verificación: reglas activas = las del commit validado; sin migración ni escritura de datos.
4. **Validaciones manuales autenticadas** (sección 2) con cuentas de prueba autorizadas. Si fallan, **no publicar el web** y ejecutar la reversión de reglas.
5. **Publicar GitHub Pages**
   ```powershell
   git push public-pages HEAD:main
   ```
   Destino: `https://vicozero.github.io/`. El `HEAD` debe ser el commit de la rama `fase1-validada-2026-11-17`.
6. **Smoke post-despliegue:** cargar el sitio, iniciar sesión con cuenta autorizada, verificar contador de sesiones, descargar un PDF y un CSV, abrir previsualización de respaldo y consultar `/api/inconsistencies` con admin y con no-admin. Revisar consola (0 errores).
7. **Caché PWA:** el service worker está en `sm-seguridad-v7`. Si un dispositivo muestra pantalla antigua (p. ej. contador ausente), cerrar/reabrir, recarga forzada, borrar datos del sitio o reinstalar la PWA. **No** incrementar la versión de caché sin un cambio de código que lo justifique.

---

## 5. Procedimiento de reversión

### A. Web (GitHub Pages) — reversión Immediate

```powershell
# Volver al commit anterior conocido (el que estaba en producción antes de Fase 1)
git push public-pages 312da55:main
```

- Esto repone `https://vicozero.github.io/` en el estado previo al despliegue de Fase 1.
- Es un `push` de una rama local a `main` del remoto `public-pages`; **no borra datos** de Firebase.
- Tráfico DNS/CDN: GitHub Pages suele reflejar en minutos. Verificar con recarga forzada y, si aplica, nueva versión de caché del service worker.

### B. Reglas de Firebase — reversión (solo si se publicaron)

```powershell
# 1) Recuperar las reglas anteriores desde el commit base
git show 312da55:firestore.rules > firestore.rules.rollback
git show 312da55:storage.rules   > storage.rules.rollback

# 2) Restaurarlas temporalmente en el árbol de trabajo y desplegar
Copy-Item firestore.rules.rollback firestore.rules -Force
Copy-Item storage.rules.rollback   storage.rules   -Force
firebase deploy --only firestore:rules,storage:rules --project sierra-madre-seguridad

# 3) Volver al estado validado y limpiar temporales
git checkout fase1-validada-2026-11-17 -- firestore.rules storage.rules
Remove-Item firestore.rules.rollback, storage.rules.rollback
```

- Si el despliegue de reglas falla a mitad, repetir el paso 2; las reglas son declarativas y **idempotentes**.
- **No** revertir datos: no se migró ni restauró nada, por lo que no existe un "estado de datos anterior" que reponer por este despliegue.
- Si el problema es de permisos sobre registros nuevos, revisar primero `/api/inconsistencies` y evidencias; **no** reasignar automáticamente.

### C. Datos

- No aplica reversión de datos de este despliegue: **no se escribieron registros productivos**.
- Cualquier restauración futura debe hacerse desde un respaldo verificado con `verify-migration-backup.mjs`, en modo previsualización primero, y con autorización explícita.

---

## 6. Riesgos identificados

| Nivel | Riesgo | Mitigación |
|---|---|---|
| **MEDIO** | Reglas probadas en emulador con datos aislados, no con volumen/casos límite de producción. | Publicar reglas solo con autorización; verificar `/api/inconsistencies` con datos reales antes de cualquier reasignación. |
| **MEDIO** | Validaciones manuales autenticadas pendientes (PDF/CSV, preview, admin/no-admin). | No dar por cerrada la publicación hasta ejecutarlas con cuentas autorizadas; reversión sección 5 si fallan. |
| **MEDIO** | Caché PWA `sm-seguridad-v7` puede servir pantalla antigua tras publicar. | Recarga forzada / borrar datos del sitio / reinstalar; no cambiar versión sin cambio de código. |
| **BAJO** | `/api/inconsistencies` depende de permiso `list` de `evidenceChunks` solo para admin. | Ya restringido; no se elimina nada automáticamente. |
| **BAJO** | Modo local no equivale a entorno multiusuario protegido. | Señalizado en UI (`SM_LOCAL_MODE`, `data-storage="local"`); no usar para datos reales. |
| **BAJO** | Homónimos / unidades históricas ambiguas. | El portal no reasigna automáticamente; queda para conciliación administrativa. |
| **INFORMATIVO** | API key pública de Firebase en el código. | Es una Web API key pública por diseño; la seguridad depende de las reglas, no de ocultarla. No hay secretos privados en el repositorio. |

---

## 7. Confirmación de datos productivos

- **No se modificaron registros productivos.** Todas las pruebas se ejecutaron contra Firebase Emulator (`demo-sierra-madre`, Firestore 8087 / Storage 9199) o contra archivos locales aislados.
- **No se realizaron migraciones automáticas** ni restauraciones. `migrate-verified-workspace.mjs` y `verify-migration-backup.mjs` quedan como herramientas, sin ejecución sobre producción.
- **No se publicaron reglas de Firebase** ni se desplegó el sitio. El sitio live solo se abrió en modo lectura para la comprobación de carga.
- **No se inició la Fase 2.**

---

## 8. Autorización requerida

Este documento se entrega con el estado **listo pero detenido**. Se solicita autorización expresa para:

1. Publicar `firestore.rules` y `storage.rules` en `sierra-madre-seguridad`.
2. Ejecutar `git push public-pages HEAD:main` desde la rama `fase1-validada-2026-11-17`.
3. Proporcionar cuentas de prueba autorizadas (administradora y no administradora) para completar las validaciones manuales pendientes.

**Hasta recibir esa autorización: no se ejecuta ningún despliegue, publicación de reglas ni migración.**
