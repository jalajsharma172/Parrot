export class Player {
  constructor(id, socketId, name, avatar = '', isHost = false) {
    this.id = id;
    this.socketId = socketId;
    this.name = name;
    this.avatar = avatar || this.generateDefaultAvatar(name);
    this.score = 0;
    this.roundScore = 0;
    this.isReady = false;
    this.hasGuessed = false;
    this.isDrawing = false;
    this.isHost = isHost;
    this.guessedAt = null;
  }

  generateDefaultAvatar(name) {
    // Generate a simple deterministic avatar color based on name hash
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', 
      '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6'
    ];
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  }

  resetRoundState() {
    this.roundScore = 0;
    this.hasGuessed = false;
    this.guessedAt = null;
    this.isDrawing = false;
  }

  resetGame() {
    this.score = 0;
    this.resetRoundState();
    this.isReady = false;
  }
}
