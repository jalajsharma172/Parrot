import React, { useState, useEffect } from "react";
import { Search, UserPlus, Check, Copy, Send, Info, Users, X } from "lucide-react";
import { useSocket } from "../services/SocketContext";

export default function Sidebar({ joinedRoomId, onJoinSuccess, onClose, isPublic }) {
  const { searchUsers, sendInvites, createRoom } = useSocket();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // Search users whenever query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      const res = await searchUsers(searchQuery);
      if (res.success && res.users) {
        // Exclude current user if matched
        const currentId = localStorage.getItem("playerId");
        const filtered = res.users.filter((u) => u.playerId !== currentId);
        setSuggestions(filtered);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleAddPlayer = (player) => {
    if (selectedPlayers.some((p) => p.playerId === player.playerId)) {
      // Remove if already selected
      setSelectedPlayers(selectedPlayers.filter((p) => p.playerId !== player.playerId));
    } else {
      setSelectedPlayers([...selectedPlayers, player]);
    }
  };

  const handleCopyLink = () => {
    if (joinedRoomId) {
      navigator.clipboard.writeText(joinedRoomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinOrCreateAndInvite = async () => {
    setError("");
    const playerName = localStorage.getItem("playerName") || "";
    if (!playerName.trim()) {
      setError("Please enter a username on the lobby panel first");
      return;
    }

    // Default settings for private room
    const settings = {
      maxPlayers: 10,
      rounds: 3,
      drawTime: 80,
      wordCount: 3,
      hints: 2,
      wordMode: "Normal",
      category: "Mixed",
      isPublic: false,
    };

    const savedAvatar = localStorage.getItem("playerAvatarIndex");
    const avatarIndex = savedAvatar ? parseInt(savedAvatar, 10) : 1;
    const avatarUrl = `/images/avtar (${avatarIndex}).png`;

    const res = await createRoom(playerName, avatarUrl, settings);
    if (res.success && onJoinSuccess) {
      // Invite selected players
      const targetPlayerIds = selectedPlayers.map((p) => p.playerId);
      if (targetPlayerIds.length > 0) {
        sendInvites(targetPlayerIds, res.roomId);
      }
      onJoinSuccess(res.roomId, res.playerId);
      setSelectedPlayers([]);
      setSearchQuery("");
    } else {
      setError(res.reason || "Failed to create room");
    }
  };

  const handleSendInvitesDirectly = () => {
    setError("");
    const targetPlayerIds = selectedPlayers.map((p) => p.playerId);
    if (targetPlayerIds.length > 0) {
      sendInvites(targetPlayerIds, joinedRoomId);
      setSelectedPlayers([]);
      setSearchQuery("");
    } else {
      setError("Please select at least one player to invite");
    }
  };

  return (
    <div className="sidebar-container">
      
      {/* Title */}
      <div className="sidebar-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users className="text-indigo-400" size={20} />
          <h2 className="sidebar-title">Invite Sidebar</h2>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="sidebar-close-btn" 
            title="Close"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner animate-pulse">
          {error}
        </div>
      )}

      {joinedRoomId && !isPublic && (
        <div className="room-active-info-panel" style={{ flex: 'none', minHeight: 'auto', marginBottom: '0.5rem' }}>
          <div className="active-code-box" style={{ padding: '0.75rem' }}>
            <span className="active-code-label">Active Room Code</span>
            <span className="active-code-display" style={{ fontSize: '1.5rem', padding: '0.375rem 0' }}>
              {joinedRoomId}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="copy-link-btn-full"
            style={{ padding: '0.375rem 0' }}
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy Code / Invite Link</span>
              </>
            )}
          </button>
          
          <div className="divider-line" style={{ margin: '0.75rem 0' }} />
        </div>
      )}

      {/* Shared Search Section */}
      <div className="search-field-wrapper">
        <label className="search-label">Search User ID</label>
        <div className="search-input-container">
          <input
            type="text"
            placeholder="Search username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <Search className="search-icon" size={14} />
        </div>
      </div>

      {/* Search Suggestions */}
      <div className="suggestions-scroll-box" style={{ flex: 1 }}>
        {searchQuery.trim() !== "" && (
          <div
            className="suggestion-card"
            style={{ border: '1px dashed var(--indigo-500)', background: 'rgba(30, 27, 75, 0.2)' }}
          >
            <div className="suggestion-info">
              <span className="suggestion-name-row" style={{ color: 'var(--indigo-300)', fontWeight: 800 }}>
                Invite Direct: {searchQuery.trim()}
              </span>
              <span className="suggestion-pts">Direct Request</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const exactPlayer = { playerId: searchQuery.trim(), playerName: searchQuery.trim(), score: 0, isOnline: false };
                handleAddPlayer(exactPlayer);
              }}
              className={`btn-add-suggestion ${selectedPlayers.some(p => p.playerId === searchQuery.trim()) ? "selected" : "unselected"}`}
            >
              {selectedPlayers.some(p => p.playerId === searchQuery.trim()) ? <Check size={12} /> : <UserPlus size={12} />}
            </button>
          </div>
        )}

        {suggestions.length === 0 ? (
          searchQuery.trim() === "" && (
            <div className="no-suggestions-text">
              Type to search database
            </div>
          )
        ) : (
          suggestions.filter(p => p.playerId !== searchQuery.trim()).map((player) => {
            const isSelected = selectedPlayers.some((p) => p.playerId === player.playerId);
            return (
              <div
                key={player.playerId}
                className="suggestion-card"
              >
                <div className="suggestion-info">
                  <span className="suggestion-name-row">
                    {player.playerName}
                    <span className={`status-dot ${player.isOnline ? "online animate-pulse" : "offline"}`} title={player.isOnline ? "Online" : "Offline"} />
                  </span>
                  <span className="suggestion-pts">🏆 {player.score} pts</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddPlayer(player)}
                  className={`btn-add-suggestion ${isSelected ? "selected" : "unselected"}`}
                >
                  {isSelected ? <Check size={12} /> : <UserPlus size={12} />}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Invitation List */}
      <div className="search-field-wrapper" style={{ flex: 'none' }}>
        <span className="invited-tags-label">
          <span>Inviting ({selectedPlayers.length})</span>
          {selectedPlayers.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedPlayers([])}
              className="clear-invited-btn"
            >
              Clear All
            </button>
          )}
        </span>
        <div className="invited-tags-container" style={{ minHeight: '40px' }}>
          {selectedPlayers.length === 0 ? (
            <span className="no-invited-text">No players selected. Click "+" to add.</span>
          ) : (
            selectedPlayers.map((player) => (
              <span
                key={player.playerId}
                className="invited-tag"
              >
                {player.playerName}
                <button
                  type="button"
                  onClick={() => handleAddPlayer(player)}
                  className="remove-tag-btn"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* Action Button at bottom */}
      <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--slate-800)' }}>
        {!joinedRoomId ? (
          <button
            type="button"
            onClick={handleJoinOrCreateAndInvite}
            className="btn-play-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.875rem', padding: '0.625rem 1rem' }}
          >
            <Send size={14} />
            Join Room & Invite
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSendInvitesDirectly}
            className="btn-play-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.875rem', padding: '0.625rem 1rem' }}
          >
            <Send size={14} />
            Send Invites
          </button>
        )}
      </div>

    </div>
  );
}
