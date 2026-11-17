# Checklist de publicación — Fase 1 (Sierra Madre Seguridad)

**Fecha:** 17 de noviembre de 2026 (cierre de prepublicación)  
**Proyecto:** `centinela/`  
**Sitio actual:** `https://vicozero.github.io/`  
**Rama:** `fase1-validada-2026-11-17` · **código validado:** `fb1795d` (etiqueta `fase1-validada-2026-11-17-final`)  
**Commits posteriores (sin tocar código validado):** `7b5aa65` (documentación), `4b10d9e` (lockfile), `318eca1` (prueba de seguridad), `714dcb6` (preparación final), `5fa55c9` (varios administradores y transferencia segura), `3a98d00` (herramientas en cabecera y panel)  
**HEAD actual:** `3a98d00` · **Caché PWA:** `sm-seguridad-v10`  
**Estado:** **PUBLICACIÓN PARCIAL — pendiente de Storage.** Frontend publicado y reglas de Firestore desplegadas el 17-11-2026. Las reglas de Storage quedan bloqueadas porque el proyecto no tiene Firebase Storage dado de alta (requiere un paso manual en consola). No se migró, no se crearon usuarios y no se modificaron datos productivos. Ver sección 12.

---

## 1. Estado del repositorio

| Concepto | Resultado |
|---|---|
| Rama activa | `fase1-validada-2026-11-17` |
| `HEAD` | `264db0a` (autorización de publicación). Código validado inalterado en `fb1795d`; etiqueta `fase1-validada-2026-11-17-final` **sin mover**. |
| Frontend publicado | `public-pages/main`: `312da55` → `264db0a`, push en avance, **sin `--force`**. Verificado en `https://vicozero.github.io/`: HTTP 200, `adminTools` presente y `sm-seguridad-v10` activo. |
| Reglas desplegadas | **Firestore: OK** (compiló y se liberó en `sierra-madre-seguridad`). **Storage: BLOQUEADO** — el proyecto no tiene Firebase Storage dado de alta; el deploy se detuvo en preverificación sin escribir nada. |
| Contenido de la rama | **102 archivos** respecto a `312da55`: **80 modificados + 22 nuevos** esenciales. Incluye `firestore.rules`, `storage.rules`, `cloud-portal.js`, `firebase-auth.js`, `sw.js`, `brand.css`, `library-page.js` y sus copias, `verify-migration-backup.mjs`, `migrate-verified-workspace.mjs`, `test-*.mjs`, informes y este checklist. |
| Árbol de trabajo | Limpio: 0 modificados, 0 en staging. 7 artefactos sin versionar (sección 3). |
| Espejos `docs/` / `public/` | Verificado por hash SHA-256 en 9 archivos clave (`cloud-portal.js`, `firebase-auth.js`, `brand.css`, `sw.js`, `index.html`, `library-page.js`, `workspace.js`, `training-suite.js`, `normative-catalog.json`): **raíz = docs = public**. |
| Service worker | Caché **`sm-seguridad-v10`** (v8 en el código validado `fb1795d`; v9 y v10 tras el modelo multi-admin). |
| Operaciones realizadas | Solo lectura + verificaciones aisladas: `git status/log/diff/ls-remote`, `npm ls`, hashes, `npm ci` en directorio temporal, prueba de seguridad en emulador. **Sin `push`, sin `firebase deploy`, sin migración, sin `--force`.** |

---

## 2. Estado de pruebas

| Concepto | Resultado |
|---|---|
| Pruebas críticas con Firebase Emulator | **4/4 PASS** — `test-firestore-rules.mjs`, `test-cloud-portal.mjs`, `test-phase1-units.mjs`, `test-phase1-storage.mjs` |
| Pruebas adicionales con Emulator | **2/2 PASS** — `test-phase1-extras.mjs`, `test-suite-store.mjs` |
| Pruebas locales (regresión + enfocadas) | **17/17 PASS** |
| **Total Fase 1 (original)** | **23 PASS · 0 FAIL · 0 BLOCKED** |
| **Prueba de seguridad añadida (esta pasada)** | **1/1 PASS** — `test-phase1-admin-report-security.mjs` en emulador Firestore + Storage. Verifica que las fuentes del reporte están protegidas por **reglas**, no solo por el `isAdmin` de `cloud-portal.js`. |
| `npm ci` aislado | **PASS** — 687 paquetes instalados desde cero con solo `package.json` + `package-lock.json`; `exit 0`; versiones idénticas. |
| **Pruebas del modelo multi-admin (esta pasada)** | **3/3 PASS** — `node test-admin-users-ui.mjs`, `node test-cloud-session-ui.mjs` (transferencia transaccional, botones en cabecera y panel, limpieza y permisos por rol) y `npm.cmd run test:rules` con Java 21 (reglas Firestore + portal + suite). `npm.cmd run check`: PASS. No se repitieron las 24 pruebas ya aprobadas. |
| Carga del sitio live (sin sesión) | OK — título correcto, pantalla de acceso, 0 errores de consola |
| Repetición de pruebas | **No se repitieron las 24 pruebas ya aprobadas.** En esta pasada se ejecutaron solo las pruebas afectadas por el modelo multi-admin (fila anterior); el código sí cambió en commits posteriores al validado. |

Detalle de la nueva prueba (resultado real):

```
Reporte admin: fuentes protegidas por reglas (Firestore + Storage), no solo por JS del navegador: OK
Script exited successfully (code 0)
```

Cubre: `list` de `reports`/`actions`/`plans` permitido a admin y denegado a operador sin permisos, otro operador y anónimo; `get` de un registro ajeno denegado; `list` de `evidenceChunks` admin-only; lectura de evidencia en Storage permitida a admin y denegada a operador sin `view_all` y a anónimo.

Cobertura ya aprobada: reglas Firestore/Storage (propiedad, unidad, permisos, `revision + 1`, inmutabilidad), portal (fotos conservadas, fragmentos, homónimos, UID, `/api/inconsistencies` 200/403), respaldos (SHA-256, duplicados, campos sensibles, preview sin escrituras), 15 formatos + 3 operativos, PDF y CSV (`test-phase1-csv.mjs`).

---

## 3. Dependencias y archivos esenciales

### Lockfile y dependencias

| Verificación | Resultado |
|---|---|
| `package-lock.json` | **Versionado en `4b10d9e`** (commit exclusivo: 1 archivo, 9061 líneas). `lockfileVersion: 3`, `name: sierra-madre-security-validation`. Declaraciones del root idénticas a `package.json`. |
| Versiones resueltas = instaladas | `@firebase/rules-unit-testing` **5.0.2** (`^5.0.0`), `firebase` **12.19.0** (`^12.0.0`), `firebase-tools` **15.36.0** (`^15.0.0`). Coinciden con `npm ls --depth=0`. Total: 688 entradas (687 paquetes + root). |
| Escaneo de credenciales | **Sin secretos.** Únicos hallazgos del escaneo: nombres de dependencias y URLs del registry (`@inquirer/password`, `jsonwebtoken`, `gtoken`, `registry-auth-token`). No hay tokens, API keys, contraseñas, claves privadas ni rutas locales de usuario. |
| `npm ci` reproducible | **PASS.** En `C:\Users\Dell\AppData\Local\Temp\opencode\npm-ci-verify-fase1` se copiaron solo `package.json` + `package-lock.json`; `npm.cmd ci --no-audit --no-fund` → `added 687 packages in 2m`, `exit=0`, versiones 5.0.2 / 12.19.0 / 15.36.0. Solo avisos de deprecación de paquetes transitivos (`json-ptr`, `node-domexception`, `glob`, `uuid`). |
| Históricos intactos | `fb1795d` y `7b5aa65` conservan sus hashes; la etiqueta sigue apuntando a `fb1795d`. Se hizo un `commit --amend` **solo del mensaje** en `5fa55c9` (árbol idéntico); no hubo `rebase` ni `reset`. |
| `functions/` | `functions/package.json` declara Node 20, `firebase-admin ^12`, `firebase-functions ^5`. **No existe `functions/package-lock.json`**. Las Cloud Functions **no** están en el alcance de esta publicación. |

### Artefactos sin versionar (7)

| Archivo | ¿Indispensable? | Uso / decisión |
|---|---|---|
| `archive-verified-backup.mjs` | No | Script puntual de archivado; importa `verify-migration-backup.mjs` y `firebase-tools/lib/auth.js`. No referenciado por `package.json`, build ni publicación. |
| `download-nom-pdfs.mjs` | No | Descarga puntual de PDFs del catálogo NOM; no referenciado. |
| `enrich_talks.py`, `extract_nom_meta.py`, `extract_nom_meta2.py`, `verify_noms.py`, `verify_noms2.py` | No | Herramientas de generación/verificación del catálogo (requieren Python + PyMuPDF `fitz`). No intervienen en build, instalación, pruebas ni publicación. |
| `firebase-migration-config.json` | No (y no debe versionarse) | Configuración local de migración; protegida por `.gitignore`. |

`package-lock.json` y `test-phase1-admin-report-security.mjs` ya están versionados. No existen workflows de CI (`.github/`) ni `.firebaserc` en el repositorio.

---

## 4. Estado del remoto y divergencias

| Remoto | Resultado |
|---|---|
| `public-pages/main` (lectura con `git ls-remote`) | `312da5543536ba2741fb7179a48eb6db6b3026ed` — **idéntico** al commit base anterior a Fase 1. |
| Relación con el commit validado | `git rev-list --left-right --count 312da55...fb1795d` → **`0  1`**: el remoto no tiene commits ausentes en la rama; la rama tiene exactamente 1 commit nuevo (Fase 1). `git merge-base --is-ancestor` → **OK (exit 0)**. **Sin divergencia inesperada.** |
| `origin/main` (solo informativo) | `76ef8c8` (`Enhance portal backgrounds with safety imagery`). Divergencia `1  59`: 1 commit solo en origin, 59 solo en la rama local. **No se usa para publicación**; no hacer `push` a `origin`. |
| Referencia local `public-pages/main` | Coincide con el remoto (`312da55`). No hay desactualización oculta. |

---

## 5. Configuración de Firebase

| Archivo | Configuración confirmada |
|---|---|
| `firebase.json` | Reglas `firestore.rules` y `storage.rules`; `functions` con `source: functions`, `codebase: default`; emuladores Firestore 8087, Storage 9199, Functions 5001, UI deshabilitada, `singleProjectMode: true`. **Sin bloque `hosting`**: el frontend se publica en GitHub Pages, no en Firebase Hosting. |
| `firebase-auth.js` (y copias) | `projectId: sierra-madre-seguridad`, `authDomain: sierra-madre-seguridad.firebaseapp.com`, `storageBucket: sierra-madre-seguridad.firebasestorage.app`, `appId: 1:260475494499:web:…`. Proyecto previsto, sin mezcla con el proyecto de emulador `demo-sierra-madre`. |
| `firebase-migration-config.json` (gitignored) | `projectId: sierra-madre-seguridad`, `databaseId: (default)`, `authorizationModel: server-managed-role`, `productionSwitchEnabled: false`, migración en estado `pending-backup-…`. **No se leyó ni expuso el valor de `initialAdministrator`.** |
| Proyecto del despliegue | El comando previsto `firebase deploy --only firestore:rules,storage:rules --project sierra-madre-seguridad` coincide con el `projectId` de la config web y de la config de migración. **Proyecto correcto confirmado.** |
| `.firebaserc` | **Ausente.** Todo comando CLI debe llevar `--project sierra-madre-seguridad` explícitamente. Riesgo de apuntar al proyecto equivocado si se omite. |
| Reglas | Probadas solo en emulador. No se publicaron. |

---

## 6. Preparación segura de cuentas de prueba (NO ejecutada)

**Principios:** el usuario dueño autoriza y ejecuta la creación; el asistente no solicita, recibe, guarda ni reutiliza contraseñas; no se usan credenciales personales ni se crean cuentas reales sin autorización.

1. **Cuenta no administradora (creable desde la UI):** tras autorización, en la app → *Usuarios y permisos* → **+ Registrar usuario**. Usar un correo de prueba desechable del dominio autorizado, p. ej. `qa-op-20261117@<dominio-autorizado>`. Generar la contraseña **localmente** con `[guid]::NewGuid().ToString('N')`; escribirla solo en el formulario; no pegarla en chat, correos, archivos ni `localStorage`. Rol: **operador / usuario operativo**, sin administración; desactivar permisos de `reports`/`actions`/`plans` si la UI lo permite (es el caso que debe dar 403).
2. **Cuenta administradora:** ahora el **encargado principal** puede asignar el rol `admin` desde *Usuarios y permisos* (opción «Administrador» habilitada solo para él). Los administradores secundarios tienen acceso operativo completo pero **no pueden transferir la encargatura ni promover a otros administradores**. La validación debe ejecutarla el dueño en su propia sesión, tecleando su contraseña él mismo; no se comparte ni se almacena. No se modifica `security/authority` manualmente ni `initialAdministrator`.
3. **Higiene:** tras las pruebas, desactivar/eliminar la cuenta `qa-op-…` desde la misma vista. No crear registros operativos de prueba: las cinco validaciones son de solo lectura (la previsualización se cancela).
4. **Si no se autoriza la creación:** las validaciones siguen pendientes y **no se declaran aprobadas**. El modo local no sustituye a una cuenta cloud.

---

## 7. Procedimiento para validación en navegador (instrucciones, no ejecutadas)

Precondición: sesión autenticada, sitio `https://vicozero.github.io/`, caché PWA v10 cargada (si aparece UI antigua: recarga forzada / borrar datos del sitio).

### Guía rápida (marcar al ejecutar)

| # | Verificación | Acción | Resultado esperado |
|---|---|---|---|
| 1 | PDF | `↧ PDF` en *Acciones* y *Avances* | 2 PDFs válidos con datos |
| 2 | CSV | `↧ CSV`, `Exportar CSV`, `Temario para Excel` | 3 CSV con BOM/acentos y fórmulas neutralizadas |
| 3 | Preview importación | *Importar datos locales a la nube* → **Cancelar** | Conteos mostrados, **0 escrituras** |
| 4 | Admin reporte | `await fetch('/api/inconsistencies')` en consola admin | **200** + JSON con `counts` |
| 5 | Sin permisos | Misma llamada con cuenta `qa-op-…` | **403** + `{"error":"Permiso administrativo requerido."}` |
| 6 | Herramientas admin visibles | Revisar cabecera y *Usuarios y permisos* en sesión principal y en secundaria | Principal: «Sesiones» y «Cambiar encargado» en cabecera + «Sesiones activas» y «Cambiar encargado» en el panel. Secundaria: solo los botones de sesiones. |
| 7 | Alta de administradores | Abrir *+ Registrar usuario* con principal y con admin secundario | Principal ve habilitada la opción «Administrador»; secundario la ve deshabilitada. **No transferir la encargatura ni crear administradores reales.** |

### Pasos detallados

1. **PDF autenticado**
   - Vista *Seguimiento de acciones* → botón **`↧ PDF`** (`#actionsPdf`). Esperar `Sierra-Madre-acciones-AAAA-MM.pdf`; abrirlo y comprobar que es un PDF válido con datos.
   - Vista *Avances* → **`↧ Reporte de avances PDF`** (`#progressPdf`). Esperar `Sierra-Madre-avances-AAAA-MM.pdf`.
   - Opcional: desde una acción individual, el botón de PDF de esa acción (`#singleActionPdf`).
2. **CSV autenticado**
   - *Seguimiento de acciones* → **`↧ CSV`** (`#actionsCsv`) → `Sierra-Madre-acciones-AAAA-MM.csv`.
   - *Avances* → **`↧ Exportar CSV`** (`#progressCsv`) → `Sierra-Madre-avances-AAAA-MM.csv`.
   - *Pláticas* → **`Temario para Excel (.csv)`** → `Sierra-Madre-temario.csv`.
   - Comprobar BOM UTF-8 (acentos legibles en Excel), CRLF y que celdas tipo `=SUM(A1)` aparecen neutralizadas con `'` delante.
3. **Previsualización de importación sin escrituras (solo admin)**
   - Abrir el diálogo de perfil/ajustes del administrador → botón **«Importar datos locales a la nube»**.
   - Aparece un aviso: *«Previsualización (sin escribir): A agregar / Omitidos / Conflictos… ¿Continuar con la importación?»*.
   - **Hacer clic en Cancelar en ese `confirm()`**. No pulsar Aceptar bajo ningún concepto.
   - Verificar que el mensaje muestra conteos coherentes y que los conteos de formatos/acciones/planes del portal son idénticos antes y después. `importLocalWorkspace(..., {preview:true})` no emite PUT/POST.
4. **Reporte de inconsistencias con admin**
   - En la consola del navegador de la sesión administradora:
     ```js
     const r = await fetch('/api/inconsistencies');
     console.log(r.status);              // esperado: 200
     console.log(await r.json());        // claves: generatedAt, homonyms, issues, orphanChunks, counts
     ```
   - `/api/inconsistencies` es interceptado por `cloud-portal.js` (`window.fetch`): **no existe backend HTTP en GitHub Pages**. Revisar `counts` y que `issues`/`orphanChunks` sean informativos; no reasignar nada automáticamente.
5. **Rechazo para usuario sin permisos**
   - Repetir el mismo comando en la sesión `qa-op-…`: esperado **403** y cuerpo `{"error":"Permiso administrativo requerido."}`.
   - Comprobar además que las secciones `admin-only` no son visibles.
6. **Herramientas de administración visibles (solo inspección, sin ejecutar transferencias)**
   - En la sesión del encargado principal: confirmar en la cabecera los botones **`Sesiones`** y **`Cambiar encargado`**, y al entrar a *Usuarios y permisos* el panel **`HERRAMIENTAS DE ADMINISTRACIÓN`** con **`Sesiones activas`** y **`Cambiar encargado`** (sin atributo `hidden`).
   - En una sesión de administrador secundario (si se autoriza crearla): confirmar que solo aparecen los botones de sesiones en cabecera y panel, y que **no** existe `Cambiar encargado`.
   - Opcional: pulsar **Sesiones** y comprobar que se abre el diálogo *Equipo conectado* con la tabla de sesiones.
7. **Alta de administradores (solo inspección)**
   - Con el encargado principal, abrir *+ Registrar usuario* y verificar que la opción **`Administrador`** está habilitada.
   - Con un administrador secundario, verificar que la misma opción está deshabilitada y que el backend rechazaría el cambio con «Solo el encargado principal puede asignar el rol de administrador.»
   - **No crear cuentas reales ni transferir la encargatura.** La transferencia transaccional ya quedó cubierta por `test-cloud-session-ui.mjs` en emulador/UI aislada.
8. **Cierre:** registrar en este checklist fecha, cuenta usada (sin contraseña), resultado de cada punto y cualquier error de consola.

> Si alguno falla: no publicar (o ejecutar reversión si ya se publicó) y documentar el bloqueo. No se marcan como aprobadas hasta ejecutarse.

---

## 8. Secuencia de publicación y reversión (corregida)

### 8.1 Orden de publicación — **frontend primero, reglas después**

**Razón:** las reglas nuevas son más estrictas en varios puntos (unidades/permisos, `validRecordWrite`, inmutabilidad de `assignedAccountId`, validaciones de pláticas/NOM, `evidenceChunks`). El frontend antiguo de producción no fue probado contra ellas; publicar reglas primero podría bloquear escrituras legítimas del frontend antiguo. El frontend nuevo sí fue probado contra las reglas nuevas, y bajo las reglas antiguas (más permisivas) solo pierde temporalmente funciones puntuales: escaneo de fragmentos huérfanos (`orphan_scan_unavailable`) y rol `supervisor`. Por eso el orden correcto es **web → reglas**, con la ventana mínima posible.

**Autorizado el 17-11-2026. Secuencia a ejecutar:**

```powershell
# 0) Verificación (solo lectura / local)
git checkout fase1-validada-2026-11-17
git status
git rev-parse HEAD
npm.cmd run check
node sync-copies.mjs          # debe reportar 56 archivos / 112 copias, hashes MATCH

# 1) Frontend primero
git push public-pages HEAD:main

# 2) Reglas inmediatamente después (ventana de incompatibilidad mínima)
firebase deploy --only firestore:rules,storage:rules --project sierra-madre-seguridad

# 3) Smoke autenticado de los cinco puntos de la sección 7 + consola sin errores
```

**No publicar Cloud Functions:** no están en el alcance y su lockfile falta.

### 8.2 Reversión — **reglas primero, frontend después**, sin `--force` ni rewind

**Regla crítica:** tras un push en avance, **nunca** ejecutar `git push public-pages 312da55:main`. Eso intenta rewindear `main` a un commit antiguo, no es fast-forward y GitHub Pages lo rechazaría (o exigiría `--force`, prohibido). La reversión se hace con un **nuevo commit que avanza** la rama.

```powershell
# 1) Reglas: volver a las versiones de 312da55 (declarativas e idempotentes)
git show 312da55:firestore.rules > firestore.rules.rollback
git show 312da55:storage.rules   > storage.rules.rollback
Copy-Item firestore.rules.rollback firestore.rules -Force
Copy-Item storage.rules.rollback   storage.rules   -Force
firebase deploy --only firestore:rules,storage:rules --project sierra-madre-seguridad
git checkout fase1-validada-2026-11-17 -- firestore.rules storage.rules
Remove-Item firestore.rules.rollback, storage.rules.rollback

# 2) Frontend: revertir en un NUEVO commit (avance, sin rewind)
git checkout fase1-validada-2026-11-17
git revert --no-commit 312da55..HEAD
git commit -m "Rollback Fase 1: restaurar sitio publicado a 312da55"
git push public-pages HEAD:main        # fast-forward; NUNCA --force
```

Notas:

- `git revert --no-commit 312da55..HEAD` produce exactamente el árbol de `312da55` mediante commits inversos; el push resultante es un **avance** y no reescribe historia.
- **Prohibido:** `git push --force`, `git push public-pages 312da55:main`, `git reset --hard` seguido de push, o cualquier actualización no fast-forward de `public-pages/main`.
- Si el despliegue es interrumpido a mitad, repetir el paso 1: las reglas son declarativas e idempotentes.
- Tras reponer el frontend, la caché **`sm-seguridad-v10`** puede seguir sirviendo assets nuevos: recarga forzada, borrar datos del sitio o reinstalar la PWA. El `activate` del SW elimina todas las cachés `sm-seguridad-*` distintas de la activa, por lo que v10 **no bloquea** la actualización: basta con que el SW nuevo se active.
- **No hay reversión de datos**: no se migró ni escribió nada productivo.
- Si el problema aparece solo en módulos de capacitación/NOM, sospechar de las validaciones nuevas de `talk_topics`/`talk_schedules`/`talk_sessions`/`compliance_assessments` y revertir reglas antes que el frontend.
- Para volver a Fase 1 tras una reversión: publicar de nuevo el frontend desde `fase1-validada-2026-11-17` como commit en avance, no rewindear.

---

## 9. Riesgos de publicación

| Nivel | Riesgo | Mitigación |
|---|---|---|
| **ALTO si se invierte el orden** | Reglas nuevas + frontend antiguo → escrituras denegadas por validaciones de unidad/permisos y de pláticas/NOM. | Publicar **frontend primero, reglas después** (sección 8.1). |
| **ALTO si se rewindea** | `git push public-pages 312da55:main` tras un push en avance no es fast-forward y exigiría `--force`. | Reversión con `git revert --no-commit 312da55..HEAD` + push en avance (sección 8.2). |
| **MEDIO** | Ventana breve de frontend nuevo bajo reglas antiguas: reporte de huérfanos degradado y rol `supervisor` sin efectos. | Encadenar ambos comandos sin pausa; verificar después. |
| **MEDIO** | Validaciones manuales autenticadas pendientes (PDF/CSV/preview/admin/no-admin). | Ejecutar sección 7 con cuentas autorizadas; si fallan, reversión sección 8.2. |
| **MEDIO** | Reglas probadas solo en emulador `demo-sierra-madre`, no con volumen real. | Autorización expresa; revisar `/api/inconsistencies` con datos reales antes de cualquier reasignación. |
| **BAJO (resuelto)** | `package-lock.json` sin versionar impedía `npm ci`. | Versionado en `4b10d9e`; `npm ci` verificado en entorno aislado. |
| **MEDIO** | Ausencia de `.firebaserc`: riesgo de desplegar reglas en proyecto equivocado. | Usar siempre `--project sierra-madre-seguridad`. |
| **BAJO** | Caché PWA v10 en dispositivos con assets antiguos (herramientas de administración ausentes). | El `activate` borra cachés `sm-seguridad-*` antiguas; recarga forzada / borrar datos / reinstalar si persiste. |
| **BAJO** | `origin/main` divergente (1/59). | Publicar **solo** a `public-pages`; nunca hacer push a `origin`. |
| **BAJO** | `functions/` sin lockfile y fuera de alcance. | No desplegar functions en esta publicación. |
| **INFORMATIVO** | API key pública de Firebase en el código. | Pública por diseño; la seguridad depende de las reglas. Sin secretos privados en el repo. |

---

## 10. Confirmación de datos productivos

- **No se modificaron registros productivos.** Pruebas en emulador (`demo-sierra-madre`, 8087/9199) y archivos aislados.
- **No se crearon usuarios reales**, no se usaron credenciales personales y no se solicitaron contraseñas.
- **No se realizaron migraciones ni restauraciones**; `migrate-verified-workspace.mjs` y `verify-migration-backup.mjs` siguen como herramientas sin ejecutar sobre producción.
- **No se publicaron reglas ni se desplegó el sitio.** `public-pages/main` sigue en `312da55`.
- **No se usó `--force`, `rebase` ni `reset`.** El único `--amend` fue de mensaje en `5fa55c9` (código posterior al validado, árbol sin cambios).
- **No se inició la Fase 2.**

---

## 11. Bloqueos y autorización requerida

**Autorización recibida el 17 de noviembre de 2026** para publicar frontend y reglas. Estado de bloqueos:

1. ~~Sin autorización expresa para publicar frontend y reglas~~ → **AUTORIZADO**.
2. Sin cuentas de prueba autorizadas; el encargado principal puede crear administradores desde la UI, pero la validación debe ejecutarla el dueño en su propia sesión. **No se crean cuentas desde esta automatización.**
3. ~~Sin decisión sobre versionar `package-lock.json`~~ → **RESUELTO**: versionado en `4b10d9e` y `npm ci` verificado.

Resuelto en esta pasada: dependencias coherentes y sin secretos, lockfile versionado, instalación reproducible, prueba de seguridad del reporte (1/1 PASS), orden de publicación y reversión no destructiva, guía breve de navegador, confirmación de proyecto Firebase, caché PWA v10 y modelo multi-admin con herramientas visibles en cabecera y panel.

Secuencia autorizada:

- `git push public-pages HEAD:main` desde `fase1-validada-2026-11-17`.
- `firebase deploy --only firestore:rules,storage:rules --project sierra-madre-seguridad` **inmediatamente después**.
- Crear la cuenta operativa de prueba `qa-op-…`: **fuera de alcance de esta automatización**; la ejecuta el dueño en su propia sesión.

**No se ejecutan migraciones, restauraciones, creación de usuarios reales ni Fase 2.**

Resultado: ver **sección 12**.

---

## 12. Resultado de la publicación (17-11-2026)

| Acción | Resultado |
|---|---|
| `git push public-pages HEAD:main` | **OK** — `312da55..264db0a`, fast-forward, sin `--force`. `git ls-remote` confirma `264db0a041325ba7a0615069331c083b5b8d2ecb`. |
| Verificación del sitio | **OK** — `https://vicozero.github.io/` responde 200; el HTML contiene `adminTools`; `sw.js` sirve `sm-seguridad-v10`. (`adminSessionsButton` se crea dinámicamente, no aparece en el HTML estático.) |
| `firebase deploy --only firestore:rules --project sierra-madre-seguridad` | **OK** — «rules file compiled successfully» + «released rules to cloud.firestore» + «Deploy complete!». |
| `firebase deploy --only firestore:rules,storage:rules --project sierra-madre-seguridad` | **FALLÓ en preverificación, sin escrituras** — «Firebase Storage has not been set up on project sierra-madre-seguridad». Por eso se aisló Firestore, que sí estaba listo. |
| Proyecto | **Correcto** — ID `sierra-madre-seguridad`, número `260475494499`, coincide con `projectId`, `appId` y `messagingSenderId` de la config web. |
| Cuentas de prueba | **No creadas.** Fuera de alcance; las ejecuta el dueño en su sesión. |
| Migraciones / restauraciones / Fase 2 | **No ejecutadas.** |

### Paso manual pendiente para terminar Storage

1. Abrir https://console.firebase.google.com/project/sierra-madre-seguridad/storage y pulsar **Get Started** para dar de alta Storage y crear el bucket por defecto (el elegido en la config web es `sierra-madre-seguridad.firebasestorage.app`). Revisar la ubicación del bucket: es una decisión irreversible.
2. Con Storage dado de alta, ejecutar desde `centinela/`:

```powershell
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"
.\node_modules\.bin\firebase.cmd deploy --only storage:rules --project sierra-madre-seguridad
```

3. Registrar aquí el resultado. Hasta entonces, **la publicación no está completamente terminada**: las reglas de Storage siguen siendo las antiguas (más permisivas), por lo que no hay bloqueo de escrituras, pero sí queda pendiente el endurecimiento documentado.
