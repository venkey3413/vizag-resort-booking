class ResortChatWidget {
    constructor() {
        this.isOpen = false;
        this.sessionId = this.generateSessionId();

        // ✅ HTTPS SAFE API URL
        this.apiUrl = "https://vizagresortbooking.in:8000";

        this.init();
    }

    generateSessionId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    }

    init() {
        this.createWidget();
        this.attachStyles();
    }

    createWidget() {
        const widget = document.createElement('div');
        widget.innerHTML = `
            <div id="chat-widget" class="chat-widget">
                <div id="chat-toggle" class="chat-toggle">
                    <img src="/logo.png" alt="Chat" class="chat-logo">
                </div>

                <div id="chat-window" class="chat-window">
                    <div class="chat-header">
                        <span>Vizag Resort Support</span>
                        <button id="chat-close">×</button>
                    </div>

                    <div id="chat-messages" class="chat-messages">
                        <div class="bot-message">
                            👋 Welcome to Vizag Resort Booking!<br><br>
                            I can help you with:
                            <ul>
                                <li>Refund policy</li>
                                <li>Check-in / Check-out</li>
                                <li>Resort rules</li>
                                <li>Booking status</li>
                            </ul>
                            How can I assist you today?
                        </div>
                    </div>

                    <div class="chat-input">
                        <input type="text" id="chat-input" placeholder="Type your message..." />
                        <button id="chat-send">Send</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(widget);
        this.bindEvents();
    }

    attachStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .chat-widget {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 99999;
                font-family: Arial, sans-serif;
            }

            .chat-toggle {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            }

            .chat-logo {
                width: 36px;
                height: 36px;
                border-radius: 50%;
            }

            .chat-window {
                position: absolute;
                bottom: 75px;
                right: 0;
                width: 360px;
                height: 480px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.25);
                display: none;
                flex-direction: column;
            }

            .chat-window.open {
                display: flex;
            }

            .chat-header {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                padding: 16px;
                font-weight: bold;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .chat-messages {
                flex: 1;
                padding: 16px;
                overflow-y: auto;
                background: #f7f7f7;
            }

            .bot-message,
            .user-message {
                max-width: 80%;
                padding: 10px 14px;
                margin-bottom: 10px;
                border-radius: 14px;
                font-size: 14px;
                line-height: 1.4;
            }

            .bot-message {
                background: white;
                border: 1px solid #ddd;
                align-self: flex-start;
            }

            .user-message {
                background: #667eea;
                color: white;
                align-self: flex-end;
            }

            .chat-input {
                display: flex;
                padding: 12px;
                border-top: 1px solid #ddd;
                gap: 8px;
            }

            .chat-input input {
                flex: 1;
                padding: 10px;
                border-radius: 20px;
                border: 1px solid #ccc;
                outline: none;
            }

            .chat-input button {
                background: #667eea;
                color: white;
                border: none;
                border-radius: 20px;
                padding: 10px 16px;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        document.getElementById('chat-toggle').onclick = () => this.toggleWidget();
        document.getElementById('chat-close').onclick = () => this.closeWidget();
        document.getElementById('chat-send').onclick = () => this.sendMessage();
        document.getElementById('chat-input').onkeypress = (e) => {
            if (e.key === 'Enter') this.sendMessage();
        };
    }

    toggleWidget() {
        this.isOpen = !this.isOpen;
        document.getElementById('chat-window').classList.toggle('open', this.isOpen);
    }

    closeWidget() {
        this.isOpen = false;
        document.getElementById('chat-window').classList.remove('open');
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        if (!message) return;

        this.addMessage(message, "user");
        input.value = "";

        try {
            const response = await fetch(`${this.apiUrl}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    message: message
                })
            });

            const data = await response.json();
            this.addMessage(data.answer || "No response", "bot");
        } catch (err) {
            this.addMessage("❌ Unable to connect. Please try again later.", "bot");
        }
    }

    addMessage(text, sender) {
        const container = document.getElementById('chat-messages');
        const div = document.createElement('div');
        div.className = sender === "user" ? "user-message" : "bot-message";
        div.innerHTML = text;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }
}

// ✅ AUTO-INITIALIZE
document.addEventListener("DOMContentLoaded", () => {
    new ResortChatWidget();
});
