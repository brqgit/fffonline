(() => {
  const el = (t,cls,txt)=>{ const n=document.createElement(t); if(cls) n.className=cls; if(txt) n.textContent=txt; return n; };

  // UI helpers (banner + toast)
  const style = document.createElement("style");
  style.textContent = `
  .ffon-banner{position:fixed;top:12px;left:50%;transform:translateX(-50%);background:#0c1330;border:1px solid #2b3a86;border-radius:12px;padding:10px 14px;color:#cfe3ff;z-index:9999;box-shadow:0 10px 24px rgba(0,0,0,.35)}
  .ffon-toast{position:fixed;right:12px;bottom:12px;background:#0c1330;border:1px solid #2b3a86;border-radius:12px;padding:10px 14px;color:#cfe3ff;z-index:9999;box-shadow:0 10px 24px rgba(0,0,0,.35)}
  .ffon-btn{cursor:pointer;border:none;border-radius:10px;padding:8px 12px;background:linear-gradient(180deg,#2a3c7e,#1b2a5b);color:#fff;font-weight:700;margin-left:10px}
  `;
  document.head.appendChild(style);

  let banner=null;
  function showBanner(msg){
    if(!banner){ banner=el("div","ffon-banner"); document.body.appendChild(banner); }
    banner.textContent=msg;
  }
  function hideBanner(){ if(banner){ banner.remove(); banner=null; } }
  function toast(msg,ms=1800){
    const t=el("div","ffon-toast",msg); document.body.appendChild(t);
    setTimeout(()=>t.remove(),ms);
  }

  // Socket.IO lazy
  let ioRef=null;
  function ensureIO(){
    if(ioRef) return ioRef;
    if(!window.io){ toast("Socket.io não carregado"); throw new Error("socket.io missing"); }
    ioRef = window.io;
    return ioRef;
  }

  const NET = {
    _socket:null,
    _room:null,
    _mode:"offline",
    _role:null, // "A"|"B"
    _seed:null,
    isOnline(){ return this._mode==="online"; },

    host(room, name){
      const socket = this._connect(room);
      showBanner("Hospedando sala… Envie o código ao seu amigo.");
      socket.emit("room:host", { room, name });
    },
    join(room, name){
      const socket = this._connect(room);
      showBanner("Conectando à sala…");
      socket.emit("room:join", { room, name });
    },
    leave(){
      if(this._socket){ this._socket.disconnect(); }
      this._socket=null; this._room=null; this._mode="offline"; this._role=null; this._seed=null;
      hideBanner(); toast("Desconectado");
      window.dispatchEvent(new CustomEvent("ffon:mode", {detail:{ online:false }}));
    },

    _connect(room){
      if(this._socket){ this._socket.disconnect(); }
      const url = (document.querySelector("#mpWs")?.value || "").trim();
      const endpoint = url==="" ? undefined : url; // vazio => mesmo domínio
      const io = ensureIO();
      const socket = this._socket = io(endpoint, { transports:["websocket"], autoConnect:true });
      this._room = room;
      this._mode = "online";
      this._wire(socket);
      return socket;
    },

    _wire(socket){
      socket.on("connect", ()=>{ toast("Conectado"); window.dispatchEvent(new CustomEvent("ffon:mode",{detail:{online:true}})); });
      socket.on("connect_error", (e)=>{ showBanner("Erro ao conectar"); toast(e.message||"Erro"); });
      socket.on("room:error", (m)=>{ showBanner(m); });

      socket.on("room:hosted", (snap)=>{ showBanner("Sala criada. Aguarde oponente…"); });
      socket.on("room:joined", (snap)=>{ showBanner("Conectado. Escolha seu deck"); });

      socket.on("room:update", (snap)=>{
        // sempre lobby ao entrar/alterar
        if(snap.phase==="lobby"){ showBanner("Lobby: escolha seu deck"); }
      });

      socket.on("lobby:update", (snap)=>{
        const [pA,pB]=snap.players;
        const me = [pA?.id,pB?.id].includes(socket.id) ? socket.id : null;
        const my = pA?.id===me ? pA : (pB?.id===me ? pB : null);
        const op = pA?.id!==me ? pA : pB;
        if(!my?.deckKey) { showBanner("Escolha seu deck"); return; }
        if(my.deckKey && !op?.deckKey){ showBanner("Oponente escolhendo deck…"); return; }
        if(my.deckKey && op?.deckKey && !my.ready){ showBanner("Deck escolhido. Clique Confirmar"); return; }
        if(my?.ready && !op?.ready){ showBanner("Aguardando oponente confirmar…"); return; }
      });

      socket.on("match:start", ({ seed, roles, decks })=>{
        this._seed = seed;
        this._role = roles[socket.id];
        hideBanner();
        toast("Partida iniciando…");
        window.dispatchEvent(new CustomEvent("ffon:matchStart",{
          detail:{
            seed,
            you:this._role, enemy: this._role==="A"?"B":"A",
            yourDeck: this._role==="A" ? decks.A : decks.B,
            enemyDeck: this._role==="A" ? decks.B : decks.A
          }
        }));
      });

      socket.on("game:act", ({act})=>{
        // aplicativo aplica ato vindo do servidor
        window.dispatchEvent(new CustomEvent("ffon:act",{detail:act}));
      });
    },

    chooseDeck(deckKey){
      if(!this._socket) return toast("Conecte primeiro");
      this._socket.emit("deck:select",{ room:this._room, deckKey });
      toast(`Você escolheu: ${deckKey}`);
    },
    confirmReady(){
      if(!this._socket) return toast("Conecte primeiro");
      this._socket.emit("lobby:ready",{ room:this._room });
      showBanner("Aguardando oponente…");
    },

    sendAct(act){
      if(!this._socket) return;
      this._socket.emit("game:act",{ room:this._room, act });
    }
  };

  // Expor global
  window.FFON = NET;

  // ====== Botões do topo ======
  function q(id){ return document.getElementById(id) }
  q("mpHost")?.addEventListener("click", ()=>{
    const room = (q("mpRoom")?.value||"duo").trim();
    const name = (q("mpName")?.value||"Player").trim();
    NET.host(room,name);
  });
  q("mpJoin")?.addEventListener("click", ()=>{
    const room = (q("mpRoom")?.value||"duo").trim();
    const name = (q("mpName")?.value||"Player").trim();
    NET.join(room,name);
  });
  q("mpLeave")?.addEventListener("click", ()=> NET.leave());

  // Capturar cliques de deck (data-deck)
  document.addEventListener("click",(ev)=>{
    const btn = ev.target.closest("[data-deck]");
    if(!btn) return;
    if(!NET.isOnline()) return;
    NET.chooseDeck(btn.getAttribute("data-deck"));
  });
  // Confirmar (se existir botão)
  q("mpReady")?.addEventListener("click", ()=> NET.confirmReady());
=======
/* FFF Online - Socket.IO client — UX de lobby com prompts de deck */
(function(){
  const $ = (id)=>document.getElementById(id);
  const hasScheme = (u)=>/^https?:\/\//i.test(u)||/^wss?:\/\//i.test(u);

  // UI helpers (injetados pelo cliente)
  function injectStyles(){
    if(document.getElementById('netStyles')) return;
    const css = `
    .net-toast{position:fixed;right:16px;bottom:16px;background:#0b1230;color:#dfe7ff;border:1px solid #2b3a86;padding:10px 12px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.35);z-index:9999;opacity:0;transform:translateY(8px);transition:.18s ease;}
    .net-toast.show{opacity:1;transform:translateY(0)}
    .net-banner{position:fixed;left:50%;top:12px;transform:translateX(-50%);background:#0e1636;color:#e9efff;border:1px solid #2b3a86;padding:10px 14px;border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.4);z-index:9998;font-weight:700}
    .net-sub{display:block;font-weight:500;color:#a9b6ff;margin-top:4px}
    `;
    const st=document.createElement('style');st.id='netStyles';st.textContent=css;document.head.appendChild(st);
  }
  function toast(msg,ms=1800){injectStyles();const n=document.createElement('div');n.className='net-toast';n.textContent=msg;document.body.appendChild(n);requestAnimationFrame(()=>n.classList.add('show'));setTimeout(()=>{n.classList.remove('show');setTimeout(()=>n.remove(),220)},ms)}
  let bannerNode=null;function banner(msg,sub){injectStyles();if(!bannerNode){bannerNode=document.createElement('div');bannerNode.className='net-banner';document.body.appendChild(bannerNode)}bannerNode.innerHTML=`${msg}${sub?`<span class="net-sub">${sub}</span>`:''}`;}
  function clearBanner(){if(bannerNode){bannerNode.remove();bannerNode=null}}

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
      if(typeof io==='undefined'){ this._setStatus('Offline: Socket.IO não encontrado'); toast('Socket.IO não encontrado'); return; }
      try{ this.socket?.disconnect(); }catch(_){}
      let target=(url||'').trim();
      if(!hasScheme(target)) target = undefined; // usa mesmo domínio se inválido
      this.socket = io(target,{transports:['websocket'],path:'/socket.io',autoConnect:true});
      this._wireSocket();
      this._setStatus('Conectando...');
      banner('Conectando...','Aguarde');
    },

    host(room,name,deck){
      const emit=()=>{ this.isHost=true; this.room=room; this.name=name; this.socket.emit('host',{room,name,deck}); };
      if(!this.socket||!this.socket.connected){ this.connect($('#mpWs')?.value); this.socket?.once('connect',emit);} else emit();
    },

    join(room,name,deck){
      const emit=()=>{ this.isHost=false; this.room=room; this.name=name; this.socket.emit('join',{room,name,deck}); };
      if(!this.socket||!this.socket.connected){ this.connect($('#mpWs')?.value); this.socket?.once('connect',emit);} else emit();
    },

    deckSelect(deck){ if(this.socket&&this.room){ this.socket.emit('deck:select',{room:this.room,deck}); toast(`Você escolheu: ${deck}`) } },

    send(type,payload){ if(!this.socket||!this.room) return; this.socket.emit('game:event',{room:this.room,type,payload}); },
    requestState(){ if(this.socket&&this.room) this.socket.emit('state:request',{room:this.room}); },
    sendFullState(state){ if(this.socket&&this.room) this.socket.emit('state:full',{room:this.room,state}); },
    leave(){ try{ this.socket?.disconnect(); }catch(_){ } finally{ this.online=false; clearBanner(); this._setStatus('Modo: Solo'); toast('Você saiu da sala'); } },

    _wireSocket(){
      const s=this.socket; if(!s) return;
      s.on('connect',()=>{ this._setStatus('Conectado'); toast('Conectado'); });
      s.on('disconnect',()=>{ this.online=false; this._setStatus('Desconectado'); banner('Desconectado'); });
      s.on('connect_error',(e)=>{ this._setStatus('Erro de conexão'); banner('Erro de conexão', e?.message||''); });
      s.on('error:room',(e)=>{ this._setStatus('Sala: '+(e?.message||'erro')); banner('Erro na sala', e?.message||''); });

      s.on('host:ack',({room})=>{ this._setStatus(`Hospedando sala ${room}`); banner('Sala criada',`Código: ${room}`); toast('Escolha seu deck'); this._promptChooseDeck(); });
      s.on('join:ack',({room})=>{ this._setStatus(`Conectado à sala ${room}`); banner('Conectado à sala',`Código: ${room}`); toast('Escolha seu deck'); this._promptChooseDeck(); });

      s.on('lobby:update',(st)=>{
        this.hostDeckChoice=st.hostDeck||null; this.guestDeckChoice=st.guestDeck||null;
        const you = this.isHost ? this.hostDeckChoice : this.guestDeckChoice;
        const opp  = this.isHost ? this.guestDeckChoice : this.hostDeckChoice;
        if(!you && !opp) banner('Escolha seu deck','Aguardando ambos');
        else if(you && !opp) banner('Aguardando oponente','Oponente escolhendo deck...');
        else if(!you && opp) banner('Escolha seu deck','Oponente pronto');
        else banner('Ambos prontos','Iniciando partida...');
        const a = st.hasHost ? (st.hostName||'Host') : '—';
        const b = st.hasGuest ? (st.guestName||'Guest') : '—';
        this._setStatus(`Lobby • Host: ${a} • Guest: ${b}`);
      });

      s.on('match:ready',(st)=>{
        this.online=true; this.seed=st.seed||null; this.hostDeckChoice=st.hostDeck||this.hostDeckChoice; this.guestDeckChoice=st.guestDeck||this.guestDeckChoice;
        banner('Partida pronta!','Carregando...');
        setTimeout(()=>{ clearBanner(); window.dispatchEvent(new CustomEvent('net:ready',{detail:st})); }, 900);
      });

      s.on('seed:set',({seed})=>{ this.seed=seed; window.dispatchEvent(new CustomEvent('net:seed',{detail:{seed}})); });
      s.on('game:event',({type,payload})=>{ if(typeof this.onEvent==='function') this.onEvent(type,payload); window.dispatchEvent(new CustomEvent('net:event',{detail:{type,payload}})); });
      s.on('state:request',()=> window.dispatchEvent(new Event('net:state-request')));
      s.on('state:full',({state})=> window.dispatchEvent(new CustomEvent('net:state-full',{detail:{state}})));
    },

    _promptChooseDeck(){
      // tenta ligar nos botões de deck da tela inicial
      const clickable = document.querySelectorAll('[data-deck]');
      clickable.forEach(btn=>{
        if(btn.__netBound) return; btn.__netBound=true;
        btn.addEventListener('click',()=>{ const deck=btn.getAttribute('data-deck'); if(deck) this.deckSelect(deck); });
      });
      banner('Escolha seu deck','Clique em um dos decks');
    },

    _wireUi(){
      const hostBtn=$('mpHost'), joinBtn=$('mpJoin'), leaveBtn=$('mpLeave');
      const name=$('mpName'), room=$('mpRoom');
      hostBtn?.addEventListener('click',()=>{ const nm=(name?.value||'Host').trim(); const rm=(room?.value||'duo').trim(); this.host(rm,nm,null); });
      joinBtn?.addEventListener('click',()=>{ const nm=(name?.value||'Guest').trim(); const rm=(room?.value||'duo').trim(); this.join(rm,nm,null); });
      leaveBtn?.addEventListener('click',()=> this.leave());
    },

    _setStatus(msg){ const el=$('mpStatus'); if(el) el.textContent=msg; }
  };

  window.NET = NET;
  document.addEventListener('DOMContentLoaded',()=>NET._wireUi());
})();
