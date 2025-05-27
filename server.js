// server.js
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const app = express();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);


const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

// ✅ Importar y activar socketHandlers.js
const setupSocket = require('./socketHandlers');
setupSocket(io);

function normalizar(texto) {
  if (!texto) return '';
  return texto
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, '');
}

app.get('/cerrar-sala', async (req, res) => {
  const salaId = req.query.salaId;
  if (salaId) {
    console.log(`❌ Master cerró la sala ${salaId} via beacon`);
    io.to(salaId).emit("terminarJuego", {
      salaId,
      mensaje: "El juego ha finalizado porque el master cerró la sala."
    });
   
    await supabase.from("salas").update({ finalizada: true }).eq("id", salaId);
  }
  res.sendStatus(200);
});

app.get('/results', async (req, res) => {
  const filePath = path.join(__dirname, 'public/questions.json');
  let preguntasValidas = [];

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const todas = JSON.parse(raw);

    todas.forEach((q) => {
      const idx = q.correct;
      const respuesta = q[`answer${idx + 1}`];
      if (q.question && idx >= 0 && idx <= 3 && respuesta) {
        preguntasValidas.push(q);
      }
    });
  } catch (err) {
    return res.status(500).send('Error leyendo el archivo de preguntas.');
  }

  const { data: respuestas, error } = await supabase
    .from('respuestas')
    .select('jugador_id, pregunta, opcion');

  if (error) {
    return res.status(500).send('Error al obtener respuestas.');
  }

  const { data: jugadores } = await supabase
    .from('jugadores')
    .select('id, correo');

  const jugadorPorId = Object.fromEntries(jugadores.map(j => [j.id, j.correo]));
  const correctasPorCorreo = {};

  for (const r of respuestas) {
    const pregunta = preguntasValidas.find(q =>
      normalizar(q.question) === normalizar(r.pregunta)
    );

    if (!pregunta) continue;

    const correcta = pregunta[`answer${pregunta.correct + 1}`];
    const correo = jugadorPorId[r.jugador_id] || `jugador_id:${r.jugador_id}`;

    if (!correctasPorCorreo[correo]) correctasPorCorreo[correo] = 0;

    if (normalizar(r.opcion) === normalizar(correcta)) {
      correctasPorCorreo[correo]++;
    }
  }

  const top = Object.entries(correctasPorCorreo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  let html = `<h1>🏆 Top 3 Jugadores</h1><ol>`;
  top.forEach(([correo, cantidad]) => {
    html += `<li><strong>${correo}</strong> — ${cantidad} correctas</li>`;
  });
  html += `</ol>`;

  res.send(html);
});

server.listen(3000, '0.0.0.0', () => {
  console.log('✅ Servidor activo en http://localhost:3000');
  console.log('✅tabla de resultados en http://localhost:3000/results')
});