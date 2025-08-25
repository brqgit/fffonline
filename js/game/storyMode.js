import { Totem } from './totem.js';

export class StoryMode {
  constructor({ level = 1 } = {}) {
    this.level = level;
    this.round = 0;
    this.totems = [];
  }

  nextRound() {
    this.round += 1;
    // TODO: escalate difficulty, handle elites and bosses
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
