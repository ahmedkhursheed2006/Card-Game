import React from 'react';
import Card from './Card';

/**
 * Rank weights for sorting: A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, JOKER
 */
const RANK_ORDER = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'JOKER': 14
};

/**
 * Suit weights for sorting within same rank: c, d, h, s
 */
const SUIT_ORDER = { 'c': 1, 'd': 2, 'h': 3, 's': 4 };

/**
 * Helper to extract rank and suit for sorting
 */
const parseCardForSort = (card) => {
  if (!card) return { rankWeight: 99, suitWeight: 99 };
  if (card.startsWith('JOKER')) return { rankWeight: 14, suitWeight: 1 };

  const suit = card.slice(-1);
  const rank = card.slice(0, -1);

  return {
    rankWeight: RANK_ORDER[rank] || 99,
    suitWeight: SUIT_ORDER[suit] || 99
  };
};

/**
 * Sorts hand by rank (A..K) then suit (c, d, h, s)
 */
const sortHand = (cards) => {
  if (!Array.isArray(cards)) return [];
  return [...cards].sort((a, b) => {
    const cardA = parseCardForSort(a);
    const cardB = parseCardForSort(b);

    if (cardA.rankWeight !== cardB.rankWeight) {
      return cardA.rankWeight - cardB.rankWeight;
    }
    return cardA.suitWeight - cardB.suitWeight;
  });
};

const PlayerHand = ({ hand, onPlayCard, disabled, onDisabledClick, animatingCards = [] }) => {
  /*
  OLD CODE (unsorted hand & silent disabled click):
  return (
    <div className="player-hand">
      {(() => {
        const counts = {};
        animatingCards.forEach(c => counts[c] = (counts[c] || 0) + 1);
        
        return hand.map((card, index) => {
          if (counts[card] > 0) {
            counts[card]--;
            return null; // Don't show if animating
          }
          return (
            <div 
              key={`${card}-${index}`} 
              className="hand-card"
              style={{ zIndex: index }}
            >
              <Card 
                card={card} 
                className="card-hover"
                onClick={() => !disabled && onPlayCard(card)}
              />
            </div>
          );
        });
      })()}
      ...
    </div>
  );
  */

  // NEW CODE: Auto-sort hand & trigger onDisabledClick (banner shake) on invalid click
  const sortedHand = sortHand(hand);

  return (
    <div className={`player-hand ${disabled ? 'hand-disabled' : ''}`}>
      {(() => {
        const counts = {};
        animatingCards.forEach(c => counts[c] = (counts[c] || 0) + 1);
        
        return sortedHand.map((card, index) => {
          if (counts[card] > 0) {
            counts[card]--;
            return null; // Don't show if animating
          }
          return (
            <div 
              key={`${card}-${index}`} 
              className={`hand-card ${disabled ? 'disabled-card' : ''}`}
              style={{ 
                zIndex: index,                
                opacity: 1,
                cursor: disabled ? 'not-allowed' : 'pointer'
              }}
            >
              <Card 
                card={card} 
                className={disabled ? '' : 'card-hover'}
                onClick={() => {
                  if (disabled) {
                    if (onDisabledClick) onDisabledClick();
                  } else {
                    onPlayCard(card);
                  }
                }}
              />
            </div>
          );
        });
      })()}
      {sortedHand.length === 0 && (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
          Your hand is empty
        </div>
      )}
    </div>
  );
};

export default PlayerHand;
