/**
 * Get code of this function with toString(),
 * Then run it in the browser to estabilish communication with {websocket-server}
 */
module.exports = function WebSocketClient() {
  // readyState 2 & 3 are: closing & closed,
  // 8 used heere to indicate not initialized for send/close checks
  this.socket = { readyState: 8 };
  this.queue = [];
  this.options = {
    URL: "",

    autoReconnect: true,
    reconnectionDelay: 2000,

    // in case of a problem, messages will be queued and sent onOpen
    queueUnsentMessages: true,
    // after limit is reached, no new messages will be added
    queueLimit: 100,

    onOpen: function() {},
    onMessage: function(command, payload) {},
    onError: function(error) {},
    onClose: function(event) {}
  };

  window.onbeforeunload = close.bind(this);

  return {
    connect: connect.bind(this),
    close: close.bind(this),
    sendCommand: sendCommand.bind(this)
  };

  // MESSAGING

  function onMessage(msg) {
    try {
      var cmd = JSON.parse(msg.data);
      if (cmd.command === "reload") {
        close.call(this);
        location.reload();
      } else if (typeof this.options.onMessage === "function") {
        this.options.onMessage(cmd.command, cmd.payload);
      }
    } catch (err) {
      onError.call(this, "error when processing command, received: ", msg, err);
    }
  }

  function sendCommand(command, payload) {
    var msg = JSON.stringify({
      command: command,
      payload: payload
    });
    if (this.socket.readyState === 1) {
      this.socket.send(msg);
    } else {
      var shouldQueue = this.options.queueUnsentMessages;
      var underLimit = this.options.queueLimit >= this.queue.length;
      shouldQueue && underLimit && this.queue.push(msg);
    }
  }

  // SOCKET MANAGEMENT

  function connect(options) {
    extend(this.options, options);
    close.call(this);
    try {
      this.socket = new WebSocket(this.options.URL);
      this.socket.onopen = onOpen.bind(this);
      this.socket.onmessage = onMessage.bind(this);
      this.socket.onerror = onError.bind(this);
      this.socket.onclose = onClose.bind(this);
    } catch (err) {
      onError.call(this, err);
      if (this.options.autoReconnect) {
        reconnect.call(this);
      }
    }
  }

  function close() {
    if (!this.socket || this.socket.readyState > 1) return;
    try {
      this.socket.onclose = function() {};
      this.socket.close();
    } catch (err) {
      onError.call(this, err);
    }
  }

  function reconnect() {
    setTimeout(connect.bind(this), this.options.reconnectionDelay);
  }

  function onOpen() {
    if (typeof this.options.onOpen === "function") {
      this.options.onOpen();
    }
    this.queue.forEach(msg => this.socket.send(msg));
    this.queue.length = 0;
  }

  function onError(error) {
    if (typeof this.options.onError === "function") {
      this.options.onError(error);
    }
  }

  function onClose(event) {
    if (typeof this.options.onClose === "function") {
      this.options.onClose(event);
    }
    if (this.options.autoReconnect) {
      reconnect.call(this);
    }
  }

  // SUPPORT

  function extend(target, source) {
    if (typeof source !== "object") return;
    for (var prop in source) {
      if (source.hasOwnProperty(prop)) {
        target[prop] = source[prop];
      }
    }
  }
};
