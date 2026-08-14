import React, { useState, useEffect } from 'react';
import Card from './Card';
import { socket } from '../socket';
import { playSound } from '../utils/audioManager';

/**
 * DealingAnimation
 * ─────────────────────────────────────────────────────────────────────────────
 * Plays at the start of a round when room phase transitions to 'playing'.
 * Smooth, fluid card-by-card dealer animation:
 *   1. Center table cards: glide from deck to center, flip face-up.
 *   2. Local player cards: swipe from deck to center (reveals card face-up),
 *      then glides down into local player's hand.
 *   3. Opponent cards: glide smoothly from deck to opponent position (face-down).
 * 
 * Props:
 *  - room        {object}   : Current game room state
 *  - onComplete  {function} : Called when all cards have finished dealing
 */
const DealingAnimation = ({ room, onComplete }) => {
  const [dealIndex, setDealIndex] = useState(0);
  const [stage, setStage] = useState('center'); // 'center' (reveal) or 'final' (glide to hand)

  // Calculate ordered players starting with "me" at bottom index 0
  const myIndex = room.players.findIndex(p => p.id === socket.id);
  const orderedPlayers = myIndex !== -1 
    ? [...room.players.slice(myIndex), ...room.players.slice(0, myIndex)]
    : room.players;

  // Build the full sequence of deal steps
  const dealSequence = [];

  // 1. Center table cards
  (room.centerTable || []).forEach((card, idx) => {
    dealSequence.push({
      type: 'center',
      targetIdx: -1,
      card: card,
      faceUp: true,
      label: `Table Card ${idx + 1}`
    });
    playSound('draw');
  });

  // 2. Player hands (round-robin per card index to mimic real casino dealer)
  const deckDeal = room.settings?.deckDeal || 4;
  for (let cardNum = 0; cardNum < deckDeal; cardNum++) {
    orderedPlayers.forEach((player, pIdx) => {
      const playerHand = player.hand || [];
      const actualCard = Array.isArray(playerHand) ? playerHand[cardNum] : null;
      const isSelf = pIdx === 0;

      dealSequence.push({
        type: isSelf ? 'self' : 'opponent',
        targetIdx: pIdx,
        player: player,
        card: isSelf ? actualCard : (actualCard || 'BACK'),
        faceUp: isSelf,
        label: `${player.name}`
      });
      playSound('draw');
    });
  }

  // Smooth durations for fluid casino-style dealing
  const STEP_INTERVAL = 550; // ms between starting new cards
  const REVEAL_HOLD = 300;   // ms local card pauses in center to reveal

  useEffect(() => {
    if (dealSequence.length === 0) {
      onComplete();
      return;
    }

    if (dealIndex < dealSequence.length) {
      const current = dealSequence[dealIndex];
      playSound('draw');

      // For self cards, run 2-stage animation (Deck -> Center Reveal -> Hand)
      if (current.type === 'self') {
        setStage('center');
        const stageTimer = setTimeout(() => {
          setStage('final');
        }, REVEAL_HOLD);

        const nextTimer = setTimeout(() => {
          setDealIndex(prev => prev + 1);
        }, STEP_INTERVAL + REVEAL_HOLD);

        return () => {
          clearTimeout(stageTimer);
          clearTimeout(nextTimer);
        };
      } else {
        // For center table & opponents: 1-stage smooth glide
        setStage('final');
        const nextTimer = setTimeout(() => {
          setDealIndex(prev => prev + 1);
        }, STEP_INTERVAL);

        return () => clearTimeout(nextTimer);
      }
    } else {
      // Allow last card to settle smoothly before handoff
      const finalTimer = setTimeout(() => {
        onComplete();
      }, 400);

      return () => clearTimeout(finalTimer);
    }
  }, [dealIndex, dealSequence.length, onComplete]);

  const currentStep = dealSequence[dealIndex];

  // Coordinates helper
  const getPos = (targetIdx, currentStage, currentType) => {
    // Deck origin position
    const deckPos = { x: 'calc(50vw + 240px)', y: 'calc(50vh - 80px)' };
    const centerPos = { x: '50vw', y: '50vh' };

    if (currentType === 'self' && currentStage === 'center') {
      // Stage 1 for self card: From Deck -> Center Table (Face Up Reveal)
      return {
        from: deckPos,
        to: centerPos
      };
    }

    if (currentType === 'self' && currentStage === 'final') {
      // Stage 2 for self card: From Center Table -> Player Hand
      return {
        from: centerPos,
        to: { x: '50vw', y: '85vh' }
      };
    }

    if (targetIdx === -1) {
      // Center table card: Deck -> Center Table
      return {
        from: deckPos,
        to: centerPos
      };
    }

    // Opponent card: Deck -> Opponent stack around table
    const numOpponents = orderedPlayers.length - 1;
    let alpha = 90;
    if (numOpponents === 2) {
      alpha = targetIdx === 1 ? 180 : 0;
    } else if (numOpponents > 1) {
      alpha = 180 - (180 * (targetIdx - 1)) / (numOpponents - 1);
    }
    const rad = (alpha * Math.PI) / 180;

    return {
      from: deckPos,
      to: {
        x: `calc(50vw + ${Math.cos(rad) * 42}vw)`,
        y: `calc(50vh + ${-Math.sin(rad) * 38}vh)`
      }
    };
  };

  const pos = currentStep ? getPos(currentStep.targetIdx, stage, currentStep.type) : null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 9990,
      background: 'rgba(0,0,0,0.45)',
      backdropFilter: 'blur(3px)',
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: '50px'
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.85)',
        padding: '12px 28px',
        borderRadius: '30px',
        border: '1.5px solid var(--primary)',
        color: 'var(--primary)',
        fontWeight: 800,
        letterSpacing: '2px',
        fontSize: '1rem',
        boxShadow: '0 0 25px rgba(46, 204, 113, 0.4)',
        animation: 'pulse 1.5s infinite ease-in-out'
      }}>
        DEALING CARDS...
      </div>

      {/* Active Flying Card with fluid CSS animation */}
      {currentStep && pos && (
        <div
          key={`fly-${dealIndex}-${stage}`}
          className={`dealing-card-fluid ${currentStep.type === 'self' && stage === 'center' ? 'reveal-pulse' : ''}`}
          style={{
            '--from-x': pos.from.x,
            '--from-y': pos.from.y,
            '--to-x': pos.to.x,
            '--to-y': pos.to.y,
            '--duration': currentStep.type === 'self' && stage === 'center' ? '350ms' : '500ms'
          }}
        >
          <Card card={currentStep.card || 'BACK'} faceUp={currentStep.faceUp} />
        </div>
      )}
    </div>
  );
};

export default DealingAnimation;
