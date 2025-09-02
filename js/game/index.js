import { $, $$, log } from "../ui/index.js";
import {
  initAudio,
  ensureRunning,
  startMenuMusic,
  stopMenuMusic,
  tryStartMenuMusicImmediate,
  toggleMute,
  sfx,
} from "../audio/index.js";
import { aiTurn } from "../ai/index.js";
import { Keyword } from "./card.js";
import { ENEMY_NAMES } from "./enemyNames.js";
import { StoryMode } from "./storyMode.js";

const rand = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => Math.random().toString(36).slice(2);
const pickEnemyName = (deck, boss = false) => {
  const pool = ENEMY_NAMES[deck] || [];
  const list = pool.filter(e => boss ? e.boss : !e.boss);
  const c = list.length ? rand(list) : { name: "Inimigo" };
  return c.name;
};


const KW = {
    P: Keyword.PROTETOR,
    F: Keyword.FURIOSO,
    PE: Keyword.PERCEPCAO,
    C: Keyword.CURA,
    B: Keyword.BENCAO,
    CV: Keyword.CORVO,
    S: Keyword.SERPENTE,
    A: Keyword.ABSORVER,
    M: Keyword.MUTAVEL,
  },
  BC = {
    D1: "draw1",
    H2: "heal2",
    P1: "ping1",
    BR1: "buffRandom1",
    BA1: "buffAlliesAtk1",
  };
function deriveClassSub(name) {
  const n = name.toLowerCase();
  if (n.includes("berserker")) return { classe: "tank", subclasse: "Berserker" };
  if (n.includes("guardião do véu") || n.includes("véu"))
    return { classe: "control", subclasse: "Guardião do Véu" };
  if (n.includes("guardião")) return { classe: "tank", subclasse: "Guardião" };
  if (n.includes("uivante")) return { classe: "tank", subclasse: "Uivante" };
  if (n.includes("caçador")) return { classe: "dps", subclasse: "Caçador" };
  if (n.includes("runomante")) return { classe: "dps", subclasse: "Runomante" };
  if (n.includes("serpente")) return { classe: "dps", subclasse: "Serpente" };
  if (n.includes("curandeir")) return { classe: "support", subclasse: "Curandeiro" };
  if (n.includes("totêmico") || n.includes("totemico"))
    return { classe: "support", subclasse: "Totêmico" };
  if (n.includes("sacerdote") || n.includes("tecelão"))
    return { classe: "support", subclasse: "Tecelão" };
  if (n.includes("xamã")) return { classe: "control", subclasse: "Xamã" };
  if (n.includes("corvo")) return { classe: "control", subclasse: "Corvo" };
  if (n.includes("guerreiro"))
    return { classe: "dps", subclasse: "Guerreiro" };
  if (n.includes("raider")) return { classe: "dps", subclasse: "Raider" };
  if (n.includes("batalhador"))
    return { classe: "dps", subclasse: "Batalhador" };
  if (n.includes("mago") || n.includes("mistico"))
    return { classe: "support", subclasse: "Mago" };
  if (n.includes("sombras") || n.includes("encapuzado"))
    return { classe: "control", subclasse: "Sombras" };
  if (n.includes("navegador"))
    return { classe: "support", subclasse: "Navegador" };
  return { classe: "", subclasse: "" };
}
const makeCard = (a) => {
  const [n, e, t, atk, hp, cost, tx, k = 0, b = 0, harvest = 0] = a;
  const cls = deriveClassSub(n || "");
  return {
    name: n,
    emoji: e,
    tribe: t,
    atk,
    hp,
    cost,
    harvestCost: harvest,
    text: tx,
    kw: k ? k.split("|").map((x) => KW[x]) : [],
    battlecry: b ? BC[b] : void 0,
    classe: cls.classe,
    subclasse: cls.subclasse,
    id: uid(),
  };
};
const TEMPLATES = {
  vikings: [
    ["Lavrador de Lança", "🧔‍🌾", "Viking", 2, 2, 2, "Disciplinado"],
    [
      "Camponesa Curandeira",
      "👩‍🌾✨",
      "Viking",
      2,
      3,
      3,
      "Entra: cura 2",
      "",
      "H2",
    ],
    ["Ceifeiro Berserker", "👨‍🌾⚔️", "Viking", 5, 2, 4, "Furioso", "F"],
    ["Escudeiro Rural", "🛡️", "Viking", 0, 3, 1, "Protetor", "P"],
    ["Guardião da Aldeia", "🛡️🌾", "Viking", 3, 5, 4, "Protetor", "P"],
    [
      "Caçador de Lobos",
      "🏹",
      "Viking",
      3,
      2,
      2,
      "Entra: dano 1 aleatório",
      "",
      "P1",
    ],
    [
      "Ferreiro Rural",
      "🔨",
      "Viking",
      4,
      6,
      5,
      "Entra: +1/+1 aleatório",
      "",
      "BR1",
    ],
    [
      "Chefe da Colheita",
      "👑🌾",
      "Viking",
      5,
      6,
      6,
      "Aliados +1 ATK",
      "",
      "BA1",
    ],
    ["Camponês Vigilante", "", "Viking", 2, 4, 3, "Protetor", "P"],
    [
      "Herbalista do Vilarejo",
      "",
      "Viking",
      1,
      3,
      2,
      "Entra: cura 2",
      "",
      "H2",
    ],
    [
      "Batedor da Aldeia",
      "",
      "Viking",
      3,
      2,
      2,
      "Entra: dano 1 aleatório",
      "",
      "P1",
    ],
    [
      "Ancião do Trigo",
      "",
      "Viking",
      2,
      2,
      3,
      "Entra: +1/+1 aleatório",
      "",
      "BR1",
    ],
    [
      "Patriarca da Fazenda",
      "",
      "Viking",
      4,
      5,
      5,
      "Aliados +1 ATK",
      "",
      "BA1",
    ],
    ["Rastreador do Fiorde", "", "Viking", 1, 2, 1, "Entra: compre 1", "", "D1"],
    ["Ceifeira Ágil", "", "Viking", 3, 2, 2, "Furioso", "F"],
    ["Defensor do Arado", "", "Viking", 1, 5, 3, "Protetor", "P"],
    ["Runomante Rural", "", "Viking", 2, 3, 3, "Entra: +1/+1 aleatório", "", "BR1"],
    ["Guerreiro da Foice", "", "Viking", 5, 3, 4, "Furioso", "F"],
    ["Guardiã do Celeiro", "", "Viking", 3, 6, 5, "Protetor", "P"],
    ["Senhor do Campo", "", "Viking", 6, 6, 6, "Aliados +1 ATK", "", "BA1"],
  ],
  animais: [
    ["Urso Pardo", "🐻", "Animal", 6, 6, 5, "Protetor", "P"],
    ["Lobo Cinzento", "🐺", "Animal", 4, 2, 3, "Furioso", "F"],
    ["Javali Selvagem", "🐗", "Animal", 3, 2, 2, "Impulsivo"],
    ["Cervo Nobre", "🦌", "Animal", 4, 5, 4, "Resistente"],
    ["Coruja Sábia", "🦉", "Animal", 1, 2, 1, "Entra: compre 1", "", "D1"],
    ["Cabra da Montanha", "🐐", "Animal", 2, 3, 2, "Protetor", "P"],
    ["Águia do Norte", "🦅", "Animal", 5, 3, 4, "Veloz"],
    ["Urso Polar", "🐻‍❄️", "Animal", 7, 7, 6, "Gigante"],
    ["Serpente do Mar", "🐍", "Animal", 8, 7, 7, "Colosso"],
    ["Lobo Alfa", "", "Animal", 5, 4, 4, "Furioso", "F"],
    ["Lince Ártico", "", "Animal", 3, 3, 3, "Veloz"],
    [
      "Falcão das Montanhas",
      "",
      "Animal",
      2,
      3,
      3,
      "Entra: compre 1",
      "",
      "D1",
    ],
    ["Caribu Selvagem", "", "Animal", 4, 5, 4, "Protetor", "P"],
    ["Texugo Ártico", "", "Animal", 3, 2, 2, "Furioso", "F"],
    ["Foca do Gelo", "", "Animal", 2, 3, 2, "Entra: compre 1", "", "D1"],
    ["Lobo Uivante", "", "Animal", 4, 3, 4, "Furioso", "F"],
    ["Raposa Escarlate", "", "Animal", 3, 2, 2, "Furioso", "F"],
    ["Touro das Neves", "", "Animal", 5, 5, 5, "Protetor", "P"],
    ["Corvo Astuto", "", "Animal", 1, 2, 2, "Entra: compre 1", "", "D1"],
    ["Fera das Cavernas", "", "Animal", 6, 6, 6, "Furioso", "F"],
  ],
  pescadores: [
    ["Grumete do Fiorde", "👦🎣", "Viking", 1, 1, 1, "Aprendiz"],
    ["Pescador do Fiorde", "🧔‍♂️🎣", "Viking", 2, 3, 2, "Veterano"],
    [
      "Arpoador Nórdico",
      "🪝",
      "Viking",
      3,
      2,
      2,
      "Entra: dano 1 aleatório",
      "",
      "P1",
    ],
    [
      "Curandeira do Sal",
      "🧂✨",
      "Viking",
      2,
      3,
      3,
      "Entra: cura 2",
      "",
      "H2",
    ],
    ["Vigia do Farol", "🗼🛡️", "Viking", 2, 5, 4, "Protetor", "P"],
    [
      "Ferreiro Naval",
      "⚓️🔨",
      "Viking",
      4,
      5,
      5,
      "Entra: +1/+1 aleatório",
      "",
      "BR1",
    ],
    [
      "Capitão da Pesca",
      "👑🎣",
      "Viking",
      5,
      6,
      6,
      "Aliados +1 ATK",
      "",
      "BA1",
    ],
    ["Remador Ágil", "🚣", "Viking", 4, 2, 3, "Furioso", "F"],
    [
      "Curandeiro do Mar",
      "",
      "Viking",
      1,
      4,
      3,
      "Entra: cura 2",
      "",
      "H2",
    ],
    ["Bardo do Porto", "", "Viking", 2, 3, 3, "Aliados +1 ATK", "", "BA1"],
    [
      "Caçador de Tesouros",
      "",
      "Viking",
      2,
      2,
      2,
      "Entra: compre 1",
      "",
      "D1",
    ],
    ["Escudeiro do Convés", "", "Viking", 2, 5, 4, "Protetor", "P"],
    [
      "Guarda do Cais",
      "",
      "Viking",
      3,
      2,
      3,
      "Entra: dano 1 aleatório",
      "",
      "P1",
    ],
    ["Aprendiz de Rede", "", "Viking", 1, 2, 1, "Entra: compre 1", "", "D1"],
    ["Baleeiro Leal", "", "Viking", 2, 4, 3, "Protetor", "P"],
    ["Atirador do Convés", "", "Viking", 3, 2, 2, "Entra: dano 1 aleatório", "", "P1"],
    ["Sacerdote das Ondas", "", "Viking", 2, 3, 3, "Entra: cura 2", "", "H2"],
    ["Corsário Intrépido", "", "Viking", 4, 2, 3, "Furioso", "F"],
    ["Patrulheiro Náutico", "", "Viking", 3, 5, 4, "Protetor", "P"],
    ["Almirante do Fiorde", "", "Viking", 5, 5, 6, "Aliados +1 ATK", "", "BA1"],
  ],
  floresta: [
    ["Urso Negro", "🐻", "Animal", 5, 5, 5, "Protetor", "P"],
    ["Lobo da Mata", "🐺", "Animal", 4, 2, 3, "Furioso", "F"],
    ["Javali da Floresta", "🐗", "Animal", 3, 2, 2, "Impulsivo"],
    ["Cervo Vermelho", "🦌", "Animal", 4, 5, 4, "Resistente"],
    ["Coruja Sábia", "🦉", "Animal", 1, 2, 1, "Entra: compre 1", "", "D1"],
    ["Raposa Ágil", "🦊", "Animal", 3, 3, 3, "Veloz"],
    ["Bisonte das Colinas", "🐂", "Animal", 6, 6, 6, "Imponente"],
    ["Serpente do Bosque", "🐍", "Animal", 5, 4, 4, "Silenciosa"],
    ["Lince da Sombra", "", "Animal", 4, 2, 3, "Furioso", "F"],
    ["Corvo Observador", "", "Animal", 1, 2, 2, "Entra: compre 1", "", "D1"],
    ["Guardião Musgoso", "", "Animal", 3, 5, 4, "Protetor", "P"],
    [
      "Cervo Rúnico",
      "",
      "Animal",
      3,
      3,
      3,
      "Entra: +1/+1 aleatório",
      "",
      "BR1",
    ],
    ["Javali Voraz", "", "Animal", 5, 3, 4, "Furioso", "F"],
    ["Lebre da Névoa", "", "Animal", 1, 1, 1, "Veloz"],
    ["Guardião da Clareira", "", "Animal", 2, 5, 3, "Protetor", "P"],
    ["Raposa Sombria", "", "Animal", 3, 2, 2, "Furioso", "F"],
    ["Urso Musgoso", "", "Animal", 5, 6, 5, "Protetor", "P"],
    ["Coruja Mensageira", "", "Animal", 1, 2, 2, "Entra: compre 1", "", "D1"],
    ["Cervo das Runas", "", "Animal", 3, 3, 3, "Entra: +1/+1 aleatório", "", "BR1"],
    ["Javali Espinhoso", "", "Animal", 5, 3, 4, "Furioso", "F"],
  ],
  convergentes: [
    [
      "Neófito Convergente",
      "🌀",
      "Convergente",
      2,
      2,
      1,
      "Entra: copia uma palavra-chave de um aliado",
      "A",
    ],
    ["Proteiforme da Aurora", "🌈", "Convergente", 3, 3, 3, "", "M"],
    ["Guardião Quimérico", "🛡️🐺", "Convergente", 2, 6, 4, "", "P|M"],
    ["Raider Metamorfo", "⚔️🌊", "Convergente", 4, 2, 3, "", "F|M"],
    [
      "Runa Voraz",
      "🌀🪨",
      "Convergente",
      1,
      4,
      2,
      "Ganha +1 ATK sempre que um aliado morre.",
    ],
    [
      "Totem Absorvente",
      "🪵🌀",
      "Convergente",
      0,
      5,
      3,
      "Fim de turno: copia uma palavra-chave de um inimigo aleatório.",
      "P",
    ],
    [
      "Arauto da Aurora",
      "✨👑",
      "Convergente",
      5,
      5,
      6,
      "Se você copiou ≥3 palavras-chave na partida, aliados +1/+1.",
    ],
    [
      "Sombra Rúnica",
      "🌘🌀",
      "Convergente",
      3,
      3,
      3,
      "Sempre que absorver, ganha +1/+1.",
      "A",
    ],
    [
      "Guerreiro Sincrético",
      "⚔️🛡️",
      "Convergente",
      4,
      4,
      4,
      "Entra: escolha Furioso ou Protetor; ganha essa palavra-chave.",
    ],
    ["Lince Metamórfico", "🐱🌈", "Convergente", 3, 2, 2, "", "F|M"],
    [
      "Capataz de Runas",
      "🌀⚙️",
      "Convergente",
      2,
      4,
      3,
      "Ao absorver, causa 1 de dano a todos os inimigos.",
      "A",
    ],
    [
      "Colosso Alquímico",
      "🗿🌈",
      "Convergente",
      7,
      7,
      7,
      "Entra: copia uma palavra-chave de cada aliado.",
      "M",
    ],
    [
      "Essência Convergente",
      "💠",
      "Convergente",
      0,
      0,
      1,
      "Entra com ATK/HP iguais ao nº de palavras-chave diferentes que você controla.",
      "A",
    ],
    ["Discípulo Maleável", "", "Convergente", 1, 3, 2, "", "M"],
    ["Sentinela Vórtice", "", "Convergente", 2, 4, 3, "Entra: copia uma palavra-chave de um aliado", "P|A"],
    ["Tecelão Cambiante", "", "Convergente", 2, 3, 3, "Entra: compre 1", "A", "D1"],
    ["Eco Mutante", "", "Convergente", 4, 4, 4, "", "A|M"],
    ["Bruto Assimilador", "", "Convergente", 5, 5, 5, "", "A|M"],
    ["Sábio Prismal", "", "Convergente", 3, 5, 4, "Entra: +1/+1 aleatório", "M", "BR1"],
    ["Avatar Mutagênico", "", "Convergente", 6, 6, 6, "", "M"],
  ],
  convergentes: [
    [
      "Neófito Convergente",
      "🌀",
      "Convergente",
      2,
      2,
      1,
      "Entra: copia uma palavra-chave de um aliado",
      "A",
    ],
    ["Proteiforme da Aurora", "🌈", "Convergente", 3, 3, 3, "", "M"],
    ["Guardião Quimérico", "🛡️🐺", "Convergente", 2, 6, 4, "", "P|M"],
    ["Raider Metamorfo", "⚔️🌊", "Convergente", 4, 2, 3, "", "F|M"],
    [
      "Runa Voraz",
      "🌀🪨",
      "Convergente",
      1,
      4,
      2,
      "Ganha +1 ATK sempre que um aliado morre.",
    ],
    [
      "Totem Absorvente",
      "🪵🌀",
      "Convergente",
      0,
      5,
      3,
      "Fim de turno: copia uma palavra-chave de um inimigo aleatório.",
      "P",
    ],
    [
      "Arauto da Aurora",
      "✨👑",
      "Convergente",
      5,
      5,
      6,
      "Se você copiou ≥3 palavras-chave na partida, aliados +1/+1.",
    ],
    [
      "Sombra Rúnica",
      "🌘🌀",
      "Convergente",
      3,
      3,
      3,
      "Sempre que absorver, ganha +1/+1.",
      "A",
    ],
    [
      "Guerreiro Sincrético",
      "⚔️🛡️",
      "Convergente",
      4,
      4,
      4,
      "Entra: escolha Furioso ou Protetor; ganha essa palavra-chave.",
    ],
    ["Lince Metamórfico", "🐱🌈", "Convergente", 3, 2, 2, "", "F|M"],
    [
      "Capataz de Runas",
      "🌀⚙️",
      "Convergente",
      2,
      4,
      3,
      "Ao absorver, causa 1 de dano a todos os inimigos.",
      "A",
    ],
    [
      "Colosso Alquímico",
      "🗿🌈",
      "Convergente",
      7,
      7,
      7,
      "Entra: copia uma palavra-chave de cada aliado.",
      "M",
    ],
    [
      "Essência Convergente",
      "💠",
      "Convergente",
      0,
      0,
      1,
      "Entra com ATK/HP iguais ao nº de palavras-chave diferentes que você controla.",
      "A",
    ],
  ],
};
const COMMANDERS = {
  vikings: {
    name: "Eirik",
    classe: "Guerreiro",
    base: { atk: 2, hp: 30 },
    slots: { weapon: 1, armor: 1, trinket: 1 },
  },
  animais: {
    name: "Mãe da Alcateia",
    classe: "Druida",
    base: { atk: 1, hp: 30 },
    slots: { companion: 3 },
  },
  pescadores: {
    name: "Capitão do Porto",
    classe: "Navegador",
    base: { atk: 1, hp: 30 },
    slots: { weapon: 1, armor: 1 },
  },
  floresta: {
    name: "Guardiã da Floresta",
    classe: "Totêmico",
    base: { atk: 1, hp: 30 },
    slots: { totem: 2, charm: 1 },
  },
  convergentes: {
    name: "Avatar Prismal",
    classe: "Místico",
    base: { atk: 0, hp: 30 },
    slots: { essence: 3 },
  },
  custom: {
    name: "Comandante",
    classe: "",
    base: { atk: 0, hp: 30 },
    slots: { weapon: 1, armor: 1, trinket: 1 },
  },
};
const ALL_DECKS = Object.keys(TEMPLATES);
const G = {
  playerHP: 30,
  aiHP: 30,
  turn: 1,
  playerMana: 0,
  playerManaCap: 0,
  playerHarvest: 0,
  playerHarvestCap: 0,
  aiMana: 0,
  aiManaCap: 0,
  aiHarvest: 0,
  aiHarvestCap: 0,
  current: "player",
  playerDeck: [],
  aiDeck: [],
  playerHand: [],
  aiHand: [],
  playerBoard: [],
  aiBoard: [],
  playerDiscard: [],
  aiDiscard: [],
  playerCommander: null,
  aiCommander: null,
  chosen: null,
  playerDeckChoice: "vikings",
  aiDeckChoice: rand(ALL_DECKS),
  customDeck: null,
  mode: "solo",
  story: null,
  maxHandSize: 5,
  totems: [],
  enemyScaling: 0,
  playerCommander: null,
  aiCommander: null,
  playerItems: [],
  aiItems: [],
};
const els = {
  pHP: $("#playerHP"),
  pHP2: $("#playerHP2"),
  aHP: $("#aiHP"),
  aHP2: $("#aiHP2"),
  mana: $("#mana"),
  pHand: $("#playerHand"),
  pBoard: $("#playerBoard"),
  aBoard: $("#aiBoard"),
  endBtn: $("#endTurnBtn"),
  muteBtn: $("#muteBtn"),
  aAva: $("#aiAvatar"),
  drawCount: $("#drawCount"),
  discardCount: $("#discardCount"),
  barPHP: $("#barPlayerHP"),
  barAHP: $("#barAiHP"),
  barMana: $("#barMana"),
  start: $("#start"),
  openEncy: $("#openEncy"),
  ency: $("#ency"),
  encyGrid: $("#encyGrid"),
  encyFilters: $("#encyFilters"),
  closeEncy: $("#closeEncy"),
  startGame: $("#startGame"),
  endOverlay: $("#endOverlay"),
  endMsg: $("#endMsg"),
  endSub: $("#endSub"),
  playAgainBtn: $("#playAgainBtn"),
  rematchBtn: $("#rematchBtn"),
  menuBtn: $("#menuBtn"),
  totemBar: $("#totemBar"),
  playerCommander: $("#playerCommander"),
  aiCommander: $("#aiCommander"),
};
// deck builder DOM (may be null if builder UI not present)
const poolEl = $("#pool"),
  chosenEl = $("#chosen"),
  countEl = $("#countDeck"),
  curveEl = $("#curve");
// safe builder functions (no-ops if UI not present)
function renderPool() {
  const all = [
    ...TEMPLATES.vikings,
    ...TEMPLATES.animais,
    ...TEMPLATES.pescadores,
    ...TEMPLATES.floresta,
    ...TEMPLATES.convergentes,
  ];
  if (!poolEl) return;
  poolEl.innerHTML = "";
  all.forEach((raw) => {
    const row = document.createElement("div");
    row.className = "pitem";
    row.innerHTML = `<span class="c">${raw[5]}${raw[9] ? "🌾" + raw[9] : ""}</span><div>${raw[1]} ${raw[0]}</div><button class="add">+</button>`;
    row.querySelector(".add").onclick = () => {
      if (!G.customDeck) G.customDeck = [];
      if (G.customDeck.length >= 20) return;
      const c = makeCard(raw);
      G.customDeck.push(c);
      renderChosen();
      updateCurve();
    };
    poolEl.appendChild(row);
  });
}
function renderChosen() {
  if (!chosenEl || !countEl) return;
  chosenEl.innerHTML = "";
  const list = G.customDeck || [];
  list.forEach((c, i) => {
    const item = document.createElement("div");
    item.className = "chitem";
    item.dataset.idx = i;
    item.innerHTML = `<div>${c.emoji} ${c.name} <small>(${c.cost}${c.harvestCost ? "🌾" + c.harvestCost : ""})</small></div><button class="rm">remover</button>`;
    item.querySelector(".rm").onclick = () => {
      const idx = Number(item.dataset.idx);
      if (idx >= 0) {
        G.customDeck.splice(idx, 1);
        renderChosen();
        updateCurve();
      }
    };
    chosenEl.appendChild(item);
  });
  countEl.textContent = String(list.length);
}
function updateCurve() {
  if (!curveEl) return;
  const list = G.customDeck || [];
  const buckets = new Array(8).fill(0);
  list.forEach((c) => {
    buckets[Math.min(c.cost, 7)]++;
  });
  curveEl.innerHTML = "";
  const max = Math.max(1, Math.max(...buckets));
  buckets.forEach((v) => {
    const bar = document.createElement("div");
    bar.className = "barc";
    const i = document.createElement("i");
    i.style.width = (v / max) * 100 + "%";
    bar.appendChild(i);
    curveEl.appendChild(bar);
  });
}
// --- Global error capture ---
window.addEventListener("error", function (e) {
  console.error("JS Error:", e.message, e.filename + ":" + e.lineno);
  try {
    typeof log === "function" && log("⚠️ " + e.message);
  } catch (_) {}
});
window.addEventListener("unhandledrejection", function (e) {
  console.error("Unhandled Rejection:", e.reason);
  try {
    const msg =
      e.reason && e.reason.message ? e.reason.message : String(e.reason);
    typeof log === "function" && log("⚠️ " + msg);
  } catch (_) {}
});

function tiltify(card, lift = false) {
  const height = card.offsetHeight;
  const width = card.offsetWidth;
  let hovering = false;
  if (lift) {
    card.addEventListener("mouseenter", () => {
      if (card.classList.contains("chosen")) return;
      hovering = true;
      card.style.zIndex = 1000;
      card.style.transform = "translateY(-20px)";
    });
    card.addEventListener("mouseleave", () => {
      if (card.classList.contains("chosen")) return;
      hovering = false;
      card.style.zIndex = card.dataset.z || "";
      card.style.transform = "";
    });
  } else {
    card.addEventListener("mouseleave", () => {
      if (card.classList.contains("chosen")) return;
      card.style.transform = "";
    });
  }
  card.addEventListener("mousemove", (e) => {
    if (card.classList.contains("chosen")) return;
    const x = (e.offsetX / width - 0.5) * 12;
    const y = (e.offsetY / height - 0.5) * -12;
    const ty = hovering ? -20 : 0;
    card.style.transform = `translateY(${ty}px) perspective(600px) rotateX(${y}deg) rotateY(${x}deg)`;
  });
}
function cardNode(c, owner) {
  const d = document.createElement("div");
  d.className = `card ${owner === "player" ? "me" : "enemy"} ${c.stance === "defense" ? "defense" : ""}`;
  d.dataset.id = c.id;
  const costText = `${c.cost}${c.harvestCost ? `🌾${c.harvestCost}` : ""}`;
  const kwTags = (c.kw || []).map(
    (k) =>
      `<span class='keyword' data-tip='${
        k === "Protetor"
          ? "Enquanto houver Protetor ou carta em Defesa do lado do defensor, ataques devem mirá-los."
          : k === "Furioso"
          ? "Pode atacar no turno em que é jogada."
          : k === "Absorver"
          ? "Ao entrar, copia uma palavra-chave de um aliado."
          : k === "Mutável"
          ? "No fim do turno, troca ATK e HP."
          : ""
      }' >${k}</span>`
  );
  if (c.subclasse && c.classe) {
    kwTags.push(`<span class='class-tag ${c.classe}'>${c.subclasse}</span>`);
  }
  d.innerHTML = `<div class="bg bg-${c.deck || "default"}"></div><div class="head"><span class="cost">${costText}</span><div class="name">${c.name}</div>${c.stance ? `<span class="badge ${c.stance === "defense" ? "def" : "atk"}">${c.stance === "defense" ? "🛡️" : "⚔️"}</span>` : ""}</div><div class="tribe">${c.tribe}</div><div class="art">${c.emoji}</div><div class="text">${kwTags.join(" ")} ${c.text || ""}</div><div class="stats"><span class="gem atk">⚔️ ${c.atk}</span>${c.stance ? `<span class="stance-label ${c.stance}">${c.stance === 'defense' ? '🛡️' : '⚔️'}</span>` : ''}<span class="gem hp ${c.hp <= 2 ? "low" : ""}">❤️ ${c.hp}</span></div>`;
  return d;
}
function resetCardState(c) {
  if (!c) return;
  c.stance = null;
  c.canAttack = false;
  delete c.summonTurn;
}
const hasGuard = (b) =>
  b.some((x) => x.kw.includes("Protetor") || x.stance === "defense");
function updateMeters() {
  const pct = (v, max) =>
    max > 0 ? Math.max(0, Math.min(100, (v / max) * 100)) : 0;
  els.barPHP.style.width = pct(G.playerHP, 30) + "%";
  els.barAHP.style.width = pct(G.aiHP, 30) + "%";
  els.barMana.style.width = pct(G.playerMana, G.playerManaCap) + "%";
}
function renderAll() {
  els.pHP.textContent = G.playerHP;
  els.pHP2.textContent = G.playerHP;
  els.aHP.textContent = G.aiHP;
  els.aHP2.textContent = G.aiHP;
  els.mana.textContent = `${G.playerMana}/${G.playerManaCap} | 🌾 ${G.playerHarvest}/${G.playerHarvestCap}`;
  els.endBtn.disabled = G.current !== "player";
  els.drawCount.textContent = G.playerDeck.length;
  els.discardCount.textContent = G.playerDiscard.length;
  updateMeters();
  renderHand();
  renderBoard();
  renderCommanders();
  renderTotems();
}
function renderHand() {
  els.pHand.innerHTML = "";
  G.playerHand.forEach((c) => {
    const d = cardNode(c, "player");
    d.classList.add("handcard");
    tiltify(d, true);
    d.addEventListener("click", (e) => {
      if (d.classList.contains("chosen")) return;
      const blocked =
        c.cost > G.playerMana ||
        c.harvestCost > G.playerHarvest ||
        G.current !== "player" ||
        (c.type !== "totem" && G.playerBoard.length >= 5);
      if (blocked) {
        d.style.transform = "translateY(-2px)";
        setTimeout(() => (d.style.transform = ""), 150);
        sfx("error");
        return;
      }
      e.stopPropagation();
      openStanceChooser(
        d,
        (st) => {
          d.style.visibility = "hidden";
          flyToBoard(d, () => playFromHand(c.id, st));
        },
        () => {
          d.style.visibility = "";
        },
      );
    });
    const cantPay = c.cost > G.playerMana || c.harvestCost > G.playerHarvest;
    const disable =
      G.current !== "player" ||
      (c.type !== "totem" && G.playerBoard.length >= 5);
    d.classList.toggle("blocked", cantPay);
    d.style.opacity = cantPay || disable ? 0.9 : 1;
    d.style.cursor = cantPay || disable ? "not-allowed" : "pointer";
    els.pHand.appendChild(d);
  });
  stackHand();
}
function stackHand() {
  const cards = $$("#playerHand .card");
  const total = cards.length;
  if (!total) return;
  const spread = 150;
  const width = cards[0].offsetWidth;
  const overlap = width - spread;
  els.pHand.style.setProperty("--hover-shift", `${overlap}px`);
  cards.forEach((c, i) => {
    const offset = (i - (total - 1) / 2) * spread;
    c.style.setProperty("--x", `${offset}px`);
    c.dataset.z = String(i + 1);
    c.style.zIndex = i + 1;
  });
}

function renderTotems() {
  if (!els.totemBar) return;
  els.totemBar.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const slot = document.createElement("div");
    slot.className = "totem-slot";
    if (G.totems[i]) slot.textContent = "🗿";
    els.totemBar.appendChild(slot);
  }
}
function renderCommanders() {
  if (els.playerCommander) {
    els.playerCommander.innerHTML = "";
    if (G.playerCommander) {
      const d = cardNode(G.playerCommander, "player");
      els.playerCommander.appendChild(d);
    }
  }
  if (els.aiCommander) {
    els.aiCommander.innerHTML = "";
    if (G.aiCommander) {
      const d = cardNode(G.aiCommander, "ai");
      els.aiCommander.appendChild(d);
    }
  }
}
function renderBoard() {
  validateChosen();
  els.pBoard.innerHTML = "";
  for (const c of G.playerBoard) {
    const d = cardNode(c, "player");
    tiltify(d);
    if (G.current === "player" && c.canAttack && c.stance !== "defense") {
      d.classList.add("selectable");
      d.addEventListener("click", () => selectAttacker(c));
    }
    els.pBoard.appendChild(d);
  }
  els.aBoard.innerHTML = "";
  for (const c of G.aiBoard) {
    const d = cardNode(c, "ai");
    tiltify(d);
    if (G.chosen) {
      if (legalTarget("ai", c)) {
        d.classList.add("selectable");
        d.addEventListener("click", () => attackCard(G.chosen, c));
      }
    }
    els.aBoard.appendChild(d);
  }
  let btn = document.querySelector("#aiBoard .face-attack-btn");
  if (!btn) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-ghost face-attack-btn";
    btn.textContent = "🗡️ Atacar diretamente";
    Object.assign(btn.style, {
      position: "absolute",
      top: "8px",
      right: "8px",
      display: "none",
    });
    btn.addEventListener("click", () => {
      if (G.chosen) attackFace(G.chosen, "ai");
    });
    els.aBoard.appendChild(btn);
  }
  updateFaceAttackZone();
}

function openStanceChooser(anchor, cb, onCancel) {
  closeStanceChooser();
  anchor.classList.add("chosen");
  const prevZ = anchor.style.zIndex;
  anchor.style.zIndex = 10000;
  const box = document.createElement("div");
  box.className = "stance-chooser";
  const bA = document.createElement("button");
  bA.className = "btn";
  bA.textContent = "⚔️ Ataque";
  const bD = document.createElement("button");
  bD.className = "btn";
  bD.textContent = "🛡️ Defesa";
  const cleanup = () => {
    anchor.classList.remove("chosen");
    anchor.style.zIndex = prevZ;
    closeStanceChooser();
  };
  bA.addEventListener("click", (e) => {
    e.stopPropagation();
    cleanup();
    cb("attack");
  });
  bD.addEventListener("click", (e) => {
    e.stopPropagation();
    cleanup();
    cb("defense");
  });
  box.append(bA, bD);
  anchor.appendChild(box);
  Object.assign(box.style, {
    position: "absolute",
    left: "50%",
    bottom: "100%",
    transform: "translate(-50%, -8px)",
  });
  setTimeout(() => {
    const h = (ev) => {
      if (ev.target.closest(".stance-chooser") || ev.target === anchor) return;
      window.removeEventListener("click", h, true);
      cleanup();
      onCancel && onCancel();
    };
    window.addEventListener("click", h, true);
    bA.focus();
  }, 0);
}
const closeStanceChooser = () => {
  const old = document.querySelector(".stance-chooser");
  old && old.remove();
  document
    .querySelectorAll(".hand .card.chosen")
    .forEach((c) => c.classList.remove("chosen"));
};
function flyToBoard(node, onEnd) {
  const r = node.getBoundingClientRect(),
    clone = node.cloneNode(true);
  Object.assign(clone.style, {
    left: r.left + "px",
    top: r.top + "px",
    width: r.width + "px",
    height: r.height + "px",
    position: "fixed",
    zIndex: 999,
    transition: "transform .45s ease,opacity .45s ease",
  });
  clone.classList.add("fly");
  document.body.appendChild(clone);
  const br = els.pBoard.getBoundingClientRect();
  requestAnimationFrame(() => {
    const tx = br.left + br.width / 2 - r.left - r.width / 2,
      ty = br.top + 10 - r.top;
    clone.style.transform = `translate(${tx}px,${ty}px) scale(.9)`;
    clone.style.opacity = "0";
  });
  setTimeout(() => {
    clone.remove();
    onEnd && onEnd();
  }, 450);
}
export function startGame(opts = {}) {
  const sanitize = (c) => {
    if (c.hp < 1) c.hp = 1;
    if (c.atk < 0) c.atk = 0;
    return c;
  };
  const continuing = opts.continueStory;
  G.mode = window.currentGameMode === "story" ? "story" : "solo";
  if (G.mode === "story") {
    if (!G.story) G.story = new StoryMode({ level: 1 });
    G.story.nextRound();
    G.aiDeckChoice = rand(ALL_DECKS);
    const boss = G.story.currentEncounter === "boss";
    G.enemyScaling = G.story.scaling;
    G.currentEnemyName = pickEnemyName(G.aiDeckChoice, boss);
    log(`Round ${G.story.round}: ${G.currentEnemyName} (${G.story.currentEncounter})`);
    showEncounterBanner(G.currentEnemyName, boss ? "boss" : "enemy");
    G.maxHandSize = 10;
  } else {
    G.story = null;
    G.enemyScaling = 0;
    G.maxHandSize = 5;
  }
  if (G.mode === "story" && continuing) {
    G.playerDeck.push(...G.playerHand, ...G.playerBoard, ...G.playerDiscard);
    G.playerHand = [];
    G.playerBoard = [];
    G.playerDiscard = [];
  } else {
    G.totems = [];
    G.playerDeck =
      G.playerDeckChoice === "custom" && G.customDeck
        ? G.customDeck.slice()
        : TEMPLATES[G.playerDeckChoice].map(makeCard);
    if (G.mode === "story") {
      const t = makeCard(["Totem de Força", "🗿", "Totem", 0, 0, 2, "Ative: +1/+1 em um aliado"]);
      t.type = "totem";
      G.playerDeck.push(t);
    }
  }
  const playerCmdKey =
    G.playerDeckChoice === "custom" ? "custom" : G.playerDeckChoice;
  G.playerCommander = { ...COMMANDERS[playerCmdKey] };
  G.playerItems = [];
  G.aiCommander = { ...COMMANDERS[G.aiDeckChoice] };
  G.aiItems = [];
  shuffle(G.playerDeck);
  G.playerDeck.forEach((c) => {
    sanitize(c);
    c.owner = "player";
    c.deck = G.playerDeckChoice === "custom" ? "custom" : G.playerDeckChoice;
  });
  G.aiDeck = TEMPLATES[G.aiDeckChoice].map(makeCard);
  G.aiDeck.forEach((c) => {
    sanitize(c);
    c.owner = "ai";
    c.deck = G.aiDeckChoice;
    if (G.mode === "story") {
      c.atk += G.enemyScaling;
      c.hp += G.enemyScaling;
    }
  });
  shuffle(G.aiDeck);
  G.playerDiscard = [];
  G.aiDiscard = [];
  G.playerHand = [];
  G.aiHand = [];
  G.playerBoard = [];
  G.aiBoard = [];
  G.playerHP = 30;
  G.aiHP = 30;
  G.current = "player";
  G.playerMana = 0;
  G.playerManaCap = 0;
  G.playerHarvest = 0;
  G.playerHarvestCap = 0;
  G.aiMana = 0;
  G.aiManaCap = 0;
  G.aiHarvest = 0;
  G.aiHarvestCap = 0;
  draw("player", 3);
  draw("ai", 3);
  newTurn();
  renderAll();
  stopMenuMusic();
  startMenuMusic("combat");
  log("A batalha começou!");
  sfx("start");
}
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
function draw(who, n = 1) {
  const deck = who === "player" ? G.playerDeck : G.aiDeck,
    hand = who === "player" ? G.playerHand : G.aiHand,
    disc = who === "player" ? G.playerDiscard : G.aiDiscard;
  for (let i = 0; i < n; i++) {
    if (deck.length === 0 && disc.length) {
      disc.forEach(resetCardState);
      deck.push(...shuffle(disc.splice(0)));
    }
    if (deck.length) {
      const c = deck.shift();
      resetCardState(c);
      if (c.hp < 1) c.hp = 1;
      if (hand.length >= G.maxHandSize) {
        disc.push(c);
        burnCard(c);
      } else {
        hand.push(c);
        if (who === "player") {
          sfx("draw");
          const deckEl = document.getElementById("drawPile");
          if (deckEl) {
            const r = deckEl.getBoundingClientRect();
            screenParticle("magic", r.left + r.width / 2, r.top + r.height / 2);
          }
        }
      }
    }
  }
  if (who === "player") {
    els.drawCount.textContent = G.playerDeck.length;
    els.discardCount.textContent = G.playerDiscard.length;
  }
}

function burnCard(c) {
  log(`${c.name} queimou por mão cheia!`);
  screenParticle("explosion", window.innerWidth / 2, window.innerHeight / 2);
}
function applyTotemBuffs() {
  if (!G.playerBoard.length || !G.totems.length) return;
  G.playerBoard.forEach((u) => {
    u.atk = u.baseAtk ?? u.atk;
    u.hp = u.baseHp ?? u.hp;
    u.baseAtk = u.atk;
    u.baseHp = u.hp;
  });
  G.totems.forEach((t) => {
    const count = Math.min(3, G.playerBoard.length);
    const picks = shuffle([...G.playerBoard]).slice(0, count);
    picks.forEach((u) => {
      if (t.buffs.atk) u.atk += t.buffs.atk;
      if (t.buffs.hp) u.hp += t.buffs.hp;
    });
  });
}
function newTurn(prev) {
  if (prev) applyEndTurnEffects(prev);
  if (G.current === "player") {
    if (G.mode === "story" && G.story) {
      const evt = G.story.nextRound();
      G.enemyScaling = G.story.scaling;
      if (evt.isBoss) {
        log("Um Boss se aproxima!");
      } else if (evt.isElite) {
        log("Encontro Elite à frente!");
      } else if (evt.isShop) {
        log("Um mercador misterioso aparece.");
      }
    }
    G.playerManaCap = clamp(G.playerManaCap + 1, 0, 10);
    G.playerMana = G.playerManaCap;
    G.playerHarvestCap = clamp(G.playerHarvestCap + 1, 0, 10);
    G.playerHarvest = G.playerHarvestCap;
    draw("player", 1);
    G.playerBoard.forEach((c) => (c.canAttack = true));
  } else {
    G.aiManaCap = clamp(G.aiManaCap + 1, 0, 10);
    G.aiMana = G.aiManaCap;
    G.aiHarvestCap = clamp(G.aiHarvestCap + 1, 0, 10);
    G.aiHarvest = G.aiHarvestCap;
    draw("ai", 1);
    G.aiBoard.forEach((c) => (c.canAttack = true));
  }
  renderAll();
}
function endTurn() {
  if (G.current !== "player") return;
  G.current = "ai";
  G.chosen = null;
  updateTargetingUI();
  newTurn("player");
  sfx("end");
  setTimeout(
    () =>
      aiTurn({
        G,
        summon,
        renderAll,
        legalTarget,
        attackCard,
        attackFace,
        rand,
        newTurn,
      }),
    500,
  );
}
function playFromHand(id, st) {
  if (G.current !== "player") return;
  const i = G.playerHand.findIndex((c) => c.id === id);
  if (i < 0) return;
  const c = G.playerHand[i];
  const boardFull = c.type !== "totem" && G.playerBoard.length >= 5;
  if (c.cost > G.playerMana || c.harvestCost > G.playerHarvest || boardFull)
    return;
  G.playerHand.splice(i, 1);
  G.playerMana -= c.cost;
  G.playerHarvest -= c.harvestCost;
  if (c.type === "totem") {
    if (G.totems.length >= 3) {
      log("Número máximo de Totens atingido.");
      G.playerDiscard.push(c);
    } else {
      const buffs = c.buffs || { atk: 1, hp: 1 };
      const t = { name: c.name, buffs };
      G.totems.push(t);
      if (G.story) G.story.addTotem(t);
      applyTotemBuffs();
      log(`${c.name} ativado.`);
    }
    renderAll();
    return;
  }
  summon("player", c, st);
  renderAll();
  sfx(st === "defense" ? "defense" : "play");
}
function summon(side, c, st = "attack") {
  const board = side === "player" ? G.playerBoard : G.aiBoard;
  c.stance = st;
  c.canAttack = st === "attack" && c.kw.includes("Furioso");
  if (side === "ai" && G.mode === "story") {
    c.atk += G.enemyScaling;
    c.hp += G.enemyScaling;
  }
  board.push(c);
  particleOnCard(c.id, "summon");
  log(
    `${side === "player" ? "Você" : "Inimigo"} jogou ${c.name} em modo ${st === "defense" ? "defesa" : "ataque"}.`,
  );
  triggerBattlecry(side, c);
  if (c.kw.includes("Absorver")) absorbFromAlly(side, c);
  if (st === "defense") setTimeout(() => animateDefense(c.id), 30);
  if (side === "player") applyTotemBuffs();
}
function triggerBattlecry(side, c) {
  const foe = side === "player" ? "ai" : "player";
  switch (c.battlecry) {
    case "draw1":
      draw(side, 1);
      log(`${c.name}: comprou 1 carta.`);
      break;
    case "heal2":
      {
        const allies = side === "player" ? G.playerBoard : G.aiBoard;
        if (allies.length) {
          const t = rand(allies);
          t.hp = Math.min(t.hp + 2, 20);
          fxTextOnCard(t.id, "+2", "heal");
          const n = nodeById(t.id);
          if (n) {
            const r = n.getBoundingClientRect();
            screenParticle("healing", r.left + r.width / 2, r.top + r.height / 2);
          }
          log(`${c.name}: curou 2 em ${t.name}.`);
        }
      }
      break;
    case "ping1":
      {
        const foes = foe === "ai" ? G.aiBoard : G.playerBoard;
        if (foes.length) {
          const t = rand(foes);
          damageMinion(t, 1);
          particleOnCard(t.id, "attack");
          fxTextOnCard(t.id, "-1", "dmg");
          log(`${c.name}: 1 de dano em ${t.name}.`);
          checkDeaths();
          renderAll();
          sfx("hit");
        }
      }
      break;
    case "buffRandom1":
      {
        const allies = (side === "player" ? G.playerBoard : G.aiBoard).filter(
          (x) => x.id !== c.id,
        );
        if (allies.length) {
          const t = rand(allies);
          t.atk += 1;
          t.hp += 1;
          fxTextOnCard(t.id, "+1/+1", "buff");
          particleOnCard(t.id, "magic");
          log(`${c.name}: deu +1/+1 em ${t.name}.`);
        }
      }
      break;
    case "buffAlliesAtk1":
      {
        const allies = (side === "player" ? G.playerBoard : G.aiBoard).filter(
          (x) => x.id !== c.id,
        );
        allies.forEach((x) => {
          x.atk += 1;
          fxTextOnCard(x.id, "+1 ATK", "buff");
          particleOnCard(x.id, "magic");
        });
        if (allies.length) log(`${c.name}: aliados ganharam +1 de ataque.`);
      }
      break;
  }
}

function absorbFromAlly(side, c) {
  const board = side === "player" ? G.playerBoard : G.aiBoard;
  const allies = board.filter((x) => x.id !== c.id && x.kw && x.kw.length);
  if (!allies.length) return;
  const src = rand(allies);
  const choices = src.kw.filter((k) => !c.kw.includes(k));
  if (!choices.length) return;
  const kw = rand(choices);
  c.kw.push(kw);
  particleOnCard(c.id, "magic");
  fxTextOnCard(c.id, kw, "buff");
  log(`${c.name} absorveu ${kw}.`);
  if (c.name === "Sombra Rúnica") {
    c.atk += 1;
    c.hp += 1;
  }
  if (c.name === "Capataz de Runas") {
    const foes = side === "player" ? G.aiBoard : G.playerBoard;
    foes.forEach((t) => {
      damageMinion(t, 1);
      particleOnCard(t.id, "attack");
      fxTextOnCard(t.id, "-1", "dmg");
    });
    checkDeaths();
  }
}

function applyEndTurnEffects(side) {
  const board = side === "player" ? G.playerBoard : G.aiBoard;
  const foeBoard = side === "player" ? G.aiBoard : G.playerBoard;
  for (const c of board) {
    if (c.kw.includes("Mutável")) {
      const atk = c.atk;
      c.atk = c.hp;
      c.hp = atk;
      fxTextOnCard(c.id, "⇆", "buff");
    }
    if (c.name === "Totem Absorvente") {
      const foes = foeBoard.filter((f) => f.kw && f.kw.length);
      if (foes.length) {
        const src = rand(foes);
        const opts = src.kw.filter((k) => !c.kw.includes(k));
        if (opts.length) {
          const kw = rand(opts);
          c.kw.push(kw);
          particleOnCard(c.id, "magic");
          fxTextOnCard(c.id, kw, "buff");
          log(`${c.name} absorveu ${kw} de ${src.name}.`);
        }
      }
    }
  }
}
function updateTargetingUI() {
  document.body.classList.toggle("targeting", !!G.chosen);
}
function validateChosen() {
  if (!G.chosen) return false;
  if (G.current !== "player") {
    G.chosen = null;
    document.body.classList.remove("targeting");
    return false;
  }
  const ref = G.playerBoard.find((x) => x.id === G.chosen.id);
  if (!ref || !ref.canAttack || ref.stance === "defense") {
    G.chosen = null;
    document.body.classList.remove("targeting");
    return false;
  }
  G.chosen = ref; // normalize reference
  return true;
}
function cancelTargeting() {
  if (!G.chosen) return;
  G.chosen = null;
  updateTargetingUI();
  els.aBoard.classList.remove("face-can-attack");
  renderBoard();
}
function selectAttacker(c) {
  if (G.current !== "player" || !c.canAttack || c.stance === "defense")
    return;
  G.chosen = c;
  updateTargetingUI();
  renderBoard();
  updateFaceAttackZone();
  G.aiBoard
    .filter((x) => x.stance === "defense")
    .forEach((x) => setTimeout(() => animateDefense(x.id), 20));
}
function updateFaceAttackZone() {
  const guard = hasGuard(G.aiBoard),
    valid = validateChosen();
  const canFace = valid && !guard;
  const btn = document.querySelector("#aiBoard .face-attack-btn");
  if (canFace) {
    els.aBoard.classList.add("face-can-attack");
    btn && (btn.style.display = "block");
  } else {
    els.aBoard.classList.remove("face-can-attack");
    btn && (btn.style.display = "none");
  }
}
function legalTarget(side, target) {
  const b = side === "ai" ? G.aiBoard : G.playerBoard;
  return hasGuard(b)
    ? target.kw.includes("Protetor") || target.stance === "defense"
    : true;
}
const nodeById = (id) => document.querySelector(`.card[data-id=\"${id}\"]`);
const addAnim = (n, c, d = 400) => {
  n && n.classList.add(c);
  setTimeout(() => n && n.classList.remove(c), d);
};
const animateAttack = (aId, tId) => {
  const a = nodeById(aId),
    t = tId ? nodeById(tId) : null;
  addAnim(a, "attack-lunge", 350);
  if (t) addAnim(t, "hit-shake", 350);
};
const animateDefense = (id) => {
  const n = nodeById(id);
  addAnim(n, "shield-flash", 600);
};
function screenSlash(x, y, ang) {
  const fx = document.createElement("div");
  fx.className = "fx fx-slash";
  fx.style.left = x + "px";
  fx.style.top = y + "px";
  fx.style.setProperty("--ang", ang + "deg");
  document.body.appendChild(fx);
  setTimeout(() => fx.remove(), 380);
}
function screenParticle(name, x, y) {
  const fx = document.createElement("div");
  fx.className = "fx fx-" + name;
  fx.style.left = x + "px";
  fx.style.top = y + "px";
  document.body.appendChild(fx);
  setTimeout(() => fx.remove(), 600);
}
function showEncounterBanner(name, type = "enemy") {
  const b = document.getElementById("encounterBanner");
  if (!b) return;
  b.textContent = name;
  b.className = type + " show";
  setTimeout(() => b.classList.remove("show"), 1500);
}

function particleOnCard(cid, name) {
  const n = nodeById(cid);
  if (!n) return;
  const r = n.getBoundingClientRect();
  screenParticle(name, r.left + r.width / 2, r.top + r.height / 2);
}
function particleOnFace(side, name) {
  const el = side === "ai" ? (els.barAHP || els.aHP2) : (els.barPHP || els.pHP2);
  if (!el) return;
  const r = el.getBoundingClientRect();
  screenParticle(name, r.left + r.width / 2, r.top + r.height / 2);
}
function fxTextOnCard(cid, text, cls) {
  const n = document.querySelector(`.card[data-id="${cid}"]`);
  if (!n) return;
  const r = n.getBoundingClientRect();
  const fx = document.createElement("div");
  fx.className = "fx-float " + (cls || "");
  fx.textContent = text;
  fx.style.left = r.left + r.width / 2 + "px";
  fx.style.top = r.top + r.height / 2 + "px";
  document.body.appendChild(fx);
  setTimeout(() => fx.remove(), 950);
}
function fxTextOnFace(side, text, cls) {
  const el = side === "ai" ? (els.barAHP || els.aHP2) : (els.barPHP || els.pHP2);
  if (!el) return;
  const r = el.getBoundingClientRect();
  const fx = document.createElement("div");
  fx.className = "fx-float " + (cls || "");
  fx.textContent = text;
  fx.style.left = r.left + r.width / 2 + "px";
  fx.style.top = r.top + r.height / 2 + "px";
  document.body.appendChild(fx);
  setTimeout(() => fx.remove(), 950);
}
function attackCard(attacker, target) {
  if (!attacker || !attacker.canAttack || attacker.stance === "defense")
    return;
  sfx("attack");
  const a = nodeById(attacker.id),
    t = nodeById(target.id);
  if (a && t) {
    const ar = a.getBoundingClientRect(),
      tr = t.getBoundingClientRect();
    screenSlash(ar.right, ar.top + ar.height / 2, 15);
  }
  animateAttack(attacker.id, target.id);
  if (target.stance === "defense") animateDefense(target.id);
  particleOnCard(target.id, "attack");
  const pre = target.hp,
    overflow = Math.max(0, attacker.atk - pre);
  damageMinion(target, attacker.atk);
  damageMinion(attacker, target.atk);
  sfx("hit");
  if (overflow > 0 && target.hp <= 0) {
    const isP = G.playerBoard.includes(attacker);
    sfx("overflow");
    if (isP) {
      G.aiHP = clamp(G.aiHP - overflow, 0, 99);
      log(
        `${attacker.name} excedeu em ${overflow} e causou dano direto ao Inimigo!`,
      );
      particleOnFace("ai", "attack");
    } else {
      G.playerHP = clamp(G.playerHP - overflow, 0, 99);
      log(
        `${attacker.name} excedeu em ${overflow} e causou dano direto a Você!`,
      );
      particleOnFace("player", "attack");
    }
    checkWin();
  }
  attacker.canAttack = false;
  log(`${attacker.name} atacou ${target.name}.`);
  checkDeaths();
  renderAll();
  G.chosen = null;
  updateTargetingUI();
  els.aBoard.classList.remove("face-can-attack");
}
function attackFace(attacker, face) {
  if (!attacker || !attacker.canAttack || attacker.stance === "defense")
    return;
  sfx("attack");
  const a = nodeById(attacker.id);
  if (a) {
    const ar = a.getBoundingClientRect();
    screenSlash(ar.right, ar.top + ar.height / 2, 10);
  }
  animateAttack(attacker.id, null);
  particleOnFace(face, "attack");
  const dmg = attacker.atk;
  attacker.canAttack = false;
  if (face === "ai") {
    fxTextOnFace("ai", "-" + dmg, "dmg");
    G.aiHP = clamp(G.aiHP - dmg, 0, 99);
    log(`${attacker.name} causou ${dmg} ao Inimigo!`);
    sfx("crit");
  } else {
    fxTextOnFace("player", "-" + dmg, "dmg");
    G.playerHP = clamp(G.playerHP - dmg, 0, 99);
    log(`${attacker.name} causou ${dmg} a Você!`);
    sfx("hit");
  }
  checkWin();
  G.chosen = null;
  updateTargetingUI();
  els.aBoard.classList.remove("face-can-attack");
  renderAll();
}
function damageMinion(m, amt) {
  if (!m || typeof amt !== "number") return;
  fxTextOnCard(m.id, "-" + amt, "dmg");
  m.hp = clamp(m.hp - amt, 0, 99);
  if (m.hp <= 0) setTimeout(checkDeaths, 10);
}
function checkDeaths() {
  const deadA = G.aiBoard.filter((c) => c.hp <= 0);
  deadA.forEach((c) => {
    particleOnCard(c.id, "explosion");
    sfx("death");
    resetCardState(c);
  });
  if (deadA.length) {
    G.aiBoard = G.aiBoard.filter((c) => c.hp > 0);
    G.aiDiscard.push(...deadA);
    log("Uma criatura inimiga caiu.");
  }
  const deadP = G.playerBoard.filter((c) => c.hp <= 0);
  deadP.forEach((c) => {
    particleOnCard(c.id, "explosion");
    sfx("death");
    resetCardState(c);
  });
  if (deadP.length) {
    G.playerBoard = G.playerBoard.filter((c) => c.hp > 0);
    G.playerDiscard.push(...deadP);
    log("Sua criatura caiu.");
  }
  els.discardCount.textContent = G.playerDiscard.length;
}
      attackFace(a, "player");
    }
    setTimeout(next, 500);
  }
  setTimeout(next, 500);
}
function fireworks(win) {
  const b = document.createElement("div");
  b.className = "boom";
  b.style.left = "50%";
  b.style.top = "50%";
  b.style.background = `radial-gradient(circle at 50% 50%, ${win ? "#8bf5a2" : "#ff8a8a"}, transparent)`;
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 650);
}
function endGame(win) {
  stopMenuMusic();
  els.endMsg.textContent = win ? "You WIN!" : "You Lose...";
  els.endMsg.style.color = win ? "#8bf5a2" : "#ff8a8a";
  els.endSub.textContent = win
    ? "Parabéns! Quer continuar jogando?"
    : "Tentar de novo ou voltar ao menu.";
  els.endOverlay.classList.add("show");
  setTimeout(() => fireworks(win), 1000);
}
function checkWin() {
  if (G.aiHP <= 0) {
    if (G.mode === "story" && G.story) {
      const { leveled, rewards } = G.story.handleVictory();
      log(`Recompensas disponíveis: ${rewards.join(", ")}`);
      if (leveled) log(`Você alcançou o nível ${G.story.level}!`);
      setTimeout(() => startGame({ continueStory: true }), 1000);
      return;
    }
    endGame(true);
  }
  if (G.playerHP <= 0) {
    endGame(false);
  }
}
function allCards() {
  let out = [];
  for (const k of Object.keys(TEMPLATES)) {
    for (const raw of TEMPLATES[k]) {
      const c = makeCard(raw);
      c.deck = k;
      out.push(c);
    }
  }
  return out;
}
function renderEncy(filter = "all", locked = false) {
  els.encyGrid.innerHTML = "";
  const cards =
    filter === "all"
      ? allCards()
      : TEMPLATES[filter]
          .map(makeCard)
          .map((c) => Object.assign(c, { deck: filter }));
  cards.forEach((c) => {
    const d = document.createElement("div");
    d.className = `card ency-card bg-${c.deck}`;
    d.innerHTML = `<div class='bg bg-${c.deck}'></div><div class='head'><span class='cost'>${c.cost}${c.harvestCost ? `🌾${c.harvestCost}` : ""}</span><div class='name'>${c.name}</div></div><div class='mini'>${c.tribe} • ⚔️ ${c.atk} / ❤️ ${c.hp}</div><div class='art'>${c.emoji}</div><div class='details'><div>${(c.kw || []).map((k) => `<span class='chip' data-type='keyword' data-tip='${k === "Protetor" ? "Enquanto houver Protetor ou carta em Defesa do lado do defensor, ataques devem mirá-los." : k === "Furioso" ? "Pode atacar no turno em que é jogada." : ""}' >${k}</span>`).join(" ")}</div><div style='margin-top:6px'>${c.text || ""}</div></div>`;
    tiltify(d);
    els.encyGrid.appendChild(d);
  });
  els.ency.classList.add("show");
  els.encyFilters.style.display = locked ? "none" : "flex";
  $$(".filters .fbtn").forEach((b) =>
    b.classList.toggle(
      "active",
      b.dataset.deck === filter ||
        (filter === "all" && b.dataset.deck === "all"),
    ),
  );
}
els.endBtn.addEventListener("click", endTurn);
els.muteBtn.addEventListener("click", () => {
  initAudio();
  ensureRunning();
  toggleMute(els.muteBtn);
});
window.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (G.chosen) {
    cancelTargeting();
    return;
  }
  if (!els.gameMenu) return;
  const isOpen = els.gameMenu.classList.contains("show");
  if (isOpen) {
    els.gameMenu.classList.remove("show");
  } else {
    els.gameMenu.classList.add("show");
    if (els.restartBtn)
      els.restartBtn.style.display = window.isMultiplayer ? "none" : "block";
  }
});
document.addEventListener(
  "click",
  (e) => {
    if (!G.chosen) return;
    if (
      e.target.closest("#aiBoard .card.selectable") ||
      e.target.closest("#playerBoard .card.selectable") ||
      e.target.closest("#aiBoard .face-attack-btn")
    )
      return;
    cancelTargeting();
  },
  { capture: true },
);
$$(".deckbtn").forEach((btn) => {
  btn.addEventListener("pointermove", (e) => {
    const r = btn.getBoundingClientRect();
    btn.style.setProperty(
      "--px",
      ((e.clientX - r.left) / r.width) * 100 + "%",
    );
    btn.style.setProperty(
      "--py",
      ((e.clientY - r.top) / r.height) * 100 + "%",
    );
  });
  btn.addEventListener("mouseenter", () => {
    btn.style.setProperty("--halo", 0.7);
    btn.style.setProperty("--shine", 0.7);
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.removeProperty("--halo");
    btn.style.removeProperty("--shine");
  });
  btn.addEventListener("click", () => {
    const pick = btn.dataset.deck;
    G.playerDeckChoice = pick;
    G.aiDeckChoice = rand(
      ALL_DECKS.filter((d) => d !== pick),
    );
    startMenuMusic(pick);
    $$(".deckbtn").forEach((b) => (b.style.outline = "none"));
    btn.style.outline = "2px solid var(--accent)";
  });
  const book = btn.querySelector(".view-cards");
  book &&
    book.addEventListener("click", (ev) => {
      ev.stopPropagation();
      renderEncy(btn.dataset.deck, true);
    });
});
els.startGame.addEventListener("click", () => {
  els.start.style.display = "none";
  initAudio();
  ensureRunning();
  stopMenuMusic();
  startGame();
});
els.openEncy.addEventListener("click", () => renderEncy("all", false));
els.closeEncy.addEventListener("click", () => {
  els.ency.classList.remove("show");
});
$$(".filters .fbtn").forEach((b) =>
  b.addEventListener("click", () => {
    renderEncy(b.dataset.deck, false);
  }),
);
els.playAgainBtn.addEventListener("click", () => {
  els.endOverlay.classList.remove("show");
  startGame();
});
els.rematchBtn.addEventListener("click", () => {
  els.endOverlay.classList.remove("show");
  startGame();
});
els.menuBtn.addEventListener("click", () => {
  els.endOverlay.classList.remove("show");
  els.start.style.display = "grid";
  startMenuMusic("menu");
});
document.addEventListener("DOMContentLoaded", tryStartMenuMusicImmediate);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") tryStartMenuMusicImmediate();
});
window.addEventListener(
  "pointerdown",
  () => {
    initAudio();
    ensureRunning();
    startMenuMusic("menu");
  },
  { once: true },
);
