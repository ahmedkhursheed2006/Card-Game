import React from 'react';
import { socket } from '../socket';

const Lobby = ({ room }) => {
  const isAdmin = room.adminId === socket.id;

  const handleStart = () => {
    socket.emit('start_game', { roomCode: room.roomCode });
  };

  const updateDecks = (val) => {
    socket.emit('update_settings', { 
      roomCode: room.roomCode, 
      settings: { numDecks: parseInt(val) } 
    });
  };

  return (
    <div className="flex-center" style={{ height: '100vh', flexDirection: 'column' }}>
      <div className="glass" style={{ width: '100%', maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>GAME LOBBY</h2>
            <p style={{ color: 'var(--text-muted)' }}>Room Code: <span style={{ color: 'var(--primary)', fontWeight: 800, letterSpacing: '1px' }}>{room.roomCode}</span></p>
          </div>
          <div style={{ background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
            {room.players.length} PLAYERS
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '15px', textTransform: 'uppercase' }}>Players Ready</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {room.players.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '10px 15px', borderRadius: '10px' }}>
                <div style={{ width: '10px', height: '10px', background: p.connected ? 'var(--primary)' : '#555', borderRadius: '50%' }} />
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                {p.isAdmin && <span style={{ fontSize: '0.7rem', background: 'var(--gold)', color: 'black', padding: '2px 6px', borderRadius: '4px', marginLeft: 'auto', fontWeight: 800 }}>ADMIN</span>}
              </div>
            ))}
          </div>
        </div>

        {isAdmin ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '10px' }}>NUMBER OF DECKS: {room.settings.numDecks}</label>
              <input 
                type="range" 
                min="1" 
                max="4" 
                value={room.settings.numDecks} 
                onChange={(e) => updateDecks(e.target.value)}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
            <button 
              disabled={room.players.length < 2}
              onClick={handleStart}
              style={{ width: '100%', padding: '18px' }}
            >
              START GAME
            </button>
            {room.players.length < 2 && <p style={{ fontSize: '0.7rem', color: 'var(--accent)', textAlign: 'center' }}>Need at least 2 players to start</p>}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
            <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Waiting for Admin to start...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Lobby;
