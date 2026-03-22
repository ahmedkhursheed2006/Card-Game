import React from 'react';
import Card from './Card';

const PlayerHand = ({ hand, onPlayCard, disabled, animatingCards = [] }) => {
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
      {hand.length === 0 && (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
          Your hand is empty
        </div>
      )}
    </div>
  );
};

export default PlayerHand;
