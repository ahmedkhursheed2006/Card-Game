import React from 'react';
import { socket } from '../socket';

const Scoreboard = ({ room }) => {
  const players = [...room.players].sort((a, b) => b.score - a.score);
  const loser = room.loser;
  const isMeLoser = loser && loser.id === socket.id;

  const handleRestart = () => {
    window.location.reload(); // Simple way to go back to home for now
  };

  return (
    <div className="flex-center" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 1000, flexDirection: 'column' }}>
      <h1 className="title" style={{ fontSize: '4rem', marginBottom: '10px' }}>GAME OVER</h1>
      
      <div className="glass" style={{ width: '100%', maxWidth: '500px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ color: isMeLoser ? 'var(--accent)' : 'var(--gold)', fontSize: '2rem', marginBottom: '10px' }}>
            {isMeLoser ? "YOU LOST! 💀" : "GAME ENDED! ✨"}
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>Final scores are in...</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '40px' }}>
          {players.map((p, i) => (
            <div 
              key={p.id} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '15px 25px', 
                background: p.id === loser?.id ? 'rgba(231, 76, 60, 0.2)' : 'rgba(255,255,255,0.05)',
                border: p.id === loser?.id ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '15px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-muted)' }}>#{i + 1}</span>
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{p.name} {p.id === socket.id ? '(YOU)' : ''}</span>
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{p.score}</span>
            </div>
          ))}
        </div>

        <button onClick={handleRestart} style={{ width: '100%', padding: '20px' }}>
          BACK TO HOME
        </button>
      </div>
    </div>
  );
};

export default Scoreboard;
