/**
 * server.js — Express + Socket.io entry point for Khoti.
 */

import 'dotenv/config';
import express, { json } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { registerHandlers } from './socketHandlers.js';

const PORT = process.env.PORT;

const app = express();
app.use(cors());
app.use(json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', game: 'Khoti' }));

const httpServer = createServer(app);

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

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`✅  Khoti server running on http://localhost:${PORT}`);
});
