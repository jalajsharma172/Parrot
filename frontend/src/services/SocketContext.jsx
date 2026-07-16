import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {

  //Player Identity
  const [playerName, setPlayerNameState] = useState(() => {
    const savedName = localStorage.getItem("playerName") || "";
    const isOldGenerated = /^(Picasso|VanGogh|Monet|DaVinci|Dali|Michelangelo|Warhol|Rembrandt|Kahlo|Matisse|Banksy|Pollock|Basquiat|Rothko|Donatello|Raphael|DoodleBot|Sketcher|ColorCraze|PixelPal)#\d+$/.test(savedName) || savedName.startsWith("User_") || savedName.startsWith("usr_");
    return isOldGenerated ? "" : savedName;
  });


  const [avatarIndex, setAvatarIndexState] = useState(parseInt(localStorage.getItem("playerAvatarIndex"), 10) || 1);


  const [persistentScore, setPersistentScore] = useState(0);


  //Connection and Initialization
  

  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomSettings, setRoomSettings] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState({
    phase: 'lobby', // lobby, word_selection, drawing, round_end, game_over
    round: 0,
    totalRounds: 0,
    drawerId: null,
    drawerName: '',
    hintState: '',
    timeLeft: 0,
    wordOptions: [],
    selectedWord: '',
    winner: null,
    leaderboard: []
  });
  const [chatMessages, setChatMessages] = useState([]);
  const [activeInvite, setActiveInvite] = useState(null);
  const [notifications, setNotifications] = useState([]);


  useEffect(() => {
    // Connect to server (either environment variable or current host on port 3000)
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    console.log('Connecting to backend socket at:', backendUrl);

    const socketInstance = io(backendUrl, {
      autoConnect: true,
      transports: ['websocket'],
      auth: {
        playerId: localStorage.getItem('playerId')
      }
    });

    socketInstance.on('player_id_generated', (id) => {
      console.log('Generated and saved new playerId:', id);
      localStorage.setItem('playerId', id);
      if (id && !id.startsWith('usr_')) {
        localStorage.setItem('playerName', id);
        setPlayerNameState(id);
      }
    });


    socketInstance.on('player_score_fetched', ({ score }) => {
      console.log('Fetched player score from DB:', score);
      setPersistentScore(score);
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected successfully:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
      // Reset state on disconnect
      setPlayers([]);
      setRoomSettings(null);
      setGameState({
        phase: 'lobby',
        round: 0,
        totalRounds: 0,
        drawerId: null,
        drawerName: '',
        hintState: '',
        timeLeft: 0,
        wordOptions: [],
        selectedWord: '',
        winner: null,
        leaderboard: []
      });
      setChatMessages([]);
      setPersistentScore(0);
      setActiveInvite(null);
    });

    socketInstance.on('room_invite', ({ hostName, roomId }) => {
      console.log('Received room invite:', hostName, roomId);
      setActiveInvite({ hostName, roomId });
      setNotifications(prev => {
        if (prev.some(n => n.roomId === roomId)) return prev;
        return [{ senderPlayerName: hostName, roomId, createdAt: new Date().toISOString() }, ...prev];
      });
    });

    socketInstance.on('offline_invites', (invites) => {
      console.log('Received offline invites:', invites);
      setNotifications(prev => {
        const updated = [...prev];
        invites.forEach(inv => {
          if (!updated.some(n => n.roomId === inv.roomId)) {
            updated.push({
              senderPlayerId: inv.senderPlayerId,
              senderPlayerName: inv.senderPlayerName,
              roomId: inv.roomId,
              createdAt: inv.createdAt
            });
          }
        });
        return updated;
      });
    });

    // Listeners for game-state events
    socketInstance.on('player_joined', ({ player, players }) => {
      setPlayers(players);
      addSystemMessage(`${player.name} joined the room!`);
    });

    socketInstance.on('player_left', ({ playerId, players }) => {
      const leavingPlayer = players.find(p => p.id === playerId);
      setPlayers(players);
      addSystemMessage(`A player left the room.`);
    });

    socketInstance.on('player_ready_toggle', ({ playerId, isReady, players }) => {
      setPlayers(players);
    });

    socketInstance.on('settings_updated', ({ settings }) => {
      setRoomSettings(settings);
    });

    socketInstance.on('round_start', ({ drawerId, drawerName, wordOptions, drawTime, round, totalRounds, timeLeft }) => {
      setGameState(prev => ({
        ...prev,
        phase: 'word_selection',
        round,
        totalRounds,
        drawerId,
        drawerName,
        wordOptions,
        timeLeft,
        selectedWord: '',
        hintState: ''
      }));
      setChatMessages([]);
      addSystemMessage(`${drawerName} is choosing a word...`);
    });

    socketInstance.on('word_chosen', ({ drawerId, drawerName, hintState, timeLeft }) => {
      setGameState(prev => ({
        ...prev,
        phase: 'drawing',
        hintState,
        timeLeft
      }));
      addSystemMessage(`${drawerName} is drawing!`);
    });

    socketInstance.on('reveal_word', ({ word }) => {
      setGameState(prev => ({ ...prev, selectedWord: word }));
    });

    socketInstance.on('hint_update', ({ hintState }) => {
      setGameState(prev => ({ ...prev, hintState }));
    });

    socketInstance.on('timer_tick', ({ timeLeft, phase }) => {
      setGameState(prev => ({ ...prev, timeLeft, phase }));
    });

    socketInstance.on('guess_result', (data) => {
      if (data.correct) {
        addSystemMessage(`${data.playerName} guesses the word correctly`, 'success');
        // Update players lists scores
        if (data.scores) {
          setPlayers(prev => prev.map(p => {
            const match = data.scores.find(s => s.id === p.id);
            return match ? { ...p, score: match.score, roundScore: match.roundScore, hasGuessed: match.hasGuessed } : p;
          }));
        }
      } else if (data.isClose) {
        // Private close guess feedback
        addSystemMessage(data.text, 'warning');
      }
    });

    socketInstance.on('chat_message', (message) => {
      setChatMessages(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        sender: message.playerName,
        text: message.text,
        type: message.isCorrectGuesser ? 'correct-guesser' : (message.isCloseGuess ? 'close-guess' : 'chat')
      }]);
    });

    socketInstance.on('round_end', ({ word, scores, drawerName }) => {
      setGameState(prev => ({
        ...prev,
        phase: 'round_end',
        hintState: word // Reveal full word
      }));
      addSystemMessage(`Round over! The word was: "${word}"`, 'info');
      if (scores) {
        setPlayers(prev => prev.map(p => {
          const match = scores.find(s => s.id === p.id);
          return match ? { ...p, score: match.score, roundScore: match.roundScore } : p;
        }));
      }
    });

    socketInstance.on('game_over', ({ winner, leaderboard }) => {
      setGameState(prev => ({
        ...prev,
        phase: 'game_over',
        winner,
        leaderboard
      }));
      addSystemMessage(`Game over! Winner: ${winner}`, 'info');
    });

    socketInstance.on('game_sync', (syncData) => {
      setGameState(prev => ({
        ...prev,
        phase: syncData.phase,
        round: syncData.round,
        totalRounds: syncData.totalRounds,
        drawerId: syncData.drawerId,
        drawerName: syncData.drawerName,
        hintState: syncData.hintState,
        timeLeft: syncData.timeLeft,
        wordOptions: syncData.wordOptions
      }));
    });

    socketInstance.on('room_reset', ({ players, settings }) => {
      setPlayers(players);
      setRoomSettings(settings);
      setGameState({
        phase: 'lobby',
        round: 0,
        totalRounds: 0,
        drawerId: null,
        drawerName: '',
        hintState: '',
        timeLeft: 0,
        wordOptions: [],
        selectedWord: '',
        winner: null,
        leaderboard: []
      });
      setChatMessages([]);
      addSystemMessage(`Game reset to lobby by host.`);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);



 



  const addSystemMessage = (text, type = 'system') => {
    setChatMessages(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      sender: 'System',
      text,
      type
    }]);
  };

  const createRoom = (hostName, avatar, settings) => {
    return new Promise((resolve) => {
      if (socket) {
        socket.emit('create_room', { hostName, avatar, settings }, (response) => {
          if (response.success) {
            setRoomSettings(response.settings);
            setPlayers(response.players);
            if (response.playerId) {
              localStorage.setItem('playerId', response.playerId);
            }
          }
          resolve(response);
        });
      } else {
        resolve({ success: false, reason: 'Socket server disconnected' });
      }
    });
  };

  const joinRoom = (roomId, playerName, avatar) => {
    return new Promise((resolve) => {
      if (socket) {
        socket.emit('join_room', { roomId, playerName, avatar }, (response) => {
          if (response.success) {
            setRoomSettings(response.settings);
            setPlayers(response.players);
            if (response.playerId) {
              localStorage.setItem('playerId', response.playerId);
            }
          }
          resolve(response);
        });
      } else {
        resolve({ success: false, reason: 'Socket server disconnected' });
      }
    });
  };

  const quickJoin = (playerName, avatar) => {
    return new Promise((resolve) => {
      if (socket) {
        socket.emit('quick_join', { playerName, avatar }, (response) => {
          if (response.success) {
            setRoomSettings(response.settings);
            setPlayers(response.players);
            if (response.playerId) {
              localStorage.setItem('playerId', response.playerId);
            }
          }
          resolve(response);
        });
      } else {
        resolve({ success: false, reason: 'Socket server disconnected' });
      }
    });
  };

  const toggleReady = () => {
    if (socket) socket.emit('toggle_ready');
  };

  const updateSettings = (newSettings) => {
    if (socket) socket.emit('update_settings', { settings: newSettings });
  };

  const startGame = () => {
    return new Promise((resolve) => {
      if (socket) {
        socket.emit('start_game', resolve);
      } else {
        resolve({ success: false, reason: 'Socket connection missing' });
      }
    });
  };

  const selectWord = (word) => {
    if (socket) socket.emit('word_chosen', { word });
  };

  const sendChatMessage = (text) => {
    if (socket) socket.emit('chat_message', { text });
  };

  const kickPlayer = (playerId) => {
    if (socket) socket.emit('kick_player', { playerId });
  };

  const resetRoom = () => {
    if (socket) socket.emit('reset_room');
  };

  const searchUsers = (query) => {
    return new Promise((resolve) => {
      if (socket) {
        socket.emit('search_users', { query }, (res) => {
          resolve(res);
        });
      } else {
        resolve({ success: false, reason: 'Socket connection missing' });
      }
    });
  };

  const sendInvites = (targetPlayerIds, roomId) => {
    if (socket) {
      socket.emit('send_invites', { targetPlayerIds, roomId });
    }
  };

  const syncName = (name) => {
    setPlayerNameState(name);
    if (socket) {
      socket.emit('sync_name', { name });
    }
  };

  const updateUsername = (name) => {
    return new Promise((resolve) => {
      if (socket) {
        socket.emit('update_username', { name }, (response) => {
          if (response.success) {
            setPlayerNameState(response.username);
            localStorage.setItem('playerId', response.username);
            localStorage.setItem('playerName', response.username);
          }
          resolve(response);
        });
      } else {
        resolve({ success: false, reason: 'Socket server disconnected' });
      }
    });
  };

  const syncAvatar = (index) => {
    setAvatarIndexState(index);
  };


  const value = {
    socket,
    isConnected,
    roomSettings,
    players,
    gameState,
    chatMessages,
    persistentScore,
    activeInvite,
    setActiveInvite,
    notifications,
    setNotifications,
    removeNotification: (roomId) => setNotifications(prev => prev.filter(n => n.roomId !== roomId)),
    searchUsers,
    sendInvites,
    syncName,
    updateUsername,
    playerName,
    avatarIndex,
    syncAvatar,
    createRoom,
    joinRoom,
    quickJoin,
    toggleReady,
    updateSettings,
    startGame,
    selectWord,
    sendChatMessage,
    kickPlayer,
    resetRoom
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
