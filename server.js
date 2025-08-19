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

const rooms = new Map(); // roomId -> { host:{id,name,deck}, guest:{id,name,deck}, seed }

function getRoom(id){
  if(!rooms.has(id)) rooms.set(id,{ host:null, guest:null, seed:null });
  return rooms.get(id);
}
function lobbyState(r){
  return {
    hasHost:!!r.host,
    hostName:r.host?.name || null,
    hostDeck:r.host?.deck || null,
    hasGuest:!!r.guest,
    guestName:r.guest?.name || null,
    guestDeck:r.guest?.deck || null
  };
}
function tryReady(roomId){
  const r=rooms.get(roomId); if(!r) return;
  if(r.host?.deck && r.guest?.deck){
    r.seed = crypto.randomBytes(4).readUInt32BE(0);
    io.to(roomId).emit("match:ready",{
      seed:r.seed,
      hostDeck:r.host.deck,
      guestDeck:r.guest.deck
    });
  }
}

io.on("connection",(socket)=>{
  let currentRoom=null;

  socket.on("host",({room,name,deck})=>{
    const r=getRoom(room);
    if(r.host){ socket.emit("error:room",{message:"Já existe um host"}); return; }
    currentRoom=room; socket.join(room);
    r.host={ id:socket.id, name:name||"Host", deck:deck||null };
    socket.emit("host:ack",{ room });
    io.to(room).emit("lobby:update", lobbyState(r));
  });

  socket.on("join",({room,name,deck})=>{
    const r=getRoom(room);
    if(r.guest){ socket.emit("error:room",{message:"Sala cheia"}); return; }
    currentRoom=room; socket.join(room);
    r.guest={ id:socket.id, name:name||"Guest", deck:deck||null };
    socket.emit("join:ack",{ room });
    io.to(room).emit("lobby:update", lobbyState(r));
    tryReady(room);
  });

  socket.on("deck:select",({room,deck})=>{
    const r=rooms.get(room); if(!r) return;
    if(r.host?.id===socket.id) r.host.deck=deck;
    else if(r.guest?.id===socket.id) r.guest.deck=deck;
    io.to(room).emit("lobby:update", lobbyState(r));
    tryReady(room);
  });

  socket.on("game:event",({room,type,payload})=>{
    socket.to(room).emit("game:event",{type,payload});
  });

  socket.on("state:request",({room})=>{
    socket.to(room).emit("state:request");
  });

  socket.on("state:full",({room,state})=>{
    socket.to(room).emit("state:full",{state});
  });

  socket.on("disconnect",()=>{
    if(!currentRoom) return;
    const r=rooms.get(currentRoom); if(!r) return;
    if(r.host?.id===socket.id) r.host=null;
    if(r.guest?.id===socket.id) r.guest=null;
    r.seed=null;
    io.to(currentRoom).emit("lobby:update", lobbyState(r));
  });
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log("FFFO server on",PORT));
