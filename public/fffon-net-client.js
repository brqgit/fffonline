/* FFF Online - Socket.IO client */
(function(){
  const q = (id)=>document.getElementById(id);
  const MAX_LEN = 32;
  const ROOM_RE = new RegExp(`^[A-Za-z0-9_-]{1,${MAX_LEN}}$`);
  const NAME_RE = new RegExp(`^[A-Za-z0-9 _-]{1,${MAX_LEN}}$`);

  const NET = {
    online:false,
    isHost:false,
    socket:null,
    room:null,
    name:null,
    seed:null,
    hostDeckChoice:null,
    guestDeckChoice:null,
    onEvent:null,

    connect(url){
      if(typeof io === 'undefined'){ this._setStatus('Offline: Socket.IO não encontrado'); return; }
      try{ if(this.socket){ this.socket.disconnect(); } }catch(_){ }
      const target = (url && url.trim()) || undefined;
        this.socket = io(target, { transports:['websocket','polling'], autoConnect:true });
      this._wireSocket();
      this._setStatus('Conectando...');
    },

    host(room,name,deck){
      if(!ROOM_RE.test(room) || !NAME_RE.test(name)){
        this._setStatus('Erro: Nome ou sala inválidos.');
        return;
      }
      const emitHost = ()=>{ this.isHost = true; this.room = room; this.name = name; this.socket.emit('host', { room, name, deck }); };
      if(!this.socket || !this.socket.connected){ this.connect(q('mpWs')?.value); this.socket?.once('connect', emitHost); } else emitHost();
    },

    join(room,name,deck){
      if(!ROOM_RE.test(room) || !NAME_RE.test(name)){
        this._setStatus('Erro: Nome ou sala inválidos.');
        return;
      }
      const emitJoin = ()=>{ this.isHost = false; this.room = room; this.name = name; this.socket.emit('join', { room, name, deck }); };
      if(!this.socket || !this.socket.connected){ this.connect(q('mpWs')?.value); this.socket?.once('connect', emitJoin); } else emitJoin();
    },

    deckSelect(deck){ if(this.socket && this.room){ this.socket.emit('deck:select', { room:this.room, deck }); } },
    send(type,payload){ if(!this.socket||!this.room) return; this.socket.emit('game:event',{ room:this.room, type, payload }); },
    requestState(){ if(this.socket && this.room){ this.socket.emit('state:request',{ room:this.room }); } },
    sendFullState(state){ if(this.socket && this.room){ this.socket.emit('state:full',{ room:this.room, state }); } },
    leave(){ try{ this.socket?.disconnect(); }catch(_){ } finally{ this.online=false; this._setStatus('Modo: Solo'); } },

    _wireSocket(){
      const s = this.socket; if(!s) return;
      s.on('connect', ()=>{ this._setStatus('Conectado'); });
      s.on('disconnect', ()=>{ this.online=false; this.hostDeckChoice=null; this.guestDeckChoice=null; this._setStatus('Desconectado'); });
      s.on('error:room', (e)=>{ this._setStatus('Sala: '+(e?.message||'erro')); });

      s.on('host:ack', ({room})=>{ this._setStatus(`Hospedando sala ${room}`); });
      s.on('join:ack', ({room})=>{ this._setStatus(`Conectado à sala ${room}`); });

      s.on('lobby:update', (st)=>{
        this.hostDeckChoice = st.hostDeck||null;
        this.guestDeckChoice = st.guestDeck||null;
        const a = st.hasHost ? (st.hostName||'Host') : '—';
        const b = st.hasGuest ? (st.guestName||'Guest') : '—';
        let msg = `Lobby • Host: ${a} • Guest: ${b}`;
        const hostDeck = !!this.hostDeckChoice;
        const guestDeck = !!this.guestDeckChoice;
        if(this.isHost){
          if(!hostDeck) msg += ' • Escolha seu deck';
          else if(!guestDeck) msg += ' • Aguardando convidado escolher deck';
        }else{
          if(!guestDeck) msg += ' • Escolha seu deck';
          else if(!hostDeck) msg += ' • Aguardando host escolher deck';
        }
        this._setStatus(msg);
      });

      s.on('match:ready', (st)=>{
        this.online = true; this.seed = st.seed||null;
        this.hostDeckChoice = st.hostDeck||this.hostDeckChoice;
        this.guestDeckChoice = st.guestDeck||this.guestDeckChoice;
        this._setStatus('Partida pronta');
        window.dispatchEvent(new CustomEvent('net:ready', { detail: st }));
      });

      s.on('seed:set', ({seed})=>{ this.seed = seed; window.dispatchEvent(new CustomEvent('net:seed',{ detail:{ seed } })); });

      s.on('game:event', ({type,payload})=>{
        if(typeof this.onEvent === 'function') this.onEvent(type,payload);
        window.dispatchEvent(new CustomEvent('net:event',{ detail:{ type, payload } }));
      });

      s.on('state:request', ()=>{ window.dispatchEvent(new Event('net:state-request')); });
      s.on('state:full', ({state})=>{ window.dispatchEvent(new CustomEvent('net:state-full',{ detail:{ state } })); });
    },

    _wireUi(){
      const hostBtn=q('mpHost'), joinBtn=q('mpJoin'), name=q('mpName'), room=q('mpRoom'), ws=q('mpWs');
      hostBtn?.addEventListener('click', ()=>{
        const nm=(name?.value||'Host').trim();
        const rm=(room?.value||'duo').trim();
        this.host(rm,nm, null);
      });
      joinBtn?.addEventListener('click', ()=>{
        const nm=(name?.value||'Guest').trim();
        const rm=(room?.value||'duo').trim();
        this.join(rm,nm, null);
      });
    },

    _setStatus(msg){ const el=q('mpStatus'); if(el) el.textContent = msg; }
  };

  window.NET = NET;
  document.addEventListener('DOMContentLoaded', ()=>NET._wireUi());
})();