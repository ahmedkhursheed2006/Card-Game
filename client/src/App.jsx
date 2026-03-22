import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import HomePage from './components/HomePage';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import Scoreboard from './components/Scoreboard';

function App() {
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Attempt auto-reconnect if session exists
    const lastRoom = localStorage.getItem('khoti_room');
    const lastPlayer = localStorage.getItem('khoti_player');
    if (lastRoom && lastPlayer) {
      socket.emit('rejoin_game', { roomCode: lastRoom, playerName: lastPlayer });
    }

    socket.on('game_state', (state) => {
      setRoom(state);
      // Persist session only if game is active
      if (state.roomCode) {
        localStorage.setItem('khoti_room', state.roomCode);
        const me = state.players.find(p => p.id === socket.id || p.name === lastPlayer);
        if (me) localStorage.setItem('khoti_player', me.name);
      }
    });

    socket.on('room_created', (data) => {
      localStorage.setItem('khoti_room', data.roomCode);
    });

    socket.on('room_joined', (data) => {
      localStorage.setItem('khoti_room', data.roomCode);
    });

    socket.on('room_rejoined', (data) => {
      console.log('Rejoined room:', data.roomCode);
    });

    socket.on('error_msg', (data) => {
      alert(data.message);
      if (data.message.includes('not found') || data.message.includes('not in this room')) {
        localStorage.removeItem('khoti_room');
        localStorage.removeItem('khoti_player');
      }
    });

    socket.on('connect_error', () => {
      // alert('Failed to connect to game server.');
    });

    return () => {
      socket.off('game_state');
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('room_rejoined');
      socket.off('error_msg');
      socket.off('connect_error');
    };
  }, []);

  if (!room) {
    return <HomePage />;
  }

  if (room.phase === 'lobby') {
    return <Lobby room={room} />;
  }

  if (room.phase === 'playing') {
    return <GameBoard room={room} />;
  }

  if (room.phase === 'ended') {
    return <Scoreboard room={room} />;
  }

  return <div>Unknown Phase: {room.phase}</div>;
}

export default App;
