const initMenuScreens = () => {
  const titleMenu = document.getElementById('titleMenu');
  const deckScreen = document.getElementById('start');
  const multiMenu = document.getElementById('multiplayerMenu');
  const optionsMenu = document.getElementById('optionsMenu');
  const playBtn = document.getElementById('menuPlay');
  const playPopup = document.getElementById('playPopup');
  const playStoryBtn = document.getElementById('menuPlayStory');
  const playQuickBtn = document.getElementById('menuPlayQuick');
  const playMultiBtn = document.getElementById('menuPlayMulti');
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
  const muteToggles = Array.from(document.querySelectorAll('[data-action="toggle-music"]'));

  const setDeckScreenDifficultyVisible = visible => {
    if (diffLabel) diffLabel.style.display = visible ? '' : 'none';
    if (diffSelect) diffSelect.style.display = visible ? '' : 'none';
  };

  const updateStartButtonForMode = mode => {
    const startBtn = document.getElementById('startGame');
    if (!startBtn) return;
    if (mode === 'story') {
      startBtn.textContent = 'Iniciar História';
      startBtn.disabled = true;
    } else {
      startBtn.textContent = 'Jogar';
      startBtn.disabled = true;
    }
  };

  let playPopupOpen = false;

  const matchesSelector = (element, selector) => {
    if (!element) return false;
    const proto = Element.prototype;
    const matcher = proto.matches || proto.msMatchesSelector || proto.webkitMatchesSelector;
    return matcher ? matcher.call(element, selector) : false;
  };

  const closest = (element, selector) => {
    if (!element) return null;
    if (typeof element.closest === 'function') return element.closest(selector);
    let current = element;
    while (current) {
      if (matchesSelector(current, selector)) return current;
      current = current.parentElement;
    }
    return null;
  };

  const positionPlayPopup = () => {
    if (!playPopupOpen || !playPopup || !playBtn) return;
    const layout = closest(playBtn, '.start-layout');
    const panel = closest(playBtn, '.panel');
    if (!layout || !panel) return;
    const matchMedia = window.matchMedia ? window.matchMedia('(max-width: 760px)') : null;
    const stacked = matchMedia ? matchMedia.matches : false;
    if (stacked) {
      playPopup.style.left = '';
      playPopup.style.top = '';
      playPopup.style.transform = '';
      return;
    }
    const panelRect = panel.getBoundingClientRect();
    const layoutRect = layout.getBoundingClientRect();
    const gap = 24;
    playPopup.style.left = `${panelRect.right - layoutRect.left + gap}px`;
    playPopup.style.top = `${panelRect.top - layoutRect.top + panelRect.height / 2}px`;
    playPopup.style.transform = 'translateY(-50%)';
  };

  const openPlayPopup = () => {
    if (!playPopup || playPopupOpen) return;
    playPopup.hidden = false;
    playPopup.removeAttribute('aria-hidden');
    playPopup.classList.add('show');
    if (playBtn) playBtn.setAttribute('aria-expanded', 'true');
    playPopupOpen = true;
    positionPlayPopup();
  };

  const closePlayPopup = () => {
    if (!playPopup) return;
    playPopup.classList.remove('show');
    playPopup.hidden = true;
    playPopup.setAttribute('aria-hidden', 'true');
    if (playBtn) playBtn.setAttribute('aria-expanded', 'false');
    playPopupOpen = false;
    playPopup.style.left = '';
    playPopup.style.top = '';
    playPopup.style.transform = '';
  };

  const handlePlayChoice = mode => {
    if (!mode) return;
    closePlayPopup();
    if (mode === 'multiplayer') {
      if (titleMenu) titleMenu.style.display = 'none';
      if (deckScreen) deckScreen.style.display = 'none';
      if (multiMenu) multiMenu.style.display = 'grid';
      window.currentGameMode = 'multi';
      return;
    }
    if (titleMenu) titleMenu.style.display = 'none';
    if (multiMenu) multiMenu.style.display = 'none';
    if (deckScreen) deckScreen.style.display = 'flex';
    if (mode === 'story') {
      setDeckScreenDifficultyVisible(false);
      updateStartButtonForMode('story');
      window.currentGameMode = 'story';
    } else {
      setDeckScreenDifficultyVisible(true);
      updateStartButtonForMode('solo');
      window.currentGameMode = 'solo';
    }
  };

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (playPopupOpen) {
        closePlayPopup();
      } else {
        if (playPopup) {
          openPlayPopup();
        } else {
          handlePlayChoice('solo');
        }
      }
    });
  }

  if (playStoryBtn) playStoryBtn.addEventListener('click', () => handlePlayChoice('story'));
  if (playQuickBtn) playQuickBtn.addEventListener('click', () => handlePlayChoice('solo'));
  if (playMultiBtn) playMultiBtn.addEventListener('click', () => handlePlayChoice('multiplayer'));

  window.addEventListener('resize', () => {
    if (playPopupOpen) positionPlayPopup();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && playPopupOpen) {
      closePlayPopup();
    }
  });

  document.addEventListener('click', event => {
    if (!playPopupOpen) return;
    if (playBtn && (event.target === playBtn || playBtn.contains(event.target))) return;
    if (playPopup && (event.target === playPopup || playPopup.contains(event.target))) return;
    closePlayPopup();
  });

  if (optBtn) optBtn.addEventListener('click', () => {
    closePlayPopup();
    if (optionsMenu) optionsMenu.classList.add('show');
  });

  if (testBtn) testBtn.addEventListener('click', () => {
    closePlayPopup();
    if (testModal) testModal.classList.add('show');
  });

  if (backToMenu) backToMenu.addEventListener('click', () => {
    if (deckScreen) deckScreen.style.display = 'none';
    if (multiMenu) multiMenu.style.display = 'none';
    if (titleMenu) titleMenu.style.display = 'flex';
    const startBtn = document.getElementById('startGame');
    if (startBtn){startBtn.textContent='Jogar';startBtn.disabled=true;}
    window.currentGameMode = null;
    closePlayPopup();
  });

  if (closeOptions) closeOptions.addEventListener('click', () => {
    if (optionsMenu) optionsMenu.classList.remove('show');
  });

  if (closeTest) closeTest.addEventListener('click', () => {
    if (testModal) testModal.classList.remove('show');
  });

  if (testShopBtn) testShopBtn.addEventListener('click', () => {
    if (testModal){
      testModal.classList.remove('show');
      testModal.style.display = 'none';
    }
    if (window.openShop) window.openShop({ faction: 'random', gold: 30, unlimited: true });
  });

  if (testTotemBtn) testTotemBtn.addEventListener('click', () => {
    if (testModal){
      testModal.classList.remove('show');
      testModal.style.display = 'none';
    }
    if (window.startTotemTest) startTotemTest();
  });

  const musicVol = document.getElementById('musicVol');
  const sfxVol = document.getElementById('sfxVol');
  const disableAnims = document.getElementById('disableAnims');
  let storedMusicVolume = musicVol ? parseFloat(musicVol.value) || 1 : 1;
  let menuMuted = musicVol ? parseFloat(musicVol.value) <= 0 : false;

  const updateMuteButtons = () => {
    muteToggles.forEach(btn => {
      if (!btn) return;
      btn.textContent = menuMuted ? '🔇 Música' : '🔊 Música';
      btn.setAttribute('aria-pressed', menuMuted ? 'true' : 'false');
    });
  };

  const toggleMenuMusic = () => {
    if (typeof window.setMusicVolume !== 'function') return;
    const currentVolume = musicVol ? parseFloat(musicVol.value) : storedMusicVolume;
    if (!menuMuted) {
      storedMusicVolume = Number.isFinite(currentVolume) && currentVolume > 0 ? currentVolume : storedMusicVolume;
      window.setMusicVolume(0);
      if (musicVol) musicVol.value = '0';
      menuMuted = true;
    } else {
      const restore = Number.isFinite(storedMusicVolume) && storedMusicVolume > 0 ? storedMusicVolume : 1;
      window.setMusicVolume(restore);
      if (musicVol) musicVol.value = String(restore);
      menuMuted = false;
    }
    updateMuteButtons();
  };

  muteToggles.forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', toggleMenuMusic);
  });

  updateMuteButtons();

  if (musicVol) musicVol.addEventListener('input', e => {
    const value = parseFloat(e.target.value);
    if (window.setMusicVolume) window.setMusicVolume(value);
    menuMuted = value <= 0;
    if (!menuMuted) storedMusicVolume = value;
    updateMuteButtons();
  });

  if (sfxVol) sfxVol.addEventListener('input', e => {
    if (window.setSfxVolume) window.setSfxVolume(parseFloat(e.target.value));
  });

  // Animations toggle
  try{
    const stored = localStorage.getItem('fff_disable_anims');
    if(stored!==null){ window.animationsDisabled = (stored==='1'); if(disableAnims) disableAnims.checked = window.animationsDisabled; }
  }catch(_){ }
  if(disableAnims){
    disableAnims.addEventListener('change', e=>{
      const v = !!e.target.checked; window.animationsDisabled = v; try{ localStorage.setItem('fff_disable_anims', v?'1':'0'); }catch(_){ }
    });
  }

  // Secret logo spin easter egg
  const logos = document.querySelectorAll('.holo-logo');
  logos.forEach(logo => {
    let clickCount = 0;
    let resetTimer = null;
    logo.addEventListener('click', () => {
      clickCount += 1;
      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(() => { clickCount = 0; }, 600);
      if (clickCount >= 3) {
        clickCount = 0;
        resetTimer && clearTimeout(resetTimer);
        resetTimer = null;
        if (!logo.classList.contains('logo-spin-secret')) {
          logo.classList.add('logo-spin-secret');
        }
      }
    });
    logo.addEventListener('animationend', event => {
      if (event.animationName === 'logo-secret-spin') {
        logo.classList.remove('logo-spin-secret');
      }
    });
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMenuScreens);
} else {
  initMenuScreens();
}
