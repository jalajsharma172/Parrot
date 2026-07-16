import React, { useState, useEffect } from "react";
import { useSocket } from "../services/SocketContext";
import { Dices } from "lucide-react";

const getAvatarUrl = (index) => `/images/avtar (${index}).png`;

export default function EntryComponent({ onJoinSuccess }) {
    const { createRoom, joinRoom, quickJoin, syncAvatar, updateUsername, playerName: socketPlayerName } = useSocket();
    const [playerName, setPlayerName] = useState(socketPlayerName || localStorage.getItem("playerName") || "");
    const [avatarIndex, setAvatarIndex] = useState(1);
    const [error, setError] = useState("");
    const [showJoinInput, setShowJoinInput] = useState(false);
    const [roomCodeInput, setRoomCodeInput] = useState("");

    useEffect(() => {
        if (socketPlayerName) {
            setPlayerName(socketPlayerName);
        }
    }, [socketPlayerName]);

    useEffect(() => {
        const savedAvatar = localStorage.getItem("playerAvatarIndex");
        if (savedAvatar) {
            const idx = parseInt(savedAvatar, 10);
            setAvatarIndex(idx);
            syncAvatar(idx);
        } else {
            const idx = Math.floor(Math.random() * 24) + 1;
            setAvatarIndex(idx);
            localStorage.setItem("playerAvatarIndex", idx);
            syncAvatar(idx);
        }
    }, []);


    const changeAvatar = (amount) => {
        setAvatarIndex((prev) => {
            let next = prev + amount;
            if (next < 1) next = 24 + (next % 24);
            if (next > 24) next = (next % 24) || 24;
            localStorage.setItem("playerAvatarIndex", next);
            syncAvatar(next);
            return next;
        });
    };

    const randomizeAvatar = () => {
        const next = Math.floor(Math.random() * 24) + 1;
        setAvatarIndex(next);
        localStorage.setItem("playerAvatarIndex", next);
        syncAvatar(next);
    };

    const tryUpdateUsername = async () => {
        if (!playerName || !playerName.trim()) {
            throw "Please enter a username";
        }
        const res = await updateUsername(playerName.trim());
        if (!res.success) {
            throw res.reason || "Username is already taken";
        }
        return res.username;
    };

    const handlePlay = async (e) => {
        if (e) e.preventDefault();
        setError("");
        try {
            const finalName = await tryUpdateUsername();
            const params = new URLSearchParams(window.location.search);
            const roomCode = params.get("room");
            const avatarUrl = getAvatarUrl(avatarIndex);

            if (roomCode) {
                const res = await joinRoom(roomCode.toUpperCase(), finalName, avatarUrl);
                if (res.success && onJoinSuccess) {
                    onJoinSuccess(res.roomId, res.playerId);
                } else if (!res.success) {
                    setError(res.reason || "Failed to join room");
                }
            } else {
                const res = await quickJoin(finalName, avatarUrl);
                if (res.success && onJoinSuccess) {
                    onJoinSuccess(res.roomId, res.playerId);
                } else if (!res.success) {
                    setError(res.reason || "Failed to join public lobby");
                }
            }
        } catch (err) {
            setError(err || "Failed to set username");
        }
    };

    const handleCreatePrivate = async () => {
        setError("");
        try {
            const finalName = await tryUpdateUsername();
            const settings = {
                maxPlayers: 10,
                rounds: 3,
                drawTime: 80,
                wordCount: 3,
                hints: 2,
                wordMode: "Normal",
                category: "Mixed",
                isPublic: false
            };

            const res = await createRoom(finalName, getAvatarUrl(avatarIndex), settings);
            if (res.success && onJoinSuccess) {
                onJoinSuccess(res.roomId, res.playerId);
            } else if (!res.success) {
                setError(res.reason || "Failed to create room");
            }
        } catch (err) {
            setError(err || "Failed to set username");
        }
    };

    const handleJoinPrivate = async (e) => {
        if (e) e.preventDefault();
        if (!roomCodeInput.trim() || roomCodeInput.length !== 6) {
            setError("Please enter a valid 6-character room code");
            return;
        }
        setError("");
        try {
            const finalName = await tryUpdateUsername();
            const avatarUrl = getAvatarUrl(avatarIndex);
            const res = await joinRoom(roomCodeInput.toUpperCase().trim(), finalName, avatarUrl);
            if (res.success && onJoinSuccess) {
                onJoinSuccess(res.roomId, res.playerId);
            } else if (!res.success) {
                setError(res.reason || "Failed to join room");
            }
        } catch (err) {
            setError(err || "Failed to set username");
        }
    };


    return (
        <div className="lobby-entry-card">
            {error && (
                <div className="error-banner">
                    {error}
                </div>
            )}

            <form onSubmit={handlePlay} className="action-buttons-wrapper">
                <input
                    type="text"
                    value={playerName}
                    onChange={(e) => {
                        setPlayerName(e.target.value);
                    }}
                    placeholder="Enter Username"
                    maxLength={18}
                    className="name-input"
                />

                {/* Character Customization Box */}
                <div className="avatar-customizer-box">
                    {/* Dice randomizer in top-right */}
                    <button
                        type="button"
                        onClick={randomizeAvatar}
                        className="avatar-dice-btn"
                        title="Randomize Avatar"
                    >
                        <Dices size={18} />
                    </button>

                    {/* Left Arrows Column */}
                    <div className="avatar-arrows-col">
                        <button
                            type="button"
                            onClick={() => changeAvatar(-1)}
                            className="avatar-arrow-btn"
                        >
                            &lt;
                        </button>
                        <button
                            type="button"
                            onClick={() => changeAvatar(-3)}
                            className="avatar-arrow-btn"
                        >
                            &lt;
                        </button>
                        <button
                            type="button"
                            onClick={() => changeAvatar(-7)}
                            className="avatar-arrow-btn"
                        >
                            &lt;
                        </button>
                    </div>

                    {/* Avatar Character render */}
                    <div className="avatar-preview-wrapper">
                        <img
                            src={getAvatarUrl(avatarIndex)}
                            alt="Avatar"
                            className="avatar-preview-img"
                            onError={(e) => {
                                e.target.src = getAvatarUrl(1);
                            }}
                        />
                    </div>

                    {/* Right Arrows Column */}
                    <div className="avatar-arrows-col">
                        <button
                            type="button"
                            onClick={changeAvatar.bind(null, 1)}
                            className="avatar-arrow-btn"
                        >
                            &gt;
                        </button>
                        <button
                            type="button"
                            onClick={changeAvatar.bind(null, 3)}
                            className="avatar-arrow-btn"
                        >
                            &gt;
                        </button>
                        <button
                            type="button"
                            onClick={changeAvatar.bind(null, 7)}
                            className="avatar-arrow-btn"
                        >
                            &gt;
                        </button>
                    </div>
                </div>

                {/* Buttons */}
                <div className="action-buttons-wrapper">
                    <button
                        type="submit"
                        className="btn-play-primary"
                    >
                        Play!
                    </button>
                    <button
                        type="button"
                        onClick={handleCreatePrivate}
                        className="btn-play-secondary"
                    >
                        Create Private Room
                    </button>

                    {!showJoinInput ? (
                        <button
                            type="button"
                            onClick={() => setShowJoinInput(true)}
                            className="btn-play-purple"
                        >
                            Join Private Room
                        </button>
                    ) : (
                        <div className="join-private-panel animate-scale-in">
                            <span className="join-private-title">Join Private Room</span>
                            <div className="join-private-row">
                                <input
                                    type="text"
                                    value={roomCodeInput}
                                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                                    placeholder="Room Code"
                                    maxLength={6}
                                    className="room-code-input"
                                />
                                <button
                                    type="button"
                                    onClick={handleJoinPrivate}
                                    className="btn-inline-join"
                                >
                                    Join
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowJoinInput(false); setRoomCodeInput(""); }}
                                    className="btn-inline-cancel"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}