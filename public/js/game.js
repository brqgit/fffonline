(() => {
  // js/ui/index.js
  var $ = (s) => document.querySelector(s);
  var $$ = (s) => Array.from(document.querySelectorAll(s));
  function log(t) {
    const logBox = document.querySelector("#log");
    if (!logBox) return;
    const d = document.createElement("div");
    d.textContent = t;
    logBox.prepend(d);
  }

  // js/audio/index.js
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  var actx = null;
  var master = null;
  var muted = false;
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
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = t;
    o.frequency.setValueAtTime(f, actx.currentTime + w);
    g.gain.setValueAtTime(1e-4, actx.currentTime + w);
    g.gain.exponentialRampToValueAtTime(
      Math.max(2e-4, v),
      actx.currentTime + w + 0.01
    );
    g.gain.exponentialRampToValueAtTime(1e-4, actx.currentTime + w + d);
    o.connect(g);
    g.connect(master);
    o.start(actx.currentTime + w);
    o.stop(actx.currentTime + w + d + 0.02);
  }
  function sfx(n) {
    if (!actx || muted) return;
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
      }
    }[n] || (() => {
    }))();
  }
  var musicGain = null;
  var musicLoopId = null;
  var musicOn = false;
  var musicPreset = "menu";
  var MUSIC = {
    menu: {
      bpm: 84,
      leadBase: 196,
      bassBase: 98,
      leadWave: "triangle",
      bassWave: "sine",
      scale: [0, 3, 5, 7, 5, 3, 0, -5]
    },
    vikings: {
      bpm: 76,
      leadBase: 174.61,
      bassBase: 87.31,
      leadWave: "sawtooth",
      bassWave: "sine",
      scale: [0, 3, 5, 7, 10, 7, 5, 3]
    },
    animais: {
      bpm: 90,
      leadBase: 220,
      bassBase: 110,
      leadWave: "square",
      bassWave: "sine",
      scale: [0, 2, 5, 7, 9, 7, 5, 2]
    },
    pescadores: {
      bpm: 96,
      leadBase: 196,
      bassBase: 98,
      leadWave: "triangle",
      bassWave: "triangle",
      scale: [0, 2, 4, 7, 9, 7, 4, 2]
    },
    floresta: {
      bpm: 68,
      leadBase: 207.65,
      bassBase: 103.83,
      leadWave: "sine",
      bassWave: "sine",
      scale: [0, 3, 5, 10, 5, 3, 0, -2]
    },
    combat: {
      bpm: 118,
      leadBase: 220,
      bassBase: 110,
      leadWave: "sawtooth",
      bassWave: "square",
      scale: [0, 2, 3, 5, 7, 8, 7, 5],
      perc: true,
      ac: 4
    }
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
    musicGain.gain.value = 1e-4;
    musicGain.connect(master);
    const tgt = musicPreset === "combat" ? 0.22 : 0.18;
    musicGain.gain.exponentialRampToValueAtTime(tgt, actx.currentTime + 0.4);
    const beat = 60 / P.bpm, steps = P.scale.length;
    const schedule = () => {
      if (!musicOn || !musicGain) return;
      let t = actx.currentTime;
      for (let i = 0; i < steps; i++) {
        const f = P.leadBase * Math.pow(2, P.scale[i] / 12), o = actx.createOscillator(), g = actx.createGain();
        o.type = P.leadWave;
        o.frequency.setValueAtTime(f, t + i * beat);
        g.gain.setValueAtTime(1e-4, t + i * beat);
        g.gain.exponentialRampToValueAtTime(
          musicPreset === "combat" ? 0.13 : 0.11,
          t + i * beat + 0.01
        );
        g.gain.exponentialRampToValueAtTime(1e-4, t + i * beat + beat * 0.92);
        o.connect(g);
        g.connect(musicGain);
        o.start(t + i * beat);
        o.stop(t + i * beat + beat);
      }
      for (let i = 0; i < steps; i += 2) {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = P.bassWave;
        o.frequency.setValueAtTime(P.bassBase, t + i * beat);
        g.gain.setValueAtTime(1e-4, t + i * beat);
        g.gain.exponentialRampToValueAtTime(
          musicPreset === "combat" ? 0.1 : 0.09,
          t + i * beat + 0.01
        );
        g.gain.exponentialRampToValueAtTime(1e-4, t + i * beat + beat * 0.96);
        o.connect(g);
        g.connect(musicGain);
        o.start(t + i * beat);
        o.stop(t + i * beat + beat);
      }
      if (P.perc) {
        for (let i = 0; i < steps; i++) {
          const h = actx.createOscillator(), hg = actx.createGain();
          h.type = "square";
          h.frequency.setValueAtTime(1600, t + i * beat);
          hg.gain.setValueAtTime(1e-4, t + i * beat);
          hg.gain.exponentialRampToValueAtTime(0.07, t + i * beat + 5e-3);
          hg.gain.exponentialRampToValueAtTime(
            1e-4,
            t + i * beat + beat * 0.2
          );
          h.connect(hg);
          hg.connect(musicGain);
          h.start(t + i * beat);
          h.stop(t + i * beat + beat * 0.2);
          if (P.ac && i % P.ac === 0) {
            const k = actx.createOscillator(), kg = actx.createGain();
            k.type = "sine";
            k.frequency.setValueAtTime(120, t + i * beat);
            kg.gain.setValueAtTime(1e-4, t + i * beat);
            kg.gain.exponentialRampToValueAtTime(0.12, t + i * beat + 0.01);
            kg.gain.exponentialRampToValueAtTime(
              1e-4,
              t + i * beat + beat * 0.3
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
    const loopMs = beat * steps * 1e3;
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
          1e-4,
          actx.currentTime + 0.25
        );
      } catch (e) {
      }
      setTimeout(() => {
        try {
          musicGain.disconnect();
        } catch (e) {
        }
        musicGain = null;
      }, 300);
    }
  }
  function tryStartMenuMusicImmediate() {
    if (!AudioCtx) return;
    initAudio();
    try {
      ensureRunning();
    } catch (e) {
    }
    try {
      startMenuMusic("menu");
    } catch (e) {
    }
    if (actx && actx.state !== "running") {
      try {
        actx.resume().then(() => startMenuMusic("menu")).catch(() => {
        });
      } catch (e) {
      }
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
        } catch (e) {
        }
      }, 800);
    }
  }
  function toggleMute(btn) {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.18;
    if (musicGain) musicGain.gain.value = muted ? 0 : 0.18;
    if (btn) btn.textContent = muted ? "\u{1F507} Mudo" : "\u{1F50A} Som";
  }

  // js/ai/index.js
  function aiTurn(ctx) {
    const { G: G2, summon: summon2, renderAll: renderAll2, legalTarget: legalTarget2, attackCard: attackCard2, attackFace: attackFace2, rand: rand2, newTurn: newTurn2 } = ctx;
    const playable = G2.aiHand.filter((c) => c.cost <= G2.aiMana && c.harvestCost <= G2.aiHarvest).sort((a, b) => b.cost - a.cost);
    while (playable.length && G2.aiBoard.length < 5 && G2.aiMana > 0) {
      const c = playable.shift();
      const i = G2.aiHand.findIndex((x) => x.id === c.id);
      if (i > -1 && c.cost <= G2.aiMana && c.harvestCost <= G2.aiHarvest) {
        G2.aiHand.splice(i, 1);
        const stance = c.hp >= c.atk + 1 ? Math.random() < 0.7 ? "defense" : "attack" : Math.random() < 0.3 ? "defense" : "attack";
        summon2("ai", c, stance);
        G2.aiMana -= c.cost;
        G2.aiHarvest -= c.harvestCost;
      }
    }
    renderAll2();
    const attackers = G2.aiBoard.filter((c) => c.canAttack && c.stance !== "defense");
    function next() {
      if (!attackers.length) {
        G2.current = "player";
        newTurn2();
        return;
      }
      const a = attackers.shift();
      const legal = G2.playerBoard.filter((x) => legalTarget2("player", x));
      if (legal.length) {
        attackCard2(a, rand2(legal));
      } else {
        attackFace2(a, "player");
      }
      setTimeout(next, 500);
    }
    setTimeout(next, 500);
  }

  // js/game/card.js
  var ResourceType = Object.freeze({
    MANA: "mana",
    ENERGIA: "energia",
    COLHEITA: "colheita"
  });
  var Keyword = Object.freeze({
    FURIOSO: "Furioso",
    PROTETOR: "Protetor",
    PERCEPCAO: "Percep\xE7\xE3o",
    CURA: "Cura",
    BENCAO: "B\xEAn\xE7\xE3o",
    CORVO: "Corvo",
    SERPENTE: "Serpente"
  });
  var CardType = Object.freeze({
    UNIDADE: "Unidade",
    RITUAL: "Ritual",
    LENDA_MITICA: "Lenda M\xEDtica"
  });
  var Faction = Object.freeze({
    VIKINGS: "Vikings",
    FLORESTA: "Floresta",
    SOMBRAS: "Sombras",
    RUNICO: "R\xFAnico",
    MITICO: "M\xEDtico"
  });

  // js/game/index.js
  var rand = (a) => a[Math.floor(Math.random() * a.length)];
  var clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  var uid = () => Math.random().toString(36).slice(2);
  var KW = {
    P: Keyword.PROTETOR,
    F: Keyword.FURIOSO,
    PE: Keyword.PERCEPCAO,
    C: Keyword.CURA,
    B: Keyword.BENCAO,
    CV: Keyword.CORVO,
    S: Keyword.SERPENTE
  };
  var BC = {
    D1: "draw1",
    H2: "heal2",
    P1: "ping1",
    BR1: "buffRandom1",
    BA1: "buffAlliesAtk1"
  };
  function deriveClassSub(name) {
    const n = name.toLowerCase();
    if (n.includes("berserker")) return { classe: "tank", subclasse: "Berserker" };
    if (n.includes("guardi\xE3o do v\xE9u") || n.includes("v\xE9u"))
      return { classe: "control", subclasse: "Guardi\xE3o do V\xE9u" };
    if (n.includes("guardi\xE3o")) return { classe: "tank", subclasse: "Guardi\xE3o" };
    if (n.includes("uivante")) return { classe: "tank", subclasse: "Uivante" };
    if (n.includes("ca\xE7ador")) return { classe: "dps", subclasse: "Ca\xE7ador" };
    if (n.includes("runomante")) return { classe: "dps", subclasse: "Runomante" };
    if (n.includes("serpente")) return { classe: "dps", subclasse: "Serpente" };
    if (n.includes("curandeir")) return { classe: "support", subclasse: "Curandeiro" };
    if (n.includes("tot\xEAmico") || n.includes("totemico"))
      return { classe: "support", subclasse: "Tot\xEAmico" };
    if (n.includes("sacerdote") || n.includes("tecel\xE3o"))
      return { classe: "support", subclasse: "Tecel\xE3o" };
    if (n.includes("xam\xE3")) return { classe: "control", subclasse: "Xam\xE3" };
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
  var makeCard = (a) => {
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
      id: uid()
    };
  };
  var TEMPLATES = {
    vikings: [
      ["Lavrador de Lan\xE7a", "\u{1F9D4}\u200D\u{1F33E}", "Viking", 2, 2, 2, "Disciplinado"],
      [
        "Camponesa Curandeira",
        "\u{1F469}\u200D\u{1F33E}\u2728",
        "Viking",
        2,
        3,
        3,
        "Entra: cura 2",
        "",
        "H2"
      ],
      ["Ceifeiro Berserker", "\u{1F468}\u200D\u{1F33E}\u2694\uFE0F", "Viking", 5, 2, 4, "Furioso", "F"],
      ["Escudeiro Rural", "\u{1F6E1}\uFE0F", "Viking", 0, 3, 1, "Protetor", "P"],
      ["Guardi\xE3o da Aldeia", "\u{1F6E1}\uFE0F\u{1F33E}", "Viking", 3, 5, 4, "Protetor", "P"],
      [
        "Ca\xE7ador de Lobos",
        "\u{1F3F9}",
        "Viking",
        3,
        2,
        2,
        "Entra: dano 1 aleat\xF3rio",
        "",
        "P1"
      ],
      [
        "Ferreiro Rural",
        "\u{1F528}",
        "Viking",
        4,
        6,
        5,
        "Entra: +1/+1 aleat\xF3rio",
        "",
        "BR1"
      ],
      [
        "Chefe da Colheita",
        "\u{1F451}\u{1F33E}",
        "Viking",
        5,
        6,
        6,
        "Aliados +1 ATK",
        "",
        "BA1"
      ]
    ],
    animais: [
      ["Urso Pardo", "\u{1F43B}", "Animal", 6, 6, 5, "Protetor", "P"],
      ["Lobo Cinzento", "\u{1F43A}", "Animal", 4, 2, 3, "Furioso", "F"],
      ["Javali Selvagem", "\u{1F417}", "Animal", 3, 2, 2, "Impulsivo"],
      ["Cervo Nobre", "\u{1F98C}", "Animal", 4, 5, 4, "Resistente"],
      ["Coruja S\xE1bia", "\u{1F989}", "Animal", 1, 2, 1, "Entra: compre 1", "", "D1"],
      ["Cavalo de Guerra", "\u{1F434}", "Animal", 3, 3, 3, "Confi\xE1vel"],
      ["Cabra da Montanha", "\u{1F410}", "Animal", 2, 3, 2, "Protetor", "P"],
      ["\xC1guia do Norte", "\u{1F985}", "Animal", 5, 3, 4, "Veloz"],
      ["Urso Polar", "\u{1F43B}\u200D\u2744\uFE0F", "Animal", 7, 7, 6, "Gigante"],
      ["Serpente do Mar", "\u{1F40D}", "Animal", 8, 7, 7, "Colosso"]
    ],
    pescadores: [
      ["Grumete do Fiorde", "\u{1F466}\u{1F3A3}", "Viking", 1, 1, 1, "Aprendiz"],
      ["Pescador do Fiorde", "\u{1F9D4}\u200D\u2642\uFE0F\u{1F3A3}", "Viking", 2, 3, 2, "Veterano"],
      [
        "Arpoador N\xF3rdico",
        "\u{1FA9D}",
        "Viking",
        3,
        2,
        2,
        "Entra: dano 1 aleat\xF3rio",
        "",
        "P1"
      ],
      [
        "Curandeira do Sal",
        "\u{1F9C2}\u2728",
        "Viking",
        2,
        3,
        3,
        "Entra: cura 2",
        "",
        "H2"
      ],
      ["Vigia do Farol", "\u{1F5FC}\u{1F6E1}\uFE0F", "Viking", 2, 5, 4, "Protetor", "P"],
      [
        "Ferreiro Naval",
        "\u2693\uFE0F\u{1F528}",
        "Viking",
        4,
        5,
        5,
        "Entra: +1/+1 aleat\xF3rio",
        "",
        "BR1"
      ],
      [
        "Capit\xE3o da Pesca",
        "\u{1F451}\u{1F3A3}",
        "Viking",
        5,
        6,
        6,
        "Aliados +1 ATK",
        "",
        "BA1"
      ],
      ["Remador \xC1gil", "\u{1F6A3}", "Viking", 4, 2, 3, "Furioso", "F"]
    ],
    floresta: [
      ["Urso Negro", "\u{1F43B}", "Animal", 5, 5, 5, "Protetor", "P"],
      ["Lobo da Mata", "\u{1F43A}", "Animal", 4, 2, 3, "Furioso", "F"],
      ["Javali da Floresta", "\u{1F417}", "Animal", 3, 2, 2, "Impulsivo"],
      ["Cervo Vermelho", "\u{1F98C}", "Animal", 4, 5, 4, "Resistente"],
      ["Coruja S\xE1bia", "\u{1F989}", "Animal", 1, 2, 1, "Entra: compre 1", "", "D1"],
      ["Raposa \xC1gil", "\u{1F98A}", "Animal", 3, 3, 3, "Veloz"],
      ["Bisonte das Colinas", "\u{1F402}", "Animal", 6, 6, 6, "Imponente"],
      ["Serpente do Bosque", "\u{1F40D}", "Animal", 5, 4, 4, "Silenciosa"]
    ]
  };
  var HUMAN = ["vikings", "pescadores"];
  var BEAST = ["animais", "floresta"];
  var G = {
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
    customDeck: null
  };
  var els = {
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
    menuBtn: $("#menuBtn")
  };
  var poolEl = $("#pool");
  var chosenEl = $("#chosen");
  var countEl = $("#countDeck");
  var curveEl = $("#curve");
  window.addEventListener("error", function(e) {
    console.error("JS Error:", e.message, e.filename + ":" + e.lineno);
    try {
      typeof log === "function" && log("\u26A0\uFE0F " + e.message);
    } catch (_) {
    }
  });
  window.addEventListener("unhandledrejection", function(e) {
    console.error("Unhandled Rejection:", e.reason);
    try {
      const msg = e.reason && e.reason.message ? e.reason.message : String(e.reason);
      typeof log === "function" && log("\u26A0\uFE0F " + msg);
    } catch (_) {
    }
  });
  function tiltify(card, lift = false) {
    const height = card.offsetHeight;
    const width = card.offsetWidth;
    let hovering = false;
    if (lift) {
      card.addEventListener("mouseenter", () => {
        hovering = true;
        card.style.zIndex = 1e3;
        card.style.transform = "translateY(-20px)";
      });
      card.addEventListener("mouseleave", () => {
        hovering = false;
        card.style.zIndex = card.dataset.z || "";
        card.style.transform = "";
      });
    } else {
      card.addEventListener("mouseleave", () => {
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
    const costText = `${c.cost}${c.harvestCost ? `\u{1F33E}${c.harvestCost}` : ""}`;
    const kwTags = (c.kw || []).map(
      (k) => `<span class='keyword' data-tip='${k === "Protetor" ? "Enquanto houver Protetor ou carta em Defesa do lado do defensor, ataques devem mir\xE1-los." : k === "Furioso" ? "Pode atacar no turno em que \xE9 jogada." : ""}' >${k}</span>`
    );
    if (c.subclasse && c.classe) {
      kwTags.push(`<span class='class-tag ${c.classe}'>${c.subclasse}</span>`);
    }
    d.innerHTML = `<div class="bg bg-${c.deck || "default"}"></div><div class="head"><span class="cost">${costText}</span><div class="name">${c.name}</div>${c.stance ? `<span class="badge ${c.stance === "defense" ? "def" : "atk"}">${c.stance === "defense" ? "\u{1F6E1}\uFE0F" : "\u2694\uFE0F"}</span>` : ""}</div><div class="tribe">${c.tribe}</div><div class="art">${c.emoji}</div><div class="text">${kwTags.join(" ")} ${c.text || ""}</div><div class="stats"><span class="gem atk">\u2694\uFE0F ${c.atk}</span>${c.stance ? `<span class="stance-label ${c.stance}">${c.stance === "defense" ? "\u{1F6E1}\uFE0F" : "\u2694\uFE0F"}</span>` : ""}<span class="gem hp ${c.hp <= 2 ? "low" : ""}">\u2764\uFE0F ${c.hp}</span></div>`;
    return d;
  }
  function resetCardState(c) {
    if (!c) return;
    c.stance = null;
    c.canAttack = false;
    delete c.summonTurn;
  }
  var hasGuard = (b) => b.some((x) => x.kw.includes("Protetor") || x.stance === "defense");
  function updateMeters() {
    const pct = (v, max) => max > 0 ? Math.max(0, Math.min(100, v / max * 100)) : 0;
    els.barPHP.style.width = pct(G.playerHP, 30) + "%";
    els.barAHP.style.width = pct(G.aiHP, 30) + "%";
    els.barMana.style.width = pct(G.playerMana, G.playerManaCap) + "%";
  }
  function renderAll() {
    els.pHP.textContent = G.playerHP;
    els.pHP2.textContent = G.playerHP;
    els.aHP.textContent = G.aiHP;
    els.aHP2.textContent = G.aiHP;
    els.mana.textContent = `${G.playerMana}/${G.playerManaCap} | \u{1F33E} ${G.playerHarvest}/${G.playerHarvestCap}`;
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
      d.classList.add("handcard");
      tiltify(d, true);
      d.addEventListener("click", (e) => {
        const blocked = c.cost > G.playerMana || c.harvestCost > G.playerHarvest || G.current !== "player" || G.playerBoard.length >= 5;
        if (blocked) {
          d.style.transform = "translateY(-2px)";
          setTimeout(() => d.style.transform = "", 150);
          sfx("error");
          return;
        }
        e.stopPropagation();
        previewCard(d, c);
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
      btn.textContent = "\u{1F5E1}\uFE0F Atacar diretamente";
      Object.assign(btn.style, {
        position: "absolute",
        top: "8px",
        right: "8px",
        display: "none"
      });
      btn.addEventListener("click", () => {
        if (G.chosen) attackFace(G.chosen, "ai");
      });
      els.aBoard.appendChild(btn);
    }
    updateFaceAttackZone();
  }
  function previewCard(orig, c) {
    const r = orig.getBoundingClientRect(), clone = orig.cloneNode(true);
    orig.style.visibility = "hidden";
    clone.classList.add("card-preview");
    Object.assign(clone.style, {
      position: "fixed",
      left: r.left + "px",
      top: r.top + "px",
      margin: "0",
      zIndex: 1e3,
      transition: "left .3s ease, top .3s ease"
    });
    document.body.appendChild(clone);
    requestAnimationFrame(() => {
      clone.style.left = window.innerWidth / 2 - r.width / 2 + "px";
      clone.style.top = window.innerHeight / 2 - r.height / 2 + "px";
    });
    clone.addEventListener(
      "transitionend",
      function handler() {
        clone.removeEventListener("transitionend", handler);
        openStanceChooser(
          clone,
          (st) => {
            flyToBoard(clone, () => playFromHand(c.id, st));
            clone.remove();
          },
          () => {
            const rb = orig.getBoundingClientRect();
            clone.style.left = rb.left + "px";
            clone.style.top = rb.top + "px";
            clone.addEventListener(
              "transitionend",
              () => {
                clone.remove();
                orig.style.visibility = "";
              },
              { once: true }
            );
          }
        );
      },
      { once: true }
    );
  }
  function openStanceChooser(anchor, cb, onCancel) {
    closeStanceChooser();
    anchor.classList.add("chosen");
    const box = document.createElement("div");
    box.className = "stance-chooser";
    const bA = document.createElement("button");
    bA.className = "btn";
    bA.textContent = "\u2694\uFE0F Ataque";
    const bD = document.createElement("button");
    bD.className = "btn";
    bD.textContent = "\u{1F6E1}\uFE0F Defesa";
    bA.onclick = () => {
      anchor.classList.remove("chosen");
      closeStanceChooser();
      cb("attack");
    };
    bD.onclick = () => {
      anchor.classList.remove("chosen");
      closeStanceChooser();
      cb("defense");
    };
    box.append(bA, bD);
    anchor.appendChild(box);
    Object.assign(box.style, {
      position: "absolute",
      left: "50%",
      bottom: "100%",
      transform: "translate(-50%, -8px)"
    });
    setTimeout(() => {
      const h = (ev) => {
        if (ev.target.closest(".stance-chooser") || ev.target === anchor) return;
        window.removeEventListener("click", h, true);
        anchor.classList.remove("chosen");
        closeStanceChooser();
        onCancel && onCancel();
      };
      window.addEventListener("click", h, true);
      bA.focus();
    }, 0);
  }
  var closeStanceChooser = () => {
    const old = document.querySelector(".stance-chooser");
    old && old.remove();
    document.querySelectorAll(".hand .card.chosen").forEach((c) => c.classList.remove("chosen"));
  };
  function flyToBoard(node, onEnd) {
    const r = node.getBoundingClientRect(), clone = node.cloneNode(true);
    Object.assign(clone.style, {
      left: r.left + "px",
      top: r.top + "px",
      width: r.width + "px",
      height: r.height + "px",
      position: "fixed",
      zIndex: 999,
      transition: "transform .45s ease,opacity .45s ease"
    });
    clone.classList.add("fly");
    document.body.appendChild(clone);
    const br = els.pBoard.getBoundingClientRect();
    requestAnimationFrame(() => {
      const tx = br.left + br.width / 2 - r.left - r.width / 2, ty = br.top + 10 - r.top;
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
    G.playerDeck = G.playerDeckChoice === "custom" && G.customDeck ? shuffle(G.customDeck.slice()) : TEMPLATES[G.playerDeckChoice].map(makeCard);
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
    log("A batalha come\xE7ou!");
    sfx("start");
  }
  var shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  function draw(who, n = 1) {
    const deck = who === "player" ? G.playerDeck : G.aiDeck, hand = who === "player" ? G.playerHand : G.aiHand, disc = who === "player" ? G.playerDiscard : G.aiDiscard;
    for (let i = 0; i < n; i++) {
      if (deck.length === 0 && disc.length) {
        disc.forEach(resetCardState);
        deck.push(...shuffle(disc.splice(0)));
      }
      if (deck.length) {
        const c = deck.shift();
        resetCardState(c);
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
      G.playerBoard.forEach((c) => c.canAttack = true);
    } else {
      G.aiManaCap = clamp(G.aiManaCap + 1, 0, 10);
      G.aiMana = G.aiManaCap;
      G.aiHarvestCap = clamp(G.aiHarvestCap + 1, 0, 10);
      G.aiHarvest = G.aiHarvestCap;
      draw("ai", 1);
      G.aiBoard.forEach((c) => c.canAttack = true);
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
      () => aiTurn({
        G,
        summon,
        renderAll,
        legalTarget,
        attackCard,
        attackFace,
        rand,
        newTurn
      }),
      500
    );
  }
  function playFromHand(id, st) {
    if (G.current !== "player") return;
    const i = G.playerHand.findIndex((c2) => c2.id === id);
    if (i < 0) return;
    const c = G.playerHand[i];
    if (c.cost > G.playerMana || c.harvestCost > G.playerHarvest || G.playerBoard.length >= 5)
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
      `${side === "player" ? "Voc\xEA" : "Inimigo"} jogou ${c.name} em modo ${st === "defense" ? "defesa" : "ataque"}.`
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
            (x) => x.id !== c.id
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
            (x) => x.id !== c.id
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
    G.chosen = ref;
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
    G.aiBoard.filter((x) => x.stance === "defense").forEach((x) => setTimeout(() => animateDefense(x.id), 20));
  }
  function updateFaceAttackZone() {
    const guard = hasGuard(G.aiBoard), valid = validateChosen();
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
    return hasGuard(b) ? target.kw.includes("Protetor") || target.stance === "defense" : true;
  }
  var nodeById = (id) => document.querySelector(`.card[data-id="${id}"]`);
  var addAnim = (n, c, d = 400) => {
    n && n.classList.add(c);
    setTimeout(() => n && n.classList.remove(c), d);
  };
  var animateAttack = (aId, tId) => {
    const a = nodeById(aId), t = tId ? nodeById(tId) : null;
    addAnim(a, "attack-lunge", 350);
    if (t) addAnim(t, "hit-shake", 350);
  };
  var animateDefense = (id) => {
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
    const a = nodeById(attacker.id), t = nodeById(target.id);
    if (a && t) {
      const ar = a.getBoundingClientRect(), tr = t.getBoundingClientRect();
      screenSlash(ar.right, ar.top + ar.height / 2, 15);
    }
    animateAttack(attacker.id, target.id);
    if (target.stance === "defense") animateDefense(target.id);
    particleOnCard(target.id, "attack");
    const pre = target.hp, overflow = Math.max(0, attacker.atk - pre);
    damageMinion(target, attacker.atk);
    damageMinion(attacker, target.atk);
    sfx("hit");
    if (overflow > 0 && target.hp <= 0) {
      const isP = G.playerBoard.includes(attacker);
      if (isP) {
        G.aiHP = clamp(G.aiHP - overflow, 0, 99);
        log(
          `${attacker.name} excedeu em ${overflow} e causou dano direto ao Inimigo!`
        );
      } else {
        G.playerHP = clamp(G.playerHP - overflow, 0, 99);
        log(
          `${attacker.name} excedeu em ${overflow} e causou dano direto a Voc\xEA!`
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
      log(`${attacker.name} causou ${dmg} a Voc\xEA!`);
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
    deadA.forEach((c) => {
      particleOnCard(c.id, "explosion");
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
      resetCardState(c);
    });
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
    els.endSub.textContent = win ? "Parab\xE9ns! Quer continuar jogando?" : "Tentar de novo ou voltar ao menu.";
    els.endOverlay.classList.add("show");
    setTimeout(() => fireworks(win), 1e3);
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
    const cards = filter === "all" ? allCards() : TEMPLATES[filter].map(makeCard).map((c) => Object.assign(c, { deck: filter }));
    cards.forEach((c) => {
      const d = document.createElement("div");
      d.className = `card ency-card bg-${c.deck}`;
      d.innerHTML = `<div class='bg bg-${c.deck}'></div><div class='head'><span class='cost'>${c.cost}${c.harvestCost ? `\u{1F33E}${c.harvestCost}` : ""}</span><div class='name'>${c.name}</div></div><div class='mini'>${c.tribe} \u2022 \u2694\uFE0F ${c.atk} / \u2764\uFE0F ${c.hp}</div><div class='art'>${c.emoji}</div><div class='details'><div>${(c.kw || []).map((k) => `<span class='chip' data-type='keyword' data-tip='${k === "Protetor" ? "Enquanto houver Protetor ou carta em Defesa do lado do defensor, ataques devem mir\xE1-los." : k === "Furioso" ? "Pode atacar no turno em que \xE9 jogada." : ""}' >${k}</span>`).join(" ")}</div><div style='margin-top:6px'>${c.text || ""}</div></div>`;
      tiltify(d);
      els.encyGrid.appendChild(d);
    });
    els.ency.classList.add("show");
    els.encyFilters.style.display = locked ? "none" : "flex";
    $$(".filters .fbtn").forEach(
      (b) => b.classList.toggle(
        "active",
        b.dataset.deck === filter || filter === "all" && b.dataset.deck === "all"
      )
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
      if (e.target.closest("#aiBoard .card.selectable") || e.target.closest("#playerBoard .card.selectable") || e.target.closest("#aiBoard .face-attack-btn"))
        return;
      cancelTargeting();
    },
    { capture: true }
  );
  $$(".deckbtn").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty(
        "--px",
        (e.clientX - r.left) / r.width * 100 + "%"
      );
      btn.style.setProperty(
        "--py",
        (e.clientY - r.top) / r.height * 100 + "%"
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
      $$(".deckbtn").forEach((b) => b.style.outline = "none");
      btn.style.outline = "2px solid var(--accent)";
    });
    const book = btn.querySelector(".view-cards");
    book && book.addEventListener("click", (ev) => {
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
  $$(".filters .fbtn").forEach(
    (b) => b.addEventListener("click", () => {
      renderEncy(b.dataset.deck, false);
    })
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
    { once: true }
  );
})();
