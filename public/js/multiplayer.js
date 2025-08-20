document.addEventListener('DOMContentLoaded', () => {
  const startScreen = document.getElementById('start');
  const mpMenu = document.getElementById('multiplayerMenu');
  const openBtn = document.getElementById('openMultiplayer');
  const backBtn = document.getElementById('mpBack');
  const hostBtn = document.getElementById('hostBtn');
  const findBtn = document.getElementById('findBtn');
  const roomList = document.getElementById('roomList');
  const joinBtn = document.getElementById('joinBtn');
  const joinCodeInput = document.getElementById('joinCode');
  const statusEl = document.getElementById('mpStatus');

  window.isMultiplayer = false;
  window.mpState = null;

  function showDeckSelect() {
    mpMenu.style.display = 'none';
    startScreen.style.display = 'block';
    const mpOpen = document.getElementById('openMultiplayer');
    if (mpOpen) mpOpen.style.display = 'none';
    const btn = document.getElementById('startGame');
    if (!btn) return;
    btn.textContent = 'Confirmar deck';
    btn.disabled = false;
    window.isMultiplayer = true;
    window.mpState = null;
    window.opponentConfirmed = false;
  }

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      startScreen.style.display = 'none';
      mpMenu.style.display = 'block';
      if (roomList) roomList.style.display = 'none';
      if (openBtn) openBtn.style.display = '';
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      mpMenu.style.display = 'none';
      startScreen.style.display = 'block';
      statusEl.textContent = '';
      window.isMultiplayer = false;
      window.mpState = null;
      window.opponentConfirmed = false;
      const mpOpen = document.getElementById('openMultiplayer');
      if (mpOpen) mpOpen.style.display = '';
      if (roomList) roomList.style.display = 'none';
    });
  }

  if (hostBtn) {
    hostBtn.addEventListener('click', () => {
      if (window.NET) {
        NET.host();
      }
      statusEl.textContent = 'Criando sala...';
    });
  }

  if (joinBtn) {
    joinBtn.addEventListener('click', () => {
      const code = joinCodeInput.value.trim();
      if (code) {
        if (window.NET) {
          NET.join(code);
        }
        statusEl.textContent = 'Conectando...';
      }
    });
  }

  if (findBtn) {
    findBtn.addEventListener('click', () => {
      if (roomList) {
        roomList.style.display = 'block';
        roomList.textContent = 'Carregando...';
      }
      if (window.NET) {
        NET.listRooms();
      }
    });
  }

  if (window.NET) {
    NET.onHosted((code) => {
      statusEl.textContent = `Sala criada. Código: ${code}`;
    });

    NET.onJoined((code) => {
      statusEl.textContent = `Entrou na sala ${code}`;
      showDeckSelect();
    });

    NET.onGuestJoined(() => {
      statusEl.textContent = 'Oponente conectado!';
      showDeckSelect();
    });

    NET.onJoinError((msg) => {
      statusEl.textContent = msg;
    });

    NET.onOpponentLeft(() => {
      statusEl.textContent = 'Oponente saiu.';
    });

    NET.onConnectionError(() => {
      statusEl.textContent = 'Falha na conexão.';
    });

    NET.onRooms((rooms) => {
      if (!roomList) return;
      if (!rooms.length) {
        roomList.textContent = 'Nenhuma sala disponível';
        return;
      }
      roomList.innerHTML = '';
      rooms.forEach((r) => {
        const div = document.createElement('div');
        div.className = 'room';
        div.innerHTML = `<span>${r.code}</span><span>${r.players >= 2 ? 'Cheia' : r.players + '/2'}</span>`;
        if (r.players < 2) {
          const b = document.createElement('button');
          b.className = 'btn';
          b.textContent = 'Entrar';
          b.addEventListener('click', () => {
            NET.join(r.code);
            statusEl.textContent = 'Conectando...';
          });
          div.appendChild(b);
        }
        roomList.appendChild(div);
      });
    });
  }
});