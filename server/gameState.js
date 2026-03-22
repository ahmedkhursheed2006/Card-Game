/**
 * gameState.js — Factory function for creating the canonical room state object.
 * This is the single source of truth broadcast to all clients.
 */

import { buildDeck, shuffle, getRank, totalScore, copiesPerRank } from './deck.js';

/**
 * Factory function to create a pristine, new room state.
 * Defines the entire schema for the room, including settings, players, and game phase.
 * 
 * @param {string} roomCode - The unique 6-character identifier for this room.
 * @param {string} adminSocketId - The socket ID of the room creator.
 * @param {string} adminName - The chosen display name of the room creator.
 * @returns {object} A fully initialized room state object.
 */
function createRoomState(roomCode, adminSocketId, adminName) {
  return {
    roomCode,
    adminId: adminSocketId,
    phase: 'lobby',         // 'lobby' | 'playing' | 'ended'
    settings: {
      numDecks: 1,
      maxPlayers: 4,
    },
    players: [
      createPlayer(adminSocketId, adminName, true),
    ],
    drawDeck: [],
    centerTable: [],
    turnIndex: 0,
    turnPhase: 'draw',      // 'draw' | 'place'
    lastDrawnCard: null,
    captureLog: [],         // [{ playerId, playerName, captured: [], timestamp }]
    winner: null,
    loser: null,
  };
}

/**
 * Factory function to create a new player entity.
 * Represents a single user playing in a specific room.
 * 
 * @param {string} socketId - The active socket connection ID for the player.
 * @param {string} name - The display name of the player.
 * @param {boolean} [isAdmin=false] - Whether this player has admin privileges (start game, change settings).
 * @returns {object} A default player object schema.
 */
function createPlayer(socketId, name, isAdmin = false) {
  return {
    id: socketId,
    name,
    isAdmin,
    hand: [],
    scoreStack: [],
    lockedRanks: [],   // ranks that are permanently locked
    score: 0,
    connected: true,
  };
}

/**
 * Transforms a room from 'lobby' state into an active 'playing' state.
 * Logic details:
 * 1. Generates and shuffles a standard 52-card deck (multiplied by settings.numDecks).
 * 2. Deals exactly 4 cards face-up to the center table.
 * 3. Deals exactly 4 cards to every connected player's hand.
 * 4. Resets all scores, stacks, logs, and turn indices.
 * 
 * @param {object} room - The room state object to be mutated into a playing state.
 */
function initGameState(room) {
  const { numDecks } = room.settings;
  const deck = shuffle(buildDeck(numDecks));

  // Deal 4 cards face-up to the center table
  room.centerTable = deck.splice(0, 4);

  // Deal 4 cards to each player
  for (const player of room.players) {
    player.hand = deck.splice(0, 4);
    player.scoreStack = [];
    player.lockedRanks = [];
    player.score = 0;
  }

  // Shuffle and set draw deck
  room.drawDeck = deck;
  room.phase = 'playing';
  room.turnIndex = 0;
  room.turnPhase = 'draw';
  room.lastDrawnCard = null;
  room.captureLog = [];
  room.winner = null;
  room.loser = null;
}

/**
 * Iterates through all players and recalculates their total scores.
 * Typically invoked after a successful capture or at endgame.
 * Score calculation relies on `totalScore` from deck.js.
 * 
 * @param {object} room - The room state object currently being modified.
 */
function recalcScores(room) {
  for (const player of room.players) {
    player.score = totalScore(player.scoreStack);
  }
}

/**
 * Builds a sanitized, safe-to-transmit view of the complete room state.
 * Security: This is critical. It prevents cheating by hiding the exact cards in 
 * opposing players' hands, replacing the actual array with just an integer length.
 * The requesting player (socketId) receives their own hand in full.
 * 
 * @param {object} room - The canonical, complete server-side room state.
 * @param {string} socketId - The specific socket ID of the client requesting the view.
 * @returns {object} A sanitized copy of the room state tailored for the specific socket.
 */
function getPlayerView(room, socketId) {
  return {
    ...room,
    players: room.players.map(p => {
      if (p.id === socketId) return { ...p }; // full hand for self
      return {
        ...p,
        hand: p.hand.length,  // other players: just card count
      };
    }),
  };
}

/**
 * Diagnostic helper: Counts all existing copies of a specific rank currently "in play".
 * "In play" is defined as existing within the draw deck, center table, any player's hand, 
 * or any player's score stack. 
 * Useful for debugging card duplication or deletion loops.
 * 
 * @param {object} room - The active room state.
 * @param {string} rank - The targeted rank (e.g., 'A', 'K', '10').
 * @returns {number} The total integer count of the rank across all zones.
 */
function countRankInGame(room, rank) {
  let count = 0;
  const countIn = (cards) => {
    if (Array.isArray(cards)) {
      cards.forEach(c => { if (getRank(c) === rank) count++; });
    }
  };
  countIn(room.drawDeck);
  countIn(room.centerTable);
  for (const p of room.players) {
    countIn(p.hand);
    countIn(p.scoreStack);
  }
  return count;
}

export {
  createRoomState,
  createPlayer,
  initGameState,
  recalcScores,
  getPlayerView,
  countRankInGame,
};
