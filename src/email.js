const nodemailer = require('nodemailer');

function emailConfigurado() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function getTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

async function notificarNuevoLead({ nombre, marca, celular, instagram, email, servicios, comentario, fecha, hora, meetLink }) {
  if (!emailConfigurado()) {
    console.warn('GMAIL_USER / GMAIL_APP_PASSWORD no estan configurados: no se mando ningun email. Revisa el .env');
    return;
  }

  const transport = getTransport();
  const listaServicios = Array.isArray(servicios) ? servicios.join(', ') : (servicios || '—');

  // 1) Aviso interno para Trayecto
  await transport.sendMail({
    from: `"Web Trayecto" <${process.env.GMAIL_USER}>`,
    to: process.env.NOTIFY_EMAIL || process.env.GMAIL_USER,
    subject: `Nuevo contacto: ${marca} (${nombre})`,
    text: [
      `Nombre: ${nombre}`,
      `Marca: ${marca}`,
      `Celular: ${celular || '—'}`,
      `Instagram: ${instagram || '—'}`,
      `Email: ${email || '—'}`,
      `Servicios de interes: ${listaServicios || '—'}`,
      `Comentario: ${comentario || '—'}`,
      `Fecha/hora pedida: ${fecha || '—'} ${hora || ''}`.trim(),
      meetLink
        ? `Evento de Google Meet creado automaticamente: ${meetLink}`
        : 'No se creo un evento de Meet (no pidieron fecha/hora, o falta configurar Google Calendar).',
    ].join('\n'),
  });

  // 2) Confirmacion para quien escribio, solo si dejo su email
  if (email) {
    const tieneFecha = Boolean(fecha);
    await transport.sendMail({
      from: `"Trayecto" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: tieneFecha ? 'Tu llamada con Trayecto esta agendada' : 'Recibimos tu mensaje — Trayecto',
      text: tieneFecha
        ? [
            `Hola ${nombre}!`,
            '',
            `Confirmamos tu llamada para el ${fecha}${hora ? ' a las ' + hora + 'hs' : ''}.`,
            meetLink
              ? `Link de Google Meet: ${meetLink}`
              : 'Te confirmamos el link de Google Meet a la brevedad por este mismo medio.',
            '',
            'Cualquier cosa, respondé este email o escribinos por WhatsApp.',
            '',
            '— Equipo Trayecto',
          ].join('\n')
        : [
            `Hola ${nombre}!`,
            '',
            `Recibimos tu mensaje sobre ${marca}. Te contactamos en menos de 24hs.`,
            '',
            '— Equipo Trayecto',
          ].join('\n'),
    });
  }
}

module.exports = { notificarNuevoLead, emailConfigurado };
