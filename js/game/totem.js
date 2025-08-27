export class Totem {
  constructor({ name = '', icon = '🗿', buffs = {} } = {}) {
    this.name = name;
    this.icon = icon;
    this.buffs = buffs;
  }
}
