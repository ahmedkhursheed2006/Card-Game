import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { socket } from './socket';
import HomePage from './components/HomePage';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import Scoreboard from './components/Scoreboard';

function AppContent() {
  const [room, setRoom] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Attempt auto-reconnect ONLY if visiting a specific room URL
    const pathname = window.location.pathname;
    const roomIdFromUrl = pathname.length > 1 ? pathname.substring(1).toUpperCase() : null;
    const lastPlayer = localStorage.getItem('khoti_player');
    
    if (roomIdFromUrl && lastPlayer) {
      socket.emit('rejoin_game', { roomCode: roomIdFromUrl, playerName: lastPlayer });
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
      navigate(`/${data.roomCode}`);
    });

    socket.on('room_joined', (data) => {
      localStorage.setItem('khoti_room', data.roomCode);
      navigate(`/${data.roomCode}`);
    });

    socket.on('room_rejoined', (data) => {
      console.log('Rejoined room:', data.roomCode);
      navigate(`/${data.roomCode}`);
    });

    socket.on('error_msg', (data) => {
      alert(data.message);
      if (data.message.includes('not found') || data.message.includes('not in this room')) {
        localStorage.removeItem('khoti_room');
        navigate('/');
      }
    });

    socket.on('connect_error', () => {
      // Handle connection errors if needed
    });

    return () => {
      socket.off('game_state');
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('room_rejoined');
      socket.off('error_msg');
      socket.off('connect_error');
    };
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/:roomId" element={<RoomRoute room={room} />} />
    </Routes>
  );
}

function HomeRoute() {
  useEffect(() => {
    // If they explicitly visit the home page, clear any stored room memory
    // so they are treated as a fresh new player.
    localStorage.removeItem('khoti_room');
  }, []);
  
  return <HomePage />;
}

function RoomRoute({ room }) {
  const { roomId } = useParams();
  
  // Verify the loaded room state logically matches the URL's room ID
  if (room && room.roomCode === roomId.toUpperCase()) {
    if (room.phase === 'lobby') return <Lobby room={room} />;
    if (room.phase === 'playing') return <GameBoard room={room} />;
    if (room.phase === 'ended') return <Scoreboard room={room} />;
  }

  // Fallback: If no room state yet, or it doesn't match the URL, show the join screen 
  // rigidly locked to this exact room code.
  return <HomePage fixedRoomCode={roomId.toUpperCase()} />;
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

