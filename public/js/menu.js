(function (window, document) {
  if (window.__fffMenuInitialized) {
    return;
  }
  window.__fffMenuInitialized = true;

  function initMenuScreens() {
    var titleMenu = document.getElementById('titleMenu');
    var deckScreen = document.getElementById('start');
    var multiMenu = document.getElementById('multiplayerMenu');
    var optionsMenu = document.getElementById('optionsMenu');
    var playBtn = document.getElementById('menuPlay');
    var playPopup = document.getElementById('playPopup');
    var playStoryBtn = document.getElementById('menuPlayStory');
    var playQuickBtn = document.getElementById('menuPlayQuick');
    var playMultiBtn = document.getElementById('menuPlayMulti');
    var optBtn = document.getElementById('menuOptions');
    var testBtn = document.getElementById('menuTestes');
    var backToMenu = document.getElementById('backToMenu');
    var closeOptions = document.getElementById('closeOptions');
    var testModal = document.getElementById('testModal');
    var closeTest = document.getElementById('closeTest');
    var testShopBtn = document.getElementById('testShopBtn');
    var testTotemBtn = document.getElementById('testTotemBtn');
    var toggleInstantWin = document.getElementById('toggleInstantWin');
    var toggleSilentArt = document.getElementById('toggleSilentArt');
    var diffLabel = document.querySelector('label[for="difficulty"]');
    var diffSelect = document.getElementById('difficulty');
    var encyBtn = document.getElementById('openEncy');
    var toggleNodes = document.querySelectorAll('[data-action="toggle-music"]');
    var muteToggles = [];
    for (var i = 0; i < toggleNodes.length; i += 1) {
      muteToggles.push(toggleNodes[i]);
    }

    function setElementHidden(el, hidden) {
      if (!el) return;
      try {
        if (hidden) {
          var ae = document.activeElement;
          if (ae && el.contains(ae)) {
            try { ae.blur(); } catch (_) { }
          }
          el.setAttribute('inert', '');
        } else {
          el.removeAttribute('inert');
        }
      } catch (_) { }
      el.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    }

    function setDeckScreenDifficultyVisible(visible) {
      if (diffLabel) diffLabel.style.display = visible ? '' : 'none';
      if (diffSelect) diffSelect.style.display = visible ? '' : 'none';
    }

    function updateStartButtonForMode(mode) {
      var startBtn = document.getElementById('startGame');
      if (!startBtn) return;
      if (mode === 'story') {
        startBtn.textContent = 'Iniciar História';
        startBtn.disabled = true;
      } else {
        startBtn.textContent = 'Jogar';
        startBtn.disabled = true;
      }
    }

    var playPopupOpen = false;

    function matchesSelector(element, selector) {
      if (!element) return false;
      var proto = Element.prototype;
      var matcher = proto.matches || proto.msMatchesSelector || proto.webkitMatchesSelector;
      return matcher ? matcher.call(element, selector) : false;
    }

    function closest(element, selector) {
      if (!element) return null;
      if (typeof element.closest === 'function') return element.closest(selector);
      var current = element;
      while (current) {
        if (matchesSelector(current, selector)) return current;
        current = current.parentElement;
      }
      return null;
    }

    function positionPlayPopup() {
      if (!playPopupOpen || !playPopup || !playBtn) return;
      var layout = closest(playBtn, '.start-layout');
      var panel = closest(playBtn, '.panel');
      if (!layout || !panel) return;
      var mediaQuery = window.matchMedia ? window.matchMedia('(max-width: 760px)') : null;
      var stacked = mediaQuery ? mediaQuery.matches : false;
      if (stacked) {
        playPopup.style.left = '';
        playPopup.style.top = '';
        playPopup.style.transform = '';
        return;
      }
      var panelRect = panel.getBoundingClientRect();
      var layoutRect = layout.getBoundingClientRect();
      var gap = 24;
      playPopup.style.left = (panelRect.right - layoutRect.left + gap) + 'px';
      playPopup.style.top = (panelRect.top - layoutRect.top + panelRect.height / 2) + 'px';
      playPopup.style.transform = 'translateY(-50%)';
    }

    function openPlayPopup() {
      if (!playPopup || playPopupOpen) return;
      playPopup.hidden = false;
      playPopup.removeAttribute('aria-hidden');
      if (playPopup.classList) playPopup.classList.add('show');
      if (playBtn) playBtn.setAttribute('aria-expanded', 'true');
      playPopupOpen = true;
      positionPlayPopup();
    }

    function closePlayPopup() {
      if (!playPopup) return;
      if (playPopup.classList) playPopup.classList.remove('show');
      playPopup.hidden = true;
      playPopup.setAttribute('aria-hidden', 'true');
      if (playBtn) playBtn.setAttribute('aria-expanded', 'false');
      playPopupOpen = false;
      playPopup.style.left = '';
      playPopup.style.top = '';
      playPopup.style.transform = '';
    }

    function handlePlayChoice(mode) {
      if (!mode) return;
      closePlayPopup();
      if (mode === 'multiplayer') {
        if (titleMenu) titleMenu.style.display = 'none';
        if (deckScreen) deckScreen.style.display = 'none';
        if (multiMenu) {
          multiMenu.style.display = 'grid';
          setElementHidden(multiMenu, false);
        }
        window.currentGameMode = 'multi';
        return;
      }
      if (titleMenu) titleMenu.style.display = 'none';
      if (multiMenu) {
        multiMenu.style.display = 'none';
        setElementHidden(multiMenu, true);
      }
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
    }

    if (playBtn) {
      playBtn.addEventListener('click', function () {
        if (playPopupOpen) {
          closePlayPopup();
        } else if (playPopup) {
          openPlayPopup();
        } else {
          handlePlayChoice('solo');
        }
      });
    }

    if (playStoryBtn) {
      playStoryBtn.addEventListener('click', function () {
        handlePlayChoice('story');
      });
    }
    if (playQuickBtn) {
      playQuickBtn.addEventListener('click', function () {
        handlePlayChoice('solo');
      });
    }
    if (playMultiBtn) {
      playMultiBtn.addEventListener('click', function () {
        handlePlayChoice('multiplayer');
      });
    }

    window.addEventListener('resize', function () {
      if (playPopupOpen) positionPlayPopup();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && playPopupOpen) {
        closePlayPopup();
      }
    });

    document.addEventListener('click', function (event) {
      if (!playPopupOpen) return;
      if (playBtn && (event.target === playBtn || playBtn.contains(event.target))) return;
      if (playPopup && (event.target === playPopup || playPopup.contains(event.target))) return;
      closePlayPopup();
    });

    if (encyBtn) {
      encyBtn.addEventListener('click', function () {
        closePlayPopup();
        try {
          if (window.renderEncy) {
            window.renderEncy('all', false);
          }
        } catch (_err) {
          // ignore
        }
      });
    }

    if (optBtn) {
      optBtn.addEventListener('click', function () {
        closePlayPopup();
        if (optionsMenu && optionsMenu.classList) {
          optionsMenu.classList.add('show');
          setElementHidden(optionsMenu, false);
        }
      });
    }

    if (testBtn) {
      testBtn.addEventListener('click', function () {
        closePlayPopup();
        if (testModal && testModal.classList) {
          testModal.classList.add('show');
          setElementHidden(testModal, false);
          // Initialize toggles with current values
          if (toggleInstantWin) toggleInstantWin.checked = !!window.storyTestMode;
          if (toggleSilentArt) toggleSilentArt.checked = (window.silentArtPlaceholders !== false);
        }
      });
    }

    if (backToMenu) {
      backToMenu.addEventListener('click', function () {
        if (deckScreen) deckScreen.style.display = 'none';
        if (multiMenu) {
          multiMenu.style.display = 'none';
          setElementHidden(multiMenu, true);
        }
        if (titleMenu) titleMenu.style.display = 'flex';
        var startBtn = document.getElementById('startGame');
        if (startBtn) {
          startBtn.textContent = 'Jogar';
          startBtn.disabled = true;
        }
        window.currentGameMode = null;
        closePlayPopup();
      });
    }

    if (closeOptions) {
      closeOptions.addEventListener('click', function () {
        if (optionsMenu && optionsMenu.classList) {
          optionsMenu.classList.remove('show');
          setElementHidden(optionsMenu, true);
        }
      });
    }

    if (closeTest) {
      closeTest.addEventListener('click', function () {
        if (testModal && testModal.classList) {
          testModal.classList.remove('show');
          setElementHidden(testModal, true);
        }
      });
    }

    if (testShopBtn) {
      testShopBtn.addEventListener('click', function () {
        if (testModal) {
          if (testModal.classList) testModal.classList.remove('show');
          testModal.style.display = 'none';
          setElementHidden(testModal, true);
        }
        if (window.openShop) window.openShop({ faction: 'random', gold: 30, unlimited: true });
      });
    }

    if (toggleInstantWin) {
      toggleInstantWin.addEventListener('change', function(){
        window.storyTestMode = !!toggleInstantWin.checked;
        // Reflect immediately if already in a battle
        try{ if(window.els && els.instantWinBtn){ els.instantWinBtn.style.display = (window.storyTestMode && (window.G && G.mode==='story')) ? 'inline-block' : 'none'; } }catch(_){ }
      });
    }

    if (toggleSilentArt) {
      toggleSilentArt.addEventListener('change', function(){
        window.silentArtPlaceholders = !!toggleSilentArt.checked;
      });
      // default to true in tests to avoid 404 noise
      if (typeof window.silentArtPlaceholders === 'undefined') window.silentArtPlaceholders = true;
    }

    var testStoryWinBtn = document.getElementById('testStoryWinBtn');
    if (testStoryWinBtn) {
      testStoryWinBtn.addEventListener('click', function () {
        if (testModal) {
          if (testModal.classList) testModal.classList.remove('show');
          testModal.style.display = 'none';
          setElementHidden(testModal, true);
        }
        // Start story mode properly like the Play button does
        window.currentGameMode = 'story';
        window.storyTestMode = true; // Flag to show instant win button
        handlePlayChoice('story');
      });
    }

    if (testTotemBtn) {
      testTotemBtn.addEventListener('click', function () {
        if (testModal) {
          if (testModal.classList) testModal.classList.remove('show');
          testModal.style.display = 'none';
          setElementHidden(testModal, true);
        }
        if (window.startTotemTest) window.startTotemTest();
      });
    }

    var musicVol = document.getElementById('musicVol');
    var sfxVol = document.getElementById('sfxVol');
    var disableAnims = document.getElementById('disableAnims');
    var storedMusicVolume = musicVol ? parseFloat(musicVol.value) || 1 : 1;
    var menuMuted = musicVol ? parseFloat(musicVol.value) <= 0 : false;

    function updateMuteButtons() {
      for (var i = 0; i < muteToggles.length; i += 1) {
        var btn = muteToggles[i];
        if (!btn) continue;
        btn.textContent = menuMuted ? '\ud83d\udd07 Música' : '\ud83d\udd0a Música';
        btn.setAttribute('aria-pressed', menuMuted ? 'true' : 'false');
      }
    }

    var isFiniteNumber;
    if (typeof Number !== 'undefined' && typeof Number.isFinite === 'function') {
      isFiniteNumber = Number.isFinite;
    } else {
      isFiniteNumber = function (value) { return isFinite(value); };
    }

    function toggleMenuMusic() {
      if (typeof window.setMusicVolume !== 'function') return;
      var currentVolume = musicVol ? parseFloat(musicVol.value) : storedMusicVolume;
      if (!menuMuted) {
        if (isFiniteNumber(currentVolume) && currentVolume > 0) {
          storedMusicVolume = currentVolume;
        }
        window.setMusicVolume(0);
        if (musicVol) musicVol.value = '0';
        menuMuted = true;
      } else {
        var restore = (isFiniteNumber(storedMusicVolume) && storedMusicVolume > 0) ? storedMusicVolume : 1;
        window.setMusicVolume(restore);
        if (musicVol) musicVol.value = String(restore);
        menuMuted = false;
      }
      updateMuteButtons();
    }

    for (var j = 0; j < muteToggles.length; j += 1) {
      var toggleBtn = muteToggles[j];
      if (!toggleBtn) continue;
      toggleBtn.addEventListener('click', toggleMenuMusic);
    }

    updateMuteButtons();

    if (musicVol) {
      musicVol.addEventListener('input', function (event) {
        var value = parseFloat(event.target.value);
        if (window.setMusicVolume) window.setMusicVolume(value);
        menuMuted = value <= 0;
        if (!menuMuted) storedMusicVolume = value;
        updateMuteButtons();
      });
    }

    if (sfxVol) {
      sfxVol.addEventListener('input', function (event) {
        if (window.setSfxVolume) window.setSfxVolume(parseFloat(event.target.value));
      });
    }

    try {
      var stored = localStorage.getItem('fff_disable_anims');
      if (stored !== null) {
        window.animationsDisabled = (stored === '1');
        if (disableAnims) disableAnims.checked = window.animationsDisabled;
      }
    } catch (e) {
      // ignore storage errors
    }

    if (disableAnims) {
      disableAnims.addEventListener('change', function (event) {
        var value = !!event.target.checked;
        window.animationsDisabled = value;
        try {
          localStorage.setItem('fff_disable_anims', value ? '1' : '0');
        } catch (err) {
          // ignore storage errors
        }
      });
    }

    var logos = document.querySelectorAll('.holo-logo');
    for (var k = 0; k < logos.length; k += 1) {
      (function (logo) {
        var clickCount = 0;
        var resetTimer = null;
        var brand = closest(logo, '.brand');
        var fanTimeout = null;

        logo.addEventListener('click', function () {
          clickCount += 1;
          if (resetTimer) clearTimeout(resetTimer);
          resetTimer = setTimeout(function () {
            clickCount = 0;
          }, 600);
          if (clickCount >= 3) {
            clickCount = 0;
            if (resetTimer) {
              clearTimeout(resetTimer);
              resetTimer = null;
            }
            if (!logo.classList.contains('logo-spin-secret')) {
              logo.classList.add('logo-spin-secret');
            }
            if (brand) {
              if (fanTimeout) {
                clearTimeout(fanTimeout);
                fanTimeout = null;
              }
              if (brand.classList.contains('logo-secret-active')) {
                brand.classList.remove('logo-secret-active');
                // force reflow so animation can restart
                void brand.offsetWidth;
              }
              brand.classList.add('logo-secret-active');
              fanTimeout = setTimeout(function () {
                brand.classList.add('logo-secret-fadeout');
                setTimeout(function(){
                  brand.classList.remove('logo-secret-active');
                  brand.classList.remove('logo-secret-fadeout');
                }, 800);
              }, 3000);
            }
          }
        });

        logo.addEventListener('animationend', function (event) {
          if (event.animationName === 'logo-secret-spin') {
            logo.classList.remove('logo-spin-secret');
          }
        });
      })(logos[k]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMenuScreens);
  } else {
    initMenuScreens();
  }
})(window, document);
