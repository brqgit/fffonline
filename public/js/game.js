// exibe pop‑up central e canto superior sobre o turno atual
function showTurnIndicator() {
  if (!els.turnInfo || !els.turnBanner) return;
  const txt = G.current === 'player' ? 'Seu turno' : 'Turno do oponente';
  els.turnInfo.textContent = txt;
  els.turnBanner.textContent = txt;
  els.turnBanner.classList.add('show');
  setTimeout(() => els.turnBanner.classList.remove('show'), 1200);
}

// botão Menu dentro da partida
if (els.openMenuBtn)
  els.openMenuBtn.addEventListener('click', () => {
    els.gameMenu.classList.add('show');
    els.restartBtn && (els.restartBtn.style.display = window.isMultiplayer ? 'none' : 'block');
  });

// vitória automática ao detectar desconexão do adversário
if (window.NET)
  NET.onOpponentLeft(() => {
    log('Oponente desconectou.');
    if (window.isMultiplayer && els.wrap.style.display === 'block') endGame(true);
  });

// barra de emojis e envio ao oponente
if (els.emojiBar) {
  els.emojiBar.querySelectorAll('.emoji-btn').forEach(b =>
    b.addEventListener('click', () => {
      const em = b.dataset.emoji;
      showEmoji('player', em);
      if (window.isMultiplayer && window.NET) NET.sendEmoji(em);
    })
  );
}