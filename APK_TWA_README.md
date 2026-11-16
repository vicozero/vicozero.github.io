# APK Android (TWA) — Sierra Madre Seguridad Operativa

Recomendación aplicada: **TWA (Trusted Web Activity)** usando Bubblewrap, sobre la PWA ya desplegada en `https://vicozero.github.io/`.

## Requisitos (en tu equipo)
- Node.js y npm
- JDK 17+ y Android SDK / Android Studio (para compilar)
- Bubblewrap CLI: `npm i -g @bubblewrap/cli`
- Cuenta de Google Play (si vas a publicar) y una **keystore** de firma

## Archivos preparados en este repo
- `.well-known/assetlinks.json`: declaración de vínculo de la app con el dominio (Digital Asset Links). **Debes reemplazar** `REEMPLAZAR_CON_HUELLA_SHA256_DEL_CERTIFICADO_DE_FIRMA` por la huella SHA-256 del certificado con el que firmes el APK/AAB.
- `twa-manifest.json`: configuración base para Bubblewrap (paquete `io.github.vicozero.seguridad.twa`, host, íconos, colores, `startUrl`).

> Importante: `.well-known/assetlinks.json` debe estar accesible públicamente en `https://vicozero.github.io/.well-known/assetlinks.json` (se incluye en el despliegue). Sin la huella correcta, la app puede abrirse como Custom Tab en lugar de TWA pantalla completa.

## Pasos para generar el APK/AAB

1. **Instalar Bubblewrap** (si no lo tienes):
   ```bash
   npm install -g @bubblewrap/cli
   ```

2. **Inicializar/actualizar proyecto TWA** (desde esta carpeta, donde está `twa-manifest.json`):
   ```bash
   bubblewrap update
   # o, si prefieres crear desde el manifest web:
   # bubblewrap init --manifest https://vicozero.github.io/manifest.webmanifest
   ```
   Bubblewrap te pedirá/creará la keystore (`android.keystore`) y la configuración del SDK/JDK si hace falta.

3. **Construir**:
   ```bash
   bubblewrap build
   ```
   Genera el APK/AAB firmado (según configuración) dentro del proyecto Android que crea Bubblewrap.

4. **Obtener huella SHA-256 del certificado** y publicarla:
   ```bash
   keytool -list -v -keystore android.keystore -alias seguridad-sm
   ```
   Copia la huella SHA-256 y reemplázala en `.well-known/assetlinks.json`, luego haz commit/push y espera el despliegue para que el dominio quede verificado.

5. **Probar en dispositivo**: instala el APK generado (`adb install ...`) y verifica que abra sin barra de navegador (TWA). Si aparece barra, revisa `assetlinks.json` y la firma.

## Notas
- La TWA usa Chrome en el dispositivo; la app se actualiza con el contenido web desplegado.
- Login Firebase, Firestore/Storage, cámara/archivos y permisos funcionan como en el navegador dentro de la TWA; pruébalos en dispositivos reales.
- Para Play Store: genera un **AAB**, usa Play App Signing (recomendado) y asegúrate de poner en `assetlinks.json` la huella del certificado de **App Signing** (la que muestra Play Console), no solo la de subida si difieren.
- Alternativa si necesitas más control nativo: **Capacitor** (proyecto `android/` con WebView y plugins).
