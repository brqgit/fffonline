// FFF Online - Socket.IO client (robusto)

/* FFF Online - Socket.IO client */
(function () {
  const $ = (id) => document.getElementById(id);

  const NET = {
    online: false,
    isHost: false,
    socket: null,
    room: null,
    name: null,
    seed: null,
    hostDeckChoice: null,
    guestDeckChoice: null,
    onEvent: null,

    // Conecta ao servidor Socket.IO.
    // Se a URL não começar com http/https/ws/wss, assume mesmo domínio.
    connect(url) {
      if (typeof io === "undefined") {
        this._setStatus("Offline: Socket.IO não encontrado");
        return;
      }
      try { this.socket?.disconnect(); } catch (_) {}
      let u = (url || "").trim();
      if (!/^https?:\/\//i.test(u) && !/^wss?:\/\//i.test(u)) u = ""; // ignora valores inválidos
      this.socket = io(u || undefined, {
        transports: ["websocket"],
        path: "/socket.io",
        autoConnect: true,
      });
      this._wireSocket();
      this._setStatus("Conectando...");
    },

    host(room, name, deck) {
      const doEmit = () => {
        this.isHost = true; this.room = room; this.name = name;
        this.socket.emit("host", { room, name, deck });
      };
      if (!this.socket || !this.socket.connected) {
        this.connect($("mpWs")?.value);
        this.socket?.once("connect", doEmit);
      } else doEmit();
    },

    join(room, name, deck) {
      const doEmit = () => {
        this.isHost = false; this.room = room; this.name = name;
        this.socket.emit("join", { room, name, deck });
      };
      if (!this.socket || !this.socket.connected) {
        this.connect($("mpWs")?.value);
        this.socket?.once("connect", doEmit);
      } else doEmit();
    },

    leave() {
      try { this.socket?.disconnect(); } catch (_) {}
      finally { this.online = false; this._setStatus("Modo: Solo"); }
    },

    deckSelect(deck) {
      if (this.socket && this.room) {
        this.socket.emit("deck:select", { room: this.room, deck });
      }
    },

    send(type, payload) {
      if (!this.socket || !this.room) return;
      this.socket.emit("game:event", { room: this.room, type, payload });
    },

    requestState() {
      if (this.socket && this.room) this.socket.emit("state:request", { room: this.room });
    },
    sendFullState(state) {
      if (this.socket && this.room) this.socket.emit("state:full", { room: this.room, state });
    },

    _wireSocket() {
      const s = this.socket; if (!s) return;

      s.on("connect", () => this._setStatus("Conectado"));
      s.on("disconnect", () => { this.online = false; this._setStatus("Desconectado"); });
      s.on("connect_error", (err) => this._setStatus("Erro de conexão: " + (err?.message || err)));

      s.on("error:room", (e) => this._setStatus("Sala: " + (e?.message || "erro")));

      s.on("host:ack", ({ room }) => this._setStatus(`Hospedando sala ${room}`));
      s.on("join:ack", ({ room }) => this._setStatus(`Conectado à sala ${room}`));

      s.on("lobby:update", (st) => {
        this.hostDeckChoice = st.hostDeck || null;
        this.guestDeckChoice = st.guestDeck || null;
        const a = st.hasHost ? (st.hostName || "Host") : "—";
        const b = st.hasGuest ? (st.guestName || "Guest") : "—";
        this._setStatus(`Lobby • Host: ${a} • Guest: ${b}`);
      });

      s.on("match:ready", (st) => {
        this.online = true;
        this.seed = st.seed || null;
        this.hostDeckChoice = st.hostDeck || this.hostDeckChoice;
        this.guestDeckChoice = st.guestDeck || this.guestDeckChoice;
        this._setStatus("Partida pronta");
        window.dispatchEvent(new CustomEvent("net:ready", { detail: st }));
      });

      s.on("seed:set", ({ seed }) => {
        this.seed = seed;
        window.dispatchEvent(new CustomEvent("net:seed", { detail: { seed } }));
      });

      s.on("game:event", ({ type, payload }) => {
        if (typeof this.onEvent === "function") this.onEvent(type, payload);
        window.dispatchEvent(new CustomEvent("net:event", { detail: { type, payload } }));
      });

      s.on("state:request", () => window.dispatchEvent(new Event("net:state-request")));
      s.on("state:full", ({ state }) =>
        window.dispatchEvent(new CustomEvent("net:state-full", { detail: { state } }))
      );
    },

    _wireUi() {
      const hostBtn = $("mpHost");
      const joinBtn = $("mpJoin");
      const leaveBtn = $("mpLeave");
      const name = $("mpName");
      const room = $("mpRoom");

      hostBtn?.addEventListener("click", () => {
        const nm = (name?.value || "Host").trim();
        const rm = (room?.value || "duo").trim();
        this.host(rm, nm, null);
      });

      joinBtn?.addEventListener("click", () => {
        const nm = (name?.value || "Guest").trim();
        const rm = (room?.value || "duo").trim();
        this.join(rm, nm, null);
      });

      leaveBtn?.addEventListener("click", () => this.leave());
    },

    _setStatus(msg) { const el = $("mpStatus"); if (el) el.textContent = msg; }
  };

  window.NET = NET;
  document.addEventListener("DOMContentLoaded", () => NET._wireUi());
})();
