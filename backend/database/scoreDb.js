import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema({
  playerId: { type: String, unique: true, required: true },
  playerName: { type: String, default: "" },
  score: { type: Number, default: 0 }
});

const Score = mongoose.model('Score', scoreSchema);

const offlineInviteSchema = new mongoose.Schema({
  targetPlayerId: { type: String, required: true },
  senderPlayerId: { type: String, required: true },
  senderPlayerName: { type: String, required: true },
  roomId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const OfflineInvite = mongoose.model('OfflineInvite', offlineInviteSchema);

// Initialize the scores table
export const initScoresDb = async () => {
  // Mongoose automatically handles collection creation.
  console.log('Scores DB initialized (Mongoose).');
};

// Save or update score for a player by ID
export const savePlayerScore = async (playerId, score) => {
  try {
    await Score.findOneAndUpdate(
      { playerId }, 
      { score }, 
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    console.error(`Error saving score for ${playerId}:`, err);
    throw err;
  }
};

// Get score for a player by ID
export const getPlayerScore = async (playerId) => {
  try {
    const doc = await Score.findOne({ playerId });
    return doc ? doc.score : 0;
  } catch (err) {
    console.error(`Error fetching score for ${playerId}:`, err);
    throw err;
  }
};

// Update name for a player by ID
export const updatePlayerName = async (playerId, playerName) => {
  try {
    const doc = await Score.findOneAndUpdate(
      { playerId }, 
      { playerName }, 
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return doc.score || 0;
  } catch (err) {
    console.error(`Error updating player name for ${playerId}:`, err);
    throw err;
  }
};

// Increment score for a player by ID
export const incrementPlayerScore = async (playerId, amount) => {
  try {
    const doc = await Score.findOneAndUpdate(
      { playerId },
      { $inc: { score: amount } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return doc.score;
  } catch (err) {
    console.error(`Error incrementing score for ${playerId}:`, err);
    throw err;
  }
};

// Search users matching a query
export const searchUsers = async (searchQuery) => {
  try {
    const rows = await Score.find({ 
      playerName: new RegExp(searchQuery, 'i'),
      playerName: { $ne: "" } 
    })
    .sort({ score: -1 })
    .limit(10)
    .select('playerId playerName score -_id')
    .lean();
    return rows || [];
  } catch (err) {
    console.error(`Error searching users with query "${searchQuery}":`, err);
    throw err;
  }
};

// Check if a player ID / username already exists
export const checkPlayerIdExists = async (playerId) => {
  try {
    const count = await Score.countDocuments({ playerId });
    return count > 0;
  } catch (err) {
    console.error(`Error checking player ID existence for ${playerId}:`, err);
    throw err;
  }
};

// Rename player ID / username and migrate scores
export const renamePlayerId = async (oldPlayerId, newPlayerId) => {
  try {
    const doc = await Score.findOne({ playerId: oldPlayerId });
    if (doc) {
      doc.playerId = newPlayerId;
      doc.playerName = newPlayerId;
      await doc.save();
      return doc.score;
    } else {
      await Score.create({ playerId: newPlayerId, playerName: newPlayerId, score: 0 });
      return 0;
    }
  } catch (err) {
    console.error(`Error renaming playerId from ${oldPlayerId} to ${newPlayerId}:`, err);
    throw err;
  }
};

// Initialize invites/notifications database table
export const initInvitesDb = async () => {
  // Mongoose automatically handles collection creation.
  console.log('Invites DB initialized (Mongoose).');
};

// Save a pending invite
export const saveOfflineInvite = async (targetPlayerId, senderPlayerId, senderPlayerName, roomId) => {
  try {
    await OfflineInvite.create({ targetPlayerId, senderPlayerId, senderPlayerName, roomId });
  } catch (err) {
    console.error('Failed to save offline invite:', err);
    throw err;
  }
};

// Retrieve offline invites for a player ID
export const getOfflineInvites = async (targetPlayerId) => {
  try {
    const rows = await OfflineInvite.find({ targetPlayerId })
      .select('senderPlayerId senderPlayerName roomId createdAt -_id')
      .lean();
    return rows || [];
  } catch (err) {
    console.error(`Error fetching offline invites for ${targetPlayerId}:`, err);
    throw err;
  }
};

// Clear offline invites for a player ID
export const clearOfflineInvites = async (targetPlayerId) => {
  try {
    await OfflineInvite.deleteMany({ targetPlayerId });
  } catch (err) {
    console.error(`Error clearing offline invites for ${targetPlayerId}:`, err);
    throw err;
  }
};
