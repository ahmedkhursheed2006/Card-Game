import React from 'react';
import Card from './Card';

const CenterTable = ({ cards, animatingCards = [] }) => {
  // Filter out cards currently in animation
  const visibleCards = (() => {
    const counts = {};
    animatingCards.forEach(c => counts[c] = (counts[c] || 0) + 1);
    return cards.filter(card => {
      if (counts[card] > 0) {
        counts[card]--;
        return false;
      }
      return true;
    });
  })();

  // Group cards by rank for better stacking
  const groupedCards = visibleCards.reduce((acc, card) => {
    const rank = card.slice(0, -1);
    if (!acc[rank]) acc[rank] = [];
    acc[rank].push(card);
    return acc;
  }, {});

  return (
    <div className="center-pile" style={{ gap: '20px' }}>
      {visibleCards.length > 0 ? (
        Object.keys(groupedCards).map((rank, gIdx) => (
          <div key={rank} className="visual-stack" style={{ 
            width: 'var(--card-width)', 
            height: 'var(--card-height)' 
          }}>
            {groupedCards[rank].map((card, cIdx) => (
              <div 
                key={card} 
                className="stacked-card"
                style={{ 
                  transform: `translate(${cIdx * 3}px, ${cIdx * -3}px) rotate(${Math.sin(gIdx + cIdx) * 5}deg)`,
                  zIndex: cIdx 
                }}
              >
                <Card card={card} />
              </div>
            ))}
          </div>
        ))
      ) : (
        <div style={{ 
          color: 'rgba(255,255,255,0.15)', 
          fontSize: '1.5rem', 
          fontWeight: 'bold',
          border: '2px dashed rgba(255,255,255,0.1)',
          padding: '40px 60px',
          borderRadius: '20px'
        }}>
          TABLE IS EMPTY
        </div>
      )}
    </div>
  );
};

export default CenterTable;
