# Especificación de KPIs — Seguridad Industrial Sierra Madre

**Fecha:** 22-11-2026 · **Estado:** FASE 1 (diagnóstico y unificación pendiente)

---

## 1. Fórmula canónica (motor `matrix`)

Fuente: `progress-core.js:8`, documentada en `KPI_FORMULAS.md:31-43`.

Para cada persona y cada grupo `g`:

```
programado(g) = plan && aplicable(kpi,g) ? Number(plan.targets[g] ?? default[g]) : 0
ejecutado(g)  = # reports con supervisor normalizado, status='Finalizado',
                fecha en el periodo y SAFETY.types[tipo].group === g
credito(g)    = min(ejecutado(g), programado(g))
faltante(g)   = (periodo < mes actual) ? max(0, programado(g) - ejecutado(g)) : 0

cumplimiento_persona = round( Σ credito(g) / Σ programado(g) × 100 )   (null si Σ programado = 0)
```

- Los **borradores no cuentan** como ejecutados.
- El crédito se limita al 100 % **por actividad**: un excedente no compensa otro grupo.
- `norm()` unifica acentos, mayúsculas y espacios en nombres de supervisores.

### Metas por defecto (`progress-core.js:3`)

| Grupo | Meta |
|---|---:|
| inspection | 5 |
| leadership | 6 |
| pst | 3 |
| unsafe | 6 |
| talk | 5 |
| epp | 5 |
| veo / observation / incident / training | 0 (solo si el admin programa meta) |

### Aplicabilidad

| Nivel | Grupos |
|---|---|
| **KPI 1** — Jefaturas y Superintendencias | inspection, leadership, pst, unsafe (excluye talk, epp y los cuatro módulos nuevos). Meta default total = 20 |
| **KPI 2** — Supervisores | los 10 grupos (6 + 4). Meta default total = 30 |

> `KPI_FORMULAS.md:8` dice «los 6» y `:53-54` dice «los 10». El código sigue la segunda versión. **Corregir la redacción.**

---

## 2. Acciones: denominador y estado

```
enPeriodo(a) = a.start <= fin_de_mes && (a.due >= inicio_de_mes || a.status !== 'Cerrado')
actionStatus(a) = status==='Cerrado' ? 'Cerrado'
                : status==='Por verificar' ? 'Por verificar'
                : due < hoy ? 'Vencido' : 'Pendiente'
overdue = # acciones con actionStatus === 'Vencido'
closed  = # acciones con status === 'Cerrado'
```

**Discrepancia K-04:** `KPI_FORMULAS.md:60` define `overdue = due<hoy && status!=='Cerrado'`, pero el código antepone `Por verificar`, por lo que una acción vencida en verificación **no** cuenta como vencida. Afecta matriz, tablero y PDF. Se unificará en FASE 4/5.

**Denominador de cierre:** debe mostrarse explícitamente en reportes. Propuesta:

```
cumplimiento_cierre = cerradas_verificadas / (cerradas_verificadas + vencidas + pendientes_de_periodo) × 100
```

Requiere definir si las canceladas autorizadas se excluyen (recomendación: sí, con constancia).

---

## 3. Los tres motores actuales (PROBLEMA K-01)

| Motor | Cálculo | Archivo | ¿Canonical? |
|---|---|---|---|
| `matrix` | `min(e,p)`, sin planes → `null`, normaliza nombres, 10 grupos | `progress-core.js:8` | ✅ Sí |
| Centro de control | `goal = meta_default × #supervisores con reportes`; `v = #finalizados`; texto sin tope (puede mostrar 200 %) | `supervisor.js:1` | ❌ No |
| Programa mensual | `p = Σ meta_default`, `r = Σ finalizados`, `r/p×100` sin `min` ni planes | `supervisor.js:1` | ❌ No |
| PDF de KPIs mensual | `p = meta_default`, `r = #finalizados con supervisor exacto y kpi`, sin `min`, sin normalizar | `report-pdf.js:8` | ❌ No |
| PDF/CSV de avances | Reutilizan `matrixRows()` | `workspace.js:10,56-57`, `workspace-pdf.js:17-25` | ✅ Sí |

**Ejemplo con 1 supervisor, meta liderazgo 6 y 12 finalizados:**

| Vista | Resultado |
|---|---:|
| Centro de control | 200 % (texto sin tope) |
| Programa mensual / PDF KPIs | 200,0 % |
| Matriz / CSV / PDF avances | 100 % si hay plan; `null` si no hay plan |

**Con nombres «ANA GARCIA» / « Ana  García »:** la matriz los unifica; el PDF mensual los separa en dos filas.

**Corrección FASE 5:** un único `calculateKpis()` consumido por las cuatro vistas. `KPI_FORMULAS.md:3` debe dejar de afirmar que documenta `supervisor.js` cuando describe `matrix`.

---

## 4. Indicadores existentes vs faltantes

| Indicador | Estado |
|---|---|
| Cumplimiento general (crédito/programado) | Existente en matriz y PDF avances |
| Programado / Ejecutado / Atrasado por grupo y responsable | Existente |
| Tarjetas por grupo con barra y pendientes | Existente (dos juegos, uno inconsistente) |
| Acciones totales / cerradas / vencidas / por verificar | Existente |
| Tablero kanban y semáforo (texto + color) | Existente |
| Filtros periodo / supervisor / unidad / nivel / estado | Parcial: las tarjetas ignoran unidad y nivel (`workspace.js:10,28`) |
| Indicadores de formatos (registrados, borradores, finalizados) | Existente |
| **Efectividad de cierre** | **Faltante** |
| **Reincidencia** | **Faltante** |
| **Tendencia mensual / histórico** | **Faltante** (solo el periodo seleccionado) |
| **Gráficos** | **Faltante** (solo barras CSS) |
| **Hallazgos críticos activos** | **Faltante** como indicador |
| **Cumplimiento por departamento** | Parcial: agrupa por texto, sin `departmentId` |

---

## 5. Efectividad de cierre y reincidencia (FASE 5)

Definiciones propuestas, a validar con el dueño:

```
efectividad_cierre = cerradas_y_verificadas / acciones_que_debian_cerrarse_en_el_periodo × 100
reincidencia = # hallazgos con mismo origen (tipo + área + departamento + descripción normalizada)
               dentro de una ventana configurable (p. ej. 90 días)
```

Requiere:
- `findings` con entidad propia y `sourceReportId` (FASE 3).
- Eventos de verificación/rechazo con autor y fecha servidor (FASE 4).
- Catálogo de departamentos con `departmentId` (FASE 2).

---

## 6. Reglas de consistencia obligatorias

1. Un mes, mismos filtros → **misma cifra** en dashboard, matriz, PDF y CSV.
2. Los borradores nunca se contabilizan como ejecutados.
3. Una supervisión válida se cuenta **una sola vez** (deduplicación por `id`).
4. El excedente no compensa metas distintas (`min(e,p)` por celda).
5. Separar métricas de **cumplimiento** de métricas de **desempeño en seguridad**.
6. Toda cifra mostrada debe poder desglosarse hasta los registros que la producen.
7. Los periodos sin programación deben mostrar `null` / «Sin meta programada», nunca 0 % ni 100 %.
8. Las acciones vencidas de meses anteriores permanecen visibles (`inPeriod`).

---

## 7. Defectos de reporte detectados

| ID | Defecto | Severidad |
|---|---|---|
| K-02 | PDF de avances: anchos calculados para 6 grupos, hoy 10; índice fijo `starts[21]` para ACCIONES (hoy VEO). Columnas superpuestas y recortadas | **Crítica** |
| K-03 | PDF no son carta: 960×540 pt (`report-pdf.js:3`) y 1240×720 pt (`workspace-pdf.js:3`) | Alta |
| K-06 | Tarjetas ignoran filtros de unidad/nivel | Media |
| K-07 | No existe `.xlsx`, solo CSV | Media |
| K-08 | No hay gráficos estadísticos | Media |
| K-10 | `test-workspace.mjs:24` exige `pdf-lib` en ruta del harness no instalada | Media (infraestructura) |

---

## 8. Criterios de aceptación de la unificación

- [ ] Un solo módulo exporta `calculateKpis()`.
- [ ] Dashboard, programa, matriz, PDF y CSV importan ese módulo.
- [ ] `actionStatus` congruente con la documentación.
- [ ] Prueba de regresión: mismo mes → misma cifra en las cinco vistas.
- [ ] PDF de matriz sin columnas superpuestas y en tamaño carta.
- [ ] Denominador de cierre visible en el reporte mensual.
- [ ] Efectividad y reincidencia documentadas y probadas, o declaradas fuera de alcance con autorización.
