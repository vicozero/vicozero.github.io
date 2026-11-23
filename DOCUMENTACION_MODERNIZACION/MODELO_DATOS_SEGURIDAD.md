# Modelo de Datos — Seguridad Industrial Sierra Madre

**Fecha:** 22-11-2026 · **Estado:** FASE 1 (diagnóstico). Ninguna estructura fue modificada.

---

## 1. Principio de integridad

Los registros históricos se conservan **tal cual**. Las mejoras futuras son **aditivas**: se agregan identificadores estables y catálogos nuevos; los campos de texto originales quedan como espejos de solo lectura para trazabilidad.

> No se renombran campos, no se borran colecciones, no se sobrescriben registros por ID, no se importa a producción sin autorización.

---

## 2. Colecciones actuales

### 2.1 Núcleo operativo

| Colección / ruta | ID | Campos clave | Relaciones |
|---|---|---|---|
| `security/authority` | documento único `authority` | `administratorUid`, `updatedAt` | → `profiles`; ancla de reglas Firestore y Storage |
| `profiles` | UID de Firebase Auth | `name`, `email`, `unit`, `role`, `active`, `permissions`, `allowedUnits`, `restrictUnits`, `revision` | Destino de `ownerAccountId` / `assignedAccountId` |
| `reports` | UUID `id` + `folio` | `type`, `date`, `shift`, `supervisor`, `department`, `place`, `kpi`, `status`, `photos` / `photoChunkIds`, campos por `SAFETY.types` | → `profiles`; origen de acciones por `sourceReport`; → `evidenceChunks` |
| `actions` | UUID `id` + `folio SM-AC-…` | `description`, `owner`, `unit`, `source`, `start`, `due`, `priority`, `progress`, `status`, `photos`, `history[]`, `revision`, `verifier`, `verifiedDate` | → `reports` (`sourceReport`), → `profiles`, → `evidenceChunks` |
| `plans` | UUID `id` | `person`, `unit`, `department`, `period`, `kpi`, `targets`, `revision` | Se vincula a reports/actions por **nombre normalizado** en la matriz |
| `notices` | ID autogenerado | `type`, `severity`, `text`, `fromAccountId`, `toAccountId`, `fromName`, `toName`, `referenceId`, `attachments[]`, `legacyId` | → `noticeImages`, `noticeReads` |
| `noticeImages` | ID de imagen | `dataUrl` (≤900000 caracteres), `name`, `type`, `toAccountIds` | Adjunto de `notices` |
| `noticeReads/{uid}/items/{noticeId}` | compuesta | estado de lectura | → `profiles`, `notices` |
| `sessions` | ID de sesión | `userId`, `startedAt`, `updatedAt`, `activeMs`, `closed` | → `profiles` |
| `evidenceChunks` | `<recordId>-<uuid>-<n>` | `payload` (120000 caracteres), `recordCollection`, `recordId`, `ownerAccountId` | → `reports` / `actions`; inmutable |
| `auditLog` | ID autogenerado | `actorUid`, `action`, `target`, `createdAt` | Hoy solo lo escribe la suite normativa/capacitación |
| `migrationBackups/{sha256}` y `/chunks/{n}` | SHA-256 | `payload`, `sha256`, `status='verified-archive'` | Respaldos archivados |

### 2.2 Suite normativa / capacitación

| Colección | ID | Relación |
|---|---|---|
| `regulatory_versions` | `versionId` | Inmutable; → `standard_requirements.versionId` |
| `standard_requirements` | `requirementId` | → `regulatory_versions`; evaluada por `compliance_assessments` |
| `talk_topics` | `topicId` | Cada guardado crea `talk_topic_versions/<id>--<revision>` |
| `talk_topic_versions` | `<topicId>--<revision>` | Congelada por aprobación; → `talk_sessions` |
| `talk_schedules` | `scheduleId` | → `talk_topics`; `assignedAccountId == instructorId` |
| `talk_sessions` | `sessionId` | → `talk_schedules` + `talk_topic_versions`; puede generar `reports` tipo `talk` |
| `compliance_assessments` | `assessmentId` | → `standard_requirements`; `department` libre |
| `compliance_reviews` | `<assessmentId>--<revision>` | `evidenceIds[]`, `reviewedBy`, `reviewedAt` |

`SAFETY.types` expone **17 formatos** (15 en `formats.js:22-39` + `critical` y `flash` en `extended-formats.js:1-2`; el duplicado `observation` se resuelve en `formats.js:44-46`). Diez grupos KPI en `formats.js:41`.

---

## 3. Campos libres que deben volverse identificadores estables

| Campo actual | Ubicación | Problema | Destino aditivo |
|---|---|---|---|
| `reports.supervisor` | `supervisor.js:1`, `formats.js:77` | Texto usado como clave de agrupación; homónimos no resueltos | `supervisorAccountId` |
| `reports.department` | `supervisor.js:1`, `formats.js:37-38,77` | Texto con variantes de acento/caja | `departmentId` |
| `plans.person`, `plans.department` | `workspace.js:50-53` | Unicidad de programa validada por nombre | `personAccountId`, `departmentId` |
| `actions.owner`, `unit`, `requester`, `verifier` | `workspace.js:32`, `cloud-portal.js:210,225-227` | Nombres y unidades en texto | `ownerAccountId`, `unitId`, `verifierAccountId` |
| `unit` / `area` / `unidad` | `cloud-portal.js:20,45-52,174-176` | Tres alias del mismo concepto | `unitId` con aliases de lectura |
| `profiles.allowedUnits` | `accounts-ui.js:57,60` | Lista de texto; sensible a mayúsculas/acentos | `allowedUnitIds[]` |
| `reports.place`, `location`, `area`, `zone` | `formats.js:28-30,33-38` | Área física mezclada con departamento | `workplaceId` / `areaId`, `departmentId` separados |
| Filas de participantes | `formats.js:23-27,33-38,83-91` | `person`, `employee`, `position`, `responsible` como texto | `personId`, `employeeId`, `positionId`, `responsibleAccountId` |
| `talk_schedules.department`, `place` | `training-suite.js:35,38` | Texto; lista parseada `personId\|name\|…` | IDs + catálogo |
| `compliance_assessments.department` | `firestore.rules:289-295` | Obligatorio como texto | `departmentId` |

**Regla de conversión:** resolver equivalencias por UID/nómina, después por nombre normalizado; marcar ambigüedades para revisión humana. Nunca asignación automática silenciosa (patrón actual de advertencia en `cloud-portal.js:213-218`).

---

## 4. Evidencia fotográfica

- Captura máxima actual: **6 imágenes** por registro; redimensionado a 1400 px y JPEG q=0.78 (`supervisor.js:1`, `workspace.js:60`).
- `cloud-portal.js` fragmenta el JSON en trozos de 120000 caracteres (`:192-197`) y reconstruye en `list()` (`:57-70`); límite de registro 850000 bytes (`:230`); `firestore.rules:186` limita fragmentos a 500000 caracteres.
- Adjuntos de avisos: hasta 900000 caracteres (`firestore.rules:172`).
- Riesgos: fragmento ausente → foto incompleta; fragmentos huérfanos nunca se limpian; `/api/inconsistencies` detecta pero no reasigna (`cloud-portal.js:247-276`).
- `storage.rules` define `evidence/`, `avatars/` y `notices/`, pero **el bucket no está dado de alta** y las reglas no están desplegadas. Hoy las fotas viven inline en Firestore.

---

## 5. Historial, revisiones y cierres

- `revision` se incrementa en cada escritura (`cloud-portal.js:202-204`, `firestore.rules:151,248`) y se exige `revision + 1` para evitar conflictos.
- `actions.history[]` guarda `{at, by, status, progress, comment}` (`cloud-portal.js:225`). `worker/app.js:72` agregaba `owner`, `due` y `verifier` en la arquitectura anterior.
- `by` es un **nombre en texto**, no UID; `at` usa `new Date()` en cliente, no `serverTimestamp()`.
- No hay `before`/`after`, `reason`, evento semántico ni `actorUid`.
- Reportes finalizados pueden reabrirse (`supervisor.js:1`, botón `reopen`) sin evento de auditoría dedicado; `auditLog` solo lo escribe la suite (`safety-suite-store.js:17-28`).
- `cloud-portal.js:208-211` impide a no-admins cambiar campos clave, pero un admin puede modificar `due` sin conservar el original.

**Dependencia de FASE 4:** `originalStart`, `originalDue`, `rescheduleReason`, `rescheduledBy`, `rescheduledAt` y eventos con `before`/`after`.

---

## 6. Respaldos y recuperación

### 6.1 Inventario verificado

| Archivo (`..\backups\` y `.qa\`) | Fecha | Tamaño | Verificación |
|---|---|---:|---|
| `sierra-madre-pre-modernizacion-20261115-200319.bundle` | 15-11 20:03 | 6,211,583 | `git bundle verify` OK, historial completo, HEAD `76ef8c8` |
| `sierra-madre-pre-modernizacion-20261115-200319.zip` | 15-11 20:03 | 26,665,094 | SHA-256 OK; 116 entradas (no aplica `bundle verify`) |
| `sierra-madre-backup-20261116-101229.bundle` | 16-11 10:12 | 6,253,640 | OK, 13 refs, `main` `4f8841f` |
| `sierra-madre-before-normativa-20261116.bundle` | 16-11 11:54 | 6,284,996 | OK, HEAD `50cc229` |
| `sierra-madre-backup-20261116-120931.bundle` | 16-11 12:09 | 6,286,764 | OK, 13 refs, `main` `50cc229` |
| `sierra-madre-before-full-audit-20261116.bundle` | 16-11 17:03 | 24,559,941 | OK, HEAD `312da55` |
| **Nuevo:** `sierra-madre-fase1-auditoria-20261122.bundle` | 22-11 | 24,782,391 | OK, HEAD `e0110f1`. SHA-256 `6B9E3061E42FC4578DEDFB24155FC46B21323A9822A0856E0FCCCB2637F7B0A2` |
| `.qa/cloud-backups/2026-11-16T17-56-30-242Z.json` | 16-11 17:56 UTC | 1,315,505 | SHA del manifest coincide, `verified:true`. 53 sessions, 7 notices, 3 migrationBackups, 2 profiles, **0 reports/actions/plans** |

Los bundles cubren código/historial Git. El único snapshot de datos de nube es **parcial y envejecido**: no hay copia verificable de `reports`, `actions`, `plans` ni de evidencia fotográfica.

### 6.2 Herramientas (revisadas, NO ejecutadas sobre producción)

| Script | Función | Límite |
|---|---|---|
| `verify-migration-backup.mjs:16-58` | Valida formato, SHA, duplicados, conteos; `planImport()` calcula altas/omitidos/conflictos | No valida integridad de fotos |
| `migrate-verified-workspace.mjs:7-10` | Concilia `authority`, `profiles` y `notices` | **Rechaza respaldos con reports/actions/plans** |
| `archive-verified-backup.mjs:9-28` | Archiva en `migrationBackups/<sha256>` con lectura de vuelta | Requiere refresh token de CLI; payload <800000 bytes |
| `backup-cloud-readonly.mjs:11-38` | Snapshot Firestore + manifest SHA en `.qa/` | No cubre Storage ni auditoría futura |
| `firebase-auth.js:395-441` | Importador local→nube con `preview:true` | No transfiere fotos; fallback al admin |

---

## 7. Procedimiento de recuperación (descripción; NO ejecutado)

1. **Verificar:** recalcular SHA-256 de cada bundle y ejecutar `git bundle verify` en entorno aislado; descartar copias cuyo hash no coincida.
2. **Seleccionar:** elegir bundle por objetivo y registrar commit/HEAD interno y fecha.
3. **Aislar:** clonar el bundle en directorio nuevo. **Nunca** `checkout`, `reset --hard`, `rebase` ni `push --force` sobre la rama activa ni `public-pages/main`.
4. **Comparar:** conteos de colecciones, folios y `photoChunkIds` entre bundle, snapshot `.qa/` y estado actual leído con `backup-cloud-readonly.mjs`.
5. **Datos:** exportar primero el estado actual. Toda importación debe pasar `verifyBackup()` y conciliación con lectura de vuelta, sin borrar colecciones ni sobrescribir por ID.
6. **Evidencia:** recuperar primero fragmentos disponibles; si faltan, conservar lo recuperado y documentar la pérdida parcial. No reasignar huérfanos automáticamente.
7. **Cerrar:** dejar constancia de hash, directorio aislado, diferencias y autorización.

---

## 8. Migración hacia departamentos (FASE 2, no destructiva)

1. Crear `departments` con `id`, `name`, `aliases[]`, `activo`, vigencia.
2. Agregar `departmentId` a todas las entidades; conservar el texto actual.
3. Construir mapa de equivalencias revisado; ambigüedades a humano.
4. Actualizar consumidores (`progress-core.js`, PDFs, filtros) con fallback al texto.
5. Migrar `allowedUnits` a `allowedUnitIds[]` de forma aditiva.
6. Extender verificadores antes de cualquier importación.
7. No tocar Storage hasta que el bucket esté dado de alta y las reglas alineadas con Firestore.
