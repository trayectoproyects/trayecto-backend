// Mandamos los emails con la API HTTP de Brevo (brevo.com), no por SMTP.
//
// Por qué: en el plan gratis, Render bloquea las conexiones salientes por los
// puertos que usa el email tradicional (SMTP: 25/465/587). Por eso Gmail por
// SMTP (como lo hacíamos antes, con nodemailer) se queda esperando una
// respuesta que nunca llega y termina en "Connection timeout" — no importa
// que el usuario y la contraseña de aplicación estén bien configurados.
// Brevo manda el email como un pedido HTTPS normal (como cualquier llamada a
// una API), así que no choca con ese bloqueo. Ver README -> Parte B.1.

function emailConfigurado() {
  return Boolean(process.env.BREVO_API_KEY && process.env.GMAIL_USER);
}

async function enviarEmail({ to, subject, text }) {
  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: process.env.GMAIL_USER, name: 'Trayecto' },
      to: [{ email: to }],
      subject,
      textContent: text,
    }),
  });

  if (!resp.ok) {
    const detalle = await resp.text().catch(() => '');
    throw new Error(`Brevo respondió ${resp.status}: ${detalle.slice(0, 300)}`);
  }
}

async function notificarNuevoLead({ nombre, marca, celular, instagram, email, servicios, comentario, fecha, hora, meetLink }) {
  if (!emailConfigurado()) {
    console.warn('BREVO_API_KEY / GMAIL_USER no estan configurados: no se mando ningun email. Revisa el README -> Parte B.1.');
    return;
  }

  const listaServicios = Array.isArray(servicios) ? servicios.join(', ') : (servicios || '—');

  // 1) Aviso interno para Trayecto
  await enviarEmail({
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
    await enviarEmail({
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
