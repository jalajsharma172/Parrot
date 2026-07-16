import { Game } from './game.js';

export class Room {
  constructor(id, io, initialSettings = {}) {
    this.id = id;
    this.io = io;
    this.players = [];
    this.isPublic = initialSettings.isPublic || false;
    this.settings = {
      maxPlayers: this.isPublic ? 5 : (initialSettings.maxPlayers || 10),
      rounds: initialSettings.rounds || 3,
      drawTime: initialSettings.drawTime || 80,
      wordCount: initialSettings.wordCount || 3,
      hints: initialSettings.hints || 2,
      wordMode: initialSettings.wordMode || 'Normal',
      category: initialSettings.category || 'Mixed',
      isPublic: this.isPublic
    };
    this.game = null;
    this.disconnectedPlayers = new Map();
  }

  addPlayer(player) {
    if (this.players.length >= this.settings.maxPlayers) {
      return { success: false, reason: 'Room is full' };
    }

    // If player has disconnected data in this room, restore their stats
    if (this.disconnectedPlayers.has(player.id)) {
      const restored = this.disconnectedPlayers.get(player.id);
      player.score = restored.score;
      // Only restore host status if there isn't another host currently active
      const hasHost = this.players.some(p => p.isHost);
      player.isHost = hasHost ? false : restored.isHost;
      player.isReady = restored.isReady;
      this.disconnectedPlayers.delete(player.id);
    } else {
      // If room is empty and no restored data, make this player the host
      if (this.players.length === 0) {
        player.isHost = true;
        player.isReady = true; // Host is automatically ready
      }
    }

    if (this.isPublic) {
      player.isReady = true; // Everyone in public rooms is ready by default
    }

    this.players.push(player);
    this.broadcast('player_joined', {
      player: {
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        isHost: player.isHost,
        isReady: player.isReady,
        score: player.score
      },
      players: this.getPlayerList()
    });

    // If game is already running, sync state for this player
    if (this.game && this.game.phase !== 'lobby') {
      // Sync late joiner
      setTimeout(() => {
        const socket = this.io.sockets.sockets.get(player.socketId);
        if (socket) {
          socket.emit('game_sync', {
            phase: this.game.phase,
            round: this.game.round,
            totalRounds: this.game.settings.rounds,
            drawerId: this.game.drawer ? this.game.drawer.id : null,
            drawerName: this.game.drawer ? this.game.drawer.name : '',
            hintState: this.game.hintState,
            timeLeft: this.game.timeLeft,
            drawingStrokes: this.game.drawingStrokes,
            wordOptions: this.game.wordOptions
          });
        }
      }, 500);
    }

    return { success: true };
  }

  removePlayer(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    const removedPlayer = this.players[playerIndex];

    // Save disconnected player's stats to allow reconnecting without losing score
    this.disconnectedPlayers.set(playerId, {
      score: removedPlayer.score,
      isHost: removedPlayer.isHost,
      isReady: removedPlayer.isReady
    });

    this.players.splice(playerIndex, 1);

    // If the drawing player leaves, end round or select next
    if (this.game && this.game.drawer && this.game.drawer.id === playerId) {
      this.game.endTurn();
    }

    // Assign new host if host left
    if (removedPlayer.isHost && this.players.length > 0) {
      this.players[0].isHost = true;
      this.players[0].isReady = true;
    }

    this.broadcast('player_left', {
      playerId: playerId,
      players: this.getPlayerList()
    });

    // Clean up room/game if empty
    if (this.players.length === 0 && this.game) {
      this.game.destroy();
      this.game = null;
    }
  }

  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId);
  }

  getPlayerList() {
    return this.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.isHost,
      isReady: p.isReady,
      score: p.score,
      roundScore: p.roundScore,
      hasGuessed: p.hasGuessed,
      isDrawing: p.isDrawing
    }));
  }

  getScores() {
    return this.players.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      roundScore: p.roundScore,
      hasGuessed: p.hasGuessed
    }));
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.broadcast('settings_updated', { settings: this.settings });
  }

  toggleReady(playerId) {
    if (this.isPublic) return; // No ready up option for public/quick join rooms
    const player = this.getPlayer(playerId);
    if (player) {
      player.isReady = !player.isReady;
      this.broadcast('player_ready_toggle', {
        playerId,
        isReady: player.isReady,
        players: this.getPlayerList()
      });
    }
  }

  async startGame() {
    if (this.players.length < 2) {
      return { success: false, reason: 'At least 2 players are required to start the game' };
    }

    // Check if everyone is ready
    const unreadyPlayers = this.players.filter(p => !p.isReady);
    if (unreadyPlayers.length > 0) {
      return { success: false, reason: 'Waiting for all players to ready up' };
    }

    this.game = new Game(this, this.settings);
    await this.game.start();
    return { success: true };
  }

  resetRoom() {
    if (this.game) {
      this.game.destroy();
      this.game = null;
    }
    this.players.forEach(p => p.resetGame());
    this.broadcast('room_reset', {
      players: this.getPlayerList(),
      settings: this.settings
    });
  }

  broadcast(event, payload) {
    this.io.to(this.id).emit(event, payload);
  }
}
