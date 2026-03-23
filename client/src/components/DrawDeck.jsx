import React from 'react';
import Card from './Card';

const DrawDeck = ({ count, onDraw, disabled }) => {
  return (
    <div className="draw-pile">
      <div className="stack-owner">DRAW DECK ({count})</div>
      <div 
        className={`${disabled ? 'disabled' : 'card-hover'}`}
        onClick={!disabled ? onDraw : undefined}
        style={{ cursor: disabled ? 'default' : 'pointer' }}
      >
        <Card card="BACK" faceUp={false} />
      </div>
    </div>
  );
};

export default DrawDeck;
