import { getWordsByCategory } from '../database/db.js';
import { incrementPlayerScore } from '../database/scoreDb.js';

export class Game {
  constructor(room, settings) {
    this.room = room;
    this.settings = {
      maxPlayers: parseInt(settings.maxPlayers) || 10,
      rounds: parseInt(settings.rounds) || 3,
      drawTime: parseInt(settings.drawTime) || 80,
      wordCount: parseInt(settings.wordCount) || 3,
      hints: parseInt(settings.hints) || 2,
      wordMode: settings.wordMode || 'Normal', // Normal, Hidden, Combination
      category: settings.category || 'Mixed'
    };

    this.phase = 'lobby'; // lobby, word_selection, drawing, round_end, game_over
    this.round = 0;
    this.turnIndex = -1;
    this.drawer = null;
    this.wordOptions = [];
    this.selectedWord = '';
    this.hintState = '';
    this.revealedIndexes = new Set();
    this.timeLeft = 0;
    this.timer = null;
    this.drawingStrokes = [];
    this.guessedCount = 0;
    this.wordSelectionTimeout = null;
  }

  async start() {
    this.phase = 'word_selection';
    this.round = 1;
    this.turnIndex = 0;
    this.room.players.forEach(p => p.resetGame());
    await this.nextTurn();
  }

  async nextTurn() {
    this.clearTimer();
    this.clearWordSelectionTimeout();
    this.drawingStrokes = [];
    this.guessedCount = 0;
    this.room.players.forEach(p => {
      p.resetRoundState();
    });

    // Check if we finished all players' turns in this round
    if (this.turnIndex >= this.room.players.length) {
      this.turnIndex = 0;
      this.round++;
    }

    // Check if game is over
    if (this.round > this.settings.rounds || this.room.players.length === 0) {
      this.endGame();
      return;
    }

    this.phase = 'word_selection';
    this.drawer = this.room.players[this.turnIndex];
    this.drawer.isDrawing = true;

    // Fetch random words
    try {
      this.wordOptions = await getWordsByCategory(this.settings.category, this.settings.wordCount);
    } catch (e) {
      console.error('Error fetching words:', e);
      this.wordOptions = ['apple', 'banana', 'pencil', 'mountain'].slice(0, this.settings.wordCount);
    }

    this.timeLeft = 15; // 15 seconds to select a word
    this.room.broadcast('round_start', {
      drawerId: this.drawer.id,
      drawerName: this.drawer.name,
      wordOptions: this.wordOptions, // Server will sanitize this for non-drawers
      drawTime: this.settings.drawTime,
      round: this.round,
      totalRounds: this.settings.rounds,
      timeLeft: this.timeLeft
    });

    // Start timer for word selection
    this.startWordSelectionTimer();
  }

  startWordSelectionTimer() {
    this.clearTimer();
    this.timer = setInterval(() => {
      this.timeLeft--;
      
      this.room.broadcast('timer_tick', {
        timeLeft: this.timeLeft,
        phase: this.phase
      });

      if (this.timeLeft <= 0) {
        // Auto-select first word if drawer didn't choose in time
        const autoWord = this.wordOptions[0] || 'apple';
        this.selectWord(autoWord);
      }
    }, 1000);
  }

  selectWord(word) {
    this.clearTimer();
    this.clearWordSelectionTimeout();
    
    this.selectedWord = word.toLowerCase().trim();
    this.phase = 'drawing';
    this.timeLeft = this.settings.drawTime;

    // Initialize hints
    this.revealedIndexes.clear();
    this.generateHintState();

    this.room.broadcast('word_chosen', {
      drawerId: this.drawer.id,
      drawerName: this.drawer.name,
      hintState: this.hintState,
      timeLeft: this.timeLeft
    });

    // Send the actual word only to the drawer
    if (this.drawer && this.drawer.socketId) {
      this.room.io.to(this.drawer.socketId).emit('reveal_word', { word: this.selectedWord });
    }

    this.startDrawingTimer();
  }

  generateHintState() {
    if (this.settings.wordMode === 'Hidden') {
      this.hintState = 'HIDDEN WORD';
      return;
    }

    let hint = '';
    for (let i = 0; i < this.selectedWord.length; i++) {
      const char = this.selectedWord[i];
      if (char === ' ') {
        hint += ' ';
      } else if (char === '-') {
        hint += '-';
      } else if (this.revealedIndexes.has(i)) {
        hint += char;
      } else {
        hint += '_';
      }
    }
    this.hintState = hint;
  }

  revealHint() {
    if (this.settings.wordMode === 'Hidden') return;

    // Find all indexes of letters that are not spaces, hyphens, and not yet revealed
    const unrevealed = [];
    for (let i = 0; i < this.selectedWord.length; i++) {
      const char = this.selectedWord[i];
      if (char !== ' ' && char !== '-' && !this.revealedIndexes.has(i)) {
        unrevealed.push(i);
      }
    }

    if (unrevealed.length > 1) { // Leave at least 1 letter hidden
      const randIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      this.revealedIndexes.add(randIdx);
      this.generateHintState();
      this.room.broadcast('hint_update', { hintState: this.hintState });
    }
  }

  startDrawingTimer() {
    const totalTime = this.settings.drawTime;
    // Calculate intervals at which to reveal hints
    // E.g., if there are 2 hints, reveal them at 60% and 30% time remaining
    const hintIntervals = [];
    if (this.settings.hints > 0) {
      for (let i = 1; i <= this.settings.hints; i++) {
        hintIntervals.push(Math.round(totalTime * (1 - (i / (this.settings.hints + 1)))));
      }
    }

    this.timer = setInterval(() => {
      this.timeLeft--;

      this.room.broadcast('timer_tick', {
        timeLeft: this.timeLeft,
        phase: this.phase
      });

      // Check if we need to reveal a hint
      if (hintIntervals.includes(this.timeLeft)) {
        this.revealHint();
      }

      if (this.timeLeft <= 0) {
        this.endTurn();
      }
    }, 1000);
  }

  checkGuess(player, text) {
    if (this.phase !== 'drawing') return { isCorrect: false, isClose: false };
    if (player.id === this.drawer.id) return { isCorrect: false, isClose: false }; // Drawer cannot guess
    if (player.hasGuessed) return { isCorrect: false, isClose: false }; // Already guessed

    const cleanedGuess = text.toLowerCase().trim();
    if (cleanedGuess === this.selectedWord) {
      player.hasGuessed = true;
      player.guessedAt = Date.now();
      this.guessedCount++;

      // Scoring calculation
      // Guesser: based on time left (max 80 pts) + speed order bonus (1st: 20 pts, 2nd: 10 pts, others: 5 pts)
      const timeFactor = this.timeLeft / this.settings.drawTime;
      const speedBonus = this.guessedCount === 1 ? 20 : (this.guessedCount === 2 ? 10 : 5);
      player.roundScore = Math.round(timeFactor * 80) + speedBonus;
      player.score += player.roundScore;

      // Update database score in real-time for guesser
      incrementPlayerScore(player.id, player.roundScore).then(newScore => {
        const socket = this.room.io.sockets.sockets.get(player.socketId);
        if (socket) {
          socket.emit('player_score_fetched', { score: newScore });
        }
      }).catch(err => {
        console.error(`Failed to increment score for player ${player.id}:`, err);
      });

      // Drawer: gets 15 points per correct guesser (max 60 pts total)
      if (this.drawer) {
        const drawerBonus = 15;
        this.drawer.roundScore = Math.min(60, (this.drawer.roundScore || 0) + drawerBonus);
        this.drawer.score += drawerBonus;

        // Update database score in real-time for drawer
        incrementPlayerScore(this.drawer.id, drawerBonus).then(newScore => {
          const socket = this.room.io.sockets.sockets.get(this.drawer.socketId);
          if (socket) {
            socket.emit('player_score_fetched', { score: newScore });
          }
        }).catch(err => {
          console.error(`Failed to increment score for drawer ${this.drawer.id}:`, err);
        });
      }

      // Broadcast success notification
      this.room.broadcast('guess_result', {
        correct: true,
        playerId: player.id,
        playerName: player.name,
        roundScore: player.roundScore,
        scores: this.room.getScores()
      });

      // End round early if all guessing players guessed correctly
      const guessingPlayers = this.room.players.filter(p => p.id !== this.drawer.id);
      if (guessingPlayers.every(p => p.hasGuessed)) {
        this.endTurn();
      }

      return { isCorrect: true, isClose: false };
    }

    // Check if close guess (Levenshtein distance == 1)
    const isClose = this.isCloseGuess(cleanedGuess, this.selectedWord);
    return { isCorrect: false, isClose };
  }

  isCloseGuess(guess, word) {
    if (word.length < 3) return false;
    
    // Quick Levenshtein distance check for edit distance 1
    const lenG = guess.length;
    const lenW = word.length;
    if (Math.abs(lenG - lenW) > 1) return false;

    let edits = 0;
    let i = 0, j = 0;
    while (i < lenG && j < lenW) {
      if (guess[i] !== word[j]) {
        edits++;
        if (edits > 1) return false;
        if (lenG > lenW) {
          i++;
        } else if (lenW > lenG) {
          j++;
        } else {
          i++;
          j++;
        }
      } else {
        i++;
        j++;
      }
    }
    return true;
  }

  endTurn() {
    this.clearTimer();
    this.phase = 'round_end';

    // Broadcast round end details
    this.room.broadcast('round_end', {
      word: this.selectedWord,
      scores: this.room.getScores(),
      drawerName: this.drawer ? this.drawer.name : ''
    });

    this.timeLeft = 5; // 5 seconds intermission before next drawer
    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.clearTimer();
        this.turnIndex++;
        this.nextTurn();
      }
    }, 1000);
  }

  endGame() {
    this.clearTimer();
    this.phase = 'game_over';
    
    // Sort players by score
    const leaderboard = this.room.players
      .map(p => ({ id: p.id, name: p.name, score: p.score, avatar: p.avatar }))
      .sort((a, b) => b.score - a.score);

    this.room.broadcast('game_over', {
      winner: leaderboard[0] ? leaderboard[0].name : 'Nobody',
      leaderboard
    });
  }

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  clearWordSelectionTimeout() {
    if (this.wordSelectionTimeout) {
      clearTimeout(this.wordSelectionTimeout);
      this.wordSelectionTimeout = null;
    }
  }

  destroy() {
    this.clearTimer();
    this.clearWordSelectionTimeout();
  }
}
