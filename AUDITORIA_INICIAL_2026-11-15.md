# Auditoría inicial — Sierra Madre Seguridad Operativa

Fecha: 15 de noviembre de 2026

## Punto de restauración verificable

Antes de iniciar cambios estructurales se creó y verificó el respaldo del código fuente en el commit `76ef8c864c02bf30488a3493e1e379b6210eb262`.

| Archivo | SHA-256 |
| --- | --- |
| `C:\Users\Dell\Documents\pagina seguridad atentos\backups\sierra-madre-pre-modernizacion-20261115-200319.bundle` | `027DAED95F7628D5AF917322243DDFEC306030CF12768309DA72CCFAAE11B20A` |
| `C:\Users\Dell\Documents\pagina seguridad atentos\backups\sierra-madre-pre-modernizacion-20261115-200319.zip` | `E1652560D50DD833EA546EB3DB634E42FEB6707E2488D28E47289D527C18880F` |

El bundle fue verificado con `git bundle verify` y contiene el historial completo.

## Arquitectura encontrada

- El portal publicado en GitHub Pages es una aplicación estática. Sus archivos de entrada están duplicados en la raíz, `docs/` y `public/`.
- La autenticación del administrador usa Firebase Authentication. Las cuentas creadas desde el panel, sus permisos y los registros de operación usan actualmente `localStorage` mediante un adaptador que intercepta las rutas `/api/*` en el navegador.
- Existe una alternativa de Worker con R2 en `worker/`, con validación de registros y control de acceso. Esa alternativa no es la que utiliza el portal de GitHub Pages actual.
- Los formatos existentes incluyen reportes preventivos, acciones, programas mensuales, evidencias fotográficas, historiales de acciones, avisos y generación de PDF.

## Riesgos que deben corregirse antes de producción

1. Los datos creados en el portal actual no se comparten entre dispositivos ni se guardan en GitHub. Un borrado de datos del navegador puede perderlos.
2. Las cuentas locales y sus permisos se validan del lado del navegador. No son una barrera de seguridad suficiente para una operación productiva.
3. La contraseña de usuarios locales se resume en el navegador con un mecanismo no apto para producción.
4. El contenido y el código están triplicados, lo cual puede provocar que una corrección se publique en una copia y no en otra.
5. El conjunto de pruebas heredado contiene pruebas para el Worker anterior que ya no corresponden a la arquitectura estática actual; debe reemplazarse por pruebas de regresión del flujo real.

## Decisiones de migración

No se modificarán ni eliminarán registros existentes. La migración se realizará con estas etapas:

1. Agregar exportación de cada espacio local y un inventario de totales antes de importarlo.
2. Habilitar una fuente central autorizada en Firebase para usuarios, roles, registros, evidencias, bitácora y sesiones.
3. Importar cada respaldo con identificadores estables y una marca de procedencia para impedir duplicados.
4. Comparar conteos, folios, evidencias e historiales antes y después de la importación.
5. Mantener la lectura del historial durante la transición y bloquear el cambio a producción si la conciliación falla.

## Conteo de sesión solicitado

Se implementará para los roles **usuario operativo** y **operador**. Cada sesión conservará usuario, rol, inicio, última actividad, pausas por inactividad, cierre, duración activa y motivo de cierre. El administrador podrá filtrar por persona y periodo. El conteo se activará únicamente al persistirse en la fuente central; no se presentará como métrica global mientras dependa de un solo navegador.

## Validación inicial

- Sintaxis comprobada: `firebase-auth.js`, `workspace.js`, `accounts-ui.js`, `supervisor.js` y `report-pdf.js`.
- Generación del PDF de muestra: correcta.
- Las pruebas heredadas de acceso/workspace requieren actualización: intentan cargar el Worker empaquetado como módulo de datos y fallan antes de ejecutar los escenarios. No se consideran evidencia de una regresión funcional hasta que se sustituyan por pruebas alineadas con la arquitectura final.

## Regla de publicación

No se enviará ni publicará ninguna modificación mientras falten la exportación de los espacios locales, la migración validada y las pruebas de perfiles, registros, cierres, exportaciones y dispositivos indicadas en el proyecto.
