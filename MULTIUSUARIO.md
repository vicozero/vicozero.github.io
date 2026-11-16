# Arquitectura multiusuario — Sierra Madre

## Estado actual

- Persistencia central: **Firebase Firestore** (perfiles, registros, avisos, sesiones, auditLog).
- Autenticación: **Firebase Auth** (email/contraseña, browserLocalPersistence).
- Reglas: `firestore.rules` (desplegadas) + `storage.rules` (creadas, pendientes de desplegar).
- Cloud Functions: esqueleto en `functions/` (requiere plan Blaze para desplegar).

## Colecciones Firestore

| Colección | Propósito |
|---|---|
| `security/authority` | UID del administrador (bootstrap one-time) |
| `profiles/{uid}` | Usuarios, roles, permisos |
| `reports`, `actions`, `plans` | Registros operativos |
| `notices`, `noticeImages`, `noticeReads` | Avisos y adjuntos |
| `sessions` | Presencia y duración de sesiones |
| `evidenceChunks` | Chunks de evidencias fotográficas (legacy) |
| `auditLog` | Bitácora de cambios (append-only, solo admin lee) |
| `migrationBackups` | Respaldos de migración |

## Firebase Storage (pendiente de habilitar)

Para habilitar Storage (evidencias fuera de Firestore):
1. Ir a https://console.firebase.google.com/project/sierra-madre-seguridad/storage
2. Click "Get Started" → elegir región (us-central1 recomendado) → modo producción.
3. Desplegar reglas: `firebase deploy --only storage:rules --project sierra-madre-seguridad`
4. Las rutas definidas en `storage.rules`:
   - `/evidence/{collection}/{recordId}/{file}` — evidencias fotográficas (≤10 MB, solo imágenes).
   - `/avatars/{uid}/{file}` — avatares (≤2 MB).
   - `/notices/{noticeId}/{file}` — adjuntos de avisos (≤10 MB).

## Cloud Functions (requiere plan Blaze)

El esqueleto está en `functions/index.js`:
- `validateAction` (callable): valida y crea una acción con auditoría.
- `auditReportCreate` (trigger): registra en auditLog al crear un reporte.
- `health` (callable): verificación de salud.

Para desplegar:
1. Activar plan Blaze en https://console.firebase.google.com/project/sierra-madre-seguridad/usage
2. `cd functions && npm install`
3. `firebase deploy --only functions --project sierra-madre-seguridad`

**Alternativa sin Blaze**: mantener la validación en Firestore rules + adaptador `/api` (estado actual). Cloud Functions son opcionales.

## Auditoría

- Colección `auditLog` (append-only): `actorUid`, `action`, `target`, `createdAt`.
- Solo el administrador puede leer.
- Cualquier usuario autenticado puede crear entradas (para registrar sus propias acciones).
- No se pueden modificar ni eliminar.

## Migración de evidencias (dataUrl → Storage)

Pendiente. Pasos cuando Storage esté habilitado:
1. Subir cada `dataUrl` a Storage en `/evidence/{collection}/{recordId}/{index}.jpg`.
2. Reemplazar el `dataUrl` en el registro por la URL de descarga.
3. Mantener `photoChunkIds` como respaldo durante la transición.

## Eliminación de localStorage (producción)

Actualmente `localStorage` se usa para:
- Sesión local de usuarios creados en-app (`sm-local-session`, `sm-workspace-v1`).
- Tema (`sm-theme`).
- Historial de sesiones local (`sm-session-history-v1`).

Plan:
- Mantener `sm-theme` en localStorage (preferencia de UI, no datos).
- Migrar usuarios locales a Firebase Auth (ya soportado por importación).
- Eliminar `sm-session-history-v1` una vez que `sessions` en Firestore tenga historial completo.
- Eliminar `sm-workspace-v1` tras la migración validada.

## Emuladores locales

`firebase.json` ahora incluye emuladores de Firestore (8087), Storage (9199) y Functions (5001). Para probar localmente:
```
firebase emulators:start --only firestore,storage,functions
```

## Pendientes manuales

1. Habilitar Firebase Storage en la consola (ver §Storage).
2. (Opcional) Activar plan Blaze y desplegar Cloud Functions.
3. Migrar evidencias a Storage cuando Storage esté activo.
4. Eliminar dependencia de localStorage tras migración validada.