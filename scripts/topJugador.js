require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

function normalizar(texto) {
  if (!texto) return '';
  return texto
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, '');
}

// 🧠 Paso 1: Cargar y validar preguntas
const filePath = path.join(__dirname, '../public/questions.json');
let preguntasValidas = [];

try {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const todas = JSON.parse(raw);

  console.log('🔍 Validando preguntas...');
  let errores = 0;

  todas.forEach((q, i) => {
    const idx = q.correct;
    const respuesta = q[`answer${idx + 1}`];

    if (!q.question || idx < 0 || idx > 3 || !respuesta) {
      console.warn(`⚠️ Pregunta #${i + 1} inválida: "${q.question || '[sin texto]'}"`);
      errores++;
    } else {
      preguntasValidas.push(q);
    }
  });

  if (errores > 0) {
    console.log(`⚠️ ${errores} preguntas inválidas fueron ignoradas.`);
  } else {
    console.log('✅ Todas las preguntas son válidas.');
  }

} catch (err) {
  console.error('❌ Error leyendo questions.json:', err.message);
  process.exit(1);
}

// 🧠 Paso 2: Calcular TOP 3 jugadores con preguntas válidas
async function topJugadores() {
  const { data: respuestas, error } = await supabase
    .from('respuestas')
    .select('jugador_id, pregunta, opcion');

  if (error) {
    console.error('❌ Error al obtener respuestas:', error);
    return;
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

    if (!pregunta) {
      console.warn(`⚠️ Pregunta ignorada por no estar en preguntas válidas: "${r.pregunta}"`);
      continue;
    }

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

  console.log('\n🏆 TOP 3 jugadores con más respuestas correctas:\n');
  top.forEach(([correo, cantidad], i) => {
    console.log(`#${i + 1} - ${correo} (${cantidad} correctas)`);
  });
}

topJugadores();
