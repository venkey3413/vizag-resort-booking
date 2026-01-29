const ws = new WebSocket("ws://localhost:8001/ws/agent");
let active = null;

ws.onmessage = e => {
  const d = JSON.parse(e.data);
  const li = document.createElement("li");
  li.innerHTML = `${d.chat_id}: ${d.message}
    <button onclick="accept('${d.chat_id}')">Accept</button>`;
  list.appendChild(li);
};

function accept(id) {
  active = id;
  ws.send(JSON.stringify({ type: "accept", chat_id: id }));
}

function send() {
  ws.send(JSON.stringify({
    type: "reply",
    chat_id: active,
    message: reply.value
  }));
}