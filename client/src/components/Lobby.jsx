import React, { useState } from "react";
import { socket } from "../socket";

const Lobby = ({ room }) => {
  const isAdmin = room.adminId === socket.id;
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleStart = () => {
    socket.emit("start_game", { roomCode: room.roomCode });
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const handleCopyLink = async () => {
    try {
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      // Ensure the baseUrl doesn't have a trailing slash before appending the roomCode
      const link = `${baseUrl.replace(/\/$/, "")}/${room.roomCode}`;
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link: ", err);
    }
  };

  const updateDecks = (val) => {
    socket.emit("update_settings", {
      roomCode: room.roomCode,
      settings: { numDecks: parseInt(val) },
    });
  };

  const updateDeckDeal = (val) => {
    socket.emit("update_settings", {
      roomCode: room.roomCode,
      settings: { deckDeal: parseInt(val) },
    });
  };

  const handleAddBot = () => {
    socket.emit("add_bot", { roomCode: room.roomCode });
  };

  const handleRemoveBot = (botId) => {
    socket.emit("remove_bot", { roomCode: room.roomCode, botId });
  };

  return (
    <div
      className="flex-center"
      style={{ height: "100vh", backgroundImage: "url(/background.jpg)" }}
    >
      {/* Tailwind class leftover flagged as per requirements: 'h-full' */}
      <div
        className="glass h-full"
        style={{ width: "100%", maxWidth: "800px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "2.5rem", fontWeight: 700 }}>GAME LOBBY</h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "15px",
                marginTop: "5px",
              }}
            >
              <p
                style={{
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  margin: 0,
                }}
              >
                Room Code:
                <span
                  style={{
                    color: "var(--primary)",
                    fontWeight: 800,
                    letterSpacing: "1px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "rgba(46, 204, 113, 0.1)",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    transition: "background 0.2s",
                  }}
                  onClick={handleCopyCode}
                  title="Click to copy room code"
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(46, 204, 113, 0.2)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(46, 204, 113, 0.1)")
                  }
                >
                  {codeCopied ? "COPIED!" : room.roomCode}
                  {codeCopied ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="9"
                        y="9"
                        width="13"
                        height="13"
                        rx="2"
                        ry="2"
                      ></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  )}
                </span>
              </p>

              <button
                onClick={handleCopyLink}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.2)",
                  padding: "4px 12px",
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  boxShadow: "none",
                }}
                title="Copy full invite link"
              >
                {linkCopied ? (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                    Copy Link
                  </>
                )}
              </button>
            </div>
          </div>
          <div
            style={{
              background: "var(--primary)",
              color: "white",
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "0.8rem",
              fontWeight: 700,
            }}
          >
            {room.players.length} PLAYERS
          </div>
        </div>

        <div style={{ width: "100%", gap: "1.875rem", display: "flex", justifyContent: "flex-start", alignItems: "flex-start"  }}>
          <div style={{ marginBottom: "30px", flex: "0 0 240px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h3
                style={{
                  fontSize: "0.9rem",
                  color: "var(--text-muted)",
                  margin: 0,
                  textTransform: "uppercase",
                }}
              >
                Players Ready
              </h3>
              {isAdmin && room.players.length < room.settings.maxPlayers && (
                <button
                  onClick={handleAddBot}
                  style={{
                    padding: "4px 10px",
                    fontSize: "0.75rem",
                    background: "rgba(142, 68, 173, 0.3)",
                    border: "1px solid rgba(142, 68, 173, 0.6)",
                    color: "white",
                    borderRadius: "6px",
                    cursor: "pointer",
                    boxShadow: "none"
                  }}
                  title="Add AI Bot player"
                >
                  🤖 + BOT
                </button>
              )}
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px", overflow: "scroll", scrollbarWidth: "none" }}
            >
              {room.players.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "rgba(255,255,255,0.05)",
                    padding: "10px 15px",
                    borderRadius: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      background: p.connected ? "var(--primary)" : "#555",
                      borderRadius: "50%",
                    }}
                  />
                  <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                    {p.name}
                    {p.isBot && <span style={{ fontSize: "0.85rem" }}>🤖</span>}
                  </span>
                  {p.isAdmin && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        background: "var(--gold)",
                        color: "black",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        marginLeft: "auto",
                        fontWeight: 800,
                      }}
                    >
                      ADMIN
                    </span>
                  )}
                  {p.isBot && isAdmin && (
                    <button
                      onClick={() => handleRemoveBot(p.id)}
                      style={{
                        marginLeft: "auto",
                        background: "rgba(231, 76, 60, 0.2)",
                        border: "1px solid rgba(231, 76, 60, 0.5)",
                        color: "#e74c3c",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "0.7rem",
                        cursor: "pointer",
                        boxShadow: "none"
                      }}
                      title="Remove Bot"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}
            >
              <div>
                <label
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    display: "block",
                  }}
                >
                  NUMBER OF DECKS: {room.settings.numDecks}
                </label>
                {/* 
                  OLD CODE: Interactive for everyone, triggering server error alert for non-admin
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={room.settings.numDecks}
                    onChange={(e) => updateDecks(e.target.value)}
                    style={{ width: "100%", cursor: "pointer" }}
                  />
                */}
                {/* NEW CODE: Read-only range input for non-admins to prevent accidental alert popups */}
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={room.settings.numDecks}
                  disabled={!isAdmin}
                  onChange={(e) => isAdmin && updateDecks(e.target.value)}
                  style={{ width: "100%", cursor: isAdmin ? "pointer" : "not-allowed", opacity: isAdmin ? 1 : 0.6 }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    display: "block",
                  }}
                >
                  MAX PLAYERS: {room.settings.maxPlayers}
                </label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={room.settings.maxPlayers}
                  disabled={!isAdmin}
                  onChange={(e) =>
                    isAdmin && socket.emit("update_settings", {
                      roomCode: room.roomCode,
                      settings: { maxPlayers: parseInt(e.target.value) },
                    })
                  }
                  style={{ width: "100%", cursor: isAdmin ? "pointer" : "not-allowed", opacity: isAdmin ? 1 : 0.6 }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    display: "block",
                  }}
                >
                  STARTING CARDS: {room.settings.deckDeal}
                </label>
                <input
                  type="range"
                  min="4"
                  max="10"
                  value={room.settings.deckDeal}
                  disabled={!isAdmin}
                  onChange={(e) => isAdmin && updateDeckDeal(e.target.value)}
                  style={{ width: "100%", cursor: isAdmin ? "pointer" : "not-allowed", opacity: isAdmin ? 1 : 0.6 }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <label
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    fontWeight: 700,
                  }}
                >
                  USE JOKERS
                </label>
                <input
                  type="checkbox"
                  checked={room.settings.useJokers || false}
                  disabled={!isAdmin}
                  onChange={(e) =>
                    isAdmin && socket.emit("update_settings", {
                      roomCode: room.roomCode,
                      settings: { useJokers: e.target.checked },
                    })
                  }
                  style={{ cursor: isAdmin ? "pointer" : "not-allowed", width: "20px", height: "20px", opacity: isAdmin ? 1 : 0.6 }}
                />
              </div>
              {/* 
                OLD CODE: Room Theme Selector (Feature removed as per feedback)
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "10px", fontWeight: 700 }}>
                    ROOM THEME
                  </label>
                  <select value={room.settings.theme || "dark"} ...>...</select>
                </div>
              */}
              {isAdmin ? (
                <button
                  disabled={room.players.length < 2}
                  onClick={handleStart}
                  style={{ width: "100%", padding: "18px" }}
                >
                  START GAME
                </button>
              ) : (
                <div
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "var(--text-muted)",
                    textAlign: "center",
                    fontSize: "0.9rem",
                    fontWeight: 600
                  }}
                >
                  Waiting for Admin to start the game...
                </div>
              )}
              {room.players.length < 2 && isAdmin && (
                <p
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--accent)",
                    textAlign: "center",
                  }}
                >
                  Need at least 2 players to start
                </p>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
