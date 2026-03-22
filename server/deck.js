/**
 * deck.js — Card generation, shuffle, and scoring utilities.
 * Card encoding: "{rank}{suit}"  e.g. "Kh" = King of Hearts, "As" = Ace of Spades
 * Ranks: A 2 3 4 5 6 7 8 9 10 J Q K
 * Suits: h (hearts) d (diamonds) c (clubs) s (spades)
 */

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['h', 'd', 'c', 's'];

/**
 * Build one or more standard 52-card decks.
 * @param {number} numDecks
 * @returns {string[]} flat array of card strings
 */
function buildDeck(numDecks = 1) {
  const singleDeck = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      singleDeck.push(`${rank}${suit}`);
    }
  }
  let deck = [];
  for (let i = 0; i < numDecks; i++) {
    deck = deck.concat([...singleDeck]);
  }
  return deck;
}

/**
 * Fisher-Yates in-place shuffle.
 * @param {string[]} deck
 * @returns {string[]} shuffled deck (same reference)
 */
function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Extract the rank portion from a card string.
 * "10h" → "10", "Kd" → "K", "As" → "A"
 * @param {string} card
 * @returns {string}
 */
function getRank(card) {
  // Rank is everything except the last character (the suit)
  return card.slice(0, -1);
}

/**
 * Extract the suit from a card string.
 * @param {string} card
 * @returns {string}
 */
function getSuit(card) {
  return card.slice(-1);
}

/**
 * Point value of a card per the Khoti scoring rules.
 * Aces = 20, 2-9 = 5, 10/J/Q/K = 10
 * @param {string} card
 * @returns {number}
 */
function getScore(card) {
  const rank = getRank(card);
  if (rank === 'A') return 20;
  return 10; // All other cards = 10
}

/**
 * Total score value for an array of cards.
 * @param {string[]} cards
 * @returns {number}
 */
function totalScore(cards) {
  return cards.reduce((sum, card) => sum + getScore(card), 0);
}

/**
 * Given numDecks, how many copies of each rank exist?
 * @param {number} numDecks
 * @returns {number} copies per rank (4 * numDecks)
 */
function copiesPerRank(numDecks) {
  return 4 * numDecks;
}

module.exports = { buildDeck, shuffle, getRank, getSuit, getScore, totalScore, copiesPerRank, RANKS, SUITS };
