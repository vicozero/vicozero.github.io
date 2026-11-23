# Reporte de Pruebas — Seguridad Industrial Sierra Madre

**Fecha:** 22-11-2026 · **Fase:** FASE 1 — línea base  
**Entorno:** local aislado (JSDOM, mocks en memoria). Sin Firebase de producción, sin emulador, sin credenciales, sin creación de usuarios, sin escrituras en datos productivos.

---

## 1. Resultado ejecutado en FASE 1

| Prueba | Comando | Resultado | Observación |
|---|---|---|---|
| Sintaxis de módulos | `npm.cmd run check` | ✅ PASS | 25 módulos JS revisados con `node --check` |
| Campos Excel e inspecciones | `node test-inspection-excel-formats.mjs` | ✅ PASS | 28 ítems planta, 29 mina, comentario de hallazgo, meses de experiencia |
| Cierre de editor y mensajes | `node test-save-close-flow.mjs` | ✅ PASS | «Avance Guardado» / «Finalizado», cierre de `#editor` |
| Navegación integrada | `node test-dom.mjs` | ✅ PASS | Menú, programa, acciones, matriz, validación de cierre |
| 17 formatos | `node test-all-forms.mjs` | ✅ PASS | Borrador, reapertura, finalización, bloqueo, sin duplicados |
| Formatos operativos | `node test-operational-forms.mjs` | ✅ PASS | VEO, incidente, capacitación |
| Shell y responsive simulado | `node test-page-shell.mjs` | ✅ PASS | Menú móvil, sidebar, escape, backdrop |
| Biblioteca normativa | `node test-normative-library.mjs` | ✅ PASS | Catálogo, búsqueda, orden dentro del flujo |
| Pláticas y capacitación | `node test-training-suite.mjs` | ✅ PASS | 52 temas, programación, asistencia, calendario |
| Matriz y workspace | `node test-workspace.mjs` | ⚠️ PARCIAL | Las aserciones de KPI pasan; falla después al cargar `pdf-lib` desde una ruta del harness (`test-workspace.mjs:24`). `node_modules/pdf-lib` no existe; la app sí incluye `assets/pdf-lib.min.js` (525 KB). **Falla de infraestructura de prueba, no de la aplicación.** |

**Resumen:** 9 PASS completos + 1 parcial por dependencia de prueba. 0 errores funcionales de aplicación.

Reparación recomendada (FASE 6): que `test-workspace.mjs` cargue `assets/pdf-lib.min.js` en el DOM simulado, o instalar `pdf-lib` como dependencia de desarrollo. Sin tocar el código de producción.

---

## 2. Inventario de pruebas existentes (30 archivos)

| Prueba | Propósito | En `npm test` | Brecha |
|---|---|---|---|
| `test-access.mjs` | 401/403, suplantación, propiedad | No | Documentación contradictoria sobre vigencia |
| `test-admin-users-ui.mjs` | Herramientas admin, roles | Sí | Sin sesión real |
| `test-all-forms.mjs` | 17 formatos | Sí | Sin compatibilidad móvil real |
| `test-auth-theme.mjs` | Tema claro/oscuro | Sí | Sin expiración de sesión |
| `test-backup-page.mjs` | Respaldos, fotos, sin passwordHash | Sí | Sin restauración real |
| `test-cloud-portal.mjs` | API nube, revisiones, fotos fragmentadas | `test:rules` | Requiere emulador/Java |
| `test-cloud-session-ui.mjs` | Reloj y cierre de sesión | Sí | Sin dispositivos reales |
| `test-dom.mjs` | Navegación y matriz | Sí | No valida cifras KPI |
| `test-firestore-rules.mjs` | Bootstrap, multi-admin, transferencia, revocación | `test:rules` | Solo emulador |
| `test-inspection-excel-formats.mjs` | Campos derivados de Excel | No | No es prueba de `.xlsx` |
| `test-migration-backup.mjs` | Huella, duplicados, IDs | Sí | Sin restore productivo |
| `test-migration-preflight.mjs` | Rechazo de respaldo operativo | No | Solo ruta de rechazo |
| `test-normative-library.mjs` | Biblioteca NOM | Sí | Sin vigencia en vivo |
| `test-operational-forms.mjs` | VEO / INC / TRN | Sí | Sin foto real |
| `test-operational-pdf.mjs` | PDF operativo (3/3/2 páginas) | `test:operational` | Sin tamaño carta |
| `test-page-shell.mjs` | Shell y menú móvil | Sí | Sin Safari/Firefox reales |
| `test-phase1-admin-report-security.mjs` | `/api/inconsistencies` protegido | No | Requiere emulador |
| `test-phase1-backup-preview.mjs` | Preview sin PUT | No | No en `npm test` |
| `test-phase1-csv.mjs` | BOM, acentos, fórmulas neutralizadas | No | No descarga real |
| `test-phase1-extras.mjs` | Fragmentos huérfanos, homónimos | No | No en `npm test` |
| `test-phase1-storage.mjs` | Aislamiento Storage | No | Storage no dado de alta |
| `test-phase1-units.mjs` | Aislamiento por unidad | No | No en `npm test` |
| `test-regulatory-training.mjs` | 52 temas, versiones, asistencia | Sí | Sin reprogramación |
| `test-save-close-flow.mjs` | Cierre y mensajes exactos | No | No en `npm test` |
| `test-session-clock.mjs` | Actividad/pausa/reanudación | Sí | Lógica pura |
| `test-suite-store.mjs` | Permisos y versiones inmutables | `test:rules` | No cubre hallazgo→acción |
| `test-training-suite.mjs` | UI de pláticas | Sí | Sin reprogramación |
| `test-ui-accounts.mjs` | Alta, login, solo lectura, avisos | No | No en `npm test` |
| `test-workspace.mjs` | Matriz KPI, filtros, historial, PDF | Sí | `pdf-lib`; no valida columnas del PDF |
| `test-workspace-linking.mjs` | `sm:action-from-report`, dedupe | No | No cubre colisión de flujos |

**15 de 30 pruebas no están enlazadas en `package.json`.** Añadir scripts `test:phase1`, `test:linking`, `test:forms-extra` sin duplicar ejecuciones.

---

## 3. Cobertura frente a los requisitos

| Categoría | Cobertura | Brecha principal |
|---|---|---|
| Autenticación y permisos | Buena en emulador | 6 pruebas fuera de `npm test`; sin sesión del dueño |
| Supervisiones | Amplia | Falta vincular hallazgo→acción y PDF con fotos reales |
| Acciones correctivas | Amplia | Sin reprogramación/fecha original; sin rechazo estructurado |
| KPIs | Solo `matrix` | No se prueban Centro de control ni PDF mensual; sin efectividad/reincidencia |
| Reportes | PDF y CSV por validez de archivo | Sin columnas del PDF, sin carta, sin descarga autenticada, sin `.xlsx` |
| Compatibilidad | Menú móvil simulado | Sin dispositivos reales, Safari/Firefox, PWA actualizada |

---

## 4. Defectos registrados en FASE 1

| ID | Defecto | Tipo | Estado |
|---|---|---|---|
| Q-01 | `test-workspace.mjs` depende de `pdf-lib` en ruta del harness | Infraestructura | Abierto — reparar en F6 |
| Q-02 | No hay `REPORTE_PRUEBAS_*` previo; resultados dispersos y a veces contradictorios | Documentación | Cerrado con este archivo |
| Q-03 | 15 pruebas sin script npm | Infraestructura | Abierto — F6/F8 |
| Q-04 | PDF de matriz con columnas desplazadas (K-02) | Funcional | Abierto — P0 en F6 |
| Q-05 | Tres motores KPI divergentes (K-01) | Funcional | Abierto — P0 en F5 |
| Q-06 | Sin prueba de columnas del PDF (`test-workspace.mjs:25` solo cuenta páginas) | Cobertura | Abierto — F6 |

---

## 5. Pruebas pendientes (requieren algo externo)

1. **Navegador autenticado con sesión del dueño:** descarga real de PDF/CSV, verificación de permisos y cuenta operativa `qa-op-…`. No se crean cuentas desde automatización.
2. **Emulador Firestore/Storage:** `npm.cmd run test:rules` con Java 21 en PATH. Validación de reglas ya desplegadas y de Storage cuando exista bucket.
3. **Dispositivos reales:** Chrome/Edge/móvil, tablas anchas, captura con cámara, conectividad intermitente.
4. **Storage:** alta de bucket + `firebase deploy --only storage:rules` (decisión irreversible de ubicación).
5. **Regresión posterior a cada fase:** solo pruebas afectadas; no repetir las 24 ya aprobadas sin cambio.

---

## 6. Evidencia de no afectación

- `git status` durante la auditoría: solo los 7 artefactos sin versionar preexistentes; sin modificaciones de código.
- Sin comandos `firebase deploy`, sin `git push`, sin `git commit`.
- Sin creación de usuarios, contraseñas ni credenciales.
- Respaldo nuevo verificado: `sierra-madre-fase1-auditoria-20261122.bundle` (SHA-256 `6B9E3061…B0A2`).
