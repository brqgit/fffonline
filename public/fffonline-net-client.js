/* fffonline-net-client.js (safe loader + binds por id e data-ffon) */
(() => {
  // ===== util =====
  const $ = sel => document.querySelector(sel);
  const el = (t,c,txt)=>{ const n=document.createElement(t); if(c) n.className=c; if(txt) n.textContent=txt; return n; };
  const css = `
  .ffon-toast{position:fixed;right:12px;bottom:12px;background:#0c1330;border:1px solid #2b3a86;border-radius:12px;
    padding:10px 14px;color:#cfe3ff;z-index:9999;box-shadow:0 10px 24px rgba(0,0,0,.35)}
  .ffon-banner{position:fixed;top:12px;left:50%;transform:translateX(-50%);background:#0c1330;border:1px solid #2b3a86;
    border-radius:12px;padding:10px 14px;color:#cfe3ff;z-index:9999;box-shadow:0 10px 24px rgba(0,0,0,.35)}
  `;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  let banner=null;
  function toast(msg,ms=1800){ const t=el('div','ffon-toast',msg); document.body.appendChild(t); setTimeout(()=>t.remove(),ms); }
  function showBanner(msg){ if(!banner){ banner=el('div','ffon-banner'); document.body.appendChild(banner) } banner.textContent=msg; }
  function hideBanner(){ if(banner){ banner.remove(); banner=null } }

  // ===== socket.io loader =====
  function ensureIO(cb){
    if(window.io){ cb(); return; }
    const s=document.createElement('script');
    s.src='https://cdn.socket.io/4.7.5/socket.io.min.js';
    s.onload=cb;
    s.onerror=()=>toast('Falha ao carregar socket.io');
    document.head.appendChild(s);
  }

  const FFON = {
    _socket:null,_room:null,_mode:'offline',_role:null,_seed:null,
    isOnline(){return this._mode==='online'},
    _connect(room){
      this._room = room; this._mode='online';
      const url = ($('#wsUrl')?.value||'').trim();
      const endpoint = url===''? undefined : url;
      const socket = this._socket = window.io(endpoint,{transports:['websocket']});
      this._wire(socket);
      return socket;
    },
    host(room,name){
      ensureIO(()=>{ const s=this._connect(room); s.emit('room:host',{room,name}); showBanner('Hospedando… envie o código'); });
    },
    join(room,name){
      ensureIO(()=>{ const s=this._connect(room); s.emit('room:join',{room,name}); showBanner('Conectando…'); });
    },
    leave(){
      if(this._socket) this._socket.disconnect();
      this._socket=null; this._room=null; this._mode='offline'; this._role=null; this._seed=null;
      hideBanner(); toast('Desconectado');
      window.dispatchEvent(new CustomEvent('ffon:mode',{detail:{online:false}}));
      const sEl=$('#mpStatus'); if(sEl) sEl.textContent='Modo: Solo';
    },
    chooseDeck(deckKey){ if(!this._socket) return toast('Conecte primeiro'); this._socket.emit('deck:select',{room:this._room,deckKey}); },
    confirmReady(){ if(!this._socket) return toast('Conecte primeiro'); this._socket.emit('lobby:ready',{room:this._room}); showBanner('Aguardando oponente…'); },
    sendAct(act){ if(this._socket) this._socket.emit('game:act',{room:this._room,act}); },
    _wire(s){
      const sEl=$('#mpStatus');
      s.on('connect',()=>{ toast('Conectado'); if(sEl) sEl.textContent='Conectado: aguardando deck'; window.dispatchEvent(new CustomEvent('ffon:mode',{detail:{online:true}})); });
      s.on('connect_error',(e)=>{ showBanner('Erro de conexão'); toast(e.message||'Erro'); });
      s.on('room:error',(m)=>{ showBanner(m); toast(m,2600); });

      s.on('room:hosted',()=>{ showBanner('Sala criada. Aguardando oponente…'); sEl && (sEl.textContent='Sala criada'); });
      s.on('room:joined',()=>{ showBanner('Conectado. Escolha seu deck'); sEl && (sEl.textContent='Escolha seu deck'); });

      s.on('room:update',(snap)=>{ if(snap.phase==='lobby') showBanner('Lobby: escolha seu deck'); });
      s.on('lobby:update',(snap)=>{
        const me=s.id; const [a,b]=snap.players;
        const mine = a?.id===me? a : (b?.id===me? b : null);
        const opp  = a?.id!==me? a : b;
        if(!mine?.deckKey){ showBanner('Escolha seu deck'); return; }
        if(mine.deckKey && !opp?.deckKey){ showBanner('Oponente escolhendo deck…'); return; }
        if(mine.deckKey && opp?.deckKey && !mine.ready){ showBanner('Deck escolhido. Clique Confirmar'); return; }
        if(mine?.ready && !opp?.ready){ showBanner('Aguardando oponente confirmar…'); return; }
      });

      s.on('match:start',({seed,roles,decks})=>{
        this._seed=seed; this._role=roles[s.id]; hideBanner(); toast('Partida iniciando…');
        window.dispatchEvent(new CustomEvent('ffon:matchStart',{
          detail:{
            seed,
            you:this._role,
            enemy:this._role==='A'?'B':'A',
            yourDeck:this._role==='A'?decks.A:decks.B,
            enemyDeck:this._role==='A'?decks.B:decks.A
          }
        }));
        sEl && (sEl.textContent='Em partida');
      });

      s.on('game:act',({act})=>{
        window.dispatchEvent(new CustomEvent('ffon:act',{detail:act}));
      });
    }
  };
  window.FFON = FFON;

  // ===== liga botões por ID e por data-atributo (fallback) =====
  function bindUI(){
    const bar = $('#ffonBar'); if(!bar) return;

    const hostBtn  = $('#mpHost')  || bar.querySelector('[data-ffon="host"]');
    const joinBtn  = $('#mpJoin')  || bar.querySelector('[data-ffon="join"]');
    const readyBtn = $('#mpReady') || bar.querySelector('[data-ffon="ready"]');
    const leaveBtn = $('#mpLeave') || bar.querySelector('[data-ffon="leave"]');
    const roomIn   = $('#roomInput') || bar.querySelector('input[placeholder="Sala"]');
    const nickIn   = $('#nickInput') || bar.querySelector('input[placeholder="Apelido"]');

    hostBtn && hostBtn.addEventListener('click',()=> FFON.host( (roomIn?.value||'duo').trim(), (nickIn?.value||'Player').trim() ));
    joinBtn && joinBtn.addEventListener('click',()=> FFON.join( (roomIn?.value||'duo').trim(), (nickIn?.value||'Player').trim() ));
    readyBtn&& readyBtn.addEventListener('click',()=> FFON.confirmReady());
    leaveBtn&& leaveBtn.addEventListener('click',()=> FFON.leave());

    document.addEventListener('click',(ev)=>{
      const btn = ev.target.closest('[data-deck]');
      if(!btn || !FFON.isOnline()) return;
      FFON.chooseDeck(btn.getAttribute('data-deck'));
    });

    const sEl=$('#mpStatus'); if(sEl) sEl.textContent='Modo: Solo';
    toast('Multiplayer pronto');
  }

  if(document.readyState==='complete' || document.readyState==='interactive') bindUI();
  else document.addEventListener('DOMContentLoaded', bindUI);
})();
