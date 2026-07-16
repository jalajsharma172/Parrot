import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Copy, LogIn, Bell, X, UserPlus } from 'lucide-react';
import { useSocket } from '../services/SocketContext';

export default function Navbar({ joinedRoomId, persistentScore, myScore, handleLeaveRoom, isConnected, showProfile, setShowProfile, avatarIndex, playerName, profileCopied, setProfileCopied, handleJoinSuccess, showInviteSidebar, setShowInviteSidebar }) {
    const { updateUsername, notifications, removeNotification, joinRoom } = useSocket();
    const [hasLoggedIn, setHasLoggedIn] = useState(!!localStorage.getItem("username"));
    const [showLoginForm, setShowLoginForm] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [usernameInput, setUsernameInput] = useState("");
    const [loginError, setLoginError] = useState("");

    const profileRef = useRef(null);
    const notificationsRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfile(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [setShowProfile]);

    const handleAcceptInvite = async (roomId) => {
        let name = playerName || localStorage.getItem("playerName") || "";
        name = name.trim();
        if (!name) {
            alert("Please enter a username on the lobby panel first before accepting invites.");
            setShowNotifications(false);
            return;
        }
        const avatarUrl = `/images/avtar (${avatarIndex || 1}).png`;
        try {
            const res = await joinRoom(roomId, name, avatarUrl);
            if (res.success && handleJoinSuccess) {
                handleJoinSuccess(res.roomId, res.playerId);
                removeNotification(roomId);
                setShowNotifications(false);
            } else {
                alert(res.reason || "Failed to join room.");
            }
        } catch (err) {
            alert("Error joining room: " + err.message);
        }
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoginError("");
        const username = usernameInput.trim();

        if (!username) {
            setLoginError("Please enter a username.");
            return;
        }

        try {
            const res = await updateUsername(username);
            if (res.success) {
                localStorage.setItem("username", res.username);
                setHasLoggedIn(true);
                setShowLoginForm(false);
            } else {
                setLoginError(res.reason || "Failed to set username.");
            }
        } catch (err) {
            setLoginError(err?.message || "An error occurred.");
        }
    };

    return (
        <header className="app-header">

            <div
                onClick={joinedRoomId ? handleLeaveRoom : undefined}
                className={`header-logo ${joinedRoomId ? 'clickable' : ''}`}
            >
                <img src="/images/logo.png" alt="Logo" className="header-logo-img" />
                <span>skribbl.io</span>
            </div>

            <div className="header-actions">
                <div className="score-badge">
                    🏆 {persistentScore} pts
                </div>

                {joinedRoomId && (
                    <>
                        {/* <div className="score-badge">
                            🏆 {myScore} pts
                        </div> */}
                        <button
                            onClick={handleLeaveRoom}
                            className="btn-header-leave"
                        >
                            Leave Room
                        </button>
                    </>
                )}
                {/* Temp for Checking Server Temp hai */}
                <div className="connection-indicator">
                    <span className={`connection-dot ${isConnected ? 'online animate-pulse' : 'offline'}`} />
                    <span className="connection-text">
                        {isConnected ? 'Server Connected' : 'Disconnected'}
                    </span>
                </div>

                {/* Notifications Bell Dropdown */}
                <div className="notifications-section-wrapper" ref={notificationsRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => {
                            setShowNotifications(!showNotifications);
                            setShowProfile(false);
                        }}
                        className="avatar-profile-btn"
                        style={{ display: 'flex', position: 'relative', background: 'var(--slate-800)', border: '1px solid var(--slate-700)', color: 'var(--slate-300)' }}
                        title="Notifications"
                    >
                        <Bell size={18} />
                        {notifications && notifications.length > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-2px',
                                right: '-2px',
                                backgroundColor: 'var(--rose-500)',
                                color: '#white',
                                borderRadius: '50%',
                                width: '16px',
                                height: '16px',
                                fontSize: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold'
                            }}>
                                {notifications.length}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="profile-dropdown animate-scale-in text-white" style={{ right: 0, width: '18rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div className="profile-dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem' }}>
                                <span className="dropdown-label" style={{ fontSize: '12px' }}>Notifications</span>
                                {notifications && notifications.length > 0 && (
                                    <button
                                        onClick={() => notifications.forEach(n => removeNotification(n.roomId))}
                                        style={{ background: 'none', border: 'none', color: 'var(--rose-400)', fontSize: '10px', cursor: 'pointer' }}
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>

                            <div className="profile-dropdown-body" style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {!notifications || notifications.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--slate-400)', fontSize: '12px' }}>
                                        No pending invites
                                    </div>
                                ) : (
                                    notifications.map((invite, index) => (
                                        <div
                                            key={`${invite.roomId}-${index}`}
                                            style={{
                                                background: 'var(--slate-950)',
                                                border: '1px solid var(--slate-800)',
                                                borderRadius: '0.5rem',
                                                padding: '0.625rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.375rem'
                                            }}
                                        >
                                            <div style={{ fontSize: '11px', color: 'var(--slate-300)', lineHeight: '1.3' }}>
                                                <strong>{invite.senderPlayerName}</strong> invited you to join room <strong>{invite.roomId}</strong>.
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem' }}>
                                                <button
                                                    onClick={() => handleAcceptInvite(invite.roomId)}
                                                    className="btn-inline-join"
                                                    style={{ flex: 1, padding: '4px 8px', fontSize: '10px' }}
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => removeNotification(invite.roomId)}
                                                    className="btn-inline-cancel"
                                                    style={{ padding: '4px 8px', fontSize: '10px' }}
                                                >
                                                    Dismiss
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Circle Avatar Profile Section */}
                <div className="profile-section-wrapper" ref={profileRef}>
                    <button
                        onClick={() => setShowProfile(!showProfile)}
                        className="avatar-profile-btn"
                        title="My Profile">
                        <img
                            src={`/images/avtar (${avatarIndex || 1}).png`}
                            alt="Profile Avatar"
                            onError={(e) => { e.target.src = '/images/avtar (1).png'; }}
                        />
                    </button>

                    {/* Dropdown displaying User ID (playerName) */}
                    {showProfile && (
                        <div className="profile-dropdown animate-scale-in text-white">
                            <div className="profile-dropdown-header">
                                <div className="dropdown-avatar-container">
                                    <img
                                        src={`/images/avtar (${avatarIndex || 1}).png`}
                                        alt="Profile Avatar"
                                    />
                                </div>
                                <div className="dropdown-user-info">
                                    <span className="dropdown-label">Active User</span>
                                    <span className="dropdown-username">{playerName || "Guest"}</span>
                                </div>
                            </div>

                            <div className="profile-dropdown-body">
                                <span className="dropdown-label">User ID (Click to Copy)</span>
                                {!hasLoggedIn ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setShowLoginForm(!showLoginForm)}
                                            className="login-trigger-btn"
                                        >
                                            <LogIn size={14} />
                                            <span>Login</span>
                                        </button>
                                        {showLoginForm && (
                                            <form onSubmit={handleLoginSubmit} className="dropdown-login-form animate-fade-in">
                                                <div className="login-form-field">
                                                    <input
                                                        type="text"
                                                        placeholder="Unique Username"
                                                        value={usernameInput}
                                                        onChange={(e) => setUsernameInput(e.target.value)}
                                                        className="login-form-input"
                                                        maxLength={18}
                                                        required
                                                    />
                                                </div>
                                                {loginError && <p className="login-form-error">{loginError}</p>}
                                                <button type="submit" className="login-form-submit-btn">
                                                    Submit
                                                </button>
                                            </form>
                                        )}
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(playerName || "Guest");
                                            setProfileCopied(true);
                                            setTimeout(() => setProfileCopied(false), 2000);
                                        }}
                                        className="copy-id-btn"
                                    >
                                        <span className="username-text">{playerName || "Guest"}</span>
                                        {profileCopied ? (
                                            <span className="copied-badge">
                                                Copied!
                                            </span>
                                        ) : (
                                            <Copy size={12} style={{ color: 'var(--slate-500)', flexShrink: 0 }} />
                                        )}
                                    </button>
                                )}

                                {/* Toggle Invite Sidebar Button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowInviteSidebar(!showInviteSidebar);
                                        setShowProfile(false); // Close dropdown
                                    }}
                                    className={`invite-toggle-btn ${showInviteSidebar ? 'active' : ''}`}
                                >
                                    <UserPlus size={14} />
                                    <span>{showInviteSidebar ? 'Hide Invite Sidebar' : 'Show Invite Sidebar'}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
