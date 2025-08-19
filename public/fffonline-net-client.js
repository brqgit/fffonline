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
})();
