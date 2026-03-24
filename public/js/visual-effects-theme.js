export const EFFECT_THEMES = {
  damage: {
    player: 0xfb7185,
    ai: 0xffa861
  },
  heal: {
    player: 0x4ade80,
    ai: 0x7dd3fc
  },
  mana: {
    player: 0x60a5fa,
    ai: 0x38bdf8
  },
  buff: {
    default: 0xfacc15,
    player: 0xfacc15,
    ai: 0xa3e635,
    battlecry: 0xfacc15,
    turnBuff: 0xf59e0b,
    totem: 0x22d3ee,
    auraBonus: 0x4ade80,
    avatarEcho: 0xa3e635,
    healTrigger: 0x67e8f9,
    dealDamage: 0xf87171,
    endTurn: 0xc084fc,
    absorb: 0xe879f9
  },
  debuff: {
    default: 0xf97316,
    player: 0xf97316,
    ai: 0xfb7185,
    turnBuff: 0xfb7185
  }
};

export function resolveEffectColor(kind, payload = {}) {
  const map = EFFECT_THEMES[kind];
  if (!map) return 0xffffff;
  if (payload.sourceType && map[payload.sourceType]) return map[payload.sourceType];
  if (payload.permanent && map.permanent) return map.permanent;
  if (payload.temporary && map.temporary) return map.temporary;
  if (payload.side && map[payload.side]) return map[payload.side];
  return map.default || map.player || 0xffffff;
}

export const EFFECT_THEME_API = {
  EFFECT_THEMES,
  resolveEffectColor
};
