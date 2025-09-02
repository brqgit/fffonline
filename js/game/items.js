export const ITEMS = {
  weapons: [
    {
      id: 'battle_axe',
      name: 'Machado Rúnico',
      atk: 2,
      classes: ['dps', 'tank']
    },
    {
      id: 'healing_staff',
      name: 'Cajado Sagrado',
      atk: 1,
      classes: ['support', 'control']
    }
  ],
  armors: [
    {
      id: 'iron_shield',
      name: 'Escudo de Ferro',
      hp: 2,
      classes: ['tank', 'support']
    },
    {
      id: 'wolf_pelt',
      name: 'Pele de Lobo',
      hp: 1,
      classes: ['dps', 'control']
    }
  ],
  spells: [
    {
      id: 'odin_blessing',
      name: 'Bênção de Odin',
      buff: { atk: 1 },
      classes: ['support', 'dps']
    },
    {
      id: 'spirit_link',
      name: 'Vínculo Espiritual',
      buff: { hp: 1 },
      classes: ['support', 'control']
    }
  ]
};

export function findItem(id) {
  for (const group of Object.values(ITEMS)) {
    const found = group.find((i) => i.id === id);
    if (found) return found;
  }
  return null;
}
