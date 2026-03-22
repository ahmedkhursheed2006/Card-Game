/**
 * roomManager.js — In-memory store for all active rooms.
 * Handles room creation, player joining/leaving, and admin transfer.
 */

import { v4 as uuidv4 } from 'uuid';
import { createRoomState, createPlayer } from './gameState.js';

// Map<roomCode, roomState>
const rooms = new Map();

/**
 * Generates a collision-free, short-code identifier for a new room.
 * Uses a customized base-32 alphabet to avoid ambiguous characters (like 0/O, 1/I).
 * Automatically verifies against the active `rooms` map before returning.
 * 
 * @returns {string} A guaranteed unique 6-character uppercase alphanumeric code.
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

/**
 * Instantiates the actual room session in memory and pairs it with its creator.
 * The creator is assigned admin rights initially.
 * 
 * @param {string} adminSocketId - The active socket.id of the player initiating the room.
 * @param {string} adminName - The display name bound to that player.
 * @returns {object} The fully populated initial room state object.
 */
function createRoom(adminSocketId, adminName) {
  const roomCode = generateRoomCode();
  const room = createRoomState(roomCode, adminSocketId, adminName);
  rooms.set(roomCode, room);
  return room;
}

/**
 * Processes a player's request to join an existing game lobby.
 * Enforces room capacity limits, phase restrictions (lobby only), and prevents duplicate joins.
 * 
 * @param {string} roomCode - The 6-character invite code.
 * @param {string} socketId - The joining player's socket.id.
 * @param {string} playerName - The joining player's chosen name.
 * @returns {{ success: boolean, room?: object, error?: string }} Join report. If successful, attaches the live room object.
 */
function joinRoom(roomCode, socketId, playerName) {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) return { success: false, error: 'Room not found.' };

  const existingPlayer = room.players.find(p => p.name === playerName);

  if (room.phase !== 'lobby') {
    if (existingPlayer && !existingPlayer.connected) {
      return rejoinRoom(roomCode, playerName, socketId);
    }
    return { success: false, error: 'Game already in progress.' };
  }

  if (room.players.length >= room.settings.maxPlayers) return { success: false, error: 'Room is full.' };
  
  if (existingPlayer) {
    if (!existingPlayer.connected) {
      return rejoinRoom(roomCode, playerName, socketId);
    }
    return { success: false, error: 'Name already taken in this room.' };
  }

  if (room.players.find(p => p.id === socketId)) return { success: false, error: 'Already in room.' };

  room.players.push(createPlayer(socketId, playerName, false));
  return { success: true, room };
}

/**
 * Handles graceful or unexpected player disconnections across *all* active rooms.
 * 
 * Logic details:
 * 1. Scans all memory for a matching socketId.
 * 2. If the game is strictly 'playing', it does NOT delete the player. It merely marks them 'connected = false' (offline status).
 * 3. If the game is in the 'lobby' or 'ended' phase, the player is fully purged from the array.
 * 4. If purging results in 0 total players, the room is permanently destroyed.
 * 5. If purging removes the previous Admin, the lowest-index remaining player inherits Admin status.
 * 
 * @param {string} socketId - The socket.id that just disconnected.
 * @returns {{ room: object|null, roomCode: string|null, wasAdmin: boolean, offline?: boolean }} Disconnect action report.
 */
function leaveRoom(socketId) {
  for (const [roomCode, room] of rooms.entries()) {
    const playerIndex = room.players.findIndex(p => p.id === socketId);
    if (playerIndex === -1) continue;

    const wasAdmin = room.adminId === socketId;
    
    if (room.phase === 'playing') {
      // Don't remove, just mark offline
      const p = room.players[playerIndex];
      p.connected = false;
      return { room, roomCode, wasAdmin, offline: true };
    }

    room.players.splice(playerIndex, 1);
    
    if (room.players.length === 0) {
      rooms.delete(roomCode);
      return { room: null, roomCode, wasAdmin };
    }

    if (wasAdmin) {
      room.adminId = room.players[0].id;
      room.players[0].isAdmin = true;
    }

    return { room, roomCode, wasAdmin };
  }
  return { room: null, roomCode: null, wasAdmin: false };
}

/**
 * Retrieves the live room object bound to a specific code.
 * Input is normalized (made strictly uppercase) for robust matching.
 * 
 * @param {string} roomCode - Unsanitized input from a user join or socket header.
 * @returns {object|undefined} The room state object, or undefined if dead/nonexistent.
 */
function getRoom(roomCode) {
  return rooms.get(roomCode.toUpperCase());
}

/**
 * Exhaustive search to find a room based entirely on a socket.id that resides inside it.
 * Used when a generic payload arrives and we need to derive context merely from the connection.
 * 
 * @param {string} socketId - The target player's socket identifier.
 * @returns {object|undefined} The hosting room state object, or undefined.
 */
function getRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (room.players.find(p => p.id === socketId)) return room;
  }
  return undefined;
}

/**
 * Modifies core room settings prior to launch.
 * Applies clamping to inputs: Decks bounded (1 to 4), Players bounded (2 to 8).
 * 
 * @param {string} roomCode - Target room.
 * @param {object} settings - Partial object describing intended changes { numDecks?, maxPlayers? }.
 * @returns {boolean} True if successfully modified, False if room was invalid or locked out of 'lobby' phase.
 */
function updateSettings(roomCode, settings) {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room || room.phase !== 'lobby') return false;
  if (settings.numDecks !== undefined) room.settings.numDecks = Math.max(1, Math.min(4, settings.numDecks));
  if (settings.maxPlayers !== undefined) room.settings.maxPlayers = Math.max(2, Math.min(10, settings.maxPlayers));
  return true;
}

/**
 * Allows a previously disconnected player to securely reclaim their exact state.
 * 
 * Logic details:
 * 1. Matches targeted room and specific player 'name'.
 * 2. Overwrites the defunct, stale socket ID with the fresh reconnnecting socket ID.
 * 3. Toggles 'connected = true' status to eliminate 'Offline' badges in the UI.
 * 4. Ensures permissions (like Admin status) reflect properly onto the new socket connection.
 * 
 * @param {string} roomCode - The target room code to force re-entry into.
 * @param {string} playerName - The exact display name of the lost player slot.
 * @param {string} newSocketId - The renewed active connection socket.
 * @returns {{ success: boolean, room?: object, error?: string }} Result report for the socket handler.
 */
function rejoinRoom(roomCode, playerName, newSocketId) {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) return { success: false, error: 'Room not found.' };

  const player = room.players.find(p => p.name === playerName);
  if (!player) return { success: false, error: 'Player not found in this room.' };
  
  const oldId = player.id;

  // Update socket ID and status
  player.id = newSocketId;
  player.connected = true;

  if (room.adminId === oldId) {
    room.adminId = newSocketId;
    player.isAdmin = true;
  }

  return { success: true, room };
}

export { createRoom, joinRoom, leaveRoom, getRoom, getRoomBySocket, updateSettings, rejoinRoom };
