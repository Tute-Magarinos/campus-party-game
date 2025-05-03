function setupSocket(io) {
    const salas = {};
  
    io.on('connection', (socket) => {
      console.log('🟢 Conectado:', socket.id);
  
      socket.on('joinSala', ({ salaId, tipo, nombre, correo }) => {
        socket.join(salaId);
        socket.data.salaId = salaId;
        socket.data.tipo = tipo;
        socket.data.nombre = nombre || 'Anónimo';
        socket.data.correo = correo || '';
      
        console.log(`🔗 ${tipo} unido a sala ${salaId} - ${nombre || ''}`);
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
          salas[salaId] = {
            votos: {},
            preguntaId: pregunta.id,
            preguntaActual: {
              preguntaId: pregunta.id,
              texto: pregunta.texto,
              opcion1: pregunta.opcion1,
              opcion2: pregunta.opcion2,
              timer: tiempoPorRonda
            }
          };
  
          io.to(salaId).emit('preguntaNueva', {
            preguntaId: pregunta.id,
            texto: pregunta.texto,
            opcion1: pregunta.opcion1,
            opcion2: pregunta.opcion2,
            timer: tiempoPorRonda
          });
  
          setTimeout(() => {
            index++;
            enviarPregunta();
          }, tiempoPorRonda * 1000);
        }
  
        enviarPregunta();
      });
  
      socket.on('votar', ({ salaId, jugadorId, preguntaId, opcionElegida }) => {
        const sala = salas[salaId];
        if (!sala || sala.preguntaId !== preguntaId) return;
  
        const clave = `${jugadorId}_${preguntaId}`;
        if (sala.votos[clave]) return;
  
        sala.votos[clave] = opcionElegida;
  
        const conteo = { op1: 0, op2: 0 };
        Object.values(sala.votos).forEach(v => {
          if (v === 'op1') conteo.op1++;
          if (v === 'op2') conteo.op2++;
        });
  
        io.to(salaId).emit('actualizarVotos', { preguntaId, conteo });
      });
  
      socket.on('disconnect', () => {
        console.log(`🔴 Desconectado: ${socket.id}`);
      });
    });
  }
  
  module.exports = { setupSocket };
  