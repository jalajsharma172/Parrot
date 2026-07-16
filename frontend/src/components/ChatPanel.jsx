import React from 'react';
import { Send } from 'lucide-react';

export default function ChatPanel({
    chatMessages,
    messageText,
    setMessageText,
    handleSend,
    chatEndRef
}) {
    return (
        <div className="guess-chat-panel">
            <span className="guess-chat-title">
                Chat & Guesses
            </span>

            {/* Chat log */}
            <div className="guess-log-scroll">
                {chatMessages.map((msg) => {
                    // Apply nice colored tags depending on guess status
                    let bubbleClass = 'guess-bubble-default';
                    if (msg.type === 'success') {
                        bubbleClass = 'guess-bubble-success';
                    } else if (msg.type === 'warning') {
                        bubbleClass = 'guess-bubble-warning animate-bounce';
                    } else if (msg.type === 'info') {
                        bubbleClass = 'guess-bubble-info';
                    } else if (msg.type === 'correct-guesser') {
                        bubbleClass = 'guess-bubble-correct-guesser';
                    } else if (msg.type === 'close-guess') {
                        bubbleClass = 'guess-bubble-close-guess';
                    }

                    const isSystem = msg.sender === 'System';

                    return (
                        <div key={msg.id} className={bubbleClass}>
                            {!isSystem && (
                                <span className="chat-sender">{msg.sender}:</span>
                            )}
                            <span>{msg.text}</span>
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <form onSubmit={handleSend} className="guess-form">
                <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your guess / message here..."
                    className="guess-input"
                />
                <button
                    type="submit"
                    className="btn-guess-submit"
                >
                    <Send size={15} />
                </button>
            </form>
        </div>
    );
}
