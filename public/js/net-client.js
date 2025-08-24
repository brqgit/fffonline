(function (global) {
  const socket = io({
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
  });

  let role = null; // 'host' or 'guest'
  let roomCode = null;

  const overlay = document.getElementById('reconnectOverlay');
  const overlayMsg = document.getElementById('reconnectMsg');
  const overlayTimer = document.getElementById('reconnectTimer');
  let overlayInterval = null;

  function showReconnect(message) {
    if (!overlay) return;
    overlayMsg.textContent = message;
    let t = 15;
    overlayTimer.textContent = t;
    overlay.classList.add('show');
    clearInterval(overlayInterval);
    overlayInterval = setInterval(() => {
      t -= 1;
      if (t >= 0) overlayTimer.textContent = t;
      if (t <= 0) clearInterval(overlayInterval);
    }, 1000);
  }

  function hideReconnect() {
    if (!overlay) return;
    overlay.classList.remove('show');
    clearInterval(overlayInterval);
  }

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
    resign() {
      socket.emit('resign');
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
    onOpponentResigned(handler) {
      socket.on('opponentResigned', handler);
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
    showReconnect('Falha ao reconectar.');
  });

  socket.on('disconnect', (reason) => {
    console.warn('Disconnected:', reason);
    showReconnect('Você perdeu a conexão com a sala. Tentando reconectar...');
    if (reason === 'io server disconnect') {
      socket.connect();
    }
  });

  socket.on('reconnect', () => {
    hideReconnect();
    if (roomCode && role) {
      socket.emit('rejoin', { room: roomCode, role });
    }
  });

  global.NET = NET;
  global.showReconnect = showReconnect;
  global.hideReconnect = hideReconnect;
})(typeof window !== 'undefined' ? window : globalThis);