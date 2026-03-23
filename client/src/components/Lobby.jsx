import React, { useState } from 'react';
import { socket } from '../socket';

const Lobby = ({ room }) => {
  const isAdmin = room.adminId === socket.id;
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleStart = () => {
    socket.emit('start_game', { roomCode: room.roomCode });
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  }

  const handleCopyLink = async () => {
    try {
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      console.log(baseUrl);
      // Ensure the baseUrl doesn't have a trailing slash before appending the roomCode
      const link = `${baseUrl.replace(/\/$/, '')}/${room.roomCode}`;
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link: ', err);
    }
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px' }}>
              <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                Room Code: 
                <span 
                  style={{ 
                    color: 'var(--primary)', 
                    fontWeight: 800, 
                    letterSpacing: '1px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '5px',
                    background: 'rgba(46, 204, 113, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    transition: 'background 0.2s'
                  }}
                  onClick={handleCopyCode}
                  title="Click to copy room code"
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(46, 204, 113, 0.2)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(46, 204, 113, 0.1)'}
                >
                  {codeCopied ? 'COPIED!' : room.roomCode}
                  {codeCopied ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  )}
                </span>
              </p>
              
              <button 
                onClick={handleCopyLink}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '4px 12px',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: 'none'
                }}
                title="Copy full invite link"
              >
                {linkCopied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    Copy Link
                  </>
                )}
              </button>
            </div>
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
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '10px' }}>MAX PLAYERS: {room.settings.maxPlayers}</label>
              <input 
                type="range" 
                min="2" 
                max="10" 
                value={room.settings.maxPlayers} 
                onChange={(e) => socket.emit('update_settings', { roomCode: room.roomCode, settings: { maxPlayers: parseInt(e.target.value) } })}
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
