// "Base de datos" simple: un archivo leads.json en el servidor.
// No hace falta instalar ni configurar ninguna base de datos aparte.
//
// OJO: en algunos hosting gratuitos (ej. el plan free de Render) el disco se
// reinicia en cada deploy, asi que este archivo no es un archivo historico
// 100% permanente. El respaldo real de cada contacto es el email que se
// manda en el momento (ver src/email.js) — ese si queda en tu Gmail para
// siempre. Si mas adelante queres guardado permanente de verdad, se puede
// reemplazar esto por una base de datos real (ej. Postgres de Render/Supabase)
// sin tocar el resto del backend.

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'leads.json');

function leerLeads() {
  if (!fs.existsSync(DB_FILE)) return [];
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('No se pudo leer leads.json, empiezo de cero:', err.message);
    return [];
  }
}

function guardarLead(lead) {
  const leads = leerLeads();
  const nuevo = {
    id: Date.now(),
    creado_en: new Date().toISOString(),
    ...lead,
  };
  leads.unshift(nuevo);
  fs.writeFileSync(DB_FILE, JSON.stringify(leads, null, 2));
  return nuevo;
}

function listarLeads() {
  return leerLeads();
}

module.exports = { guardarLead, listarLeads };
