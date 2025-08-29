import { Totem } from './totem.js';

// Simple roguelike progression inspired by Slay the Spire/Roguebook
// without altering the existing game lore.
export class StoryMode {
  constructor({ level = 1 } = {}) {
    this.level = level;
    this.round = 0;
    this.totems = [];
    this.scaling = 0;
    this.xp = 0;
    this.bossInterval = 10;
    this.eliteEvery = 5;
    this.shopEvery = 3;
    this.currentEncounter = 'normal';
  }

  nextRound() {
    this.round += 1;
    // basic difficulty scaling: round and level influence enemy stats
    this.scaling = Math.floor(this.round / 2) + (this.level - 1);
    const isBoss = this.round % this.bossInterval === 0;
    const isElite = !isBoss && this.round % this.eliteEvery === 0;
    const isShop = this.round % this.shopEvery === 0;
    this.currentEncounter = isBoss
      ? 'boss'
      : isElite
        ? 'elite'
        : isShop
          ? 'shop'
          : 'normal';
    return { isBoss, isElite, isShop };
  }

  handleVictory() {
    // Grant XP based on encounter type
    const xpGain =
      this.currentEncounter === 'boss'
        ? 20
        : this.currentEncounter === 'elite'
          ? 10
          : 5;
    this.xp += xpGain;
    const leveled = this.checkLevelUp();
    return { leveled, rewards: this.rewardOptions() };
  }

  rewardOptions() {
    // Rewards similar to roguelike card games
    return ['Nova carta', 'Evoluir carta', 'Ganhar Totem', 'Buff permanente'];
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
    if (this.totems.length >= 3) return false;
    this.totems.push(totem instanceof Totem ? totem : new Totem(totem));
    return true;
  }

  reset() {
    this.round = 0;
    this.totems = [];
    this.xp = 0;
    this.currentEncounter = 'normal';
  }
}

export function startStory() {
  // Placeholder entry point for story mode
  console.log('Story mode started at level 1');
}
