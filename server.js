const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { randomUUID } = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));
app.use('/public', express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  socket.on('host', () => {
    const room = randomUUID().slice(0, 5);
    socket.join(room);
    socket.data.room = room;
    socket.emit('hosted', room);
  });

  socket.on('join', (room) => {
    const clients = io.sockets.adapter.rooms.get(room);
    if (clients && clients.size === 1) {
      socket.join(room);
      socket.data.room = room;
      socket.emit('joined', room);
      socket.to(room).emit('guestJoined');
    } else {
      socket.emit('joinError', 'Sala inexistente ou cheia');
    }
  });

  socket.on('deckChoice', (deckId) => {
    const room = socket.data.room;
    if (room) {
      socket.data.deckChosen = deckId;
      socket.to(room).emit('opponentDeckConfirmed', deckId);
    }
  });

  socket.on('startReady', () => {
    const room = socket.data.room;
    if (room) {
      socket.data.startReady = true;
      const clients = io.sockets.adapter.rooms.get(room);
      if (clients) {
        const allReady = [...clients].every(id => {
          const s = io.sockets.sockets.get(id);
          return s && s.data.startReady;
        });
        if (allReady) {
          io.to(room).emit('startGame');
        }
      }
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
    const room = socket.data.room;
    if (room) {
      socket.to(room).emit('opponentLeft');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
