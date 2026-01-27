class ResortChatWidget {
  constructor() {
    this.isOpen = false;
    this.sessionId = this.generateSessionId();

    // 🔐 Backend base URL
    this.apiUrl = "https://vizagresortbooking.in:8000";
    this.wsUrl = "wss://vizagresortbooking.in:8000/ws/user";

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
  }

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
              Type your question below 👇
            </div>
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
  }

  toggleWidget() {
    this.isOpen = !this.isOpen;
    document.getElementById("chat-window").classList.toggle("open", this.isOpen);
  }

  closeWidget() {
    this.isOpen = false;
    document.getElementById("chat-window").classList.remove("open");
  }

  async sendMessage() {
    const input = document.getElementById("chat-input");
    const message = input.value.trim();
    if (!message) return;

    this.addMessage(message, "user");
    input.value = "";

    // ✅ If human takeover active → send via websocket
    if (this.handoverActive && this.socket) {
      this.socket.send(JSON.stringify({
        session_id: this.sessionId,
        message: message,
        sender: "user"
      }));
      return;
    }

    // 🤖 Bot / MCP request
    try {
      const res = await fetch(`${this.apiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: this.sessionId,
          message: message
        })
      });

      const data = await res.json();

      // ✅ Always show answer
      if (data.answer) {
        this.addMessage(data.answer, "bot");
      }

      // 🔁 MCP → Human handover
      if (data.handover === true) {
        this.startHumanChat();
      }

    } catch (err) {
      this.addMessage("❌ Unable to connect. Please try again later.", "bot");
    }
  }

  // ============================
  // 👩‍💼 HUMAN HANDOVER
  // ============================

  startHumanChat() {
    if (this.handoverActive) return;

    this.handoverActive = true;
    this.addMessage("👩‍💼 Connecting you to a human support agent...", "bot");

    this.socket = new WebSocket(`${this.wsUrl}/${this.sessionId}`);

    this.socket.onopen = () => {
      console.log("✅ Connected to human dashboard");
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.message) {
        this.addMessage(data.message, "bot");
      }
    };

    this.socket.onerror = () => {
      this.addMessage("⚠️ Human support unavailable. Please try later.", "bot");
    };

    this.socket.onclose = () => {
      this.addMessage("ℹ️ Human chat ended.", "bot");
      this.handoverActive = false;
    };
  }

  addMessage(text, sender) {
    const container = document.getElementById("chat-messages");
    const div = document.createElement("div");
    div.className = sender === "user" ? "user-message" : "bot-message";
    div.innerHTML = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  attachStyles() {
    /* keep your existing CSS exactly as-is */
  }
}

// 🚀 INIT
document.addEventListener("DOMContentLoaded", () => {
  new ResortChatWidget();
});
