import React from 'react';

/**
 * TurnIndicator
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays top banner showing whose turn it is and the current turn phase.
 * 
 * Props:
 *  - isMyTurn          {boolean} : Whether active turn belongs to local player
 *  - currentPlayerName {string}  : Name of the player whose turn it is
 *  - turnPhase         {string}  : 'draw' | 'play'
 *  - shake             {boolean} : Triggers banner vibration on invalid interaction
 */
const TurnIndicator = ({ isMyTurn, currentPlayerName, isBot = false, turnPhase, shake = false }) => {
 
  
  const phaseText = turnPhase === 'draw' ? 'DRAW A CARD' : 'PLAY A CARD FROM HAND';
  const shakeClass = shake ? 'shake' : '';

  return (
    <div 
      key={`${currentPlayerName}-${turnPhase}`}
      className={`turn-banner ${isMyTurn ? 'my-turn' : 'their-turn'} ${shakeClass}`}
    >
      {isMyTurn ? (
        <span>YOUR TURN — {phaseText}</span>
      ) : (
        <span>{isBot ? '🤖 ' : ''}{(currentPlayerName || 'PLAYER').toUpperCase()}'S TURN</span>
      )}
    </div>
  );
};

export default TurnIndicator;
