import { resolveEffectColor, EFFECT_THEME_API } from './visual-effects-theme.js';
import { waitForVisualRuntime } from './visual-runtime.js';

async function createBattleEffectsLayer() {
  const runtime = await waitForVisualRuntime(['PIXI']);
  if (!runtime) return;

  const { visual, events, libs } = runtime;
  const PIXI = libs.PIXI;
  const canvas = visual && visual.canvases ? visual.canvases.pixi : null;
  if (!canvas || !PIXI || !PIXI.Application) return;

  const app = new PIXI.Application();
  await app.init({
    canvas,
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: true,
    resizeTo: window
  });

  const root = new PIXI.Container();
  root.eventMode = 'none';
  root.visible = false;
  app.stage.addChild(root);
  const activeAnimations = new Set();

  const STYLE_PALETTES = {
    attack: { primary: 0xfb7185, secondary: 0xffa861, accent: 0xffffff, face: 0xfb7185 },
    flame: { primary: 0xf97316, secondary: 0xfb7185, accent: 0xfdba74, face: 0xf97316 },
    storm: { primary: 0xa78bfa, secondary: 0x60a5fa, accent: 0xe9d5ff, face: 0xa78bfa },
    tidal: { primary: 0x38bdf8, secondary: 0x22d3ee, accent: 0xe0f2fe, face: 0x38bdf8 },
    feral: { primary: 0x84cc16, secondary: 0xfacc15, accent: 0xfef08a, face: 0x84cc16 },
    heavy: { primary: 0xf59e0b, secondary: 0xfb7185, accent: 0xffedd5, face: 0xf59e0b },
    mystic: { primary: 0xc084fc, secondary: 0x67e8f9, accent: 0xf5d0fe, face: 0xc084fc },
    totem: { primary: 0x22d3ee, secondary: 0x67e8f9, accent: 0xccfbf1, face: 0x22d3ee }
  };

  const DECK_PALETTES = {
    vikings: { primary: 0xfb7185, secondary: 0xf59e0b, accent: 0xfee2e2, face: 0xfb7185 },
    floresta: { primary: 0x4ade80, secondary: 0x84cc16, accent: 0xdcfce7, face: 0x4ade80 },
    pescadores: { primary: 0x38bdf8, secondary: 0x22d3ee, accent: 0xe0f2fe, face: 0x38bdf8 },
    animais: { primary: 0xa3e635, secondary: 0xfacc15, accent: 0xfef9c3, face: 0xa3e635 }
  };

  function resolveContextPalette(payload = {}, fallbackKind = 'damage') {
    const style = payload.combatStyle || payload.theme || '';
    const deck = payload.deck || '';
    const themed = STYLE_PALETTES[style] || DECK_PALETTES[deck] || null;
    if (themed) return themed;
    const fallback = resolveEffectColor(fallbackKind, payload);
    return {
      primary: fallback,
      secondary: fallback,
      accent: 0xffffff,
      face: fallback
    };
  }

  function resolvePlayPalette(payload = {}) {
    if (payload.type === 'totem' || payload.stance === 'totem') return resolveContextPalette({ ...payload, combatStyle: 'totem' }, 'mana');
    if (payload.type === 'spell' || payload.stance === 'spell') return resolveContextPalette({ ...payload, combatStyle: payload.combatStyle || 'mystic' }, 'mana');
    return resolveContextPalette(payload, 'mana');
  }

  function resolveAbilityPalette(payload = {}) {
    const effect = payload.effect || 'ability';
    if (effect === 'totem') return resolveContextPalette({ ...payload, combatStyle: payload.combatStyle || 'totem' }, 'buff');
    if (effect === 'spell') return resolveContextPalette({ ...payload, combatStyle: payload.combatStyle || 'mystic' }, 'mana');
    if (effect === 'heal') return resolveContextPalette(payload, 'heal');
    if (effect === 'mana') return resolveContextPalette(payload, 'mana');
    if (effect === 'debuff') return resolveContextPalette(payload, 'debuff');
    return resolveContextPalette(payload, 'buff');
  }

  function resolveCharacterPalette(payload = {}) {
    const stage = payload.stage || 'attack';
    if (stage === 'hit') return resolveContextPalette(payload, 'damage');
    if (stage === 'death') return resolveContextPalette(payload, 'damage');
    return resolveContextPalette(payload, 'buff');
  }

  function resolveTextPalette(payload = {}) {
    const cls = payload.cls || '';
    if (cls === 'heal') return resolveContextPalette(payload, 'heal');
    if (cls === 'buff') return resolveContextPalette(payload, 'buff');
    if (cls === 'reflect' || cls === 'dmg') return resolveContextPalette(payload, 'damage');
    return resolveContextPalette(payload, 'buff');
  }

  function getRectCenter(rect) {
    if (!rect) return null;
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  function getGameWrapRect() {
    const node = document.getElementById('gameWrap');
    if (!node || typeof node.getBoundingClientRect !== 'function') return null;
    return node.getBoundingClientRect();
  }

  function getFaceRect(side) {
    const ids = side === 'player'
      ? ['playerAvatar', 'playerHP', 'barPlayerHP']
      : ['aiAvatar', 'aiHP', 'barAiHP'];
    for (const id of ids) {
      const node = document.getElementById(id);
      if (node && typeof node.getBoundingClientRect === 'function') {
        return node.getBoundingClientRect();
      }
    }
    return getGameWrapRect();
  }

  function getCardRect(cardId) {
    if (!cardId) return null;
    const node = document.querySelector(`.card[data-id="${String(cardId)}"]`);
    if (!node || typeof node.getBoundingClientRect !== 'function') return null;
    return node.getBoundingClientRect();
  }

  function getElementRect(selector) {
    if (!selector) return null;
    const node = document.querySelector(selector);
    if (!node || typeof node.getBoundingClientRect !== 'function') return null;
    const rect = node.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) return null;
    return rect;
  }

  function waitForCardRect(cardId, attempts = 10) {
    return new Promise((resolve) => {
      if (!cardId) {
        resolve(null);
        return;
      }
      let remaining = Math.max(1, attempts);
      const poll = () => {
        const rect = getCardRect(cardId);
        if (rect || remaining <= 0) {
          resolve(rect);
          return;
        }
        remaining -= 1;
        window.requestAnimationFrame(poll);
      };
      poll();
    });
  }

  function makeCircleTexture(size = 32) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return PIXI.Texture.WHITE;
    const center = size * 0.5;
    const gradient = ctx.createRadialGradient(center, center, 1, center, center, center);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.92)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center, center, center, 0, Math.PI * 2);
    ctx.fill();
    return PIXI.Texture.from(canvas);
  }

  function createEffectAssets() {
    const assets = {
      ready: false,
      textures: {
        orbSoft: makeCircleTexture(36),
        orbSharp: makeCircleTexture(22)
      },
      styles: {
        healPlus: {
          fontFamily: 'Press Start 2P',
          fontSize: 22,
          stroke: { color: 0xffffff, width: 2 }
        }
      }
    };
    assets.ready = true;
    return assets;
  }

  const effectAssets = createEffectAssets();

  function destroyNode(node) {
    if (!node || node.destroyed) return;
    node.destroy();
  }

  function clearNodes(nodes) {
    nodes.forEach((node) => destroyNode(node));
  }

  function makeSoftOrb(texture, color, alpha, size) {
    const orb = new PIXI.Sprite(texture);
    orb.anchor.set(0.5);
    orb.tint = color;
    orb.alpha = alpha;
    orb.width = size;
    orb.height = size;
    return orb;
  }

  function runAnimation(nodes, duration, onUpdate) {
    const animation = {
      life: 0,
      done: false,
      tick: null
    };

    animation.tick = (ticker) => {
      if (animation.done) return;
      animation.life += ticker.deltaMS;
      const t = Math.min(1, animation.life / duration);
      onUpdate(t, animation.life);
      if (t >= 1) {
        animation.done = true;
        app.ticker.remove(animation.tick);
        activeAnimations.delete(animation);
        clearNodes(nodes);
      }
    };

    activeAnimations.add(animation);
    app.ticker.add(animation.tick);
    return animation;
  }

  const layer = {
    app,
    root,
    assets: effectAssets,
    active: false,
    perf: {
      frames: 0,
      elapsed: 0,
      avgFrameMS: 0,
      fps: 0
    },
    clearActiveEffects() {
      activeAnimations.forEach((animation) => {
        animation.done = true;
        if (animation.tick) app.ticker.remove(animation.tick);
      });
      activeAnimations.clear();
      root.removeChildren().forEach((node) => destroyNode(node));
    },
    pulse(color = 0x7cc4ff) {
      const ring = new PIXI.Graphics();
      ring.circle(0, 0, 18);
      ring.stroke({ width: 3, color, alpha: 0.95 });
      ring.x = app.screen.width * 0.5;
      ring.y = app.screen.height * 0.5;
      ring.alpha = 0.9;
      ring.scale.set(0.2);
      root.addChild(ring);
      runAnimation([ring], 420, (_, life) => {
        ring.scale.set(0.2 + life / 180);
        ring.alpha = Math.max(0, 0.9 - life / 420);
      });
    },
    pulseOnGameWrap(color = 0x7cc4ff) {
      const rect = getGameWrapRect();
      const center = getRectCenter(rect);
      if (!rect || !center) {
        this.pulse(color);
        return;
      }

      const ring = new PIXI.Graphics();
      const width = Math.max(220, rect.width * 0.9);
      const height = Math.max(160, rect.height * 0.78);
      ring.roundRect(-width / 2, -height / 2, width, height, 28);
      ring.stroke({ width: 4, color, alpha: 0.65 });
      ring.x = center.x;
      ring.y = center.y;
      ring.alpha = 0.75;
      ring.scale.set(0.96);
      root.addChild(ring);
      runAnimation([ring], 520, (t) => {
        ring.alpha = Math.max(0, 0.75 - t * 0.75);
        ring.scale.set(0.96 + t * 0.08);
      });
    },
    playCard(cardId, color = 0xf8fafc) {
      const rect = getCardRect(cardId);
      const center = getRectCenter(rect);
      if (!rect || !center) {
        this.pulseOnGameWrap(color);
        return;
      }

      const width = Math.max(44, rect.width * 0.92);
      const height = Math.max(62, rect.height * 0.92);

      const glow = makeSoftOrb(this.assets.textures.orbSoft, color, 0.18, Math.max(width, height) * 0.8);
      glow.x = center.x;
      glow.y = center.y;
      glow.scale.set(0.68);
      root.addChild(glow);

      const flash = new PIXI.Graphics();
      flash.roundRect(-width / 2, -height / 2, width, height, 18);
      flash.fill({ color, alpha: 0.12 });
      flash.x = center.x;
      flash.y = center.y;
      flash.scale.set(0.88);
      root.addChild(flash);

      const ring = new PIXI.Graphics();
      ring.roundRect(-width / 2, -height / 2, width, height, 18);
      ring.stroke({ width: 3, color, alpha: 0.88 });
      ring.x = center.x;
      ring.y = center.y;
      ring.scale.set(0.82);
      root.addChild(ring);

      const flare = new PIXI.Sprite(this.assets.textures.orbSharp);
      flare.anchor.set(0.5);
      flare.tint = color;
      flare.alpha = 0.9;
      flare.x = center.x;
      flare.y = center.y;
      flare.width = Math.max(14, rect.width * 0.14);
      flare.height = Math.max(14, rect.width * 0.14);
      root.addChild(flare);

      runAnimation([glow, flash, ring, flare], 320, (t) => {
        glow.alpha = Math.max(0, 0.18 - t * 0.18);
        glow.scale.set(0.68 + t * 0.72);
        flash.alpha = Math.max(0, 0.12 - t * 0.12);
        flash.scale.set(0.88 + t * 0.12);
        ring.alpha = Math.max(0, 0.88 - t * 0.88);
        ring.scale.set(0.82 + t * 0.2);
        flare.alpha = Math.max(0, 0.9 - t * 1.05);
        flare.scale.set(1 + t * 0.4);
      });
    },
    playSpellCard(cardId, color = 0x60a5fa) {
      const rect = getCardRect(cardId);
      const center = getRectCenter(rect);
      if (!rect || !center) {
        this.pulseOnGameWrap(color);
        return;
      }

      const width = Math.max(42, rect.width * 0.88);
      const height = Math.max(58, rect.height * 0.88);

      const veil = makeSoftOrb(this.assets.textures.orbSoft, color, 0.16, Math.max(width, height) * 0.92);
      veil.x = center.x;
      veil.y = center.y;
      veil.scale.set(0.74);
      root.addChild(veil);

      const ring = new PIXI.Graphics();
      ring.roundRect(-width / 2, -height / 2, width, height, 18);
      ring.stroke({ width: 3, color, alpha: 0.84 });
      ring.x = center.x;
      ring.y = center.y;
      ring.scale.set(0.86);
      root.addChild(ring);

      const orbA = new PIXI.Sprite(this.assets.textures.orbSharp);
      orbA.anchor.set(0.5);
      orbA.tint = color;
      orbA.alpha = 0.9;
      orbA.x = center.x - Math.max(18, rect.width * 0.18);
      orbA.y = center.y + Math.max(12, rect.height * 0.08);
      orbA.width = 14;
      orbA.height = 14;
      root.addChild(orbA);

      const orbB = new PIXI.Sprite(this.assets.textures.orbSharp);
      orbB.anchor.set(0.5);
      orbB.tint = color;
      orbB.alpha = 0.82;
      orbB.x = center.x + Math.max(18, rect.width * 0.18);
      orbB.y = center.y + Math.max(12, rect.height * 0.08);
      orbB.width = 12;
      orbB.height = 12;
      root.addChild(orbB);

      runAnimation([veil, ring, orbA, orbB], 360, (t) => {
        veil.alpha = Math.max(0, 0.16 - t * 0.16);
        veil.scale.set(0.74 + t * 0.58);
        ring.alpha = Math.max(0, 0.84 - t * 0.84);
        ring.scale.set(0.86 + t * 0.18);
        orbA.alpha = Math.max(0, 0.9 - t * 1.02);
        orbA.x = center.x - Math.max(18, rect.width * 0.18) + t * 16;
        orbA.y = center.y + Math.max(12, rect.height * 0.08) - t * 28;
        orbB.alpha = Math.max(0, 0.82 - t * 0.98);
        orbB.x = center.x + Math.max(18, rect.width * 0.18) - t * 16;
        orbB.y = center.y + Math.max(12, rect.height * 0.08) - t * 24;
      });
    },
    playTotemCard(cardId, color = 0x22d3ee) {
      const rect = getCardRect(cardId);
      const center = getRectCenter(rect);
      if (!rect || !center) {
        this.pulseOnGameWrap(color);
        return;
      }

      const base = makeSoftOrb(this.assets.textures.orbSoft, color, 0.18, Math.max(54, rect.width * 0.7));
      base.x = center.x;
      base.y = center.y + Math.max(10, rect.height * 0.14);
      root.addChild(base);

      const ring = new PIXI.Graphics();
      ring.roundRect(
        -Math.max(34, rect.width * 0.44),
        -Math.max(50, rect.height * 0.44),
        Math.max(68, rect.width * 0.88),
        Math.max(100, rect.height * 0.88),
        18
      );
      ring.stroke({ width: 3, color, alpha: 0.8 });
      ring.x = center.x;
      ring.y = center.y;
      ring.scale.set(0.84);
      root.addChild(ring);

      const crest = new PIXI.Sprite(this.assets.textures.orbSharp);
      crest.anchor.set(0.5);
      crest.tint = color;
      crest.alpha = 0.88;
      crest.x = center.x;
      crest.y = center.y - Math.max(18, rect.height * 0.18);
      crest.width = 16;
      crest.height = 16;
      root.addChild(crest);

      runAnimation([base, ring, crest], 380, (t) => {
        base.alpha = Math.max(0, 0.18 - t * 0.18);
        base.scale.set(1 + t * 0.42, 0.86 + t * 0.18);
        ring.alpha = Math.max(0, 0.8 - t * 0.8);
        ring.scale.set(0.84 + t * 0.18);
        crest.alpha = Math.max(0, 0.88 - t);
        crest.y = center.y - Math.max(18, rect.height * 0.18) - t * 18;
        crest.scale.set(1 + t * 0.28);
      });
    },
    hitCard(cardId, color = 0xfb7185) {
      const rect = getCardRect(cardId);
      const center = getRectCenter(rect);
      if (!rect || !center) {
        this.pulse(color);
        return;
      }

      const burst = makeSoftOrb(this.assets.textures.orbSoft, color, 0.26, Math.max(34, Math.min(rect.width, rect.height) * 0.48));
      burst.x = center.x;
      burst.y = center.y;
      root.addChild(burst);

      const flare = new PIXI.Sprite(this.assets.textures.orbSharp);
      flare.anchor.set(0.5);
      flare.tint = color;
      flare.alpha = 0.9;
      flare.x = center.x;
      flare.y = center.y;
      flare.width = Math.max(16, rect.width * 0.18);
      flare.height = Math.max(16, rect.width * 0.18);
      root.addChild(flare);

      const ring = new PIXI.Graphics();
      const ringW = Math.max(34, rect.width * 0.9);
      const ringH = Math.max(48, rect.height * 0.9);
      ring.roundRect(-ringW / 2, -ringH / 2, ringW, ringH, 18);
      ring.stroke({ width: 4, color, alpha: 0.95 });
      ring.x = center.x;
      ring.y = center.y;
      ring.scale.set(0.92);
      root.addChild(ring);

      const slashA = new PIXI.Graphics();
      slashA.moveTo(-18, -18);
      slashA.lineTo(18, 18);
      slashA.stroke({ width: 5, color, alpha: 0.92, cap: 'round' });
      slashA.x = center.x;
      slashA.y = center.y;
      root.addChild(slashA);

      const slashB = new PIXI.Graphics();
      slashB.moveTo(18, -18);
      slashB.lineTo(-18, 18);
      slashB.stroke({ width: 5, color, alpha: 0.92, cap: 'round' });
      slashB.x = center.x;
      slashB.y = center.y;
      root.addChild(slashB);

      runAnimation([burst, flare, ring, slashA, slashB], 260, (t) => {
        burst.alpha = Math.max(0, 0.26 - t * 0.26);
        burst.scale.set(1 + t * 1.05);
        flare.alpha = Math.max(0, 0.9 - t * 1.15);
        flare.scale.set(1 + t * 0.5);
        ring.alpha = Math.max(0, 0.95 - t * 0.95);
        ring.scale.set(0.92 + t * 0.2);
        slashA.alpha = Math.max(0, 0.92 - t * 1.08);
        slashB.alpha = Math.max(0, 0.92 - t * 1.08);
        slashA.scale.set(1 + t * 0.18);
        slashB.scale.set(1 + t * 0.18);
      });
    },
    hitFace(side = 'ai', color = 0xfb7185) {
      const rect = getFaceRect(side);
      const center = getRectCenter(rect);
      if (!rect || !center) {
        this.pulse(color);
        return;
      }

      const burst = makeSoftOrb(this.assets.textures.orbSoft, color, 0.22, Math.max(42, Math.min(rect.width || 72, rect.height || 72) * 1.1));
      burst.x = center.x;
      burst.y = center.y;
      root.addChild(burst);

      const ring = new PIXI.Graphics();
      const radius = Math.max(24, Math.max(rect.width || 48, rect.height || 48) * 0.52);
      ring.circle(0, 0, radius);
      ring.stroke({ width: 4, color, alpha: 0.9 });
      ring.x = center.x;
      ring.y = center.y;
      ring.scale.set(0.8);
      root.addChild(ring);

      const slashA = new PIXI.Graphics();
      slashA.moveTo(-16, -16);
      slashA.lineTo(16, 16);
      slashA.stroke({ width: 5, color, alpha: 0.9, cap: 'round' });
      slashA.x = center.x;
      slashA.y = center.y;
      root.addChild(slashA);

      const slashB = new PIXI.Graphics();
      slashB.moveTo(16, -16);
      slashB.lineTo(-16, 16);
      slashB.stroke({ width: 5, color, alpha: 0.9, cap: 'round' });
      slashB.x = center.x;
      slashB.y = center.y;
      root.addChild(slashB);

      runAnimation([burst, ring, slashA, slashB], 280, (t) => {
        burst.alpha = Math.max(0, 0.22 - t * 0.22);
        burst.scale.set(1 + t * 0.9);
        ring.alpha = Math.max(0, 0.9 - t * 0.9);
        ring.scale.set(0.8 + t * 0.26);
        slashA.alpha = Math.max(0, 0.9 - t);
        slashB.alpha = Math.max(0, 0.9 - t);
        slashA.scale.set(1 + t * 0.16);
        slashB.scale.set(1 + t * 0.16);
      });
    },
    explodeCard(cardId, color = 0xffa861) {
      const rect = getCardRect(cardId);
      const center = getRectCenter(rect);
      if (!rect || !center) {
        this.pulseOnGameWrap(color);
        return;
      }

      const burst = makeSoftOrb(this.assets.textures.orbSoft, color, 0.28, Math.max(52, Math.max(rect.width, rect.height) * 0.7));
      burst.x = center.x;
      burst.y = center.y;
      root.addChild(burst);

      const flareA = new PIXI.Sprite(this.assets.textures.orbSharp);
      flareA.anchor.set(0.5);
      flareA.tint = color;
      flareA.alpha = 0.92;
      flareA.x = center.x - 10;
      flareA.y = center.y + 8;
      flareA.width = 18;
      flareA.height = 18;
      root.addChild(flareA);

      const flareB = new PIXI.Sprite(this.assets.textures.orbSharp);
      flareB.anchor.set(0.5);
      flareB.tint = 0xfb7185;
      flareB.alpha = 0.82;
      flareB.x = center.x + 12;
      flareB.y = center.y - 4;
      flareB.width = 14;
      flareB.height = 14;
      root.addChild(flareB);

      const ring = new PIXI.Graphics();
      ring.roundRect(-Math.max(34, rect.width * 0.46), -Math.max(50, rect.height * 0.46), Math.max(68, rect.width * 0.92), Math.max(100, rect.height * 0.92), 18);
      ring.stroke({ width: 4, color, alpha: 0.88 });
      ring.x = center.x;
      ring.y = center.y;
      ring.scale.set(0.82);
      root.addChild(ring);

      runAnimation([burst, flareA, flareB, ring], 340, (t) => {
        burst.alpha = Math.max(0, 0.28 - t * 0.28);
        burst.scale.set(1 + t * 1.02);
        flareA.alpha = Math.max(0, 0.92 - t);
        flareA.x = center.x - 10 - t * 16;
        flareA.y = center.y + 8 - t * 24;
        flareB.alpha = Math.max(0, 0.82 - t);
        flareB.x = center.x + 12 + t * 14;
        flareB.y = center.y - 4 - t * 18;
        ring.alpha = Math.max(0, 0.88 - t * 0.88);
        ring.scale.set(0.82 + t * 0.3);
      });
    },
    themedImpact(cardId, payload = {}) {
      const palette = resolveContextPalette(payload, 'damage');
      const rect = getCardRect(cardId);
      const center = getRectCenter(rect);
      if (!rect || !center) {
        this.pulseOnGameWrap(palette.primary);
        return;
      }

      const burst = makeSoftOrb(this.assets.textures.orbSoft, palette.primary, 0.24, Math.max(38, Math.min(rect.width, rect.height) * 0.54));
      burst.x = center.x;
      burst.y = center.y;
      root.addChild(burst);

      const ring = new PIXI.Graphics();
      ring.roundRect(-Math.max(34, rect.width * 0.46), -Math.max(50, rect.height * 0.46), Math.max(68, rect.width * 0.92), Math.max(100, rect.height * 0.92), 18);
      ring.stroke({ width: 4, color: palette.primary, alpha: 0.92 });
      ring.x = center.x;
      ring.y = center.y;
      ring.scale.set(0.88);
      root.addChild(ring);

      const trailA = new PIXI.Graphics();
      trailA.moveTo(-20, -16);
      trailA.lineTo(20, 16);
      trailA.stroke({ width: 5, color: palette.secondary, alpha: 0.92, cap: 'round' });
      trailA.x = center.x;
      trailA.y = center.y;
      root.addChild(trailA);

      const trailB = new PIXI.Graphics();
      trailB.moveTo(16, -18);
      trailB.lineTo(-16, 18);
      trailB.stroke({ width: 4, color: palette.accent, alpha: 0.78, cap: 'round' });
      trailB.x = center.x;
      trailB.y = center.y;
      root.addChild(trailB);

      const spark = new PIXI.Sprite(this.assets.textures.orbSharp);
      spark.anchor.set(0.5);
      spark.tint = palette.accent;
      spark.alpha = 0.92;
      spark.x = center.x;
      spark.y = center.y;
      spark.width = 14;
      spark.height = 14;
      root.addChild(spark);

      runAnimation([burst, ring, trailA, trailB, spark], 280, (t) => {
        burst.alpha = Math.max(0, 0.24 - t * 0.24);
        burst.scale.set(1 + t * 1.05);
        ring.alpha = Math.max(0, 0.92 - t * 0.92);
        ring.scale.set(0.88 + t * 0.24);
        trailA.alpha = Math.max(0, 0.92 - t * 1.04);
        trailA.scale.set(1 + t * 0.18);
        trailB.alpha = Math.max(0, 0.78 - t * 0.94);
        trailB.scale.set(1 + t * 0.24);
        spark.alpha = Math.max(0, 0.92 - t * 1.08);
        spark.scale.set(1 + t * 0.4);
      });
    },
    themedFace(side = 'ai', payload = {}) {
      const palette = resolveContextPalette(payload, 'damage');
      const rect = getFaceRect(side);
      const center = getRectCenter(rect);
      if (!rect || !center) {
        this.pulse(palette.face);
        return;
      }

      const burst = makeSoftOrb(this.assets.textures.orbSoft, palette.face, 0.2, Math.max(46, Math.min(rect.width || 72, rect.height || 72) * 1.16));
      burst.x = center.x;
      burst.y = center.y;
      root.addChild(burst);

      const ring = new PIXI.Graphics();
      ring.circle(0, 0, Math.max(24, Math.max(rect.width || 48, rect.height || 48) * 0.56));
      ring.stroke({ width: 4, color: palette.primary, alpha: 0.88 });
      ring.x = center.x;
      ring.y = center.y;
      ring.scale.set(0.82);
      root.addChild(ring);

      const slash = new PIXI.Graphics();
      slash.moveTo(-18, -14);
      slash.lineTo(18, 14);
      slash.stroke({ width: 5, color: palette.secondary, alpha: 0.88, cap: 'round' });
      slash.x = center.x;
      slash.y = center.y;
      root.addChild(slash);

      const spark = new PIXI.Sprite(this.assets.textures.orbSharp);
      spark.anchor.set(0.5);
      spark.tint = palette.accent;
      spark.alpha = 0.86;
      spark.x = center.x + 2;
      spark.y = center.y - 2;
      spark.width = 12;
      spark.height = 12;
      root.addChild(spark);

      runAnimation([burst, ring, slash, spark], 280, (t) => {
        burst.alpha = Math.max(0, 0.2 - t * 0.2);
        burst.scale.set(1 + t * 0.96);
        ring.alpha = Math.max(0, 0.88 - t * 0.88);
        ring.scale.set(0.82 + t * 0.24);
        slash.alpha = Math.max(0, 0.88 - t);
        slash.scale.set(1 + t * 0.16);
        spark.alpha = Math.max(0, 0.86 - t * 1.02);
        spark.scale.set(1 + t * 0.28);
      });
    },
    healCard(cardId, color = 0x4ade80) {
      const rect = getCardRect(cardId);
      const center = getRectCenter(rect);
      if (!rect || !center) {
        this.pulse(color);
        return;
      }

      const glow = makeSoftOrb(this.assets.textures.orbSoft, color, 0.22, Math.max(42, Math.min(rect.width, rect.height) * 0.62));
      glow.x = center.x;
      glow.y = center.y;
      root.addChild(glow);

      const softColumn = new PIXI.Sprite(this.assets.textures.orbSoft);
      softColumn.anchor.set(0.5);
      softColumn.tint = color;
      softColumn.alpha = 0.22;
      softColumn.x = center.x;
      softColumn.y = center.y;
      softColumn.width = Math.max(24, rect.width * 0.42);
      softColumn.height = Math.max(58, rect.height * 0.82);
      root.addChild(softColumn);

      const ring = new PIXI.Graphics();
      const ringW = Math.max(34, rect.width * 0.92);
      const ringH = Math.max(48, rect.height * 0.92);
      ring.roundRect(-ringW / 2, -ringH / 2, ringW, ringH, 18);
      ring.stroke({ width: 4, color, alpha: 0.9 });
      ring.x = center.x;
      ring.y = center.y;
      ring.scale.set(0.9);
      root.addChild(ring);

      const plus = new PIXI.Text({
        text: '+',
        style: {
          ...this.assets.styles.healPlus,
          fill: color
        }
      });
      plus.anchor.set(0.5);
      plus.x = center.x;
      plus.y = center.y;
      plus.alpha = 1;
      root.addChild(plus);
      runAnimation([glow, softColumn, ring, plus], 360, (t) => {
        glow.alpha = Math.max(0, 0.22 - t * 0.22);
        glow.scale.set(1 + t * 0.65);
        softColumn.alpha = Math.max(0, 0.22 - t * 0.24);
        softColumn.scale.set(0.92 + t * 0.16, 0.9 + t * 0.24);
        ring.alpha = Math.max(0, 0.9 - t * 0.9);
        ring.scale.set(0.9 + t * 0.18);
        plus.alpha = Math.max(0, 1 - t * 1.1);
        plus.scale.set(1 + t * 0.18);
        plus.y = center.y - t * 24;
      });
    },
    manaCard(cardId, color = 0x60a5fa) {
      const rect = getCardRect(cardId);
      const center = getRectCenter(rect);
      if (!rect || !center) {
        this.pulse(color);
        return;
      }

      const ring = new PIXI.Graphics();
      const ringW = Math.max(30, rect.width * 0.78);
      const ringH = Math.max(42, rect.height * 0.78);
      ring.roundRect(-ringW / 2, -ringH / 2, ringW, ringH, 16);
      ring.stroke({ width: 3, color, alpha: 0.88 });
      ring.x = center.x;
      ring.y = center.y;
      ring.scale.set(0.88);
      root.addChild(ring);

      const orb = new PIXI.Sprite(this.assets.textures.orbSharp);
      orb.anchor.set(0.5);
      orb.tint = color;
      orb.alpha = 0.85;
      orb.x = center.x;
      orb.y = center.y + Math.min(14, rect.height * 0.12);
      orb.width = 18;
      orb.height = 18;
      root.addChild(orb);

      const trail = new PIXI.Sprite(this.assets.textures.orbSoft);
      trail.anchor.set(0.5);
      trail.tint = color;
      trail.alpha = 0.18;
      trail.x = center.x;
      trail.y = center.y + Math.min(12, rect.height * 0.1);
      trail.width = Math.max(16, rect.width * 0.18);
      trail.height = Math.max(42, rect.height * 0.48);
      root.addChild(trail);

      runAnimation([ring, orb, trail], 320, (t) => {
        ring.alpha = Math.max(0, 0.88 - t * 0.88);
        ring.scale.set(0.88 + t * 0.22);
        orb.alpha = Math.max(0, 0.85 - t * 0.85);
        orb.y = center.y + Math.min(14, rect.height * 0.12) - t * 30;
        orb.scale.set(1 - t * 0.18);
        trail.alpha = Math.max(0, 0.18 - t * 0.2);
        trail.y = center.y + Math.min(12, rect.height * 0.1) - t * 18;
        trail.scale.set(1 - t * 0.16, 1 + t * 0.16);
      });
    },
    buffCard(cardId, color = 0xfacc15) {
      const rect = getCardRect(cardId);
      const center = getRectCenter(rect);
      if (!rect || !center) {
        this.pulse(color);
        return;
      }

      const glow = new PIXI.Graphics();
      glow.roundRect(
        -Math.max(36, rect.width * 0.48),
        -Math.max(52, rect.height * 0.48),
        Math.max(72, rect.width * 0.96),
        Math.max(104, rect.height * 0.96),
        18
      );
      glow.fill({ color, alpha: 0.14 });
      glow.x = center.x;
      glow.y = center.y;
      glow.scale.set(0.96);
      root.addChild(glow);

      const crest = new PIXI.Sprite(this.assets.textures.orbSharp);
      crest.anchor.set(0.5);
      crest.tint = color;
      crest.alpha = 0.9;
      crest.x = center.x;
      crest.y = center.y - Math.min(18, rect.height * 0.16);
      crest.width = 16;
      crest.height = 16;
      root.addChild(crest);

      const ring = new PIXI.Graphics();
      ring.roundRect(
        -Math.max(34, rect.width * 0.46),
        -Math.max(50, rect.height * 0.46),
        Math.max(68, rect.width * 0.92),
        Math.max(100, rect.height * 0.92),
        18
      );
      ring.stroke({ width: 3, color, alpha: 0.82 });
      ring.x = center.x;
      ring.y = center.y;
      ring.scale.set(0.94);
      root.addChild(ring);
      runAnimation([glow, ring, crest], 340, (t) => {
        glow.alpha = Math.max(0, 0.14 - t * 0.14);
        glow.scale.set(0.96 + t * 0.18);
        ring.alpha = Math.max(0, 0.82 - t * 0.82);
        ring.scale.set(0.94 + t * 0.15);
        crest.alpha = Math.max(0, 0.9 - t * 0.95);
        crest.y = center.y - Math.min(18, rect.height * 0.16) - t * 14;
        crest.scale.set(1 + t * 0.24);
      });
    },
    debuffCard(cardId, color = 0xf97316) {
      const rect = getCardRect(cardId);
      const center = getRectCenter(rect);
      if (!rect || !center) {
        this.pulse(color);
        return;
      }

      const slashA = new PIXI.Graphics();
      slashA.moveTo(-12, -12);
      slashA.lineTo(12, 12);
      slashA.stroke({ width: 4, color, alpha: 0.92, cap: 'round' });
      slashA.x = center.x;
      slashA.y = center.y;
      root.addChild(slashA);

      const slashB = new PIXI.Graphics();
      slashB.moveTo(12, -12);
      slashB.lineTo(-12, 12);
      slashB.stroke({ width: 4, color, alpha: 0.92, cap: 'round' });
      slashB.x = center.x;
      slashB.y = center.y;
      root.addChild(slashB);

      const ring = new PIXI.Graphics();
      ring.roundRect(
        -Math.max(34, rect.width * 0.46),
        -Math.max(50, rect.height * 0.46),
        Math.max(68, rect.width * 0.92),
        Math.max(100, rect.height * 0.92),
        18
      );
      ring.stroke({ width: 3, color, alpha: 0.78 });
      ring.x = center.x;
      ring.y = center.y;
      root.addChild(ring);

      const sink = makeSoftOrb(this.assets.textures.orbSoft, color, 0.16, Math.max(28, rect.width * 0.46));
      sink.x = center.x;
      sink.y = center.y;
      root.addChild(sink);

      runAnimation([slashA, slashB, ring, sink], 260, (t) => {
        slashA.alpha = Math.max(0, 0.92 - t * 0.92);
        slashB.alpha = Math.max(0, 0.92 - t * 0.92);
        slashA.scale.set(1 + t * 0.18);
        slashB.scale.set(1 + t * 0.18);
        ring.alpha = Math.max(0, 0.78 - t * 0.78);
        ring.scale.set(1 + t * 0.12);
        sink.alpha = Math.max(0, 0.16 - t * 0.18);
        sink.scale.set(1 - t * 0.1, 1 - t * 0.18);
      });
    },
    themedPlay(cardId, payload = {}) {
      const palette = resolvePlayPalette(payload);
      if (payload.type === 'spell' || payload.stance === 'spell') {
        this.playSpellCard(cardId, palette.primary);
        return;
      }
      if (payload.type === 'totem' || payload.stance === 'totem') {
        this.playTotemCard(cardId, palette.primary);
        return;
      }
      this.playCard(cardId, palette.primary);
    },
    themedBuff(cardId, payload = {}, kind = 'buff') {
      const palette = resolveContextPalette(payload, kind === 'debuff' ? 'debuff' : 'buff');
      if (kind === 'debuff') {
        this.debuffCard(cardId, palette.primary);
        return;
      }
      this.buffCard(cardId, palette.primary);
    },
    themedSustain(cardId, payload = {}, kind = 'heal') {
      const palette = resolveContextPalette(payload, kind === 'mana' ? 'mana' : 'heal');
      if (kind === 'mana') {
        this.manaCard(cardId, palette.primary);
        return;
      }
      this.healCard(cardId, palette.primary);
    },
    abilityCue(cardId, payload = {}) {
      const palette = resolveAbilityPalette(payload);
      const rect = getCardRect(cardId);
      const center = getRectCenter(rect);
      if (!rect || !center) {
        this.pulseOnGameWrap(palette.primary);
        return;
      }

      const veil = makeSoftOrb(this.assets.textures.orbSoft, palette.primary, 0.16, Math.max(52, Math.max(rect.width, rect.height) * 0.72));
      veil.x = center.x;
      veil.y = center.y;
      root.addChild(veil);

      const crest = new PIXI.Sprite(this.assets.textures.orbSharp);
      crest.anchor.set(0.5);
      crest.tint = palette.accent;
      crest.alpha = 0.9;
      crest.x = center.x;
      crest.y = center.y - Math.min(18, rect.height * 0.16);
      crest.width = 14;
      crest.height = 14;
      root.addChild(crest);

      const ring = new PIXI.Graphics();
      ring.roundRect(-Math.max(34, rect.width * 0.46), -Math.max(50, rect.height * 0.46), Math.max(68, rect.width * 0.92), Math.max(100, rect.height * 0.92), 18);
      ring.stroke({ width: 3, color: palette.secondary, alpha: 0.82 });
      ring.x = center.x;
      ring.y = center.y;
      ring.scale.set(0.94);
      root.addChild(ring);

      runAnimation([veil, crest, ring], 320, (t) => {
        veil.alpha = Math.max(0, 0.16 - t * 0.16);
        veil.scale.set(1 + t * 0.56);
        crest.alpha = Math.max(0, 0.9 - t);
        crest.y = center.y - Math.min(18, rect.height * 0.16) - t * 18;
        crest.scale.set(1 + t * 0.24);
        ring.alpha = Math.max(0, 0.82 - t * 0.82);
        ring.scale.set(0.94 + t * 0.14);
      });
    },
    screenSlash(payload = {}) {
      const x = typeof payload.x === 'number' ? payload.x : app.screen.width * 0.5;
      const y = typeof payload.y === 'number' ? payload.y : app.screen.height * 0.5;
      const angle = typeof payload.angle === 'number' ? payload.angle : 0;
      const palette = resolveContextPalette(payload, 'damage');

      const slash = new PIXI.Graphics();
      slash.moveTo(-56, 0);
      slash.lineTo(56, 0);
      slash.stroke({ width: 7, color: palette.primary, alpha: 0.92, cap: 'round' });
      slash.x = x;
      slash.y = y;
      slash.rotation = angle * (Math.PI / 180);
      root.addChild(slash);

      const echo = new PIXI.Graphics();
      echo.moveTo(-46, 0);
      echo.lineTo(46, 0);
      echo.stroke({ width: 4, color: palette.accent, alpha: 0.76, cap: 'round' });
      echo.x = x;
      echo.y = y;
      echo.rotation = slash.rotation;
      root.addChild(echo);

      const burst = makeSoftOrb(this.assets.textures.orbSoft, palette.secondary, 0.14, 48);
      burst.x = x;
      burst.y = y;
      root.addChild(burst);

      runAnimation([slash, echo, burst], 220, (t) => {
        slash.alpha = Math.max(0, 0.92 - t * 1.1);
        slash.scale.set(1 + t * 0.26, 1);
        echo.alpha = Math.max(0, 0.76 - t);
        echo.scale.set(1 + t * 0.18, 1);
        burst.alpha = Math.max(0, 0.14 - t * 0.16);
        burst.scale.set(1 + t * 0.7);
      });
    },
    impactRing(payload = {}) {
      const x = typeof payload.x === 'number' ? payload.x : app.screen.width * 0.5;
      const y = typeof payload.y === 'number' ? payload.y : app.screen.height * 0.5;
      const palette = resolveContextPalette(payload, 'damage');

      const ring = new PIXI.Graphics();
      ring.circle(0, 0, 12);
      ring.stroke({ width: 4, color: palette.primary, alpha: 0.9 });
      ring.x = x;
      ring.y = y;
      ring.scale.set(0.24);
      root.addChild(ring);

      runAnimation([ring], 340, (t) => {
        ring.alpha = Math.max(0, 0.9 - t * 0.94);
        ring.scale.set(0.24 + t * 1.9);
      });
    },
    attackArrow(payload = {}) {
      if (!payload || payload.active === false) return;
      const fromX = typeof payload.fromX === 'number' ? payload.fromX : app.screen.width * 0.35;
      const fromY = typeof payload.fromY === 'number' ? payload.fromY : app.screen.height * 0.65;
      const toX = typeof payload.toX === 'number' ? payload.toX : app.screen.width * 0.68;
      const toY = typeof payload.toY === 'number' ? payload.toY : app.screen.height * 0.42;
      const palette = resolveContextPalette(payload, 'mana');

      const dx = toX - fromX;
      const dy = toY - fromY;
      const len = Math.max(1, Math.hypot(dx, dy));
      const ux = dx / len;
      const uy = dy / len;
      const baseX = toX - ux * 20;
      const baseY = toY - uy * 20;
      const nx = -uy * 8;
      const ny = ux * 8;

      const line = new PIXI.Graphics();
      line.moveTo(fromX, fromY);
      line.lineTo(baseX, baseY);
      line.stroke({ width: 5, color: palette.primary, alpha: 0.86, cap: 'round' });
      root.addChild(line);

      const head = new PIXI.Graphics();
      head.poly([toX, toY, baseX + nx, baseY + ny, baseX - nx, baseY - ny]);
      head.fill({ color: palette.accent, alpha: 0.96 });
      root.addChild(head);

      runAnimation([line, head], 220, (t) => {
        line.alpha = Math.max(0, 0.86 - t);
        head.alpha = Math.max(0, 0.96 - t * 1.08);
      });
    },
    characterCue(cardId, payload = {}) {
      const palette = resolveCharacterPalette(payload);
      const stage = payload.stage || 'attack';
      const rect = getCardRect(cardId);
      const center = getRectCenter(rect);
      if (!rect || !center) {
        this.pulseOnGameWrap(palette.primary);
        return;
      }

      const ring = new PIXI.Graphics();
      ring.roundRect(-Math.max(34, rect.width * 0.46), -Math.max(50, rect.height * 0.46), Math.max(68, rect.width * 0.92), Math.max(100, rect.height * 0.92), 18);
      ring.stroke({ width: 3, color: palette.primary, alpha: 0.84 });
      ring.x = center.x;
      ring.y = center.y;
      ring.scale.set(stage === 'death' ? 0.92 : 0.88);
      root.addChild(ring);

      const orb = makeSoftOrb(this.assets.textures.orbSoft, stage === 'hit' ? palette.secondary : palette.primary, stage === 'hit' ? 0.14 : 0.18, Math.max(42, Math.max(rect.width, rect.height) * 0.58));
      orb.x = center.x;
      orb.y = center.y;
      root.addChild(orb);

      const crest = new PIXI.Sprite(this.assets.textures.orbSharp);
      crest.anchor.set(0.5);
      crest.tint = palette.accent;
      crest.alpha = 0.86;
      crest.x = center.x;
      crest.y = center.y + (stage === 'attack' ? -10 : 0);
      crest.width = 14;
      crest.height = 14;
      root.addChild(crest);

      runAnimation([ring, orb, crest], stage === 'death' ? 360 : 260, (t) => {
        ring.alpha = Math.max(0, 0.84 - t * 0.84);
        ring.scale.set((stage === 'death' ? 0.92 : 0.88) + t * (stage === 'hit' ? 0.12 : 0.18));
        orb.alpha = Math.max(0, (stage === 'hit' ? 0.14 : 0.18) - t * 0.18);
        orb.scale.set(1 + t * (stage === 'death' ? 0.86 : 0.5));
        crest.alpha = Math.max(0, 0.86 - t);
        crest.y = center.y + (stage === 'attack' ? -10 : 0) - t * (stage === 'death' ? 22 : 12);
        crest.scale.set(1 + t * 0.24);
      });
    },
    deathBurn(cardId, payload = {}) {
      const palette = resolveContextPalette(payload, 'damage');
      const rect = getCardRect(cardId);
      const center = getRectCenter(rect);
      if (!rect || !center) {
        this.pulseOnGameWrap(palette.primary);
        return;
      }

      const veil = makeSoftOrb(this.assets.textures.orbSoft, palette.primary, 0.2, Math.max(56, Math.max(rect.width, rect.height) * 0.72));
      veil.x = center.x;
      veil.y = center.y;
      root.addChild(veil);

      const emberA = new PIXI.Sprite(this.assets.textures.orbSharp);
      emberA.anchor.set(0.5);
      emberA.tint = palette.primary;
      emberA.alpha = 0.84;
      emberA.x = center.x - 10;
      emberA.y = center.y + 16;
      emberA.width = 12;
      emberA.height = 12;
      root.addChild(emberA);

      const emberB = new PIXI.Sprite(this.assets.textures.orbSharp);
      emberB.anchor.set(0.5);
      emberB.tint = palette.secondary;
      emberB.alpha = 0.72;
      emberB.x = center.x + 12;
      emberB.y = center.y + 10;
      emberB.width = 10;
      emberB.height = 10;
      root.addChild(emberB);

      runAnimation([veil, emberA, emberB], 420, (t) => {
        veil.alpha = Math.max(0, 0.2 - t * 0.2);
        veil.scale.set(1 + t * 0.96);
        emberA.alpha = Math.max(0, 0.84 - t);
        emberA.y = center.y + 16 - t * 38;
        emberB.alpha = Math.max(0, 0.72 - t * 0.92);
        emberB.y = center.y + 10 - t * 32;
      });
    },
    textFloat(cardId, payload = {}) {
      const palette = resolveTextPalette(payload);
      const rect = getCardRect(cardId);
      const center = getRectCenter(rect);
      if (!rect || !center) {
        this.pulseOnGameWrap(palette.primary);
        return;
      }

      const text = new PIXI.Text({
        text: String(payload.text || ''),
        style: {
          fontFamily: 'Press Start 2P',
          fontSize: 16,
          fill: palette.primary,
          stroke: { color: 0x08121f, width: 4 }
        }
      });
      text.anchor.set(0.5);
      text.x = center.x;
      text.y = center.y;
      text.alpha = 1;
      root.addChild(text);

      const glow = makeSoftOrb(this.assets.textures.orbSoft, palette.secondary, 0.1, Math.max(24, rect.width * 0.24));
      glow.x = center.x;
      glow.y = center.y + 4;
      root.addChild(glow);

      runAnimation([text, glow], 620, (t) => {
        text.alpha = Math.max(0, 1 - t * 1.08);
        text.scale.set(1 + t * 0.08);
        text.y = center.y - t * 42;
        glow.alpha = Math.max(0, 0.1 - t * 0.12);
        glow.y = center.y + 4 - t * 18;
        glow.scale.set(1 + t * 0.24);
      });
    },
    banner(payload = {}) {
      const rect = getGameWrapRect();
      const center = getRectCenter(rect) || { x: app.screen.width * 0.5, y: app.screen.height * 0.28 };
      const palette = resolveContextPalette(payload, payload.kind === 'victory' ? 'heal' : 'mana');

      const title = new PIXI.Text({
        text: String(payload.title || ''),
        style: {
          fontFamily: 'Press Start 2P',
          fontSize: 22,
          fill: palette.primary,
          stroke: { color: 0x08121f, width: 5 }
        }
      });
      title.anchor.set(0.5);
      title.x = center.x;
      title.y = center.y;
      root.addChild(title);

      const sub = payload.subtitle ? new PIXI.Text({
        text: String(payload.subtitle),
        style: {
          fontFamily: 'Press Start 2P',
          fontSize: 11,
          fill: palette.accent,
          stroke: { color: 0x08121f, width: 3 }
        }
      }) : null;
      if (sub) {
        sub.anchor.set(0.5);
        sub.x = center.x;
        sub.y = center.y + 34;
        root.addChild(sub);
      }

      const ring = new PIXI.Graphics();
      ring.roundRect(-Math.max(120, (rect && rect.width ? rect.width * 0.24 : 240)), -28, Math.max(240, (rect && rect.width ? rect.width * 0.48 : 480)), 74, 20);
      ring.stroke({ width: 3, color: palette.secondary, alpha: 0.76 });
      ring.x = center.x;
      ring.y = center.y + 4;
      root.addChild(ring);

      const nodes = sub ? [title, sub, ring] : [title, ring];
      runAnimation(nodes, 780, (t) => {
        title.alpha = Math.max(0, 1 - t * 1.05);
        title.y = center.y - t * 12;
        ring.alpha = Math.max(0, 0.76 - t * 0.82);
        ring.scale.set(1 + t * 0.05, 1 + t * 0.08);
        if (sub) {
          sub.alpha = Math.max(0, 0.92 - t);
          sub.y = center.y + 34 - t * 10;
        }
      });
    },
    meterPulse(payload = {}) {
      const side = payload.side || 'player';
      const kind = payload.kind || 'hit';
      const rect = getFaceRect(side);
      const center = getRectCenter(rect);
      const palette = resolveContextPalette(payload, kind === 'mana' ? 'mana' : (kind === 'heal' ? 'heal' : 'damage'));
      if (!rect || !center) {
        this.pulse(palette.primary);
        return;
      }

      const width = Math.max(70, (rect.width || 120) * 1.2);
      const height = Math.max(24, (rect.height || 30) * 0.9);

      const ring = new PIXI.Graphics();
      ring.roundRect(-width / 2, -height / 2, width, height, 14);
      ring.stroke({ width: 3, color: palette.primary, alpha: 0.78 });
      ring.x = center.x;
      ring.y = center.y;
      root.addChild(ring);

      const glow = new PIXI.Graphics();
      glow.roundRect(-width / 2, -height / 2, width, height, 14);
      glow.fill({ color: palette.secondary, alpha: 0.12 });
      glow.x = center.x;
      glow.y = center.y;
      root.addChild(glow);

      runAnimation([ring, glow], 280, (t) => {
        ring.alpha = Math.max(0, 0.78 - t * 0.84);
        ring.scale.set(1 + t * 0.08, 1 + t * 0.16);
        glow.alpha = Math.max(0, 0.12 - t * 0.14);
      });
    },
    turnUiPulse(payload = {}) {
      const playerTurn = payload.yourTurn !== false && payload.side !== 'ai';
      const base = playerTurn
        ? { primary: 0x7cc4ff, secondary: 0x93c5fd, accent: 0xe0f2fe }
        : { primary: 0xfb7185, secondary: 0xffa861, accent: 0xfecdd3 };
      const selectors = playerTurn
        ? ['#turnIndicator', '#endTurnBtn', '#instantWinBtn']
        : ['#turnIndicator'];
      const nodes = [];

      selectors.forEach((selector, index) => {
        const rect = getElementRect(selector);
        const center = getRectCenter(rect);
        if (!rect || !center) return;

        const glow = new PIXI.Graphics();
        glow.roundRect(
          -Math.max(56, rect.width * 0.52),
          -Math.max(18, rect.height * 0.52),
          Math.max(112, rect.width * 1.04),
          Math.max(36, rect.height * 1.04),
          16
        );
        glow.fill({ color: index === 0 ? base.secondary : base.primary, alpha: index === 0 ? 0.12 : 0.1 });
        glow.x = center.x;
        glow.y = center.y;
        glow.scale.set(0.96);
        root.addChild(glow);

        const ring = new PIXI.Graphics();
        ring.roundRect(
          -Math.max(58, rect.width * 0.54),
          -Math.max(20, rect.height * 0.56),
          Math.max(116, rect.width * 1.08),
          Math.max(40, rect.height * 1.12),
          16
        );
        ring.stroke({ width: 3, color: index === 0 ? base.secondary : base.primary, alpha: 0.82 });
        ring.x = center.x;
        ring.y = center.y;
        ring.scale.set(0.94);
        root.addChild(ring);
        nodes.push(glow, ring);
      });

      if (!nodes.length) {
        this.pulse(base.primary);
        return;
      }

      runAnimation(nodes, 360, (t) => {
        nodes.forEach((node, index) => {
          node.alpha = Math.max(0, (index % 2 === 0 ? 0.12 : 0.82) - t * (index % 2 === 0 ? 0.16 : 0.9));
          node.scale.set(0.96 + t * 0.16, 0.96 + t * 0.18);
        });
      });
    },
    celebration(payload = {}) {
      const rect = getGameWrapRect();
      const center = getRectCenter(rect) || { x: app.screen.width * 0.5, y: app.screen.height * 0.5 };
      const victory = payload.kind !== 'defeat';
      const primary = victory ? 0x34d399 : 0xfb7185;
      const secondary = victory ? 0xbbf7d0 : 0xfecdd3;

      const burst = makeSoftOrb(this.assets.textures.orbSoft, primary, 0.18, Math.max(120, Math.min(app.screen.width, app.screen.height) * 0.18));
      burst.x = center.x;
      burst.y = center.y;
      root.addChild(burst);

      const orbA = new PIXI.Sprite(this.assets.textures.orbSharp);
      orbA.anchor.set(0.5);
      orbA.tint = primary;
      orbA.alpha = 0.88;
      orbA.x = center.x - 18;
      orbA.y = center.y + 12;
      orbA.width = 16;
      orbA.height = 16;
      root.addChild(orbA);

      const orbB = new PIXI.Sprite(this.assets.textures.orbSharp);
      orbB.anchor.set(0.5);
      orbB.tint = secondary;
      orbB.alpha = 0.8;
      orbB.x = center.x + 20;
      orbB.y = center.y + 6;
      orbB.width = 14;
      orbB.height = 14;
      root.addChild(orbB);

      runAnimation([burst, orbA, orbB], 420, (t) => {
        burst.alpha = Math.max(0, 0.18 - t * 0.18);
        burst.scale.set(1 + t * 1.1);
        orbA.alpha = Math.max(0, 0.88 - t);
        orbA.x = center.x - 18 - t * 18;
        orbA.y = center.y + 12 - t * 30;
        orbB.alpha = Math.max(0, 0.8 - t * 0.92);
        orbB.x = center.x + 20 + t * 14;
        orbB.y = center.y + 6 - t * 24;
      });
    },
    boardPulse(payload = {}) {
      const rect = getGameWrapRect();
      const center = getRectCenter(rect);
      const palette = resolveContextPalette(payload, 'mana');
      if (!rect || !center) {
        this.pulseOnGameWrap(palette.primary);
        return;
      }
      const ring = new PIXI.Graphics();
      const width = Math.max(220, rect.width * 0.92);
      const height = Math.max(140, rect.height * 0.8);
      ring.roundRect(-width / 2, -height / 2, width, height, 28);
      ring.stroke({ width: 4, color: palette.primary, alpha: 0.54 });
      ring.x = center.x;
      ring.y = center.y;
      root.addChild(ring);
      runAnimation([ring], 420, (t) => {
        ring.alpha = Math.max(0, 0.54 - t * 0.58);
        ring.scale.set(1 + t * 0.06);
      });
    },
    spellCast(payload = {}) {
      const id = payload.id || null;
      if (id) {
        this.abilityCue(id, { ...payload, effect: 'spell', combatStyle: payload.combatStyle || 'mystic' });
        return;
      }
      this.pulseOnGameWrap(0xa78bfa);
    },
    totemCast(payload = {}) {
      this.pulseOnGameWrap(0x22d3ee);
    },
    syncVisibility(screen) {
      this.active = screen === 'game';
      root.visible = this.active;
      if (!this.active) this.clearActiveEffects();
      if (this.active) app.ticker.start();
      else app.ticker.stop();
      if (visual && visual.root) {
        visual.root.dataset.pixiActive = this.active ? 'true' : 'false';
      }
    }
  };

  app.ticker.add((ticker) => {
    const cost = Math.max(0, ticker.deltaMS || 0);
    layer.perf.frames += 1;
    layer.perf.elapsed += cost;
    layer.perf.avgFrameMS += (cost - layer.perf.avgFrameMS) * 0.12;
    if (layer.perf.elapsed >= 500) {
      layer.perf.fps = Math.round((layer.perf.frames * 1000) / layer.perf.elapsed);
      if (typeof visual.updateStats === 'function') {
        visual.updateStats('pixi', {
          active: layer.active,
          fps: layer.perf.fps,
          avgFrameMS: Number(layer.perf.avgFrameMS.toFixed(2)),
          activeAnimations: activeAnimations.size,
          children: root.children.length
        });
      }
      layer.perf.frames = 0;
      layer.perf.elapsed = 0;
    }
  });

  if (!visual.plugins) visual.plugins = {};
  visual.plugins.pixiBattleEffects = layer;
  if (typeof visual.registerThemes === 'function') {
    visual.registerThemes({
      effects: EFFECT_THEME_API
    });
  }
  if (visual.root) visual.root.dataset.pixiReady = 'true';
  if (visual.root) visual.root.dataset.pixiAssetsReady = layer.assets.ready ? 'true' : 'false';
  app.ticker.stop();

  events.on('screen:change', (event) => {
    layer.syncVisibility(event && event.payload ? event.payload.screen : 'title');
  });
  events.on('battle:start', () => {
    layer.syncVisibility('game');
    layer.pulseOnGameWrap(0x7cc4ff);
  });
  events.on('battle:end', () => {
    if (layer.active) layer.pulseOnGameWrap(0xfb7185);
  });
  events.on('card:played', async (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    const palette = resolvePlayPalette(payload);
    const color = palette.primary;
    const rect = await waitForCardRect(payload.id, 10);
    if (!layer.active) return;
    if (!rect) {
      layer.pulseOnGameWrap(color);
      return;
    }
    layer.themedPlay(payload.id, payload);
  });
  events.on('card:damaged', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    layer.hitCard(payload.id, resolveEffectColor('damage', payload));
  });
  events.on('card:healed', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    if (payload.combatStyle || payload.deck) {
      layer.themedSustain(payload.id, payload, 'heal');
      return;
    }
    layer.healCard(payload.id, resolveEffectColor('heal', payload));
  });
  events.on('card:mana', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    if (payload.combatStyle || payload.deck) {
      layer.themedSustain(payload.id, payload, 'mana');
      return;
    }
    layer.manaCard(payload.id, resolveEffectColor('mana', payload));
  });
  events.on('card:buffed', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    if (payload.combatStyle || payload.deck) {
      layer.themedBuff(payload.id, payload, 'buff');
      return;
    }
    layer.buffCard(payload.id, resolveEffectColor('buff', payload));
  });
  events.on('card:debuffed', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    if (payload.combatStyle || payload.deck) {
      layer.themedBuff(payload.id, payload, 'debuff');
      return;
    }
    layer.debuffCard(payload.id, resolveEffectColor('debuff', payload));
  });
  events.on('face:damaged', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    if (payload.combatStyle || payload.deck) {
      layer.themedFace(payload.side || 'ai', payload);
      return;
    }
    layer.hitFace(payload.side || 'ai', resolveEffectColor('damage', payload));
  });
  events.on('visual:card-context', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    const context = payload.context || 'attack';
    if (!payload.id) return;
    if (context === 'heal') {
      layer.healCard(payload.id, resolveEffectColor('heal', payload));
      return;
    }
    if (context === 'buff') {
      layer.buffCard(payload.id, resolveEffectColor('buff', payload));
      return;
    }
    if (context === 'mana') {
      layer.manaCard(payload.id, resolveEffectColor('mana', payload));
      return;
    }
    if (context === 'summon') {
      layer.playCard(payload.id, 0x93c5fd);
      return;
    }
    if (context === 'death' || context === 'explosion') {
      const palette = resolveContextPalette(payload, 'damage');
      layer.explodeCard(payload.id, context === 'death' ? palette.primary : palette.secondary);
      return;
    }
    if (payload.combatStyle || payload.deck) {
      layer.themedImpact(payload.id, payload);
      return;
    }
    layer.hitCard(payload.id, resolveEffectColor('damage', payload));
  });
  events.on('visual:face-context', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    if (payload.combatStyle || payload.deck) {
      layer.themedFace(payload.side || 'ai', payload);
      return;
    }
    layer.hitFace(payload.side || 'ai', payload.context === 'explosion' ? 0xffa861 : resolveEffectColor('damage', payload));
  });
  events.on('visual:ability-cue', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    if (!payload.id) {
      layer.pulseOnGameWrap(resolveAbilityPalette(payload).primary);
      return;
    }
    layer.abilityCue(payload.id, payload);
  });
  events.on('visual:screen-slash', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    layer.screenSlash(payload);
  });
  events.on('visual:impact-ring', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    layer.impactRing(payload);
  });
  events.on('visual:attack-arrow', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    layer.attackArrow(payload);
  });
  events.on('visual:character-cue', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    if (!payload.id) return;
    layer.characterCue(payload.id, payload);
  });
  events.on('visual:death-burn', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    if (!payload.id) return;
    layer.deathBurn(payload.id, payload);
  });
  events.on('visual:text-float', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    if (!payload.id || !payload.text) return;
    layer.textFloat(payload.id, payload);
  });
  events.on('visual:banner', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    layer.banner(payload);
  });
  events.on('visual:meter-pulse', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    layer.meterPulse(payload);
  });
  events.on('visual:turn-ui', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    layer.turnUiPulse(payload);
  });
  events.on('visual:celebration', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    layer.celebration(payload);
  });
  events.on('visual:board-pulse', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    layer.boardPulse(payload);
  });
  events.on('visual:spell-cast', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    layer.spellCast(payload);
  });
  events.on('visual:totem-cast', (event) => {
    if (!layer.active) return;
    const payload = event && event.payload ? event.payload : {};
    layer.totemCast(payload);
  });

  layer.syncVisibility(visual && visual.state ? visual.state.screen : 'title');
}

createBattleEffectsLayer().catch(() => {});
