# Diagnóstico técnico — Sierra Madre · Seguridad Operativa

Fecha de este diagnóstico: 16 de noviembre de 2026
Commit de referencia: `4f8841f` (rama `main` → `public-pages`)
Respaldo verificable: `backups/sierra-madre-backup-20261116-101229.bundle` (SHA-256 `42E34E570765639AC8DAD643A60295C3EAB91FDB82507F618F98B9CC5ACAD013`)

## 1. Arquitectura encontrada

- Sitio estático publicado en GitHub Pages (`https://vicozero.github.io/`), rama `main`.
- Los archivos web están **triplicados** en la raíz, `docs/` y `public/`. GitHub Pages sirve la raíz.
- No hay framework (React/Vue/etc.). Es HTML + CSS + JavaScript vanilla, con módulos cargados por `<script src>` en `index.html`.
- Los scripts están **minificados en pocas líneas** (15–129 líneas por archivo), lo que dificulta el mantenimiento.
- `package.json` solo declara dependencias de desarrollo (Firebase SDK + firebase-tools). No hay paso de build para el frontend.

## 2. Almacenamiento y datos

- **Antes (legacy):** `localStorage` con claves `centinela-v1`, `sm-workspace-v1`, `sm-session-history-v1`.
- **Ahora (parcialmente migrado):** Firebase Firestore como fuente central para perfiles, registros (`reports`, `actions`, `plans`), avisos (`notices`, `noticeImages`, `noticeReads`), sesiones (`sessions`) y configuración (`security/authority`).
- Adaptador `/api/*` en el navegador (`cloud-portal.js`) intercepta `fetch('/api/...')` y lo traduce a Firestore.
- Las evidencias fotográficas se guardan como `dataUrl` en Firestore (límite 900 000 caracteres por adjunto), con compresión cliente ≤ 850 000.
- Migración local→nube: acción explícita del administrador (Perfil → "Importar datos locales a la nube"), con aviso de recrear cuentas primero.

## 3. Autenticación y permisos

- Firebase Authentication (email/contraseña) con `browserLocalPersistence`.
- Cuenta propietaria fija: `Kgwk4gK0yxYJQMZZaggIyl2xtnh2` (`vicozero559@gmail.com`).
- Roles: `admin`, `operator`, `member`, `supervisor`, `consulta` (parcial).
- Permisos granulares por módulo/operación (`view_all`, `edit_reports`, `edit_actions`, `send_notices`, etc.) en `profiles/{uid}.permissions`.
- Reglas de Firestore en `firestore.rules` (desplegadas). Validación real en backend para Firestore, pero el adaptador `/api` valida en cliente.
- Fallback local cuando Firebase no está disponible (modo degradado).

## 4. Los nueve formatos existentes (conservar)

Definidos en `formats.js` → `globalThis.SAFETY.types`:

1. `leadership` — Liderazgo visible
2. `unsafe` — Actos y condiciones inseguras
3. `inspection` — Hallazgos de inspección
4. `pst` — Evaluación de PST
5. `talk` — Plática de 5 minutos / RIT
6. `area` — Inspección de áreas de trabajo
7. `eppPlant` — Inspección de EPP · Planta
8. `eppWelder` — Inspección de EPP · Soldador
9. `risk` — Aviso de riesgo

Cada formato tiene campos, tabla opcional (hallazgos, cambios, participantes), listas de verificación (`acts`, `pst`, `area`, `plant`, `welder`) y metas por grupo (`groups`: inspection 5, leadership 6, pst 3, unsafe 6, talk 5, epp 5).

No renombrar ni eliminar estos identificadores sin migración compatible.

## 5. KPI y desempeño

- `progress-core.js` + `supervisor.js` + `workspace.js` calculan cumplimiento por grupo, supervisor, departamento, periodo.
- Regla: solo formatos **finalizados y válidos** cuentan para la meta; los borradores no incrementan el cumplimiento.
- KPI 1 y KPI 2 originales deben documentarse antes de modificar (ver `source-review/`).
- No alterar resultados históricos de forma silenciosa.

## 6. Módulos actuales

- `supervisor.js` (25 KB, minificado): dashboard, formatos del supervisor, editor, evidencias, firma, PDF.
- `workspace.js` (27 KB): programa mensual, acciones, matriz, equipo, importación legacy.
- `accounts-ui.js` (24 KB): usuarios, permisos, avisos, lectura de imágenes.
- `identity.js` / `demo-identity.js`: identidad y permisos.
- `report-pdf.js`, `workspace-pdf.js`: generación PDF.
- `firebase-auth.js` (35 KB): login, bootstrap admin, launch, importación local→nube.
- `cloud-portal.js`, `cloud-sessions.js`, `cloud-live.js`, `session-tracker.js`, `session-clock.js`: nube, sesiones, sincronización en vivo.
- `migration-archive.js`: archivado de migración.

## 7. Riesgos identificados (priorizados)

1. **Triplicación de archivos** (raíz/`docs/`/`public/`) — un cambio puede publicarse en una copia y no en otra. *Mitigación propuesta: script de sincronización (ver §9).*
2. **Scripts minificados en pocas líneas** — difícil de mantener y revisar. *Mitigación: reformatear por módulo (incremental).*
3. **Autenticación y permisos parcialmente en cliente** — el adaptador `/api` valida en el navegador; Firestore rules sí validan en backend. *Mitigación: mover toda validación a rules + (futuro) backend real.*
4. **Sin backend real** — GitHub Pages es estático; persistencia central depende de Firebase (ya integrado) y de `localStorage` para usuarios locales.
5. **Pruebas heredadas obsoletas** — `test-dom.mjs`, `test-access.mjs` apuntan al Worker anterior; no cubren el flujo real.
6. **Evidencias como `dataUrl` en Firestore** — funcional pero costoso; migrar a Firebase Storage a mediano plazo.
7. **Contraseñas de usuarios locales** resumidas en el navegador — no apto para producción; usar solo Firebase Auth.

## 8. Lo ya implementado (no regresionar)

- Fondos corporativos y modo claro/oscuro.
- Acceso con Firebase + fallback local.
- Eliminación de enlaces a ChatGPT.
- CRUD de usuarios y permisos granulares.
- Corrección de codificación (`Contraseña`, botones).
- Adjuntos de imágenes en avisos (alta calidad, visible en ambas direcciones).
- Almacenamiento central Firebase + reglas desplegadas.
- Migración local→nube explícita.
- Contador de sesión estilo cronómetro digital + panel de presencia para admin.
- Sincronización en tiempo real (`onSnapshot`) con protección de editores abiertos.
- Sesiones de operadores visibles para el admin (corregido).

## 9. Cambios propuestos (hoja de ruta)

### FASE 1 — Diagnóstico y respaldos ✅ (este documento)
- Respaldo verificable creado (`sierra-madre-backup-20261116-101229.bundle`).
- Diagnóstico técnico documentado.
- Línea base de sintaxis: `node --check` sobre todos los `.js` raíz → sin errores (verificado en sesiones anteriores).

### FASE 2 — Higiene de código y build (próximo, bajo riesgo)
- Crear `sync-copies.mjs` que copie raíz → `docs/` y `public/` para eliminar la triplicación manual.
- Agregar script `npm run sync` y `npm run check` (sintaxis de todos los JS).
- Reformatear incrementalmente los scripts minificados (uno por uno, con prueba).

### FASE 3 — Modernización visual (medio riesgo)
- Menú lateral plegable, barra superior con usuario/notificaciones, dashboard ejecutivo con KPI reales, gráficas, tablas filtrables, búsqueda global, estados de carga/error.
- Reutilizar `assets/sierra-madre.png` y fondos existentes.
- No copiar interfaz de Atento24.

### FASE 4 — Módulos operativos nuevos (alto valor)
- Inspecciones y VEO con plantillas por área.
- Observaciones preventivas con flujo completo.
- Acciones correctivas centralizadas (estados, validación, alertas).
- Incidentes y accidentes con investigación.
- Capacitación (cursos, asistencia, vigencias).

### FASE 5 — Multiusuario real
- Evaluar backend (Firebase ya integrado; considerar Cloud Functions para validación server-side).
- Migrar evidencias a Firebase Storage.
- Auditoría completa (`auditLog`).
- Eliminar dependencia de `localStorage` para datos de producción.

### FASE 6 — Validación final
- Pruebas funcionales por módulo, regresión, móvil/escritorio, integridad de datos, PDF, evidencias.

## 10. Plan de pruebas (línea base)

| Prueba | Estado |
|---|---|
| `node --check` en todos los `.js` raíz | ✅ Sin errores |
| Login admin (Firebase) | ✅ Funciona |
| Login operador (Firebase) | ✅ Funciona (tras corrección de sesión local) |
| Contador de sesión + panel de presencia | ✅ Funciona |
| Sincronización en tiempo real (avisos, reportes, acciones) | ✅ Verificado con prueba E2E |
| Los 9 formatos (guardar/editar/finalizar) | ⏳ Pendiente de prueba formal |
| KPI 1 y KPI 2 | ⏳ Pendiente de documentar fórmulas |
| Exportación PDF | ⏳ Pendiente de prueba formal |
| Evidencias fotográficas | ⏳ Pendiente de prueba formal |
| Permisos por rol | ⏳ Pendiente de prueba formal |
| Móvil/escritorio | ⏳ Pendiente |
| Pruebas heredadas (`test-dom.mjs`, etc.) | ❌ Obsoletas (apuntan al Worker) |

## 11. Siguiente paso recomendado

Dado el alcance, propongo iniciar con **FASE 2 (higiene de código y build)** porque es de bajo riesgo, verificable y desbloquea el resto. ¿Confirmas que empiece con el script de sincronización de copias + reformateo incremental del primer módulo (`formats.js` o `supervisor.js`)?
EOF
echo done