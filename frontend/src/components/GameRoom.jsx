import React, { useRef, useEffect, useState } from 'react';
import { useSocket } from '../services/SocketContext';
import Canvas from './Canvas';
import ChatPanel from './ChatPanel';
import { Pencil, Award, Trophy, Trash2, Volume2, VolumeX, LogOut } from 'lucide-react';
import confetti from 'canvas-confetti';


// Sound utility using Web Audio API (no external assets needed)
const playSound = (type, muted) => {
  if (muted) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'correct') {
      // High pitch double beep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'tick') {
      // Woodblock clock tick
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'win') {
      // Arpeggio
      const notes = [261.63, 329.63, 392.00, 523.25]; // C major
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.4);
      });
    }
  } catch (e) {
    console.error('Audio playback blocked or failed', e);
  }
};

export default function GameRoom({ roomId, playerId }) {
  const {
    players,
    gameState,
    chatMessages,
    sendChatMessage,
    kickPlayer,
    resetRoom
  } = useSocket();

  const [messageText, setMessageText] = useState('');
  const [muted, setMuted] = useState(false);
  const chatEndRef = useRef(null);

  const currentPlayer = players.find(p => p.id === playerId);
  const isDrawer = gameState.drawerId === playerId;
  const isHost = currentPlayer?.isHost;

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Trigger sound effect on correct guess or game over
  useEffect(() => {
    const lastMsg = chatMessages[chatMessages.length - 1];
    if (lastMsg && lastMsg.sender === 'System') {
      if (lastMsg.text.includes('guessed the word')) {
        playSound('correct', muted);
      }
    }
  }, [chatMessages, muted]);

  // Clock tick on low time
  useEffect(() => {
    if (gameState.phase === 'drawing' && gameState.timeLeft <= 10 && gameState.timeLeft > 0) {
      playSound('tick', muted);
    }
  }, [gameState.timeLeft, gameState.phase, muted]);

  // Confetti on win / Game Over
  useEffect(() => {
    if (gameState.phase === 'game_over') {
      playSound('win', muted);

      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [gameState.phase, muted]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    sendChatMessage(messageText);
    setMessageText('');
  };

  // Sort players dynamically for the scoreboard
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="game-room-grid select-none">

      {/* 1. Scoreboard (Left Panel) */}
      <div className="scoreboard-panel-card">
        <div className="scoreboard-header">
          <span className="scoreboard-title">Scoreboard</span>
          <button
            onClick={() => setMuted(!muted)}
            className="btn-mute-sound"
            title={muted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>

        <div className="scoreboard-list-scroll">
          {sortedPlayers.map((player, index) => {
            const isPlayerDrawer = gameState.drawerId === player.id;
            const isSelf = player.id === playerId;

            return (
              <div
                key={player.id}
                className={`scoreboard-item-row ${
                  isSelf
                    ? 'self'
                    : isPlayerDrawer
                      ? 'drawer'
                      : player.hasGuessed
                        ? 'guessed'
                        : 'default'
                }`}
              >
                <div className="player-info-meta">
                  {/* Avatar / Rank */}
                  <div
                    className="scoreboard-avatar-wrap"
                    style={{
                      backgroundColor: player.avatar?.startsWith('#') ? player.avatar : 'transparent',
                      backgroundImage: player.avatar?.startsWith('#') ? 'none' : `url(${player.avatar})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    {player.avatar?.startsWith('#') ? (
                      index + 1
                    ) : (
                      <span className="scoreboard-rank-tag">
                        {index + 1}
                      </span>
                    )}
                  </div>

                  <div className="scoreboard-user-details">
                    <div className="scoreboard-name-flex">
                      <span className="scoreboard-username">
                        {player.name}
                      </span>
                      {isSelf && (
                        <span className="self-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--emerald-400)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                          You
                        </span>
                      )}
                      {isPlayerDrawer && (
                        <Pencil size={11} className="text-indigo-400 shrink-0" />
                      )}
                    </div>
                    <span className="scoreboard-score-sub">{player.score} pts</span>
                  </div>
                </div>

                {/* Score & guess badges */}
                <div className="scoreboard-item-right">
                  {player.roundScore > 0 && (
                    <span className="round-score-earned">
                      +{player.roundScore}
                    </span>
                  )}
                  {player.hasGuessed && (
                    <span className="guess-ping-dot animate-ping" />
                  )}
                  {isHost && player.id !== playerId && (
                    <button
                      onClick={() => kickPlayer(player.id)}
                      className="btn-kick-player"
                      title="Kick Player"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Main Game Arena (Center Panel) */}
      <div className="arena-column-wrapper">
        {/* Header - Game stats, Hints, Timer */}
        <div className="arena-header-stats">
          <div className="arena-round-meta">
            <span className="arena-round-subtitle">
              Round {gameState.round} of {gameState.totalRounds}
            </span>
            <span className="arena-round-title">
              {gameState.phase === 'word_selection' ? 'WORD SELECTION' : 'DRAW & GUESS'}
            </span>
          </div>

          {/* Letter Hints */}
          <div className="arena-hint-section">
            {gameState.phase === 'drawing' && (
              <>
                <span className="arena-hint-label">
                  {isDrawer ? 'YOUR WORD TO DRAW' : 'GUESS THE WORD'}
                </span>
                <span className="arena-hint-word">
                  {isDrawer ? gameState.selectedWord.toUpperCase() : gameState.hintState.toUpperCase()}
                </span>
              </>
            )}
            {gameState.phase === 'word_selection' && (
              <span className="arena-word-choosing animate-pulse">
                CHOOSING WORD...
              </span>
            )}
            {gameState.phase === 'round_end' && (
              <span className="arena-round-ended-banner">
                ROUND ENDED
              </span>
            )}
          </div>

          {/* Timer Display */}
          <div className="timer-indicator-wrapper">
            <div className={`timer-badge-circle ${gameState.timeLeft <= 15 ? 'urgent animate-pulse' : 'normal'}`}>
              {gameState.timeLeft}
            </div>
          </div>
        </div>

        {/* Drawing Canvas Area */}
        <div className="canvas-wrapper-layout">
          <Canvas isDrawer={isDrawer} />
        </div>
      </div>

      {/* 3. Live Chat & Guessing (Right Panel) */}
      <ChatPanel
        chatMessages={chatMessages}
        messageText={messageText}
        setMessageText={setMessageText}
        handleSend={handleSend}
        chatEndRef={chatEndRef}
      />


      {/* Overlays (Round End & Game Over) */}

      {/* A. Round End Overlay */}
      {gameState.phase === 'round_end' && (
        <div className="overlay-full-fixed animate-fade-in">
          <div className="overlay-modal-card animate-scale-in">
            <Award className="text-yellow-400 mx-auto mb-4 animate-bounce" size={48} />
            <h2 className="overlay-card-title">Round Finished!</h2>
            <p className="overlay-card-subtitle">
              The correct word was:
            </p>
            <span className="overlay-highlight-word">
              {gameState.hintState}
            </span>
            <div className="overlay-leaderboard-box">
              <span className="overlay-leaderboard-label">
                Round Scores
              </span>
              {[...players].sort((a, b) => b.score - a.score).map(p => (
                <div key={p.id} className="overlay-score-row">
                  <span className="overlay-score-left">
                    <span>{p.name}</span>
                    {p.id === playerId && (
                      <span className="self-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--emerald-400)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                        You
                      </span>
                    )}
                  </span>
                  <span className="text-emerald-400">+{p.roundScore || 0} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* B. Game Over Overlay */}
      {gameState.phase === 'game_over' && (
        <div className="overlay-full-fixed animate-fade-in">
          <div className="overlay-modal-card animate-scale-in">
            <Trophy className="text-yellow-400 mx-auto mb-4 animate-pulse" size={56} />
            <h2 className="overlay-card-title" style={{ fontSize: '1.875rem' }}>Game Over!</h2>
            <p className="overlay-winner-text">
              Winner is <span className="overlay-winner-name">{gameState.winner}</span>!
            </p>

            <div className="overlay-leaderboard-box" style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '1.5rem' }}>
              <span className="overlay-leaderboard-label">
                Leaderboard
              </span>
              {gameState.leaderboard.map((item, idx) => (
                <div key={item.id} className="overlay-score-row">
                  <span className="overlay-score-left">
                    <span className="overlay-rank-num">#{idx + 1}</span>
                    <span>{item.name}</span>
                  </span>
                  <span className="font-bold text-white">{item.score} pts</span>
                </div>
              ))}
            </div>

            {isHost ? (
              <button
                onClick={resetRoom}
                className="btn-overlay-action"
              >
                <LogOut size={16} />
                <span>Return to Lobby</span>
              </button>
            ) : (
              <p className="action-subtext" style={{ fontSize: '0.75rem' }}>
                Waiting for the host to return everyone to the lobby.
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
