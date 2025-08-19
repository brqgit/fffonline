/* apps.js — bootstrap do cliente (solo + online) */
(function () {
  const el = (s) => document.querySelector(s);
  const $app = () => el('#app');

  // PRNG determinístico (para embaralhar igual nos dois lados)
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, seed) {
    const r = mulberry32(seed || Date.now());
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const GAME = {
    mode: 'solo',
    room: null,
    seed: null,
    me: { name: 'Player', deck: null },
    foe: { name: 'Opponent', deck: null },
    state: null,
    onNetEvent: null,

    mount() {
      if (!$app()) return;
      $app().innerHTML = `
        <div style="display:grid;gap:12px">
          <div id="gameStatus" style="color:#a7b0d9;font-size:14px">Pronto</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button id="btnSolo" class="btn">Jogar Solo</button>
            <button id="btnSync" class="btn">Sincronizar Estado (online)</button>
          </div>
          <div id="gameRoot" style="min-height:300px;border:1px dashed #25306a;border-radius:12px;padding:12px;background:linear-gradient(180deg,rgba(255,255,255,.03),transparent)">
            <div style="opacity:.7">Monte seu jogo aqui. Este arquivo só faz a ponte Solo/Online.</div>
          </div>
        </div>
      `;
      el('#btnSolo')?.addEventListener('click', () => {
        this.startSolo();
      });
      el('#btnSync')?.addEventListener('click', () => {
        if (window.NET?.online) window.NET.requestState();
      });
      this.renderStatus();
    },

    renderStatus(msg) {
      const g = el('#gameStatus');
      if (!g) return;
      const base = `Modo: ${this.mode === 'solo' ? 'Solo' : `Online (${this.room||'?'})`} • Seed: ${this.seed ?? '—'}`;
      g.textContent = msg ? `${base} • ${msg}` : base;
    },

    startSolo() {
      this.mode = 'solo';
      this.room = null;
      this.seed = Math.floor(Math.random() * 2 ** 31);
      this.state = this._newState(this.seed);
      this.renderStatus('nova partida');
      this._renderBoard();
    },

    startOnline({ room, seed, hostDeck, guestDeck, hostName, guestName }) {
      this.mode = 'online';
      this.room = room;
      this.seed = seed || Math.floor(Math.random() * 2 ** 31);
      this.me.name = window.NET?.isHost ? (hostName || 'Host') : (guestName || 'Guest');
      this.foe.name = window.NET?.isHost ? (guestName || 'Guest') : (hostName || 'Host');
      this.me.deck = window.NET?.isHost ? hostDeck : guestDeck;
      this.foe.deck = window.NET?.isHost ? guestDeck : hostDeck;
      this.state = this._newState(this.seed);
      this.renderStatus('match:ready');
      this._renderBoard();
      if (window.NET?.isHost) window.NET.sendFullState(this.state);
    },

    receiveFullState(st) {
      this.state = st;
      this.renderStatus('estado sincronizado');
      this._renderBoard();
    },

    emit(type, payload) {
      if (this.mode === 'online' && window.NET?.online) window.NET.send(type, payload);
      this._applyLocal(type, payload);
    },

    _applyLocal(type, payload) {
      // Aqui você aplica as ações no seu motor real.
      // Abaixo há só um exemplo didático.
      if (type === 'draw') {
        const from = payload?.who || 'me';
        const deck = from === 'me' ? this.state.me.deck : this.state.foe.deck;
        const hand = from === 'me' ? this.state.me.hand : this.state.foe.hand;
        if (deck.length) hand.push(deck.shift());
      }
      this._renderBoard();
    },

    _newState(seed) {
      const baseDeck = Array.from({ length: 20 }, (_, i) => ({ id: `C${i+1}`, name: `Carta ${i+1}` }));
      const meDeck = shuffle(baseDeck, seed);
      const foeDeck = shuffle(baseDeck, seed ^ 0x9e3779b9);
      return {
        seed,
        me: { hp: 30, hand: meDeck.slice(0, 3), board: [], deck: meDeck.slice(3), grave: [] },
        foe: { hp: 30, hand: foeDeck.slice(0, 3), board: [], deck: foeDeck.slice(3), grave: [] },
        turn: 1,
        current: 'me'
      };
    },

    _renderBoard() {
      const root = el('#gameRoot'); if (!root || !this.state) return;
      const s = this.state;
      root.innerHTML = `
        <div style="display:grid;gap:10px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>🧿 ${this.foe.name} — HP ${s.foe.hp} — Deck ${s.foe.deck.length} — Mão ${s.foe.hand.length}</div>
            <div>Turno ${s.turn} • Atual: ${s.current}</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr;gap:8px">
            <div>Tabuleiro Inimigo: ${s.foe.board.map(c=>c.name).join(', ')||'—'}</div>
            <div>Seu Tabuleiro: ${s.me.board.map(c=>c.name).join(', ')||'—'}</div>
            <div>Sua Mão: ${s.me.hand.map(c=>c.name).join(', ')||'—'}</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn" id="btnDrawMe">Comprar carta</button>
            <button class="btn" id="btnDrawFoe">Inimigo compra</button>
          </div>
        </div>
      `;
      el('#btnDrawMe')?.addEventListener('click', () => this.emit('draw', { who: 'me' }));
      el('#btnDrawFoe')?.addEventListener('click', () => this.emit('draw', { who: 'foe' }));
    }
  };

  // Integração com NET
  window.addEventListener('net:ready', (ev) => GAME.startOnline(ev.detail));
  window.addEventListener('net:event', (ev) => {
    const { type, payload } = ev.detail || {};
    GAME._applyLocal(type, payload);
  });
  window.addEventListener('net:state-request', () => {
    if (window.NET?.online && GAME.state) window.NET.sendFullState(GAME.state);
  });
  window.addEventListener('net:state-full', (ev) => {
    GAME.receiveFullState(ev.detail?.state);
  });

  window.GAME = GAME;
  document.addEventListener('DOMContentLoaded', () => GAME.mount());
})();
