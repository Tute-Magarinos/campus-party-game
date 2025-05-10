// server.js - Node.js + Socket.IO para Campus Party Game
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
<<<<<<< HEAD
const cors = require('cors');
const setupSocket = require('./socketHandlers');
=======
>>>>>>> Avances-Gonza
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Servir archivos estáticos de /public
app.use(express.static(path.join(__dirname, 'public')));

// Duraciones en ms
const QUESTION_DURATION   = 15000;
const ANSWER_DURATION     = 5000;
const TRANSITION_DURATION = 5000;

// Cargar preguntas desde JSON
const rawQuestions = require(path.join(__dirname, 'public', 'questions.json'));
const QUESTIONS_SRC = rawQuestions.map(q => ({
  question: q.question,
  options: [q.answer1, q.answer2, q.answer3, q.answer4]
}));

// Estado de salas
const rooms = {};

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Inicializa una sala con un conjunto de preguntas
function initRoom(salaId, count) {
  const chosen = shuffle([...QUESTIONS_SRC]).slice(0, count);
  rooms[salaId] = {
    players: {},
    votes: {},
    questions: chosen,
    current: 0,
    inProgress: true,
    timeouts: {}
  };
}

io.on('connection', socket => {
  console.log('Socket conectado:', socket.id);

  socket.on('joinSala', ({ salaId, tipo }) => {
    socket.join(salaId);
    console.log(`${tipo} se unió a ${salaId}`);
  });

  socket.on('registerPlayer', ({ salaId, name, email }) => {
    const room = rooms[salaId];
    if (room) room.players[socket.id] = { name, email };
  });

  socket.on('startGame', ({ salaId, questionCount }) => {
    const room = rooms[salaId];
    if (room && room.inProgress) return;
    initRoom(salaId, questionCount);
    nextTurn(salaId);
  });

  socket.on('resetGame', ({ salaId }) => {
    const room = rooms[salaId];
    if (room) {
      Object.values(room.timeouts).forEach(clearTimeout);
      delete rooms[salaId];
    }
    io.to(salaId).emit('resetClient');
  });

  socket.on('votar', ({ salaId, opcionElegida }) => {
    const room = rooms[salaId];
    if (room && room.inProgress) room.votes[socket.id] = opcionElegida;
  });
});

function nextTurn(salaId) {
  const room = rooms[salaId];
  if (!room || room.current >= room.questions.length) {
    io.to(salaId).emit('terminarJuego');
    if (room) room.inProgress = false;
    return;
  }
  const q = room.questions[room.current];
  room.votes = {};
  // Emitir pregunta y opciones sincronizadas
  io.to(salaId).emit('preguntaNueva', {
    preguntaIndex: room.current,
    preguntaText: q.question,
    options:       q.options
  });
  // Programar mostrar respuesta
  room.timeouts.answerTimeout = setTimeout(() => showAnswer(salaId), QUESTION_DURATION);
}

<<<<<<< HEAD
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
=======
function showAnswer(salaId) {
  const room = rooms[salaId];
  if (!room) return;
  const counts = room.questions[room.current].options.map(() => 0);
  Object.values(room.votes).forEach(idx => counts[idx]++);
  const winner = counts.indexOf(Math.max(...counts));
  io.to(salaId).emit('respuestaCorrecta', { correctIndex: winner });
  Object.keys(room.players).forEach(id => {
    const correct = room.votes[id] === winner;
    io.to(id).emit('resultadoJugador', { correct });
  });
  room.timeouts.transitionTimeout = setTimeout(() => {
    io.to(salaId).emit('siguientePregunta');
    room.current++;
    room.timeouts.nextTurnTimeout = setTimeout(() => nextTurn(salaId), TRANSITION_DURATION);
  }, ANSWER_DURATION);
}

server.listen(3000, () => console.log('Servidor escuchando en puerto 3000'));
>>>>>>> Avances-Gonza
