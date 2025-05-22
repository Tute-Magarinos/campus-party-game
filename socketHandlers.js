require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function setupSocket(io) {
  const salas = {};

  io.on('connection', (socket) => {
    console.log('🟢 Conectado:', socket.id);

    socket.on('joinSala', async ({ salaId, tipo, nombre, correo }) => {
      socket.join(salaId);
      socket.data.salaId = salaId;
      socket.data.tipo = tipo;
      socket.data.nombre = nombre || 'Anónimo';
      socket.data.correo = correo || '';

      console.log(`🔗 ${tipo} unido a sala ${salaId} - ${nombre || ''}`);

      await supabase.from('salas').upsert({ id: salaId });

      if (tipo === 'jugador') {
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

        if (error) {
          console.error('❌ Error al registrar jugador:', error.message);
        } else {
          socket.data.jugadorId = data.id;
          console.log('✅ Jugador insertado correctamente:', data);
        }
      }

      const sala = salas[salaId];
      if (sala && sala.preguntaActual) {
        socket.emit('preguntaNueva', sala.preguntaActual);
      }
    });

    socket.on('startGame', ({ salaId, questionCount }) => {
      console.log(`🎮 Juego iniciado en ${salaId}`);

      const rawQuestions = require('./public/questions.json');
      const shuffled = [...rawQuestions].sort(() => 0.5 - Math.random());
      const preguntas = shuffled.slice(0, questionCount);

      let index = 0;

      function enviarPregunta() {
        if (index >= preguntas.length) {
          io.to(salaId).emit('terminarJuego', { mensaje: 'Fin del juego' });
          return;
        }

        const pregunta = preguntas[index];

        const preguntaFormateada = {
          preguntaId: pregunta.id || index,
          question: pregunta.question,
          preguntaIndex: index,
          preguntaText: pregunta.question,
          options: [
            pregunta.answer1,
            pregunta.answer2,
            pregunta.answer3,
            pregunta.answer4
          ],
          timer: 15000
        };

        salas[salaId] = {
          votos: {},
          preguntaId: preguntaFormateada.preguntaId,
          preguntaActual: preguntaFormateada,
          preguntas,
          currentIndex: index,
          inProgress: true
        };

        io.to(salaId).emit('preguntaNueva', preguntaFormateada);

        setTimeout(async () => {
          const pregunta = preguntas[index];
          const correctIndex = pregunta.correct;
          const sala = salas[salaId];

          io.to(salaId).emit('respuestaCorrecta', { correctIndex });

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

            console.log(`🧪 ${sock.data?.nombre || sock.id} eligió índice ${respuestaJugador}, correcta era ${correctIndex}`);

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
            index++;
            enviarPregunta();
          }, 4000);
        }, 15000);
      }

      enviarPregunta();
    });

    socket.on('votar', async ({ salaId, preguntaId, opcionElegida, opcionIndex }) => {
      const sala = salas[salaId];
      if (!sala || !sala.inProgress || sala.preguntaId !== preguntaId) return;

      sala.votos[socket.id] = opcionIndex;
      socket.data.ultimaRespuesta = { preguntaId, opcionIndex };

      console.log(`📨 voto de ${socket.data?.nombre || socket.id}: opción ${opcionIndex} en sala ${salaId}`);

      io.to(salaId).emit('votosActualizados', sala.votos);

      if (socket.data.jugadorId) {
        const preguntaTexto = sala.preguntaActual.question;

        const { error } = await supabase.from('respuestas').insert({
          jugador_id: socket.data.jugadorId,
          pregunta: preguntaTexto,
          opcion: opcionElegida
        });

        if (error) {
          console.error('❌ Error al guardar respuesta:', error.message);
        } else {
          console.log("✅ Respuesta guardada correctamente");
        }
      }
    });

    socket.on('resetGame', ({ salaId }) => {
      if (salas[salaId]) {
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
