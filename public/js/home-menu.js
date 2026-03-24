(function (window, document) {
  if (window.__fffMenuInitialized) {
    return;
  }
  window.__fffMenuInitialized = true;
  // Story Mode 2 temporarily disabled until further notice.
  var STORY2_ENABLED = false;
  var SCREEN_TRANSITION_MS = 220;

  function initMenuScreens() {
    var isDevMode = !!window.__FFF_DEV_MODE__;
    var titleMenu = document.getElementById('titleMenu');
    var deckScreen = document.getElementById('start');
    var multiMenu = document.getElementById('multiplayerMenu');
    var optionsMenu = document.getElementById('optionsMenu');
    var playStoryBtn = document.getElementById('menuPlayStory');
    var playStory2Btn = document.getElementById('menuPlayStory2');
    var playQuickBtn = document.getElementById('menuPlayQuick');
    var playMultiBtn = document.getElementById('menuPlayMulti');
    var optBtn = document.getElementById('menuOptions');
    var testBtn = document.getElementById('menuTestes');
    var backToMenu = document.getElementById('backToMenu');
    var closeOptions = document.getElementById('closeOptions');
    var testModal = document.getElementById('testModal');
    var closeTest = document.getElementById('closeTest');
    var testShopBtn = document.getElementById('testShopBtn');
    var testMapBtn = document.getElementById('testMapBtn');
    var testEventBtn = document.getElementById('testEventBtn');
    var testRestBtn = document.getElementById('testRestBtn');
    var testRelicBtn = document.getElementById('testRelicBtn');
    var testRewardsBtn = document.getElementById('testRewardsBtn');
    var testRemovalBtn = document.getElementById('testRemovalBtn');
    var testUpgradeBtn = document.getElementById('testUpgradeBtn');
    var testRewardCardBtn = document.getElementById('testRewardCardBtn');
    var testEncyBtn = document.getElementById('testEncyBtn');
    var testVisualFxBtn = document.getElementById('testVisualFxBtn');
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

    if (testBtn) {
      if (isDevMode) {
        testBtn.hidden = false;
        testBtn.removeAttribute('aria-hidden');
        testBtn.removeAttribute('tabindex');
      } else {
        testBtn.hidden = true;
        testBtn.setAttribute('aria-hidden', 'true');
        testBtn.setAttribute('tabindex', '-1');
      }
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

    function closest(element, selector) {
      if (!element) return null;
      if (typeof element.closest === 'function') return element.closest(selector);
      var current = element;
      while (current) {
        if (current.matches && current.matches(selector)) return current;
        current = current.parentElement;
      }
      return null;
    }

    function showAppScreen(screen) {
      try {
        if (window.FFFEvents && typeof window.FFFEvents.emit === 'function') {
          window.FFFEvents.emit('screen:change', { screen: screen });
        }
      } catch (_) { }
      var screens = [
        { key: 'title', el: titleMenu, display: 'flex' },
        { key: 'deck', el: deckScreen, display: 'flex' },
        { key: 'multiplayer', el: multiMenu, display: 'grid' },
        { key: 'game', el: document.getElementById('gameWrap'), display: 'block' }
      ];
      var target = null;
      var current = null;
      for (var index = 0; index < screens.length; index += 1) {
        var item = screens[index];
        if (!item.el) continue;
        if (item.key === screen) target = item;
        if (item.el.style.display && item.el.style.display !== 'none') current = item;
      }
      if (!target || !target.el) return;
      if (!current || current.key === target.key) {
        for (var sameIndex = 0; sameIndex < screens.length; sameIndex += 1) {
          var sameEntry = screens[sameIndex];
          if (!sameEntry.el) continue;
          var sameVisible = sameEntry.key === screen;
          sameEntry.el.style.display = sameVisible ? sameEntry.display : 'none';
          sameEntry.el.classList.remove('app-screen-enter', 'app-screen-enter-active', 'app-screen-leave', 'app-screen-leave-active');
          setElementHidden(sameEntry.el, !sameVisible);
        }
        return;
      }
      current.el.classList.add('app-screen-transition', 'app-screen-leave');
      target.el.style.display = target.display;
      setElementHidden(target.el, false);
      target.el.classList.add('app-screen-transition', 'app-screen-enter');
      void target.el.offsetWidth;
      current.el.classList.add('app-screen-leave-active');
      target.el.classList.add('app-screen-enter-active');
      window.setTimeout(function () {
        current.el.style.display = 'none';
        setElementHidden(current.el, true);
        current.el.classList.remove('app-screen-transition', 'app-screen-leave', 'app-screen-leave-active');
        target.el.classList.remove('app-screen-transition', 'app-screen-enter', 'app-screen-enter-active');
      }, SCREEN_TRANSITION_MS);
    }
    window.showAppScreen = showAppScreen;

    function setDeckScreenDifficultyVisible(visible) {
      if (diffLabel) diffLabel.style.display = visible ? '' : 'none';
      if (diffSelect) diffSelect.style.display = visible ? '' : 'none';
    }
    function closeTestModal() {
      if (!testModal) return;
      if (testModal.classList) testModal.classList.remove('show');
      testModal.style.display = 'none';
      setElementHidden(testModal, true);
      try {
        if (window.FFFEvents && typeof window.FFFEvents.emit === 'function') {
          window.FFFEvents.emit('overlay:system:close', { id: 'testModal' });
        }
      } catch (_) {}
    }
    function runTest(kind) {
      if (!isDevMode) return;
      if (typeof window.cleanupTransientUi === 'function') {
        window.cleanupTransientUi();
      }
      if (typeof window.runGameTest === 'function') {
        window.runGameTest(kind);
      }
    }

    function updateStartButtonForMode(mode) {
      var startBtn = document.getElementById('startGame');
      if (!startBtn) return;
      if (mode === 'story') {
        startBtn.textContent = 'PLAY';
        startBtn.disabled = true;
      } else if (mode === 'story2') {
        if (!STORY2_ENABLED) {
          startBtn.textContent = 'Modo indisponível';
          startBtn.disabled = true;
          return;
        }
        startBtn.textContent = 'Iniciar História 2 (beta)';
        startBtn.disabled = true;
      } else {
        startBtn.textContent = 'PLAY';
        startBtn.disabled = true;
      }
    }


    function handlePlayChoice(mode) {
      if (!mode) return;
      if (mode === 'story2' && !STORY2_ENABLED) {
        return;
      }
      if (mode === 'multiplayer') {
        showAppScreen('multiplayer');
        window.currentGameMode = 'multi';
        return;
      }
      var openDeckScreen = function () {
        showAppScreen('deck');
        if (mode === 'story') {
          setDeckScreenDifficultyVisible(false);
          updateStartButtonForMode('story');
          window.currentGameMode = 'story';
        } else if (mode === 'story2') {
          setDeckScreenDifficultyVisible(false);
          updateStartButtonForMode('story2');
          window.currentGameMode = 'story2';
        } else {
          setDeckScreenDifficultyVisible(true);
          updateStartButtonForMode('solo');
          window.currentGameMode = 'solo';
        }
      };
      if (typeof window.preloadDeckScreenAssets === 'function') {
        window.preloadDeckScreenAssets().catch(function () { }).finally(openDeckScreen);
      } else if (typeof window.preloadDeckCarouselAssets === 'function') {
        window.preloadDeckCarouselAssets().catch(function () { }).finally(openDeckScreen);
      } else {
        openDeckScreen();
      }
    }

    if (playStoryBtn) {
      playStoryBtn.addEventListener('click', function () {
        handlePlayChoice('story');
      });
    }
    if (playStory2Btn && !STORY2_ENABLED) {
      playStory2Btn.style.display = 'none';
      playStory2Btn.setAttribute('aria-hidden', 'true');
      playStory2Btn.setAttribute('tabindex', '-1');
    }
    if (STORY2_ENABLED && playStory2Btn) {
      playStory2Btn.addEventListener('click', function () {
        handlePlayChoice('story2');
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

    if (encyBtn) {
      encyBtn.addEventListener('click', function () {
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
        if (optionsMenu && optionsMenu.classList) {
          optionsMenu.classList.add('show');
          setElementHidden(optionsMenu, false);
          try {
            if (window.FFFEvents && typeof window.FFFEvents.emit === 'function') {
              window.FFFEvents.emit('overlay:system:open', { id: 'optionsMenu' });
            }
          } catch (_) {}
        }
      });
    }

    if (testBtn) {
      testBtn.addEventListener('click', function () {
        if (!isDevMode) return;
        if (testModal && testModal.classList) {
          testModal.classList.add('show');
          setElementHidden(testModal, false);
          try {
            if (window.FFFEvents && typeof window.FFFEvents.emit === 'function') {
              window.FFFEvents.emit('overlay:system:open', { id: 'testModal' });
            }
          } catch (_) {}
          // Initialize toggles with current values
          if (toggleInstantWin) toggleInstantWin.checked = !!window.storyTestMode;
          if (toggleSilentArt) toggleSilentArt.checked = (window.silentArtPlaceholders !== false);
        }
      });
    }

    if (backToMenu) {
      backToMenu.addEventListener('click', function () {
        if (typeof window.cleanupTransientUi === 'function') {
          window.cleanupTransientUi();
        }
        showAppScreen('title');
        var startBtn = document.getElementById('startGame');
        if (startBtn) {
          startBtn.textContent = 'PLAY';
          startBtn.disabled = true;
        }
        window.currentGameMode = null;
      });
    }

    if (closeOptions) {
      closeOptions.addEventListener('click', function () {
        if (optionsMenu && optionsMenu.classList) {
          optionsMenu.classList.remove('show');
          setElementHidden(optionsMenu, true);
          try {
            if (window.FFFEvents && typeof window.FFFEvents.emit === 'function') {
              window.FFFEvents.emit('overlay:system:close', { id: 'optionsMenu' });
            }
          } catch (_) {}
        }
      });
    }

    if (closeTest) {
      closeTest.addEventListener('click', function () {
        closeTestModal();
      });
    }

    if (testShopBtn) {
      testShopBtn.addEventListener('click', function () {
        closeTestModal();
        runTest('shop');
      });
    }
    if (testMapBtn) {
      testMapBtn.addEventListener('click', function () {
        closeTestModal();
        runTest('map');
      });
    }
    if (testEventBtn) {
      testEventBtn.addEventListener('click', function () {
        closeTestModal();
        runTest('event');
      });
    }
    if (testRestBtn) {
      testRestBtn.addEventListener('click', function () {
        closeTestModal();
        runTest('rest');
      });
    }
    if (testRelicBtn) {
      testRelicBtn.addEventListener('click', function () {
        closeTestModal();
        runTest('relic');
      });
    }
    if (testRewardsBtn) {
      testRewardsBtn.addEventListener('click', function () {
        closeTestModal();
        runTest('rewards');
      });
    }
    if (testRemovalBtn) {
      testRemovalBtn.addEventListener('click', function () {
        closeTestModal();
        runTest('removal');
      });
    }
    if (testUpgradeBtn) {
      testUpgradeBtn.addEventListener('click', function () {
        closeTestModal();
        runTest('upgrade');
      });
    }
    if (testRewardCardBtn) {
      testRewardCardBtn.addEventListener('click', function () {
        closeTestModal();
        runTest('reward-card');
      });
    }
    if (testEncyBtn) {
      testEncyBtn.addEventListener('click', function () {
        closeTestModal();
        runTest('ency');
      });
    }
    if (testVisualFxBtn) {
      testVisualFxBtn.addEventListener('click', function () {
        closeTestModal();
        runTest('visual-fx');
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
        closeTestModal();
        // Start story mode properly like the Play button does
        window.currentGameMode = 'story';
        window.storyTestMode = true; // Flag to show instant win button
        handlePlayChoice('story');
      });
    }

    if (testTotemBtn) {
      testTotemBtn.addEventListener('click', function () {
        closeTestModal();
        runTest('totem');
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
          }, 900);
          if (clickCount >= 3) {
            clickCount = 0;
            if (resetTimer) {
              clearTimeout(resetTimer);
              resetTimer = null;
            }
            if (brand) {
              if (fanTimeout) {
                clearTimeout(fanTimeout);
                fanTimeout = null;
              }
              if (brand.classList.contains('logo-secret-active')) {
                brand.classList.remove('logo-secret-active');
                void brand.offsetWidth;
              }
              brand.classList.add('logo-secret-active');
              fanTimeout = setTimeout(function () {
                brand.classList.remove('logo-secret-active');
              }, 3600);
            }
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
