import React from 'react';

const SUIT_SYMBOLS = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠',
};

const Card = ({ card, faceUp = true, onClick, className = '', style = {} }) => {
  if (!card) return null;

  // Handle Joker cards (JOKER1, JOKER2)
  const isJoker = card.startsWith('JOKER');
  const rank = isJoker ? '🃏' : card.slice(0, -1);
  const suit = isJoker ? null : card.slice(-1);
  const isRed = suit === 'h' || suit === 'd';
  const colorClass = isJoker ? 'red' : (isRed ? 'red' : 'black');

  return (
    <div 
      className={`card-wrapper ${className}`}
      onClick={onClick}
      style={style}
    >
      <div className={`card ${faceUp ? 'face-up' : 'face-down'} ${colorClass}`}>
        {/* Front Face */}
        <div className="card-face front">
          {isJoker ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '4px' }}>
              <div style={{ fontSize: '2rem' }}>🃏</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8e44ad', letterSpacing: '1px' }}>JOKER</div>
            </div>
          ) : (
            <>
              <div className="card-rank">{rank}</div>
              <div className="card-suit-center">{SUIT_SYMBOLS[suit]}</div>
              <div className="card-rank card-rank-bottom">{rank}</div>
            </>
          )}
        </div>
        
        {/* Back Face */}
        <div className="card-face back">
          <img 
            src="/card-back.png" 
            alt="KHOTI" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              borderRadius: 'inherit',
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: -1
            }} 
          />
          <div className="card-logo">KHOTI</div>
        </div>
      </div>
    </div>
  );
};

export default Card;
