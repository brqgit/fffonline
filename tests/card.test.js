const { createCard, CardType, Faction } = require('../js/game/card');

describe('Card module', () => {
  test('creates card with default values', () => {
    const card = createCard({
      nome: 'Test',
      faccao: Faction.VIKINGS,
      classe: 'Guerreiro',
      subclasse: 'None'
    });
    expect(card.nome).toBe('Test');
    expect(card.tipo).toBe(CardType.UNIDADE);
    expect(card.custo).toEqual({ mana: 0, colheita: 0 });
  });
});
