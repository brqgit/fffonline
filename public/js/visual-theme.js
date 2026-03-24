export const SCREEN_PRESETS = {
  title: {
    clear: 0x07111f,
    clearAlpha: 0.22,
    plane: 0x0f172a,
    planeOpacity: 0.24,
    ambient: 1.18,
    accent: 0x7dd3fc,
    accentIntensity: 1.5,
    mist: 0x93c5fd,
    mistOpacity: 0.08,
    veil: 0x67e8f9,
    veilOpacity: 0.06,
    cameraIntensity: 0.085,
    motion: 1,
    drift: 1,
    sway: 1
  },
  deck: {
    clear: 0x1a1208,
    clearAlpha: 0.16,
    plane: 0x2a1b0f,
    planeOpacity: 0.22,
    ambient: 1.08,
    accent: 0xfbbf24,
    accentIntensity: 1.42,
    mist: 0xf59e0b,
    mistOpacity: 0.07,
    veil: 0xfacc15,
    veilOpacity: 0.05,
    cameraIntensity: 0.072,
    motion: 0.82,
    drift: 0.78,
    sway: 0.84
  },
  multiplayer: {
    clear: 0x0b1220,
    clearAlpha: 0.18,
    plane: 0x111827,
    planeOpacity: 0.2,
    ambient: 1.12,
    accent: 0xa78bfa,
    accentIntensity: 1.45,
    mist: 0xc4b5fd,
    mistOpacity: 0.07,
    veil: 0xa78bfa,
    veilOpacity: 0.06,
    cameraIntensity: 0.065,
    motion: 0.75,
    drift: 0.7,
    sway: 0.72
  },
  game: {
    clear: 0x071019,
    clearAlpha: 0.12,
    plane: 0x0f172a,
    planeOpacity: 0.16,
    ambient: 1.02,
    accent: 0x60a5fa,
    accentIntensity: 1.28,
    mist: 0x38bdf8,
    mistOpacity: 0.05,
    veil: 0x22d3ee,
    veilOpacity: 0.04,
    cameraIntensity: 0.036,
    motion: 0.46,
    drift: 0.42,
    sway: 0.44
  }
};

export const BATTLE_THEME_OVERRIDES = {
  vikings: {
    accent: 0xfb7185,
    mist: 0xf97316,
    veil: 0xf59e0b,
    clear: 0x140b09,
    mistOpacity: 0.048,
    veilOpacity: 0.038,
    motion: 0.52,
    drift: 0.46,
    sway: 0.48,
    cameraIntensity: 0.038
  },
  animais: {
    accent: 0x84cc16,
    mist: 0x65a30d,
    veil: 0x4ade80,
    clear: 0x0b1308,
    mistOpacity: 0.055,
    veilOpacity: 0.042,
    motion: 0.58,
    drift: 0.52,
    sway: 0.54,
    cameraIntensity: 0.04
  },
  pescadores: {
    accent: 0x38bdf8,
    mist: 0x0ea5e9,
    veil: 0x22d3ee,
    clear: 0x07131a,
    mistOpacity: 0.052,
    veilOpacity: 0.04,
    motion: 0.5,
    drift: 0.5,
    sway: 0.46,
    cameraIntensity: 0.039
  },
  floresta: {
    accent: 0x22c55e,
    mist: 0x4ade80,
    veil: 0x84cc16,
    clear: 0x081209,
    mistOpacity: 0.057,
    veilOpacity: 0.044,
    motion: 0.6,
    drift: 0.5,
    sway: 0.56,
    cameraIntensity: 0.041
  }
};

export const CONTEXT_OVERRIDES = {
  shop: {
    clear: 0x13101a,
    accent: 0xfbbf24,
    mist: 0xf59e0b,
    veil: 0xfde68a,
    mistOpacity: 0.062,
    veilOpacity: 0.048,
    motion: 0.34,
    drift: 0.3,
    sway: 0.28,
    cameraIntensity: 0.022
  },
  map: {
    clear: 0x0a1220,
    accent: 0x7dd3fc,
    mist: 0x60a5fa,
    veil: 0x67e8f9,
    mistOpacity: 0.058,
    veilOpacity: 0.046,
    motion: 0.28,
    drift: 0.24,
    sway: 0.24,
    cameraIntensity: 0.018
  },
  event: {
    clear: 0x120f1a,
    accent: 0xc4b5fd,
    mist: 0xa78bfa,
    veil: 0xe9d5ff,
    mistOpacity: 0.06,
    veilOpacity: 0.05,
    motion: 0.32,
    drift: 0.28,
    sway: 0.26,
    cameraIntensity: 0.02
  },
  reward: {
    clear: 0x161117,
    accent: 0xfacc15,
    mist: 0xfbbf24,
    veil: 0xfef3c7,
    mistOpacity: 0.058,
    veilOpacity: 0.052,
    motion: 0.22,
    drift: 0.18,
    sway: 0.18,
    cameraIntensity: 0.014
  },
  archive: {
    clear: 0x0d1320,
    accent: 0x93c5fd,
    mist: 0x60a5fa,
    veil: 0xdbeafe,
    mistOpacity: 0.054,
    veilOpacity: 0.048,
    motion: 0.18,
    drift: 0.14,
    sway: 0.14,
    cameraIntensity: 0.012
  },
  deckPreview: {
    clear: 0x120f1b,
    accent: 0xfbbf24,
    mist: 0xf59e0b,
    veil: 0xfde68a,
    mistOpacity: 0.05,
    veilOpacity: 0.04,
    motion: 0.2,
    drift: 0.16,
    sway: 0.16,
    cameraIntensity: 0.012
  },
  system: {
    clear: 0x14111a,
    accent: 0xc4b5fd,
    mist: 0xa78bfa,
    veil: 0xe9d5ff,
    mistOpacity: 0.05,
    veilOpacity: 0.045,
    motion: 0.14,
    drift: 0.12,
    sway: 0.12,
    cameraIntensity: 0.01
  }
};

export const EVENT_THEME_OVERRIDES = {
  'theme-ritual': { accent: 0xfb7185, mist: 0xf97316, veil: 0xfca5a5, clear: 0x1b0d0f },
  'theme-library': { accent: 0xfbbf24, mist: 0xf59e0b, veil: 0xfde68a, clear: 0x1a1408 },
  'theme-merchant': { accent: 0x2dd4bf, mist: 0x22d3ee, veil: 0x99f6e4, clear: 0x0b1418 },
  'theme-frozen': { accent: 0x93c5fd, mist: 0x60a5fa, veil: 0xbfdbfe, clear: 0x0a1420 },
  'theme-beast': { accent: 0x84cc16, mist: 0x65a30d, veil: 0xbbf7d0, clear: 0x0d160a },
  'theme-arcane': { accent: 0xc084fc, mist: 0xa855f7, veil: 0xe9d5ff, clear: 0x140d1f },
  'theme-forge': { accent: 0xfb923c, mist: 0xf97316, veil: 0xfdba74, clear: 0x1c1008 },
  'theme-totem': { accent: 0x34d399, mist: 0x10b981, veil: 0xa7f3d0, clear: 0x09150f },
  'theme-travel': { accent: 0x7dd3fc, mist: 0x38bdf8, veil: 0xbae6fd, clear: 0x0b1320 }
};
