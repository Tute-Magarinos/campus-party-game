require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { setupSocket } = require('./socketHandlers');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Servir archivo HTML desde carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Ruta de prueba
app.get('/api', (req, res) => {
  res.send('Servidor backend funcionando');
});

setupSocket(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

const supabaseUrl = 'https://hubutcazejiyfdlkbbqu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YnV0Y2F6ZWppeWZkbGtiYnF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MDEzMDcsImV4cCI6MjA2MjQ3NzMwN30.jDC0dg9qvlDcdCYIRA4WslftXW6Ng8b7B9Rc4AZUaPQ';
const supabase = createClient(supabaseUrl, supabaseKey);