class ResortChatWidget {
  constructor() {
    this.isOpen = false;
    this.sessionId = this.generateSessionId();

    // 🔐 BACKEND CONFIG
    this.apiUrl = "http://35.154.92.5:8000";
    this.wsUrl = "ws://35.154.92.5:8000/ws/chat";

    this.socket = null;
    this.handoverActive = false;

    this.init();
  }

  generateSessionId() {
    return "chat_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10);
  }

  init() {
    this.createWidget();
    this.attachStyles();
    this.connectWebSocket();
  }

  // ==========================
  // 🧱 UI
  // ==========================
  createWidget() {
    const widget = document.createElement("div");
    widget.innerHTML = `
      <div id="chat-widget" class="chat-widget">
        <div id="chat-toggle" class="chat-toggle">
          <img src="/logo.png" class="chat-logo" />
        </div>

        <div id="chat-window" class="chat-window">
          <div class="chat-header">
            <span>Vizag Resort Support</span>
            <button id="chat-close">×</button>
          </div>

          <div id="chat-messages" class="chat-messages">
            <div class="bot-message">
              👋 Welcome to Vizag Resort Booking!<br><br>
              I can help you with:<br>
              • Refund policy<br>
              • Check-in / Check-out<br>
              • Resort rules<br>
              • Availability<br><br>
              Or talk to a human agent anytime 👇
            </div>
          </div>

          <div class="chat-actions">
            <button id="humanBtn" class="human-btn">👩💼 Talk to Human</button>
          </div>

          <div class="chat-input">
            <input id="chat-input" placeholder="Type your message..." />
            <button id="chat-send">Send</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(widget);
    this.bindEvents();
  }

  bindEvents() {
    document.getElementById("chat-toggle").onclick = () => this.toggleWidget();
    document.getElementById("chat-close").onclick = () => this.closeWidget();
    document.getElementById("chat-send").onclick = () => this.sendMessage();
    document.getElementById("chat-input").onkeypress = (e) => {
      if (e.key === "Enter") this.sendMessage();
    };

    // 👩💼 HUMAN BUTTON
    document.getElementById("humanBtn").onclick = () => {
      this.requestHumanAgent();
    };
  }

  toggleWidget() {
    this.isOpen = !this.isOpen;
    document.getElementById("chat-window").classList.toggle("open", this.isOpen);
  }

  closeWidget() {
    this.isOpen = false;
    document.getElementById("chat-window").classList.remove("open");
  }

  // ==========================
  // 🔌 WEBSOCKET CONNECTION
  // ==========================
  connectWebSocket() {
    try {
      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        console.log("✅ Connected to chat server");
      };

      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.sender === "bot") {
          this.addMessage(data.message, "bot");
        } else if (data.sender === "human") {
          this.addMessage(`👩💼 Agent: ${data.message}`, "bot");
        }
      };

      this.socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.addMessage("❌ Connection error. Please refresh the page.", "bot");
      };

      this.socket.onclose = () => {
        console.log("WebSocket closed");
        setTimeout(() => this.connectWebSocket(), 3000);
      };

    } catch (error) {
      console.error("WebSocket creation error:", error);
    }
  }

  // ==========================
  // 💬 MESSAGING
  // ==========================
  sendMessage() {
    const input = document.getElementById("chat-input");
    const message = input.value.trim();
    if (!message) return;

    this.addMessage(message, "user");
    input.value = "";

    if (this.handoverActive) {
      // Send to human agent
      this.socket.send(JSON.stringify({
        type: "connect_human",
        message: message
      }));
    } else {
      // Send to bot
      this.socket.send(JSON.stringify({
        type: "bot",
        message: message
      }));
    }
  }

  requestHumanAgent() {
    this.addMessage("👩💼 Connecting you to a human agent...", "bot");
    this.handoverActive = true;
    
    this.socket.send(JSON.stringify({
      type: "connect_human",
      message: "User requested human agent"
    }));
  }

  // ==========================
  // 💬 UI HELPERS
  // ==========================
  addMessage(text, sender) {
    const container = document.getElementById("chat-messages");
    const div = document.createElement("div");
    div.className = sender === "user" ? "user-message" : "bot-message";
    div.innerHTML = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  attachStyles() {
    const style = document.createElement("style");
    style.innerHTML = `
      .chat-widget { position: fixed; bottom: 20px; right: 20px; z-index: 99999; }
      .chat-toggle { width: 60px; height: 60px; background:#667eea; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; }
      .chat-logo { width:36px; height:36px; border-radius:50%; }
      .chat-window { display:none; width:360px; height:520px; background:#fff; border-radius:12px; box-shadow:0 20px 40px rgba(0,0,0,.3); flex-direction:column; }
      .chat-window.open { display:flex; }
      .chat-header { background:#667eea; color:#fff; padding:14px; display:flex; justify-content:space-between; }
      .chat-messages { flex:1; padding:14px; overflow-y:auto; background:#f7f7f7; }
      .bot-message { background:#fff; padding:10px; border-radius:10px; margin-bottom:8px; }
      .user-message { background:#667eea; color:#fff; padding:10px; border-radius:10px; margin-bottom:8px; text-align:right; }
      .chat-input { display:flex; gap:8px; padding:10px; border-top:1px solid #ddd; }
      .chat-input input { flex:1; padding:8px; border-radius:20px; border:1px solid #ccc; }
      .chat-input button { padding:8px 14px; border-radius:20px; background:#667eea; color:#fff; border:none; }
      .chat-actions { padding:10px; }
      .human-btn { width:100%; padding:10px; border:none; border-radius:20px; background:linear-gradient(135deg,#ff9800,#ff5722); color:#fff; font-weight:bold; cursor:pointer; }
      
      @media (max-width: 768px) {
        .chat-widget { bottom: 10px; right: 10px; }
        .chat-window { width: calc(100vw - 20px); height: calc(100vh - 100px); max-width: 360px; max-height: 520px; }
      }
    `;
    document.head.appendChild(style);
  }
}

// 🚀 INIT
document.addEventListener("DOMContentLoaded", () => {
  new ResortChatWidget();
});