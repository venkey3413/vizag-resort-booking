<script>
class ResortChatWidget {
  constructor() {
    this.isOpen = false;
    this.sessionId = "chat_" + Date.now();
    this.apiUrl = "https://vizagresortbooking.in:8000";
    this.ws = new WebSocket("ws://localhost:8000/ws/chat");
    this.init();
  }

  init() {
    this.createWidget();
    this.attachStyles();
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.sender === "human") {
        this.addMessage(data.message, "bot");
      }
    };
  }

  connectHuman(message) {
    this.ws.send(JSON.stringify({
      type: "connect_human",
      message: message
    }));
  }

  createWidget() {
    const el = document.createElement("div");
    el.innerHTML = `
    <div class="chat-widget">
      <div id="chat-toggle" class="chat-toggle">
        <img src="/logo.png" />
      </div>

      <div id="chat-window" class="chat-window">
        <div class="chat-header">
          <span>Vizag Resort Support</span>
          <button id="chat-close">×</button>
        </div>

        <div id="chat-messages" class="chat-messages">
          <div class="bot-message">
            👋 Welcome to Vizag Resort Booking!<br><br>
            Choose an option below:
            <div class="quick-actions">
              <button data-msg="What is your refund policy?">💰 Refund Policy</button>
              <button data-msg="Tell me about check-in and check-out">🏨 Check-in Info</button>
              <button data-msg="What are the resort rules?">📋 Resort Rules</button>
              <button data-msg="Check resort availability">📅 Check Availability</button>
              <button class="human-btn" data-human>🎧 Talk to Human Agent</button>
            </div>
          </div>
        </div>

        <div class="chat-input">
          <input id="chat-input" placeholder="Type your message..." />
          <button id="chat-send">Send</button>
        </div>
      </div>
    </div>
    `;
    document.body.appendChild(el);
    this.bindEvents();
  }

  attachStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .chat-widget{position:fixed;bottom:20px;right:20px;z-index:99999;font-family:Arial}
      .chat-toggle{width:60px;height:60px;border-radius:50%;background:#667eea;display:flex;align-items:center;justify-content:center;cursor:pointer}
      .chat-toggle img{width:36px;height:36px;border-radius:50%}
      .chat-window{position:absolute;bottom:75px;right:0;width:360px;height:500px;background:#fff;border-radius:14px;display:none;flex-direction:column;box-shadow:0 20px 40px rgba(0,0,0,.25)}
      .chat-window.open{display:flex}
      .chat-header{background:#667eea;color:#fff;padding:14px;display:flex;justify-content:space-between}
      .chat-messages{flex:1;padding:14px;overflow-y:auto;background:#f7f7f7}
      .bot-message,.user-message{max-width:80%;padding:10px 14px;border-radius:14px;margin-bottom:10px}
      .bot-message{background:#fff;border:1px solid #ddd}
      .user-message{background:#667eea;color:#fff;margin-left:auto}
      .chat-input{display:flex;padding:12px;border-top:1px solid #ddd}
      .chat-input input{flex:1;padding:10px;border-radius:20px;border:1px solid #ccc}
      .chat-input button{margin-left:6px;background:#667eea;color:#fff;border:none;border-radius:20px;padding:10px 14px}
      .quick-actions{display:flex;flex-direction:column;gap:8px;margin-top:10px}
      .quick-actions button{padding:10px;border-radius:10px;border:1px solid #ddd;background:#f8f8f8;cursor:pointer;text-align:left}
      .quick-actions button:hover{background:#eef2ff}
      .human-btn{background:#ff6f00!important;color:#fff;border:none!important}
    `;
    document.head.appendChild(style);
  }

  bindEvents() {
    document.getElementById("chat-toggle").onclick = () =>
      document.getElementById("chat-window").classList.toggle("open");

    document.getElementById("chat-close").onclick = () =>
      document.getElementById("chat-window").classList.remove("open");

    document.getElementById("chat-send").onclick = () => this.sendMessage();

    document.getElementById("chat-input").onkeypress = e => {
      if (e.key === "Enter") this.sendMessage();
    };

    document.querySelectorAll(".quick-actions button").forEach(btn => {
      btn.onclick = () => {
        if (btn.dataset.human !== undefined) {
          this.sendHumanRequest();
        } else {
          this.sendQuick(btn.dataset.msg);
        }
      };
    });
  }

  sendQuick(text) {
    this.addMessage(text, "user");
    this.sendToAPI(text);
  }

  sendHumanRequest() {
    this.addMessage("🎧 Talk to human agent", "user");
    this.connectHuman("I want to talk to a human agent");
  }

  async sendMessage() {
    const input = document.getElementById("chat-input");
    if (!input.value.trim()) return;
    this.addMessage(input.value, "user");
    this.ws.send(JSON.stringify({type: "message", message: input.value}));
    input.value = "";
  }

  async sendToAPI(message) {
    try {
      const res = await fetch(`${this.apiUrl}/api/chat`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({session_id:this.sessionId,message})
      });
      const data = await res.json();
      this.addMessage(data.answer, "bot");

      if (data.handover) {
        this.addMessage("👩‍💼 A live agent will join shortly.", "bot");
        document.getElementById("chat-input").disabled = true;
      }
    } catch {
      this.addMessage("⚠️ Connection failed.", "bot");
    }
  }

  addMessage(text, type) {
    const box = document.getElementById("chat-messages");
    const div = document.createElement("div");
    div.className = type === "user" ? "user-message" : "bot-message";
    div.innerHTML = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }
}

document.addEventListener("DOMContentLoaded", () => new ResortChatWidget());
</script>
