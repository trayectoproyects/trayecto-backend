# Backend de Trayecto

Este es el servidor que recibe lo que la gente completa en el formulario de
"Contacto" de tu web. Cuando alguien lo envía:

1. Aparece al instante en tu **panel de administrador** (`/admin`), con
   aviso visual, sonido y notificación del navegador si lo tenés abierto.
2. Si puso fecha y hora, crea automáticamente un evento de **Google Meet** en
   tu calendario (e invita a esa persona, si dejó su email).
3. Te manda un **email** avisándote del nuevo contacto, con todos los datos.
4. Si la persona dejó su email, le manda una **confirmación** a ella también.
5. Guarda una copia de cada contacto en un archivo (`leads.json`).

No hace falta que sepas programar para ponerlo a funcionar, pero sí vas a
tener que crear algunas claves en tu cuenta de Google. Son 4 partes:

- **Parte A** — instalar y probar en tu computadora
- **Parte B** — configurar el email y el Google Meet automático
- **Parte C** — publicarlo en internet (gratis) y conectarlo con tu web
- **Parte D** — usar el panel de administrador

Calculá entre 20 y 40 minutos la primera vez, sobre todo por la Parte B.

---

## Parte A — Instalar y probar

Necesitás tener [Node.js](https://nodejs.org) instalado (versión 18 o más
nueva). Si no lo tenés, descargalo de esa web e instalalo como cualquier
programa.

1. Abrí una terminal dentro de esta carpeta (`trayecto-backend`).
2. Instalá las dependencias:
   ```
   npm install
   ```
3. Copiá el archivo de ejemplo de configuración:
   ```
   cp .env.example .env
   ```
   (En Windows, si `cp` no funciona, simplemente duplicá el archivo
   `.env.example` y renombrá la copia a `.env`.)
4. Probá que arranque:
   ```
   npm start
   ```
   Si ves `Servidor de Trayecto escuchando en el puerto 3000`, funciona. Dejalo
   así y seguí con la Parte B (todavía no manda emails ni crea eventos porque
   falta configurar eso).

---

## Parte B — Email y Google Meet automático

### B.1 — Email (Gmail)

1. Entrá a tu cuenta de Gmail (la que quieras que use Trayecto para esto,
   puede ser `hola.trayecto@gmail.com` o la que uses de verdad).
2. Activá la verificación en 2 pasos, si no la tenés:
   https://myaccount.google.com/security
3. Generá una "contraseña de aplicación":
   https://myaccount.google.com/apppasswords
   - Nombre: "Trayecto Web" (o lo que quieras)
   - Te va a dar un código de 16 letras, tipo `abcd efgh ijkl mnop`
4. Abrí el archivo `.env` y completá:
   ```
   GMAIL_USER=tu-email-real@gmail.com
   GMAIL_APP_PASSWORD=abcdefghijklmnop   (sin espacios)
   NOTIFY_EMAIL=tu-email-real@gmail.com
   ```

### B.2 — Google Calendar (evento de Meet automático)

Esto es opcional: si no lo configurás, el backend igual funciona, guarda el
contacto y te avisa por email — simplemente no va a crear el evento de Meet
solo (se lo prometés vos a mano después de que te escriban).

1. Andá a https://console.cloud.google.com/ y creá un proyecto nuevo
   (arriba a la izquierda, "Seleccionar proyecto" → "Proyecto nuevo"). Ponele
   de nombre "Trayecto".
2. En el buscador de arriba escribí **"Google Calendar API"**, entrá y
   apretá **"Habilitar"**.
3. Andá a **"Pantalla de consentimiento de OAuth"** (buscalo en el buscador):
   - Tipo de usuario: **Externo** → Crear
   - Completá nombre de la app ("Trayecto"), tu email, y guardá
   - En "Público de prueba" / "Test users", agregá tu propio email de Gmail
   - No hace falta publicarla, con que quede en modo "Testing" alcanza
4. Andá a **"Credenciales"** → **"Crear credenciales"** → **"ID de cliente de
   OAuth"**:
   - Tipo de aplicación: **Aplicación de escritorio** (Desktop app)
   - Nombre: "Trayecto backend"
   - Te va a dar un **Client ID** y un **Client Secret**
5. Copialos a tu `.env`:
   ```
   GOOGLE_CLIENT_ID=................apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=................
   ```
6. Ahora corré, una sola vez:
   ```
   npm run authorize
   ```
   Te va a mostrar un link. Abrilo, entrá con la cuenta de Gmail que va a
   manejar el calendario de Trayecto, aceptá los permisos. La terminal te va
   a mostrar una línea `GOOGLE_REFRESH_TOKEN=...`: copiala también a tu
   `.env`.

7. Reiniciá el servidor (`Ctrl+C` y de nuevo `npm start`). Ya está: los
   eventos de Meet se crean solos.

### B.3 — Probar que funciona

Con el servidor corriendo (`npm start`), en otra terminal probá:

```
curl -X POST http://localhost:3000/api/contacto \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Prueba","marca":"Mi Negocio","email":"tu-email@gmail.com","servicios":["Contenido & video"],"comentario":"Esto es una prueba","fecha":"2026-11-01","hora":"15:00"}'
```

Si todo está bien configurado: te debería llegar un email a `NOTIFY_EMAIL`,
otro a `tu-email@gmail.com`, y aparecer un evento nuevo en tu Google Calendar
con un link de Meet.

---

## Parte C — Publicarlo en internet (gratis, con Render)

Mientras el servidor corre solo en tu computadora, tu web (que está publicada
en internet) no lo puede encontrar. Hay que subirlo a un hosting. La opción
más simple y gratuita es **Render**:

1. Subí esta carpeta a un repositorio de GitHub (si no sabés cómo, buscá
   "subir carpeta a GitHub" o pedile ayuda a alguien — es un paso único).
   - **Importante**: el archivo `.env` NO se sube (ya está excluido en
     `.gitignore`), las claves las vas a cargar directo en Render en el
     paso 4.
2. Creá una cuenta gratis en https://render.com (podés entrar con GitHub).
3. "New" → "Web Service" → elegí tu repositorio.
4. Configuración:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - Plan: **Free**
5. En la sección **"Environment"**, cargá una por una todas las variables que
   tenés en tu `.env` (GMAIL_USER, GMAIL_APP_PASSWORD, NOTIFY_EMAIL,
   ADMIN_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN,
   y `ALLOWED_ORIGIN` con el dominio real de tu web).
6. Deploy. Render te va a dar una URL tipo
   `https://trayecto-backend.onrender.com`.

   Nota: en el plan gratis, Render "duerme" el servidor si no recibe tráfico
   por un rato, y tarda unos ~30 segundos en despertar en el próximo pedido.
   Para una web de agencia con contacto ocasional no suele ser un problema;
   si más adelante te molesta, se soluciona pasando a un plan pago chico.

### Conectar el formulario de tu web

Abrí el HTML de tu sitio (`ambar-agencia-marketing.html`), buscá esta línea
cerca del final (dentro del `<script>`):

```js
const BACKEND_URL = ''; // TODO: pegá acá la URL de Render, ej: https://trayecto-backend.onrender.com
```

y completala con la URL que te dio Render. Volvé a publicar el HTML. Listo:
el formulario ya manda todo a este backend. Si en algún momento el backend no
responde (por ejemplo, mientras todavía no lo desplegaste), el formulario
sigue funcionando igual por WhatsApp como respaldo automático.

---

## Parte D — Panel de administrador

Además de los emails, tenés un panel visual donde ves (y te enterás al
instante) de cada persona que se registra y agenda una llamada.

### Entrar al panel

Andá a:

- En tu computadora, mientras probás: `http://localhost:3000/admin`
- Ya publicado en Render: `https://tu-backend.onrender.com/admin`

Te va a pedir una clave: es el valor de `ADMIN_TOKEN` que pusiste en tu
`.env` (o cargaste en Render). Guardá ese link — es privado, nadie más lo
tiene, y no está linkeado desde ningún lado de tu web pública.

### Qué hace

- Lista todos los contactos, el más reciente arriba, con nombre, marca,
  email, qué servicio pidieron, su comentario, y la fecha/hora que
  solicitaron para la llamada.
- Si el contacto quedó con un Google Meet agendado, tenés un botón **"Abrir
  Meet"** directo en la tarjeta.
- **Se actualiza solo**: mientras tengas la pestaña abierta, en el momento
  que alguien agenda desde tu web aparece una tarjeta nueva arriba de todo,
  con un sonido y (si le diste permiso al navegador) una notificación de
  escritorio — no hace falta recargar la página.
- Si cerrás el panel y lo volvés a abrir más tarde, todo lo que llegó
  mientras no estabas queda marcado como **"Nuevo"** hasta que lo veas.
- Tiene un buscador rápido (por nombre, marca o email) y contadores arriba
  (total, de hoy, y cuántos ya tienen Meet agendado).

### Para que te lleguen las notificaciones

La primera vez que entrás, el navegador te va a preguntar si querés permitir
notificaciones de ese sitio — aceptá esa ventanita. Mientras la pestaña del
panel esté abierta en algún lado (no hace falta que esté al frente), vas a
recibir el aviso apenas alguien complete el formulario.

### Ver los datos en crudo (opcional)

Si alguna vez querés los datos sin la interfaz visual (por ejemplo para
exportarlos a otro lado):

```
curl -H "x-admin-token: EL_ADMIN_TOKEN_DE_TU_.ENV" https://tu-backend.onrender.com/api/leads
```

Te devuelve un listado en JSON con todos los contactos recibidos.
