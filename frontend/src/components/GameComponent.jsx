import { useEffect, useState } from 'react';
import Lobby from './Lobby';
import GameRoom from './GameRoom';
import { useSocket } from '../services/SocketContext';
import EnteryComponent from './EnteryComponent';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import InviteOverlay from './InviteOverlay';
import FooterSection from './FooterSection';



function GameContent() {
    const { isConnected, gameState, players, persistentScore, activeInvite, setActiveInvite, joinRoom, playerName, avatarIndex } = useSocket();
    const [joinedRoomId, setJoinedRoomId] = useState(null);
    const [playerId, setPlayerId] = useState(null);
    const [showProfile, setShowProfile] = useState(false);
    const [profileCopied, setProfileCopied] = useState(false);//userName
    const [showInviteSidebar, setShowInviteSidebar] = useState(false);


    //Fetch UserName
    useEffect(() => {
        const username = localStorage.getItem("username");
        if (username) {
            // profileCopied(username);
        } else {
            // profileCopied("")
        }
    }, [])

    // const createuserName=()=>{
    //have a socket
    // }





    const handleJoinSuccess = (roomId, pId) => {
        setJoinedRoomId(roomId);
        setPlayerId(pId);
    };

    const handleLeaveRoom = () => {
        // Refresh page to clean socket and state
        window.location.href = window.location.pathname;
    };

    const me = players.find(p => p.id === playerId);
    const myScore = me ? me.score : 0;

    return (
        <div
            className="app-container"
            style={{ backgroundImage: "linear-gradient(to bottom, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.95)), url('/background/image.png')", minHeight: '50vh' }}>
            {/* Dynamic Header */}
            <Navbar
                joinedRoomId={joinedRoomId}
                persistentScore={persistentScore}
                myScore={myScore}
                handleLeaveRoom={handleLeaveRoom}
                isConnected={isConnected}
                showProfile={showProfile}
                setShowProfile={setShowProfile}
                avatarIndex={avatarIndex}
                playerName={playerName}
                profileCopied={profileCopied}
                setProfileCopied={setProfileCopied}
                handleJoinSuccess={handleJoinSuccess}
                showInviteSidebar={showInviteSidebar}
                setShowInviteSidebar={setShowInviteSidebar}
            />

            {/* Game Invitation Overlay */}
            <InviteOverlay
                activeInvite={activeInvite}
                setActiveInvite={setActiveInvite}
                joinRoom={joinRoom}
                handleJoinSuccess={handleJoinSuccess}
            />


            {/* Main Content Area */}
            <main className="main-layout">
                {!joinedRoomId ? (
                    <div className="home-row">
                        <EnteryComponent onJoinSuccess={handleJoinSuccess} />
                        {showInviteSidebar && (
                            <Sidebar 
                                joinedRoomId={joinedRoomId} 
                                onJoinSuccess={handleJoinSuccess} 
                                onClose={() => setShowInviteSidebar(false)}
                            />
                        )}
                    </div>
                ) : gameState.phase === 'lobby' ? (
                    <Lobby roomId={joinedRoomId} playerId={playerId} />
                ) : (
                    <GameRoom roomId={joinedRoomId} playerId={playerId} />
                )}
            </main>

            {/* Footer Area */}
            {(!joinedRoomId || gameState.phase === 'lobby') && (
                <div className="footer-wrapper">
                    <div id="polygon"></div>
                    <FooterSection />
                </div>
            )}
        </div>
    );
}
export default GameContent;
