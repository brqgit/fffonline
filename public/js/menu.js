document.addEventListener('DOMContentLoaded', () => {
  const backgrounds=['img/ui/backgrounds/fff-bg-01.webp','img/ui/backgrounds/fff-bg-02.webp'];
  const pick=backgrounds[Math.floor(Math.random()*backgrounds.length)];
  document.documentElement.style.setProperty('--start-bg',`url('${pick}') center/cover no-repeat`);
  const titleMenu = document.getElementById('titleMenu');
  const deckScreen = document.getElementById('start');
  const multiMenu = document.getElementById('multiplayerMenu');
  const optionsMenu = document.getElementById('optionsMenu');
  const soloBtn = document.getElementById('menuSolo');
  const multiBtn = document.getElementById('menuMulti');
  const optBtn = document.getElementById('menuOptions');
  const backToMenu = document.getElementById('backToMenu');
  const closeOptions = document.getElementById('closeOptions');
  const diffLabel = document.querySelector('label[for="difficulty"]');
  const diffSelect = document.getElementById('difficulty');

  if (soloBtn) soloBtn.addEventListener('click', () => {
    if (titleMenu) titleMenu.style.display = 'none';
    if (deckScreen) deckScreen.style.display = 'grid';
    if (diffLabel) diffLabel.style.display = '';
    if (diffSelect) diffSelect.style.display = '';
    const startBtn = document.getElementById('startGame');
    if (startBtn){startBtn.textContent='Jogar';startBtn.disabled=true;}
  });

  if (multiBtn) multiBtn.addEventListener('click', () => {
    if (titleMenu) titleMenu.style.display = 'none';
    if (multiMenu) multiMenu.style.display = 'grid';
  });

  if (optBtn) optBtn.addEventListener('click', () => {
    if (optionsMenu) optionsMenu.style.display = 'grid';
  });

  if (backToMenu) backToMenu.addEventListener('click', () => {
    if (deckScreen) deckScreen.style.display = 'none';
    if (titleMenu) titleMenu.style.display = 'grid';
    const startBtn = document.getElementById('startGame');
    if (startBtn){startBtn.textContent='Jogar';startBtn.disabled=true;}
  });

  if (closeOptions) closeOptions.addEventListener('click', () => {
    if (optionsMenu) optionsMenu.style.display = 'none';
  });

  const musicVol = document.getElementById('musicVol');
  const sfxVol = document.getElementById('sfxVol');
  if (musicVol) musicVol.addEventListener('input', e => {
    if (window.setMusicVolume) window.setMusicVolume(parseFloat(e.target.value));
  });
  if (sfxVol) sfxVol.addEventListener('input', e => {
    if (window.setSfxVolume) window.setSfxVolume(parseFloat(e.target.value));
  });
});
