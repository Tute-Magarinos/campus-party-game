// server.js
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

// ✅ Importar y activar socketHandlers.js
const setupSocket = require('./socketHandlers');
setupSocket(io);

app.get('/cerrar-sala', async (req, res) => {
  const salaId = req.query.salaId;
  if (salaId) {
    console.log(`❌ Master cerró la sala ${salaId} via beacon`);
    io.to(salaId).emit("terminarJuego", {
      salaId,
      mensaje: "El juego ha finalizado porque el master cerró la sala."
    });
    delete salas[salaId];
    await supabase.from("salas").update({ finalizada: true }).eq("id", salaId);
  }
  res.sendStatus(200);
});

server.listen(3000, '0.0.0.0', () => {
  console.log('✅ Servidor activo en http://localhost:3000');
});