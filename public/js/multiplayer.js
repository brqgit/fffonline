document.addEventListener('DOMContentLoaded', () => {
  const startScreen = document.getElementById('start');
  const mpMenu = document.getElementById('multiplayerMenu');
  const openBtn = document.getElementById('openMultiplayer');
  const backBtn = document.getElementById('mpBack');
  const hostBtn = document.getElementById('hostBtn');
  const joinBtn = document.getElementById('joinBtn');
  const joinCodeInput = document.getElementById('joinCode');
  const statusEl = document.getElementById('mpStatus');

  window.isMultiplayer = false;
  window.mpState = null;

  function showDeckSelect(){
    mpMenu.style.display = 'none';
    startScreen.style.display = 'block';
    const btn = document.getElementById('startGame');
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
      if(code){
        if (window.NET) {
          NET.join(code);
        }
        statusEl.textContent = 'Conectando...';
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
  }
});