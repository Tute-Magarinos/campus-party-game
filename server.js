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

server.listen(3000, '0.0.0.0', () => {
  console.log('✅ Servidor activo en http://localhost:3000');
});