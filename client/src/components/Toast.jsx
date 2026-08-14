import React, { useState, useEffect, useCallback } from 'react';

// ─── Toast (single notification) ─────────────────────────────────────────────

/**
 * Toast — A single auto-dismissing notification pill.
 * Slides in from the right on mount, slides out before being removed.
 *
 * Props:
 *  - id        {string}   : Unique key for this toast
 *  - message   {string}   : Text to display
 *  - type      {string}   : 'error' | 'success' | 'info'  (default: 'info')
 *  - onDismiss {function} : Called with (id) when the toast should be removed
 */
const Toast = ({ id, message, type = 'info', onDismiss }) => {
  const [visible, setVisible] = useState(false);

  // Trigger slide-in on mount, auto-dismiss after 3.5 s
  useEffect(() => {
    const showFrame = requestAnimationFrame(() => setVisible(true));

    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(id), 320); // Wait for slide-out transition
    }, 3500);

    return () => {
      cancelAnimationFrame(showFrame);
      clearTimeout(hideTimer);
    };
  }, [id, onDismiss]);

  // ── Appearance map ───────────────────────────────────────────────────────
  const styles = {
    error:   { bg: 'rgba(231, 76, 60, 0.92)',   border: '#e74c3c',                icon: '⚠️' },
    success: { bg: 'rgba(46, 204, 113, 0.92)',  border: '#2ecc71',                icon: '✅' },
    info:    { bg: 'rgba(30, 39, 46, 0.95)',     border: 'rgba(255,255,255,0.15)', icon: 'ℹ️' },
  };

  const s = styles[type] ?? styles.info;

  return (
    <div
      onClick={() => {
        setVisible(false);
        setTimeout(() => onDismiss(id), 320);
      }}
      style={{
        background:     s.bg,
        border:         `1px solid ${s.border}`,
        borderRadius:   '12px',
        padding:        '12px 18px',
        color:          'white',
        fontWeight:     600,
        fontSize:       '0.88rem',
        display:        'flex',
        alignItems:     'center',
        gap:            '10px',
        boxShadow:      '0 4px 24px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(12px)',
        maxWidth:       '320px',
        pointerEvents:  'auto',
        cursor:         'pointer',
        userSelect:     'none',
        // Slide in/out via transform + opacity
        transform:  visible ? 'translateX(0)' : 'translateX(130%)',
        opacity:    visible ? 1 : 0,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
      }}
    >
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{s.icon}</span>
      <span style={{ lineHeight: 1.4 }}>{message}</span>
    </div>
  );
};

// ─── ToastContainer ───────────────────────────────────────────────────────────

/**
 * ToastContainer — Fixed overlay stack that renders all active toasts.
 * Mount once at the root of the app (App.jsx) so it overlays every screen.
 *
 * Props:
 *  - toasts    {Array<{ id, message, type }>} : Active toast list
 *  - onDismiss {function}                     : Called with (id) to remove a toast
 */
export const ToastContainer = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position:      'fixed',
        top:           '20px',
        right:         '20px',
        zIndex:        99999,
        display:       'flex',
        flexDirection: 'column',
        gap:           '10px',
        pointerEvents: 'none', // Container is pass-through; individual toasts handle clicks
      }}
    >
      {toasts.map(t => (
        <Toast
          key={t.id}
          id={t.id}
          message={t.message}
          type={t.type}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};

export default Toast;
