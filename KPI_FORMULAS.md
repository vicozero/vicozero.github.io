# Fórmulas KPI — Sierra Madre · Seguridad Operativa

Documentadas a partir de `progress-core.js` (función `matrix`) y `supervisor.js`.

## Conceptos

- **KPI 1 — Superintendente / Jefe**: plan con `kpi = 1`. Grupos aplicables: `inspection`, `leadership`, `pst`, `unsafe` (excluye `talk` y `epp`).
- **KPI 2 — Supervisor**: plan con `kpi = 2` (valor por defecto). Grupos aplicables: los 6 (`inspection`, `leadership`, `pst`, `unsafe`, `talk`, `epp`).

## Grupos y metas por defecto (por persona)

| Grupo | Etiqueta | Meta (target) |
|---|---|---|
| inspection | Inspecciones | 5 |
| leadership | Liderazgo visible | 6 |
| pst | Evaluación PST | 3 |
| unsafe | Actos / condiciones | 6 |
| talk | Pláticas RIT | 5 |
| epp | Inspección EPP | 5 |

Las metas son configurables por persona en `plan.targets[id]`. Si no se define, se usa el target por defecto del grupo.

## Cálculo por persona y periodo

Para cada supervisor/persona con plan o reportes en el periodo:

1. **Reportes válidos**: solo reportes con `status === 'Finalizado'` y fecha en el periodo.
2. **Por grupo** (`inspection`, `leadership`, etc.):
   - `p` = meta (target) si el grupo es aplicable, sino 0.
   - `e` = cantidad de reportes finalizados cuyo `type.group === grupo`.
   - `applicable` = existe plan Y (kpi === 2 O grupo no es `talk`/`epp`).
   - `a` (faltantes) = si el periodo es anterior al mes actual: `max(0, p - e)`; si no, 0.
   - `credit` = `min(e, p)` (no se puede acreditar más que la meta).
3. **Totales**:
   - `p_total` = suma de `p` de todos los grupos.
   - `e_total` = suma de `e`.
   - `credit_total` = suma de `min(e, p)`.
   - `a_total` = suma de `a`.
4. **Porcentaje de cumplimiento** = `round(credit_total / p_total * 100)` si `p_total > 0`, sino `null`.

## KPI 1 (Superintendente / Jefe)

- Grupos: `inspection`, `leadership`, `pst`, `unsafe` (4 grupos).
- Meta total por defecto: 5 + 6 + 3 + 6 = **20 actividades/mes**.
- No incluye pláticas RIT ni inspecciones EPP.

## KPI 2 (Supervisor)

- Grupos: los 6 grupos.
- Meta total por defecto: 5 + 6 + 3 + 6 + 5 + 5 = **30 actividades/mes**.

## Acciones correctivas (por persona)

- `actions`: total de acciones del periodo asignadas a la persona.
- `closed`: acciones con `status === 'Cerrado'`.
- `overdue`: acciones donde `due < hoy` y `status !== 'Cerrado'` (calculado, no almacenado).
- `verification`: acciones con `status === 'Por verificar'`.

## Reglas importantes

- **Solo formatos finalizados y válidos** cuentan para la meta. Los borradores no incrementan el cumplimiento.
- **No se acredita más que la meta** por grupo (`credit = min(e, p)`).
- **Faltantes (`a`)** solo se calculan para periodos anteriores al mes actual.
- **KPI 1 excluye** `talk` y `epp` del cálculo de aplicabilidad.

## Nota sobre los nuevos formatos

Los formatos agregados (VEO, Observación, Incidente, Capacitación) se registran en `SAFETY.groups` con sus metas, pero la función `matrix` en `progress-core.js` usa los grupos definidos en ese archivo (`inspection`, `leadership`, `pst`, `unsafe`, `talk`, `epp`). Para que los nuevos formatos alimenten los KPI, es necesario actualizar `progress-core.js` para incluir los nuevos grupos (`veo`, `observation`, `incident`, `training`) y sus metas. Esto queda como pendiente de integración.