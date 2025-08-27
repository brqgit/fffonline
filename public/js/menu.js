document.addEventListener('DOMContentLoaded', () => {
  const titleMenu = document.getElementById('titleMenu');
  const deckScreen = document.getElementById('start');
  const multiMenu = document.getElementById('multiplayerMenu');
  const optionsMenu = document.getElementById('optionsMenu');
  const storyBtn = document.getElementById('menuStory');
  const soloBtn = document.getElementById('menuSolo');
  const multiBtn = document.getElementById('menuMulti');
  const optBtn = document.getElementById('menuOptions');
  const testBtn = document.getElementById('menuTestes');
  const backToMenu = document.getElementById('backToMenu');
  const closeOptions = document.getElementById('closeOptions');
  const testModal = document.getElementById('testModal');
  const closeTest = document.getElementById('closeTest');
  const testShopBtn = document.getElementById('testShopBtn');
  const testTotemBtn = document.getElementById('testTotemBtn');
  const diffLabel = document.querySelector('label[for="difficulty"]');
  const diffSelect = document.getElementById('difficulty');

  if (storyBtn) storyBtn.addEventListener('click', () => {
    if (titleMenu) titleMenu.style.display = 'none';
    if (deckScreen) deckScreen.style.display = 'grid';
    if (diffLabel) diffLabel.style.display = 'none';
    if (diffSelect) diffSelect.style.display = 'none';
    const startBtn = document.getElementById('startGame');
    if (startBtn){startBtn.textContent='Iniciar História';startBtn.disabled=true;}
    window.currentGameMode = 'story';
  });

  if (soloBtn) soloBtn.addEventListener('click', () => {
    if (titleMenu) titleMenu.style.display = 'none';
    if (deckScreen) deckScreen.style.display = 'grid';
    if (diffLabel) diffLabel.style.display = '';
    if (diffSelect) diffSelect.style.display = '';
    const startBtn = document.getElementById('startGame');
    if (startBtn){startBtn.textContent='Jogar';startBtn.disabled=true;}
    window.currentGameMode = 'solo';
  });

  if (multiBtn) multiBtn.addEventListener('click', () => {
    if (titleMenu) titleMenu.style.display = 'none';
    if (multiMenu) multiMenu.style.display = 'grid';
  });

  if (optBtn) optBtn.addEventListener('click', () => {
  if (optionsMenu) optionsMenu.classList.add('show');
  });

  if (testBtn) testBtn.addEventListener('click', () => {
  if (testModal) testModal.classList.add('show');
  });

  if (backToMenu) backToMenu.addEventListener('click', () => {
    if (deckScreen) deckScreen.style.display = 'none';
    if (titleMenu) titleMenu.style.display = 'grid';
    const startBtn = document.getElementById('startGame');
    if (startBtn){startBtn.textContent='Jogar';startBtn.disabled=true;}
    window.currentGameMode = null;
  });

  if (closeOptions) closeOptions.addEventListener('click', () => {
  if (optionsMenu) optionsMenu.classList.remove('show');
  });

  if (closeTest) closeTest.addEventListener('click', () => {
  if (testModal) testModal.classList.remove('show');
  });

  if (testShopBtn) testShopBtn.addEventListener('click', () => {
    if (window.openShop) openShop({ faction: 'random', gold: 30, unlimited: true });
  });

  if (testTotemBtn) testTotemBtn.addEventListener('click', () => {
    if (testModal) testModal.style.display = 'none';
    if (window.startTotemTest) startTotemTest();
  });

  // Reset seleção de deck sempre que abrir a tela de decks
  function clearDeckSelection(){
    try{ if(window.G) window.G.playerDeckChoice = null; }catch(_){ }
    const startBtn = document.getElementById('startGame');
    if(startBtn) startBtn.disabled = true;
    document.querySelectorAll('.deckbtn').forEach(b=>b.style.outline='none');
  }
  if (storyBtn) storyBtn.addEventListener('click', ()=>setTimeout(clearDeckSelection,0));
  if (soloBtn) soloBtn.addEventListener('click', ()=>setTimeout(clearDeckSelection,0));
  if (backToMenu) backToMenu.addEventListener('click', ()=>setTimeout(clearDeckSelection,0));

  const musicVol = document.getElementById('musicVol');
  const sfxVol = document.getElementById('sfxVol');
  if (musicVol) musicVol.addEventListener('input', e => {
    if (window.setMusicVolume) window.setMusicVolume(parseFloat(e.target.value));
  });
  if (sfxVol) sfxVol.addEventListener('input', e => {
    if (window.setSfxVolume) window.setSfxVolume(parseFloat(e.target.value));
  });
});
