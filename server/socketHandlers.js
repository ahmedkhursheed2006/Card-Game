/**
 * socketHandlers.js — All Socket.io event handlers.
 * Wires socket events to room/game logic and broadcasts state updates.
 */

const { createRoom, joinRoom, leaveRoom, getRoom, getRoomBySocket, updateSettings } = require('./roomManager').default;
const { startGame, drawCard, placeCard } = require('./gameLogic').default;
const { getPlayerView } = require('./gameState').default;

/** 
 * Broadcast the current room state to every player in the room,
 * each receiving their own personalised view (own hand visible, others hidden).
 * @param {object} io  Socket.io server instance
 * @param {object} room
 */
function broadcastState(io, room) {
  for (const player of room.players) {
    const view = getPlayerView(room, player.id);
    io.to(player.id).emit('game_state', view);
  }
}

/**
 * Send an error back to a single socket.
 */
function sendError(socket, message) {
  socket.emit('error_msg', { message });
}

/**
 * Register all socket event handlers for a connected socket.
 * @param {object} io    Socket.io server
 * @param {object} socket  Individual connected socket
 */
function registerHandlers(io, socket) {
  // ── create_room ─────────────────────────────────────────────────
  // Payload: { playerName: string }
  socket.on('create_room', ({ playerName } = {}) => {
    if (!playerName || !playerName.trim()) {
      return sendError(socket, 'Player name is required.');
    }

    const room = createRoom(socket.id, playerName.trim());
    socket.join(room.roomCode);
    socket.emit('room_created', { roomCode: room.roomCode });
    broadcastState(io, room);
  });

  // ── join_room ────────────────────────────────────────────────────
  // Payload: { roomCode: string, playerName: string }
  socket.on('join_room', ({ roomCode, playerName } = {}) => {
    if (!roomCode || !playerName || !playerName.trim()) {
      return sendError(socket, 'Room code and player name are required.');
    }

    const result = joinRoom(roomCode, socket.id, playerName.trim());
    if (!result.success) return sendError(socket, result.error);

    socket.join(result.room.roomCode);
    socket.emit('room_joined', { roomCode: result.room.roomCode });
    broadcastState(io, result.room);
  });

  // ── rejoin_game ──────────────────────────────────────────────────
  socket.on('rejoin_game', ({ roomCode, playerName } = {}) => {
    if (!roomCode || !playerName) return sendError(socket, 'Room code and player name required.');
    
    const { rejoinRoom } = require('./roomManager').default;
    const result = rejoinRoom(roomCode, playerName, socket.id);
    if (!result.success) return sendError(socket, result.error);

    socket.join(result.room.roomCode);
    socket.emit('room_rejoined', { roomCode: result.room.roomCode });
    broadcastState(io, result.room);
  });

  // ── update_settings ──────────────────────────────────────────────
  // Payload: { roomCode: string, settings: { numDecks?, maxPlayers? } }
  socket.on('update_settings', ({ roomCode, settings } = {}) => {
    const room = getRoom(roomCode);
    if (!room) return sendError(socket, 'Room not found.');
    if (room.adminId !== socket.id) return sendError(socket, 'Only the admin can change settings.');

    updateSettings(roomCode, settings);
    broadcastState(io, room);
  });

  // ── start_game ───────────────────────────────────────────────────
  // Payload: { roomCode: string }
  socket.on('start_game', ({ roomCode } = {}) => {
    const room = getRoom(roomCode);
    if (!room) return sendError(socket, 'Room not found.');
    if (room.adminId !== socket.id) return sendError(socket, 'Only the admin can start the game.');
    if (room.players.length < 2) return sendError(socket, 'Need at least 2 players to start.');
    if (room.phase !== 'lobby') return sendError(socket, 'Game already started.');

    startGame(room);
    broadcastState(io, room);
  });

  // ── draw_card ────────────────────────────────────────────────────
  socket.on('draw_card', ({ roomCode } = {}) => {
    const room = getRoom(roomCode);
    if (!room) return sendError(socket, 'Room not found.');
    if (room.phase !== 'playing') return sendError(socket, 'Game is not in progress.');

    const result = drawCard(room, socket.id);
    if (!result.success) return sendError(socket, result.error);

    // Tell everyone a card was drawn (all see it flying from deck to hand)
    io.to(roomCode).emit('card_drawn_flow', {
      playerId: socket.id,
      card: result.drawnCard, // Will be null in state views for others, but this event gives the rank for the animation if needed (or hides it)
    });

    broadcastState(io, room);
  });

  socket.on('place_card', ({ roomCode, card } = {}) => {
    const room = getRoom(roomCode);
    if (!room) return sendError(socket, 'Room not found.');
    if (room.phase !== 'playing') return sendError(socket, 'Game is not in progress.');

    const result = placeCard(room, socket.id, card);
    if (!result.success) return sendError(socket, result.error);

    if (result.captured) {
      io.to(roomCode).emit('card_captured', {
        playerId: socket.id,
        playedCard: card,
        captured: result.capturedCards,
        captureDetail: result.captureDetail,
        chained: result.chained
      });
    } else {
      io.to(roomCode).emit('card_placed_flow', { 
        playerId: socket.id, 
        card 
      });
    }
    
    broadcastState(io, room);
  });

  // ── disconnect ───────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const { room, roomCode, offline } = leaveRoom(socket.id);
    if (room && roomCode) {
      if (offline) {
        io.to(roomCode).emit('player_offline', { socketId: socket.id });
      } else {
        io.to(roomCode).emit('player_left', { socketId: socket.id });
      }
      broadcastState(io, room);
    }
  });

  // ── ping ─────────────────────────────────────────────────────────
  socket.on('ping_server', () => socket.emit('pong_server'));
}

module.exports = { registerHandlers };
