# Acciones correctivas centralizadas — Sierra Madre

Estado: núcleo implementado en `workspace.js` (colección `actions` en Firestore). Esta fase documenta el flujo y los campos.

## Estados (máquina de estados)

1. **Registrada** — creada manualmente o desde un hallazgo (inspección, VEO, observación, incidente, auditoría).
2. **Asignada** — tiene responsable y fecha compromiso definidos.
3. **En proceso** — el responsable trabaja la acción (avance > 0 y < 100).
4. **Pendiente de verificación** — avance = 100%, espera validación del supervisor/administrador.
5. **Cerrada** — validada con evidencia documentada (`verifier` + `verifiedDate` + evidencia fotográfica).
6. **Vencida** — condición calculada cuando `due < hoy` y el estado no es `Cerrada`.

Transiciones válidas (enforced por `firestore.rules`):
- No se puede establecer `status = 'Cerrado'` directamente por un no-administrador.
- El cierre requiere `revision + 1` y que el estado previo no sea `Cerrado`.
- Una acción cerrada no puede reabrirse (`resource.data.status != 'Cerrado'` en update).

## Campos de una acción

| Campo | Tipo | Descripción |
|---|---|---|
| `id` / `folio` | string | Identificador único (`SM-AC-...`) |
| `description` | string | Descripción de la acción |
| `owner` / `ownerAccountId` | string | Responsable |
| `assignedAccountId` | string | Cuenta asignada (igual al owner por defecto) |
| `unit` | string | Unidad/área |
| `source` | string | Origen: `Inspección`, `VEO`, `Observación`, `Incidente`, `Auditoría`, `Manual`, `Otro` |
| `start` / `due` | date | Fecha de inicio y compromiso |
| `priority` | enum | `Alta`, `Media`, `Baja` |
| `progress` | number 0–100 | Avance |
| `status` | enum | `Pendiente`, `Por verificar`, `Cerrado`, `Vencido` (calculado) |
| `photos` / `photoChunkIds` | array | Evidencia fotográfica |
| `verifier` | string | Quien validó el cierre |
| `verifiedDate` | date | Fecha de validación |
| `notes` | string | Comentarios |
| `history` | array | Historial de actualizaciones |
| `revision` | number | Control de concurrencia |

## Integración con otros módulos

- **Inspecciones / VEO / Observaciones**: al registrar un hallazgo con acción correctiva, se crea una acción con `source` = tipo de origen y `progress` inicial según el estado del hallazgo.
- **Incidentes**: las acciones derivadas de la investigación se vinculan al folio del incidente.
- **KPI**: las acciones cerradas y vencidas alimentan el dashboard de avances (`workspace.js` → `metrics`).

## Alertas

- `Vencido` se calcula cuando `due < hoy` y `status != 'Cerrado'`.
- El tablero agrupa por: `Vencido`, `Pendiente`, `Por verificar`, `Cerrado`.
- Notificaciones push/email: pendientes (requieren Cloud Functions / backend).

## Pendientes

- Auto-creación de acción desde hallazgos de VEO y Observación (integración en el editor de `supervisor.js`).
- Notificaciones externas (email/push) — requiere backend.
- Migración de acciones legacy a la colección central (ya soportado por importación local→nube).