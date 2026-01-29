const ws = new WebSocket("ws://localhost:8000/ws/agent");
let selectedChatId = null;

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  const div = document.createElement("div");
  div.className = "chat-item";
  div.innerHTML = `Chat: ${data.chat_id}<br><small>${data.message}</small>`;
  div.onclick = () => selectChat(data.chat_id);
  document.getElementById("chatList").appendChild(div);
};

function selectChat(chatId) {
  selectedChatId = chatId;
  document.getElementById("activeChat").innerText = "Chat: " + chatId;
  document.getElementById("messages").innerHTML = "";
}

function sendReply() {
  if (!selectedChatId) return;
  
  const msg = document.getElementById("replyInput").value;
  ws.send(JSON.stringify({
    chat_id: selectedChatId,
    message: msg
  }));
  
  document.getElementById("messages").innerHTML += `<div><b>You:</b> ${msg}</div>`;
  document.getElementById("replyInput").value = "";
}