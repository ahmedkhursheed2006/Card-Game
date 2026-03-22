/**
 * server.js — Express + Socket.io entry point for Khoti.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { registerHandlers } = require('./socketHandlers');

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', game: 'Khoti' }));

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',   // In production, restrict to your frontend domain
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);
  registerHandlers(io, socket);
  socket.on('disconnect', () => console.log(`[-] Disconnected: ${socket.id}`));
});

httpServer.listen(PORT, () => {
  console.log(`✅  Khoti server running on http://localhost:${PORT}`);
});
