import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.static("public"));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = new Map(); // roomId -> { phase, seed, players: { [socketId]: {name, deckKey, ready} }, order: [idA,idB] }

function getOrCreateRoom(id){
  if(!rooms.has(id)){
    rooms.set(id,{ phase: "lobby", seed: null, players:{}, order:[] });
  }
  return rooms.get(id);
}
function roomSnapshot(r){
  const a=r.order[0], b=r.order[1];
  return {
    phase:r.phase,
    seed:r.seed,
    players:[
      a?{ id:a, ...r.players[a]}:null,
      b?{ id:b, ...r.players[b]}:null
    ]
  };
}
function tryStart(roomId){
  const r=rooms.get(roomId); if(!r) return;
  if(r.phase!=="lobby") return;
  if(r.order.length!==2) return;
  const [A,B]=r.order;
  const pa=r.players[A], pb=r.players[B];
  if(!pa?.deckKey || !pb?.deckKey) return;
  if(!pa?.ready || !pb?.ready) return;

  r.phase="playing";
  r.seed=crypto.randomBytes(4).readUInt32BE(0);
  io.to(roomId).emit("match:start",{
    seed:r.seed,
    roles:{ [A]:"A", [B]:"B" },
    decks:{ A: pa.deckKey, B: pb.deckKey }
  });
}

io.on("connection", (socket)=>{
  let currentRoom=null;

  socket.on("room:host", ({room, name})=>{
    const r=getOrCreateRoom(room);
    if(r.order.length>=2){ socket.emit("room:error","Sala cheia"); return; }
    currentRoom=room; socket.join(room);
    r.players[socket.id]={ name:name||"Player", deckKey:null, ready:false };
    if(!r.order.includes(socket.id)) r.order.push(socket.id);
    io.to(room).emit("room:update", roomSnapshot(r));
    socket.emit("room:hosted", roomSnapshot(r));
  });

  socket.on("room:join", ({room, name})=>{
    const r=getOrCreateRoom(room);
    if(r.order.length>=2){ socket.emit("room:error","Sala cheia"); return; }
    currentRoom=room; socket.join(room);
    r.players[socket.id]={ name:name||"Player", deckKey:null, ready:false };
    if(!r.order.includes(socket.id)) r.order.push(socket.id);
    io.to(room).emit("room:update", roomSnapshot(r));
    socket.emit("room:joined", roomSnapshot(r));
  });

  socket.on("deck:select", ({room, deckKey})=>{
    const r=rooms.get(room); if(!r) return;
    if(!r.players[socket.id]) return;
    r.players[socket.id].deckKey=deckKey;
    r.players[socket.id].ready=false;
    io.to(room).emit("lobby:update", roomSnapshot(r));
  });

  socket.on("lobby:ready", ({room})=>{
    const r=rooms.get(room); if(!r) return;
    if(!r.players[socket.id]) return;
    r.players[socket.id].ready=true;
    io.to(room).emit("lobby:update", roomSnapshot(r));
    tryStart(room);
  });

  socket.on("game:act", ({room, act})=>{
    // servidor só retransmite; cliente aplica
    socket.to(room).emit("game:act", { act });
  });

  socket.on("disconnect", ()=>{
    if(!currentRoom) return;
    const r=rooms.get(currentRoom); if(!r) return;
    delete r.players[socket.id];
    r.order=r.order.filter(id=>id!==socket.id);
    r.phase="lobby"; r.seed=null;
    io.to(currentRoom).emit("room:update", roomSnapshot(r));
  });
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log("FFFO server on",PORT));
