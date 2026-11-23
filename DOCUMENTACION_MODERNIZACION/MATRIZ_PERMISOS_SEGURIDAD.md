# Matriz de Permisos — Seguridad Industrial Sierra Madre

**Fecha:** 22-11-2026 · **Estado:** FASE 1 (diagnóstico). No se modificaron roles ni reglas.

---

## 1. Dónde se decide realmente el acceso

| Capa | Archivo | Papel |
|---|---|---|
| **Autoridad real** | `firestore.rules` | Evalúa cada lectura/escritura con `request.auth`, perfil activo, propiedad/asignación, unidad, permisos y `revision + 1`. Fallback denegado en `:382-384`. |
| Adaptador cliente | `cloud-portal.js` | Intercepta `/api/*`, valida y aplica transacciones. **No es autoridad**: un usuario con SDK puede llamar directo a Firestore. |
| UI | `accounts-ui.js`, `firebase-auth.js` | Oculta botones y aplica `allowedUnits`. Es *soft enforcement*. |
| Futuro backend | `functions/index.js`, `worker/app.js` | No desplegados en GitHub Pages; no cubren el flujo actual. |

**Regla de oro:** ocultar un botón nunca sustituye una regla.

---

## 2. Modelo actual

- Identidad: Firebase Authentication + documento en `profiles` (UID).
- Administrador principal: `security/authority.administratorUid`.
- Administradores secundarios: perfiles activos con `role:'admin'` (`firestore.rules:16-24`).
- Transferencia de encargatura: transacción que actualiza `security/authority`, promueve al objetivo y conserva `role:'admin'`/`active:true` del principal anterior (`cloud-sessions.js`).
- `role` y `active` del principal **no** pueden ser modificados por administradores secundarios (`firestore.rules:57-65`).
- `allowedUnits` + `restrictUnits` limitan por unidad (`accounts-ui.js:22,53`, `cloud-portal.js:20,45-52`).
- Sesiones: `sessions` con `activeMs`, reloj, cierre y transferencia.

Modo local/legacy (`firebase-auth.js:338-393`): **no apto para producción**. Restaura sesión desde `localStorage` sin reautenticación (hallazgo S-06).

---

## 3. Roles propuestos (granulares, sin depender solo del nombre)

| Rol | Alcance | Operaciones clave |
|---|---|---|
| **Superadministrador** | Global | Configuración completa, seguridad de acceso, transferencia, auditoría, respaldos |
| **Administrador de Seguridad** | Unidades autorizadas | Supervisiones, metas, acciones, reportes, usuarios autorizados, verificaciones |
| **Jefe de Departamento** | Su departamento | Consulta, asigna responsables si tiene permiso, atiende compromisos |
| **Supervisor de Seguridad** | Unidades/departamentos asignados | Captura inspecciones, genera hallazgos, actualiza seguimientos, consulta sus actividades |
| **Responsable de Acción** | Acciones asignadas | Consulta y actualiza sus acciones, adjunta evidencia |
| **Consulta / Gerencia** | Solo lectura autorizada | Indicadores y reportes; sin escrituras |

**Nota:** hoy no existe esta granularidad; hay `admin` + perfiles con `permissions` y `allowedUnits`. La migración debe ser aditiva: conservar `role` y agregar `permissions[]` explícitos.

---

## 4. Matriz de operaciones (objetivo)

Leyenda: ✅ permitido · 🔒 solo con permiso explícito · ⛔ denegado · — no aplica

| Operación | Superadmin | Admin Seg. | Jefe Depto. | Supervisor | Resp. Acción | Consulta |
|---|---|---|---|---|---|---|
| Ver dashboard global | ✅ | ✅ | 🔒 su depto. | 🔒 sus unidades | 🔒 sus acciones | ✅ autorizado |
| Capturar formato | ✅ | ✅ | 🔒 | ✅ | — | ⛔ |
| Guardar borrador propio | ✅ | ✅ | ✅ | ✅ | — | ⛔ |
| Finalizar formato | ✅ | ✅ | 🔒 | ✅ propio | — | ⛔ |
| Reabrir formato finalizado | ✅ | 🔒 con motivo | ⛔ | ⛔ | — | ⛔ |
| Crear hallazgo desde inspección | ✅ | ✅ | 🔒 | ✅ | — | ⛔ |
| Asignar acción | ✅ | ✅ | 🔒 su depto. | 🔒 con permiso | ⛔ | ⛔ |
| Actualizar avance de acción | ✅ | ✅ | 🔒 | 🔒 | ✅ asignada | ⛔ |
| Cambiar fecha compromiso | ✅ | 🔒 con justificación | ⛔ | ⛔ | ⛔ | ⛔ |
| Adjuntar evidencia | ✅ | ✅ | 🔒 | 🔒 | ✅ asignada | ⛔ |
| Enviar a verificación | ✅ | ✅ | 🔒 | ✅ | ✅ | ⛔ |
| Rechazar cierre | ✅ | ✅ | 🔒 | ⛔ | ⛔ | ⛔ |
| Verificar y cerrar | ✅ | ✅ | 🔒 competente | ⛔ | ⛔ | ⛔ |
| Ver bitácora de auditoría | ✅ | ✅ | 🔒 su depto. | 🔒 propio | 🔒 propio | 🔒 autorizado |
| Crear/editar usuario | ✅ | 🔒 autorizados | ⛔ | ⛔ | ⛔ | ⛔ |
| Cambiar **propio** rol | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| Transferir encargatura | ✅ principal | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| Ver sesiones activas | ✅ | ✅ | ⛔ | ⛔ | ⛔ | ⛔ |
| Gestionar departamentos | ✅ | 🔒 | ⛔ | ⛔ | ⛔ | ⛔ |
| Catálogos normas/temas | ✅ | ✅ | ⛔ | ⛔ | ⛔ | ⛔ |
| Respaldos y restauración | ✅ | 🔒 solo exportar | ⛔ | ⛔ | ⛔ | ⛔ |

---

## 5. Restricciones por unidad y departamento (FASE 2)

1. Toda restricción debe evaluarse con `departmentId` / `unitId`, no con texto.
2. `allowedUnitIds[]` reemplaza gradualmente a `allowedUnits`; mientras tanto se conservan ambos.
3. Un jefe de departamento no puede ver registros de otro departamento aunque pertenezca a la misma unidad.
4. Los admin secundarios no pueden promover ni transferir la encargatura.
5. Las cuentas desactivadas (`active:false`) deben ser denegadas por reglas, no solo ocultas en UI.
6. La verificación de cierres exige permiso competente; un riesgo crítico no puede cerrarse sin revisión.

---

## 6. Brechas detectadas en FASE 1

| ID | Brecha | Severidad | Evidencia | Corrección prevista |
|---|---|---|---|---|
| S-01 | `profiles` permite `list` a cualquier operador activo: expone correos, roles, permisos y unidades ajenos | Media | `firestore.rules:54-56` | Separar directorio mínimo del perfil privado o servir proyección reducida (F8) |
| S-02 | Admin secundario puede alterar campos del perfil principal salvo `role`/`active` | Media | `firestore.rules:57-65`, `cloud-portal.js:99,116,123-129` | Validación field-level + operación服务端 (F8) |
| S-03 | `security/authority` legible por cualquier autenticado | Bajo-Medio | `firestore.rules:26-27` | Limitar `get` a principal/administración (F8) |
| S-04 | `auditLog` append-only pero escrito por cliente | Medio | `firestore.rules:197-203` | Generar entradas en servidor o restringir `action`/`target` (F4/F8) |
| S-05 | `activeMs` lo calcula el cliente | Bajo-Medio | `cloud-sessions.js:110-120` | Calcular en servidor o acotar delta con `request.time` (F8) |
| S-06 | Sesión local sin reautenticación (modo local) | Medio | `firebase-auth.js:31,77-90,523-528` | No usar modo local en producción; expirar sesión local (F8) |
| S-07 | `storage.rules` define admin solo como el UID principal; Firestore admite varios admins | Medio | `storage.rules:4-6` vs `firestore.rules:16-24` | Alinear antes de habilitar Storage (F8) |
| S-09 | Storage rules no desplegadas: bucket no dado de alta | Medio | `CHECKLIST_PUBLICACION_FASE1.md:292,299-307` | Decisión del dueño; no bloqueante para F2-F7 |

**No se encontraron** rutas que permitan a un usuario cambiar su propio `role` mediante la UI publicada, ni escalamiento directo por botones. Sí existe exposición de información por lectura de perfiles (S-01) y riesgo en escrituras directas a Firestore (S-02).

---

## 7. Reglas de operación segura

- Ninguna automatización crea usuarios reales ni usa credenciales personales.
- Los permisos se registran en `profiles` y se validan en `firestore.rules`.
- Todo cambio de permisos queda en bitácora con autor y fecha del servidor (pendiente F4/F8).
- No se almacenan contraseñas en texto plano; el hash local actual es débil y queda fuera de producción (S-06).
- No hay credenciales administrativas en JavaScript público: la API key es pública por diseño y no es control de acceso.
- La revocación de sesiones y cuentas desactivadas se valida en cada operación, no solo al iniciar sesión.
