(function() {
  const API_BASE = "https://vizagresortbooking.in/api/chat";
  const STATIC_BASE = "https://vizagresortbooking.in/static";
  const sessionId = "sess-" + Math.random().toString(36).slice(2);

  const style = document.createElement("style");
  style.textContent = `
  #vchat-button {
      position: fixed;
      bottom: 25px;
      right: 25px;
      width: 64px;
      height: 64px;
      background: url('${STATIC_BASE}/logo.png') no-repeat center/cover;
      border-radius: 50%;
      cursor: pointer;
      z-index: 999999;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  }
  #vchat-window {
      position: fixed;
      bottom: 100px;
      right: 25px;
      width: 340px;
      height: 440px;
      background: #ffffff;
      border-radius: 18px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.25);
      display: none;
      flex-direction: column;
      z-index: 999999;
      overflow: hidden;
      border: 2px solid #004b8d;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  #vchat-header {
      background: #004b8d;
      color: white;
      padding: 10px 12px;
      font-size: 15px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
  }
  #vchat-header img {
      width: 26px;
      height: 26px;
      border-radius: 50%;
  }
  #vchat-body {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      background: #f7f7f7;
      font-size: 13px;
  }
  .vmsg {
      margin-bottom: 8px;
      padding: 7px 10px;
      border-radius: 12px;
      max-width: 80%;
      line-height: 1.4;
  }
  .vmsg.user {
      background: #cde4ff;
      margin-left: auto;
  }
  .vmsg.bot {
      background: #e5e7eb;
  }
  .vmsg.human {
      background: #d1fae5;
  }
  #vchat-input-area {
      display: flex;
      border-top: 1px solid #e5e7eb;
  }
  #vchat-input {
      flex: 1;
      padding: 9px;
      border: none;
      outline: none;
      font-size: 13px;
  }
  #vchat-send {
      width: 70px;
      background: #004b8d;
      color: white;
      border: none;
      cursor: pointer;
      font-size: 13px;
  }
  `;
  document.head.appendChild(style);

  const btn = document.createElement("div");
  btn.id = "vchat-button";
  document.body.appendChild(btn);

  const win = document.createElement("div");
  win.id = "vchat-window";
  win.innerHTML = `
    <div id="vchat-header">
      <img src="${STATIC_BASE}/logo.png" alt="logo" />
      Vizag Resort Assistant
    </div>
    <div id="vchat-body"></div>
    <div id="vchat-input-area">
      <input id="vchat-input" type="text" placeholder="Ask about policies, timings, etc..." />
      <button id="vchat-send">Send</button>
    </div>
  `;
  document.body.appendChild(win);

  const bodyEl = win.querySelector("#vchat-body");
  const inputEl = win.querySelector("#vchat-input");
  const sendBtn = win.querySelector("#vchat-send");

  function addMsg(text, sender) {
      const div = document.createElement("div");
      div.className = "vmsg " + sender;
      div.textContent = text;
      bodyEl.appendChild(div);
      bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  async function sendMessage() {
      const text = inputEl.value.trim();
      if (!text) return;
      addMsg(text, "user");
      inputEl.value = "";

      try {
          const res = await fetch(API_BASE, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ session_id: sessionId, message: text })
          });
          const data = await res.json();
          addMsg(data.answer, "bot");
          if (data.handover) {
              addMsg("🔔 A human agent will join shortly...", "bot");
          }
      } catch (err) {
          console.error(err);
          addMsg("Error contacting server.", "bot");
      }
  }

  btn.addEventListener("click", () => {
      if (win.style.display === "flex") {
          win.style.display = "none";
      } else {
          win.style.display = "flex";
      }
  });

  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendMessage();
  });
})();