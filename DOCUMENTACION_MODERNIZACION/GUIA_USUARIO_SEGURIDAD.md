# Guía de Usuario — Seguridad Industrial Sierra Madre

**Versión:** 1.0 · **Fecha:** 22-11-2026 · **Sitio:** https://vicozero.github.io/

---

## 1. Acceso

1. Abra el sitio e inicie sesión con la cuenta autorizada por Seguridad Industrial.
2. Si su cuenta tiene permisos limitados, solo verá los módulos y las unidades autorizadas.
3. El tema claro/oscuro se guarda en el dispositivo y se mantiene entre sesiones.
4. La barra superior muestra usuario, unidad, periodo y reloj de sesión. Si ve **«MODO LOCAL · sin sincronización central»**, está usando el modo local: **no es apto para registros reales**.

> Nunca comparta su cuenta. Si cambia de turno o de responsabilidad, pida al administrador que actualice sus permisos.

---

## 2. Navegación

El menú lateral organiza el trabajo en grupos:

| Grupo | Secciones disponibles hoy |
|---|---|
| Centro de control | Dashboard general (métricas, KPIs, registros recientes) |
| Supervisión preventiva | Formatos del supervisor (17 tipos), Programa mensual, Pláticas y capacitación, Biblioteca NOM |
| Gestión de hallazgos | Hallazgos dentro de los formatos, Seguimiento de acciones, Tablero, Verificación de cierres |
| Reportes y análisis | Reporte de avances, Matriz de cumplimiento, exportación PDF/CSV |
| Administración | Usuarios y permisos (admin), Avisos, Sesiones activas (admin), Respaldos (admin) |

El menú se colapsa en pantallas pequeñas; use el botón de menú para abrirlo.

---

## 3. Capturar una supervisión

1. En **Formatos del supervisor**, pulse **Nuevo registro**.
2. Elija el tipo de formato. Hay 17, entre ellos:
   - Inspección de áreas de trabajo, **Inspección planta**, **Inspección mina**
   - Hallazgos de inspección, Actos y condiciones inseguras
   - Evaluación de PST, Liderazgo visible, Verificación de estándares (VEO)
   - Observación preventiva, Incidentes, Capacitación, Controles críticos, Flash Report y otros
3. Complete los campos comunes: fecha, turno, supervisor, departamento, lugar, nivel KPI.
4. Complete los campos específicos y las tablas repetibles (por ejemplo, *Comentario del hallazgo* o *Meses de experiencia*).
5. En los checklist use **Cumple / No cumple / No aplica**. Los incumplimientos piden descripción, riesgo y acción requerida.
6. Agregue fotografías si aplica: cámara o galería, con descripción individual. Se redimensionan para el registro.
7. Pulse **Guardar avance** cuando quiera continuar después: verá «**Avance Guardado**» y la ventana se cerrará.
8. Al terminar, pulse **Finalizar**: verá «**Finalizado**» y la ventana se cerrará.

**Borradores:** puede reabrirlos desde la lista y continuar. Los borradores **no cuentan** para los KPIs hasta finalizarse.

**Formatos finalizados:** no se pueden editar libremente. Solo un administrador puede reabrirlos, y debe hacerlo con motivo.

---

## 4. Depósitos y evidencia

- Adjunte fotos en los formatos y en las acciones. Se conservan iniciales, de corrección y de verificación cuando el flujo lo pide.
- En móvil, la cámara del dispositivo funciona desde el botón de captura.
- Si no hay señal, **no cierre el formulario**: el sistema no garantiza todavía la sincronización offline (ver §8).

---

## 5. Acciones correctivas

1. Desde un formato finalizado puede generar una acción con **«Generar acción correctiva»**, o usar **«Crear acción desde hallazgos»** para las filas marcadas.
2. Toda acción lleva folio `SM-AC-…`, descripción, responsable, unidad, fecha compromiso, prioridad y origen.
3. El semáforo muestra:
   - **Verde** — cerrada y verificada, o vigente sin alerta.
   - **Amarillo** — próxima a vencer.
   - **Rojo** — vencida sin cierre verificado.
   - **Gris** — cancelada autorizada o sin programación.
   - Siempre hay **texto e icono**, no solo color.
4. Actualice el porcentaje de avance y agregue comentarios; cada cambio queda en la bitácora de la acción.
5. Al llegar al 100 %, envíe a **Por verificar**. La verificación la hace otra persona autorizada.
6. Si el cierre es rechazado, corrija y reenvíe; el motivo queda registrado (validación completa en preparación).

**Riesgo crítico:** se destaca aunque la fecha no haya vencido. Requiere medidas temporales y no puede cerrarse sin revisión competente. Ante peligro grave o inminente, aplique el procedimiento de suspensión de la actividad de la empresa; el sistema no autoriza reinicios automáticos.

---

## 6. Programa, metas y avances

- El **Programa mensual** muestra responsable, unidad, departamento, periodo, nivel KPI (1 = jefaturas/superintendencias, 2 = supervisores) y metas por grupo.
- **Reporte de avances** y **Matriz de cumplimiento** muestran Programado / Ejecutado / Atrasado / Cumplimiento por responsable y grupo.
- El cumplimiento se calcula con `min(ejecutado, programado)` por actividad: hacer más de una meta no compensa otra.
- Puede filtrar por periodo, supervisor, unidad, nivel KPI, estado y origen.

> Nota temporal: mientras se unifican los motores (FASE 5), el «Centro de control» y el «PDF de KPIs mensual» pueden mostrar cifras distintas a la matriz. Use la **matriz** como referencia hasta que se complete la corrección.

---

## 7. Reportes y biblioteca

- **PDF de formato:** desde el registro finalizado, con logo, folio, condiciones evaluadas, hallazgos, fotos y firmas.
- **PDF/CSV de avances y acciones:** desde Reporte de avances o Seguimiento de acciones.
- **Biblioteca NOM:** busque normas, consulte fichas y vincule numerales al formato.
- **Pláticas:** programe temas, registre asistencia y descargue el temario para Excel (.csv).

---

## 8. Uso en teléfono y conectividad limitada

- La interfaz es adaptable: menú lateral desplegable, botones grandes y tablas con desplazamiento horizontal.
- La app es instalable como PWA (ícono en pantalla de inicio).
- El service worker guarda la **interfaz** para abrirla sin conexión, pero **no hay cola de sincronización de datos**. Si pierde señal:
  1. No cierre el formulario.
  2. El sistema avisará que conserve los datos y vuelva a guardar.
  3. No dará «guardado» hasta confirmar en la nube.
- **No active ni confíe en un modo offline completo**: aún no está implementado de forma segura.

---

## 9. Avisos y notificaciones

- Use **Avisos y observaciones** para mensajes internos con adjuntos y estado de lectura.
- Los avisos se actualizan con la app abierta. **No hay correo, WhatsApp ni notificaciones push** configuradas.
- Las alertas automáticas actuales son limitadas: se ampliarán en fases posteriores.

---

## 10. Si algo falla

| Situación | Acción |
|---|---|
| «Conflicto de edición» | Otro usuario modificó el registro; actualice la lista y vuelva a abrirlo |
| No abre una sección | Actualice la página; la caché se renueva con el service worker |
| No aparece una foto | Verifique conexión y que el registro terminó de sincronizar |
| No ve un módulo | Su perfil no tiene permiso; solicítelo al administrador |
| Botón fuera de pantalla en móvil | Gire el dispositivo o use el menú lateral; reporte el caso a Seguridad |
