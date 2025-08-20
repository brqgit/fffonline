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
    rooms.set(room, { host: socket.id, players: 1 });
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
    info.players++;
    socket.emit('joined', room);
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

  socket.on('disconnecting', () => {
    const { room } = socket.data;
    if (room) {
      socket.to(room).emit('opponentLeft');
      const info = rooms.get(room);
      if (info) {
        info.players--;
        if (info.host === socket.id || info.players <= 0) {
          rooms.delete(room);
        }
      }
    }

    delete socket.data.room;
    delete socket.data.deckChosen;
    delete socket.data.startReady;
  });

  socket.on('disconnect', async () => {
    // Additional asynchronous operations can be performed here
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});