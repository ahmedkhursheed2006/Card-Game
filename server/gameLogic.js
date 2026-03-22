/**
 * gameLogic.js — Core turn-by-turn game logic for Khoti.
 * 
 * New Turn Flow (per User Feedback):
 *   1. Player DRAWS a card. It goes to their hand.
 *   2. Player SELECTS a card from their hand to play.
 *   3. If rank matches table/stacks -> CAPTURE ALL -> TURN CONTINUES (player draws again).
 *   4. If rank DOES NOT match -> PLACE on table -> TURN ENDS.
 */

import { getRank, totalScore, copiesPerRank } from './deck.js';
import { initGameState, recalcScores } from './gameState.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Helper to find all cards in an array that match a specific rank.
 * @param {string[]} cards - Array of card strings (e.g., ['10s', 'Ah', '5d']).
 * @param {string} rank - The rank to match against (e.g., '10', 'A', '5').
 * @returns {string[]} An array containing only the cards that matched the rank.
 */
function findMatches(cards, rank) {
  return cards.filter(c => getRank(c) === rank);
}

/**
 * Helper to uniquely remove specific cards from an array without modifying the original array.
 * Iterates over the cards to remove, finds their first occurrence in the copy, and splices it out.
 * @param {string[]} arr - The source array of cards.
 * @param {string[]} toRemove - The array of specific cards to be removed.
 * @returns {string[]} A new array with the targeted cards removed.
 */
function removeCards(arr, toRemove) {
  const copy = [...arr];
  for (const card of toRemove) {
    const idx = copy.indexOf(card);
    if (idx !== -1) copy.splice(idx, 1);
  }
  return copy;
}

// ─── Main Logic ─────────────────────────────────────────────────────────────

/**
 * Initializes the game state when the room admin clicks 'Start Game'.
 * Delegates the complex setup (shuffling, dealing) to the gameState logic.
 * @param {object} room - The shared room state object.
 */
function startGame(room) {
  initGameState(room);
}

/**
 * Executes a player's action to draw a card from the deck.
 * Logic details:
 * 1. Validates that it is the requesting player's active turn.
 * 2. Validates that the current turn phase is explicitly 'draw'.
 * 3. Handles empty deck scenario by automatically shifting the phase to 'play'.
 * 
 * @param {object} room - The current room state object.
 * @param {string} playerId - The socket ID of the player attempting to draw.
 * @returns {object} Result object containing success status, error msg (if any), and the drawnCard.
 */
function drawCard(room, playerId) {
  const player = room.players[room.turnIndex];
  
  // Conditional: Verify turn ownership and current phase
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
 * The core logic loop for playing a card from the hand to the table.
 * This function orchestrates the logic for matching cards, capturing from the table, 
 * stealing from opponents, self-stacking, scoring, and turn progression (including chaining).
 * 
 * @param {object} room - The shared room state object.
 * @param {string} playerId - The socket ID of the player making the move.
 * @param {string} cardToPlay - The exact card string (e.g., 'Kh') the player intends to play.
 * @returns {object} Result object detailing success, capture events, and chaining status.
 */
function placeCard(room, playerId, cardToPlay) {
  const player = room.players[room.turnIndex];
  
  // 1. Validation Logic: Ensure correct player, correct phase, and card possession
  if (!player || player.id !== playerId) return { success: false, error: 'Not your turn.' };
  if (room.turnPhase !== 'play') return { success: false, error: 'You must draw first.' };

  const cardIndex = player.hand.indexOf(cardToPlay);
  if (cardIndex === -1) return { success: false, error: 'Card not in hand.' };

  const rank = getRank(cardToPlay);
  
  // 2. Identify Matches on the Center Table
  const tableMatches = findMatches(room.centerTable, rank);
  
  // 3. Identify Matches on Opponents' Stacks (Stealing mechanics)
  // Iterates through every player to find valid opponent stacks matching the played rank.
  const stackCaptures = [];
  for (const opponent of room.players) {
    if (opponent.id === playerId) continue; // Conditional: Cannot steal from self
    if (opponent.scoreStack.length === 0) continue; // Conditional: Ignore empty stacks
    if (opponent.lockedRanks.includes(rank)) continue; // Conditional: Cannot steal if opponent secured all copies

    const capturedFromThisOpponent = [];
    // Stealing Logic: Peek at opponent's top card. If rank matches, pop it.
    // Repeat downwards until the rank changes, capturing all matching consecutive cards.
    while (opponent.scoreStack.length > 0) {
      const topCard = opponent.scoreStack[opponent.scoreStack.length - 1];
      if (getRank(topCard) === rank) {
        capturedFromThisOpponent.push(opponent.scoreStack.pop());
      } else {
        break; // Stop stealing when rank differs
      }
    }
    
    // If cards were stolen, aggregate them into the stackCaptures report
    if (capturedFromThisOpponent.length > 0) {
      stackCaptures.push({ 
        playerId: opponent.id, 
        playerName: opponent.name, 
        cards: capturedFromThisOpponent 
      });
    }
  }

  // 4. Check against OWN stack rank (Self-Stacking logic)
  // Allows player to add a card to their own stack directly if the top card has the same rank.
  let selfStackMatch = false;
  if (player.scoreStack.length > 0) {
    const topCard = player.scoreStack[player.scoreStack.length - 1];
    if (getRank(topCard) === rank && !player.lockedRanks.includes(rank)) {
      selfStackMatch = true;
    }
  }

  // Determine if ANY valid match scenario occurred
  const hasMatches = tableMatches.length > 0 || stackCaptures.length > 0 || selfStackMatch;

  if (hasMatches) {
    // ── MATCH & CONTINUE (CAPTURE OR SELF-STACK) ──
    // Compile all captured assets (the played card itself + table cards initially)
    const capturedCards = [cardToPlay, ...tableMatches];
    
    // State Modification: Remove played card from hand, remove matches from table
    player.hand.splice(cardIndex, 1);
    room.centerTable = removeCards(room.centerTable, tableMatches);

    // Aggregate any stolen stack cards into the capture list
    for (const sc of stackCaptures) {
      capturedCards.push(...sc.cards);
    }

    // Resolve Score: Add all compiled assets to player's persistent score stack
    player.scoreStack.push(...capturedCards);
    recalcScores(room);
    
    // Security check: Did this capture lock the rank? (Player owns all copies)
    checkLock(room, player, rank);

    // Logging for frontend animation consumption
    room.captureLog.push({
      playerId,
      playerName: player.name,
      captured: capturedCards,
      fromTable: tableMatches,
      fromStacks: stackCaptures,
      selfStacked: selfStackMatch,
      timestamp: Date.now()
    });

    // ── Conditional Turn Chaining ──
    // Logic: If a player matches, they "chain" their turn to draw and play again.
    // If the draw deck has cards, they loop back to 'draw'.
    // If the draw deck is empty, the chain continues, but they must play directly from their hand ('play' phase).
    room.lastDrawnCard = null;

    // Failsafe: If the player just played their absolute last card, they cannot chain.
    if (player.hand.length === 0) {
      advanceTurn(room);
      return { 
        success: true, 
        captured: true, 
        capturedCards, 
        captureDetail: { fromTable: tableMatches, fromStacks: stackCaptures },
        chained: false 
      };
    } else {
      // Hand has cards. Chain proceeds.
      if (room.drawDeck.length > 0) {
        room.turnPhase = 'draw';
      } else {
        room.turnPhase = 'play';
      }
      
      return { 
        success: true, 
        captured: true, 
        capturedCards, 
        captureDetail: { fromTable: tableMatches, fromStacks: stackCaptures },
        chained: true 
      };
    }
  } else {
    // ── NO MATCH -> PLACE & END TURN ──
    // Player played a card with no matches. It goes to the table.
    player.hand.splice(cardIndex, 1);
    room.centerTable.push(cardToPlay);
    room.lastDrawnCard = null;
    
    advanceTurn(room);
    return { success: true, captured: false, chained: false };
  }
}

/**
 * Progresses the turn index to the next player.
 * Logic details:
 * 1. Checks endgame conditions before advancing.
 * 2. Increments turnIndex round-robin.
 * 3. Conditional Phase Selection: Reverts to 'draw' naturally, but skips to 'play' if deck is empty.
 * 4. Skip-Player Logic: If the next player's hand is completely exhausted and deck is empty, skip them entirely.
 * 
 * @param {object} room - The shared room state object.
 */
function advanceTurn(room, skipCount = 0) {
  if (checkEndgame(room)) return;
  const numPlayers = room.players.length;
  
  if (skipCount >= numPlayers) {
    return; // Exit if all players are skipped (e.g., all offline)
  }

  room.turnIndex = (room.turnIndex + 1) % numPlayers;
  
  // Rule: If deck is empty, skip to play phase.
  room.turnPhase = room.drawDeck.length > 0 ? 'draw' : 'play';

  const nextPlayer = room.players[room.turnIndex];
  if (!nextPlayer.connected || (room.drawDeck.length === 0 && nextPlayer.hand.length === 0)) {
    if (checkEndgame(room)) return; // Failsafe recursion break
    advanceTurn(room, skipCount + 1); // Recursively skip to next valid player
  }
}

/**
 * Validates the primary win-condition and game-over state.
 * Triggered automatically at the end of turns or skips.
 * Endgame Condition: The central Draw Deck must be empty AND every player's hand must be empty.
 * 
 * @param {object} room - The shared room state object.
 * @returns {boolean} True if the game is over, False if play continues.
 */
function checkEndgame(room) {
  // Conditional: Verify complete exhaustion of playable assets
  if (room.drawDeck.length === 0 && room.players.every(p => p.hand.length === 0)) {
    room.phase = 'ended';
    recalcScores(room);
    
    // Outcome Logic: Iterate through all players to find absolute min/max scores.
    let minScore = Infinity, maxScore = -Infinity;
    let loser = null, winner = null;
    for (const p of room.players) {
      if (p.score < minScore) { minScore = p.score; loser = p; }
      if (p.score > maxScore) { maxScore = p.score; winner = p; }
    }
    
    // Store outcome directly in state for client Scoreboard render
    room.loser = loser ? { id: loser.id, name: loser.name, score: loser.score } : null;
    room.winner = winner ? { id: winner.id, name: winner.name, score: winner.score } : null;
    return true;
  }
  return false;
}

/**
 * Validates if a player has successfully captured all identical copies of a specific rank.
 * Lock Logic: If a player owns 'N' copies of a rank (where N = 4 * numDecks), 
 * the rank is "Locked", preventing opponents from stealing it from their stack.
 * 
 * @param {object} room - Shared room state (needed to know deck multiplier settings).
 * @param {object} player - The specific player object to check against.
 * @param {string} rank - The targeted card rank (e.g., 'A', 'K', '7').
 * @returns {boolean} True if a lock was successfully acquired, False otherwise.
 */
function checkLock(room, player, rank) {
  const totalCopies = copiesPerRank(room.settings.numDecks); // Dynamically calculates total max copies
  
  // Filter stack to count owned copies of the rank
  const inStack = player.scoreStack.filter(c => getRank(c) === rank).length;
  
  // Conditional: Stack count matches global total and isn't already locked
  if (inStack >= totalCopies && !player.lockedRanks.includes(rank)) {
    player.lockedRanks.push(rank);
    return true;
  }
  return false;
}

export { startGame, drawCard, placeCard, advanceTurn, checkEndgame, checkLock };
