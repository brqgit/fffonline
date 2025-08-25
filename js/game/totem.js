export class Totem {
  constructor({ name = '', slots = 3, buffs = [] } = {}) {
    this.name = name;
    this.slots = slots;
    this.buffs = buffs;
  }

  canApply() {
    return this.buffs.length < this.slots;
  }

  applyBuff(buff) {
    if (this.canApply()) {
      this.buffs.push(buff);
      return true;
    }
    return false;
  }
}
