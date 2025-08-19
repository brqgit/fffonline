(function(){
  const startScreen = document.getElementById('start');
  const mpMenu = document.getElementById('multiplayerMenu');
  const openBtn = document.getElementById('openMultiplayer');
  const backBtn = document.getElementById('mpBack');
  const hostBtn = document.getElementById('hostBtn');
  const joinBtn = document.getElementById('joinBtn');
  const joinCodeInput = document.getElementById('joinCode');
  const statusEl = document.getElementById('mpStatus');

  openBtn.addEventListener('click', () => {
    startScreen.style.display = 'none';
    mpMenu.style.display = 'block';
  });

  backBtn.addEventListener('click', () => {
    mpMenu.style.display = 'none';
    startScreen.style.display = 'block';
    statusEl.textContent = '';
  });

  hostBtn.addEventListener('click', () => {
    NET.host();
    statusEl.textContent = 'Criando sala...';
  });

  joinBtn.addEventListener('click', () => {
    const code = joinCodeInput.value.trim();
    if(code){
      NET.join(code);
      statusEl.textContent = 'Conectando...';
    }
  });

  NET.onHosted((code) => {
    statusEl.textContent = `Sala criada. Código: ${code}`;
  });

  NET.onJoined((code) => {
    statusEl.textContent = `Entrou na sala ${code}`;
  });

  NET.onGuestJoined(() => {
    statusEl.textContent = 'Oponente conectado!';
  });

  NET.onJoinError((msg) => {
    statusEl.textContent = msg;
  });

  NET.onOpponentLeft(() => {
    statusEl.textContent = 'Oponente saiu.';
  });
})();
