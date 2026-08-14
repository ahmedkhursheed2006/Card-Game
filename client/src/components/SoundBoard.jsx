import React, { useState, useCallback } from 'react';
import { socket } from '../socket';
import { soundCategories, playBoardSound } from '../utils/audioManager';

/**
 * SoundBoard
 * ─────────────────────────────────────────────────────────────────────────────
 * A floating panel with tabbed navigation for playing meme sounds during the game.
 * Sounds are organized into categories (CID, Desi, Game SFX).
 * Features a 10-second anti-spam cooldown per player and a mute toggle.
 *
 * Props:
 *  - roomCode     {string}   : Current room code for socket emission
 *  - onClose      {function} : Callback to close the panel
 *  - isMuted      {boolean}  : Global mute state
 *  - onToggleMute {function} : Callback to toggle mute
 */
const SoundBoard = ({ roomCode, onClose, isMuted, onToggleMute }) => {
  const categoryKeys = Object.keys(soundCategories);
  const [activeTab, setActiveTab] = useState(categoryKeys[0]);
  const [cooldown, setCooldown] = useState(false);
  const [cooldownTimer, setCooldownTimer] = useState(0);

  const handlePlaySound = useCallback((sound) => {
    if (cooldown) return;

    // Emit to server so all players hear it
    socket.emit('play_board_sound', {
      roomCode,
      soundPath: sound.path,
      soundLabel: sound.label,
    });

    // Play locally immediately
    playBoardSound(sound.path);

    // Start 10-second cooldown
    setCooldown(true);
    setCooldownTimer(10);

    const interval = setInterval(() => {
      setCooldownTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCooldown(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [cooldown, roomCode]);

  const activeCategory = soundCategories[activeTab];

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      right: '20px',
      width: '340px',
      maxHeight: '420px',
      background: 'rgba(15, 15, 20, 0.96)',
      border: '1.5px solid rgba(255,255,255,0.12)',
      borderRadius: '18px',
      zIndex: 8000,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backdropFilter: 'blur(16px)',
      boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.1rem' }}>🔊</span>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>Sound Board</span>
          {cooldown && (
            <span style={{
              fontSize: '0.7rem',
              color: 'var(--accent)',
              fontWeight: 700,
              background: 'rgba(231,76,60,0.2)',
              padding: '2px 8px',
              borderRadius: '10px',
            }}>
              {cooldownTimer}s
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Mute Toggle */}
          <button
            onClick={onToggleMute}
            style={{
              background: isMuted ? 'rgba(231,76,60,0.3)' : 'rgba(46,204,113,0.2)',
              border: `1px solid ${isMuted ? 'rgba(231,76,60,0.5)' : 'rgba(46,204,113,0.4)'}`,
              color: isMuted ? '#e74c3c' : '#2ecc71',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'none',
            }}
          >
            {isMuted ? '🔇 MUTED' : '🔊 ON'}
          </button>
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              borderRadius: '8px',
              padding: '4px 8px',
              fontSize: '1rem',
              cursor: 'pointer',
              lineHeight: 1,
              boxShadow: 'none',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {categoryKeys.map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              flex: 1,
              padding: '10px 0',
              background: activeTab === key ? 'rgba(46,204,113,0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === key ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === key ? 'var(--primary)' : 'rgba(255,255,255,0.5)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: 'none',
              borderRadius: 0,
            }}
          >
            {soundCategories[key].label}
          </button>
        ))}
      </div>

      {/* Sound Grid */}
      <div style={{
        padding: '12px',
        overflowY: 'auto',
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        alignContent: 'start',
      }}>
        {activeCategory.sounds.map((sound) => (
          <button
            key={sound.id}
            onClick={() => handlePlaySound(sound)}
            disabled={cooldown}
            style={{
              padding: '10px 6px',
              background: cooldown ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              color: cooldown ? 'rgba(255,255,255,0.3)' : 'white',
              fontSize: '0.68rem',
              fontWeight: 600,
              cursor: cooldown ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              textAlign: 'center',
              lineHeight: 1.3,
              wordBreak: 'break-word',
              boxShadow: 'none',
            }}
            onMouseEnter={(e) => {
              if (!cooldown) {
                e.currentTarget.style.background = 'rgba(46,204,113,0.15)';
                e.currentTarget.style.borderColor = 'rgba(46,204,113,0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = cooldown ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            }}
          >
            {sound.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SoundBoard;
