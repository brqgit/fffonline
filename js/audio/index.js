const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null,
  master = null,
  muted = false,
  currentMaster = 0.18,
  currentMusic = 0.18;
export function initAudio() {
  if (!AudioCtx) return;
  if (!actx) {
    actx = new AudioCtx();
    master = actx.createGain();
    master.gain.value = 0.18;
    master.connect(actx.destination);
  }
}
export function ensureRunning() {
  if (actx && actx.state === "suspended") actx.resume();
}
export function tone(f = 440, d = 0.1, t = "sine", v = 1, w = 0) {
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
export function sfx(n) {
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
      draw: () => {
        tone(660, 0.06, "square", 0.6, 0);
        tone(880, 0.08, "triangle", 0.5, 0.04);
      },
      shuffle: () => {
        tone(380, 0.08, "triangle", 0.45, 0);
        tone(520, 0.1, "sawtooth", 0.38, 0.05);
        tone(280, 0.08, "square", 0.4, 0.12);
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
export function startMenuMusic(preset) {
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
export function stopMenuMusic() {
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
export function tryStartMenuMusicImmediate() {
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

export function toggleMute(btn) {
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
  if (btn) btn.textContent = muted ? "🔇 Mudo" : "🔊 Som";
}
