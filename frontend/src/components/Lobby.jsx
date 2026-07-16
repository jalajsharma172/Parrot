import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../services/SocketContext';
import { Copy, Check, Play, Shield, CheckCircle2, Circle, MessageSquare } from 'lucide-react';

export default function Lobby({ roomId, playerId }) {
  const {
    roomSettings,
    players,
    toggleReady,
    updateSettings,
    startGame,
    chatMessages,
    sendChatMessage
  } = useSocket();

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [chatText, setChatText] = useState('');
  const chatEndRef = useRef(null);

  const currentPlayer = players.find(p => p.id === playerId);
  const isHost = currentPlayer?.isHost;

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSettingChange = (key, value) => {
    if (!isHost) return;
    updateSettings({ [key]: value });
  };

  const handleStartGame = async () => {
    setError('');
    const res = await startGame();
    if (!res.success) {
      setError(res.reason);
    }
  };

  // Determine if host can start the game
  // Need at least 2 players and everyone must be ready
  const canStart = players.length >= 2 && players.every(p => p.isReady);

  return (
    <div className="lobby-grid-layout animate-fade-in select-none">

      {/* 1. Players Column */}
      <div className="lobby-panel-card">
        <div className="panel-header-row">
          <div className="panel-header-title">
            <UsersIcon />
            <h2 className="text-base font-bold text-white">Players</h2>
          </div>
          <span className="panel-count-badge">
            {players.length} / {roomSettings?.maxPlayers || 10}
          </span>
        </div>

        {error && (
          <div className="error-banner animate-pulse" style={{ marginBottom: '0.75rem' }}>
            {error}
          </div>
        )}

        {/* List of Players */}
        <div className="panel-scroll-list">
          {players.map((player) => (
            <div
              key={player.id}
              className="player-lobby-row"
            >
              <div className="player-info-meta">
                <div
                  className="player-avatar-circle"
                  style={{
                    backgroundColor: player.avatar?.startsWith('#') ? player.avatar : 'transparent',
                    backgroundImage: player.avatar?.startsWith('#') ? 'none' : `url(${player.avatar})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {player.avatar?.startsWith('#') && player.name.charAt(0).toUpperCase()}
                </div>
                <div className="player-name-wrapper">
                  <div className="player-name-flex">
                    <span className="player-name-text">
                      {player.name}
                    </span>
                    {player.isHost && (
                      <Shield className="text-amber-500 shrink-0" size={12} title="Lobby Host" />
                    )}
                    {player.id === playerId && (
                      <span className="self-badge">
                        You
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ready indicator */}
              <div className="ready-state-badge">
                {!roomSettings?.isPublic && (
                  player.isReady ? (
                    <span className="badge-ready">
                      <CheckCircle2 size={11} />
                      Ready
                    </span>
                  ) : (
                    <span className="badge-waiting">
                      <Circle size={11} />
                      Waiting
                    </span>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="divider-line" />

        {/* Action buttons for Ready & Start */}
        <div className="action-buttons-wrapper" style={{ width: '100%' }}>
          {roomSettings?.isPublic ? (
            players.length < 2 ? (
              <div className="lobby-status-banner" style={{ padding: '0.875rem', backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', width: '100%' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--slate-300)', margin: 0 }}>
                  No other players are currently in the room. Waiting for players to join...
                </p>
              </div>
            ) : (
              <div className="lobby-status-banner" style={{ padding: '0.875rem', backgroundColor: 'rgba(5, 150, 105, 0.2)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center', width: '100%' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--emerald-400)', margin: 0 }}>
                  Players found! Starting game...
                </p>
              </div>
            )
          ) : (
            <>
              <div className="lobby-buttons-row">
                <button
                  onClick={toggleReady}
                  className={`btn-3d ${currentPlayer?.isReady ? 'btn-3d-slate' : 'btn-3d-green'}`}
                  style={{ fontSize: '0.75rem', padding: '0.625rem 0.75rem' }}
                >
                  {currentPlayer?.isReady ? 'Unready' : 'Ready Up'}
                </button>

                {isHost && (
                  <button
                    onClick={handleStartGame}
                    disabled={!canStart}
                    className={`btn-3d ${canStart ? 'btn-3d-purple' : 'btn-3d-slate'}`}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.625rem 0.75rem',
                      opacity: canStart ? 1 : 0.5,
                      cursor: canStart ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.375rem'
                    }}
                  >
                    <Play size={14} />
                    <span>Start Game</span>
                  </button>
                )}
              </div>

              {!isHost && (
                <p className="action-subtext">
                  Waiting for the host to adjust settings and start the game.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2. Invite & Settings Column (Vertically Stacked) */}
      <div className="lobby-settings-col">

        {/* Invite link card */}
        {!roomSettings?.isPublic && (
          <div className="invite-friends-panel">
            <h3 className="invite-friends-title">Invite Friends</h3>
            <div className="invite-friends-input-row">
              <div className="invite-room-code-tag">
                ROOM CODE: {roomId}
              </div>
              <button
                onClick={handleCopyLink}
                className="btn-invite-copy"
                title="Copy Room Link"
              >
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* Room Settings Panel */}
        <div className="room-settings-panel">
          <h3 className="settings-header-title">
            Room Settings
          </h3>

          {roomSettings ? (
            <div className="settings-fields-scroll">
              {/* Category */}
              <div className="settings-field-group">
                <label className="settings-field-label">
                  Category
                </label>
                <select
                  disabled={!isHost}
                  value={roomSettings.category}
                  onChange={(e) => handleSettingChange('category', e.target.value)}
                  className="settings-select"
                >
                  <option value="Mixed">Mixed Categories</option>
                  <option value="Animals">Animals</option>
                  <option value="Food">Food</option>
                  <option value="Objects">Objects</option>
                  <option value="Places">Places</option>
                  <option value="Actions">Actions</option>
                </select>
              </div>

              {/* Word Mode */}
              <div className="settings-field-group">
                <label className="settings-field-label">
                  Word Mode
                </label>
                <select
                  disabled={!isHost}
                  value={roomSettings.wordMode}
                  onChange={(e) => handleSettingChange('wordMode', e.target.value)}
                  className="settings-select"
                >
                  <option value="Normal">Normal (Hints shown)</option>
                  <option value="Hidden">Hidden (No letter hint)</option>
                </select>
              </div>

              {/* Rounds */}
              <div className="settings-field-group">
                <div className="settings-slider-header">
                  <label className="settings-slider-label">
                    Rounds
                  </label>
                  <span className="settings-slider-value">{roomSettings.rounds}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  disabled={!isHost}
                  value={roomSettings.rounds}
                  onChange={(e) => handleSettingChange('rounds', e.target.value)}
                  className="settings-slider-input"
                />
              </div>

              {/* Draw Time */}
              <div className="settings-field-group">
                <div className="settings-slider-header">
                  <label className="settings-slider-label">
                    Draw Time (s)
                  </label>
                  <span className="settings-slider-value">{roomSettings.drawTime}s</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="240"
                  step="15"
                  disabled={!isHost}
                  value={roomSettings.drawTime}
                  onChange={(e) => handleSettingChange('drawTime', e.target.value)}
                  className="settings-slider-input"
                />
              </div>

              {/* Hints */}
              {roomSettings.wordMode !== 'Hidden' && (
                <div className="settings-field-group">
                  <div className="settings-slider-header">
                    <label className="settings-slider-label">
                      Max Hints
                    </label>
                    <span className="settings-slider-value">{roomSettings.hints}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    disabled={!isHost}
                    value={roomSettings.hints}
                    onChange={(e) => handleSettingChange('hints', e.target.value)}
                    className="settings-slider-input"
                  />
                </div>
              )}

              {/* Max Players */}
              <div className="settings-field-group">
                <div className="settings-slider-header">
                  <label className="settings-slider-label">
                    Max Players
                  </label>
                  <span className="settings-slider-value">{roomSettings.maxPlayers}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="20"
                  disabled={!isHost}
                  value={roomSettings.maxPlayers}
                  onChange={(e) => handleSettingChange('maxPlayers', e.target.value)}
                  className="settings-slider-input"
                />
              </div>
            </div>
          ) : (
            <div className="no-suggestions-text animate-pulse">
              Loading settings...
            </div>
          )}
        </div>
      </div>

      {/* 3. Lobby Chat Column */}
      <div className="lobby-chat-panel">
        <div className="chat-header-row">
          <MessageSquare size={18} />
          <span className="chat-header-text">Lobby Chat</span>
        </div>

        {/* Messages Container */}
        <div className="chat-message-log">
          {chatMessages.map((msg) => {
            const isSystem = msg.type === "system" || msg.sender === "System";
            return (
              <div key={msg.id} className={isSystem ? "chat-system-message" : "chat-bubble-row"}>
                {!isSystem && (
                  <span className="chat-sender">{msg.sender}:</span>
                )}
                <span>{msg.text}</span>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Predefined Quick Comments */}
        <div className="quick-chat-container">
          <span className="quick-chat-title">Quick Chat:</span>
          {[
            "Host, please ready up / start!",
            "Everyone ready up!",
            "Hello players!",
            "Let's play!",
            "Just a sec..."
          ].map((comment) => (
            <button
              key={comment}
              type="button"
              onClick={() => sendChatMessage(comment)}
              className="btn-quick-comment"
            >
              {comment}
            </button>
          ))}
        </div>

        {/* Chat Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (chatText.trim()) {
              sendChatMessage(chatText);
              setChatText('');
            }
          }}
          className="chat-input-form"
        >
          <input
            type="text"
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            placeholder="Type your message..."
            className="chat-text-input"
          />
          <button
            type="submit"
            className="btn-chat-send"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

// Simple internal icon component since Lucide Users wasn't loaded directly
function UsersIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-indigo-400"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
