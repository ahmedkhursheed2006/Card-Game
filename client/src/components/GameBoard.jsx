import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import Card from './Card';
import CenterTable from './CenterTable';
import DrawDeck from './DrawDeck';
import PlayerHand from './PlayerHand';
import ScoreStack from './ScoreStack';
import TurnIndicator from './TurnIndicator';

const GameBoard = ({ room }) => {
  const [animations, setAnimations] = useState([]);
  const me = room.players.find(p => p.id === socket.id);
  const currentPlayer = room.players[room.turnIndex];
  const isMyTurn = currentPlayer.id === socket.id;

  // Reorder players so "me" is at the bottom
  const myIndex = room.players.findIndex(p => p.id === socket.id);
  const orderedPlayers = [
    ...room.players.slice(myIndex),
    ...room.players.slice(0, myIndex)
  ];

  const handleDraw = () => {
    socket.emit('draw_card', { roomCode: room.roomCode });
  };

  const handlePlayCard = (card) => {
    socket.emit('place_card', { roomCode: room.roomCode, card });
  };

  useEffect(() => {
    const handleDrawFlow = (data) => {
      const targetIdx = orderedPlayers.findIndex(p => p.id === data.playerId);
      const newAnim = {
        id: Math.random(),
        card: data.card,
        fromIdx: -2, // Deck
        toIdx: targetIdx,
        delay: 0,
        type: 'draw'
      };
      setAnimations(prev => [...prev, newAnim]);
      setTimeout(() => {
        setAnimations(prev => prev.filter(a => a.id !== newAnim.id));
      }, 2000);
    };

    const handlePlaceFlow = (data) => {
      const fromIdx = orderedPlayers.findIndex(p => p.id === data.playerId);
      const newAnim = {
        id: Math.random(),
        card: data.card,
        fromIdx: fromIdx,
        toIdx: -1, // Center/Table
        delay: 0,
        type: 'place'
      };
      setAnimations(prev => [...prev, newAnim]);
      setTimeout(() => {
        setAnimations(prev => prev.filter(a => a.id !== newAnim.id));
      }, 2000);
    };

    const handleCapture = (data) => {
      const targetIdx = orderedPlayers.findIndex(p => p.id === data.playerId);
      const newAnims = [];

      // 1. Cards from Table
      if (data.captureDetail?.fromTable) {
        data.captureDetail.fromTable.forEach((card, i) => {
          newAnims.push({
            id: Math.random(),
            card,
            fromIdx: -1, 
            toIdx: targetIdx,
            delay: i * 0.2, // Staggered
            type: 'capture'
          });
        });
      }

      // 2. Cards from Stacks
      if (data.captureDetail?.fromStacks) {
        data.captureDetail.fromStacks.forEach(stack => {
          const fromIdx = orderedPlayers.findIndex(p => p.id === stack.playerId);
          stack.cards.forEach((card, i) => {
            newAnims.push({
              id: Math.random(),
              card,
              fromIdx: fromIdx,
              toIdx: targetIdx,
              delay: (newAnims.length + i) * 0.2, // Staggered
              type: 'capture'
            });
          });
        });
      }

      // 3. The card played/drawn
      const specialCard = data.playedCard || data.drawnCard;
      if (specialCard) {
        newAnims.push({
          id: Math.random(),
          card: specialCard,
          fromIdx: data.fromHand ? 0 : -1,
          toIdx: targetIdx,
          delay: newAnims.length * 0.2,
          type: 'capture'
        });
      }
      
      setAnimations(prev => [...prev, ...newAnims]);
      setTimeout(() => {
        setAnimations(prev => prev.filter(a => !newAnims.find(na => na.id === a.id)));
      }, 4000); // 4s to allow for long staggers
    };

    socket.on('card_drawn_flow', handleDrawFlow);
    socket.on('card_placed_flow', handlePlaceFlow);
    socket.on('card_captured', handleCapture);
    return () => {
      socket.off('card_drawn_flow', handleDrawFlow);
      socket.off('card_placed_flow', handlePlaceFlow);
      socket.off('card_captured', handleCapture);
    };
  }, [orderedPlayers]);

  return (
    <div className="game-container">
      <TurnIndicator 
        isMyTurn={isMyTurn} 
        currentPlayerName={currentPlayer.name} 
        turnPhase={room.turnPhase} 
      />

      <div className="felt-table">
        <CenterTable 
          cards={room.centerTable} 
          animatingCards={animations.map(a => a.card)}
        />
        
        <DrawDeck 
          count={room.drawDeck.length} 
          onDraw={handleDraw} 
          disabled={!isMyTurn || room.turnPhase !== 'draw' || room.drawDeck.length === 0}
        />

        <div className="score-stacks">
          {orderedPlayers.map((player, idx) => {
            if (idx === 0) {
              return (
                <ScoreStack 
                  key={player.id} 
                  player={player} 
                  isSelf={true}
                  isCurrentTurn={player.id === currentPlayer.id}
                  positionClass="stack-self"
                  animatingCards={animations.map(a => a.card)}
                />
              );
            }

            const numOpponents = orderedPlayers.length - 1;
            let alpha = 90;
            if (numOpponents === 2) {
              alpha = idx === 1 ? 180 : 0;
            } else if (numOpponents > 1) {
              alpha = 180 - (180 * (idx - 1)) / (numOpponents - 1);
            }
            const rad = (alpha * Math.PI) / 180;
            const tx = Math.cos(rad) * 42; 
            const ty = -Math.sin(rad) * 38;
            const rot = 270 - alpha;

            return (
              <ScoreStack 
                key={player.id} 
                player={player} 
                isSelf={false}
                isCurrentTurn={player.id === currentPlayer.id}
                dynamicStyle={{
                  left: `calc(50% + ${tx}vw)`,
                  top: `calc(50% + ${ty}vh)`,
                  transform: `translate(-50%, -50%) rotate(${rot}deg)`
                }}
                animatingCards={animations.map(a => a.card)}
              />
            );
          })}
        </div>
      </div>

      <PlayerHand 
        hand={me.hand} 
        onPlayCard={handlePlayCard}
        disabled={!isMyTurn || room.turnPhase !== 'play'}
        animatingCards={animations.map(a => a.card)}
      />

      {/* Animation Layer */}
      {animations.map(anim => {
        const getPos = (idx) => {
          if (idx === -2) return { tx: '250px', ty: '-80px' }; // Deck (Relative to center)
          if (idx === -1) return { tx: '0px', ty: '0px' }; // Center
          if (idx === 0) return { tx: '0px', ty: '38vh' }; // Self (Hand)
          
          const numOpponents = orderedPlayers.length - 1;
          let alpha = 90;
          if (numOpponents === 2) {
            alpha = idx === 1 ? 180 : 0;
          } else if (numOpponents > 1) {
            alpha = 180 - (180 * (idx - 1)) / (numOpponents - 1);
          }
          const rad = (alpha * Math.PI) / 180;
          
          return { 
            tx: `${Math.cos(rad) * 42}vw`, 
            ty: `${-Math.sin(rad) * 38}vh` 
          };
        };

        const from = getPos(anim.fromIdx);
        const to = getPos(anim.toIdx);

        return (
          <div 
            key={anim.id}
            className={`capture-item anim-type-${anim.type}`}
            style={{
              top: '50%',
              left: '50%',
              animationDelay: `${anim.delay}s`,
              '--fx': from.tx,
              '--fy': from.ty,
              '--tx': to.tx,
              '--ty': to.ty
            }}
          >
            <Card card={anim.card} faceUp={!(anim.type === 'draw' && anim.toIdx !== 0)} />
          </div>
        );
      })}
    </div>
  );
};

export default GameBoard;
