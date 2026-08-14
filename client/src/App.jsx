import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { socket } from './socket';
import HomePage from './components/HomePage';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import Scoreboard from './components/Scoreboard';
import { ToastContainer } from './components/Toast';

function AppContent({ addToast }) {
  const [room, setRoom] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Attempt auto-reconnect ONLY if visiting a specific room URL
    const pathname = window.location.pathname;
    const roomIdFromUrl = pathname.length > 1 ? pathname.substring(1).toUpperCase() : null;
    const lastPlayer = localStorage.getItem('khoti_player');
    const lastRoom = localStorage.getItem('khoti_room');
    
    /*
    OLD CODE (Emitted rejoin_game while socket was disconnected due to autoConnect: false):
    if (roomIdFromUrl && lastPlayer && lastRoom === roomIdFromUrl) {
      socket.emit('rejoin_game', { roomCode: roomIdFromUrl, playerName: lastPlayer });
    }
    */
    // NEW CODE: Ensure socket is connected first, then emit rejoin_game
    if (roomIdFromUrl && lastPlayer && lastRoom === roomIdFromUrl) {
      const emitRejoin = () => {
        socket.emit('rejoin_game', { roomCode: roomIdFromUrl, playerName: lastPlayer });
      };

      if (socket.connected) {
        emitRejoin();
      } else {
        socket.connect();
        socket.once('connect', emitRejoin);
      }
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
      /* OLD CODE (alert popup blocks UI):
      alert(data.message);
      if (data.message.includes('not found') || data.message.includes('not in this room')) {
        localStorage.removeItem('khoti_room');
        navigate('/');
      }
      */
      // NEW CODE: Use toast notification instead of native alert
      addToast(data.message, 'error');
      if (data.message.includes('not found') || data.message.includes('not in this room')) {
        localStorage.removeItem('khoti_room');
        navigate('/');
      }
    });

    // NEW CODE: Listen for player offline/leave socket events to inform remaining players
    socket.on('player_offline', (data) => {
      addToast('A player went offline', 'info');
    });

    socket.on('player_left', (data) => {
      addToast('A player left the room', 'info');
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
      socket.off('player_offline');
      socket.off('player_left');
      socket.off('connect_error');
    };
  }, [navigate, addToast]);

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
    localStorage.removeItem('khoti_player');
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
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      <div className="portrait-overlay">
        <div className="portrait-overlay-icon">📱</div>
        <h2>Please Rotate Your Device</h2>
        <p>Khoti is best played in landscape mode.</p>
      </div>
      <Router>
        <AppContent addToast={addToast} />
      </Router>
    </>
  );
}

export default App;

