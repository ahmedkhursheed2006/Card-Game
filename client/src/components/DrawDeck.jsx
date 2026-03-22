import React from 'react';
import Card from './Card';

const DrawDeck = ({ count, onDraw, disabled }) => {
  return (
    <div className="draw-pile">
      <div className="stack-owner">DRAW DECK ({count})</div>
      <div 
        className={`card-wrapper ${disabled ? 'disabled' : 'card-hover'}`}
        onClick={!disabled ? onDraw : undefined}
        style={{ cursor: disabled ? 'default' : 'pointer' }}
      >
        <Card card="BACK" faceUp={false} />
      </div>
      {count > 1 && (
        <div 
          className="card-wrapper" 
          style={{ position: 'absolute', top: '35px', left: '2px', zIndex: -1 }}
        >
          <Card card="BACK" faceUp={false} />
        </div>
      )}
    </div>
  );
};

export default DrawDeck;
