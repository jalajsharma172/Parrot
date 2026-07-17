import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ExternalLink, HelpCircle } from 'lucide-react';
import chatMessages from '../utils/chatmsg'

function FooterSection() {
    const [visibleMessages, setVisibleMessages] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const chatContainerRef = useRef(null);

    useEffect(() => {
        setVisibleMessages([chatMessages[0]]);
        setCurrentIndex(1);
    }, []);

    useEffect(() => {
        if (currentIndex === 0) return;

        const interval = setInterval(() => {
            if (currentIndex < chatMessages.length) {
                setVisibleMessages((prev) => [...prev, chatMessages[currentIndex]]);
                setCurrentIndex((prev) => prev + 1);
            } else {
                // Loop back to start
                setVisibleMessages([chatMessages[0]]);
                setCurrentIndex(1);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [currentIndex]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [visibleMessages]);

    return (
        <footer className="app-footer">
            <div className="footer-left">
                <div className="footer-about-box">
                    <div className="about-header">
                        <HelpCircle className="about-icon" size={24} />
                        <h3>About</h3>
                    </div>
                    <div className="about-body">
                        <p><strong>skribbl.io</strong> is a free online multiplayer drawing and guessing pictionary game.</p>
                        <p>A normal game consists of a few rounds, where every round a player has to draw their chosen word and others have to guess it to gain points!</p>
                        <p>The person with the most points at the end of the game, will then be crowned as the winner!</p>
                        <p className="about-footer-tag">Have fun!</p>
                    </div>
                </div>
                <div className="footer-credits">
                    <span className="footer-logo">
                        <img src="/images/logo.png" alt="Logo" className="footer-logo-img" /> skribbl.io
                    </span>
                    <span>© {new Date().getFullYear()} - Play & Guess</span>

                    <div className="footer-right">
                        <a href="#how-to-play" className="footer-link">How to Play</a>
                        <a href="mailto:webaiagent2@gmail.com" title="Mail:webaiagent2@gmail.com" className="footer-link">Feedback</a>
                        <a
                            href="https://github.com/jalajsharma172/Exceldraw"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="footer-link"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                            <ExternalLink size={14} /> GitHub
                        </a>
                    </div>
                </div>
            </div>

            <div className="footer-chat-layout">
                {/* Left Mascot */}
                <div className="footer-meme-container">
                    <img
                        src="/background/cup.png"
                        alt="Player 1"
                        className="footer-meme-img"
                    />
                </div>

                {/* Talk / Comment Box */}
                <div className="footer-chat-box">
                    <div className="footer-chat-header">
                        <div className="chat-dot-indicator"></div>
                        <span>Lobby Talk</span>
                    </div>
                    <div className="footer-chat-messages" ref={chatContainerRef}>
                        {visibleMessages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`chat-bubble-wrapper ${msg.sender === 'Player 1' ? 'left-align' : 'right-align'
                                    }`}
                            >
                                <span className="chat-bubble-name">{msg.sender}</span>
                                <div className={`chat-bubble ${msg.sender === 'Player 1' ? 'bubble-p1' : 'bubble-p2'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Mascot */}
                <div className="footer-meme-container">
                    <img
                        src="/background/meme.png"
                        alt="Player 2"
                        className="footer-meme-img"
                    />
                </div>
            </div>
        </footer>
    );
}

export default FooterSection;