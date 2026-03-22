/**
 * roomManager.js — In-memory store for all active rooms.
 * Handles room creation, player joining/leaving, and admin transfer.
 */

import { v4 as uuidv4 } from 'uuid';
import { createRoomState, createPlayer } from './gameState';

// Map<roomCode, roomState>
const rooms = new Map();

/**
 * Generate a short unique room code (6 uppercase alphanumeric chars).
 * @returns {string}
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
 * Create a new room, add to the store, return the room state.
 * @param {string} adminSocketId
 * @param {string} adminName
 * @returns {object} room state
 */
function createRoom(adminSocketId, adminName) {
  const roomCode = generateRoomCode();
  const room = createRoomState(roomCode, adminSocketId, adminName);
  rooms.set(roomCode, room);
  return room;
}

/**
 * Join an existing room.
 * @param {string} roomCode
 * @param {string} socketId
 * @param {string} playerName
 * @returns {{ success: boolean, room?: object, error?: string }}
 */
function joinRoom(roomCode, socketId, playerName) {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) return { success: false, error: 'Room not found.' };
  if (room.phase !== 'lobby') return { success: false, error: 'Game already in progress.' };
  if (room.players.length >= room.settings.maxPlayers) return { success: false, error: 'Room is full.' };
  if (room.players.find(p => p.id === socketId)) return { success: false, error: 'Already in room.' };

  room.players.push(createPlayer(socketId, playerName, false));
  return { success: true, room };
}

/**
 * Remove a player from the room. Handles admin transfer.
 * @param {string} socketId
 * @returns {{ room: object|null, roomCode: string|null, wasAdmin: boolean }}
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
 * Get a room by code (case-insensitive).
 * @param {string} roomCode
 * @returns {object|undefined}
 */
function getRoom(roomCode) {
  return rooms.get(roomCode.toUpperCase());
}

/**
 * Get the room a socket is currently in.
 * @param {string} socketId
 * @returns {object|undefined}
 */
function getRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (room.players.find(p => p.id === socketId)) return room;
  }
  return undefined;
}

/**
 * Update room settings (admin only action, checked in handler).
 * @param {string} roomCode
 * @param {object} settings  { numDecks?, maxPlayers? }
 */
function updateSettings(roomCode, settings) {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room || room.phase !== 'lobby') return false;
  if (settings.numDecks !== undefined) room.settings.numDecks = Math.max(1, Math.min(4, settings.numDecks));
  if (settings.maxPlayers !== undefined) room.settings.maxPlayers = Math.max(2, Math.min(8, settings.maxPlayers));
  return true;
}

function rejoinRoom(roomCode, playerName, newSocketId) {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) return { success: false, error: 'Room not found.' };

  const player = room.players.find(p => p.name === playerName);
  if (!player) return { success: false, error: 'Player not found in this room.' };
  
  // Update socket ID and status
  player.id = newSocketId;
  player.connected = true;

  if (room.adminId === player.id) {
    player.isAdmin = true;
  }

  return { success: true, room };
}

export default { createRoom, joinRoom, leaveRoom, getRoom, getRoomBySocket, updateSettings, rejoinRoom };
