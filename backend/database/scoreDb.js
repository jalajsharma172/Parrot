import db from './db.js';

// Initialize the scores table
export const initScoresDb = () => {
  return new Promise((resolve, reject) => {
    db.all("PRAGMA table_info(scores)", (err, rows) => {
      if (err) {
        createScoresTable(resolve, reject);
        return;
      }
      
      if (rows && rows.length > 0) {
        const hasPlayerId = rows.some(row => row.name === 'playerId');
        const hasPlayerName = rows.some(row => row.name === 'playerName');
        
        if (!hasPlayerId) {
          console.log('Detected legacy scores table without playerId. Recreating...');
          db.run('DROP TABLE scores', (dropErr) => {
            if (dropErr) {
              console.error('Failed to drop legacy scores table:', dropErr);
              return reject(dropErr);
            }
            createScoresTable(resolve, reject);
          });
        } else if (!hasPlayerName) {
          console.log('Adding playerName column to scores table...');
          db.run('ALTER TABLE scores ADD COLUMN playerName TEXT DEFAULT ""', (alterErr) => {
            if (alterErr) {
              console.error('Failed to add playerName column:', alterErr);
              return reject(alterErr);
            }
            resolve();
          });
        } else {
          resolve();
        }
      } else {
        createScoresTable(resolve, reject);
      }
    });
  });
};

const createScoresTable = (resolve, reject) => {
  db.run(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerId TEXT UNIQUE NOT NULL,
      playerName TEXT,
      score INTEGER NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create scores table:', err);
      return reject(err);
    }
    resolve();
  });
};

// Save or update score for a player by ID
export const savePlayerScore = (playerId, score) => {
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT OR REPLACE INTO scores (playerId, score)
      VALUES (?, ?)
    `, [playerId, score], (err) => {
      if (err) {
        console.error(`Error saving score for ${playerId}:`, err);
        return reject(err);
      }
      resolve();
    });
  });
};

// Get score for a player by ID
export const getPlayerScore = (playerId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT score FROM scores WHERE playerId = ?', [playerId], (err, row) => {
      if (err) {
        console.error(`Error fetching score for ${playerId}:`, err);
        return reject(err);
      }
      resolve(row ? row.score : 0);
    });
  });
};

// Update name for a player by ID
export const updatePlayerName = (playerId, playerName) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT score FROM scores WHERE playerId = ?', [playerId], (err, row) => {
      if (err) {
        console.error(`Error fetching score during name update for ${playerId}:`, err);
        return reject(err);
      }
      if (row) {
        db.run('UPDATE scores SET playerName = ? WHERE playerId = ?', [playerName, playerId], (err2) => {
          if (err2) return reject(err2);
          resolve(row.score);
        });
      } else {
        db.run('INSERT INTO scores (playerId, playerName, score) VALUES (?, ?, 0)', [playerId, playerName], (err2) => {
          if (err2) return reject(err2);
          resolve(0);
        });
      }
    });
  });
};

// Increment score for a player by ID
export const incrementPlayerScore = (playerId, amount) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT score, playerName FROM scores WHERE playerId = ?', [playerId], (err, row) => {
      if (err) {
        console.error(`Error fetching score during increment for ${playerId}:`, err);
        return reject(err);
      }
      const currentScore = row ? row.score : 0;
      const playerName = row ? row.playerName : '';
      const newScore = currentScore + amount;
      
      if (row) {
        db.run('UPDATE scores SET score = ? WHERE playerId = ?', [newScore, playerId], (err2) => {
          if (err2) return reject(err2);
          resolve(newScore);
        });
      } else {
        db.run('INSERT INTO scores (playerId, playerName, score) VALUES (?, ?, ?)', [playerId, playerName, newScore], (err2) => {
          if (err2) return reject(err2);
          resolve(newScore);
        });
      }
    });
  });
};

// Search users matching a query
export const searchUsers = (searchQuery) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT playerId, playerName, score 
      FROM scores 
      WHERE playerName LIKE ? AND playerName != ""
      ORDER BY score DESC
      LIMIT 10
    `;
    db.all(sql, [`%${searchQuery}%`], (err, rows) => {
      if (err) {
        console.error(`Error searching users with query "${searchQuery}":`, err);
        return reject(err);
      }
      resolve(rows || []);
    });
  });
};

// Check if a player ID / username already exists
export const checkPlayerIdExists = (playerId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT 1 FROM scores WHERE playerId = ?', [playerId], (err, row) => {
      if (err) {
        console.error(`Error checking player ID existence for ${playerId}:`, err);
        return reject(err);
      }
      resolve(!!row);
    });
  });
};

// Rename player ID / username and migrate scores
export const renamePlayerId = (oldPlayerId, newPlayerId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT score FROM scores WHERE playerId = ?', [oldPlayerId], (err, row) => {
      if (err) {
        console.error(`Error finding score for rename of ${oldPlayerId}:`, err);
        return reject(err);
      }
      if (row) {
        db.run('UPDATE scores SET playerId = ?, playerName = ? WHERE playerId = ?', [newPlayerId, newPlayerId, oldPlayerId], (err2) => {
          if (err2) {
            console.error(`Error renaming playerId from ${oldPlayerId} to ${newPlayerId}:`, err2);
            return reject(err2);
          }
          resolve(row.score);
        });
      } else {
        db.run('INSERT INTO scores (playerId, playerName, score) VALUES (?, ?, 0)', [newPlayerId, newPlayerId], (err2) => {
          if (err2) {
            console.error(`Error inserting new player name ${newPlayerId} on rename:`, err2);
            return reject(err2);
          }
          resolve(0);
        });
      }
    });
  });
};

// Initialize invites/notifications database table
export const initInvitesDb = () => {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS offline_invites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        targetPlayerId TEXT NOT NULL,
        senderPlayerId TEXT NOT NULL,
        senderPlayerName TEXT NOT NULL,
        roomId TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Failed to create offline_invites table:', err);
        return reject(err);
      }
      resolve();
    });
  });
};

// Save a pending invite
export const saveOfflineInvite = (targetPlayerId, senderPlayerId, senderPlayerName, roomId) => {
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO offline_invites (targetPlayerId, senderPlayerId, senderPlayerName, roomId)
      VALUES (?, ?, ?, ?)
    `, [targetPlayerId, senderPlayerId, senderPlayerName, roomId], (err) => {
      if (err) {
        console.error('Failed to save offline invite:', err);
        return reject(err);
      }
      resolve();
    });
  });
};

// Retrieve offline invites for a player ID
export const getOfflineInvites = (targetPlayerId) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT senderPlayerId, senderPlayerName, roomId, createdAt 
      FROM offline_invites 
      WHERE targetPlayerId = ?
    `, [targetPlayerId], (err, rows) => {
      if (err) {
        console.error(`Error fetching offline invites for ${targetPlayerId}:`, err);
        return reject(err);
      }
      resolve(rows || []);
    });
  });
};

// Clear offline invites for a player ID
export const clearOfflineInvites = (targetPlayerId) => {
  return new Promise((resolve, reject) => {
    db.run(`
      DELETE FROM offline_invites 
      WHERE targetPlayerId = ?
    `, [targetPlayerId], (err) => {
      if (err) {
        console.error(`Error clearing offline invites for ${targetPlayerId}:`, err);
        return reject(err);
      }
      resolve();
    });
  });
};

