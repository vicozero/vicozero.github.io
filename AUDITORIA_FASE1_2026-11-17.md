# Fase 1: seguridad, cuentas y persistencia

Revisión local del 17 de noviembre de 2026. Sin despliegue, cuentas reales de prueba, escrituras productivas ni migración de registros. El árbol de trabajo ya contenía cambios de una revisión anterior en otros módulos; esta fase los conserva sin ampliarlos ni publicarlos.

## Hallazgos confirmados y correcciones

- Firestore aplicaba propiedad y rol, pero no la restricción de unidad ni el permiso de lectura del módulo. Se agregaron comprobaciones de unidad/área y lectura por operación, con consultas restringidas compatibles y eliminación de duplicados por ID al combinar resultados. Las evidencias fragmentadas comprueban también la autorización del registro vinculado.
- Storage permitía leer evidencias/adjuntos a cualquier cuenta autenticada y escribir sobre rutas ajenas. Ahora consulta autoridad, perfil activo, propiedad/asignación, unidad y operación en Firestore. Los adjuntos se limitan al remitente/destinatario; evidencias y adjuntos son inmutables. No se habilitó Storage ni se cambió de plan.
- El importador limitado a cuentas y avisos comprobaba demasiado tarde si había formatos, acciones o programas. El rechazo ocurre ahora antes de cualquier acceso remoto o escritura. No se convierte en un importador completo de fotografías.
- Una edición que omitiera `photos` reemplazaba sus referencias por una lista vacía. Ahora conserva referencias y fotos históricas, y devuelve el registro recuperado. Una lista explícita sigue siendo una edición deliberada de las fotografías.

## Archivos intervenidos en esta fase

`firestore.rules`, `storage.rules`, `cloud-portal.js`, `cloud-live.js`, `migrate-verified-workspace.mjs`, `test-cloud-portal.mjs`, `test-phase1-units.mjs`, `test-phase1-storage.mjs`, `test-migration-preflight.mjs` y este informe.

Responsables adicionales identificados, sin cambios nuevos en esta fase: `firebase-auth.js` (Authentication y modo local), `cloud-sessions.js`, `accounts-ui.js`, `migration-archive.js`, `verify-migration-backup.mjs`, `archive-verified-backup.mjs`, `firebase.json`. Los cambios anteriores que ya existían en algunos de ellos no deben confundirse con esta fase.

## Pruebas acotadas

- Firebase Emulator, proyecto `demo-sierra-madre`, Firestore 8087 y Storage 9199: `test-phase1-units.mjs`, `test-phase1-storage.mjs`, `test-cloud-portal.mjs`.
- Reglas base: `test-firestore-rules.mjs` pasó durante esta revisión: bootstrap, transferencia, revocación, aislamiento y cierre reservado. Las denegaciones esperadas aparecen como PERMISSION_DENIED en el log.
- Persistencia del portal: creación, revisión concurrente, finalización/reapertura de VEO/INC/TRN, recuperación de fotos fragmentadas, asignación por UID, actualización del responsable y rechazo del cierre por operador.
- `test-migration-backup.mjs`, `test-backup-page.mjs`, `test-migration-preflight.mjs`: integridad, duplicados, exclusión de credenciales y rechazo previo a escrituras.
- `test-auth-theme.mjs`, `test-cloud-session-ui.mjs`: regresiones acotadas del acceso y cierre de sesión ante fallos de persistencia/conexión.
- Comprobación de sintaxis de `cloud-portal.js`, `cloud-live.js` e importador.

## Riesgos potenciales y pendientes

- No se certifica la configuración desplegada: estas reglas son locales y requieren autorización para publicarse.
- Las unidades históricas con diferencias de escritura, mayúsculas o campos ambiguos requieren conciliación previa. Las reglas comparan etiquetas exactas. No se renombraron ni migraron registros automáticamente.
- Los programas y formatos ya disponen de UID de propiedad/asignación; algunos cálculos históricos todavía comparan nombres. Falta una conciliación compatible de homónimos y cambios de nombre, sin reasignar datos automáticamente.
- La validación completa del contenido de cada formato sigue dependiendo parcialmente del cliente. No equivale a validación exhaustiva del servidor ante escrituras directas mediante SDK.
- El modo local conserva datos en el navegador y no ofrece la misma separación de seguridad que Firebase; no se certifica aislamiento entre personas que comparten ese almacenamiento.
- El importador completo de formatos, programas, acciones y evidencias queda pendiente: el importador intervenido rechaza esos respaldos de forma segura.
- Los fragmentos fotográficos de intentos fallidos pueden quedar sin vincular; no se borraron automáticamente para evitar pérdida de evidencias.
- PDF/CSV: esta fase valida autorización y recuperación de los datos de origen. No se realizó una nueva prueba manual de descarga en navegador autenticado ni una certificación de todas las exportaciones.
- No se examinó ni alteró el inventario productivo para declarar ausencia de duplicados o pérdida histórica. Las verificaciones realizadas usan datos aislados.

Fin de esta fase. No se avanzó al diseño ni a otros módulos.
