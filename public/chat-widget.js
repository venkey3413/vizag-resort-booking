class ResortChatWidget {
    constructor(options = {}) {
        this.isOpen = false;
        this.sessionId = this.generateSessionId();
        this.apiUrl = options.apiUrl || '';
        this.wsUrl = options.wsUrl || this.apiUrl.replace('http', 'ws');
        this.ws = null;
        this.init();
        this.connectWebSocket();
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
                    <img src="/logo.png" alt="Chat" class="chat-logo">
                </div>
                <div id="chat-window" class="chat-window">
                    <div class="chat-header">
                        <div class="header-content">
                            <img src="/logo.png" alt="Keey" class="header-logo">
                            <span>Ask Keey 😊</span>
                        </div>
                        <button id="chat-close">×</button>
                    </div>
                    <div id="chat-messages" class="chat-messages">
                        <div class="bot-message">
                            HI, I am Keey vizag resort chat bot, How may assist you today?
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
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
            
            .chat-widget {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 1000;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .chat-toggle {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #32CD32 0%, #9ACD32 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 8px 25px rgba(50, 205, 50, 0.4);
                transition: all 0.3s ease;
            }
            
            .chat-toggle:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(50, 205, 50, 0.5);
            }
            
            .chat-logo {
                width: 35px;
                height: 35px;
                border-radius: 50%;
            }
            
            .chat-window {
                position: absolute;
                bottom: 75px;
                right: 0;
                width: 380px;
                height: 500px;
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.15);
                display: none;
                flex-direction: column;
                overflow: hidden;
                border: 1px solid rgba(0,0,0,0.08);
            }
            
            .chat-window.open {
                display: flex;
                animation: slideUp 0.3s ease-out;
            }
            
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .chat-header {
                background: linear-gradient(135deg, #32CD32 0%, #9ACD32 100%);
                color: #2d3748;
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: 600;
                font-size: 16px;
                box-shadow: 0 2px 10px rgba(50, 205, 50, 0.2);
            }
            
            .header-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .header-logo {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                border: 2px solid #2d3748;
            }
            
            .chat-messages {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
                background: #fafbfc;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .chat-messages::-webkit-scrollbar {
                width: 4px;
            }
            
            .chat-messages::-webkit-scrollbar-track {
                background: transparent;
            }
            
            .chat-messages::-webkit-scrollbar-thumb {
                background: #ddd;
                border-radius: 2px;
            }
            
            .bot-message, .user-message {
                padding: 12px 16px;
                border-radius: 18px;
                max-width: 85%;
                word-wrap: break-word;
                font-size: 14px;
                line-height: 1.4;
                font-weight: 700;
                box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            }
            
            .bot-message {
                background: #f8fff8;
                color: #2d3748;
                align-self: flex-start;
                border: 1px solid #32CD32;
                border-bottom-left-radius: 6px;
                position: relative;
                line-height: 1.6;
            }
            
            .bot-message::before {
                content: '🤖';
                position: absolute;
                left: -8px;
                top: -8px;
                background: #32CD32;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
            }
            
            .bot-message a {
                transition: all 0.2s ease;
            }
            
            .bot-message a:hover {
                background: rgba(50,205,50,0.2) !important;
                transform: translateY(-1px);
            }
            
            .user-message {
                background: linear-gradient(135deg, #32CD32 0%, #9ACD32 100%);
                color: #2d3748;
                align-self: flex-end;
                border-bottom-right-radius: 6px;
                font-weight: 700;
            }
            
            .chat-input {
                display: flex;
                padding: 20px;
                background: white;
                border-top: 1px solid #e2e8f0;
                gap: 12px;
            }
            
            .chat-input input {
                flex: 1;
                padding: 12px 16px;
                border: 1px solid #e2e8f0;
                border-radius: 24px;
                outline: none;
                font-size: 14px;
                font-family: inherit;
                background: #f7fafc;
                transition: all 0.2s ease;
            }
            
            .chat-input input:focus {
                border-color: #32CD32;
                background: white;
                box-shadow: 0 0 0 3px rgba(50, 205, 50, 0.1);
            }
            
            .chat-input button {
                padding: 12px 20px;
                background: linear-gradient(135deg, #32CD32 0%, #9ACD32 100%);
                color: #2d3748;
                border: none;
                border-radius: 24px;
                cursor: pointer;
                font-weight: 600;
                font-size: 14px;
                transition: all 0.2s ease;
                font-family: inherit;
            }
            
            .chat-input button:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(50, 205, 50, 0.3);
            }
            
            #chat-close {
                background: none;
                border: none;
                color: #2d3748;
                font-size: 24px;
                cursor: pointer;
                padding: 4px;
                border-radius: 50%;
                transition: background 0.2s ease;
            }
            
            #chat-close:hover {
                background: rgba(45,55,72,0.1);
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

    connectWebSocket() {
        try {
            this.ws = new WebSocket(`${this.wsUrl}/ws/chat/${this.sessionId}`);
            
            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'agent_message') {
                    this.addMessage(data.message, 'bot');
                }
            };
            
            this.ws.onclose = () => {
                setTimeout(() => this.connectWebSocket(), 3000);
            };
        } catch (error) {
            console.log('WebSocket connection failed, using polling fallback');
        }
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
        
        // Format message with better line breaks, emojis, and clickable links
        const formattedMessage = message
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/•/g, '<span style="color: #32CD32; font-weight: bold;">•</span>')
            .replace(/✅/g, '<span style="font-size: 16px;">✅</span>')
            .replace(/❌/g, '<span style="font-size: 16px;">❌</span>')
            .replace(/💰/g, '<span style="font-size: 16px;">💰</span>')
            .replace(/📍/g, '<span style="font-size: 16px;">📍</span>')
            .replace(/📅/g, '<span style="font-size: 16px;">📅</span>')
            .replace(/🏨/g, '<span style="font-size: 16px;">🏨</span>')
            .replace(/🔗/g, '<span style="font-size: 16px;">🔗</span>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: #32CD32; font-weight: bold; text-decoration: none; background: rgba(50,205,50,0.1); padding: 4px 8px; border-radius: 12px; display: inline-block; margin: 2px;">$1</a>');
        
        messageDiv.innerHTML = formattedMessage;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Initialize widget when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ResortChatWidget({
        apiUrl: window.location.origin,
        wsUrl: 'ws://chat-system:8000'
    });
});