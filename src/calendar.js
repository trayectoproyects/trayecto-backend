const { google } = require('googleapis');

function calendarConfigurado() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );
}

function getCalendarClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Crea un evento de 30 minutos con link de Google Meet y, si hay email, invita
// a esa persona. Devuelve el link de Meet, o null si no se pudo / no correspondia.
async function crearEventoMeet({ nombre, marca, email, fecha, hora, comentario }) {
  if (!fecha || !hora) return null; // no pidieron horario puntual
  if (!calendarConfigurado()) {
    console.warn('Google Calendar no esta configurado todavia (ver README -> Configurar Google Calendar).');
    return null;
  }

  const calendar = getCalendarClient();
  const inicio = new Date(`${fecha}T${hora}:00`);
  if (Number.isNaN(inicio.getTime())) return null;
  const fin = new Date(inicio.getTime() + 30 * 60000); // llamada de 30 min

  const evento = {
    summary: `Trayecto <> ${marca}`,
    description: `Llamada con ${nombre} (${marca}).\n\n${comentario || ''}`.trim(),
    start: { dateTime: inicio.toISOString(), timeZone: 'America/Argentina/Buenos_Aires' },
    end: { dateTime: fin.toISOString(), timeZone: 'America/Argentina/Buenos_Aires' },
    attendees: email ? [{ email }] : [],
    conferenceData: {
      createRequest: {
        requestId: `trayecto-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  const res = await calendar.events.insert({
    calendarId: 'primary',
    resource: evento,
    conferenceDataVersion: 1,
    sendUpdates: email ? 'all' : 'none',
  });

  return res.data.hangoutLink || null;
}

module.exports = { crearEventoMeet, calendarConfigurado };
