import React from 'react';
import { Sparkles } from 'lucide-react';

export default function InviteOverlay({
    activeInvite,
    setActiveInvite,
    joinRoom,
    handleJoinSuccess
}) {
    if (!activeInvite) return null;

    return (
        <div className="invite-overlay animate-fade-in">
            <div className="invite-modal animate-scale-in">
                <div className="invite-icon-wrapper">
                    <Sparkles size={32} className="animate-pulse" />
                </div>
                <div>
                    <h3 className="invite-title">Game Invitation!</h3>
                    <p className="invite-text">
                        <span className="invite-host">{activeInvite.hostName}</span> has invited you to join their private room.
                    </p>
                </div>
                <div className="invite-room-code">
                    {activeInvite.roomId}
                </div>
                <div className="invite-actions">
                    <button
                        type="button"
                        onClick={async () => {
                            const name = localStorage.getItem("playerName") || "Guest";
                            const savedAvatar = localStorage.getItem("playerAvatarIndex");
                            const avatarIdx = savedAvatar ? parseInt(savedAvatar, 10) : 1;
                            const avatarUrl = `/images/avtar (${avatarIdx}).png`;

                            const res = await joinRoom(activeInvite.roomId, name, avatarUrl);
                            if (res.success) {
                                handleJoinSuccess(res.roomId, res.playerId);
                            } else {
                                alert(res.reason || "Failed to join room");
                            }
                            setActiveInvite(null);
                        }}
                        className="btn-3d btn-3d-green"
                    >
                        Accept
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveInvite(null)}
                        className="btn-3d btn-3d-slate"
                    >
                        Decline
                    </button>
                </div>
            </div>
        </div>
    );
}
