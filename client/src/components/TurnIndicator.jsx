import React from 'react';

const TurnIndicator = ({ isMyTurn, currentPlayerName, turnPhase }) => {
  const phaseText = turnPhase === 'draw' ? 'DRAW A CARD' : 'PLAY A CARD FROM HAND';
  
  return (
    <div className={`turn-banner ${isMyTurn ? 'my-turn' : 'their-turn'}`}>
      {isMyTurn ? (
        <span>YOUR TURN — {phaseText}</span>
      ) : (
        <span>{currentPlayerName.toUpperCase()}'S TURN</span>
      )}
    </div>
  );
};

export default TurnIndicator;
