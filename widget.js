const ws = new WebSocket("ws://localhost:8000/ws/chat");
const chat = document.getElementById("chat");

ws.onmessage = e => {
  const d = JSON.parse(e.data);
  if (d.sender) chat.innerHTML += `<p><b>${d.sender}</b>: ${d.message}</p>`;
};

function send() {
  ws.send(JSON.stringify({ message: msg.value }));
}

function human() {
  chat.innerHTML += "<p><i>Waiting for agent...</i></p>";
}