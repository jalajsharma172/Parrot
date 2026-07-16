import { Room } from '../services/room.js';
import { Player } from '../services/player.js';
import Room__Code from '../services/generateRoomcode.js';
import crypto from 'crypto';
import { getPlayerScore, updatePlayerName, searchUsers, checkPlayerIdExists, renamePlayerId, saveOfflineInvite, getOfflineInvites, clearOfflineInvites } from '../database/scoreDb.js';

const generateUniquePlayerId = async () => {
  let attempts = 0;
  while (attempts < 100) {
    const candidate = `usr_${crypto.randomBytes(8).toString('hex')}`;
    
    const isOnline = onlinePlayers.has(candidate);
    let dbExists = false;
    try {
      dbExists = await checkPlayerIdExists(candidate);
    } catch (e) {
      console.error('Error checking playerId in DB:', e);
    }

    if (!isOnline && !dbExists) {
      return candidate;
    }
    attempts++;
  }
  return `usr_${crypto.randomBytes(8).toString('hex')}`;
};


//Store Rooms in Map [Room__Code=>Rooms__Object]
const rooms_Map = new Map();
const onlinePlayers = new Map(); // playerId => { id, socketId, name, score }



export const handleSocketConnections = (io) => {
  //Whenever a new client connects, create a new socket object.
  //         io generate->      socket1,socket2,socket3.

  io.on('connection', async (socket) => {
    console.log('User connected:', socket.id);

    // Retrieve or generate persistent player ID
    let playerId = socket.handshake.auth?.playerId || socket.handshake.query?.playerId;
    if (!playerId) {
      playerId = await generateUniquePlayerId();
      socket.emit('player_id_generated', playerId);
    } else {
      const existingPlayer = onlinePlayers.get(playerId);
      if (existingPlayer && existingPlayer.socketId !== socket.id) {
        const oldSocket = io.sockets.sockets.get(existingPlayer.socketId);
        if (oldSocket) {
          console.log(`Disconnecting duplicate socket ${existingPlayer.socketId} for player ${playerId}`);
          oldSocket.disconnect(true);
        }
      }
    }

    // Person Id and Room ID
    let currentRoomId = null;
    let currentPlayerId = playerId;

    // Register online player
    onlinePlayers.set(currentPlayerId, {
      id: currentPlayerId,
      socketId: socket.id,
      name: currentPlayerId,
      score: 0
    });


    // Fetch Player's Score from Db on connection
    getPlayerScore(currentPlayerId).then((score) => {
      socket.score = score;
      if (onlinePlayers.has(currentPlayerId)) {
        onlinePlayers.get(currentPlayerId).score = score;
      }
      console.log(`Fetched score on connection for player ${currentPlayerId}: ${score}`);
      socket.emit('player_score_fetched', { score });
    }).catch(err => {
      console.error(`Failed to fetch score for player ${currentPlayerId} on connection:`, err);
    });

    // Fetch offline invites/notifications on connection
    getOfflineInvites(currentPlayerId).then((invites) => {
      if (invites && invites.length > 0) {
        console.log(`Sending ${invites.length} offline invites to player ${currentPlayerId} on connect`);
        socket.emit('offline_invites', invites);
        clearOfflineInvites(currentPlayerId).catch(console.error);
      }
    }).catch(err => {
      console.error(`Error checking offline invites for ${currentPlayerId}:`, err);
    });

    // Private Room Creation
    // settings-no of players
    // hostName + avatar player description
    socket.on('create_room', async ({ hostName, avatar, settings }, callback) => {
      let code = Room__Code();
      // If already exist generate again
      while (rooms_Map.has(code)) {
        code = Room__Code();
      }

      const room_obj = new Room(code, io, settings);//Create a Room Object with features
      rooms_Map.set(code, room_obj);                //Save in rooms_Map

      console.log(`Room created: ${code} ,Room ${room_obj}`);

      const player_obj = new Player(currentPlayerId, socket.id, hostName, avatar, true);//Create a hostPlayer Object with features

      socket.join(code);// This allows the server to broadcast messages or emit events to specific groups of users simultaneously without sending them to everyone
      currentRoomId = code;

      const res = room_obj.addPlayer(player_obj);
      if (res.success) {
        callback({
          success: true,
          roomId: code,
          playerId: player_obj.id,
          settings: room_obj.settings,
          players: room_obj.getPlayerList()
        });
      } else {
        callback({ success: false, reason: addResult.reason });
      }
    });

    // Player requests Quick Join (public lobby search or auto-create)
    socket.on('quick_join', async ({ playerName, avatar }, callback) => {
      // Find an existing public room that has space (< 5 players) and hasn't started yet
      let targetRoom = null;
      for (const [code, room] of rooms_Map.entries()) {
        if (room.isPublic && room.players.length < 5 && (!room.game || room.game.phase !== 'game_over')) {
          targetRoom = room;
          break;
        }
      }

      let code;
      let isNewRoom = false;

      if (targetRoom) {
        code = targetRoom.id;
      } else {
        // Create a new public room
        code = Room__Code();
        while (rooms_Map.has(code)) {
          code = Room__Code();
        }
        targetRoom = new Room(code, io, { isPublic: true });
        rooms_Map.set(code, targetRoom);
        isNewRoom = true;
        console.log(`Public room auto-created: ${code}`);
      }

      // Check if username is already taken in the room
      const nameExists = targetRoom.players.some(p => p.name.toLowerCase() === playerName.toLowerCase());
      const finalName = nameExists ? `${playerName}#${Math.floor(Math.random() * 900) + 100}` : playerName;

      // The first player in the public room is the host
      const player = new Player(currentPlayerId, socket.id, finalName, avatar, isNewRoom);

      socket.join(code);
      currentRoomId = code;

      const addResult = targetRoom.addPlayer(player);
      if (addResult.success) {
        // Auto-start game immediately for public rooms if not already running
        if (!targetRoom.game || targetRoom.game.phase === 'lobby') {
          targetRoom.startGame().catch(e => console.error('Error auto-starting game:', e));
        }

        callback({
          success: true,
          roomId: code,
          playerId: player.id,
          settings: targetRoom.settings,
          players: targetRoom.getPlayerList()
        });
      } else {
        callback({ success: false, reason: addResult.reason });
      }
    });

    // Player joins a room
    socket.on('join_room', async ({ roomId, playerName, avatar }, callback) => {
      const code = roomId.toUpperCase().trim();
      const room = rooms_Map.get(code);

      if (!room) {
        return callback({ success: false, reason: 'Room not found' });
      }

      if (room.players.length >= room.settings.maxPlayers) {
        return callback({ success: false, reason: 'Room is full' });
      }

      // Check if username is already taken in the room
      const nameExists = room.players.some(p => p.name.toLowerCase() === playerName.toLowerCase());
      const finalName = nameExists ? `${playerName}#${Math.floor(Math.random() * 900) + 100}` : playerName;

      const player = new Player(currentPlayerId, socket.id, finalName, avatar, false);

      socket.join(code);
      currentRoomId = code;

      const addResult = room.addPlayer(player);
      if (addResult.success) {
        callback({
          success: true,
          roomId: code,
          playerId: player.id,
          settings: room.settings,
          players: room.getPlayerList()
        });
      } else {
        callback({ success: false, reason: addResult.reason });
      }
    });

    // Toggle Ready status in lobby
    socket.on('toggle_ready', () => {
      const room = rooms_Map.get(currentRoomId);
      if (room && currentPlayerId) {
        room.toggleReady(currentPlayerId);
      }
    });

    // Update Room settings (Host only)
    socket.on('update_settings', ({ settings }) => {
      const room = rooms_Map.get(currentRoomId);
      if (room && currentPlayerId) {
        const player = room.getPlayer(currentPlayerId);
        if (player && player.isHost) {
          room.updateSettings(settings);
        }
      }
    });

    // Start Game (Host only)
    socket.on('start_game', async (callback) => {
      const room = rooms_Map.get(currentRoomId);
      if (room && currentPlayerId) {
        const player = room.getPlayer(currentPlayerId);
        if (player && player.isHost) {
          const result = await room.startGame();
          callback(result);
        } else {
          callback({ success: false, reason: 'Only the host can start the game' });
        }
      } else {
        callback({ success: false, reason: 'Room or player not found' });
      }
    });

    // Drawer selects a word
    socket.on('word_chosen', ({ word }) => {
      const room = rooms_Map.get(currentRoomId);
      if (room && room.game && room.game.drawer && room.game.drawer.id === currentPlayerId) {
        room.game.selectWord(word);
      }
    });

    // Chat and Guess handling
    socket.on('chat_message', ({ text }) => {
      const room = rooms_Map.get(currentRoomId);
      if (!room || !currentPlayerId) return;

      const player = room.getPlayer(currentPlayerId);
      if (!player) return;

      const game = room.game;
      const cleanText = text.trim();
      if (!cleanText) return;

      // Handle guess checks during drawing phase
      if (game && game.phase === 'drawing') {
        const { isCorrect, isClose } = game.checkGuess(player, cleanText);

        if (isCorrect) {
          return;
        }

        if (isClose) {
          // Send private notification to that player that their guess is close
          socket.emit('guess_result', {
            isClose: true,
            text: `"${cleanText}" is very close!`
          });
        }
      }

      // Standard chat message - broadcast to all without restrictions
      room.broadcast('chat_message', {
        playerName: player.name,
        text: cleanText,
        playerId: player.id
      });
    });

    // Real-time Canvas Drawing synchronisation
    socket.on('draw_start', (data) => {
      const room = rooms_Map.get(currentRoomId);
      if (room && room.game && room.game.phase === 'drawing' && room.game.drawer.id === currentPlayerId) {
        room.game.drawingStrokes.push({ type: 'start', ...data });
        socket.to(currentRoomId).emit('draw_data', { type: 'start', ...data });
      }
    });

    socket.on('draw_move', (data) => {
      const room = rooms_Map.get(currentRoomId);
      if (room && room.game && room.game.phase === 'drawing' && room.game.drawer.id === currentPlayerId) {
        room.game.drawingStrokes.push({ type: 'move', ...data });
        socket.to(currentRoomId).emit('draw_data', { type: 'move', ...data });
      }
    });

    socket.on('draw_end', () => {
      const room = rooms_Map.get(currentRoomId);
      if (room && room.game && room.game.phase === 'drawing' && room.game.drawer.id === currentPlayerId) {
        room.game.drawingStrokes.push({ type: 'end' });
        socket.to(currentRoomId).emit('draw_data', { type: 'end' });
      }
    });

    socket.on('canvas_clear', () => {
      const room = rooms_Map.get(currentRoomId);
      if (room && room.game && room.game.phase === 'drawing' && room.game.drawer.id === currentPlayerId) {
        room.game.drawingStrokes = [];
        room.broadcast('canvas_clear');
      }
    });

    socket.on('draw_undo', () => {
      const room = rooms_Map.get(currentRoomId);
      if (room && room.game && room.game.phase === 'drawing' && room.game.drawer.id === currentPlayerId) {
        // Remove the last stroke from strokes list
        // A stroke is defined by a start event, several moves, and an end event.
        // We will remove all events back to the last 'start' event.
        const strokes = room.game.drawingStrokes;
        if (strokes.length > 0) {
          let i = strokes.length - 1;
          // Find the last end, then delete back to the previous start
          while (i >= 0 && strokes[i].type !== 'start') {
            i--;
          }
          if (i >= 0) {
            room.game.drawingStrokes = strokes.slice(0, i);
          } else {
            room.game.drawingStrokes = [];
          }
          room.broadcast('draw_undo');
        }
      }
    });

    // Kick / Ban (Host moderation)
    socket.on('kick_player', ({ playerId }) => {
      const room = rooms_Map.get(currentRoomId);
      if (room && currentPlayerId) {
        const hostPlayer = room.getPlayer(currentPlayerId);
        if (hostPlayer && hostPlayer.isHost && playerId !== currentPlayerId) {
          const targetPlayer = room.getPlayer(playerId);
          if (targetPlayer) {
            const targetSocket = io.sockets.sockets.get(targetPlayer.socketId);
            if (targetSocket) {
              targetSocket.emit('kicked');
              targetSocket.leave(currentRoomId);
            }
          }
          room.removePlayer(playerId);
        }
      }
    });

    // Reset game and return to Lobby (Host only)
    socket.on('reset_room', () => {
      const room = rooms_Map.get(currentRoomId);
      if (room && currentPlayerId) {
        const player = room.getPlayer(currentPlayerId);
        if (player && player.isHost) {
          room.resetRoom();
        }
      }
    });

    // Update or set a custom unique username
    socket.on('update_username', async ({ name }, callback) => {
      let targetName = (name || '').trim();
      
      if (!targetName) {
        return callback({ success: false, reason: 'Username cannot be empty' });
      }

      // If it is the same as current, no change needed
      if (targetName === currentPlayerId) {
        getPlayerScore(currentPlayerId).then((score) => {
          socket.emit('player_score_fetched', { score });
        }).catch(console.error);
        
        socket.emit('player_id_generated', targetName);
        return callback({ success: true, username: targetName });
      }

      // Check if username is already taken/online
      const isOnline = onlinePlayers.has(targetName);
      let dbExists = false;
      try {
        dbExists = await checkPlayerIdExists(targetName);
      } catch (err) {
        console.error('Error checking playerId existence on update:', err);
      }

      if (isOnline) {
        const existingPlayer = onlinePlayers.get(targetName);
        if (existingPlayer && existingPlayer.socketId !== socket.id) {
          const oldSocket = io.sockets.sockets.get(existingPlayer.socketId);
          if (oldSocket) {
            console.log(`Disconnecting old socket ${existingPlayer.socketId} for claimed username ${targetName}`);
            oldSocket.disconnect(true);
          }
          onlinePlayers.delete(targetName);
        }
      }

      // Username is available (either new or offline in DB)! Let's rename the player ID.
      const oldPlayerId = currentPlayerId;
      currentPlayerId = targetName;

      // Update onlinePlayers map
      const playerInfo = onlinePlayers.get(oldPlayerId);
      if (playerInfo) {
        onlinePlayers.delete(oldPlayerId);
        playerInfo.id = targetName;
        playerInfo.name = targetName;
        onlinePlayers.set(targetName, playerInfo);
      }

      let score = 0;
      if (dbExists) {
        // Fetch existing score from DB
        try {
          score = await getPlayerScore(targetName);
          if (playerInfo) {
            playerInfo.score = score;
          }
          socket.score = score;
          socket.emit('player_score_fetched', { score });
        } catch (err) {
          console.error(`Failed to fetch existing DB score for ${targetName}:`, err);
        }
      } else {
        // If it doesn't exist in DB, migrate the old score to the new username
        try {
          score = await renamePlayerId(oldPlayerId, targetName);
          if (playerInfo) {
            playerInfo.score = score;
          }
          socket.score = score;
          socket.emit('player_score_fetched', { score });
        } catch (err) {
          console.error(`Failed to migrate DB scores from ${oldPlayerId} to ${targetName}:`, err);
        }
      }

      socket.emit('player_id_generated', targetName);
      callback({ success: true, username: targetName });

      // Fetch offline invites for renamed user
      getOfflineInvites(targetName).then((invites) => {
        if (invites && invites.length > 0) {
          console.log(`Sending ${invites.length} offline invites to player ${targetName} after rename`);
          socket.emit('offline_invites', invites);
          clearOfflineInvites(targetName).catch(console.error);
        }
      }).catch(err => {
        console.error(`Error checking offline invites for renamed user ${targetName}:`, err);
      });
    });

    // Sync player name and store in DB/onlinePlayers
    socket.on('sync_name', ({ name }) => {
      if (!name) return;
      const playerInfo = onlinePlayers.get(currentPlayerId) || { id: currentPlayerId };
      playerInfo.name = name;
      playerInfo.socketId = socket.id;
      onlinePlayers.set(currentPlayerId, playerInfo);

      updatePlayerName(currentPlayerId, name).then((score) => {
        playerInfo.score = score;
        socket.score = score;
        socket.emit('player_score_fetched', { score });
      }).catch(err => {
        console.error('Failed to update player name in DB:', err);
      });
    });

    // Search users in DB and check online status
    socket.on('search_users', async ({ query }, callback) => {
      try {
        const users = await searchUsers(query || '');
        const results = users.map(user => {
          const onlineInfo = onlinePlayers.get(user.playerId);
          return {
            playerId: user.playerId,
            playerName: user.playerName,
            score: user.score,
            isOnline: !!onlineInfo
          };
        });
        callback({ success: true, users: results });
      } catch (err) {
        console.error('Error in search_users:', err);
        callback({ success: false, reason: 'Failed to search users' });
      }
    });

    // Send invitations to online or offline players
    socket.on('send_invites', ({ targetPlayerIds, roomId }) => {
      if (!roomId || !targetPlayerIds || !Array.isArray(targetPlayerIds)) return;
      
      const hostInfo = onlinePlayers.get(currentPlayerId);
      const hostName = hostInfo ? hostInfo.name : 'A player';

      targetPlayerIds.forEach(targetId => {
        const targetInfo = onlinePlayers.get(targetId);
        if (targetInfo && targetInfo.socketId) {
          io.to(targetInfo.socketId).emit('room_invite', {
            hostName,
            roomId
          });
        } else {
          // If offline, save in db
          saveOfflineInvite(targetId, currentPlayerId, hostName, roomId).catch(console.error);
        }
      });
    });

    // Disconnection logic
    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);

      if (currentPlayerId && onlinePlayers.get(currentPlayerId)?.socketId === socket.id) {
        onlinePlayers.delete(currentPlayerId);
      }

      if (currentRoomId && currentPlayerId) {
        const room = rooms_Map.get(currentRoomId);
        if (room) {
          room.removePlayer(currentPlayerId);

          // Delete room if empty
          if (room.players.length === 0) {
            console.log(`Deleting empty room: ${currentRoomId}`);
            rooms_Map.delete(currentRoomId);
          }
        }
      }
    });
  });
};


/**
             io

             |
   ----------------------
   |         |          |
socket1   socket2   socket3

 Alice      Bob       John

socket.join(code);// Join The Room
currentRoomId = code;
currentPlayerId = socket.id;

create_room
quick_join
join_room
toggle_ready
update_settings
start_game
word_chosen
chat_message
draw_start
draw_move
draw_end
canvas_clear
draw_undo
kick_player
reset_room
disconnect



 * 
 * 
 * 
 */