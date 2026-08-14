/**
 * botLogic.js — Intelligent AI Bot Decision Engine for Khoti.
 * Handles bot turn scheduling, move evaluation, table captures,
 * stack stealing, self-stacking, and turn progression.
 */

import { getRank, totalScore } from './deck.js';
import { drawCard, placeCard } from './gameLogic.js';
import { getRoom } from './roomManager.js';
import { getPlayerView } from './gameState.js';

// Map<roomCode, Timeout> to prevent duplicate or conflicting timers
const botTimers = new Map();

/**
 * Broadcasts room state to all clients in the room.
 */
function broadcastState(io, room) {
  for (const player of room.players) {
    const view = getPlayerView(room, player.id);
    io.to(player.id).emit('game_state', view);
  }
}

/**
 * Evaluates the bot's hand to choose the highest-value tactical move.
 * Priority:
 * 1. Stealing high-point opponent stacks
 * 2. Capturing high-point center table cards
 * 3. Self-stacking to lock/build score
 * 4. Discarding lowest-point card when no matches are possible
 * 
 * @param {object} room - Current room state
 * @param {object} bot - Active bot player object
 * @returns {string|null} The chosen card string (e.g. '10h')
 */
function chooseBotCard(room, bot) {
  if (!bot.hand || bot.hand.length === 0) return null;

  let bestCard = bot.hand[0];
  let maxScore = -Infinity;

  for (const card of bot.hand) {
    const rank = getRank(card);
    const isJoker = rank === 'JOKER';
    let weight = 0;

    // 1. Table Matches
    const tableMatches = isJoker ? [...room.centerTable] : room.centerTable.filter(c => getRank(c) === rank);
    if (tableMatches.length > 0) {
      const tablePoints = totalScore(tableMatches);
      weight += 100 + tablePoints * 10 + tableMatches.length * 15;
    }

    // 2. Steal Opponents' Stacks
    for (const opponent of room.players) {
      if (opponent.id === bot.id || opponent.scoreStack.length === 0) continue;
      const topCard = opponent.scoreStack[opponent.scoreStack.length - 1];
      const targetRank = isJoker ? getRank(topCard) : rank;

      if (opponent.lockedRanks.includes(targetRank)) continue;

      if (getRank(topCard) === targetRank) {
        let stolenCount = 0;
        const stolenCards = [];
        for (let i = opponent.scoreStack.length - 1; i >= 0; i--) {
          if (getRank(opponent.scoreStack[i]) === targetRank) {
            stolenCount++;
            stolenCards.push(opponent.scoreStack[i]);
          } else {
            break;
          }
        }
        if (stolenCount > 0) {
          const stolenPoints = totalScore(stolenCards);
          weight += 200 + stolenPoints * 10 + stolenCount * 20;
        }
      }
    }

    // 3. Self-Stacking
    if (!isJoker && bot.scoreStack.length > 0) {
      const topCard = bot.scoreStack[bot.scoreStack.length - 1];
      if (getRank(topCard) === rank && !bot.lockedRanks.includes(rank)) {
        weight += 60;
      }
    }

    // 4. Discard Strategy (No match possible)
    if (weight === 0) {
      const cardVal = totalScore([card]);
      weight = -cardVal; // Prefer discarding lower point cards first

      // Slight penalty for discarding a rank already present on table
      const matchesOnTable = room.centerTable.filter(c => getRank(c) === rank).length;
      if (matchesOnTable > 0) {
        weight -= 30;
      }
    }

    if (weight > maxScore) {
      maxScore = weight;
      bestCard = card;
    }
  }

  return bestCard;
}

/**
 * Schedules a bot action after a given delay.
 * Clears any pending timer for the room to prevent race conditions.
 * 
 * @param {object} io - Socket.io instance
 * @param {string} roomCode - Room code
 * @param {number} [delayMs=1100] - Delay in milliseconds
 */
function scheduleBotTurn(io, roomCode, delayMs = 1100) {
  if (botTimers.has(roomCode)) {
    clearTimeout(botTimers.get(roomCode));
    botTimers.delete(roomCode);
  }

  const timer = setTimeout(() => {
    botTimers.delete(roomCode);
    processBotTurn(io, roomCode);
  }, delayMs);

  botTimers.set(roomCode, timer);
}

/**
 * Performs a single step of the bot turn (drawing or placing a card).
 * 
 * @param {object} io - Socket.io instance
 * @param {string} roomCode - Room code
 */
function processBotTurn(io, roomCode) {
  const room = getRoom(roomCode);
  if (!room || room.phase !== 'playing') return;

  const currentPlayer = room.players[room.turnIndex];
  if (!currentPlayer || !currentPlayer.isBot) return;

  // ── Step 1: Draw Phase ──
  if (room.turnPhase === 'draw') {
    const result = drawCard(room, currentPlayer.id);
    if (result.success) {
      io.to(roomCode).emit('card_drawn_flow', {
        playerId: currentPlayer.id,
        card: result.drawnCard,
      });
      broadcastState(io, room);

      if (room.phase === 'playing' && room.turnPhase === 'play') {
        scheduleBotTurn(io, roomCode, 1000);
      }
    }
    return;
  }

  // ── Step 2: Play Phase ──
  if (room.turnPhase === 'play') {
    const cardToPlay = chooseBotCard(room, currentPlayer);
    if (!cardToPlay) return;

    const result = placeCard(room, currentPlayer.id, cardToPlay);
    if (!result.success) return;

    if (result.captured) {
      io.to(roomCode).emit('card_captured', {
        playerId: currentPlayer.id,
        playedCard: cardToPlay,
        captured: result.capturedCards,
        captureDetail: result.captureDetail,
        chained: result.chained
      });
    } else {
      io.to(roomCode).emit('card_placed_flow', {
        playerId: currentPlayer.id,
        card: cardToPlay
      });
    }

    broadcastState(io, room);

    // If game is still active, check if next turn belongs to a bot (chained or next player)
    if (room.phase === 'playing') {
      const nextPlayer = room.players[room.turnIndex];
      if (nextPlayer && nextPlayer.isBot) {
        scheduleBotTurn(io, roomCode, 1100);
      }
    }
  }
}

/**
 * Calculates the total time needed for client card dealing animation to finish.
 * 
 * @param {object} room - Current room state
 * @returns {number} Delay in milliseconds
 */
function calculateDealingDelay(room) {
  const numPlayers = room.players.length;
  const deckDeal = room.settings?.deckDeal || 4;
  const centerCount = (room.centerTable || []).length || deckDeal;
  const totalCards = centerCount + (numPlayers * deckDeal);
  const selfCards = deckDeal;

  let stepInterval = 450;
  let revealHold = 250;
  if (totalCards > 40) {
    stepInterval = 120;
    revealHold = 80;
  } else if (totalCards > 20) {
    stepInterval = 250;
    revealHold = 150;
  }

  return (totalCards * stepInterval) + (selfCards * revealHold) + 800;
}

export { chooseBotCard, scheduleBotTurn, processBotTurn, calculateDealingDelay };

