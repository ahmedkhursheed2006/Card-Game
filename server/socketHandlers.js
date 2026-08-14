/**
 * socketHandlers.js — All Socket.io event handlers.
 * Wires socket events to room/game logic and broadcasts state updates.
 */

import { createRoom, joinRoom, leaveRoom, getRoom, getRoomBySocket, updateSettings, rejoinRoom, addBot, removeBot } from './roomManager.js';
import { startGame, drawCard, placeCard, advanceTurn } from './gameLogic.js';
import { getPlayerView, resetToLobby } from './gameState.js';
import { scheduleBotTurn, calculateDealingDelay } from './botLogic.js';

/** 
 * Broadcasts the current room state securely to every connected player in that room.
 * To prevent cheating, each player receives a "sanitized" view where opponents' hands are hidden.
 * 
 * @param {object} io - The global Socket.io server instance.
 * @param {object} room - The canonical room state object to broadcast.
 */
function broadcastState(io, room) {
  for (const player of room.players) {
    const view = getPlayerView(room, player.id);
    io.to(player.id).emit('game_state', view);
  }
}

/**
 * Checks if current turn belongs to a bot and schedules turn execution.
 * If isStartGame is true, delays turn execution until client card dealing animation finishes.
 */
function checkAndTriggerBotTurn(io, room, isStartGame = false) {
  if (room && room.phase === 'playing') {
    const currentPlayer = room.players[room.turnIndex];
    if (currentPlayer && currentPlayer.isBot) {
      const delay = isStartGame ? calculateDealingDelay(room) : 1100;
      scheduleBotTurn(io, room.roomCode, delay);
    }
  }
}

/**
 * Utility: Sends a standardized error message back to the requesting client.
 * Triggers the 'error_msg' listener on the frontend (usually resulting in an alert).
 * 
 * @param {object} socket - The specific socket connection that triggered the error.
 * @param {string} message - The human-readable error description.
 */
function sendError(socket, message) {
  socket.emit('error_msg', { message });
}

/**
 * Primary setup function. Wires all available game events to a newly connected socket.
 * Acts as the bridge between network requests and the internal game/room logic.
 * 
 * @param {object} io - The global Socket.io server instance (used for broadcasting).
 * @param {object} socket - The individual player's active socket connection.
 */
function registerHandlers(io, socket) {
  // ── create_room ─────────────────────────────────────────────────
  /**
   * Event: create_room
   * Payload: { playerName: string }
   * Logic: Validates name, creates a new room, makes the player the Admin, and joins the socket to the room channel.
   */
  socket.on('create_room', ({ playerName } = {}) => {
    if (!playerName || !playerName.trim()) {
      return sendError(socket, 'Player name is required.');
    }

    const room = createRoom(socket.id, playerName.trim());
    socket.join(room.roomCode);
    socket.emit('room_created', { roomCode: room.roomCode });
    broadcastState(io, room);
  });

  // ── create_single_player ──────────────────────────────────────────
  /**
   * Event: create_single_player
   * Payload: { playerName: string }
   * Logic: Creates a new room and automatically adds 3 AI bots to launch a single-player game lobby.
   */
  socket.on('create_single_player', ({ playerName } = {}) => {
    if (!playerName || !playerName.trim()) {
      return sendError(socket, 'Player name is required.');
    }

    const room = createRoom(socket.id, playerName.trim());
    addBot(room.roomCode);
    addBot(room.roomCode);
    addBot(room.roomCode);

    socket.join(room.roomCode);
    socket.emit('room_created', { roomCode: room.roomCode });
    broadcastState(io, room);
  });

  // ── add_bot ──────────────────────────────────────────────────────
  /**
   * Event: add_bot
   * Payload: { roomCode: string }
   * Logic: Admin-only. Adds an AI bot to the room lobby.
   */
  socket.on('add_bot', ({ roomCode } = {}) => {
    const room = getRoom(roomCode);
    if (!room) return sendError(socket, 'Room not found.');
    if (room.adminId !== socket.id) return sendError(socket, 'Only the admin can add bots.');

    const result = addBot(roomCode);
    if (!result.success) return sendError(socket, result.error);

    broadcastState(io, result.room);
  });

  // ── remove_bot ───────────────────────────────────────────────────
  /**
   * Event: remove_bot
   * Payload: { roomCode: string, botId: string }
   * Logic: Admin-only. Removes an AI bot from the room lobby.
   */
  socket.on('remove_bot', ({ roomCode, botId } = {}) => {
    const room = getRoom(roomCode);
    if (!room) return sendError(socket, 'Room not found.');
    if (room.adminId !== socket.id) return sendError(socket, 'Only the admin can remove bots.');

    const result = removeBot(roomCode, botId);
    if (!result.success) return sendError(socket, result.error);

    broadcastState(io, result.room);
  });

  // ── join_room ────────────────────────────────────────────────────
  /**
   * Event: join_room
   * Payload: { roomCode: string, playerName: string }
   * Logic: Validates inputs, attempts to join the room via roomManager, and synchronizes state if successful.
   */
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
    
    // rejoinRoom imported at top
    const result = rejoinRoom(roomCode, playerName, socket.id);
    if (!result.success) return sendError(socket, result.error);

    socket.join(result.room.roomCode);
    socket.emit('room_rejoined', { roomCode: result.room.roomCode });
    broadcastState(io, result.room);
  });

  // ── update_settings ──────────────────────────────────────────────
  /**
   * Event: update_settings
   * Payload: { roomCode: string, settings: { numDecks?, maxPlayers? } }
   * Logic: Restricts changes to the Admin only. Updates internal configs and broadcasts the new state to all lobby members.
   */
  socket.on('update_settings', ({ roomCode, settings } = {}) => {
    const room = getRoom(roomCode);
    if (!room) return sendError(socket, 'Room not found.');
    if (room.adminId !== socket.id) return sendError(socket, 'Only the admin can change settings.');

    updateSettings(roomCode, settings);
    broadcastState(io, room);
  });

  // ── start_game ───────────────────────────────────────────────────
  /**
   * Event: start_game
   * Payload: { roomCode: string }
   * Logic: Validates Admin authority, minimum player count (2), and phase. Triggers the core game setup.
   */
  socket.on('start_game', ({ roomCode } = {}) => {
    const room = getRoom(roomCode);
    if (!room) return sendError(socket, 'Room not found.');
    if (room.adminId !== socket.id) return sendError(socket, 'Only the admin can start the game.');
    if (room.players.length < 2) return sendError(socket, 'Need at least 2 players to start.');
    if (room.phase !== 'lobby') return sendError(socket, 'Game already started.');

    startGame(room);
    broadcastState(io, room);
    checkAndTriggerBotTurn(io, room, true);
  });

  // ── restart_game ─────────────────────────────────────────────────
  /**
   * Event: restart_game
   * Payload: { roomCode: string }
   * Logic: Admin-only. Resets the ended room back to lobby phase.
   * All players remain (same seats, same admin). Each player's client
   * will be routed back to the Lobby automatically via the broadcastState
   * update changing phase from 'ended' → 'lobby'.
   */
  socket.on('restart_game', ({ roomCode } = {}) => {
    const room = getRoom(roomCode);
    if (!room) return sendError(socket, 'Room not found.');
    if (room.adminId !== socket.id) return sendError(socket, 'Only the admin can restart the game.');
    if (room.phase !== 'ended') return sendError(socket, 'Game has not ended yet.');

    resetToLobby(room);
    broadcastState(io, room);
  });

  // ── draw_card ────────────────────────────────────────────────────
  /**
   * Event: draw_card
   * Payload: { roomCode: string }
   * Logic: Routes request to core game logic. If successful, emits 'card_drawn_flow' *specifically* 
   * to trigger frontend animations, then broadcasts the updated game state.
   */
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
    checkAndTriggerBotTurn(io, room);
  });

  // ── place_card ───────────────────────────────────────────────────
  /**
   * Event: place_card
   * Payload: { roomCode: string, card: string }
   * Logic: Routes card play to core logic. This is the most complex action, potentially triggering 
   * massive state changes (stealing, matching, chains).
   * Emits respective animation flags ('card_captured' or 'card_placed_flow') based on the result.
   */
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
    checkAndTriggerBotTurn(io, room);
  });

  // ── play_board_sound ────────────────────────────────────────────
  /**
   * Event: play_board_sound
   * Payload: { roomCode: string, soundPath: string, soundLabel: string }
   * Logic: Broadcasts the sound to all OTHER players in the room.
   * The sender already plays the sound locally, so we use socket.to()
   * instead of io.to() to avoid double-playing.
   */
  socket.on('play_board_sound', ({ roomCode, soundPath, soundLabel } = {}) => {
    const room = getRoom(roomCode);
    if (!room) return;
    // Broadcast to everyone else in the room (sender already played locally)
    socket.to(roomCode).emit('board_sound_played', {
      soundPath,
      soundLabel,
      playerId: socket.id,
    });
  });

  // ── disconnect ───────────────────────────────────────────────────
  /**
   * Event: disconnect (Built-in standard Socket.io event)
   * Payload: None
   * Logic: Handles sudden drops or tab closures. Uses 'leaveRoom' to determine if the player
   * should be permanently purged (lobby/ended) or just marked 'offline' (during an active game).
   */
  socket.on('disconnect', () => {
    const { room, roomCode, offline } = leaveRoom(socket.id);
    if (room && roomCode) {
      if (offline) {
        io.to(roomCode).emit('player_offline', { socketId: socket.id });
        
        // Skip their turn immediately if it was their turn when they disconnected
        const currentPlayer = room.players[room.turnIndex];
        if (currentPlayer && currentPlayer.id === socket.id) {
          // advanceTurn imported at top
          advanceTurn(room);
          checkAndTriggerBotTurn(io, room);
        }
      } else {
        io.to(roomCode).emit('player_left', { socketId: socket.id });
      }
      broadcastState(io, room);
    }
  });

  // ── ping ─────────────────────────────────────────────────────────
  socket.on('ping_server', () => socket.emit('pong_server'));
}

export { registerHandlers };

