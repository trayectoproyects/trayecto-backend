// "Base de datos": si está configurada la variable de entorno DATABASE_URL,
// los contactos se guardan en una base Postgres de verdad (recomendado: no se
// pierde nunca, ni con reinicios ni con redeploys).
//
// Si DATABASE_URL todavía no está configurada, usa como antes un archivo
// leads.json en el servidor (simple, pero en el plan free de Render se pierde
// cada vez que el servicio se reinicia o se redespliega). Esto es a propósito,
// para que el sitio siga funcionando mientras se termina de configurar la
// base de datos real.

const fs = require('fs');
const path = require('path');

const usarPostgres = Boolean(process.env.DATABASE_URL);

// ---------- Modo archivo (leads.json) ----------

const DB_FILE = path.join(__dirname, '..', 'leads.json');

function leerLeadsArchivo() {
  if (!fs.existsSync(DB_FILE)) return [];
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('No se pudo leer leads.json, empiezo de cero:', err.message);
    return [];
  }
}

function guardarLeadArchivo(lead) {
  const leads = leerLeadsArchivo();
  const nuevo = {
    id: Date.now(),
    creado_en: new Date().toISOString(),
    ...lead,
  };
  leads.unshift(nuevo);
  fs.writeFileSync(DB_FILE, JSON.stringify(leads, null, 2));
  return nuevo;
}

// ---------- Modo Postgres (recomendado) ----------

let pool = null;
let tablaLista = null;

function getPool() {
  if (!pool) {
    // "pg" solo se importa si realmente se va a usar, para no exigirlo
    // cuando el backend corre en modo archivo.
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Necesario para conectarse a bases como Supabase/Render Postgres desde
      // afuera sin tener que configurar el certificado de la autoridad.
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function asegurarTabla() {
  if (!tablaLista) {
    tablaLista = getPool().query(`
      CREATE TABLE IF NOT EXISTS leads (
        id BIGINT PRIMARY KEY,
        creado_en TIMESTAMPTZ NOT NULL,
        nombre TEXT,
        marca TEXT,
        celular TEXT,
        instagram TEXT,
        email TEXT,
        servicios JSONB,
        comentario TEXT,
        fecha TEXT,
        hora TEXT,
        meet_link TEXT
      );
    `);
  }
  return tablaLista;
}

function filaALead(r) {
  return {
    id: Number(r.id),
    creado_en: new Date(r.creado_en).toISOString(),
    nombre: r.nombre,
    marca: r.marca,
    celular: r.celular,
    instagram: r.instagram,
    email: r.email,
    servicios: r.servicios || [],
    comentario: r.comentario,
    fecha: r.fecha,
    hora: r.hora,
    meet_link: r.meet_link,
  };
}

async function guardarLeadPostgres(lead) {
  await asegurarTabla();
  const nuevo = {
    id: Date.now(),
    creado_en: new Date().toISOString(),
    ...lead,
  };
  await getPool().query(
    `INSERT INTO leads (id, creado_en, nombre, marca, celular, instagram, email, servicios, comentario, fecha, hora, meet_link)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      nuevo.id,
      nuevo.creado_en,
      nuevo.nombre,
      nuevo.marca,
      nuevo.celular,
      nuevo.instagram,
      nuevo.email,
      JSON.stringify(nuevo.servicios || []),
      nuevo.comentario,
      nuevo.fecha,
      nuevo.hora,
      nuevo.meet_link,
    ]
  );
  return nuevo;
}

async function listarLeadsPostgres() {
  await asegurarTabla();
  const { rows } = await getPool().query('SELECT * FROM leads ORDER BY id DESC');
  return rows.map(filaALead);
}

// ---------- Interfaz pública (la usa server.js, sin saber cuál modo corre) ----------

async function guardarLead(lead) {
  return usarPostgres ? guardarLeadPostgres(lead) : guardarLeadArchivo(lead);
}

async function listarLeads() {
  return usarPostgres ? listarLeadsPostgres() : leerLeadsArchivo();
}

module.exports = { guardarLead, listarLeads, usandoPostgres: usarPostgres };
