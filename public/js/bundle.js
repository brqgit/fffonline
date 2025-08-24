const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
function log(t) {
  const logBox = document.querySelector("#log");
  if (!logBox) return;
  const d = document.createElement("div");
  d.textContent = t;
  logBox.prepend(d);
}

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null,
  master = null,
  muted = false;
function initAudio() {
  if (!AudioCtx) return;
  if (!actx) {
    actx = new AudioCtx();
    master = actx.createGain();
    master.gain.value = 0.18;
    master.connect(actx.destination);
  }
}
function ensureRunning() {
  if (actx && actx.state === "suspended") actx.resume();
}
function tone(f = 440, d = 0.1, t = "sine", v = 1, w = 0) {
  if (!actx || muted) return;
  ensureRunning();
  const o = actx.createOscillator(),
    g = actx.createGain();
  o.type = t;
  o.frequency.setValueAtTime(f, actx.currentTime + w);
  g.gain.setValueAtTime(0.0001, actx.currentTime + w);
  g.gain.exponentialRampToValueAtTime(
    Math.max(0.0002, v),
    actx.currentTime + w + 0.01,
  );
  g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + w + d);
  o.connect(g);
  g.connect(master);
  o.start(actx.currentTime + w);
  o.stop(actx.currentTime + w + d + 0.02);
}
function sfx(n) {
  if (!actx || muted) return;
  (
    ({
      start: () => {
        tone(520, 0.08, "triangle", 0.7, 0);
        tone(780, 0.09, "triangle", 0.6, 0.08);
      },
      play: () => {
        tone(420, 0.07, "sine", 0.7, 0);
        tone(560, 0.08, "sine", 0.6, 0.06);
      },
      defense: () => {
        tone(280, 0.09, "square", 0.6, 0);
        tone(200, 0.12, "sine", 0.5, 0.08);
      },
      attack: () => {
        tone(300, 0.06, "sawtooth", 0.7, 0);
        tone(220, 0.06, "sawtooth", 0.6, 0.05);
      },
      hit: () => {
        tone(160, 0.07, "square", 0.6, 0);
      },
      overflow: () => {
        tone(600, 0.1, "triangle", 0.6, 0);
      },
      death: () => {
        tone(420, 0.08, "sawtooth", 0.6, 0);
        tone(260, 0.12, "sawtooth", 0.55, 0.06);
      },
      end: () => {
        tone(600, 0.06, "triangle", 0.6, 0);
        tone(400, 0.06, "triangle", 0.5, 0.05);
      },
      crit: () => {
        tone(120, 0.08, "square", 0.75, 0);
        tone(90, 0.12, "square", 0.7, 0.06);
      },
      error: () => {
        tone(140, 0.05, "square", 0.6, 0);
        tone(140, 0.05, "square", 0.6, 0.06);
      },
    })[n] || (() => {})
  )();
}
// --- MENU MUSIC (procedural, deck-themed) ---
let musicGain = null,
  musicLoopId = null,
  musicOn = false,
  musicPreset = "menu";
const MUSIC = {
  menu: {
    bpm: 84,
    leadBase: 196,
    bassBase: 98,
    leadWave: "triangle",
    bassWave: "sine",
    scale: [0, 3, 5, 7, 5, 3, 0, -5],
  },
  vikings: {
    bpm: 76,
    leadBase: 174.61,
    bassBase: 87.31,
    leadWave: "sawtooth",
    bassWave: "sine",
    scale: [0, 3, 5, 7, 10, 7, 5, 3],
  },
  animais: {
    bpm: 90,
    leadBase: 220,
    bassBase: 110,
    leadWave: "square",
    bassWave: "sine",
    scale: [0, 2, 5, 7, 9, 7, 5, 2],
  },
  pescadores: {
    bpm: 96,
    leadBase: 196,
    bassBase: 98,
    leadWave: "triangle",
    bassWave: "triangle",
    scale: [0, 2, 4, 7, 9, 7, 4, 2],
  },
  floresta: {
    bpm: 68,
    leadBase: 207.65,
    bassBase: 103.83,
    leadWave: "sine",
    bassWave: "sine",
    scale: [0, 3, 5, 10, 5, 3, 0, -2],
  },
  combat: {
    bpm: 118,
    leadBase: 220,
    bassBase: 110,
    leadWave: "sawtooth",
    bassWave: "square",
    scale: [0, 2, 3, 5, 7, 8, 7, 5],
    perc: true,
    ac: 4,
  },
};
function startMenuMusic(preset) {
  if (!AudioCtx || muted) return;
  initAudio();
  ensureRunning();
  if (preset && preset !== musicPreset && musicOn) {
    stopMenuMusic();
  }
  musicPreset = preset || musicPreset || "menu";
  if (musicOn) return;
  musicOn = true;
  const P = MUSIC[musicPreset] || MUSIC.menu;
  musicGain = actx.createGain();
  musicGain.gain.value = 0.0001;
  musicGain.connect(master);
  const tgt = musicPreset === "combat" ? 0.22 : 0.18;
  musicGain.gain.exponentialRampToValueAtTime(tgt, actx.currentTime + 0.4);
  const beat = 60 / P.bpm,
    steps = P.scale.length;
  const schedule = () => {
    if (!musicOn || !musicGain) return;
    let t = actx.currentTime;
    for (let i = 0; i < steps; i++) {
      const f = P.leadBase * Math.pow(2, P.scale[i] / 12),
        o = actx.createOscillator(),
        g = actx.createGain();
      o.type = P.leadWave;
      o.frequency.setValueAtTime(f, t + i * beat);
      g.gain.setValueAtTime(0.0001, t + i * beat);
      g.gain.exponentialRampToValueAtTime(
        musicPreset === "combat" ? 0.13 : 0.11,
        t + i * beat + 0.01,
      );
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * beat + beat * 0.92);
      o.connect(g);
      g.connect(musicGain);
      o.start(t + i * beat);
      o.stop(t + i * beat + beat);
    }
    for (let i = 0; i < steps; i += 2) {
      const o = actx.createOscillator(),
        g = actx.createGain();
      o.type = P.bassWave;
      o.frequency.setValueAtTime(P.bassBase, t + i * beat);
      g.gain.setValueAtTime(0.0001, t + i * beat);
      g.gain.exponentialRampToValueAtTime(
        musicPreset === "combat" ? 0.1 : 0.09,
        t + i * beat + 0.01,
      );
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * beat + beat * 0.96);
      o.connect(g);
      g.connect(musicGain);
      o.start(t + i * beat);
      o.stop(t + i * beat + beat);
    }
    if (P.perc) {
      for (let i = 0; i < steps; i++) {
        const h = actx.createOscillator(),
          hg = actx.createGain();
        h.type = "square";
        h.frequency.setValueAtTime(1600, t + i * beat);
        hg.gain.setValueAtTime(0.0001, t + i * beat);
        hg.gain.exponentialRampToValueAtTime(0.07, t + i * beat + 0.005);
        hg.gain.exponentialRampToValueAtTime(
          0.0001,
          t + i * beat + beat * 0.2,
        );
        h.connect(hg);
        hg.connect(musicGain);
        h.start(t + i * beat);
        h.stop(t + i * beat + beat * 0.2);
        if (P.ac && i % P.ac === 0) {
          const k = actx.createOscillator(),
            kg = actx.createGain();
          k.type = "sine";
          k.frequency.setValueAtTime(120, t + i * beat);
          kg.gain.setValueAtTime(0.0001, t + i * beat);
          kg.gain.exponentialRampToValueAtTime(0.12, t + i * beat + 0.01);
          kg.gain.exponentialRampToValueAtTime(
            0.0001,
            t + i * beat + beat * 0.3,
          );
          k.connect(kg);
          kg.connect(musicGain);
          k.start(t + i * beat);
          k.stop(t + i * beat + beat * 0.3);
        }
      }
    }
  };
  schedule();
  const loopMs = beat * steps * 1000;
  musicLoopId = setInterval(schedule, loopMs - 25);
}
function stopMenuMusic() {
  if (!musicOn) return;
  musicOn = false;
  if (musicLoopId) {
    clearInterval(musicLoopId);
    musicLoopId = null;
  }
  if (musicGain) {
    try {
      musicGain.gain.exponentialRampToValueAtTime(
        0.0001,
        actx.currentTime + 0.25,
      );
    } catch (e) {}
    setTimeout(() => {
      try {
        musicGain.disconnect();
      } catch (e) {}
      musicGain = null;
    }, 300);
  }
}
function tryStartMenuMusicImmediate() {
  if (!AudioCtx) return;
  initAudio();
  try {
    ensureRunning();
  } catch (e) {}
  try {
    startMenuMusic("menu");
  } catch (e) {}
  if (actx && actx.state !== "running") {
    try {
      actx
        .resume()
        .then(() => startMenuMusic("menu"))
        .catch(() => {});
    } catch (e) {}
  }
  if (!musicOn) {
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (musicOn || tries > 8) {
        clearInterval(t);
        return;
      }
      try {
        initAudio();
        ensureRunning();
        startMenuMusic("menu");
      } catch (e) {}
    }, 800);
  }
}

function toggleMute(btn) {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.18;
  if (musicGain) musicGain.gain.value = muted ? 0 : 0.18;
  if (btn) btn.textContent = muted ? "🔇 Mudo" : "🔊 Som";
}

function aiTurn(ctx) {
  const { G, summon, renderAll, legalTarget, attackCard, attackFace, rand, newTurn } = ctx;
  const playable = G.aiHand
    .filter((c) => c.cost <= G.aiMana && c.harvestCost <= G.aiHarvest)
    .sort((a, b) => b.cost - a.cost);
  while (playable.length && G.aiBoard.length < 5 && G.aiMana > 0) {
    const c = playable.shift();
    const i = G.aiHand.findIndex((x) => x.id === c.id);
    if (i > -1 && c.cost <= G.aiMana && c.harvestCost <= G.aiHarvest) {
      G.aiHand.splice(i, 1);
      const stance =
        c.hp >= c.atk + 1
          ? Math.random() < 0.7
            ? "defense"
            : "attack"
          : Math.random() < 0.3
            ? "defense"
            : "attack";
      summon("ai", c, stance);
      G.aiMana -= c.cost;
      G.aiHarvest -= c.harvestCost;
    }
  }
  renderAll();
  const attackers = G.aiBoard.filter((c) => c.canAttack && c.stance !== "defense");
  function next() {
    if (!attackers.length) {
      G.current = "player";
      newTurn();
      return;
    }
    const a = attackers.shift();
    const legal = G.playerBoard.filter((x) => legalTarget("player", x));
    if (legal.length) {
      attackCard(a, rand(legal));
    } else {
      attackFace(a, "player");
    }
    setTimeout(next, 500);
  }
  setTimeout(next, 500);
}

const Keyword = Object.freeze({
  FURIOSO: 'Furioso',
  PROTETOR: 'Protetor',
  PERCEPCAO: 'Percepção',
  CURA: 'Cura',
  BENCAO: 'Bênção',
  CORVO: 'Corvo',
  SERPENTE: 'Serpente',
});

const rand = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => Math.random().toString(36).slice(2);

const KW = {
    P: Keyword.PROTETOR,
    F: Keyword.FURIOSO,
    PE: Keyword.PERCEPCAO,
    C: Keyword.CURA,
    B: Keyword.BENCAO,
    CV: Keyword.CORVO,
    S: Keyword.SERPENTE,
  },
  BC = {
    D1: "draw1",
    H2: "heal2",
    P1: "ping1",
    BR1: "buffRandom1",
    BA1: "buffAlliesAtk1",
  };
const makeCard = (a) => {
  const [n, e, t, atk, hp, cost, tx, k = 0, b = 0, harvest = 0] = a;
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
  ],
  animais: [
    ["Urso Pardo", "🐻", "Animal", 6, 6, 5, "Protetor", "P"],
    ["Lobo Cinzento", "🐺", "Animal", 4, 2, 3, "Furioso", "F"],
    ["Javali Selvagem", "🐗", "Animal", 3, 2, 2, "Impulsivo"],
    ["Cervo Nobre", "🦌", "Animal", 4, 5, 4, "Resistente"],
    ["Coruja Sábia", "🦉", "Animal", 1, 2, 1, "Entra: compre 1", "", "D1"],
    ["Cavalo de Guerra", "🐴", "Animal", 3, 3, 3, "Confiável"],
    ["Cabra da Montanha", "🐐", "Animal", 2, 3, 2, "Protetor", "P"],
    ["Águia do Norte", "🦅", "Animal", 5, 3, 4, "Veloz"],
    ["Urso Polar", "🐻‍❄️", "Animal", 7, 7, 6, "Gigante"],
    ["Serpente do Mar", "🐍", "Animal", 8, 7, 7, "Colosso"],
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
  ],
};
const HUMAN = ["vikings", "pescadores"],
  BEAST = ["animais", "floresta"];
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
  chosen: null,
  playerDeckChoice: "vikings",
  aiDeckChoice: "animais",
  customDeck: null,
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
};
// deck builder DOM (may be null if builder UI not present)
$("#pool");
  $("#chosen");
  $("#countDeck");
  $("#curve");
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

function tiltify(card) {
  card.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * 100,
      my = ((e.clientY - r.top) / r.height) * 100;
    card.style.setProperty("--mx", mx + "%");
    card.style.setProperty("--my", my + "%");
    card.style.setProperty("--rY", (mx - 50) / 8 + "deg");
    card.style.setProperty("--rX", -(my - 50) / 8 + "deg");
    card.classList.add("tilted");
  });
  card.addEventListener("mouseleave", () => {
    card.classList.remove("tilted");
    card.style.removeProperty("--rX");
    card.style.removeProperty("--rY");
  });
}
function cardNode(c, owner) {
  const d = document.createElement("div");
  d.className = `card ${owner === "player" ? "me" : "enemy"} ${c.stance === "defense" ? "defense" : ""}`;
  d.dataset.id = c.id;
  const costText = `${c.cost}${c.harvestCost ? `🌾${c.harvestCost}` : ""}`;
  d.innerHTML = `<div class="bg bg-${c.deck || "default"}"></div><div class="head"><span class="cost">${costText}</span><div class="name">${c.name}</div>${c.stance ? `<span class="badge ${c.stance === "defense" ? "def" : "atk"}">${c.stance === "defense" ? "🛡️" : "⚔️"}</span>` : ""}</div><div class="tribe">${c.tribe}</div><div class="art">${c.emoji}</div><div class="text">${(c.kw || []).map((k) => `<span class='keyword' data-tip='${k === "Protetor" ? "Enquanto houver Protetor ou carta em Defesa do lado do defensor, ataques devem mirá-los." : k === "Furioso" ? "Pode atacar no turno em que é jogada." : ""}' >${k}</span>`).join(" ")} ${c.text || ""}</div><div class="stats"><span class="gem atk">⚔️ ${c.atk}</span>${c.stance ? `<span class="stance-label ${c.stance}">${c.stance === 'defense' ? '🛡️' : '⚔️'}</span>` : ''}<span class="gem hp ${c.hp <= 2 ? "low" : ""}">❤️ ${c.hp}</span></div>`;
  return d;
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
}
function renderHand() {
  els.pHand.innerHTML = "";
  G.playerHand.forEach((c) => {
    const d = cardNode(c, "player");
    tiltify(d);
    d.classList.add("handcard");
    d.addEventListener("click", (e) => {
      const blocked =
        c.cost > G.playerMana ||
        c.harvestCost > G.playerHarvest ||
        G.current !== "player" ||
        G.playerBoard.length >= 5;
      if (blocked) {
        d.style.transform = "translateY(-2px)";
        setTimeout(() => (d.style.transform = ""), 150);
        sfx("error");
        return;
      }
      e.stopPropagation();
      openStanceChooser(d, (st) =>
        flyToBoard(d, () => playFromHand(c.id, st)),
      );
    });
    const cantPay = c.cost > G.playerMana || c.harvestCost > G.playerHarvest;
    const disable = G.current !== "player" || G.playerBoard.length >= 5;
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
  cards.forEach((c, i) => {
    const offset = (i - (total - 1) / 2) * spread;
    c.style.left = `calc(50% + ${offset}px - 88px)`;
    c.style.zIndex = i + 1;
    c.onmouseenter = () => (c.style.zIndex = 1000);
    c.onmouseleave = () => (c.style.zIndex = i + 1);
  });
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
function openStanceChooser(anchor, cb) {
  closeStanceChooser();
  const r = anchor.getBoundingClientRect(),
    box = document.createElement("div");
  box.className = "stance-chooser";
  Object.assign(box.style, {
    left: Math.max(8, r.left + r.width / 2 - 120) + "px",
    top: Math.max(8, r.top - 48) + "px",
  });
  const bA = document.createElement("button");
  bA.className = "btn";
  bA.textContent = "⚔️ Ataque";
  const bD = document.createElement("button");
  bD.className = "btn";
  bD.textContent = "🛡️ Defesa";
  bA.onclick = () => {
    closeStanceChooser();
    cb("attack");
  };
  bD.onclick = () => {
    closeStanceChooser();
    cb("defense");
  };
  box.append(bA, bD);
  document.body.appendChild(box);
  setTimeout(() => {
    const h = (ev) => {
      if (ev.target.closest(".stance-chooser")) return;
      window.removeEventListener("click", h, true);
      closeStanceChooser();
    };
    window.addEventListener("click", h, true);
    bA.focus();
  }, 0);
}
const closeStanceChooser = () => {
  const old = document.querySelector(".stance-chooser");
  old && old.remove();
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
function startGame() {
  const sanitize = (c) => {
    if (c.hp < 1) c.hp = 1;
    if (c.atk < 0) c.atk = 0;
    return c;
  };
  G.playerDeck =
    G.playerDeckChoice === "custom" && G.customDeck
      ? shuffle(G.customDeck.slice())
      : TEMPLATES[G.playerDeckChoice].map(makeCard);
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
  });
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
      deck.push(...shuffle(disc.splice(0)));
    }
    if (deck.length) {
      const c = deck.shift();
      if (c.hp < 1) c.hp = 1;
      hand.push(c);
    }
  }
  if (who === "player") {
    els.drawCount.textContent = G.playerDeck.length;
    els.discardCount.textContent = G.playerDiscard.length;
  }
}
function newTurn() {
  if (G.current === "player") {
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
  newTurn();
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
  if (
    c.cost > G.playerMana ||
    c.harvestCost > G.playerHarvest ||
    G.playerBoard.length >= 5
  )
    return;
  G.playerHand.splice(i, 1);
  summon("player", c, st);
  G.playerMana -= c.cost;
  G.playerHarvest -= c.harvestCost;
  renderAll();
  sfx(st === "defense" ? "defense" : "play");
}
function summon(side, c, st = "attack") {
  const board = side === "player" ? G.playerBoard : G.aiBoard;
  c.stance = st;
  c.canAttack = st === "attack" && c.kw.includes("Furioso");
  board.push(c);
  log(
    `${side === "player" ? "Você" : "Inimigo"} jogou ${c.name} em modo ${st === "defense" ? "defesa" : "ataque"}.`,
  );
  triggerBattlecry(side, c);
  if (st === "defense") setTimeout(() => animateDefense(c.id), 30);
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
function particleOnCard(cid, name) {
  const n = nodeById(cid);
  if (!n) return;
  const r = n.getBoundingClientRect();
  screenParticle(name, r.left + r.width / 2, r.top + r.height / 2);
}
function particleOnFace(side, name) {
  const el = side === "ai" ? els.aHP2 : els.pHP2;
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
function attackCard(attacker, target) {
  if (!attacker || !attacker.canAttack || attacker.stance === "defense")
    return;
  sfx("attack");
  const a = nodeById(attacker.id),
    t = nodeById(target.id);
  if (a && t) {
    const ar = a.getBoundingClientRect();
      t.getBoundingClientRect();
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
    if (isP) {
      G.aiHP = clamp(G.aiHP - overflow, 0, 99);
      log(
        `${attacker.name} excedeu em ${overflow} e causou dano direto ao Inimigo!`,
      );
    } else {
      G.playerHP = clamp(G.playerHP - overflow, 0, 99);
      log(
        `${attacker.name} excedeu em ${overflow} e causou dano direto a Você!`,
      );
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
    G.aiHP = clamp(G.aiHP - dmg, 0, 99);
    log(`${attacker.name} causou ${dmg} ao Inimigo!`);
    sfx("crit");
  } else {
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
  m.hp = clamp(m.hp - amt, 0, 99);
  if (m.hp <= 0) setTimeout(checkDeaths, 10);
}
function checkDeaths() {
  const deadA = G.aiBoard.filter((c) => c.hp <= 0);
  deadA.forEach((c) => particleOnCard(c.id, "explosion"));
  if (deadA.length) {
    G.aiBoard = G.aiBoard.filter((c) => c.hp > 0);
    G.aiDiscard.push(...deadA);
    log("Uma criatura inimiga caiu.");
  }
  const deadP = G.playerBoard.filter((c) => c.hp <= 0);
  deadP.forEach((c) => particleOnCard(c.id, "explosion"));
  if (deadP.length) {
    G.playerBoard = G.playerBoard.filter((c) => c.hp > 0);
    G.playerDiscard.push(...deadP);
    log("Sua criatura caiu.");
  }
  els.discardCount.textContent = G.playerDiscard.length;
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
  if (e.key === "Escape") cancelTargeting();
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
    if (HUMAN.includes(pick)) {
      G.aiDeckChoice = rand(BEAST);
    } else {
      G.aiDeckChoice = rand(HUMAN);
    }
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

var audio = /*#__PURE__*/Object.freeze({
  __proto__: null,
  ensureRunning: ensureRunning,
  initAudio: initAudio,
  sfx: sfx,
  startMenuMusic: startMenuMusic,
  stopMenuMusic: stopMenuMusic,
  toggleMute: toggleMute,
  tone: tone,
  tryStartMenuMusicImmediate: tryStartMenuMusicImmediate
});

// Basic game rule placeholder
function applyRule(state, rule) {
  return state;
}

var rules = /*#__PURE__*/Object.freeze({
  __proto__: null,
  applyRule: applyRule
});

var render = /*#__PURE__*/Object.freeze({
  __proto__: null,
  $: $,
  $$: $$,
  log: log
});

// Placeholder for networking functions.
function send() {
  // TODO: implement network calls
}

var network = /*#__PURE__*/Object.freeze({
  __proto__: null,
  send: send
});

window.FFF = { startGame, audio, rules, render, network };
