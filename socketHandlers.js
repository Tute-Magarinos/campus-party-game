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

      // Insertar sala si no existe
      await supabase.from('salas').upsert({ id: salaId });

      // Guardar jugador en Supabase con sala_id
      const { data, error } = await supabase
        .from('jugadores')
        .insert({ nombre: socket.data.nombre, correo: socket.data.correo, socket_id: socket.id, sala_id: salaId })
        .select()
        .single();

      if (error) {
        console.error('Error al registrar jugador:', error.message);
      } else {
        socket.data.jugadorId = data.id;
      }

      // Si hay pregunta activa, enviársela al jugador nuevo
      const sala = salas[salaId];
      if (sala && sala.preguntaActual) {
        socket.emit('preguntaNueva', sala.preguntaActual);
      }
    });

    socket.on('startJuego', ({ salaId, tiempoPorRonda, preguntas }) => {
      console.log(`🎮 Juego iniciado en ${salaId}`);

      let index = 0;

      function enviarPregunta() {
        if (index >= preguntas.length) {
          io.to(salaId).emit('terminarJuego', { mensaje: 'Fin del juego' });
          return;
        }

        const pregunta = preguntas[index];

        // Guardar formato consistente en la sala
        const preguntaFormateada = {
          preguntaId: pregunta.id,
          question: pregunta.question,
          answer1: pregunta.answer1,
          answer2: pregunta.answer2,
          answer3: pregunta.answer3,
          answer4: pregunta.answer4,
          timer: tiempoPorRonda
        };

        salas[salaId] = {
          votos: {},
          preguntaId: pregunta.id,
          preguntaActual: preguntaFormateada
        };

        // Enviar la pregunta a todos los jugadores
        io.to(salaId).emit('preguntaNueva', preguntaFormateada);

        setTimeout(() => {
          index++;
          enviarPregunta();
        }, tiempoPorRonda * 1000);
      }

      enviarPregunta();
    });

    socket.on('votar', async ({ salaId, jugadorId, preguntaId, opcionElegida }) => {
      const sala = salas[salaId];
      if (!sala || sala.preguntaId !== preguntaId) return;

      sala.votos[opcionElegida] = (sala.votos[opcionElegida] || 0) + 1;
      io.to(salaId).emit('votosActualizados', sala.votos);

      // Guardar respuesta en Supabase si el jugador está registrado
      if (socket.data.jugadorId) {
        const preguntaTexto = sala.preguntaActual.question;
        const { error } = await supabase.from('respuestas').insert({
          jugador_id: socket.data.jugadorId,
          pregunta: preguntaTexto,
          opcion: opcionElegida
        });
        if (error) {
          console.error('Error al guardar respuesta:', error.message);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('🔴 Desconectado:', socket.id);
    });
  });
}

module.exports = setupSocket;
