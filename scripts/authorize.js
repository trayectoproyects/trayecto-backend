// Script de uso UNICO: te da el "refresh token" que el backend necesita para
// crear eventos de Google Meet en tu nombre. Se corre una sola vez, a mano,
// en tu computadora (no en el servidor).
//
// Como usarlo:
//   1. Completa GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en tu .env (ver README)
//   2. Corre: npm run authorize
//   3. Se abre (o te paso) un link: entra con la cuenta de Gmail que va a
//      manejar el calendario de Trayecto y aceptá los permisos.
//   4. La terminal te va a mostrar una linea GOOGLE_REFRESH_TOKEN=... : copiala
//      dentro de tu .env.

require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const { URL } = require('url');

const REDIRECT_PORT = 4567;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('Falta GOOGLE_CLIENT_ID y/o GOOGLE_CLIENT_SECRET en tu .env. Mirá el README -> "Configurar Google Calendar".');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/calendar.events'],
});

console.log('\n1) Abrí este link en tu navegador, con la cuenta de Gmail que va a manejar el calendario:\n');
console.log(authUrl + '\n');
console.log(`(Esperando a que autorices... quedo escuchando en ${REDIRECT_URI})\n`);

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
    const code = reqUrl.searchParams.get('code');
    if (!code) {
      res.end('Falta el código en la URL. Volvé a intentar desde el link de arriba.');
      return;
    }

    res.end('Listo! Ya podés cerrar esta pestaña y volver a la terminal.');

    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      console.log('\nGoogle no mandó un refresh_token nuevo (puede pasar si ya autorizaste antes esta app).');
      console.log('Solución: andá a https://myaccount.google.com/permissions , sacale el acceso a esta app, y corré "npm run authorize" de nuevo.\n');
    } else {
      console.log('\n2) Copiá esta línea dentro de tu archivo .env:\n');
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    }
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Error durante la autorización:', err.message);
    res.end('Hubo un error, revisá la terminal.');
    server.close();
    process.exit(1);
  }
});

server.listen(REDIRECT_PORT);
