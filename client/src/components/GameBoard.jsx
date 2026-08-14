import React, { useState, useEffect, useCallback } from "react";
import { socket } from "../socket";
import Card from "./Card";
import CenterTable from "./CenterTable";
import DrawDeck from "./DrawDeck";
import PlayerHand from "./PlayerHand";
import ScoreStack from "./ScoreStack";
import TurnIndicator from "./TurnIndicator";
import DealingAnimation from "./DealingAnimation";
import SoundBoard from "./SoundBoard";
/*
OLD CODE (imported playTaunt for situational sounds):
import { playSound, playTaunt } from "../utils/audioManager";
*/
// NEW CODE: playTaunt removed, playBoardSound added for sound board system
import { playSound, playBoardSound, setMuted, getMuted } from "../utils/audioManager";

/**
 * GameBoard
 * ─────────────────────────────────────────────────────────────────────────────
 * Main gameplay interface. Manages table felt, player hand, score stacks,
 * draw deck, turn banner, card flow animations, dealing overlay, and sound board.
 *
 * Props:
 *  - room {object} : Server room state
 */
const GameBoard = ({ room }) => {
  const [animations, setAnimations] = useState([]);
  const [isDealing, setIsDealing] = useState(true);
  const [bannerShake, setBannerShake] = useState(false);
  const [showSoundBoard, setShowSoundBoard] = useState(false);
  const [isMuted, setIsMuted] = useState(getMuted());

  const me = room.players.find((p) => p.id === socket.id);
  const currentPlayer = room.players[room.turnIndex];
  const isMyTurn = currentPlayer.id === socket.id;

  // Reorder players so "me" is at the bottom (index 0)
  const myIndex = room.players.findIndex((p) => p.id === socket.id);
  const orderedPlayers =
    myIndex !== -1
      ? [...room.players.slice(myIndex), ...room.players.slice(0, myIndex)]
      : room.players;

  const handleDraw = () => {
    socket.emit("draw_card", { roomCode: room.roomCode });
    playSound("click");
  };

  const handlePlayCard = (card) => {
    socket.emit("place_card", { roomCode: room.roomCode, card });
    playSound("click");
  };

  // Callback triggered when player clicks a card on someone else's turn
  const handleDisabledClick = useCallback(() => {
    setBannerShake(true);
    setTimeout(() => setBannerShake(false), 550);
  }, []);

  // Mute toggle handler
  const handleToggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    setMuted(newMuted);
  }, [isMuted]);

  useEffect(() => {
    const handleDrawFlow = (data) => {
      const targetIdx = orderedPlayers.findIndex((p) => p.id === data.playerId);
      const newAnim = {
        id: Math.random(),
        card: data.card,
        fromIdx: -2, // Deck
        toIdx: targetIdx,
        delay: 0,
        type: "draw",
      };
      playSound("draw");
      setAnimations((prev) => [...prev, newAnim]);
      setTimeout(() => {
        setAnimations((prev) => prev.filter((a) => a.id !== newAnim.id));
      }, 2000);
    };

    const handlePlaceFlow = (data) => {
      const fromIdx = orderedPlayers.findIndex((p) => p.id === data.playerId);
      const newAnim = {
        id: Math.random(),
        card: data.card,
        fromIdx: fromIdx,
        toIdx: -1, // Center/Table
        delay: 0,
        type: "place",
      };
      playSound("place");
      setAnimations((prev) => [...prev, newAnim]);
      setTimeout(() => {
        setAnimations((prev) => prev.filter((a) => a.id !== newAnim.id));
      }, 2000);
    };

    const handleCapture = (data) => {
      const targetIdx = orderedPlayers.findIndex((p) => p.id === data.playerId);
      const newAnims = [];

      /*
      OLD CODE (situational taunt sounds for steal/chain):
      const hasStolen = data.captureDetail?.fromStacks && data.captureDetail.fromStacks.length > 0;
      if (hasStolen) {
        playTaunt("steal");
      } else {
        playSound("capture");
      }
      if (data.chained) {
        setTimeout(() => playTaunt("chain"), 400);
      }
      */
      // NEW CODE: Just play the click sound for captures (taunts removed)
      playSound("click");

      // 1. Cards from Table
      if (data.captureDetail?.fromTable) {
        data.captureDetail.fromTable.forEach((card, i) => {
          newAnims.push({
            id: Math.random(),
            card,
            fromIdx: -1,
            toIdx: targetIdx,
            delay: i * 0.2, // Staggered
            type: "capture",
          });
        });
      }

      // 2. Cards from Stacks
      if (data.captureDetail?.fromStacks) {
        data.captureDetail.fromStacks.forEach((stack) => {
          const fromIdx = orderedPlayers.findIndex(
            (p) => p.id === stack.playerId,
          );
          stack.cards.forEach((card, i) => {
            newAnims.push({
              id: Math.random(),
              card,
              fromIdx: fromIdx,
              toIdx: targetIdx,
              delay: (newAnims.length + i) * 0.2, // Staggered
              type: "capture",
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
          type: "capture",
        });
      }

      setAnimations((prev) => [...prev, ...newAnims]);
      setTimeout(() => {
        setAnimations((prev) =>
          prev.filter((a) => !newAnims.find((na) => na.id === a.id)),
        );
      }, 4000); // 4s to allow for long staggers
    };

    // Listen for sound board sounds from other players
    const handleBoardSound = (data) => {
      playBoardSound(data.soundPath);
    };

    socket.on("card_drawn_flow", handleDrawFlow);
    socket.on("card_placed_flow", handlePlaceFlow);
    socket.on("card_captured", handleCapture);
    socket.on("board_sound_played", handleBoardSound);
    return () => {
      socket.off("card_drawn_flow", handleDrawFlow);
      socket.off("card_placed_flow", handlePlaceFlow);
      socket.off("card_captured", handleCapture);
      socket.off("board_sound_played", handleBoardSound);
    };
  }, [orderedPlayers]);

  return (
    <div className="game-container">
      {/* Dealing animation overlay plays once at round start */}
      {isDealing && (
        <DealingAnimation room={room} onComplete={() => setIsDealing(false)} />
      )}

      <TurnIndicator
        isMyTurn={isMyTurn}
        currentPlayerName={currentPlayer ? currentPlayer.name : ""}
        isBot={currentPlayer ? currentPlayer.isBot : false}
        turnPhase={room.turnPhase}
        shake={bannerShake}
      />

      <div className="felt-table">
        <CenterTable
          cards={room.centerTable}
          animatingCards={animations.map((a) => a.card)}
        />

        <DrawDeck
          count={room.drawDeck}
          onDraw={handleDraw}
          disabled={
            !isMyTurn ||
            room.turnPhase !== "draw" ||
            room.drawDeck === 0 ||
            isDealing
          }
        />

        <div className="score-stacks">
          {orderedPlayers.map((player, idx) => {
            if (idx === 0) {
              return (
                <ScoreStack
                  key={player.id}
                  player={player}
                  isSelf={true}
                  isCurrentTurn={
                    currentPlayer && player.id === currentPlayer.id
                  }
                  positionClass="stack-self"
                  animatingCards={animations.map((a) => a.card)}
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
            const ty = -Math.sin(rad) * 32;
            const rot = 270 - alpha;

            return (
              <ScoreStack
                key={player.id}
                player={player}
                isSelf={false}
                isCurrentTurn={currentPlayer && player.id === currentPlayer.id}
                dynamicStyle={{
                  left: `calc(50% + ${tx}vw)`,
                  top: `calc(50% + ${ty}vh)`,
                  transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                }}
                animatingCards={animations.map((a) => a.card)}
              />
            );
          })}
        </div>
      </div>

      <PlayerHand
        hand={me ? me.hand : []}
        onPlayCard={handlePlayCard}
        disabled={!isMyTurn || room.turnPhase !== "play" || isDealing}
        onDisabledClick={handleDisabledClick}
        animatingCards={animations.map((a) => a.card)}
      />

      {/* Sound Board Toggle Button */}
      <button
        onClick={() => setShowSoundBoard((prev) => !prev)}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          background: showSoundBoard
            ? "var(--primary)"
            : "rgba(255,255,255,0.1)",
          border: showSoundBoard
            ? "2px solid var(--primary)"
            : "2px solid rgba(255,255,255,0.2)",
          color: showSoundBoard ? "white" : "rgba(255,255,255,0.7)",
          fontSize: "1.4rem",
          cursor: "pointer",
          zIndex: 7999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: showSoundBoard
            ? "0 0 20px rgba(46,204,113,0.4)"
            : "0 4px 12px rgba(0,0,0,0.3)",
          transition: "all 0.2s ease",
          padding: 0,
        }}
        title="Sound Board"
      >
        🔊
      </button>

      {/* Sound Board Panel */}
      {showSoundBoard && (
        <SoundBoard
          roomCode={room.roomCode}
          onClose={() => setShowSoundBoard(false)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Animation Layer for flying/capturing cards */}
      {animations.map((anim) => {
        const getPos = (idx) => {
          if (idx === -2) return { tx: "250px", ty: "-80px" }; // Deck (Relative to center)
          if (idx === -1) return { tx: "0px", ty: "0px" }; // Center
          if (idx === 0) return { tx: "0px", ty: "38vh" }; // Self (Hand)

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
            ty: `${-Math.sin(rad) * 38}vh`,
          };
        };

        const from = getPos(anim.fromIdx);
        const to = getPos(anim.toIdx);

        return (
          <div
            key={anim.id}
            className={`capture-item anim-type-${anim.type}`}
            style={{
              top: "50%",
              left: "50%",
              animationDelay: `${anim.delay}s`,
              "--fx": from.tx,
              "--fy": from.ty,
              "--tx": to.tx,
              "--ty": to.ty,
            }}
          >
            <Card
              card={anim.card}
              faceUp={!(anim.type === "draw" && anim.toIdx !== 0)}
            />
          </div>
        );
      })}
    </div>
  );
};

export default GameBoard;
