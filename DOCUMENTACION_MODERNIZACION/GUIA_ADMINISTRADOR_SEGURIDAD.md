# Guía del Administrador — Seguridad Industrial Sierra Madre

**Versión:** 1.0 · **Fecha:** 22-11-2026 · **Estado:** FASE 1

---

## 1. Modelo de administración

| Figura | Definición | Puede |
|---|---|---|
| **Encargado principal** | UID en `security/authority.administratorUid` | Transferir la encargatura, administración completa |
| **Administradores secundarios** | Perfiles activos con `role:'admin'` | Administrar usuarios autorizados, sesiones, reportes, verificaciones |
| **Superadministrador (propuesto)** | Rol granular a definir en FASE 8 | Configuración de seguridad, auditoría, respaldos |

**Restricciones actuales ya implementadas:**
- Solo el principal puede **Cambiar encargado** (transferencia con `runTransaction`).
- Todos los administradores pueden ver **Sesiones activas**.
- Los secundarios **no** pueden transferir ni promover.
- `role` y `active` del principal están protegidos en `firestore.rules:57-65`.
- Botones de administración en cabecera y panel, con la restricción anterior.

---

## 2. Usuarios y permisos

1. Abra **Usuarios y permisos**.
2. Alta/edición de perfil: nombre, correo, unidad, rol, permisos y unidades permitidas.
3. La restricción por unidad usa `allowedUnits` + `restrictUnits`; compare mayúsculas y acentos porque hoy es texto libre.
4. Una cuenta desactivada (`active:false`) debe dejar de acceder. Verifíquelo en reglas, no solo en la UI.
5. **Nunca cambie su propio rol** ni promueva cuentas sin autorización.
6. Los cambios de permisos deberán quedar en bitácora (implementación completa en FASE 4/8).

**Roles objetivo (FASE 8):** Superadministrador, Administrador de Seguridad, Jefe de Departamento, Supervisor de Seguridad, Responsable de Acción, Consulta/Gerencia. Permisos granulares, sin depender solo del nombre del rol.

---

## 3. Sesiones

- **Sesiones activas** muestra quién está trabajando, inicio, tiempo activo y estado.
- **Cambiar encargado** solo lo ve el principal; la transferencia es transaccional y conserva el perfil anterior como administrador activo.
- El tiempo `activeMs` lo reporta el cliente: no lo use como evidencia de auditoría hasta FASE 8.

---

## 4. Catálogos

| Catálogo | Estado hoy | Acción |
|---|---|---|
| Usuarios, roles, permisos | Administrable | USUARIOS Y PERMISOS |
| Unidades | Texto libre en perfiles y registros | Normalizar; FASE 2 crea IDs |
| **Departamentos y áreas** | **No existe catálogo** | FASE 2: crear `departments` con `id`, aliases y vigencia |
| Turnos | Texto libre en formatos | Estandarizar en FASE 3 |
| Tipos de formato | 17 en `formats.js` | No eliminar; FASE 3 agrega plantillas configurables |
| Normas NOM | 44 en catálogo local con PDF | Administrable por la suite |
| Temas de pláticas | 52 en `safety-talk-topics.json` | Administrable por la suite |
| Metas KPI | Por persona en `plans` | Programa mensual |

**Regla:** los catálogos nuevos son aditivos. Los campos históricos de texto se conservan como espejo de lectura.

---

## 5. Respaldos

**Existentes (verificados en FASE 1):** cinco `git bundle` en `..\backups\`, un ZIP de árbol y un snapshot Firestore parcial en `.qa/cloud-backups/`.

**Nuevo respaldo de FASE 1:**
- Archivo: `..\backups\sierra-madre-fase1-auditoria-20261122.bundle`
- Tamaño: 24,782,391 bytes
- SHA-256: `6B9E3061E42FC4578DEDFB24155FC46B21323A9822A0856E0FCCCB2637F7B0A2`
- `git bundle verify`: OK — complete history, HEAD `e0110f1`

**Procedimiento seguro:** ver `MODELO_DATOS_SEGURIDAD.md`, sección 7. No ejecutar `reset --hard`, `rebase`, `--force` ni restaurar sobre la rama activa o `public-pages/main`.

**Limitación crítica:** el importador `migrate-verified-workspace.mjs` rechaza respaldos con `reports`/`actions`/`plans`, y el importador local no transfiere fotos. **No hay hoy una ruta verificada para migrar datos operativos completos.** No importar a producción hasta FASE 2.

---

## 6. Storage y reglas

- `firestore.rules` está desplegado y es la autoridad real (`rules compiled successfully` + `released rules to cloud.firestore`).
- `storage.rules` **está alineado y probado en emulador**, pero **no desplegado**: el proyecto no tiene bucket. La creación con el token autorizado devolvió `403 accountDisabled` («billing account … disabled in state absent»). No se intentó evadir facturación.
- Para activarlo:
  1. Habilitar la facturación del proyecto Firebase. Sin esto, la API de Storage rechaza la creación del bucket.
  2. Dar de alta Storage con bucket `sierra-madre-seguridad.firebasestorage.app` en ubicación `US` (alineada con Firestore `nam5`). La ubicación es **irreversible**: verificarla antes de confirmar.
  3. Con `JAVA_HOME\bin` en PATH: `.\node_modules\.bin\firebase.cmd deploy --only storage:rules --project sierra-madre-seguridad`.
  4. Verificar y documentar el resultado. No hay que reescribir reglas: S-07 ya quedó cerrada.
- Hasta entonces, las fotos viven inline en Firestore con fragmentos; no depositar evidencia nueva fuera de Firestore.

---

## 7. Política de publicación

1. **Sin autorización expresa no se publica**: no commit, no push, no deploy.
2. Editar siempre la **raíz** de `centinela/`; nunca `docs/` o `public/` directamente.
3. `node sync-copies.mjs` → 56 archivos / 112 copias.
4. Subir caché PWA en `sw.js` (actual `sm-seguridad-v13` → siguiente `v14`).
5. Ejecutar solo pruebas afectadas; no repetir las 24 aprobadas sin cambio.
6. `git push public-pages HEAD:main` — fast-forward, **sin `--force`**, jamás a `origin`.
7. Verificar en vivo con parámetro de caché: HTTP 200, `sw.js`, módulos modificados.
8. Si hay reglas: desplegar Firestore por separado; Storage requiere bucket.
9. Actualizar `CHECKLIST_PUBLICACION_FASE1.md` y este plan con el resultado real.

---

## 8. Bitácora y auditoría (estado actual)

- Las acciones guardan `history[]` con autor en texto, fecha de cliente y progreso, **sin valores anteriores/nuevos ni motivo**.
- `auditLog` solo lo escribe la suite normativa/capacitación; **no hay pantalla de consulta**.
- Las reaperturas de formatos y los cambios de fecha compromiso no generan evento estructurado.
- FASE 4 agregará eventos con `actorUid`, `serverTimestamp()`, `before`/`after` y `reason`; FASE 6/8 la interfaz de consulta.

---

## 9. No hacer

- No crear cuentas de prueba reales desde automatizaciones.
- No introducir contraseñas, tokens ni claves de administración en código o documentos.
- No borrar colecciones ni registros históricos para «limpiar».
- No activar offline incompleto ni notificaciones externas sin configuración y autorización.
- No publicar cambios sin el orden descrito en §7.
