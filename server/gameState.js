/**
 * gameState.js — Factory function for creating the canonical room state object.
 * This is the single source of truth broadcast to all clients.
 */

const { buildDeck, shuffle, getRank, totalScore, copiesPerRank } = require('./deck');

/**
 * Create a fresh room state.
 * @param {string} roomCode
 * @param {string} adminSocketId
 * @param {string} adminName
 * @returns {object} room state
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
 * Create a player object.
 * @param {string} socketId
 * @param {string} name
 * @param {boolean} isAdmin
 * @returns {object}
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
 * Initialize game state from the lobby state:
 * - Shuffle deck(s)
 * - Deal 4 cards to center table
 * - Deal 4 cards to each player's hand
 * @param {object} room  (mutates in place)
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
 * Recalculate all player scores from their scoreStacks.
 * @param {object} room  (mutates in place)
 */
function recalcScores(room) {
  for (const player of room.players) {
    player.score = totalScore(player.scoreStack);
  }
}

/**
 * Build a sanitized view of state for a specific player.
 * Hides other players' hands (replaces with count), keeps everything else intact.
 * @param {object} room
 * @param {string} socketId — the requesting player's socket id
 * @returns {object}
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
 * Count all copies of a rank currently "in play" across the entire game:
 * draw deck + all hands + center table + all score stacks.
 * @param {object} room
 * @param {string} rank
 * @returns {number}
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

module.exports = {
  createRoomState,
  createPlayer,
  initGameState,
  recalcScores,
  getPlayerView,
  countRankInGame,
};
