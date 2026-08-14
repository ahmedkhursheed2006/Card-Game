// audioManager.js
// ─── Sound System for Khoti ─────────────────────────────────────────────────
//
// Handles UI click sounds and the in-game Sound Board.
// Sound board files live in client/public/sounds/ subdirectories.
//
// Directories:
//   coreSounds/      — UI interaction sounds (click, swipe, draw)
//   cidSounds/       — CID meme sounds
//   desiSounds/      — Desi meme sounds
//   gameSoundEffects/ — Game SFX meme sounds

/*
OLD CODE (Core + Situational sound system with taunts):
const coreSounds = {
  draw:    new Audio('/sounds/coreSounds/swipe.mp3'),
  place:   new Audio('/sounds/place.mp3'),
  capture: new Audio('/sounds/capture.mp3'),
  win:     new Audio('/sounds/win.mp3'),
  lose:    new Audio('/sounds/lose.mp3'),
  click:   new Audio('/sounds/coreSounds/draw.mp3'),
};
const situationalSounds = {
  lock:       new Audio('/sounds/lock.mp3'),
  steal:      new Audio('/sounds/steal.mp3'),
  chain:      new Audio('/sounds/chain.mp3'),
  empty_deck: new Audio('/sounds/empty_deck.mp3'),
};
export const playTaunt = (soundName) => { ... };
*/

// ─── Core UI Sounds ──────────────────────────────────────────────────────────
// Only the click sound is kept for UI interactions (draw, place card actions)

const coreSounds = {
  click: new Audio('/sounds/coreSounds/draw.mp3'),
  draw:  new Audio('/sounds/coreSounds/swipe.mp3'),
};

Object.values(coreSounds).forEach(audio => { audio.volume = 0.5; });

// ─── Mute State ───────────────────────────────────────────────────────────────

let isMuted = false;

// ─── Internal Helper ─────────────────────────────────────────────────────────

/**
 * Resets and plays an Audio element. Catches errors silently.
 *
 * @param {HTMLAudioElement} audio     - The Audio element to play.
 * @param {string}           soundName - Name for the warning log if it fails.
 */
function playAudio(audio, soundName) {
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(err => {
    console.warn(`[Audio] Could not play "${soundName}":`, err.message);
  });
}

// ─── Sound Board Registry ────────────────────────────────────────────────────
// Maps directory names to their sound files for the SoundBoard component.
// Each category contains { id, label, path } entries.

export const soundCategories = {
  cidSounds: {
    label: 'CID',
    sounds: [
      { id: 'cid-1', label: 'Bkchodi Mt Kar', path: '/sounds/cidSounds/cid-1.mp3' },
      { id: 'cid-2', label: 'Chodu CID', path: '/sounds/cidSounds/cid-2.mp3' },
      { id: 'cid-3', label: 'ACP MC', path: '/sounds/cidSounds/cid-3.mp3' },
      { id: 'cid-4', label: 'Le MDC', path: '/sounds/cidSounds/cid-4.mp3' },
      { id: 'cid-5', label: 'Gand Pe Repta', path: '/sounds/cidSounds/cid-5.mp3' },
      { id: 'cid-6', label: 'Kyu Re MC', path: '/sounds/cidSounds/cid-6.mp3' },
      { id: 'cid-7', label: 'Nikal Jao', path: '/sounds/cidSounds/cid-7.mp3' },
      { id: 'cid-8', label: 'Maiya Chodta', path: '/sounds/cidSounds/cid-8.mp3' },
      { id: 'cid-9', label: 'Whoooo Yelee', path: '/sounds/cidSounds/cid-9.mp3' },
    ]
  },
  desiSounds: {
    label: 'Desi',
    sounds: [
      { id: 'desi-1', label: 'Aree Bas Kar', path: '/sounds/desiSounds/desi-1.mp3' },
      { id: 'desi-2', label: 'Chachaa', path: '/sounds/desiSounds/desi-2.mp3' },
      { id: 'desi-3', label: 'Gop Gop Gop', path: '/sounds/desiSounds/desi-3.mp3' },
      { id: 'desi-4', label: 'Jo Gareeb Hove', path: '/sounds/desiSounds/desi-4.mp3' },
      { id: 'desi-5', label: 'Kis Color Chaddi', path: '/sounds/desiSounds/desi-5.mp3' },
      { id: 'desi-6', label: 'Kwebbelkop Laugh', path: '/sounds/desiSounds/desi-6.mp3' },
      { id: 'desi-7', label: 'Tum Dum Tedau', path: '/sounds/desiSounds/desi-7.mp3' },
    ]
  },
  gameSoundEffects: {
    label: 'Game SFX',
    sounds: [
      { id: 'sfx-1', label: 'Among Us', path: '/sounds/gameSoundEffects/sfx-1.mp3' },
      { id: 'sfx-2', label: 'Chicken Scream', path: '/sounds/gameSoundEffects/sfx-2.mp3' },
      { id: 'sfx-3', label: 'Dun Dun Dun', path: '/sounds/gameSoundEffects/sfx-3.mp3' },
      { id: 'sfx-4', label: 'Fahhh', path: '/sounds/gameSoundEffects/sfx-4.mp3' },
      { id: 'sfx-5', label: 'FAHHHHHH', path: '/sounds/gameSoundEffects/sfx-5.mp3' },
      { id: 'sfx-6', label: 'Gunshot', path: '/sounds/gameSoundEffects/sfx-6.mp3' },
      { id: 'sfx-7', label: 'Hub Intro', path: '/sounds/gameSoundEffects/sfx-7.mp3' },
      { id: 'sfx-8', label: 'Mac Quack', path: '/sounds/gameSoundEffects/sfx-8.mp3' },
      { id: 'sfx-9', label: 'Pew Pew', path: '/sounds/gameSoundEffects/sfx-9.mp3' },
      { id: 'sfx-10', label: 'Spiderman', path: '/sounds/gameSoundEffects/sfx-10.mp3' },
      { id: 'sfx-11', label: 'YOOOOOO', path: '/sounds/gameSoundEffects/sfx-11.mp3' },
    ]
  }
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Plays a core UI sound (click, draw).
 *
 * @param {'click'|'draw'} soundName
 */
export const playSound = (soundName) => {
  if (isMuted) return;
  playAudio(coreSounds[soundName], soundName);
};

/**
 * Plays a sound board sound by its file path.
 * Used when receiving a 'play_board_sound' socket event from another player.
 *
 * @param {string} soundPath - The public path to the sound file.
 */
export const playBoardSound = (soundPath) => {
  if (isMuted) return;
  const audio = new Audio(soundPath);
  audio.volume = 0.7;
  audio.play().catch(err => {
    console.warn(`[Audio] Could not play board sound "${soundPath}":`, err.message);
  });
};

/**
 * Toggles the global mute state for all sounds.
 *
 * @param {boolean} muted - True to mute everything, false to unmute.
 */
export const setMuted = (muted) => {
  isMuted = Boolean(muted);
};

/**
 * Returns the current global mute state.
 *
 * @returns {boolean}
 */
export const getMuted = () => isMuted;
