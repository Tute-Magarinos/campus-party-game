require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function setupSocket(io) {
  const salas = {};
  const timeoutsPorSala = {};

  function crearTimeoutParaSala(salaId, pregunta, duration) {
    return setTimeout(async () => {
      const sala = salas[salaId];
      if (!sala) return;

      const correctIndex = typeof pregunta.correct === 'number' ? pregunta.correct : 0;

      io.to(salaId).emit('respuestaCorrecta', { correctIndex, salaId });

      const socketsEnSala = await io.in(salaId).fetchSockets();

      for (const sock of socketsEnSala) {
        let respuestaJugador = sala.votos[sock.id];
        const backup = sock.data?.ultimaRespuesta;

        if (
          respuestaJugador === undefined &&
          backup &&
          backup.preguntaId === pregunta.preguntaId
        ) {
          respuestaJugador = backup.opcionIndex;
        }

        const respondio = typeof respuestaJugador === "number";
        const esCorrecta = respondio && respuestaJugador === correctIndex;

        sock.emit("resultadoJugador", { correct: esCorrecta });

        if (!respondio && sock.data?.jugadorId) {
          await supabase.from("respuestas").insert({
            jugador_id: sock.data.jugadorId,
            pregunta: pregunta.question,
            opcion: "[No respondió]"
          });
        }
      }

      setTimeout(() => {
        salas[salaId].currentIndex++;
        enviarPregunta(salaId, duration);
      }, 4000);
    }, duration);
  }

  async function enviarPregunta(salaId, duration) {
    const sala = salas[salaId];
    if (!sala || sala.currentIndex >= sala.preguntas.length) {
      io.to(salaId).emit('terminarJuego', { mensaje: 'Fin del juego', salaId });
      sala.inProgress = false;
      return;
    }

    const pregunta = sala.preguntas[sala.currentIndex];

    const preguntaFormateada = {
      preguntaId: pregunta.id || sala.currentIndex,
      question: pregunta.question,
      preguntaIndex: sala.currentIndex,
      preguntaText: pregunta.question,
      options: [
        pregunta.answer1,
        pregunta.answer2,
        pregunta.answer3,
        pregunta.answer4
      ],
      timer: duration
    };

    sala.votos = {};
    sala.preguntaId = preguntaFormateada.preguntaId;
    sala.preguntaActual = preguntaFormateada;

    console.log(`📤 Enviando pregunta ${sala.currentIndex} a sala ${salaId}`);
    io.to(salaId).emit('preguntaNueva', { ...preguntaFormateada, salaId });

    if (timeoutsPorSala[salaId]) clearTimeout(timeoutsPorSala[salaId]);
    timeoutsPorSala[salaId] = crearTimeoutParaSala(salaId, pregunta, duration);
  }

  io.on('connection', (socket) => {
    console.log('🟢 Conectado:', socket.id);

    socket.on('joinSala', async ({ salaId, tipo, nombre, correo }) => {
      socket.join(salaId);
      socket.data.salaId = salaId;
      socket.data.tipo = tipo;
      socket.data.nombre = nombre || 'Anónimo';
      socket.data.correo = correo || '';

      console.log(`🔗 ${tipo} unido a sala ${salaId} - ${nombre || ''}`);

      if (tipo === 'master') {
        await supabase.from('salas').upsert({ id: salaId, finalizada: false });
      }

      if (tipo === 'jugador') {
        let { data: salasDB, error } = await supabase.from('salas').select('*');
        if (salasDB.find(sala => sala.id === salaId)?.finalizada === false) {
          const { data, error } = await supabase
            .from('jugadores')
            .insert({
              nombre: socket.data.nombre,
              correo: socket.data.correo,
              socket_id: socket.id,
              sala_id: salaId
            })
            .select()
            .single();

          if (!error) {
            socket.data.jugadorId = data.id;
          }
        } else {
          socket.emit('salaNotFound');
        }
      }

      const sala = salas[salaId];
      if (sala && sala.preguntaActual) {
        socket.emit('preguntaNueva', sala.preguntaActual);
      }
    });
    socket.on("cerrarSala", async ({ salaId }) => {
  console.log(`❌ Master cerró la sala ${salaId}`);

  io.to(salaId).emit("terminarJuego", {
    salaId,
    mensaje: "El juego ha finalizado porque el master cerró la sala."
  });

  // ✅ Eliminar sala de memoria
  delete salas[salaId];

  // ✅ Marcar como finalizada en base de datos si estás usando Supabase
  await supabase.from("salas").update({ finalizada: true }).eq("id", salaId);
  await supabase.from("respuestas").delete().eq("sala_id", salaId);
});

    socket.on('startGame', ({ salaId, questionCount, duration }) => {
      if (socket.data?.tipo !== 'master') {
        console.warn(`⛔ ${socket.id} intentó iniciar sin ser master`);
        return;
      }

      if (salas[salaId]?.inProgress) {
        socket.emit('error', 'Juego ya en curso en esta sala');
        return;
      }

      const rawQuestions = JSON.parse(JSON.stringify(require('./public/questions.json')));
      const shuffled = rawQuestions.sort(() => 0.5 - Math.random());
      const preguntas = shuffled.slice(0, questionCount);

      salas[salaId] = {
        votos: {},
        preguntaId: null,
        preguntaActual: null,
        preguntas,
        currentIndex: 0,
        inProgress: true
      };

      console.log(`🎮 Iniciando juego en sala ${salaId} por ${socket.id}`);
      enviarPregunta(salaId, duration);
    });

    socket.on('votar', async ({ salaId, preguntaId, opcionElegida, opcionIndex }) => {
      const sala = salas[salaId];
      if (!sala || !sala.inProgress || sala.preguntaId !== preguntaId) return;

      sala.votos[socket.id] = opcionIndex;
      socket.data.ultimaRespuesta = { preguntaId, opcionIndex };

      io.to(salaId).emit('votosActualizados', sala.votos);

      if (socket.data.jugadorId) {
        const preguntaTexto = sala.preguntaActual.question;
        await supabase.from('respuestas').insert({
          jugador_id: socket.data.jugadorId,
          pregunta: preguntaTexto,
          opcion: opcionElegida
        });
      }
    });

    socket.on('resetGame', async ({ salaId }) => {
      if (salas[salaId]) {
        await supabase
          .from('salas')
          .update({ finalizada: true })
          .eq('id', salaId);

        if (timeoutsPorSala[salaId]) {
          clearTimeout(timeoutsPorSala[salaId]);
          delete timeoutsPorSala[salaId];
        }

        delete salas[salaId];
        io.to(salaId).emit('resetClient');
        console.log(`🔁 Juego reiniciado en sala ${salaId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔴 Desconectado:', socket.id);
    });
  });
}

module.exports = setupSocket;
