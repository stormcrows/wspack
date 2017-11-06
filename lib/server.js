const http = require("http");
const WebSocketServer = require("websocket").server;

const DEFAULT_OPTIONS = {
  port: 80,
  requestListener: () => {},

  log: (...args) => {},
  error: (...args) => {},

  onSocketConnect: socket => {},
  onSocketMessage: (data, socket) => {},
  onSocketError: (error, socket) => {},
  onSocketClose: (socket, { code, desc }) => {},

  // refer to WebSocketServer.prototype.mount for documentation
  serverConfig: {
    maxReceivedFrameSize: 0x10000, //64KB
    maxReceivedMessageSize: 0x100000, //1MB
    fragmentOutgoingMessages: true,
    fragmentationThreshold: 0x4000, //16KB
    keepalive: true,
    keepaliveInterval: 5000,
    dropConnectionOnKeepaliveTimeout: true, //ignored if useNativeKeepalive=true
    keepaliveGracePeriod: 10000, //ignored if useNativeKeepalive=true
    useNativeKeepalive: true,
    assembleFragments: true,
    autoAcceptConnections: false,
    ignoreXForwardedFor: true,
    disableNagleAlgorithm: true,
    closeTimeout: 5000
  }
};

module.exports = (options = DEFAULT_OPTIONS) => {
  const _options = Object.assign({}, DEFAULT_OPTIONS, options);
  const { port, requestListener, log, error, serverConfig } = _options;

  const httpServer = http.createServer(requestListener);
  httpServer.listen(port, () => log(`websocket-server up, port:${port}`));

  const wsServer = new WebSocketServer(
    Object.assign({}, serverConfig, { httpServer })
  );

  wsServer.on("request", request => {
    const socket = request.accept(null, request.origin);
    socket.id = uuid();

    service.onSocketConnect(socket);
    log(`socket connected: ${socket.id}`);

    socket.on("message", data =>
      service.onSocketMessage(data.utf8Data, socket)
    );

    socket.on("error", err => {
      service.onSocketError(err, socket);
      error(`socket error: ${socket.id} -`, err.message);
    });

    socket.on("close", (code, desc) => {
      service.onSocketClose(socket, { code, desc });
      log(`socket ${socket.id} closed with code=${code}, desc=${desc}`);
    });
  });

  const send = (socket, command, payload) => {
    socket.state === "open"
      ? socket.send(JSON.stringify({ command, payload }))
      : log(`Can't send: socket ${socket.id} not in open state!`);
  };

  const broadcast = (command, payload) =>
    wsServer.broadcast(JSON.stringify({ command, payload }));

  const shutDown = () => wsServer.shutDown();

  const service = {
    httpServer,
    wsServer,
    send,
    broadcast,
    shutDown,

    onSocketConnect: _options.onSocketConnect,
    onSocketMessage: _options.onSocketMessage,
    onSocketError: _options.onSocketError,
    onSocketClose: _options.onSocketClose
  };

  return service;
};

// https://gist.github.com/jed/982883
const uuid = function b(a) {
  return a
    ? (a ^ ((Math.random() * 16) >> (a / 4))).toString(16)
    : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, b);
};
