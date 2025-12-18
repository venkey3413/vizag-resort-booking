class ResortChatWidget {
    constructor(options = {}) {
        this.isOpen = false;
        this.sessionId = this.generateSessionId();
        this.apiUrl = options.apiUrl || '';
        this.init();
    }

    generateSessionId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
                    <span>💬</span>
                </div>
                <div id="chat-window" class="chat-window">
                    <div class="chat-header">
                        <span>Resort Support</span>
                        <button id="chat-close">×</button>
                    </div>
                    <div id="chat-messages" class="chat-messages">
                        <div class="bot-message">
                            Hi! I can help you with:
                            • Resort availability
                            • Booking information
                            • Refund policies
                            
                            How can I assist you today?
                        </div>
                    </div>
                    <div class="chat-input">
                        <input type="text" id="chat-input" placeholder="Type your message...">
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
                z-index: 1000;
                font-family: Arial, sans-serif;
            }
            
            .chat-toggle {
                width: 60px;
                height: 60px;
                background: #007bff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                font-size: 24px;
                color: white;
            }
            
            .chat-window {
                position: absolute;
                bottom: 70px;
                right: 0;
                width: 350px;
                height: 450px;
                background: white;
                border-radius: 10px;
                box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                display: none;
                flex-direction: column;
            }
            
            .chat-window.open {
                display: flex;
            }
            
            .chat-header {
                background: #007bff;
                color: white;
                padding: 15px;
                border-radius: 10px 10px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .chat-messages {
                flex: 1;
                padding: 15px;
                overflow-y: auto;
                max-height: 300px;
            }
            
            .bot-message, .user-message {
                margin: 10px 0;
                padding: 10px;
                border-radius: 10px;
                max-width: 80%;
                word-wrap: break-word;
            }
            
            .bot-message {
                background: #f1f3f4;
                align-self: flex-start;
            }
            
            .user-message {
                background: #007bff;
                color: white;
                align-self: flex-end;
                margin-left: auto;
            }
            
            .chat-input {
                display: flex;
                padding: 15px;
                border-top: 1px solid #eee;
            }
            
            .chat-input input {
                flex: 1;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 20px;
                outline: none;
            }
            
            .chat-input button {
                margin-left: 10px;
                padding: 10px 15px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 20px;
                cursor: pointer;
            }
            
            #chat-close {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        document.getElementById('chat-toggle').addEventListener('click', () => {
            this.toggleWidget();
        });

        document.getElementById('chat-close').addEventListener('click', () => {
            this.closeWidget();
        });

        document.getElementById('chat-send').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    toggleWidget() {
        this.isOpen = !this.isOpen;
        const window = document.getElementById('chat-window');
        if (this.isOpen) {
            window.classList.add('open');
        } else {
            window.classList.remove('open');
        }
    }

    closeWidget() {
        this.isOpen = false;
        document.getElementById('chat-window').classList.remove('open');
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;

        this.addMessage(message, 'user');
        input.value = '';

        try {
            const response = await fetch(`${this.apiUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    message: message
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data && data.answer) {
                this.addMessage(data.answer, 'bot');
            } else {
                throw new Error('Invalid response format');
            }

            if (data.handover) {
                setTimeout(() => {
                    this.addMessage('You have been connected to our support team. They will respond shortly.', 'bot');
                }, 1000);
            }
        } catch (error) {
            this.addMessage('Sorry, there was an error. Please try again.', 'bot');
        }
    }

    addMessage(message, sender) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = sender === 'user' ? 'user-message' : 'bot-message';
        messageDiv.textContent = message;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Initialize widget when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ResortChatWidget();
});