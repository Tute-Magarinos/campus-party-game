📘 INSTRUCCIONES PARA USAR NGROK EN EL JUEGO - CAMPUS PARTY GAME

🚀 OBJETIVO
Permitir que el juego sea accesible desde internet para pruebas, demos o conexión de múltiples jugadores y masters.

─────────────────────────────────────────────
✅ PASO 1: INSTALAR NGROK
─────────────────────────────────────────────

Si no lo tenés instalado:

▶︎ Opción 1: vía npm (Node.js)
  npm install -g ngrok

▶︎ Opción 2: descarga directa
  Ir a https://ngrok.com/download y descargar para tu sistema operativo.

─────────────────────────────────────────────
✅ PASO 2: CREAR UNA CUENTA GRATUITA EN NGROK
─────────────────────────────────────────────

1. Entrá en https://ngrok.com
2. Registrate con tu correo
3. Desde el panel, copiá tu authtoken personal

─────────────────────────────────────────────
✅ PASO 3: AUTENTICAR TU CUENTA EN TU PC
─────────────────────────────────────────────

Pegar este comando:

  ngrok config add-authtoken 2xeCEVWo0tLVLb6xuLUsGVpwCdJ_2EqBQpjPkj44jobubYaxW

─────────────────────────────────────────────
✅ PASO 4: MODIFICAR EL SERVIDOR PARA ESCUCHAR GLOBALMENTE
─────────────────────────────────────────────

En el archivo server.js asegurate que esté así:

  server.listen(3000, '0.0.0.0', () => {
    console.log('Servidor activo en puerto 3000');
  });

Esto permite que ngrok pueda acceder desde fuera.

─────────────────────────────────────────────
✅ PASO 5: INICIAR EL BACKEND
─────────────────────────────────────────────

Desde la terminal:

  node server.js

─────────────────────────────────────────────
✅ PASO 6: INICIAR EL TÚNEL CON NGROK
─────────────────────────────────────────────

Desde otra terminal:

  ngrok http 3000

Esto mostrará algo como:

  Forwarding https://abcd-1234.ngrok-free.app → http://localhost:3000

─────────────────────────────────────────────
✅ PASO 7: USAR LA URL EN EL JUEGO
─────────────────────────────────────────────

🔹 Para jugadores:
  https://abcd-1234.ngrok-free.app/mobile.html?salaId=sala1

🔹 Para el master:
  https://abcd-1234.ngrok-free.app/

🔹 Reemplazá "sala1" con el ID que estés usando.

💡 Podés generar códigos QR con esa URL para acceso rápido desde celulares.

─────────────────────────────────────────────
⚠️ IMPORTANTE
─────────────────────────────────────────────

- Cada vez que reiniciás ngrok, la URL CAMBIA.
- Siempre asegurate de usar la nueva URL para QR o compartir.
- Si querés una URL fija (ej: campusparty.ngrok.io), necesitás el plan pago de ngrok.

─────────────────────────────────────────────
👨‍💻 EJEMPLO COMPLETO
─────────────────────────────────────────────

1. Abrís dos terminales.
2. En la primera: node server.js
3. En la segunda: ngrok http 3000
4. Copiás la URL que te da ngrok y la pegás en el navegador.

─────────────────────────────────────────────
✔️ Listo para usar en Campus Party 🚀
─────────────────────────────────────────────

datos de cuenta kgrok:
correo: exp.campus.party@gmail.com
contraseña: @Experienciacampus2025

datos de supabase
correo: exp.campus.party@gmail.com
contraseña: @Experienciacampus2025

datos de correo:exp.campus.party@gmail.com
contraseña: Experienciacampus2025

