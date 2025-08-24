const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { randomUUID } = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Decks permitidos no modo multiplayer
const VALID_DECKS = new Set(['vikings', 'animais', 'pescadores', 'floresta', 'custom']);

// Informações sobre salas em memória
const rooms = new Map();

app.use(express.static(path.join(__dirname, 'public')));


io.on('connection', (socket) => {
  socket.on('host', () => {
    let room;
    do {
      room = randomUUID().slice(0, 6);
    } while (rooms.has(room));
    socket.join(room);
    socket.data.room = room;
    rooms.set(room, { host: socket.id, guest: null, players: 1, hostTimer: null, guestTimer: null, hostName: socket.data.name || null, guestName: null });
    socket.emit('hosted', room);
  });

  socket.on('join', (room) => {
    const info = rooms.get(room);
    if (!info) {
      socket.emit('joinError', 'Sala inexistente ou cheia');
      return;
    }
    if (info.host === socket.id) {
      socket.emit('joinError', 'Você já é o host desta sala');
      return;
    }
    if (info.players >= 2) {
      socket.emit('joinError', 'Sala inexistente ou cheia');
      return;
    }
    socket.join(room);
    socket.data.room = room;
    info.guest = socket.id;
    info.guestName = socket.data.name || null;
    info.players++;
    socket.emit('joined', room);
    if (info.hostName) socket.emit('opponentName', info.hostName);
    if (info.host) io.to(info.host).emit('opponentName', socket.data.name || '');
    socket.to(room).emit('guestJoined');
  });

  socket.on('listRooms', () => {
    const open = [...rooms.entries()].map(([code, info]) => ({
      code,
      players: info.players,
    }));
    socket.emit('rooms', open);
  });

  socket.on('deckChoice', (deckId) => {
    const room = socket.data.room;
    if (!room) return;

    if (!VALID_DECKS.has(deckId)) {
      socket.emit('deckError', 'Deck inválido');
      return;
    }

    socket.data.deckChosen = deckId;
    socket.to(room).emit('opponentDeckConfirmed', deckId);
  });

  socket.on('startReady', () => {
    const room = socket.data.room;
    if (!room) return;

    socket.data.startReady = true;

    const clients = io.sockets.adapter.rooms.get(room);
    if (!clients || clients.size !== 2) return;

    const allReady = [...clients].every(id => {
      const s = io.sockets.sockets.get(id);
      return s && s.data.startReady;
    });

    if (allReady) {
      io.to(room).emit('startGame');
    }
  });

  socket.on('move', (move) => {
    const room = socket.data.room;
    if (room) {
      socket.to(room).emit('move', move);
    }
  });

  socket.on('turn', (turn) => {
    const room = socket.data.room;
    if (room) {
      socket.to(room).emit('turn', turn);
    }
  });

  socket.on('emoji', (emoji) => {
    const room = socket.data.room;
    if (room) {
      socket.to(room).emit('emoji', emoji);
    }
  });

  socket.on('rematch', () => {
    const room = socket.data.room;
    if (!room) return;
    socket.data.rematch = true;
    const clients = io.sockets.adapter.rooms.get(room);
    if (!clients || clients.size !== 2) return;
    const ready = [...clients].every((id) => {
      const s = io.sockets.sockets.get(id);
      return s && s.data.rematch;
    });
    if (ready) {
      [...clients].forEach((id) => {
        const s = io.sockets.sockets.get(id);
        if (s) {
          s.data.startReady = false;
          s.data.rematch = false;
          s.emit('rematch');
        }
      });
    }
  });

  socket.on('rejoin', ({ room, role }) => {
    const info = rooms.get(room);
    if (!info) return;
    if (role === 'host' && info.hostTimer) {
      clearTimeout(info.hostTimer);
      info.hostTimer = null;
      info.host = socket.id;
    } else if (role === 'guest' && info.guestTimer) {
      clearTimeout(info.guestTimer);
      info.guestTimer = null;
      info.guest = socket.id;
    } else {
      socket.emit('joinError', 'Sala inexistente ou cheia');
      return;
    }
    socket.join(room);
    socket.data.room = room;
    socket.to(room).emit('opponentReconnected');
  });

  socket.on('resign', () => {
    const room = socket.data.room;
    if (!room) return;
    socket.to(room).emit('opponentResigned');
    rooms.delete(room);
    socket.data.room = null;
    socket.disconnect(true);
  });

  socket.on('disconnect', () => {
    const { room } = socket.data;
    if (!room) return;
    const info = rooms.get(room);
    if (!info) return;
    let role = null;
    if (info.host === socket.id) role = 'host';
    else if (info.guest === socket.id) role = 'guest';
    if (!role) return;

    const timer = setTimeout(() => {
      if (role === 'host') {
        info.host = null;
        info.hostTimer = null;
      } else {
        info.guest = null;
        info.guestTimer = null;
      }
      info.players--;
      io.to(room).emit('opponentLeft');
      if (!info.host || info.players <= 0) {
        rooms.delete(room);
      }
    }, 10000);

    if (role === 'host') info.hostTimer = timer; else info.guestTimer = timer;
    socket.to(room).emit('opponentDisconnected');
  });

  socket.on('setName', (name) => {
    socket.data.name = name;
    const room = socket.data.room;
    if (!room) return;
    const info = rooms.get(room);
    if (!info) return;
    if (info.host === socket.id) info.hostName = name;
    else if (info.guest === socket.id) info.guestName = name;
    socket.to(room).emit('opponentName', name);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});