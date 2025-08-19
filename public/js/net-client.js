(function(global){
  const socket = io({
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
  });

  let role = null; // 'host' or 'guest'
  let roomCode = null;

  function connectIfNeeded(){
    if(!socket.connected){
      socket.connect();
    }
  }

  const NET = {
    host(){
      role = 'host';
      connectIfNeeded();
      socket.emit('host');
    },
    join(code){
      role = 'guest';
      roomCode = code;
      connectIfNeeded();
      socket.emit('join', code);
    },
    isHost(){
      return role === 'host';
    },
    guestDeckChoice(deckId){
      socket.emit('guestDeckChoice', deckId);
    },
    sendMove(move){
      socket.emit('move', move);
    },
    sendTurn(turn){
      socket.emit('turn', turn);
    },
    onGuestDeckChoice(handler){
      socket.on('guestDeckChoice', handler);
    },
    onMove(handler){
      socket.on('move', handler);
    },
    onTurn(handler){
      socket.on('turn', handler);
    },
    disconnect(){
      socket.disconnect();
    }
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
    if(reason === 'io server disconnect') {
      socket.connect();
    }
  });

  global.NET = NET;
})(typeof window !== 'undefined' ? window : globalThis);
