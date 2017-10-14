// EXAMPLE OF A CHAT

const { WsServer, WsClient } = require("./index");
const port = 8000;

// CLIENT SETUP

const endpoint = `'ws://' +
  window.location.hostname +
  (window.location.port ? ':' + window.location.port : '${port}')`;

// client side handler of server commands
function messageHandler(cmd, payload) {
  var messages = document.getElementById("messages");
  switch (cmd) {
    case "message":
      messages.innerText += payload + "\n";
      break;
  }
}

function send() {
  var prompt = document.getElementById("prompt");
  var msgToSend = prompt.value || "";
  if (msgToSend) {
    prompt.value = "";
    wsClient.sendCommand("messageAll", msgToSend);
  }
}

// server side rendered/cached view w/ WebSocketClient
const view = `
<html>
<head>
  <style rel="text/stylesheet">
    #messages { 
      width: 300px; 
      height: 200px; 
      border: 1px solid #000; 
      padding: 2px; 
      overflow: auto; 
      text-wrap: true;
    }
    #prompt { 
      width: 250px; 
      margin-top: 5px; 
    }
  </style>
</head>
<body>
  <div id="messages"></div>
  <input type="text" id="prompt" value="" />
  <button onclick="send();">SEND</button>
</body>
<script type="text/javascript">
  ${WsClient.toString()}
  
  var wsClient = new WebSocketClient();
  var send = ${send.toString()};
  var messageHandler = ${messageHandler.toString()};

  wsClient.connect({
    URL: ${endpoint},
    autoReconnect: true,
    reconnectionDelay: 5000,
    onOpen: function() { console.log("Connection open!"); },
    onMessage: messageHandler,
    onError: console.error,
    onClose: console.log,
  });
</script>
</html>
`;

// SERVER SETUP

const ws = WsServer({
  port,
  log: (...args) => console.log(...args),
  error: (...args) => console.error(...args),
  requestListener: (req, resp) => {
    // http router
    switch (req.url) {
      case "/":
        resp.writeHead(200, {
          "Content-Type": "text/html"
        });
        resp.end(view, "utf-8");
        break;

      default:
        resp.writeHead(404, {
          "Content-Type": "text/plain"
        });
        resp.end("404 - Page not found!", "utf-8");
        break;
    }
  }
});

// handle commands from the client
ws.onSocketMessage = (msg, socket) => {
  console.log("client sends:", msg);
  try {
    const { command, payload } = JSON.parse(msg);
    switch (command) {
      // custom command broadcast
      case "messageAll":
        ws.broadcast("message", payload);
        break;
    }
  } catch (err) {
    console.error(err.message);
  }
};
