# Plan de Modernización — Seguridad Industrial Sierra Madre

**Versión:** 1.2 · **Fecha:** 22-11-2026  
**Estado:** FASES 1-9 ejecutadas, publicadas en `public-pages/main` y desplegadas en Firestore; clasificación `LISTO CON DEPENDENCIAS`  
**Documento de entrada:** `AUDITORIA_SISTEMA_SEGURIDAD.md`

---

## 1. Principios rectores

1. **Incremental y aditivo.** Se agregan campos, catálogos y vistas; no se renombran ni eliminan campos históricos.
2. **Cero writes a producción durante desarrollo.** Todo se valida con datos simulados, emulador o espejos locales.
3. **La autoridad es Firestore rules.** Ninguna mejora de permisos puede apoyarse solo en ocultar botones.
4. **Trazabilidad primero.** Todo evento relevante lleva autor autenticado, fecha del servidor, evento semántico y, cuando aplique, valores anteriores y nuevos.
5. **Reversión no destructiva.** Ningún `reset --hard`, `rebase`, `--force` ni borrado de colecciones. El punto de restauración es el bundle verificado.
6. **Sin secretos.** No se introducen credenciales, tokens ni claves de administración en código, documentos ni repositorio.
7. **Publicación solo con autorización.** Sin push ni deploy sin autorización expresa del usuario.

---

## 2. Fases, tareas y dependencias

### FASE 1 — Auditoría técnica y respaldo ✅ COMPLETADA

| Tarea | Resultado |
|---|---|
| Identificar repositorio fuente | `public-pages` → raíz de `centinela`; espejos `docs/` y `public/` |
| Inventariar arquitectura y módulos | 5 auditorías paralelas; ver `AUDITORIA_SISTEMA_SEGURIDAD.md` |
| Revisar Firebase, reglas y permisos | 9 hallazgos S-01…S-09 |
| Revisar datos, respaldos y migración | 7 hallazgos D-01…D-07; bundles verificados |
| Revisar KPIs, reportes y pruebas | 10 hallazgos K-01…K-10 |
| Revisar UX, PWA y auditoría | 9 hallazgos U-01…U-09 |
| Respaldo verificable | `sierra-madre-fase1-auditoria-20261122.bundle`, SHA-256 verificado |
| Línea base de pruebas | 9 PASS + 1 fallo de infraestructura (`pdf-lib`) |
| Plan y documentación | 9 entregables en `DOCUMENTACION_MODERNIZACION/` |

**Criterio de salida:** cumplido. **No se modificó código de producción.**

---

### FASE 2 — Estructura de departamentos ✅ COMPLETADA Y PUBLICADA

| # | Tarea | Prioridad | Dependencia |
|---|---|---|---|
| 2.1 | Crear colección `departments` con `id` estable, `name`, `aliases[]`, `activo`, `validFrom`/`validTo` | P0 | Respaldos F1 |
| 2.2 | Añadir `departmentId` a `reports`, `plans`, `actions`, `talk_schedules`, `compliance_assessments`, `profiles` — **sin quitar** el texto actual | P0 | 2.1 |
| 2.3 | Construir mapa de equivalencias revisado (por UID/nómina, luego nombre normalizado; ambigüedades a revisión humana) | P0 | 2.1 |
| 2.4 | Ampliar `/api/inconsistencies` para detectar departamentos sin ID y aliases duplicados | P1 | 2.2, 2.3 |
| 2.5 | Actualizar `progress-core.js` y PDFs para agrupar por `departmentId` con fallback al texto | P0 | 2.2 |
| 2.6 | `allowedUnits` → `allowedUnitIds[]` de forma aditiva; conservar comparación de alias | P1 | 2.2 |
| 2.7 | Extender `verify-migration-backup.mjs` y `planImport()` para el catálogo nuevo | P0 | 2.1-2.3 |
| 2.8 | Crear importador operativo que conserve `photos`/`photoChunkIds` y no caiga al admin por defecto | P0 | 2.7 |
| 2.9 | UI de alta/edición/activación de departamentos (admin) | P1 | 2.1-2.6 |

**Prohibido en F2:** renombrar o borrar `department`, `unit`, `area`, `unidad`; importar a producción; asignar automáticamente alias ambiguos.

**Criterio de salida:** catálogo consultable, registros antiguos intactos, conteos antes/después idénticos, cero duplicados, importador verificado con lectura de vuelta.

**Cierre (22-11-2026):** las tareas 2.1-2.9 quedaron implementadas y validadas con `npm.cmd run check`, `npm.cmd run test:rules` (4 suites), pruebas aisladas y espejos sincronizados. No se aplicaron migraciones ni se modificaron registros de producción. Detalle en `INFORME_CIERRE_FASE2.md`. La publicación a `public-pages` se ejecutó con autorización expresa; resultado en la sección 4.

---

### FASE 3 — Supervisiones avanzadas

| # | Tarea | Prioridad | Dependencia |
|---|---|---|---|
| 3.1 | Entidad `findings` con folio propio, `sourceReportId`, `departmentId`, riesgo, responsable, compromiso y ciclo de vida | P0 | F2 |
| 3.2 | Deduplicación determinista hallazgo→acción (clave `sourceReportId + índice + tipo`) | P0 | 3.1 |
| 3.3 | Relación bidireccional hallazgo ↔ acción ↔ inspección | P0 | 3.1 |
| 3.4 | Plantillas reutilizables por tipo de supervisión (configurables, sin tocar las 17 actuales) | P1 | F2 |
| 3.5 | Clasificación de riesgo obligatoria en incumplimientos | P0 | 3.1 |
| 3.6 | Evidencia: categorías inicial / corrección / verificación, descripción y autor | P1 | 3.1, F8 |
| 3.7 | Límite de fotos configurable con límites seguros y compresión conservadora | P2 | 3.6 |
| 3.8 | Limpieza de `observation` duplicado y código muerto identificados en A-03/A-04 | P2 | — |

**Criterio de salida:** un incumplimiento genera exactamente un hallazgo vinculado; reintentos no duplican; los 17 formatos siguen pasando.

---

### FASE 4 — Acciones y seguimiento

| # | Tarea | Prioridad | Dependencia |
|---|---|---|---|
| 4.1 | Unificar `actionStatus`: `Vencido` debe prevalecer sobre `Por verificar` cuando `due < hoy` | P0 | KPI_spec |
| 4.2 | Semáforo con texto + icono + color (ya existe parcialmente) | P1 | 4.1 |
| 4.3 | Riesgo crítico independiente del semáforo; medidas temporales, escalamiento y bloqueo de cierre sin revisión | P0 | F3 |
| 4.4 | `originalStart`, `originalDue`, `rescheduleReason`, `rescheduledBy`, `rescheduledAt` | P0 | Auditoría F1 |
| 4.5 | Eventos de auditoría estructurados con `before`/`after`, `actorUid`, `serverTimestamp()`, `reason` | P0 | 4.4 |
| 4.6 | Bitácora consultable por fecha, usuario, departamento y tipo de evento | P1 | 4.5 |
| 4.7 | Alertas internas por asignación, vencimiento, criticidad, programación, rechazo y cambio de fecha | P1 | F3, 4.3 |

**Criterio de salida:** se puede demostrar quién cambió una fecha, cuándo y por qué; ninguna acción crítica cierra sin verificación.

---

### FASE 5 — Dashboard y KPIs

| # | Tarea | Prioridad | Dependencia |
|---|---|---|---|
| 5.1 | **Un único motor de cálculo** usado por dashboard, matriz, PDF y CSV | P0 | K-01 |
| 5.2 | Corregir `min(e,p)` y tope 100 % en «Centro de control» y «Programa mensual» | P0 | 5.1 |
| 5.3 | Corregir `actionStatus` y denominador de acciones en todos los consumidores | P0 | 4.1 |
| 5.4 | Efectividad de cierre y reincidencia con definición documentada | P1 | 5.1 |
| 5.5 | Filtros combinables reales también en tarjetas (unidad, nivel, departamento, riesgo) | P1 | F2, 5.1 |
| 5.6 | Gráficos (barras, líneas, apiladas, tendencia, distribución) con datos reales | P2 | 5.1 |

**Criterio de salida:** el mismo mes produce la misma cifra en dashboard, matriz, PDF y CSV.

---

### FASE 6 — Reportes y calendario

| # | Tarea | Prioridad | Dependencia |
|---|---|---|---|
| 6.1 | **Corregir anchos e índices del PDF de matriz** para 10 grupos + acciones | P0 | K-02 |
| 6.2 | Tamaño carta (612×792 o 792×612 pt), márgenes y pies de página | P1 | K-03 |
| 6.3 | PDF individual: fotos sin deformación, fallback PNG en acciones, trazabilidad | P1 | 3.6 |
| 6.4 | Reporte mensual ejecutivo con gráficos reales | P2 | 5.6 |
| 6.5 | Exportación `.xlsx` con hojas, filtros, fechas y totales; cifras iguales al dashboard | P2 | 5.1 |
| 6.6 | Calendario mensual/semanal/agenda para supervisiones y compromisos | P1 | F2, 4.4 |
| 6.7 | Recurrencias y reprogramaciones conservando la fecha original | P1 | 4.4 |

**Criterio de salida:** PDF de matriz sin columnas superpuestas; cifras PDF/Excel/dashboard iguales; fecha original recuperable.

---

### FASE 7 — Diseño visual y experiencia móvil

| # | Tarea | Prioridad | Dependencia |
|---|---|---|---|
| 7.1 | Revisión responsive en dispositivo real: tablas anchas, formularios y botones táctiles | P1 | — |
| 7.2 | Jerarquía visual y agrupación del menú propuesto sin duplicar módulos | P2 | F2-F6 |
| 7.3 | Modo claro/oscuro existente: verificación en móvil | P2 | — |
| 7.4 | **No activar offline** hasta que exista cola persistente, estados `guardado / pendiente / conflictivo` y reintentos | P0 | U-01 |
| 7.5 | Completar TWA (huella real, decidir notificaciones) solo con autorización | P2 | U-04 |

---

### FASE 8 — Seguridad, rendimiento y cierre

| # | Tarea | Prioridad | Dependencia |
|---|---|---|---|
| 8.1 | S-01: restringir `list` de `profiles` o servir proyección reducida | P1 | — |
| 8.2 | S-02/S-07: validación field-level del perfil principal; alinear Storage con Firestore | P1 | — |
| 8.3 | S-04/S-05: auditoría y tiempos de sesión generados en servidor | P1 | 4.5 |
| 8.4 | S-09: dar de alta bucket y desplegar `storage.rules` (decisión irreversible de ubicación) | P0 | Autorización |
| 8.5 | S-06/S-08: expirar sesión local; escribir fragmentos tras confirmar escritura principal | P2 | — |
| 8.6 | Índices, paginación y carga diferida | P2 | F5 |
| 8.7 | Suite completa de pruebas y documentación final | P0 | Todas |

---

## 3. Mapa de dependencias (resumen)

```
F1 (hecha)
 ├─→ F2 departamentos + IDs ──┬─→ F3 hallazgos ──→ F4 acciones/auditoría ──┬─→ F5 KPI ──→ F6 reportes/calendario ──→ F7 UX ──→ F8 cierre
 │                            └─→ F5 (agrupación por departamento)
 └─→ F8 (reglas, Storage, auditoría) en paralelo desde F1
```

**Regla de avance:** no se inicia una fase si quedan defectos P0 de la anterior.

---

## 4. Orden de publicación (ejecutado el 22-11-2026 con autorización)

1. Verificado `git status`, HEAD y remotos; los 7 artefactos sin versionar quedaron fuera de commits.
2. `npm.cmd run sync` → 56 archivos web y 122 copias; verificación SHA-256 61/61 sin discrepancias.
3. Caché PWA en `sw.js`: `sm-seguridad-v15`.
4. Pruebas: `npm.cmd run check`, `npm.cmd test` (22 suites) y `npm.cmd run test:rules` (4 suites): PASS.
5. Commit `3818b776ea7d75a33e987a6df2ac2d3e08960d87` — `feat: modernizacion aditiva FASES 3-9 con reglas, PWA y documentacion final`.
6. `git push public-pages HEAD:main`: fast-forward `e0110f1..3818b77`, **sin `--force`**, nunca a `origin`.
7. Verificación en vivo con parámetro de caché: `sw.js` sirve `sm-seguridad-v15`; `index.html` y módulos avanzados responden 200 (`Cache-Control: max-age=600`).
8. `firebase deploy --only firestore:rules,firestore:indexes --project sierra-madre-seguridad --non-interactive`: reglas compilaron y 4 índices se desplegaron. Storage requiere bucket previo y sigue sin activarse.
9. Informe final, bitácora y plan actualizados con el resultado real; cierre documentado sin tocar `origin`.

---

## 5. Riesgos que puede detener una fase

| Riesgo | Fase afectada | Acción |
|---|---|---|
| Storage sin bucket | F8 / evidencia nueva | Decisión del dueño; no es bloqueante para F2-F7 |
| Sin sesión del dueño | Validación navegador autenticada | Documentar como pendiente; no crear cuentas desde automatización |
| `pdf-lib` ausente en el harness | F6 | Instalar dependencia de prueba o cargar `assets/pdf-lib.min.js` en el test; no tocar la app |
| Importador operativo inexistente | F2 | No migrar datos hasta tener D-01/D-02 resueltos y verificados |
| Definiciones Storage/Firestore divergentes | F8 | Alinear antes de activar Storage |

---

## 6. Cierre ejecutivo de FASES 3-9 (registro aditivo)

Esta sección documenta la ejecución real sin sustituir el detalle histórico de las secciones 2-5.

| Fase | Resultado real | Evidencia |
|---|---|---|
| F3 | Supervisiones avanzadas, folio, checklist, plantillas, evidencias, borrador/finalización/reapertura, historial y hallazgo vinculado | `advanced-core.js`, `advanced-ui.js`, `test-advanced-core.mjs`, `test-advanced-ui.mjs` |
| F4 | Hallazgos con riesgo y semáforo, escalamiento crítico, tabla/Kanban, filtros, vencidos, PDF/Excel | `firestore.rules`, `advanced-ui.js`, pruebas avanzadas |
| F5 | Centro ejecutivo, 10 KPIs, gráficos y matriz expandible por departamento; borradores excluidos de realizadas | `computeKpis()`, `complianceMatrix()`, `test-advanced-core.mjs` |
| F6 | PDF carta de supervisión, reporte mensual ejecutivo, Excel, calendario y reprogramación con motivo e historial | `advanced-pdf.js`, `test-advanced-pdf.mjs` |
| F7 | Responsive 800/480px, foco visible, movimiento reducido, PWA v15 con caché estática y sin `/api/` | `phase3.css`, `sw.js`, `test-pwa.mjs` |
| F8 | Reglas e índices aditivos, permisos explícitos, alertas internas por riesgo y auditoría de solo lectura administrativa | `firestore.rules`, `firestore.indexes.json`, `cloud-portal.js`, `test-firestore-rules.mjs` |
| F9 | Integración y regresión completa; espejos sincronizados y verificados | `npm.cmd run check`, `npm.cmd test`, `npm.cmd run test:rules`, `sync-copies.mjs` |

### Dependencias abiertas y cierre de las ejecutadas

1. **Storage (abierta):** no hay bucket operativo confirmado. No se activaron cargas dependientes de Storage; requiere decisión del propietario.
2. **Validación navegada autenticada (abierta):** requiere sesión real del propietario. No se crearon cuentas QA reales ni se evadieron accesos.
3. **Despliegue de reglas/índices (cerrado):** `firestore.rules` y los 4 índices se desplegaron en `sierra-madre-seguridad` con compilación exitosa.
4. **Publicación (cerrada):** ejecutada en `public-pages/main` con autorización expresa, sin `--force` y nunca a `origin`; propagación verificada en vivo.

### Clasificación final

**LISTO CON DEPENDENCIAS.** La implementación, las pruebas, la publicación y el despliegue están completos; solo permanecen las dos acciones del propietario listadas arriba. No se activó Storage ni se simuló una sesión real.
