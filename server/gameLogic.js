/**
 * gameLogic.js — Core turn-by-turn game logic for Khoti.
 * 
 * New Turn Flow (per User Feedback):
 *   1. Player DRAWS a card. It goes to their hand.
 *   2. Player SELECTS a card from their hand to play.
 *   3. If rank matches table/stacks -> CAPTURE ALL -> TURN CONTINUES (player draws again).
 *   4. If rank DOES NOT match -> PLACE on table -> TURN ENDS.
 */

import { getRank, totalScore, copiesPerRank } from './deck';
import { initGameState, recalcScores } from './gameState';

// ─── Helpers ────────────────────────────────────────────────────────────────

function findMatches(cards, rank) {
  return cards.filter(c => getRank(c) === rank);
}

function removeCards(arr, toRemove) {
  const copy = [...arr];
  for (const card of toRemove) {
    const idx = copy.indexOf(card);
    if (idx !== -1) copy.splice(idx, 1);
  }
  return copy;
}

// ─── Main Logic ─────────────────────────────────────────────────────────────

function startGame(room) {
  initGameState(room);
}

/**
 * Draw a card. Simply adds to hand and waits for player to play a card.
 */
function drawCard(room, playerId) {
  const player = room.players[room.turnIndex];
  if (!player || player.id !== playerId) return { success: false, error: 'Not your turn.' };
  if (room.turnPhase !== 'draw') return { success: false, error: 'Already drawn.' };
  if (room.drawDeck.length === 0) {
    room.turnPhase = 'play'; 
    return { success: false, error: 'Deck empty. Play from hand.' };
  }

  const drawnCard = room.drawDeck.shift();
  player.hand.push(drawnCard);
  room.lastDrawnCard = drawnCard;
  room.turnPhase = 'play'; // Move to play phase

  return { success: true, drawnCard };
}

/**
 * Play/Place a card. Handles both capturing (matching) and placing (dropping).
 */
function placeCard(room, playerId, cardToPlay) {
  const player = room.players[room.turnIndex];
  if (!player || player.id !== playerId) return { success: false, error: 'Not your turn.' };
  if (room.turnPhase !== 'play') return { success: false, error: 'You must draw first.' };

  const cardIndex = player.hand.indexOf(cardToPlay);
  if (cardIndex === -1) return { success: false, error: 'Card not in hand.' };

  const rank = getRank(cardToPlay);
  const tableMatches = findMatches(room.centerTable, rank);
  
  // Find matches on opponent stacks (CAPTURE ALL MATCHING RANK CARDS FROM TOP)
  const stackCaptures = [];
  for (const opponent of room.players) {
    if (opponent.id === playerId) continue;
    if (opponent.scoreStack.length === 0) continue;
    if (opponent.lockedRanks.includes(rank)) continue;

    const capturedFromThisOpponent = [];
    // Peek at the stack and take all matching ranks from the top downwards
    while (opponent.scoreStack.length > 0) {
      const topCard = opponent.scoreStack[opponent.scoreStack.length - 1];
      if (getRank(topCard) === rank) {
        capturedFromThisOpponent.push(opponent.scoreStack.pop());
      } else {
        break; // stop when rank doesn't match
      }
    }
    if (capturedFromThisOpponent.length > 0) {
      stackCaptures.push({ 
        playerId: opponent.id, 
        playerName: opponent.name, 
        cards: capturedFromThisOpponent 
      });
    }
  }

  // Check against OWN stack rank (Self-Stacking)
  let selfStackMatch = false;
  if (player.scoreStack.length > 0) {
    const topCard = player.scoreStack[player.scoreStack.length - 1];
    if (getRank(topCard) === rank && !player.lockedRanks.includes(rank)) {
      selfStackMatch = true;
    }
  }

  const hasMatches = tableMatches.length > 0 || stackCaptures.length > 0 || selfStackMatch;

  if (hasMatches) {
    // ── MATCH & CONTINUE (CAPTURE OR SELF-STACK) ──
    const capturedCards = [cardToPlay, ...tableMatches];
    player.hand.splice(cardIndex, 1);
    room.centerTable = removeCards(room.centerTable, tableMatches);

    for (const sc of stackCaptures) {
      capturedCards.push(...sc.cards);
    }

    player.scoreStack.push(...capturedCards);
    recalcScores(room);
    checkLock(room, player, rank);

    // Turn log
    room.captureLog.push({
      playerId,
      playerName: player.name,
      captured: capturedCards,
      fromTable: tableMatches,
      fromStacks: stackCaptures,
      selfStacked: selfStackMatch,
      timestamp: Date.now()
    });

    // CHAIN: Player gets to draw again ONLY IF deck is not empty
    if (room.drawDeck.length > 0) {
      room.turnPhase = 'draw';
      room.lastDrawnCard = null;
      return { 
        success: true, 
        captured: true, 
        capturedCards, 
        captureDetail: { fromTable: tableMatches, fromStacks: stackCaptures },
        chained: true 
      };
    } else {
      // Deck empty - turn must end even if captured
      room.lastDrawnCard = null;
      advanceTurn(room);
      return { 
        success: true, 
        captured: true, 
        capturedCards, 
        captureDetail: { fromTable: tableMatches, fromStacks: stackCaptures },
        chained: false 
      };
    }
  } else {
    // ── NO MATCH & END TURN ──
    player.hand.splice(cardIndex, 1);
    room.centerTable.push(cardToPlay);
    room.lastDrawnCard = null;
    
    advanceTurn(room);
    return { success: true, captured: false, chained: false };
  }
}

function advanceTurn(room) {
  if (checkEndgame(room)) return;
  const numPlayers = room.players.length;
  room.turnIndex = (room.turnIndex + 1) % numPlayers;
  
  // Rule: If deck is empty, skip to play phase.
  room.turnPhase = room.drawDeck.length > 0 ? 'draw' : 'play';

  const nextPlayer = room.players[room.turnIndex];
  if (room.drawDeck.length === 0 && nextPlayer.hand.length === 0) {
    if (checkEndgame(room)) return;
    advanceTurn(room);
  }
}

function checkEndgame(room) {
  if (room.drawDeck.length === 0 && room.players.every(p => p.hand.length === 0)) {
    room.phase = 'ended';
    recalcScores(room);
    // Winner/Loser logic
    let minScore = Infinity, maxScore = -Infinity;
    let loser = null, winner = null;
    for (const p of room.players) {
      if (p.score < minScore) { minScore = p.score; loser = p; }
      if (p.score > maxScore) { maxScore = p.score; winner = p; }
    }
    room.loser = loser ? { id: loser.id, name: loser.name, score: loser.score } : null;
    room.winner = winner ? { id: winner.id, name: winner.name, score: winner.score } : null;
    return true;
  }
  return false;
}

function checkLock(room, player, rank) {
  const totalCopies = copiesPerRank(room.settings.numDecks);
  const inStack = player.scoreStack.filter(c => getRank(c) === rank).length;
  if (inStack >= totalCopies && !player.lockedRanks.includes(rank)) {
    player.lockedRanks.push(rank);
    return true;
  }
  return false;
}

export default { startGame, drawCard, placeCard, advanceTurn, checkEndgame, checkLock };
