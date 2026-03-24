import {
  SCREEN_PRESETS,
  BATTLE_THEME_OVERRIDES,
  CONTEXT_OVERRIDES,
  EVENT_THEME_OVERRIDES
} from './visual-theme.js';
import { waitForVisualRuntime } from './visual-runtime.js';

async function createThreeBackgroundLayer() {
  const runtime = await waitForVisualRuntime(['THREE']);
  if (!runtime) return;

  const { visual, events, libs } = runtime;
  const THREE = libs.THREE;
  const canvas = visual && visual.canvases ? visual.canvases.three : null;
  if (!canvas || !THREE || !THREE.WebGLRenderer) return;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(visual.state.width || window.innerWidth || 1, visual.state.height || window.innerHeight || 1, false);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 7.5);

  function getTargetPixelRatio(context, screen) {
    const dpr = window.devicePixelRatio || 1;
    if (context === 'deckPreview') return Math.min(dpr, 1.2);
    if (screen === 'game') return Math.min(dpr, 1.5);
    return Math.min(dpr, 1.75);
  }

  const ambient = new THREE.AmbientLight(0xffffff, 1.1);
  scene.add(ambient);

  const accent = new THREE.DirectionalLight(0x9bd3ff, 1.4);
  accent.position.set(-2, 2, 4);
  scene.add(accent);

  const planeGeometry = new THREE.PlaneGeometry(18, 12, 1, 1);
  const planeMaterial = new THREE.MeshBasicMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.18
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.position.set(0, 0, -1.2);
  scene.add(plane);

  function makeFogTexture(size = 512, innerAlpha = 1, midAlpha = 0.28) {
    const fogCanvas = document.createElement('canvas');
    fogCanvas.width = size;
    fogCanvas.height = size;
    const ctx = fogCanvas.getContext('2d');
    if (!ctx) return null;
    const center = size * 0.5;
    const gradient = ctx.createRadialGradient(center, center, size * 0.08, center, center, size * 0.5);
    gradient.addColorStop(0, `rgba(255,255,255,${innerAlpha})`);
    gradient.addColorStop(0.4, `rgba(255,255,255,${midAlpha})`);
    gradient.addColorStop(0.72, 'rgba(255,255,255,0.08)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(fogCanvas);
  }

  const fogTexture = makeFogTexture(512, 1, 0.26);
  if (fogTexture) {
    fogTexture.needsUpdate = true;
  }

  const mistGeometry = new THREE.PlaneGeometry(12, 8, 1, 1);
  const mistMaterial = new THREE.MeshBasicMaterial({
    color: 0x93c5fd,
    map: fogTexture,
    transparent: true,
    opacity: 0.07,
    depthWrite: false
  });
  const mist = new THREE.Mesh(mistGeometry, mistMaterial);
  mist.position.set(2.2, 1.3, -0.5);
  scene.add(mist);

  const veilGeometry = new THREE.PlaneGeometry(13.5, 9.5, 1, 1);
  const veilMaterial = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    map: fogTexture,
    transparent: true,
    opacity: 0.05,
    depthWrite: false
  });
  const veil = new THREE.Mesh(veilGeometry, veilMaterial);
  veil.position.set(-2.4, -1.2, -0.65);
  scene.add(veil);

  const previewCardGroup = new THREE.Group();
  previewCardGroup.visible = false;
  previewCardGroup.position.set(2.55, -0.15, 0.38);
  scene.add(previewCardGroup);

  const previewCardShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 2.8, 1, 1),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.18,
      depthWrite: false
    })
  );
  previewCardShadow.position.set(0.12, -0.12, -0.08);
  previewCardGroup.add(previewCardShadow);

  const previewCardBack = new THREE.Mesh(
    new THREE.PlaneGeometry(1.82, 2.42, 1, 1),
    new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.96
    })
  );
  previewCardBack.position.set(0, 0, -0.03);
  previewCardGroup.add(previewCardBack);

  const previewCardFace = new THREE.Mesh(
    new THREE.PlaneGeometry(1.74, 2.34, 1, 1),
    new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.98
    })
  );
  previewCardGroup.add(previewCardFace);

  function makePreviewCardTexture(config) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 704;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, config.faceTop);
    gradient.addColorStop(1, config.faceBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = config.frame;
    ctx.fillRect(28, 28, canvas.width - 56, canvas.height - 56);
    ctx.fillStyle = config.faceInner;
    ctx.fillRect(46, 46, canvas.width - 92, canvas.height - 92);

    ctx.fillStyle = config.banner;
    ctx.fillRect(46, 46, canvas.width - 92, 92);

    ctx.fillStyle = config.bannerText;
    ctx.font = 'bold 34px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.title, canvas.width / 2, 92);

    ctx.strokeStyle = config.line;
    ctx.lineWidth = 8;
    ctx.strokeRect(64, 164, canvas.width - 128, 340);

    ctx.fillStyle = config.symbol;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 334, 94, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = config.symbolInner;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 334, 68, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = config.bannerText;
    ctx.font = 'bold 96px Georgia';
    ctx.fillText(config.glyph, canvas.width / 2, 340);

    ctx.fillStyle = config.copy;
    ctx.font = '24px Georgia';
    ctx.fillText(config.subtitle, canvas.width / 2, 560);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  const previewCardTextures = {};

  function getPreviewCardTexture(deck) {
    if (previewCardTextures[deck || 'default']) {
      return previewCardTextures[deck || 'default'];
    }
    const configs = {
      vikings: {
        title: 'Vikings', subtitle: 'Ataque brutal', glyph: 'V',
        frame: '#6b1d1d', faceTop: '#fee2e2', faceBottom: '#fecaca', faceInner: '#fff1f2',
        banner: '#7f1d1d', bannerText: '#ffe4e6', line: '#b91c1c', symbol: '#fb7185', symbolInner: '#881337', copy: '#7f1d1d'
      },
      animais: {
        title: 'Animais', subtitle: 'Pressao de mesa', glyph: 'A',
        frame: '#365314', faceTop: '#ecfccb', faceBottom: '#d9f99d', faceInner: '#f7fee7',
        banner: '#3f6212', bannerText: '#f7fee7', line: '#65a30d', symbol: '#84cc16', symbolInner: '#3f6212', copy: '#365314'
      },
      pescadores: {
        title: 'Pescadores', subtitle: 'Controle e fluxo', glyph: 'P',
        frame: '#0c4a6e', faceTop: '#e0f2fe', faceBottom: '#bae6fd', faceInner: '#f0f9ff',
        banner: '#075985', bannerText: '#e0f2fe', line: '#0284c7', symbol: '#38bdf8', symbolInner: '#0f172a', copy: '#0c4a6e'
      },
      floresta: {
        title: 'Floresta', subtitle: 'Sinergia viva', glyph: 'F',
        frame: '#14532d', faceTop: '#dcfce7', faceBottom: '#bbf7d0', faceInner: '#f0fdf4',
        banner: '#166534', bannerText: '#dcfce7', line: '#16a34a', symbol: '#22c55e', symbolInner: '#14532d', copy: '#14532d'
      },
      default: {
        title: 'Deck', subtitle: 'Preview 3D', glyph: 'D',
        frame: '#1e293b', faceTop: '#f8fafc', faceBottom: '#e2e8f0', faceInner: '#ffffff',
        banner: '#334155', bannerText: '#f8fafc', line: '#93c5fd', symbol: '#93c5fd', symbolInner: '#1e293b', copy: '#334155'
      }
    };
    const key = configs[deck] ? deck : 'default';
    const texture = makePreviewCardTexture(configs[key]);
    previewCardTextures[deck || 'default'] = texture;
    return texture;
  }

  const previewCardGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.05, 2.7, 1, 1),
    new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.12,
      depthWrite: false
    })
  );
  previewCardGlow.position.set(0, 0, -0.06);
  previewCardGroup.add(previewCardGlow);

  const previewCardSheen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 2.5, 1, 1),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.14,
      depthWrite: false
    })
  );
  previewCardSheen.position.set(-0.68, 0, 0.02);
  previewCardSheen.rotation.z = 0.18;
  previewCardGroup.add(previewCardSheen);

  function applyPreset(screen) {
    const preset = SCREEN_PRESETS[screen] || SCREEN_PRESETS.title;
    const battleOverride = screen === 'game' && layer && layer.battleTheme ? (BATTLE_THEME_OVERRIDES[layer.battleTheme] || null) : null;
    const contextOverride = layer && layer.context ? (CONTEXT_OVERRIDES[layer.context] || null) : null;
    const eventThemeOverride = layer && layer.eventTheme ? (EVENT_THEME_OVERRIDES[layer.eventTheme] || null) : null;
    renderer.setClearColor(
      eventThemeOverride && eventThemeOverride.clear ? eventThemeOverride.clear : (contextOverride && contextOverride.clear ? contextOverride.clear : (battleOverride && battleOverride.clear ? battleOverride.clear : preset.clear)),
      preset.clearAlpha
    );
    planeMaterial.color.setHex(preset.plane);
    planeMaterial.opacity = preset.planeOpacity;
    ambient.intensity = preset.ambient;
    accent.color.setHex(eventThemeOverride && eventThemeOverride.accent ? eventThemeOverride.accent : (contextOverride && contextOverride.accent ? contextOverride.accent : (battleOverride && battleOverride.accent ? battleOverride.accent : preset.accent)));
    accent.intensity = preset.accentIntensity;
    mistMaterial.color.setHex(eventThemeOverride && eventThemeOverride.mist ? eventThemeOverride.mist : (contextOverride && contextOverride.mist ? contextOverride.mist : (battleOverride && battleOverride.mist ? battleOverride.mist : preset.mist)));
    mistMaterial.opacity = contextOverride && contextOverride.mistOpacity !== undefined ? contextOverride.mistOpacity : (battleOverride && battleOverride.mistOpacity !== undefined ? battleOverride.mistOpacity : preset.mistOpacity);
    veilMaterial.color.setHex(eventThemeOverride && eventThemeOverride.veil ? eventThemeOverride.veil : (contextOverride && contextOverride.veil ? contextOverride.veil : (battleOverride && battleOverride.veil ? battleOverride.veil : preset.veil)));
    veilMaterial.opacity = contextOverride && contextOverride.veilOpacity !== undefined ? contextOverride.veilOpacity : (battleOverride && battleOverride.veilOpacity !== undefined ? battleOverride.veilOpacity : preset.veilOpacity);
      if (visual.root) {
        visual.root.dataset.threePreset = screen in SCREEN_PRESETS ? screen : 'title';
        if (screen === 'game') {
          if (layer && layer.battleTheme) visual.root.dataset.threeBattleTheme = layer.battleTheme;
          else visual.root.removeAttribute('data-three-battle-theme');
        }
        if (layer && layer.context) visual.root.dataset.threeContext = layer.context;
        else visual.root.removeAttribute('data-three-context');
      }
      try {
        if (document && document.body) {
          if (layer && layer.context) document.body.setAttribute('data-three-context', layer.context);
          else document.body.removeAttribute('data-three-context');
          if (screen === 'game' && layer && layer.battleTheme) document.body.setAttribute('data-three-battle-theme', layer.battleTheme);
          else document.body.removeAttribute('data-three-battle-theme');
        }
      } catch (_) {}
    }

  const layer = {
    renderer,
    scene,
    camera,
    active: false,
    time: 0,
    screen: 'title',
    preset: SCREEN_PRESETS.title,
    battleTheme: null,
    context: null,
    eventTheme: null,
    previewDeck: null,
    previewEnterAt: 0,
    previewHover: 0,
    previewNeedsRedraw: true,
    perf: {
      frames: 0,
      elapsed: 0,
      avgFrameMS: 0,
      fps: 0
    },
    lastFrameAt: 0,
    pointer: { x: 0, y: 0 },
    cameraCurrent: { x: 0, y: 0 },
    battleImpulse: {
      intensity: 0,
      color: 0x93c5fd,
      mode: 'soft'
    },
    backgroundPlane: plane,
    mistLayer: mist,
    veilLayer: veil,
    previewAnchor: { x: 2.55, y: -0.15, scale: 1 },
    resize() {
      const width = visual.state.width || window.innerWidth || 1;
      const height = visual.state.height || window.innerHeight || 1;
      renderer.setPixelRatio(getTargetPixelRatio(this.context, this.screen));
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      this.updatePreviewAnchor();
    },
    triggerImpulse(color = 0x93c5fd, intensity = 1, mode = 'soft') {
      this.battleImpulse.color = color;
      this.battleImpulse.mode = mode || 'soft';
      this.battleImpulse.intensity = Math.max(this.battleImpulse.intensity, Math.min(1.4, intensity));
    },
    updatePreviewAnchor() {
      const screenEl = document.getElementById('deckPreviewScreen');
      if (!screenEl || screenEl.hidden) {
        this.previewAnchor.x = 2.55;
        this.previewAnchor.y = -0.15;
        this.previewAnchor.scale = 1;
        this.previewHover = 0;
        return;
      }
      const rect = screenEl.getBoundingClientRect();
      const heroEl = document.querySelector('#deckPreviewScreen .deck-preview-hero');
      const heroRect = heroEl ? heroEl.getBoundingClientRect() : rect;
      const width = visual.state.width || window.innerWidth || 1;
      const height = visual.state.height || window.innerHeight || 1;
      const anchorX = heroRect.left + (heroRect.width * 0.5);
      const anchorY = heroRect.top + (heroRect.height * 0.52);
      this.previewAnchor.x = ((anchorX / width) - 0.5) * 8.4;
      this.previewAnchor.y = (((anchorY / height) - 0.5) * -1) * 4.8;
      this.previewAnchor.scale = Math.max(0.82, Math.min(1.18, heroRect.height / 420));
      const isHoveringHero = (
        layer.lastPointerClient &&
        layer.lastPointerClient.x >= heroRect.left &&
        layer.lastPointerClient.x <= heroRect.right &&
        layer.lastPointerClient.y >= heroRect.top &&
        layer.lastPointerClient.y <= heroRect.bottom
      );
      this.previewHover += ((isHoveringHero ? 1 : 0) - this.previewHover) * 0.14;
    },
    syncVisibility(screen) {
      const next = screen === 'title' || screen === 'start' || screen === 'game' || screen === 'multiplayer';
      this.screen = screen === 'start' ? 'deck' : (screen || 'title');
      this.preset = SCREEN_PRESETS[this.screen] || SCREEN_PRESETS.title;
      this.active = !!next;
      renderer.setPixelRatio(getTargetPixelRatio(this.context, this.screen));
      applyPreset(this.screen);
      if (visual.root) {
        visual.root.dataset.threeActive = this.active ? 'true' : 'false';
      }
      try {
        if (document && document.body) {
          document.body.setAttribute('data-three-active', this.active ? 'true' : 'false');
          document.body.setAttribute('data-three-screen', this.screen || 'title');
        }
      } catch (_) {}
    },
    renderFrame(deltaMS) {
      const frameStart = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      this.time += deltaMS;
      const battleOverride = this.screen === 'game' && this.battleTheme ? (BATTLE_THEME_OVERRIDES[this.battleTheme] || null) : null;
      const contextOverride = this.context ? (CONTEXT_OVERRIDES[this.context] || null) : null;
      const motion = contextOverride && contextOverride.motion !== undefined ? contextOverride.motion : (battleOverride && battleOverride.motion !== undefined ? battleOverride.motion : this.preset.motion);
      const driftRate = contextOverride && contextOverride.drift !== undefined ? contextOverride.drift : (battleOverride && battleOverride.drift !== undefined ? battleOverride.drift : this.preset.drift);
      const sway = contextOverride && contextOverride.sway !== undefined ? contextOverride.sway : (battleOverride && battleOverride.sway !== undefined ? battleOverride.sway : this.preset.sway);
      const cameraIntensity = contextOverride && contextOverride.cameraIntensity !== undefined ? contextOverride.cameraIntensity : (battleOverride && battleOverride.cameraIntensity !== undefined ? battleOverride.cameraIntensity : this.preset.cameraIntensity);
      const impulse = this.battleImpulse.intensity;
      const wobble = Math.sin(this.time * 0.00035) * 0.08 * motion;
      const drift = Math.cos(this.time * 0.00028) * 0.12 * driftRate;
      const targetX = this.pointer.x * cameraIntensity;
      const targetY = this.pointer.y * (cameraIntensity * 0.7);
      this.cameraCurrent.x += (targetX - this.cameraCurrent.x) * 0.035;
      this.cameraCurrent.y += (targetY - this.cameraCurrent.y) * 0.035;
      camera.position.x = this.cameraCurrent.x;
      camera.position.y = this.cameraCurrent.y;
      plane.rotation.z = wobble * 0.08;
      plane.position.y = wobble * 0.35 - this.cameraCurrent.y * (0.18 + sway * 0.08);
      plane.position.x = -this.cameraCurrent.x * (0.12 + sway * 0.06);
      mist.position.y = 1.3 + wobble * 0.3 - this.cameraCurrent.y * (0.28 + sway * 0.22);
      mist.position.x = 2.2 + drift * 0.42 - this.cameraCurrent.x * (0.42 + sway * 0.38);
      veil.position.y = -1.2 - wobble * 0.24 - this.cameraCurrent.y * (0.14 + sway * 0.16);
      veil.position.x = -2.4 - drift * 0.32 - this.cameraCurrent.x * (0.24 + sway * 0.21);
      mist.rotation.z = wobble * 0.025;
      veil.rotation.z = -wobble * 0.018;
      if (impulse > 0.001) {
        const pulseColor = this.battleImpulse.color || 0x93c5fd;
        const pulseMode = this.battleImpulse.mode || 'soft';
        const pulseWave = (Math.sin(this.time * (pulseMode === 'impact' ? 0.015 : 0.01)) + 1) * 0.5;
        accent.color.lerp(new THREE.Color(pulseColor), Math.min(0.45, impulse * 0.32));
        mistMaterial.color.lerp(new THREE.Color(pulseColor), Math.min(0.34, impulse * 0.24));
        veilMaterial.color.lerp(new THREE.Color(pulseColor), Math.min(0.3, impulse * 0.22));
        accent.intensity += impulse * (pulseMode === 'impact' ? 0.34 : 0.22);
        planeMaterial.opacity += impulse * 0.05;
        mistMaterial.opacity += impulse * (0.06 + pulseWave * 0.04);
        veilMaterial.opacity += impulse * (0.04 + pulseWave * 0.03);
        plane.rotation.z += (pulseWave - 0.5) * 0.03 * impulse;
        mist.position.x += (pulseWave - 0.5) * 0.18 * impulse;
        veil.position.x -= (pulseWave - 0.5) * 0.14 * impulse;
        this.battleImpulse.intensity *= pulseMode === 'impact' ? 0.88 : 0.93;
      } else {
        this.battleImpulse.intensity = 0;
      }
      const previewVisible = this.context === 'deckPreview';
      previewCardGroup.visible = previewVisible;
      if (previewVisible) {
        const deckColors = {
          vikings: { face: 0xfee2e2, back: 0x7f1d1d, glow: 0xfb7185 },
          animais: { face: 0xecfccb, back: 0x365314, glow: 0x84cc16 },
          pescadores: { face: 0xe0f2fe, back: 0x0c4a6e, glow: 0x38bdf8 },
          floresta: { face: 0xdcfce7, back: 0x14532d, glow: 0x22c55e }
        };
        const palette = deckColors[this.previewDeck] || { face: 0xf8fafc, back: 0x1e293b, glow: 0x93c5fd };
        const enterProgress = Math.max(0, Math.min(1, (this.time - this.previewEnterAt) / 420));
        const easedEnter = 1 - Math.pow(1 - enterProgress, 3);
        previewCardFace.material.color.setHex(palette.face);
        previewCardBack.material.color.setHex(palette.back);
        previewCardGlow.material.color.setHex(palette.glow);
        previewCardGlow.material.opacity = 0.1 + (this.previewHover * 0.12);
        previewCardShadow.material.opacity = 0.14 + (this.previewHover * 0.08);
        previewCardSheen.material.opacity = 0.08 + (this.previewHover * 0.08);
        if (this.previewNeedsRedraw || this.previewHover > 0.02) {
          previewCardFace.material.map = getPreviewCardTexture(this.previewDeck);
          previewCardFace.material.needsUpdate = true;
          previewCardGroup.scale.setScalar(this.previewAnchor.scale * (0.9 + (easedEnter * 0.1) + (this.previewHover * 0.035)));
          previewCardGroup.rotation.y = Math.sin(this.time * 0.0008) * 0.18 + (this.pointer.x * (0.035 + this.previewHover * 0.06));
          previewCardGroup.rotation.x = Math.cos(this.time * 0.0006) * 0.05 - (this.pointer.y * (0.02 + this.previewHover * 0.03));
          previewCardGroup.position.x = this.previewAnchor.x;
          previewCardGroup.position.y = this.previewAnchor.y - ((1 - easedEnter) * 0.28) + Math.sin(this.time * 0.00075) * (0.04 + this.previewHover * 0.05);
          previewCardGroup.position.z = 0.38 + (this.previewHover * 0.08);
          previewCardSheen.position.x = -0.72 + (((Math.sin(this.time * 0.0011) + 1) * 0.5) * 1.44);
          previewCardSheen.rotation.z = 0.14 + (this.previewHover * 0.06);
          this.previewNeedsRedraw = this.previewHover > 0.02;
        }
      }
      camera.lookAt(0, 0, -1.2);
      renderer.render(scene, camera);
      const frameEnd = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const cost = Math.max(0, frameEnd - frameStart);
      this.perf.frames += 1;
      this.perf.elapsed += deltaMS;
      this.perf.avgFrameMS += (cost - this.perf.avgFrameMS) * 0.12;
      if (this.perf.elapsed >= 500) {
        this.perf.fps = Math.round((this.perf.frames * 1000) / this.perf.elapsed);
        if (typeof visual.updateStats === 'function') {
          visual.updateStats('three', {
            active: this.active,
            screen: this.screen,
            context: this.context,
            fps: this.perf.fps,
            avgFrameMS: Number(this.perf.avgFrameMS.toFixed(2)),
            calls: renderer.info && renderer.info.render ? renderer.info.render.calls : 0,
            triangles: renderer.info && renderer.info.render ? renderer.info.render.triangles : 0
          });
        }
        this.perf.frames = 0;
        this.perf.elapsed = 0;
      }
    }
  };

  const STYLE_IMPULSES = {
    attack: { color: 0xfb7185, intensity: 0.76, mode: 'impact' },
    flame: { color: 0xf97316, intensity: 0.96, mode: 'impact' },
    storm: { color: 0xa78bfa, intensity: 0.86, mode: 'soft' },
    tidal: { color: 0x38bdf8, intensity: 0.82, mode: 'soft' },
    feral: { color: 0x84cc16, intensity: 0.84, mode: 'impact' },
    heavy: { color: 0xf59e0b, intensity: 0.94, mode: 'impact' },
    mystic: { color: 0xc084fc, intensity: 0.9, mode: 'soft' },
    totem: { color: 0x22d3ee, intensity: 0.82, mode: 'soft' }
  };

  const DECK_IMPULSES = {
    vikings: { color: 0xfb7185, intensity: 0.9, mode: 'impact' },
    floresta: { color: 0x4ade80, intensity: 0.78, mode: 'soft' },
    pescadores: { color: 0x38bdf8, intensity: 0.8, mode: 'soft' },
    animais: { color: 0xa3e635, intensity: 0.82, mode: 'impact' }
  };

  function resolveThemedImpulse(payload = {}, fallback) {
    const style = payload.combatStyle || payload.theme || '';
    const deck = payload.deck || '';
    return STYLE_IMPULSES[style] || DECK_IMPULSES[deck] || fallback;
  }

  function resolveAbilityImpulse(payload = {}) {
    const effect = payload.effect || 'ability';
    if (effect === 'heal') return resolveThemedImpulse(payload, { color: 0x4ade80, intensity: 0.72, mode: 'soft' });
    if (effect === 'mana') return resolveThemedImpulse(payload, { color: 0x60a5fa, intensity: 0.68, mode: 'soft' });
    if (effect === 'spell') return resolveThemedImpulse(payload, { color: 0xa78bfa, intensity: 0.78, mode: 'soft' });
    if (effect === 'totem') return resolveThemedImpulse(payload, { color: 0x22d3ee, intensity: 0.74, mode: 'soft' });
    if (effect === 'debuff') return resolveThemedImpulse(payload, { color: 0xf97316, intensity: 0.78, mode: 'impact' });
    return resolveThemedImpulse(payload, { color: 0xfacc15, intensity: 0.7, mode: 'soft' });
  }

  function resolveCharacterImpulse(payload = {}) {
    const stage = payload.stage || 'attack';
    if (stage === 'hit') return resolveThemedImpulse(payload, { color: 0xfb7185, intensity: 0.82, mode: 'impact' });
    if (stage === 'death') return resolveThemedImpulse(payload, { color: 0xf97316, intensity: 1.02, mode: 'impact' });
    return resolveThemedImpulse(payload, { color: 0x93c5fd, intensity: 0.64, mode: 'soft' });
  }

  function resolveTextImpulse(payload = {}) {
    const cls = payload.cls || '';
    if (cls === 'heal') return resolveThemedImpulse(payload, { color: 0x4ade80, intensity: 0.54, mode: 'soft' });
    if (cls === 'buff') return resolveThemedImpulse(payload, { color: 0xfacc15, intensity: 0.52, mode: 'soft' });
    if (cls === 'reflect' || cls === 'dmg') return resolveThemedImpulse(payload, { color: 0xfb7185, intensity: 0.62, mode: 'impact' });
    return resolveThemedImpulse(payload, { color: 0x93c5fd, intensity: 0.46, mode: 'soft' });
  }

  function resolveBannerImpulse(payload = {}) {
    if (payload.kind === 'victory') return resolveThemedImpulse(payload, { color: 0x34d399, intensity: 0.88, mode: 'soft' });
    if (payload.kind === 'boss') return resolveThemedImpulse(payload, { color: 0xf43f5e, intensity: 0.94, mode: 'impact' });
    if (payload.kind === 'shop') return resolveThemedImpulse(payload, { color: 0xfcd34d, intensity: 0.74, mode: 'soft' });
    return resolveThemedImpulse(payload, { color: 0x7cc4ff, intensity: 0.72, mode: 'soft' });
  }

  function resolveMeterImpulse(payload = {}) {
    const kind = payload.kind || 'hit';
    if (kind === 'mana') return resolveThemedImpulse(payload, { color: 0x60a5fa, intensity: 0.5, mode: 'soft' });
    if (kind === 'heal') return resolveThemedImpulse(payload, { color: 0x4ade80, intensity: 0.56, mode: 'soft' });
    return resolveThemedImpulse(payload, { color: 0xfb7185, intensity: 0.62, mode: 'impact' });
  }

  function resolveCelebrationImpulse(payload = {}) {
    return payload.kind === 'defeat'
      ? { color: 0xfb7185, intensity: 0.84, mode: 'impact' }
      : { color: 0x34d399, intensity: 0.78, mode: 'soft' };
  }

  function onResize() {
    layer.resize();
  }

  function onPointerMove(event) {
    const width = visual.state.width || window.innerWidth || 1;
    const height = visual.state.height || window.innerHeight || 1;
    layer.lastPointerClient = { x: event.clientX, y: event.clientY };
    layer.pointer.x = ((event.clientX / width) - 0.5) * 2;
    layer.pointer.y = (((event.clientY / height) - 0.5) * 2) * -1;
    if (layer.context === 'deckPreview') {
      layer.previewNeedsRedraw = true;
      layer.updatePreviewAnchor();
    }
  }

  function onPointerLeave() {
    layer.lastPointerClient = null;
    layer.pointer.x = 0;
    layer.pointer.y = 0;
    if (layer.context === 'deckPreview') {
      layer.previewNeedsRedraw = true;
      layer.updatePreviewAnchor();
    }
  }

  function tick() {
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const delta = layer.lastFrameAt ? Math.max(8, Math.min(34, now - layer.lastFrameAt)) : 16;
    layer.lastFrameAt = now;
    if (layer.active) {
      layer.renderFrame(delta);
    } else {
      renderer.clear();
      if (typeof visual.updateStats === 'function') {
        visual.updateStats('three', {
          active: false,
          screen: layer.screen,
          context: layer.context,
          fps: 0,
          avgFrameMS: 0,
          calls: 0,
          triangles: 0
        });
      }
    }
    window.setTimeout(() => window.requestAnimationFrame(tick), layer.active ? 0 : 180);
  }

  if (!visual.plugins) visual.plugins = {};
  visual.plugins.threeBackground = layer;
  if (typeof visual.registerThemes === 'function') {
    visual.registerThemes({
      visual: {
        SCREEN_PRESETS,
        BATTLE_THEME_OVERRIDES,
        CONTEXT_OVERRIDES,
        EVENT_THEME_OVERRIDES
      }
    });
  }
  if (visual.root) {
    visual.root.dataset.threeReady = 'true';
  }
  try {
    if (document && document.body) {
      document.body.setAttribute('data-three-ready', 'true');
    }
  } catch (_) {}

  events.on('screen:change', (event) => {
    layer.syncVisibility(event && event.payload ? event.payload.screen : 'title');
  });
  events.on('battle:start', () => {
    layer.syncVisibility('game');
    layer.triggerImpulse(0x7cc4ff, 0.9, 'soft');
  });
  events.on('battle:end', () => {
    layer.triggerImpulse(0xfb7185, 0.95, 'impact');
    layer.syncVisibility((visual && visual.state && visual.state.screen) || 'title');
  });
  events.on('battle:theme', (event) => {
    const payload = event && event.payload ? event.payload : {};
    layer.battleTheme = payload.theme || null;
    if (layer.screen === 'game') {
      applyPreset('game');
    }
  });
  events.on('shop:open', () => {
    layer.context = 'shop';
    applyPreset(layer.screen);
  });
  events.on('shop:close', () => {
    layer.context = null;
    applyPreset(layer.screen);
  });
  events.on('campaign:map:open', () => {
    layer.context = 'map';
    applyPreset(layer.screen);
  });
  events.on('campaign:map:close', () => {
    if (layer.context === 'map') {
      layer.context = null;
      applyPreset(layer.screen);
    }
  });
  events.on('campaign:event:open', () => {
    layer.context = 'event';
    applyPreset(layer.screen);
  });
  events.on('campaign:event:close', () => {
    if (layer.context === 'event') {
      layer.context = null;
      layer.eventTheme = null;
      applyPreset(layer.screen);
    }
  });
  events.on('campaign:event:theme', (event) => {
    const payload = event && event.payload ? event.payload : {};
    layer.eventTheme = payload.theme || null;
    if (layer.context === 'event') {
      applyPreset(layer.screen);
    }
  });
  events.on('campaign:reward:open', () => {
    layer.context = 'reward';
    applyPreset(layer.screen);
  });
  events.on('campaign:reward:close', () => {
    if (layer.context === 'reward') {
      layer.context = null;
      applyPreset(layer.screen);
    }
  });
  events.on('overlay:archive:open', () => {
    layer.context = 'archive';
    applyPreset(layer.screen);
  });
  events.on('overlay:archive:close', () => {
    if (layer.context === 'archive') {
      layer.context = null;
      applyPreset(layer.screen);
    }
  });
  events.on('overlay:system:open', () => {
    layer.context = 'system';
    applyPreset(layer.screen);
  });
  events.on('overlay:system:close', () => {
    if (layer.context === 'system') {
      layer.context = null;
      applyPreset(layer.screen);
    }
  });
  events.on('deck:preview:open', (event) => {
    const payload = event && event.payload ? event.payload : {};
    layer.context = 'deckPreview';
    layer.previewDeck = payload.deck || null;
    layer.previewEnterAt = layer.time;
    layer.previewHover = 0;
    layer.previewNeedsRedraw = true;
    renderer.setPixelRatio(getTargetPixelRatio(layer.context, layer.screen));
    layer.updatePreviewAnchor();
    applyPreset(layer.screen);
  });
  events.on('deck:preview:close', () => {
    if (layer.context === 'deckPreview') {
      layer.context = null;
      layer.previewDeck = null;
      layer.previewHover = 0;
      layer.previewNeedsRedraw = false;
      renderer.setPixelRatio(getTargetPixelRatio(layer.context, layer.screen));
      applyPreset(layer.screen);
    }
  });
  events.on('card:played', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    const fallback = payload.type === 'spell' || payload.stance === 'spell'
      ? { color: 0xa78bfa, intensity: 0.72, mode: 'soft' }
      : ((payload.type === 'totem' || payload.stance === 'totem')
        ? { color: 0x22d3ee, intensity: 0.82, mode: 'soft' }
        : { color: 0x93c5fd, intensity: 0.52, mode: 'soft' });
    const themed = resolveThemedImpulse(payload, fallback);
    layer.triggerImpulse(themed.color, Math.max(fallback.intensity, themed.intensity * 0.88), 'soft');
  });
  events.on('card:damaged', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    const themed = resolveThemedImpulse(payload, { color: 0xfb7185, intensity: 1.02, mode: 'impact' });
    layer.triggerImpulse(themed.color, Math.max(1.02, themed.intensity), 'impact');
  });
  events.on('card:healed', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    const themed = resolveThemedImpulse(payload, { color: 0x4ade80, intensity: 0.76, mode: 'soft' });
    layer.triggerImpulse(themed.color, themed.intensity * 0.9, 'soft');
  });
  events.on('card:mana', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    const themed = resolveThemedImpulse(payload, { color: 0x60a5fa, intensity: 0.68, mode: 'soft' });
    layer.triggerImpulse(themed.color, themed.intensity * 0.88, 'soft');
  });
  events.on('card:buffed', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    const themed = resolveThemedImpulse(payload, { color: 0xfacc15, intensity: 0.74, mode: 'soft' });
    layer.triggerImpulse(themed.color, themed.intensity * 0.92, 'soft');
  });
  events.on('card:debuffed', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    const themed = resolveThemedImpulse(payload, { color: 0xf97316, intensity: 0.82, mode: 'impact' });
    layer.triggerImpulse(themed.color, Math.max(0.82, themed.intensity * 0.94), 'impact');
  });
  events.on('face:damaged', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    const fallback = { color: payload.side === 'player' ? 0xfb7185 : 0xffa861, intensity: 1.12, mode: 'impact' };
    const themed = resolveThemedImpulse(payload, fallback);
    layer.triggerImpulse(themed.color, Math.max(fallback.intensity, themed.intensity || 0.9), themed.mode || 'impact');
  });
  events.on('visual:card-context', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    switch (payload.context) {
      case 'heal':
        layer.triggerImpulse(0x4ade80, 0.68, 'soft');
        break;
      case 'buff':
        layer.triggerImpulse(0xfacc15, 0.66, 'soft');
        break;
      case 'mana':
        layer.triggerImpulse(0x60a5fa, 0.62, 'soft');
        break;
      case 'summon':
        layer.triggerImpulse(0x93c5fd, 0.58, 'soft');
        break;
      case 'death':
        {
          const themed = resolveThemedImpulse(payload, { color: 0xfb7185, intensity: 0.9, mode: 'impact' });
          layer.triggerImpulse(themed.color, themed.intensity, themed.mode);
        }
        break;
      case 'explosion':
        {
          const themed = resolveThemedImpulse(payload, { color: 0xffa861, intensity: 1.02, mode: 'impact' });
          layer.triggerImpulse(themed.color, Math.max(1.02, themed.intensity || 0), 'impact');
        }
        break;
      default:
        {
          const themed = resolveThemedImpulse(payload, { color: 0xfb7185, intensity: 0.76, mode: 'impact' });
          layer.triggerImpulse(themed.color, themed.intensity, themed.mode);
        }
        break;
    }
  });
  events.on('visual:face-context', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    const themed = resolveThemedImpulse(
      payload,
      { color: payload.context === 'explosion' ? 0xffa861 : 0xfb7185, intensity: 0.94, mode: 'impact' }
    );
    layer.triggerImpulse(themed.color, themed.intensity, themed.mode);
  });
  events.on('visual:ability-cue', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    const themed = resolveAbilityImpulse(payload);
    layer.triggerImpulse(themed.color, themed.intensity, themed.mode);
  });
  events.on('visual:screen-slash', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    const themed = resolveThemedImpulse(payload, { color: 0xfb7185, intensity: 0.88, mode: 'impact' });
    layer.triggerImpulse(themed.color, themed.intensity, 'impact');
  });
  events.on('visual:impact-ring', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    const themed = resolveThemedImpulse(payload, { color: 0xf59e0b, intensity: 0.7, mode: 'impact' });
    layer.triggerImpulse(themed.color, themed.intensity, 'impact');
  });
  events.on('visual:attack-arrow', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    if (payload.active === false) return;
    const themed = resolveThemedImpulse(payload, { color: 0x60a5fa, intensity: 0.54, mode: 'soft' });
    layer.triggerImpulse(themed.color, themed.intensity, 'soft');
  });
  events.on('visual:character-cue', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    const themed = resolveCharacterImpulse(payload);
    layer.triggerImpulse(themed.color, themed.intensity, themed.mode);
  });
  events.on('visual:death-burn', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    const themed = resolveThemedImpulse(payload, { color: 0xf97316, intensity: 1.08, mode: 'impact' });
    layer.triggerImpulse(themed.color, themed.intensity, 'impact');
  });
  events.on('visual:text-float', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    const themed = resolveTextImpulse(payload);
    layer.triggerImpulse(themed.color, themed.intensity, themed.mode);
  });
  events.on('visual:banner', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    const themed = resolveBannerImpulse(payload);
    layer.triggerImpulse(themed.color, themed.intensity, themed.mode);
  });
  events.on('visual:meter-pulse', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    const themed = resolveMeterImpulse(payload);
    layer.triggerImpulse(themed.color, themed.intensity, themed.mode);
  });
  events.on('visual:turn-ui', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    const playerTurn = payload.yourTurn !== false && payload.side !== 'ai';
    layer.triggerImpulse(playerTurn ? 0x7cc4ff : 0xfb7185, playerTurn ? 0.44 : 0.38, 'soft');
  });
  events.on('visual:celebration', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    const themed = resolveCelebrationImpulse(payload);
    layer.triggerImpulse(themed.color, themed.intensity, themed.mode);
  });
  events.on('visual:board-pulse', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    const themed = resolveThemedImpulse(payload, { color: 0x7cc4ff, intensity: 0.58, mode: 'soft' });
    layer.triggerImpulse(themed.color, themed.intensity, 'soft');
  });
  events.on('visual:spell-cast', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    const themed = resolveThemedImpulse(payload, { color: 0xa78bfa, intensity: 0.68, mode: 'soft' });
    layer.triggerImpulse(themed.color, themed.intensity, 'soft');
  });
  events.on('visual:totem-cast', (event) => {
    if (!layer.active || layer.screen !== 'game') return;
    const payload = event && event.payload ? event.payload : {};
    const themed = resolveThemedImpulse(payload, { color: 0x22d3ee, intensity: 0.64, mode: 'soft' });
    layer.triggerImpulse(themed.color, themed.intensity, 'soft');
  });

  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', onPointerLeave, { passive: true });
  layer.resize();
  layer.syncVisibility((visual && visual.state && visual.state.screen) || 'title');
  tick();
}

createThreeBackgroundLayer().catch(() => {});
