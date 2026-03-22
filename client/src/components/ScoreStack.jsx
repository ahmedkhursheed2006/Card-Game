import React from 'react';
import Card from './Card';

const ScoreStack = ({ player, isSelf, isCurrentTurn, positionClass, dynamicStyle, animatingCards = [] }) => {
  const stack = (() => {
    const rawStack = player.scoreStack || [];
    const counts = {};
    animatingCards.forEach(c => counts[c] = (counts[c] || 0) + 1);
    return rawStack.filter(card => {
      if (counts[card] > 0) {
        counts[card]--;
        return false;
      }
      return true;
    });
  })();

  const topCard = stack.length > 0 ? stack[stack.length - 1] : null;
  
  const isLocked = (rank) => player.lockedRanks.includes(rank);
  const topRank = topCard ? topCard.slice(0, -1) : null;
  const showLock = topRank && isLocked(topRank);

  const visualCards = stack.slice(-3);

  return (
    <div className={`score-stack ${positionClass || ''}`} style={dynamicStyle}>
      {/* Avatar Container */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className={`player-avatar ${isCurrentTurn ? 'active-player-glow' : ''} ${!player.connected ? 'player-offline' : ''}`}>
          {player.name[0].toUpperCase()}
          {!player.connected && <div className="offline-badge">OFFLINE</div>}
        </div>
        <div className="stack-owner">
          {player.name} • {player.score}
        </div>
      </div>

      {/* Visual Stack to the RIGHT of the avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div className="visual-stack">
          {stack.length === 0 ? (
            <div className="card-face back" style={{ border: '2px dashed rgba(255,255,255,0.1)', opacity: 0.3, backgroundImage: 'none' }}>
            </div>
          ) : (
            visualCards.map((card, idx) => (
              <div 
                key={`${card}-${idx}`}
                className="stacked-card"
                style={{ 
                  transform: `translate(${idx * 4}px, ${idx * -4}px)`,
                  zIndex: idx 
                }}
              >
                <Card 
                  card={card} 
                  className={idx === visualCards.length - 1 && showLock ? 'lock-border' : ''} 
                />
              </div>
            ))
          )}
          
          {showLock && (
            <div className="stack-locked">🔒</div>
          )}
        </div>

        {/* Hand indicator for opponents */}
        {!isSelf && player.hand > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '6px 10px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '1.2rem' }}>🎴</span>
            <span>{player.hand}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoreStack;
