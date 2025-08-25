import { Totem } from './totem.js';

export class StoryMode {
  constructor({ level = 1 } = {}) {
    this.level = level;
    this.round = 0;
    this.totems = [];
    this.scaling = 0;
  }

  nextRound() {
    this.round += 1;
    // simple difficulty scaling: each 2 rounds increases enemy buff
    this.scaling = Math.floor(this.round / 2);
    // indicate boss rounds every 10 turns
    return this.round % 10 === 0;
  }

  addTotem(totem) {
    if (this.totems.length >= 3) return false;
    this.totems.push(totem);
    return true;
  }

  reset() {
    this.round = 0;
    this.totems = [];
  }
}

export function startStory() {
  // Placeholder entry point for story mode
  console.log('Story mode started at level 1');
}
