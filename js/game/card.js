export const ResourceType = Object.freeze({
  MANA: 'mana',
  ENERGIA: 'energia',
  COLHEITA: 'colheita',
});

export const Keyword = Object.freeze({
  FURIOSO: 'Furioso',
  PROTETOR: 'Protetor',
  PERCEPCAO: 'Percepção',
  CURA: 'Cura',
  BENCAO: 'Bênção',
  CORVO: 'Corvo',
  SERPENTE: 'Serpente',
});

export const CardType = Object.freeze({
  UNIDADE: 'Unidade',
  RITUAL: 'Ritual',
  LENDA_MITICA: 'Lenda Mítica',
});

export const Faction = Object.freeze({
  VIKINGS: 'Vikings',
  FLORESTA: 'Floresta',
  SOMBRAS: 'Sombras',
  RUNICO: 'Rúnico',
  MITICO: 'Mítico',
});

export class Card {
  constructor({
    nome,
    faccao,
    classe,
    subclasse,
    tipo = CardType.UNIDADE,
    custo = 0,
    atributos = {},
    keywords = [],
    efeito = '',
    tags = [],
  }) {
    this.nome = nome;
    this.faccao = faccao;
    this.classe = classe;
    this.subclasse = subclasse;
    this.tipo = tipo;
    // custo pode ser número (mana) ou objeto { mana, colheita }
    this.custo = typeof custo === 'number'
      ? { mana: custo, colheita: 0 }
      : { mana: custo.mana ?? 0, colheita: custo.colheita ?? 0 };
    this.atributos = {
      ataque: atributos.ataque ?? 0,
      defesa: atributos.defesa ?? 0,
      percepcao: atributos.percepcao ?? 0,
      espirito: atributos.espirito ?? 0,
      furia: atributos.furia ?? 0,
    };
    this.keywords = keywords;
    this.efeito = efeito;
    this.tags = tags;
  }
}

export const createCard = (data) => new Card(data);
