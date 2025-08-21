(function (global) {
  const socket = io({
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
  });

  let role = null; // 'host' or 'guest'
  let roomCode = null;

  // store room code when hosting
  socket.on('hosted', (code) => {
    roomCode = code;
  });

  function connectIfNeeded() {
    if (!socket.connected) {
      socket.connect();
    }
  }

  const NET = {
    host() {
      role = 'host';
      connectIfNeeded();
      socket.emit('host');
    },
    join(code) {
      role = 'guest';
      roomCode = code;
      connectIfNeeded();
      socket.emit('join', code);
    },
    listRooms() {
      connectIfNeeded();
      socket.emit('listRooms');
    },
    isHost() {
      return role === 'host';
    },
    deckChoice(deckId) {
      socket.emit('deckChoice', deckId);
    },
    startReady() {
      socket.emit('startReady');
    },
    sendMove(move) {
      socket.emit('move', move);
    },
    sendTurn(turn) {
      socket.emit('turn', turn);
    },
    sendEmoji(emoji) {
      socket.emit('emoji', emoji);
    },
    setName(name){
      connectIfNeeded();
      socket.emit('setName',name);
    },
    requestRematch() {
      socket.emit('rematch');
    },
    onOpponentDeckConfirmed(handler) {
      socket.on('opponentDeckConfirmed', handler);
    },
    onStartGame(handler) {
      socket.on('startGame', handler);
    },
    onMove(handler) {
      socket.on('move', handler);
    },
    onTurn(handler) {
      socket.on('turn', handler);
    },
    onEmoji(handler) {
      socket.on('emoji', handler);
    },
    onHosted(handler) {
      socket.on('hosted', handler);
    },
    onJoined(handler) {
      socket.on('joined', handler);
    },
    onGuestJoined(handler) {
      socket.on('guestJoined', handler);
    },
    onJoinError(handler) {
      socket.on('joinError', handler);
    },
    onRooms(handler) {
      socket.on('rooms', handler);
    },
    onOpponentLeft(handler) {
      socket.on('opponentLeft', handler);
    },
    onOpponentDisconnected(handler) {
      socket.on('opponentDisconnected', handler);
    },
    onOpponentReconnected(handler) {
      socket.on('opponentReconnected', handler);
    },
    onOpponentName(handler){
      socket.on('opponentName',handler);
    },
    onRematch(handler) {
      socket.on('rematch', handler);
    },
    onConnectionError(handler) {
      socket.on('connect_error', handler);
      socket.io.on('reconnect_failed', handler);
    },
    disconnect() {
      socket.disconnect();
    },
  };

  // reconnect and error handling
  socket.on('connect_error', (err) => {
    console.error('WebSocket error', err);
  });

  socket.io.on('reconnect_attempt', (attempt) => {
    console.warn('Attempting to reconnect', attempt);
  });

  socket.io.on('reconnect_failed', () => {
    console.error('Reconnection failed');
  });

  socket.on('disconnect', (reason) => {
    console.warn('Disconnected:', reason);
    if (reason === 'io server disconnect') {
      socket.connect();
    }
  });

  socket.on('reconnect', () => {
    if (roomCode && role) {
      socket.emit('rejoin', { room: roomCode, role });
    }
  });

  global.NET = NET;
})(typeof window !== 'undefined' ? window : globalThis);