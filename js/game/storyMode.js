import { Totem } from './totem.js';

export class StoryMode {
  constructor({
    level = 1,
    bossInterval = 10,
    eliteEvery = 5,
    shopEvery = 3,
    seed = 'fff',
    maxTotems = 3,
  } = {}) {
    this.level = level;
    this.round = 0;
    this.act = 1;
    this.totems = [];
    this.scaling = 0;
    this.xp = 0;
    this.gold = 0;
    this.bossInterval = bossInterval;
    this.eliteEvery = eliteEvery;
    this.shopEvery = shopEvery;
    this.maxTotems = maxTotems;
    this.currentEncounter = 'normal';
    this.seed = seed;
    this._rng = this.hashSeed(seed);
    this.bossModifiersSeen = [];
    this.currentBossModifier = null;
  }

  hashSeed(seed) {
    let h = 2166136261 >>> 0;
    const s = String(seed || 'fff');
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0 || 1;
  }

  random() {
    let t = (this._rng += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  pick(arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(this.random() * arr.length)];
  }

  nextRound() {
    this.round += 1;
    this.act = Math.max(1, Math.floor((this.round - 1) / 5) + 1);
    this.scaling = Math.floor((this.round - 1) / 2) + (this.act - 1) * 2 + (this.level - 1);
    const isBoss = this.round % this.bossInterval === 0;
    const isElite = !isBoss && this.round % this.eliteEvery === 0;
    const isShop = this.round % this.shopEvery === 0;
    this.currentEncounter = isBoss ? 'boss' : isElite ? 'elite' : isShop ? 'shop' : 'normal';
    if (isBoss) {
      this.currentBossModifier = this.rollBossModifier();
    } else {
      this.currentBossModifier = null;
    }
    return { isBoss, isElite, isShop };
  }

  rollBossModifier() {
    const modifiers = ['fortificado', 'furia', 'escassez'];
    const available = modifiers.filter((m) => !this.bossModifiersSeen.includes(m));
    const pick = this.pick(available.length ? available : modifiers);
    if (pick) this.bossModifiersSeen.push(pick);
    return pick;
  }

  handleVictory() {
    const encounterMult =
      this.currentEncounter === 'boss' ? 2.4 : this.currentEncounter === 'elite' ? 1.6 : 1;
    const actMult = 1 + (this.act - 1) * 0.12;
    const xpGain = Math.max(5, Math.round(5 * encounterMult * actMult));
    const goldGain = Math.max(5, Math.round(5 * encounterMult * actMult));
    this.xp += xpGain;
    this.gold += goldGain;
    const leveled = this.checkLevelUp();
    return { leveled, rewards: this.rewardOptions(), xpGain, goldGain };
  }

  rewardOptions() {
    const base = ['Nova carta', 'Evoluir carta', 'Ganhar Totem'];
    if (this.currentEncounter === 'boss' || this.random() < 0.4) base.push('Buff permanente');
    if (this.currentEncounter === 'boss') base.push('Relíquia');
    return base;
  }

  checkLevelUp() {
    const need = this.level * 50;
    if (this.xp >= need) {
      this.level += 1;
      this.xp -= need;
      return true;
    }
    return false;
  }

  addTotem(totem) {
    if (this.totems.length >= this.maxTotems) return false;
    this.totems.push(totem instanceof Totem ? totem : new Totem(totem));
    return true;
  }

  reset() {
    this.round = 0;
    this.act = 1;
    this.totems = [];
    this.scaling = 0;
    this.xp = 0;
    this.gold = 0;
    this.currentEncounter = 'normal';
    this.currentBossModifier = null;
    this.bossModifiersSeen = [];
    this._rng = this.hashSeed(this.seed);
  }
}

export function startStory() {
  console.log('Story mode started');
}
