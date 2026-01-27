const ws = new WebSocket("ws://" + location.host + "/ws/agent");
let currentChat = null;

ws.onmessage = (e) => {
  const data = JSON.parse(e.data);

  if(data.type === "handover"){
    const div = document.createElement("div");
    div.className = "chat";
    div.innerText = "Chat: " + data.chat_id;
    div.onclick = () => selectChat(data.chat_id);
    document.getElementById("chatList").appendChild(div);
  }
};

function selectChat(id){
  currentChat = id;
  document.getElementById("activeChat").innerText = "Chat: " + id;
  document.getElementById("messages").innerHTML = "";
}

function send(){
  if(!currentChat) return;

  const msg = document.getElementById("msg").value;
  ws.send(JSON.stringify({
    chat_id: currentChat,
    message: msg
  }));

  document.getElementById("messages").innerHTML += `<div><b>You:</b> ${msg}</div>`;
  document.getElementById("msg").value = "";
}