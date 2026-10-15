require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { guardarLead, listarLeads } = require('./src/db');
const { crearEventoMeet } = require('./src/calendar');
const { notificarNuevoLead } = require('./src/email');

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));

// Panel de administrador: la página vive en public/admin.html y se sirve en /admin
app.use(express.static(path.join(__dirname, 'public')));
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ---------- Notificaciones en vivo (Server-Sent Events) ----------
// Cada vez que entra un lead nuevo, se lo empujamos a todos los paneles de
// administrador que estén abiertos en ese momento, para que aparezca al
// instante sin tener que recargar la página.
const sseClients = new Set();

function broadcastNuevoLead(lead) {
  const payload = `data: ${JSON.stringify(lead)}\n\n`;
  for (const res of sseClients) {
    res.write(payload);
  }
}

function tokenValido(token) {
  return Boolean(process.env.ADMIN_TOKEN) && token === process.env.ADMIN_TOKEN;
}

app.get('/api/leads/stream', (req, res) => {
  // EventSource (el navegador) no puede mandar headers custom, por eso el
  // token viaja como query param acá (a diferencia de GET /api/leads).
  if (!tokenValido(req.query.token)) {
    return res.status(401).end();
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.write(': conectado\n\n');

  sseClients.add(res);
  const keepAlive = setInterval(() => res.write(': ping\n\n'), 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

const SERVICIOS_VALIDOS = [
  'Pauta publicitaria',
  'Contenido & redes',
  'Branding & diseño',
  'Automatización & CRM',
  'Otro',
];

app.post('/api/contacto', async (req, res) => {
  try {
    const body = req.body || {};
    const nombre = String(body.nombre || '').trim().slice(0, 120);
    const marca = String(body.marca || '').trim().slice(0, 120);
    const celular = body.celular ? String(body.celular).trim().slice(0, 40) : null;
    const instagram = body.instagram ? String(body.instagram).trim().slice(0, 60) : null;
    const email = body.email ? String(body.email).trim().slice(0, 200) : null;
    const comentario = body.comentario ? String(body.comentario).trim().slice(0, 2000) : null;
    const fecha = body.fecha ? String(body.fecha).trim() : null; // "YYYY-MM-DD"
    const hora = body.hora ? String(body.hora).trim() : null; // "HH:MM"
    const servicios = Array.isArray(body.servicios)
      ? body.servicios.filter((s) => SERVICIOS_VALIDOS.includes(s))
      : [];

    if (!nombre || !marca) {
      return res.status(400).json({ ok: false, error: 'Falta nombre o marca.' });
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'El email no es válido.' });
    }
    if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ ok: false, error: 'La fecha no es válida.' });
    }
    if (hora && !/^\d{2}:\d{2}$/.test(hora)) {
      return res.status(400).json({ ok: false, error: 'La hora no es válida.' });
    }

    // 1) Si pidieron fecha y hora, intentamos crear el evento de Meet.
    //    Si Calendar no esta configurado o falla, seguimos igual (no bloquea el resto).
    let meetLink = null;
    try {
      meetLink = await crearEventoMeet({ nombre, marca, email, fecha, hora, comentario });
    } catch (err) {
      console.error('No se pudo crear el evento de Calendar:', err.message);
    }

    // 2) Guardamos el lead si o si, haya salido bien o mal lo de arriba.
    const lead = guardarLead({
      nombre,
      marca,
      celular,
      instagram,
      email,
      servicios,
      comentario,
      fecha,
      hora,
      meet_link: meetLink,
    });

    // 2b) Empujamos el lead a cualquier panel de administrador que esté
    //     abierto en este momento, para que aparezca al instante.
    broadcastNuevoLead(lead);

    // 3) Mandamos los emails (interno + confirmacion). Si falla, no rompe la respuesta.
    try {
      await notificarNuevoLead({ nombre, marca, celular, instagram, email, servicios, comentario, fecha, hora, meetLink });
    } catch (err) {
      console.error('No se pudo enviar el email:', err.message);
    }

    res.json({ ok: true, id: lead.id, meetLink });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error interno del servidor.' });
  }
});

// Lista de contactos recibidos, en JSON crudo: GET /api/leads con el header
// x-admin-token (o ?token=... por query) igual al ADMIN_TOKEN del .env.
// El panel visual que de verdad vas a usar es /admin (ver public/admin.html).
app.get('/api/leads', (req, res) => {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!tokenValido(token)) {
    return res.status(401).json({ ok: false, error: 'No autorizado.' });
  }
  res.json({ ok: true, leads: listarLeads() });
});

app.get('/', (req, res) => {
  res.send('Backend de Trayecto funcionando. Probá POST /api/contacto. Panel: /admin');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de Trayecto escuchando en el puerto ${PORT}`);
});
