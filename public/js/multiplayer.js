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
  const nameInput = document.getElementById('playerName');

  window.isMultiplayer = false;
  window.mpState = null;
  let playerNamed=false;
  const setHidden = (el, hidden) => {
    if(!el) return;
    el.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  };
  function ensureName(showError=true){
    if(playerNamed) return true;
    if(!nameInput) return false;
    const n=nameInput.value.trim();
    if(!n){
      if(showError) statusEl.textContent='Nome obrigatório.';
      return false;
    }
    if(!/^[A-Za-z0-9 _-]{1,16}$/.test(n)){
      if(showError) statusEl.textContent='Nome inválido. Use até 16 caracteres alfanuméricos.';
      return false;
    }
    window.playerName=n;
    playerNamed=true;
    window.NET&&NET.setName(n);
    return true;
  }

  function showDeckSelect() {
    mpMenu.style.display = 'none';
    setHidden(mpMenu, true);
    startScreen.style.display = 'grid';
    const mpOpen = document.getElementById('openMultiplayer');
    if (mpOpen) mpOpen.style.display = 'none';
    const btn = document.getElementById('startGame');
    if (!btn) return;
    btn.textContent = 'Confirmar deck';
    btn.disabled = false;
    window.isMultiplayer = true;
    window.mpState = null;
    window.opponentConfirmed = false;
    const customBtn = document.querySelector('.deckbtn[data-deck="custom"]');
    if (customBtn) customBtn.style.display = 'none';
  }

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      ensureName(false);
      if (startScreen) startScreen.style.display = 'none';
      if (mpMenu){
        mpMenu.style.display = 'grid';
        setHidden(mpMenu, false);
      }
      if (roomList) roomList.style.display = 'none';
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      mpMenu.style.display = 'none';
      setHidden(mpMenu, true);
      startScreen.style.display = 'grid';
      statusEl.textContent = '';
      window.isMultiplayer = false;
      window.mpState = null;
      window.opponentConfirmed = false;
      const mpOpen = document.getElementById('openMultiplayer');
      if (mpOpen) mpOpen.style.display = '';
      if (roomList) roomList.style.display = 'none';
      const customBtn = document.querySelector('.deckbtn[data-deck="custom"]');
      if (customBtn) customBtn.style.display = '';
      const startBtn = document.getElementById('startGame');
      if (startBtn){startBtn.textContent='Jogar';startBtn.disabled=true;}
    });
  }

  if (hostBtn) {
    hostBtn.addEventListener('click', () => {
      if (!ensureName()) return;
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
        if (!ensureName()) return;
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

    NET.onNameError((msg) => {
      playerNamed = false;
      statusEl.textContent = msg;
    });

    NET.onOpponentLeft(() => {
      clearInterval(reconTimer);
      statusEl.textContent = 'Oponente saiu.';
      if (window.hideReconnect) window.hideReconnect();
    });

    NET.onConnectionError(() => {
      statusEl.textContent = 'Falha na conexão.';
    });

    let reconTimer = null;
    NET.onOpponentDisconnected(() => {
      let t = 15;
      statusEl.textContent = `Oponente desconectado. Aguardando reconexão: ${t}s`;
      if (window.showReconnect) window.showReconnect('Oponente desconectou. Aguardando reconexão...');
      clearInterval(reconTimer);
      reconTimer = setInterval(() => {
        t -= 1;
        if (t > 0) {
          statusEl.textContent = `Oponente desconectado. Aguardando reconexão: ${t}s`;
        } else {
          clearInterval(reconTimer);
        }
      }, 1000);
    });

    NET.onOpponentReconnected(() => {
      clearInterval(reconTimer);
      statusEl.textContent = 'Oponente reconectado.';
      if (window.hideReconnect) window.hideReconnect();
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
            if(!ensureName()) return;
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
