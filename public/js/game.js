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
  var currentMaster = 0.18;
  var currentMusic = 0.18;
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
      draw: () => {
        tone(660, 0.06, "square", 0.6, 0);
        tone(880, 0.08, "triangle", 0.5, 0.04);
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
    if (muted) {
      if (master) {
        currentMaster = master.gain.value;
        master.gain.value = 0;
      }
      if (musicGain) {
        currentMusic = musicGain.gain.value;
        musicGain.gain.value = 0;
      }
    } else {
      if (master) master.gain.value = currentMaster;
      if (musicGain) musicGain.gain.value = currentMusic;
    }
    if (btn) btn.textContent = muted ? "\u{1F507} Mudo" : "\u{1F50A} Som";
  }

  // js/ai/index.js
  async function aiTurn(ctx) {
    const { G: G2, summon: summon2, renderAll: renderAll2, legalTarget: legalTarget2, attackCard: attackCard2, attackFace: attackFace2, rand: rand2, newTurn: newTurn2 } = ctx;
    const playable = G2.aiHand.filter((c) => c.cost <= G2.aiMana && c.harvestCost <= G2.aiHarvest).sort((a, b) => b.cost - a.cost);
    while (playable.length && G2.aiBoard.length < 5 && G2.aiMana > 0) {
      const c = playable.shift();
      const i = G2.aiHand.findIndex((x) => x.id === c.id);
      if (i > -1 && c.cost <= G2.aiMana && c.harvestCost <= G2.aiHarvest) {
        G2.aiHand.splice(i, 1);
        const stance = c.hp >= c.atk + 1 ? Math.random() < 0.7 ? "defense" : "attack" : Math.random() < 0.3 ? "defense" : "attack";
        const res = summon2("ai", c, stance);
        if (res && typeof res.then === "function") {
          renderAll2();
          G2.aiMana -= c.cost;
          G2.aiHarvest -= c.harvestCost;
          await res;
        } else {
          G2.aiMana -= c.cost;
          G2.aiHarvest -= c.harvestCost;
        }
        await new Promise((r) => setTimeout(r, 120));
      }
    }
    renderAll2();
    const attackers = G2.aiBoard.filter((c) => c.canAttack && c.stance !== "defense");
    function next() {
      if (!attackers.length) {
        G2.current = "player";
        newTurn2("ai");
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
    SERPENTE: "Serpente",
    ABSORVER: "Absorver",
    MUTAVEL: "Mut\xE1vel"
  });
  var CardType = Object.freeze({
    UNIDADE: "Unidade",
    RITUAL: "Ritual",
    LENDA_MITICA: "Lenda M\xEDtica",
    TOTEM: "Totem"
  });
  var Faction = Object.freeze({
    VIKINGS: "Vikings",
    FLORESTA: "Floresta",
    SOMBRAS: "Sombras",
    RUNICO: "R\xFAnico",
    MITICO: "M\xEDtico"
  });

  // js/game/enemyNames.js
  var ENEMY_NAMES = {
    vikings: [
      { name: "Ceifador do Fiorde" },
      { name: "Guardi\xE3o das Runas" },
      { name: "Berserker do Arado" },
      { name: "Escudeiro G\xE9lido" },
      { name: "Campon\xEAs Vigilante" },
      { name: "Batedor de Neve" },
      { name: "Runomante Rural" },
      { name: "Guerreiro das Geadas" },
      { name: "Ferreiro do Norte" },
      { name: "M\xEDstico da Colheita" },
      { name: "Raider do Gr\xE3o" },
      { name: "Defensor do Fiorde" },
      { name: "Sentinela do Arp\xE3o" },
      { name: "Martelo das Plan\xEDcies" },
      { name: "Ceifeira \xC1gil" },
      { name: "Guardi\xE3o da Aldeia" },
      { name: "Batalhador do Cais" },
      { name: "Escudeiro da Aurora" },
      { name: "Jarl da Tempestade", boss: true },
      { name: "Lorde da Colheita Sombria", boss: true }
    ],
    animais: [
      { name: "Lobo Cinzento Alfa" },
      { name: "Urso do Gelo" },
      { name: "Javali das Neves" },
      { name: "Coruja Vigilante" },
      { name: "Serpente de Fj\xF6rnburg" },
      { name: "Lince Escamado" },
      { name: "Caribu R\xFAnico" },
      { name: "Falc\xE3o da Aurora" },
      { name: "Texugo \xC1rtico" },
      { name: "Raposa do Norte" },
      { name: "Bode Rochoso" },
      { name: "Corvo de Odin" },
      { name: "Alce Perenne" },
      { name: "Foca das Geleiras" },
      { name: "Lobo Sombrio" },
      { name: "Urs\xE3o Guardi\xE3o" },
      { name: "Bis\xE3o Boreal" },
      { name: "Esquilo R\xE1pido" },
      { name: "Fenrir Desperto", boss: true },
      { name: "Urso R\xFAnico Antigo", boss: true }
    ],
    pescadores: [
      { name: "Arpoador Tempestuoso" },
      { name: "Marinheiro do Gelo" },
      { name: "Grumete das Ondas" },
      { name: "Vigia do Farol" },
      { name: "Ca\xE7ador de Sereias" },
      { name: "Navegador das Brumas" },
      { name: "Cors\xE1rio do Maelstrom" },
      { name: "Curandeiro do Mar" },
      { name: "Sentinela do Conv\xE9s" },
      { name: "Bardo do Porto" },
      { name: "Escudeiro do Cais" },
      { name: "Capit\xE3o das Mar\xE9s" },
      { name: "Lan\xE7ador de Redes" },
      { name: "Contrabandista do Fiorde" },
      { name: "Pescador de Runas" },
      { name: "Vigia das Profundezas" },
      { name: "Guardi\xE3o das Docas" },
      { name: "Ca\xE7ador de Tesouros" },
      { name: "Senhor do Maelstrom", boss: true },
      { name: "Kraken do Fiorde", boss: true }
    ],
    floresta: [
      { name: "Guardi\xE3o Musgoso" },
      { name: "Raposa da N\xE9voa" },
      { name: "Cervo R\xFAnico" },
      { name: "Coruja Mensageira" },
      { name: "Lobo da Mata" },
      { name: "Fada das Folhas" },
      { name: "Javali Voraz" },
      { name: "Treant dos Espinhos" },
      { name: "Esp\xEDrito do Carvalho" },
      { name: "S\xE1bio do Musgo" },
      { name: "Guardi\xE3o da Clareira" },
      { name: "Lince da Sombra" },
      { name: "Bardo das \xC1rvores" },
      { name: "Druida dos Cogumelos" },
      { name: "Corvo Observador" },
      { name: "Serpente do Bosque" },
      { name: "Centauro das Brumas" },
      { name: "Javali de Runas" },
      { name: "Avatar do Carvalho Ancestral", boss: true },
      { name: "Esp\xEDrito do Cervo Estelar", boss: true }
    ],
    convergentes: [
      { name: "Ne\xF3fito Prism\xE1tico" },
      { name: "Assimilador R\xFAnico" },
      { name: "Guardi\xE3o Quim\xE9rico" },
      { name: "Raider Metamorfo" },
      { name: "Lince Metam\xF3rfico" },
      { name: "Totem Absorvente" },
      { name: "Arauto da Aurora" },
      { name: "Sombra R\xFAnica" },
      { name: "Guerreiro Sincr\xE9tico" },
      { name: "Disc\xEDpulo Male\xE1vel" },
      { name: "Sentinela V\xF3rtice" },
      { name: "Tecel\xE3o Cambiante" },
      { name: "Eco Mutante" },
      { name: "Bruto Assimilador" },
      { name: "S\xE1bio Prismal" },
      { name: "Avatar Mutag\xEAnico" },
      { name: "Capataz de Runas" },
      { name: "Ess\xEAncia Convergente" },
      { name: "Catalisador da Aurora", boss: true },
      { name: "Entidade Transmutante", boss: true }
    ]
  };

  // js/game/totem.js
  var Totem = class {
    constructor({ name = "", icon = "\u{1F5FF}", buffs = {} } = {}) {
      this.name = name;
      this.icon = icon;
      this.buffs = buffs;
    }
  };

  // js/game/storyMode.js
  var StoryMode = class {
    constructor({ level = 1 } = {}) {
      this.level = level;
      this.round = 0;
      this.totems = [];
      this.scaling = 0;
      this.xp = 0;
      this.bossInterval = 10;
      this.eliteEvery = 5;
      this.shopEvery = 3;
      this.currentEncounter = "normal";
    }
    nextRound() {
      this.round += 1;
      this.scaling = Math.floor(this.round / 2) + (this.level - 1);
      const isBoss = this.round % this.bossInterval === 0;
      const isElite = !isBoss && this.round % this.eliteEvery === 0;
      const isShop = this.round % this.shopEvery === 0;
      this.currentEncounter = isBoss ? "boss" : isElite ? "elite" : isShop ? "shop" : "normal";
      return { isBoss, isElite, isShop };
    }
    handleVictory() {
      const xpGain = this.currentEncounter === "boss" ? 20 : this.currentEncounter === "elite" ? 10 : 5;
      this.xp += xpGain;
      const leveled = this.checkLevelUp();
      return { leveled, rewards: this.rewardOptions() };
    }
    rewardOptions() {
      return ["Nova carta", "Evoluir carta", "Ganhar Totem", "Buff permanente"];
    }
    checkLevelUp() {
      const need = this.level * 50;
      if (this.xp >= need) {
        this.level += 1;
        this.xp -= need;
        return true;
      }
      return false;
    }
    addTotem(totem) {
      if (this.totems.length >= 3) return false;
      this.totems.push(totem instanceof Totem ? totem : new Totem(totem));
      return true;
    }
    reset() {
      this.round = 0;
      this.totems = [];
      this.xp = 0;
      this.currentEncounter = "normal";
    }
  };

  // js/ui/commanderHud.js
  function hud() {
    return $("#commanderHud");
  }
  function closeBtn() {
    return $("#closeCommanderHud");
  }
  function openCommanderHud() {
    const h = hud();
    if (h) h.style.display = "grid";
  }
  function closeCommanderHud() {
    const h = hud();
    if (h) h.style.display = "none";
  }
  function initCommanderHud() {
    const btn = closeBtn();
    if (btn) btn.addEventListener("click", closeCommanderHud);
  }

  // js/game/index.js
  var rand = (a) => a[Math.floor(Math.random() * a.length)];
  var clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  var uid = () => Math.random().toString(36).slice(2);
  var pickEnemyName = (deck, boss = false) => {
    const pool = ENEMY_NAMES[deck] || [];
    const list = pool.filter((e) => boss ? e.boss : !e.boss);
    const c = list.length ? rand(list) : { name: "Inimigo" };
    return c.name;
  };
  var KW = {
    P: Keyword.PROTETOR,
    F: Keyword.FURIOSO,
    PE: Keyword.PERCEPCAO,
    C: Keyword.CURA,
    B: Keyword.BENCAO,
    CV: Keyword.CORVO,
    S: Keyword.SERPENTE,
    A: Keyword.ABSORVER,
    M: Keyword.MUTAVEL
  };
  var BC = {
    D1: "draw1",
    H2: "heal2",
    P1: "ping1",
    BR1: "buffRandom1",
    BA1: "buffAlliesAtk1"
  };
  var DECK_ASSET_SLUG = {
    vikings: "farm-vikings",
    pescadores: "fJord-fishers",
    floresta: "forest-beasts",
    animais: "north-beasts"
  };
  var DECK_ART_FILES = {
    vikings: [
      "1_Guerreiro_Loiro.png",
      "2_Guerreiro_Esqueleto.png",
      "3_Guerreiro_Rubro.png",
      "4_Mago_Elder.png",
      "5_Raider_Mascara.png",
      "6_Guerreiro_Machado.png",
      "7_Sombras_Encapuzado.png",
      "8_Guerreiro_Espada.png",
      "9_Raider_Mascara_Sombra.png",
      "10_Mago_Elder_Sombra.png"
    ],
    pescadores: [
      "1_Fogueira_Viking.png",
      "2_Mistico_Encapuzado.png",
      "3_Drakkar.png",
      "4_Guerreiro_do_Escudo.png",
      "5_Estandarte_do_Cla.png",
      "6_Guerreiro_das_Runas.png",
      "7_Guardiao_do_Machado.png",
      "8_Batalhador_Duplo.png",
      "9_Navegador.png",
      "10_Batalhador.png"
    ],
    animais: [
      "alce-bravo.png",
      "coelho-escudeiro.png",
      "coruja-ancia.png",
      "coruja-sabia.png",
      "esquilo-viking.png",
      "guerreiro-cervo.png",
      "morcego-noturno.png",
      "raposa-espadachim.png",
      "urso-guardiao.png"
    ],
    floresta: [
      "Alce_Espiritual.png",
      "Coruja_Guardiao.png",
      "Coruja_Runica.png",
      "Corvo_de_Odin.png",
      "Fogueira_Sagrada.png",
      "Bode_Sagrado.png",
      "Esquilo_Ratatoskr.png",
      "Lobo_Fenrir.png",
      "Serpente_Jormungandr.png"
    ]
  };
  var CARD_MEDIA = {};
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
    const card = {
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
    const media = CARD_MEDIA[n];
    if (media && media.img) {
      card.img = media.img;
    }
    return card;
  };
  var CONVERGENTES_DECK = [
    [
      "Ne\xF3fito Convergente",
      "\u{1F300}",
      "Convergente",
      2,
      2,
      1,
      "Entra: copia uma palavra-chave de um aliado",
      "A"
    ],
    ["Proteiforme da Aurora", "\u{1F308}", "Convergente", 3, 3, 3, "", "M"],
    ["Guardi\xE3o Quim\xE9rico", "\u{1F6E1}\uFE0F\u{1F43A}", "Convergente", 2, 6, 4, "", "P|M"],
    ["Raider Metamorfo", "\u2694\uFE0F\u{1F30A}", "Convergente", 4, 2, 3, "", "F|M"],
    [
      "Runa Voraz",
      "\u{1F300}\u{1FAA8}",
      "Convergente",
      1,
      4,
      2,
      "Ganha +1 ATK sempre que um aliado morre."
    ],
    [
      "Totem Absorvente",
      "\u{1FAB5}\u{1F300}",
      "Convergente",
      0,
      5,
      3,
      "Fim de turno: copia uma palavra-chave de um inimigo aleat\xF3rio.",
      "P"
    ],
    [
      "Arauto da Aurora",
      "\u2728\u{1F451}",
      "Convergente",
      5,
      5,
      6,
      "Se voc\xEA copiou \u22653 palavras-chave na partida, aliados +1/+1."
    ],
    [
      "Sombra R\xFAnica",
      "\u{1F318}\u{1F300}",
      "Convergente",
      3,
      3,
      3,
      "Sempre que absorver, ganha +1/+1.",
      "A"
    ],
    [
      "Guerreiro Sincr\xE9tico",
      "\u2694\uFE0F\u{1F6E1}\uFE0F",
      "Convergente",
      4,
      4,
      4,
      "Entra: escolha Furioso ou Protetor; ganha essa palavra-chave."
    ],
    ["Lince Metam\xF3rfico", "\u{1F431}\u{1F308}", "Convergente", 3, 2, 2, "", "F|M"],
    [
      "Capataz de Runas",
      "\u{1F300}\u2699\uFE0F",
      "Convergente",
      2,
      4,
      3,
      "Ao absorver, causa 1 de dano a todos os inimigos.",
      "A"
    ],
    [
      "Colosso Alqu\xEDmico",
      "\u{1F5FF}\u{1F308}",
      "Convergente",
      7,
      7,
      7,
      "Entra: copia uma palavra-chave de cada aliado.",
      "M"
    ],
    [
      "Ess\xEAncia Convergente",
      "\u{1F4A0}",
      "Convergente",
      0,
      0,
      1,
      "Entra com ATK/HP iguais ao n\xBA de palavras-chave diferentes que voc\xEA controla.",
      "A"
    ],
    ["Disc\xEDpulo Male\xE1vel", "", "Convergente", 1, 3, 2, "", "M"],
    [
      "Sentinela V\xF3rtice",
      "",
      "Convergente",
      2,
      4,
      3,
      "Entra: copia uma palavra-chave de um aliado",
      "P|A"
    ],
    [
      "Tecel\xE3o Cambiante",
      "",
      "Convergente",
      2,
      3,
      3,
      "Entra: compre 1",
      "A",
      "D1"
    ],
    ["Eco Mutante", "", "Convergente", 4, 4, 4, "", "A|M"],
    ["Bruto Assimilador", "", "Convergente", 5, 5, 5, "", "A|M"],
    [
      "S\xE1bio Prismal",
      "",
      "Convergente",
      3,
      5,
      4,
      "Entra: +1/+1 aleat\xF3rio",
      "M",
      "BR1"
    ],
    ["Avatar Mutag\xEAnico", "", "Convergente", 6, 6, 6, "", "M"]
  ];
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
      ],
      ["Campon\xEAs Vigilante", "", "Viking", 2, 4, 3, "Protetor", "P"],
      [
        "Herbalista do Vilarejo",
        "",
        "Viking",
        1,
        3,
        2,
        "Entra: cura 2",
        "",
        "H2"
      ],
      [
        "Batedor da Aldeia",
        "",
        "Viking",
        3,
        2,
        2,
        "Entra: dano 1 aleat\xF3rio",
        "",
        "P1"
      ],
      [
        "Anci\xE3o do Trigo",
        "",
        "Viking",
        2,
        2,
        3,
        "Entra: +1/+1 aleat\xF3rio",
        "",
        "BR1"
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
        "BA1"
      ],
      ["Rastreador do Fiorde", "", "Viking", 1, 2, 1, "Entra: compre 1", "", "D1"],
      ["Ceifeira \xC1gil", "", "Viking", 3, 2, 2, "Furioso", "F"],
      ["Defensor do Arado", "", "Viking", 1, 5, 3, "Protetor", "P"],
      ["Runomante Rural", "", "Viking", 2, 3, 3, "Entra: +1/+1 aleat\xF3rio", "", "BR1"],
      ["Guerreiro da Foice", "", "Viking", 5, 3, 4, "Furioso", "F"],
      ["Guardi\xE3 do Celeiro", "", "Viking", 3, 6, 5, "Protetor", "P"],
      ["Senhor do Campo", "", "Viking", 6, 6, 6, "Aliados +1 ATK", "", "BA1"]
    ],
    animais: [
      ["Urso Pardo", "\u{1F43B}", "Animal", 6, 6, 5, "Protetor", "P"],
      ["Lobo Cinzento", "\u{1F43A}", "Animal", 4, 2, 3, "Furioso", "F"],
      ["Javali Selvagem", "\u{1F417}", "Animal", 3, 2, 2, "Impulsivo"],
      ["Cervo Nobre", "\u{1F98C}", "Animal", 4, 5, 4, "Resistente"],
      ["Coruja S\xE1bia", "\u{1F989}", "Animal", 1, 2, 1, "Entra: compre 1", "", "D1"],
      ["Cabra da Montanha", "\u{1F410}", "Animal", 2, 3, 2, "Protetor", "P"],
      ["\xC1guia do Norte", "\u{1F985}", "Animal", 5, 3, 4, "Veloz"],
      ["Urso Polar", "\u{1F43B}\u200D\u2744\uFE0F", "Animal", 7, 7, 6, "Gigante"],
      ["Serpente do Mar", "\u{1F40D}", "Animal", 8, 7, 7, "Colosso"],
      ["Lobo Alfa", "", "Animal", 5, 4, 4, "Furioso", "F"],
      ["Lince \xC1rtico", "", "Animal", 3, 3, 3, "Veloz"],
      [
        "Falc\xE3o das Montanhas",
        "",
        "Animal",
        2,
        3,
        3,
        "Entra: compre 1",
        "",
        "D1"
      ],
      ["Caribu Selvagem", "", "Animal", 4, 5, 4, "Protetor", "P"],
      ["Texugo \xC1rtico", "", "Animal", 3, 2, 2, "Furioso", "F"],
      ["Foca do Gelo", "", "Animal", 2, 3, 2, "Entra: compre 1", "", "D1"],
      ["Lobo Uivante", "", "Animal", 4, 3, 4, "Furioso", "F"],
      ["Raposa Escarlate", "", "Animal", 3, 2, 2, "Furioso", "F"],
      ["Touro das Neves", "", "Animal", 5, 5, 5, "Protetor", "P"],
      ["Corvo Astuto", "", "Animal", 1, 2, 2, "Entra: compre 1", "", "D1"],
      ["Fera das Cavernas", "", "Animal", 6, 6, 6, "Furioso", "F"]
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
      ["Remador \xC1gil", "\u{1F6A3}", "Viking", 4, 2, 3, "Furioso", "F"],
      [
        "Curandeiro do Mar",
        "",
        "Viking",
        1,
        4,
        3,
        "Entra: cura 2",
        "",
        "H2"
      ],
      ["Bardo do Porto", "", "Viking", 2, 3, 3, "Aliados +1 ATK", "", "BA1"],
      [
        "Ca\xE7ador de Tesouros",
        "",
        "Viking",
        2,
        2,
        2,
        "Entra: compre 1",
        "",
        "D1"
      ],
      ["Escudeiro do Conv\xE9s", "", "Viking", 2, 5, 4, "Protetor", "P"],
      [
        "Guarda do Cais",
        "",
        "Viking",
        3,
        2,
        3,
        "Entra: dano 1 aleat\xF3rio",
        "",
        "P1"
      ],
      ["Aprendiz de Rede", "", "Viking", 1, 2, 1, "Entra: compre 1", "", "D1"],
      ["Baleeiro Leal", "", "Viking", 2, 4, 3, "Protetor", "P"],
      ["Atirador do Conv\xE9s", "", "Viking", 3, 2, 2, "Entra: dano 1 aleat\xF3rio", "", "P1"],
      ["Sacerdote das Ondas", "", "Viking", 2, 3, 3, "Entra: cura 2", "", "H2"],
      ["Cors\xE1rio Intr\xE9pido", "", "Viking", 4, 2, 3, "Furioso", "F"],
      ["Patrulheiro N\xE1utico", "", "Viking", 3, 5, 4, "Protetor", "P"],
      ["Almirante do Fiorde", "", "Viking", 5, 5, 6, "Aliados +1 ATK", "", "BA1"]
    ],
    floresta: [
      ["Urso Negro", "\u{1F43B}", "Animal", 5, 5, 5, "Protetor", "P"],
      ["Lobo da Mata", "\u{1F43A}", "Animal", 4, 2, 3, "Furioso", "F"],
      ["Javali da Floresta", "\u{1F417}", "Animal", 3, 2, 2, "Impulsivo"],
      ["Cervo Vermelho", "\u{1F98C}", "Animal", 4, 5, 4, "Resistente"],
      ["Coruja S\xE1bia", "\u{1F989}", "Animal", 1, 2, 1, "Entra: compre 1", "", "D1"],
      ["Raposa \xC1gil", "\u{1F98A}", "Animal", 3, 3, 3, "Veloz"],
      ["Bisonte das Colinas", "\u{1F402}", "Animal", 6, 6, 6, "Imponente"],
      ["Serpente do Bosque", "\u{1F40D}", "Animal", 5, 4, 4, "Silenciosa"],
      ["Lince da Sombra", "", "Animal", 4, 2, 3, "Furioso", "F"],
      ["Corvo Observador", "", "Animal", 1, 2, 2, "Entra: compre 1", "", "D1"],
      ["Guardi\xE3o Musgoso", "", "Animal", 3, 5, 4, "Protetor", "P"],
      [
        "Cervo R\xFAnico",
        "",
        "Animal",
        3,
        3,
        3,
        "Entra: +1/+1 aleat\xF3rio",
        "",
        "BR1"
      ],
      ["Javali Voraz", "", "Animal", 5, 3, 4, "Furioso", "F"],
      ["Lebre da N\xE9voa", "", "Animal", 1, 1, 1, "Veloz"],
      ["Guardi\xE3o da Clareira", "", "Animal", 2, 5, 3, "Protetor", "P"],
      ["Raposa Sombria", "", "Animal", 3, 2, 2, "Furioso", "F"],
      ["Urso Musgoso", "", "Animal", 5, 6, 5, "Protetor", "P"],
      ["Coruja Mensageira", "", "Animal", 1, 2, 2, "Entra: compre 1", "", "D1"],
      ["Cervo das Runas", "", "Animal", 3, 3, 3, "Entra: +1/+1 aleat\xF3rio", "", "BR1"],
      ["Javali Espinhoso", "", "Animal", 5, 3, 4, "Furioso", "F"]
    ],
    convergentes: CONVERGENTES_DECK
  };
  var assignCardMedia = () => {
    for (const [deck, cards] of Object.entries(TEMPLATES)) {
      const asset = DECK_ASSET_SLUG[deck];
      const files = DECK_ART_FILES[deck];
      if (!asset || !files || files.length === 0) continue;
      let idx = 0;
      cards.forEach((card) => {
        const [name] = card;
        if (!name) return;
        const file = files[idx % files.length];
        if (!file) return;
        CARD_MEDIA[name] = {
          deck,
          img: `/img/decks/${asset}/characters/${file}`
        };
        idx += 1;
      });
    }
  };
  assignCardMedia();
  if (typeof window !== "undefined") {
    window.CARD_MEDIA = CARD_MEDIA;
  }
  var COMMANDERS = {
    vikings: {
      name: "Eirik",
      classe: "Guerreiro",
      base: { atk: 2, hp: 30 },
      slots: { weapon: 1, armor: 1, trinket: 1 },
      icon: "\u{1F9D4}\u200D\u{1F33E}"
    },
    animais: {
      name: "M\xE3e da Alcateia",
      classe: "Druida",
      base: { atk: 1, hp: 30 },
      slots: { companion: 3 },
      icon: "\u{1F43A}"
    },
    pescadores: {
      name: "Capit\xE3o do Porto",
      classe: "Navegador",
      base: { atk: 1, hp: 30 },
      slots: { weapon: 1, armor: 1 },
      icon: "\u{1F3A3}"
    },
    floresta: {
      name: "Guardi\xE3 da Floresta",
      classe: "Tot\xEAmico",
      base: { atk: 1, hp: 30 },
      slots: { totem: 2, charm: 1 },
      icon: "\u{1F98C}"
    },
    convergentes: {
      name: "Avatar Prismal",
      classe: "M\xEDstico",
      base: { atk: 0, hp: 30 },
      slots: { essence: 3 },
      icon: "\u{1F300}"
    },
    custom: {
      name: "Comandante",
      classe: "",
      base: { atk: 0, hp: 30 },
      slots: { weapon: 1, armor: 1, trinket: 1 },
      icon: "\u{1F464}"
    }
  };
  var ALL_DECKS = Object.keys(TEMPLATES);
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
    playerCommander: COMMANDERS.vikings,
    aiCommander: COMMANDERS.floresta,
    commanderBuffsDirty: true,
    chosen: null,
    playerDeckChoice: "vikings",
    aiDeckChoice: rand(ALL_DECKS),
    customDeck: null,
    mode: "solo",
    story: null,
    maxHandSize: 5,
    totems: [],
    enemyScaling: 0
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
    pAva: $("#playerAvatar"),
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
    openMenuBtn: $("#openMenuBtn"),
    gameMenu: $("#gameMenu"),
    closeMenuBtn: $("#closeMenuBtn"),
    resignBtn: $("#resignBtn"),
    restartBtn: $("#restartBtn"),
    mainMenuBtn: $("#mainMenuBtn"),
    totemBar: $("#totemBar"),
    playerCommander: $("#playerCommander")
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
        if (card.classList.contains("chosen")) return;
        hovering = true;
        card.style.zIndex = 1e3;
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
    const costText = `${c.cost}${c.harvestCost ? `\u{1F33E}${c.harvestCost}` : ""}`;
    const artMarkup = c.img ? `<img src="${c.img}" alt="${c.name}" loading="lazy">` : c.emoji || "";
    const kwTags = (c.kw || []).map(
      (k) => `<span class='keyword' data-tip='${k === "Protetor" ? "Enquanto houver Protetor ou carta em Defesa do lado do defensor, ataques devem mir\xE1-los." : k === "Furioso" ? "Pode atacar no turno em que \xE9 jogada." : k === "Absorver" ? "Ao entrar, copia uma palavra-chave de um aliado." : k === "Mut\xE1vel" ? "No fim do turno, troca ATK e HP." : ""}' >${k}</span>`
    );
    if (c.subclasse && c.classe) {
      kwTags.push(`<span class='class-tag ${c.classe}'>${c.subclasse}</span>`);
    }
    const kwMarkup = kwTags.length ? `<div class="kw-tags">${kwTags.join("")}</div>` : "";
    const effectMarkup = c.text ? `<p class="effect-text">${c.text}</p>` : "";
    d.innerHTML = `<div class="bg bg-${c.deck || "default"}"></div><div class="head"><span class="cost">${costText}</span><div class="name">${c.name}</div>${c.stance ? `<span class="badge ${c.stance === "defense" ? "def" : "atk"}">${c.stance === "defense" ? "\u{1F6E1}\uFE0F" : "\u2694\uFE0F"}</span>` : ""}</div><div class="tribe">${c.tribe}</div><div class="art">${artMarkup}</div><div class="text">${kwMarkup}${effectMarkup}</div><div class="stats"><span class="gem atk">\u2694\uFE0F ${c.atk}</span>${c.stance ? `<span class="stance-label ${c.stance}">${c.stance === "defense" ? "\u{1F6E1}\uFE0F" : "\u2694\uFE0F"}</span>` : ""}<span class="gem hp ${c.hp <= 2 ? "low" : ""}">\u2764\uFE0F ${c.hp}</span></div>`;
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
        const blocked = c.cost > G.playerMana || c.harvestCost > G.playerHarvest || G.current !== "player" || c.type !== "totem" && G.playerBoard.length >= 5;
        if (blocked) {
          d.style.transform = "translateY(-2px)";
          setTimeout(() => d.style.transform = "", 150);
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
          }
        );
      });
      const cantPay = c.cost > G.playerMana || c.harvestCost > G.playerHarvest;
      const disable = G.current !== "player" || c.type !== "totem" && G.playerBoard.length >= 5;
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
      if (G.totems[i]) slot.textContent = "\u{1F5FF}";
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
    if (G.commanderBuffsDirty) {
      applyCommanderItemBuffs();
      G.commanderBuffsDirty = false;
    }
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
  function openStanceChooser(anchor, cb, onCancel) {
    closeStanceChooser();
    anchor.classList.add("chosen");
    const prevZ = anchor.style.zIndex;
    anchor.style.zIndex = 1e4;
    const box = document.createElement("div");
    box.className = "stance-chooser";
    const bA = document.createElement("button");
    bA.className = "btn";
    bA.textContent = "\u2694\uFE0F Ataque";
    const bD = document.createElement("button");
    bD.className = "btn";
    bD.textContent = "\u{1F6E1}\uFE0F Defesa";
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
      transform: "translate(-50%, -8px)"
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
    clone.style.visibility = "visible";
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
  function startGame(opts = {}) {
    const wrap = document.getElementById("gameWrap");
    if (wrap) wrap.style.display = "block";
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
      G.playerDeck = G.playerDeckChoice === "custom" && G.customDeck ? G.customDeck.slice() : TEMPLATES[G.playerDeckChoice].map(makeCard);
      if (G.mode === "story") {
        const t = makeCard(["Totem de For\xE7a", "\u{1F5FF}", "Totem", 0, 0, 2, "Ative: +1/+1 em um aliado"]);
        t.type = "totem";
        G.playerDeck.push(t);
      }
    }
    const playerCmdKey = G.playerDeckChoice === "custom" ? "custom" : G.playerDeckChoice;
    G.playerCommander = { ...COMMANDERS[playerCmdKey] };
    G.playerItems = [];
    G.aiCommander = { ...COMMANDERS[G.aiDeckChoice] };
    G.aiItems = [];
    G.commanderBuffsDirty = true;
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
    setCommanderAvatars();
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
    log(`${c.name} queimou por m\xE3o cheia!`);
    screenParticle("explosion", window.innerWidth / 2, window.innerHeight / 2);
  }
  function setCommanderAvatars() {
    const pc = COMMANDERS[G.playerDeckChoice] || {};
    const ac = COMMANDERS[G.aiDeckChoice] || {};
    if (els.pAva) els.pAva.textContent = pc.icon || "\u{1F464}";
    if (els.aAva) els.aAva.textContent = ac.icon || "\u{1F9FF}";
  }
  function applyTotemBuffs() {
    if (!G.playerBoard.length || !G.totems.length) return;
    G.playerBoard.forEach((u) => {
      var _a, _b;
      u.atk = (_a = u.baseAtk) != null ? _a : u.atk;
      u.hp = (_b = u.baseHp) != null ? _b : u.hp;
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
  function applyCommanderItemBuffs() {
    const apply = (board, commander) => {
      if (!board.length || !commander) return;
      board.forEach((u) => {
        var _a, _b, _c, _d, _e, _f;
        if (typeof u.itemAtk === "number") u.atk -= u.itemAtk;
        if (typeof u.itemHp === "number") u.hp -= u.itemHp;
        const bonusAtk = (((_a = commander.weapon) == null ? void 0 : _a.atk) || 0) + (((_c = (_b = commander.spell) == null ? void 0 : _b.buff) == null ? void 0 : _c.atk) || 0);
        const bonusHp = (((_d = commander.armor) == null ? void 0 : _d.hp) || 0) + (((_f = (_e = commander.spell) == null ? void 0 : _e.buff) == null ? void 0 : _f.hp) || 0);
        u.itemAtk = bonusAtk;
        u.itemHp = bonusHp;
        u.atk += bonusAtk;
        u.hp += bonusHp;
      });
    };
    apply(G.playerBoard, G.playerCommander);
    apply(G.aiBoard, G.aiCommander);
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
          log("Encontro Elite \xE0 frente!");
        } else if (evt.isShop) {
          log("Um mercador misterioso aparece.");
        }
      }
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
    newTurn("player");
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
    const boardFull = c.type !== "totem" && G.playerBoard.length >= 5;
    if (c.cost > G.playerMana || c.harvestCost > G.playerHarvest || boardFull)
      return;
    G.playerHand.splice(i, 1);
    G.playerMana -= c.cost;
    G.playerHarvest -= c.harvestCost;
    if (c.type === "totem") {
      if (G.totems.length >= 3) {
        log("N\xFAmero m\xE1ximo de Totens atingido.");
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
      `${side === "player" ? "Voc\xEA" : "Inimigo"} jogou ${c.name} em modo ${st === "defense" ? "defesa" : "ataque"}.`
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
    if (c.name === "Sombra R\xFAnica") {
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
      if (c.kw.includes("Mut\xE1vel")) {
        const atk = c.atk;
        c.atk = c.hp;
        c.hp = atk;
        fxTextOnCard(c.id, "\u21C6", "buff");
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
    const el = side === "ai" ? els.barAHP || els.aHP2 : els.barPHP || els.pHP2;
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
    const el = side === "ai" ? els.barAHP || els.aHP2 : els.barPHP || els.pHP2;
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
    var _a, _b, _c, _d;
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
      sfx("overflow");
      if (isP) {
        const reduction = ((_b = (_a = G.aiCommander) == null ? void 0 : _a.armor) == null ? void 0 : _b.hp) || 0;
        const faceDmg = Math.max(0, overflow - reduction);
        G.aiHP = clamp(G.aiHP - faceDmg, 0, 99);
        log(
          `${attacker.name} excedeu em ${overflow} e causou dano direto ao Inimigo!`
        );
        particleOnFace("ai", "attack");
      } else {
        const reduction = ((_d = (_c = G.playerCommander) == null ? void 0 : _c.armor) == null ? void 0 : _d.hp) || 0;
        const faceDmg = Math.max(0, overflow - reduction);
        G.playerHP = clamp(G.playerHP - faceDmg, 0, 99);
        log(
          `${attacker.name} excedeu em ${overflow} e causou dano direto a Voc\xEA!`
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
    var _a;
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
    const commander = face === "ai" ? G.aiCommander : G.playerCommander;
    const reduction = ((_a = commander == null ? void 0 : commander.armor) == null ? void 0 : _a.hp) || 0;
    const dmg = Math.max(0, attacker.atk - reduction);
    attacker.canAttack = false;
    if (face === "ai") {
      fxTextOnFace("ai", "-" + dmg, "dmg");
      G.aiHP = clamp(G.aiHP - dmg, 0, 99);
      log(`${attacker.name} causou ${dmg} ao Inimigo!`);
      sfx("crit");
    } else {
      fxTextOnFace("player", "-" + dmg, "dmg");
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
      if (G.mode === "story" && G.story) {
        const { leveled, rewards } = G.story.handleVictory();
        log(`Recompensas dispon\xEDveis: ${rewards.join(", ")}`);
        if (leveled) log(`Voc\xEA alcan\xE7ou o n\xEDvel ${G.story.level}!`);
        setTimeout(() => startGame({ continueStory: true }), 1e3);
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
    const cards = filter === "all" ? allCards() : TEMPLATES[filter].map(makeCard).map((c) => Object.assign(c, { deck: filter }));
    cards.forEach((c) => {
      const d = document.createElement("div");
      d.className = `card ency-card bg-${c.deck}`;
      const art = c.img ? `<img src='${c.img}' alt='${c.name}' loading='lazy'>` : c.emoji || "";
      d.innerHTML = `<div class='bg bg-${c.deck}'></div><div class='head'><span class='cost'>${c.cost}${c.harvestCost ? `\u{1F33E}${c.harvestCost}` : ""}</span><div class='name'>${c.name}</div></div><div class='mini'>${c.tribe} \u2022 \u2694\uFE0F ${c.atk} / \u2764\uFE0F ${c.hp}</div><div class='art'>${art}</div><div class='details'><div>${(c.kw || []).map((k) => `<span class='chip' data-type='keyword' data-tip='${k === "Protetor" ? "Enquanto houver Protetor ou carta em Defesa do lado do defensor, ataques devem mir\xE1-los." : k === "Furioso" ? "Pode atacar no turno em que \xE9 jogada." : ""}' >${k}</span>`).join(" ")}</div><div style='margin-top:6px'>${c.text || ""}</div></div>`;
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
  function applyHoverGlow(btn) {
    if (!btn || btn.dataset.holoGlow === "1") return;
    const update = (e) => {
      const rect = btn.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (e.clientX - rect.left) / rect.width * 100;
      const y = (e.clientY - rect.top) / rect.height * 100;
      btn.style.setProperty("--px", `${x}%`);
      btn.style.setProperty("--py", `${y}%`);
    };
    btn.addEventListener("pointermove", update);
    btn.addEventListener("pointerenter", update);
    btn.addEventListener("mouseenter", () => {
      btn.style.setProperty("--halo", 0.7);
      btn.style.setProperty("--shine", 0.7);
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.removeProperty("--halo");
      btn.style.removeProperty("--shine");
    });
    btn.dataset.holoGlow = "1";
  }
  function syncButtonHoverEffects(target = document.body) {
    if (typeof document === "undefined" || !target) return;
    const nodes = target instanceof Element ? [
      ...target.matches(".btn, .btn-ghost") ? [target] : [],
      ...target.querySelectorAll(".btn, .btn-ghost")
    ] : Array.from(document.querySelectorAll(".btn, .btn-ghost"));
    nodes.forEach((btn) => applyHoverGlow(btn));
  }
  if (typeof window !== "undefined") {
    window.syncButtonHoverEffects = syncButtonHoverEffects;
  }
  if (typeof document !== "undefined") {
    syncButtonHoverEffects(document.body);
    if (typeof MutationObserver !== "undefined") {
      const hoverObserver = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          m.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            syncButtonHoverEffects(node);
          });
        });
      });
      hoverObserver.observe(document.body, { childList: true, subtree: true });
    }
  }
  function toggleGameMenu(force) {
    if (!els.gameMenu) return;
    const isOpen = els.gameMenu.classList.contains("show");
    const shouldOpen = typeof force === "boolean" ? force : !isOpen;
    if (shouldOpen) {
      els.gameMenu.classList.add("show");
      if (els.restartBtn)
        els.restartBtn.style.display = window.isMultiplayer ? "none" : "block";
    } else {
      els.gameMenu.classList.remove("show");
    }
  }
  function goToMainMenu() {
    toggleGameMenu(false);
    if (els.endOverlay) els.endOverlay.classList.remove("show");
    if (els.start) els.start.style.display = "grid";
    const wrap = document.getElementById("gameWrap");
    if (wrap) wrap.style.display = "none";
    startMenuMusic("menu");
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
    toggleGameMenu();
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
    btn.addEventListener("click", () => {
      const pick = btn.dataset.deck;
      G.playerDeckChoice = pick;
      G.aiDeckChoice = rand(
        ALL_DECKS.filter((d) => d !== pick)
      );
      G.playerCommander = { ...COMMANDERS[pick] || COMMANDERS.vikings };
      G.aiCommander = { ...COMMANDERS[G.aiDeckChoice] || COMMANDERS.vikings };
      G.commanderBuffsDirty = true;
      startMenuMusic(pick);
      $$(".deckbtn").forEach((b) => b.style.outline = "none");
      btn.style.outline = "2px solid var(--accent)";
      els.startGame.disabled = false;
    });
    const book = btn.querySelector(".view-cards");
    book && book.addEventListener("click", (ev) => {
      ev.stopPropagation();
      renderEncy(btn.dataset.deck, true);
    });
  });
  if (els.openMenuBtn) {
    els.openMenuBtn.addEventListener("click", () => {
      initAudio();
      ensureRunning();
      toggleGameMenu(true);
    });
  }
  if (els.closeMenuBtn) {
    els.closeMenuBtn.addEventListener("click", () => toggleGameMenu(false));
  }
  if (els.resignBtn) {
    els.resignBtn.addEventListener("click", () => {
      toggleGameMenu(false);
      endGame(false);
    });
  }
  if (els.restartBtn) {
    els.restartBtn.addEventListener("click", () => {
      toggleGameMenu(false);
      startGame();
    });
  }
  if (els.mainMenuBtn) {
    els.mainMenuBtn.addEventListener("click", () => goToMainMenu());
  }
  els.startGame.addEventListener("click", () => {
    els.start.style.display = "none";
    const wrap = document.getElementById("gameWrap");
    if (wrap) wrap.style.display = "block";
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
    goToMainMenu();
  });
  initCommanderHud();
  els.playerCommander && els.playerCommander.addEventListener("click", openCommanderHud);
  els.pAva && els.pAva.addEventListener("click", openCommanderHud);
  window.G = G;
  window.startGame = startGame;
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
