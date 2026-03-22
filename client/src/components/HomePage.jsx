import React, { useState } from 'react';
import { socket } from '../socket';

const HomePage = ({ fixedRoomCode }) => {
  const [name, setName] = useState(localStorage.getItem('khoti_player') || '');
  const [code, setCode] = useState(fixedRoomCode || '');
  const [error, setError] = useState('');

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

        {/* Only show CREATE if we are NOT on a specific room URL */}
        {!fixedRoomCode && (
          <>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />
            <button onClick={handleCreate}>CREATE NEW GAME</button>
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>— OR JOIN —</div>
          </>
        )}

        {fixedRoomCode && (
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            style={{ flex: 1 }}
            type="text" 
            placeholder="ROOM CODE" 
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={!!fixedRoomCode} // Lock the input if URL defines it
          />
          <button onClick={handleJoin}>JOIN</button>
        </div>

        {error && <div style={{ color: 'var(--accent)', fontSize: '0.8rem', textAlign: 'center' }}>{error}</div>}
      </div>
    </div>
  );
};

export default HomePage;

