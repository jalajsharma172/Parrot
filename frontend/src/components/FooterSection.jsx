import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ExternalLink, HelpCircle } from 'lucide-react';

const chatMessages = [
    { sender: 'Player 1', text: "Hey" },
    { sender: 'Player 1', text: "How is everything going for u" },
    { sender: 'Player 2', text: "I'm good what about u" },
    { sender: 'Player 1', text: "I'm good to wanna play game?" },
    { sender: 'Player 2', text: "I wanna but my internet is slow u can beat me in game in that case" },
    { sender: 'Player 2', text: "Ohh.. yeah" },
    { sender: 'Player 2', text: "Internet Came Back Man...." },
    { sender: 'Player 1', text: "Let's play" },
    { sender: 'Player 2', text: "But man..." },
    { sender: 'Player 1', text: "What happened now? 😂" },
    { sender: 'Player 2', text: "I can't draw a straight line." },
    { sender: 'Player 1', text: "Don't worry, nobody can." },
    { sender: 'Player 2', text: "Last game I drew a fish." },
    { sender: 'Player 1', text: "Nice!" },
    { sender: 'Player 2', text: "Everyone guessed banana 🍌" },
    { sender: 'Player 1', text: "😂😂 That's impressive." },
    { sender: 'Player 2', text: "My drawing skills should be illegal." },
    { sender: 'Player 1', text: "Then just guess words fast." },
    { sender: 'Player 2', text: "I'm better at guessing than drawing." },
    { sender: 'Player 1', text: "Same here." },
    { sender: 'Player 2', text: "What's your favorite word to draw?" },
    { sender: 'Player 1', text: "Pizza. It's just a triangle with cheese." },
    { sender: 'Player 2', text: "Fair enough 😂" },
    { sender: 'Player 1', text: "Which word do you hate?" },
    { sender: 'Player 2', text: "Bicycle." },
    { sender: 'Player 1', text: "Why?" },
    { sender: 'Player 2', text: "Too many circles 😭" },
    { sender: 'Player 1', text: "Haha true." },
    { sender: 'Player 2', text: "I hope I don't get 'helicopter' today." },
    { sender: 'Player 1', text: "Just draw a fan with legs 😂" },
    { sender: 'Player 2', text: "That's actually a good idea." },
    { sender: 'Player 1', text: "Promise not to laugh at my art?" },
    { sender: 'Player 2', text: "No promises 😆" },
    { sender: 'Player 1', text: "At least guess my drawings." },
    { sender: 'Player 2', text: "Only if you guess mine." },
    { sender: 'Player 1', text: "Deal 🤝" },
    { sender: 'Player 2', text: "Looks like more players are joining." },
    { sender: 'Player 1', text: "Nice! Game is about to start." },
    { sender: 'Player 2', text: "Let's see who wins. Good luck!" },
    { sender: 'Player 1', text: "Good luck! 🎨" }
];

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
                        <a href="#feedback" className="footer-link">Feedback</a>
                        <a
                            href="https://github.com"
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
                                className={`chat-bubble-wrapper ${
                                    msg.sender === 'Player 1' ? 'left-align' : 'right-align'
                                }`}
                            >
                                <span className="chat-bubble-name">{msg.sender}</span>
                                <div className={`chat-bubble ${
                                    msg.sender === 'Player 1' ? 'bubble-p1' : 'bubble-p2'
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