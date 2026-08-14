import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { playSound } from '../utils/audioManager';

/**
 * Scoreboard
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders final scores at match end.
 * Highlights winner (gold border + trophy 🏆) and loser (red border 💀).
 * Admin can click 'PLAY AGAIN' to reset room to lobby.
 * 
 * Props:
 *  - room {object} : Game room state
 */
const Scoreboard = ({ room }) => {
  const navigate = useNavigate();
  const isAdmin = room.adminId === socket.id;

  const players = [...room.players].sort((a, b) => b.score - a.score);
  const winner = room.winner || (players.length > 0 ? players[0] : null);
  const loser = room.loser;
  const isMeLoser = loser && loser.id === socket.id;
  const isMeWinner = winner && winner.id === socket.id;

  useEffect(() => {
    if (isMeLoser) {
      playSound('lose');
    } else {
      playSound('win');
    }
  }, [isMeLoser]);

  /*
  OLD CODE (window.location.reload hack):
  const handleRestart = () => {
    window.location.reload(); // Simple way to go back to home for now
  };
  */

  // NEW CODE: Clean React Router navigation back home with session cleanup
  const handleGoHome = () => {
    localStorage.removeItem('khoti_room');
    localStorage.removeItem('khoti_player');
    navigate('/');
  };

  // NEW CODE: Emit restart_game event (Admin only) to send all lobby members back to Lobby
  const handlePlayAgain = () => {
    socket.emit('restart_game', { roomCode: room.roomCode });
  };

  return (
    <div className="flex-center" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 1000, flexDirection: 'column' }}>
      <h1 className="title" style={{ fontSize: '4rem', marginBottom: '10px' }}>GAME OVER</h1>
      
      <div className="glass" style={{ width: '100%', maxWidth: '500px', padding: '30px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h2 style={{ color: isMeWinner ? 'var(--gold)' : (isMeLoser ? 'var(--accent)' : 'white'), fontSize: '2rem', marginBottom: '8px' }}>
            {isMeWinner ? "VICTORY! 🏆" : (isMeLoser ? "YOU LOST! 💀" : "GAME ENDED! ✨")}
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>Final scores are in...</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px', maxHeight: '260px', overflowY: 'auto' }}>
          {players.map((p, i) => {
            const isWinnerItem = winner && p.id === winner.id;
            const isLoserItem = loser && p.id === loser.id;

            let cardBg = 'rgba(255,255,255,0.05)';
            let cardBorder = '1px solid rgba(255,255,255,0.1)';

            if (isWinnerItem) {
              cardBg = 'rgba(241, 196, 15, 0.15)';
              cardBorder = '2px solid var(--gold)';
            } else if (isLoserItem) {
              cardBg = 'rgba(231, 76, 60, 0.2)';
              cardBorder = '2px solid var(--accent)';
            }

            return (
              <div 
                key={p.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '14px 20px', 
                  background: cardBg,
                  border: cardBorder,
                  borderRadius: '15px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: isWinnerItem ? 'var(--gold)' : 'var(--text-muted)' }}>
                    {isWinnerItem ? '👑' : `#${i + 1}`}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                    {p.name} {p.id === socket.id ? '(YOU)' : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isWinnerItem && <span style={{ fontSize: '1.2rem' }}>🏆</span>}
                  <span style={{ fontSize: '1.4rem', fontWeight: 800 }}>{p.score}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isAdmin ? (
            <button onClick={handlePlayAgain} style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}>
              PLAY AGAIN 🔄
            </button>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '5px' }}>
              Waiting for Admin to start a new match...
            </div>
          )}

          <button 
            onClick={handleGoHome} 
            style={{ 
              width: '100%', 
              padding: '14px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: 'none'
            }}
          >
            LEAVE & BACK TO HOME
          </button>
        </div>
      </div>
    </div>
  );
};

export default Scoreboard;
