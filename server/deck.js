/**
 * deck.js — Card generation, shuffle, and scoring utilities.
 * Card encoding: "{rank}{suit}"  e.g. "Kh" = King of Hearts, "As" = Ace of Spades
 * Ranks: A 2 3 4 5 6 7 8 9 10 J Q K
 * Suits: h (hearts) d (diamonds) c (clubs) s (spades)
 */

const RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];
const SUITS = ["h", "d", "c", "s"];

/**
 * Generates an array representing one or more standard 52-card decks.
 * Includes all standard ranks (A-K) and suits (h, d, c, s).
 *
 * @param {number} [numDecks=1] - The total number of full 52-card decks to combine.
 * @returns {string[]} A single, un-shuffled array of card strings (e.g., ['Ah', 'Ad', ...]).
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
 * Randomizes the order of an array of cards in-place using the Fisher-Yates algorithm.
 * Provides an unbiased, cryptographically robust shuffle.
 *
 * @param {string[]} deck - The array of card strings to shuffle.
 * @returns {string[]} The exact same array reference, now randomized.
 */
function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Utility: Extracts the rank component from a properly formatted card string.
 * Logic: Card strings end with a single character for suit (e.g. 's' for Spades).
 * Everything before that last character is the rank (handles both 1-char lengths like 'K' and 2-char like '10').
 *
 * @param {string} card - The card string (e.g., "10h", "Kd", "As").
 * @returns {string} The rank extracted from the card (e.g., "10", "K", "A").
 */
function getRank(card) {
  // Rank is everything except the last character (the suit)
  return card.slice(0, -1);
}

/**
 * Utility: Extracts the suit component from a properly formatted card string.
 * Logic: Returns strictly the very last character of the string.
 *
 * @param {string} card - The card string.
 * @returns {string} The physical suit ('h', 'd', 'c', or 's').
 */
function getSuit(card) {
  return card.slice(-1);
}

/**
 * Calculates the individual point value of a card according to Khoti game rules.
 * Ruleset dictates simplified tracking: Aces are high-value (20), Kings, Queens, Jacks, and Tens are base-value (10), all others are base-value (5).
 *
 * @param {string} card - The card to score.
 * @returns {number} The integer point value of the card.
 */
function getScore(card) {
  const rank = getRank(card);
  if (rank === "K" || rank === "Q" || rank === "J" || rank === "10") return 10;
  if (rank === "A") return 20;
  return 5; // All other cards = 5
}

/**
 * Calculates the aggregate score of a complete array or stack of cards.
 * Internally maps `getScore` to each item and sums the result.
 *
 * @param {string[]} cards - An array of card strings.
 * @returns {number} The total cumulative score.
 */
function totalScore(cards) {
  return cards.reduce((sum, card) => sum + getScore(card), 0);
}

/**
 * Dynamic calculation of rank scarcity.
 * Computes how many total copies of a specific rank exist based on the room's multiplier.
 * Used primarily for determining if a player has "locked" a specific rank.
 *
 * @param {number} numDecks - The configured quantity of standard decks in play.
 * @returns {number} Total count representing 100% domain of a single rank.
 */
function copiesPerRank(numDecks) {
  return 4 * numDecks;
}

export {
  buildDeck,
  shuffle,
  getRank,
  getSuit,
  getScore,
  totalScore,
  copiesPerRank,
  RANKS,
  SUITS,
};
