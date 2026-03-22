import React, { useState } from 'react';
import { socket } from '../socket';

const HomePage = () => {
  const [name, setName] = useState(localStorage.getItem('khoti_player') || '');
  const [code, setCode] = useState(localStorage.getItem('khoti_room') || '');
  const [error, setError] = useState('');
  
  const hasSession = localStorage.getItem('khoti_room') && localStorage.getItem('khoti_player');

  const handleCreate = () => {
    if (!name.trim()) return setError('Please enter your name');
    localStorage.setItem('khoti_player', name.trim());
    socket.connect();
    socket.emit('create_room', { playerName: name });
  };

  const handleJoin = () => {
    if (!name.trim()) return setError('Please enter your name');
    if (!code.trim()) return setError('Please enter a room code');
    localStorage.setItem('khoti_player', name.trim());
    localStorage.setItem('khoti_room', code.toUpperCase());
    socket.connect();
    socket.emit('join_room', { roomCode: code.toUpperCase(), playerName: name });
  };

  const handleRejoin = () => {
    const r = localStorage.getItem('khoti_room');
    const p = localStorage.getItem('khoti_player');
    if (r && p) {
      socket.connect();
      socket.emit('rejoin_game', { roomCode: r, playerName: p });
    }
  };

  return (
    <div className="flex-center" style={{ height: '100vh', flexDirection: 'column' }}>
      <h1 className="title">KHOTI</h1>
      
      <div className="glass" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>YOUR NAME</label>
          <input 
            type="text" 
            placeholder="Enter name..." 
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />

        {hasSession && (
          <button 
            onClick={handleRejoin} 
            style={{ 
              background: 'rgba(255, 107, 107, 0.2)', 
              border: '2px solid var(--accent)',
              color: 'var(--accent)',
              fontWeight: 'bold'
            }}
          >
            REJOIN LAST GAME ({localStorage.getItem('khoti_room')})
          </button>
        )}

        <button onClick={handleCreate}>CREATE NEW GAME</button>

        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>— OR JOIN —</div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            style={{ flex: 1 }}
            type="text" 
            placeholder="ROOM CODE" 
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button onClick={handleJoin}>JOIN</button>
        </div>

        {error && <div style={{ color: 'var(--accent)', fontSize: '0.8rem', textAlign: 'center' }}>{error}</div>}
      </div>
    </div>
  );
};

export default HomePage;
