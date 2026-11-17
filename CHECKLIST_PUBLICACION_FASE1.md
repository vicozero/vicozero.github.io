# Checklist de publicación — Fase 1 (Sierra Madre Seguridad)

**Fecha:** 17 de noviembre de 2026 (verificación de prepublicación, segunda pasada)  
**Proyecto:** `centinela/`  
**Sitio actual:** `https://vicozero.github.io/`  
**Rama:** `fase1-validada-2026-11-17` · **commit validado de código:** `fb1795da5fe7593043f08fb530d39162a7e413b9`  
**Etiqueta del estado validado:** `fase1-validada-2026-11-17-final` → `fb1795d`  
**Estado:** **PREPARADO PERO DETENIDO.** No se publicó, no se migró, no se crearon usuarios y no se modificaron datos productivos.

---

## 1. Estado del repositorio

| Concepto | Resultado |
|---|---|
| Rama activa | `fase1-validada-2026-11-17` |
| `HEAD` | Commit de documentación de esta pasada; **código validado inalterado en** `fb1795d` (etiqueta `fase1-validada-2026-11-17-final`). |
| Contenido de la rama | **98 archivos** respecto a `312da55`: **79 modificados + 19 nuevos** esenciales. Incluye `firestore.rules`, `storage.rules`, `cloud-portal.js`, `firebase-auth.js`, `sw.js`, `brand.css`, `library-page.js` y sus copias, `verify-migration-backup.mjs`, `migrate-verified-workspace.mjs`, `test-*.mjs`, informes y este checklist. |
| Árbol de trabajo | Limpio: 0 modificados, 0 en staging. 8 artefactos sin versionar (sección 3). |
| Espejos `docs/` / `public/` | Verificado por hash SHA-256 en 9 archivos clave (`cloud-portal.js`, `firebase-auth.js`, `brand.css`, `sw.js`, `index.html`, `library-page.js`, `workspace.js`, `training-suite.js`, `normative-catalog.json`): **raíz = docs = public**. |
| Service worker | Caché **`sm-seguridad-v8`** (corrección: el informe anterior decía v7). |
| Operaciones realizadas | Solo lectura: `git status`, `git log`, `git diff`, `git ls-remote`, `npm ls`, hashes. **Sin `push`, sin `firebase deploy`, sin migración.** |

---

## 2. Estado de pruebas

| Concepto | Resultado |
|---|---|
| Pruebas críticas con Firebase Emulator | **4/4 PASS** — `test-firestore-rules.mjs`, `test-cloud-portal.mjs`, `test-phase1-units.mjs`, `test-phase1-storage.mjs` |
| Pruebas adicionales con Emulator | **2/2 PASS** — `test-phase1-extras.mjs`, `test-suite-store.mjs` |
| Pruebas locales (regresión + enfocadas) | **17/17 PASS** |
| **Total Fase 1** | **23 PASS · 0 FAIL · 0 BLOCKED** |
| Carga del sitio live (sin sesión) | OK — título correcto, pantalla de acceso, 0 errores de consola |
| Repetición de pruebas | **No se repitió ninguna.** No se modificó código relacionado con las pruebas aprobadas. |

Cobertura ya aprobada: reglas Firestore/Storage (propiedad, unidad, permisos, `revision + 1`, inmutabilidad), portal (fotos conservadas, fragmentos, homónimos, UID, `/api/inconsistencies` 200/403), respaldos (SHA-256, duplicados, campos sensibles, preview sin escrituras), 15 formatos + 3 operativos, PDF y CSV (`test-phase1-csv.mjs`).

---

## 3. Dependencias y archivos esenciales

### Lockfile y dependencias

| Verificación | Resultado |
|---|---|
| `package-lock.json` | `lockfileVersion: 3`, `name: sierra-madre-security-validation`. Declaraciones del root idénticas a `package.json`. |
| Versiones resueltas = instaladas | `@firebase/rules-unit-testing` **5.0.2** (`^5.0.0`), `firebase` **12.19.0** (`^12.0.0`), `firebase-tools` **15.36.0** (`^15.0.0`). Coinciden con `npm ls --depth=0`. |
| Estado de instalación | Consistente. No se instaló ni actualizó nada en esta pasada. |
| **Bloqueo** | `package-lock.json` está **sin versionar** (322 KB). Un clone limpio no puede usar `npm ci`; solo `npm install`. Requiere decisión de inclusión antes de publicar. No se agregó para no alterar el commit validado sin autorización. |
| `functions/` | `functions/package.json` declara Node 20, `firebase-admin ^12`, `firebase-functions ^5`. **No existe `functions/package-lock.json`**. Las Cloud Functions **no** están en el alcance de esta publicación. |

### Artefactos sin versionar (8)

| Archivo | ¿Indispensable? | Uso / decisión |
|---|---|---|
| `package-lock.json` | **SÍ, para instalación reproducible** | Pin de dependencias. Pendiente de decisión de inclusión (bloqueo anterior). |
| `archive-verified-backup.mjs` | No | Script puntual de archivado; importa `verify-migration-backup.mjs` y `firebase-tools/lib/auth.js`. No referenciado por `package.json`, build ni publicación. |
| `download-nom-pdfs.mjs` | No | Descarga puntual de PDFs del catálogo NOM; no referenciado. |
| `enrich_talks.py`, `extract_nom_meta.py`, `extract_nom_meta2.py`, `verify_noms.py`, `verify_noms2.py` | No | Herramientas de generación/verificación del catálogo (requieren Python + PyMuPDF `fitz`). No intervienen en build, instalación, pruebas ni publicación. |
| `firebase-migration-config.json` | No (y no debe versionarse) | Configuración local de migración; protegida por `.gitignore`. |

No existen workflows de CI (`.github/`) ni `.firebaserc` en el repositorio.

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
| `firebase-auth.js` (y copias) | `projectId: sierra-madre-seguridad`, `authDomain: sierra-madre-seguridad.firebaseapp.com`, `storageBucket: sierra-madre-seguridad.firebasestorage.app`, `appId: 1:260475494499:web:…`. Proyecto previsto, sinmezcla con el proyecto de emulador `demo-sierra-madre`. |
| `firebase-migration-config.json` (gitignored) | `projectId: sierra-madre-seguridad`, `databaseId: (default)`, `authorizationModel: server-managed-role`, `productionSwitchEnabled: false`, migración en estado `pending-backup-…`. **No se leyó ni expuso el valor de `initialAdministrator`.** |
| `.firebaserc` | **Ausente.** Todo comando CLI debe llevar `--project sierra-madre-seguridad` explícitamente. Riesgo de apuntar al proyecto equivocado si se omite. |
| Reglas | Probadas solo en emulador. No se publicaron. |

---

## 6. Preparación segura de cuentas de prueba (NO ejecutada)

**Principios:** el usuario dueño autoriza y ejecuta la creación; el asistente no solicita, recibe, guarda ni reutiliza contraseñas; no se usan credenciales personales ni se crean cuentas reales sin autorización.

1. **Cuenta no administradora (creable desde la UI):** tras autorización, en la app → *Usuarios y permisos* → **+ Registrar usuario**. Usar un correo de prueba desechable del dominio autorizado, p. ej. `qa-op-20261117@<dominio-autorizado>`. Generar la contraseña **localmente** con `[guid]::NewGuid().ToString('N')`; escribirla solo en el formulario; no pegarla en chat, correos, archivos ni `localStorage`. Rol: **operador / usuario operativo**, sin administración; desactivar permisos de `reports`/`actions`/`plans` si la UI lo permite (es el caso que debe dar 403).
2. **Cuenta administradora:** la UI **no permite crear un segundo administrador** («La administración principal se transfiere desde la configuración central…»). Por tanto, la validación admin debe hacerla **el administrador dueño en su propia sesión**, tecleando su contraseña él mismo. No se comparte ni se almacena. No se modifica `security/authority` ni `initialAdministrator`.
3. **Higiene:** tras las pruebas, desactivar/eliminar la cuenta `qa-op-…` desde la misma vista. No crear registros operativos de prueba: las cinco validaciones son de solo lectura (la previsualización se cancela).
4. **Si no se autoriza la creación:** las validaciones siguen pendientes y **no se declaran aprobadas**. El modo local no sustituye a una cuenta cloud.

---

## 7. Procedimiento para validación en navegador (instrucciones, no ejecutadas)

Precondición: sesión autenticada, sitio `https://vicozero.github.io/`, caché PWA v8 cargada (si aparece UI antigua: recarga forzada / borrar datos del sitio).

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
6. **Cierre:** registrar en este checklist fecha, cuenta usada (sin contraseña), resultado de cada punto y cualquier error de consola.

> Si alguno falla: no publicar (o ejecutar reversión si ya se publicó) y documentar el bloqueo. No se marcan como aprobadas hasta ejecutarse.

---

## 8. Secuencia de publicación y reversión (corregida)

### 8.1 Orden de publicación — **frontend primero, reglas después**

**Razón:** las reglas nuevas son más estrictas en several puntos (unidades/permisos, `validRecordWrite`, inmutabilidad de `assignedAccountId`, validaciones de pláticas/NOM, `evidenceChunks`). El frontend antiguo de producción no fue probado contra ellas; publicar reglas primero podría bloquear escrituras legítimas del frontend antiguo. El frontend nuevo sí fue probado contra las reglas nuevas, y bajo las reglas antiguas (más permisivas) solo pierde temporalmente funciones puntuales: escaneo de fragmentos huérfanos (`orphan_scan_unavailable`) y rol `supervisor`. Por eso el orden correcto es **web → reglas**, con la ventana mínima posible.

**No ejecutar hasta autorización expresa:**

```powershell
# 0) Verificación (solo lectura / local)
git checkout fase1-validada-2026-11-17
git status
git rev-parse HEAD
npm.cmd run check
node sync-copies.mjs          # debe reportar 55 archivos / 112 copias, hashes MATCH

# 1) Frontend primero
git push public-pages HEAD:main

# 2) Reglas inmediatamente después (ventana de incompatibilidad mínima)
firebase deploy --only firestore:rules,storage:rules --project sierra-madre-seguridad

# 3) Smoke autenticado de los cinco puntos de la sección 7 + consola sin errores
```

**No publicar Cloud Functions:** no están en el alcance y su lockfile falta.

### 8.2 Reversión — **reglas primero, frontend después**

```powershell
# 1) Reglas: volver a las versiones de 312da55
git show 312da55:firestore.rules > firestore.rules.rollback
git show 312da55:storage.rules   > storage.rules.rollback
Copy-Item firestore.rules.rollback firestore.rules -Force
Copy-Item storage.rules.rollback   storage.rules   -Force
firebase deploy --only firestore:rules,storage:rules --project sierra-madre-seguridad
git checkout fase1-validada-2026-11-17 -- firestore.rules storage.rules
Remove-Item firestore.rules.rollback, storage.rules.rollback

# 2) Frontend: reponer el sitio previo
git push public-pages 312da55:main
```

- Las reglas son declarativas e idempotentes: si el despliegue falla a mitad, repetir el paso 1.
- Tras reponer el frontend, la caché **`sm-seguridad-v8`** puede seguir sirviendo assets nuevos: recarga forzada, borrar datos del sitio o reinstalar la PWA.
- **No hay reversión de datos**: no se migró ni escribió nada productivo.
- Si el problema aparece solo en módulos de capacitación/NOM, sospechar de las validaciones nuevas de `talk_topics`/`talk_schedules`/`talk_sessions`/`compliance_assessments` y revertir reglas antes que el frontend.

---

## 9. Riesgos de publicación

| Nivel | Riesgo | Mitigación |
|---|---|---|
| **ALTO si se invierte el orden** | Reglas nuevas + frontend antiguo → escrituras denegadas por validaciones de unidad/permisos y de pláticas/NOM. | Publicar **frontend primero, reglas después** (sección 8.1). |
| **MEDIO** | Ventana breve de frontend nuevo bajo reglas antiguas: reporte de huérfanos degradado y rol `supervisor` sin efectos. | Encadenar ambos comandos sin pausa; verificar después. |
| **MEDIO** | Validaciones manuales autenticadas pendientes (PDF/CSV/preview/admin/no-admin). | Ejecutar sección 7 con cuentas autorizadas; si fallan, reversión sección 8.2. |
| **MEDIO** | Reglas probadas solo en emulador `demo-sierra-madre`, no con volumen real. | Autorización expresa; revisar `/api/inconsistencies` con datos reales antes de cualquier reasignación. |
| **MEDIO** | `package-lock.json` sin versionar → `npm ci` imposible en clone limpio. | Decidir su inclusión antes de publicar; no alterar el commit validado sin autorización. |
| **MEDIO** | Ausencia de `.firebaserc`: riesgo de desplegar reglas en proyecto equivocado. | Usar siempre `--project sierra-madre-seguridad`. |
| **BAJO** | Caché PWA v8 en dispositivos con assets antiguos (contador ausente). | Recarga forzada / borrar datos / reinstalar; no cambiar versión sin cambio de código. |
| **BAJO** | `origin/main` divergente (1/59). | Publicar **solo** a `public-pages`; nunca hacer push a `origin`. |
| **BAJO** | `functions/` sin lockfile y fuera de alcance. | No desplegar functions en esta publicación. |
| **INFORMATIVO** | API key pública de Firebase en el código. | Pública por diseño; la seguridad depende de las reglas. Sin secretos privados en el repo. |

---

## 10. Confirmación de datos productivos

- **No se modificaron registros productivos.** Pruebas en emulador (`demo-sierra-madre`, 8087/9199) y archivos aislados.
- **No se crearon usuarios reales**, no se usaron credenciales personales y no se solicitaron contraseñas.
- **No se realizaron migraciones ni restauraciones**; `migrate-verified-workspace.mjs` y `verify-migration-backup.mjs` siguen como herramientas sin ejecutar sobre producción.
- **No se publicaron reglas ni se desplegó el sitio.** `public-pages/main` sigue en `312da55`.
- **No se inició la Fase 2.**

---

## 11. Bloqueos y autorización requerida

Bloqueos actuales:

1. Sin autorización expresa para publicar frontend y reglas.
2. Sin cuentas de prueba autorizadas; el administrador no puede ser creado desde la UI (debe usar su sesión dueña).
3. Sin decisión sobre versionar `package-lock.json` (recomendado para `npm ci`).

Se solicita autorización para:

- `git push public-pages HEAD:main` desde `fase1-validada-2026-11-17`.
- `firebase deploy --only firestore:rules,storage:rules --project sierra-madre-seguridad` **inmediatamente después**.
- Crear la cuenta operativa de prueba `qa-op-…` (el administrador dueño ejecuta su propia validación).

**Hasta recibirla: no se ejecuta ningún despliegue, publicación de reglas, creación de usuarios ni migración.**
