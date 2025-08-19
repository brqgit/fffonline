// server.js — FFF Online (Socket.IO server)
'use strict';

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const ORIGIN = process.env.CORS_ORIGIN || '*'; // e.g. "https://seu-dominio.com"

const app = express();
app.disable('x-powered-by');
app.get('/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

// (opcional) sirva arquivos estáticos quando colocar seu index.html em /public
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ORIGIN, methods: ['GET', 'POST'] },
  transports: ['websocket'],
});

const rooms = new Map(); // roomId -> {hostId, guestId, hostName, guestName, seed, hostDeck, guestDeck, t}

/* helpers */
const now = () => Date.now();
const rndSeed = () => crypto.randomInt(1, 2 ** 31 - 1);
const getRoom = (id) => rooms.get(id);
const ensureRoom = (id) => (rooms.get(id) || (rooms.set(id, { t: now() }), rooms.get(id)));
const inRoom = (sock) => sock.data?.room;
const roleOf = (sock) => sock.data?.role;

function touchRoom(id) {
  const r = rooms.get(id);
  if (r) r.t = now();
}

function lobbyUpdate(id) {
  const r = rooms.get(id);
  if (!r) return;
  io.to(id).emit('lobby:update', {
    hasHost: !!r.hostId,
    hasGuest: !!r.guestId,
    hostName: r.hostName || null,
    guestName: r.guestName || null,
    hostDeck: r.hostDeck || null,
    guestDeck: r.guestDeck || null,
  });
}

function maybeReady(id) {
  const r = rooms.get(id);
  if (!r || !r.hostId || !r.guestId) return;
  if (!r.seed) r.seed = rndSeed();
  io.to(id).emit('match:ready', {
    room: id,
    seed: r.seed,
    hostDeck: r.hostDeck || null,
    guestDeck: r.guestDeck || null,
  });
  io.to(id).emit('seed:set', { seed: r.seed });
}

function leaveRoom(sock) {
  const id = inRoom(sock);
  if (!id) return;
  const r = rooms.get(id);
  if (!r) return;

  if (sock.id === r.hostId) {
    r.hostId = null;
    r.hostName = null;
    r.hostDeck = null;
  }
  if (sock.id === r.guestId) {
    r.guestId = null;
    r.guestName = null;
    r.guestDeck = null;
  }

  sock.leave(id);
  touchRoom(id);
  lobbyUpdate(id);

  // apaga sala vazia
  if (!r.hostId && !r.guestId) rooms.delete(id);
}

/* socket wiring */
io.on('connection', (socket) => {
  socket.emit('hello', { id: socket.id });

  socket.on('host', ({ room, name, deck } = {}) => {
    room = String(room || 'duo').trim();
    name = String(name || 'Host').trim();

    const r = ensureRoom(room);
    if (r.hostId && r.hostId !== socket.id) {
      socket.emit('error:room', { message: 'Sala já possui host.' });
      return;
    }
    // sair de outra sala, caso exista
    if (inRoom(socket)) leaveRoom(socket);

    r.hostId = socket.id;
    r.hostName = name;
    if (deck) r.hostDeck = deck;
    socket.data.room = room;
    socket.data.role = 'host';
    socket.join(room);

    touchRoom(room);
    socket.emit('host:ack', { room });
    lobbyUpdate(room);
    maybeReady(room);
  });

  socket.on('join', ({ room, name, deck } = {}) => {
    room = String(room || 'duo').trim();
    name = String(name || 'Guest').trim();

    const r = ensureRoom(room);
    if (r.guestId && r.guestId !== socket.id) {
      socket.emit('error:room', { message: 'Sala já possui convidado.' });
      return;
    }
    if (inRoom(socket)) leaveRoom(socket);

    r.guestId = socket.id;
    r.guestName = name;
    if (deck) r.guestDeck = deck;
    socket.data.room = room;
    socket.data.role = 'guest';
    socket.join(room);

    touchRoom(room);
    socket.emit('join:ack', { room });
    lobbyUpdate(room);
    maybeReady(room);
  });

  socket.on('deck:select', ({ room, deck } = {}) => {
    const r = getRoom(room || inRoom(socket));
    if (!r) return;
    if (roleOf(socket) === 'host') r.hostDeck = deck;
    if (roleOf(socket) === 'guest') r.guestDeck = deck;
    touchRoom(room);
    lobbyUpdate(room);
    maybeReady(room);
  });

  // eventos de jogo — repassa somente para o oponente
  socket.on('game:event', ({ room, type, payload } = {}) => {
    room = room || inRoom(socket);
    if (!room) return;
    socket.to(room).emit('game:event', { type, payload, from: roleOf(socket) });
    touchRoom(room);
  });

  // sincronização de estado
  socket.on('state:request', ({ room } = {}) => {
    room = room || inRoom(socket);
    if (!room) return;
    socket.to(room).emit('state:request', {});
  });

  socket.on('state:full', ({ room, state } = {}) => {
    room = room || inRoom(socket);
    if (!room) return;
    socket.to(room).emit('state:full', { state });
  });

  // permitir redefinir seed (ex.: novo jogo)
  socket.on('seed:new', ({ room } = {}) => {
    room = room || inRoom(socket);
    const r = getRoom(room);
    if (!r) return;
    r.seed = rndSeed();
    io.to(room).emit('seed:set', { seed: r.seed });
    touchRoom(room);
  });

  socket.on('disconnect', () => {
    leaveRoom(socket);
  });
});

/* limpeza de salas antigas */
setInterval(() => {
  const TTL = 1000 * 60 * 60; // 1h
  const t = now();
  for (const [id, r] of rooms.entries()) {
    if (!r.hostId && !r.guestId) { rooms.delete(id); continue; }
    if (t - (r.t || 0) > TTL) rooms.delete(id);
  }
}, 60_000);

server.listen(PORT, () => {
  console.log(`FFF Online server listening on :${PORT}`);
});
