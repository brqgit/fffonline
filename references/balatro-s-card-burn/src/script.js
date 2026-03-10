// ══════════════════════════════════════════════════════════════
// BACKGROUND — Balatro spin shader reproduced in 2D canvas
// (exact algorithm from the decompiled Balatro source)
// ══════════════════════════════════════════════════════════════
const bgCanvas = document.getElementById("bgCanvas");
const bgCtx = bgCanvas.getContext("2d");
let bgOff = null;

function resizeBg() {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  bgOff = null;
}
resizeBg();
window.addEventListener("resize", resizeBg);

function renderBg(time) {
  const W = bgCanvas.width,
    H = bgCanvas.height;
  const scale = 5; // downsample for perf
  const w = Math.ceil(W / scale),
    h = Math.ceil(H / scale);
  if (!bgOff || bgOff.width !== w || bgOff.height !== h) {
    bgOff = new OffscreenCanvas(w, h);
  }
  const ctx = bgOff.getContext("2d");
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const len = Math.sqrt(W * W + H * H);
  const C1 = [0.871, 0.267, 0.231];
  const C2 = [0.0, 0.42, 0.706];
  const C3 = [0.086, 0.137, 0.145];
  const CONTRAST = 3.5,
    LIGHTING = 0.4,
    SPIN_AMOUNT = 0.25;
  // Natural rhythmic breathing: base speed + slow sinusoidal pulse
  // ~8s inhale/exhale cycle layered over a slow ~22s drift
  const breathe =
    0.5 + 0.18 * Math.sin(time * 0.38) + 0.08 * Math.sin(time * 0.17 + 1.1);
  const SPIN_SPEED = 0.38 * breathe; // was 2.0 — much slower, rhythmic
  const MOVE_SPEED = 1.6 * breathe; // was 7.0 — fluid, not frantic
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      let ux0 = (px * scale - 0.5 * W) / len;
      let uy0 = (py * scale - 0.5 * H) / len;
      const uvLen = Math.sqrt(ux0 * ux0 + uy0 * uy0);
      const newAngle =
        Math.atan2(uy0, ux0) +
        time * SPIN_SPEED -
        20.0 * (SPIN_AMOUNT * uvLen + (1.0 - SPIN_AMOUNT));
      let ux = uvLen * Math.cos(newAngle) * 30;
      let uy = uvLen * Math.sin(newAngle) * 30;
      let u2 = ux + uy;
      const spd = time * MOVE_SPEED;
      for (let i = 0; i < 5; i++) {
        u2 += Math.sin(Math.max(ux, uy)) + ux;
        ux += 0.5 * Math.cos(5.1123314 + 0.353 * u2 + spd * 0.131121);
        uy += 0.5 * Math.sin(u2 - 0.113 * spd);
        ux -= Math.cos(ux + uy) - Math.sin(ux * 0.711 - uy);
      }
      const cm = 0.25 * CONTRAST + 0.5 * SPIN_AMOUNT + 1.2;
      const pr = Math.min(
        2,
        Math.max(0, Math.sqrt(ux * ux + uy * uy) * 0.035 * cm)
      );
      const c1p = Math.max(0, 1 - cm * Math.abs(1 - pr));
      const c2p = Math.max(0, 1 - cm * Math.abs(pr));
      const c3p = 1 - Math.min(1, c1p + c2p);
      const li =
        (LIGHTING - 0.2) * Math.max(c1p * 5 - 4, 0) +
        LIGHTING * Math.max(c2p * 5 - 4, 0);
      const idx = (py * w + px) * 4;
      d[idx] =
        ((0.3 / CONTRAST) * C1[0] +
          (1 - 0.3 / CONTRAST) * (C1[0] * c1p + C2[0] * c2p + c3p * C3[0]) +
          li) *
        255;
      d[idx + 1] =
        ((0.3 / CONTRAST) * C1[1] +
          (1 - 0.3 / CONTRAST) * (C1[1] * c1p + C2[1] * c2p + c3p * C3[1]) +
          li) *
        255;
      d[idx + 2] =
        ((0.3 / CONTRAST) * C1[2] +
          (1 - 0.3 / CONTRAST) * (C1[2] * c1p + C2[2] * c2p + c3p * C3[2]) +
          li) *
        255;
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  bgCtx.clearRect(0, 0, W, H);
  bgCtx.drawImage(bgOff, 0, 0, W, H);
}
// ══════════════════════════════════════════════════════════════
// CARD — WebGL with Balatro dissolve shader
// ══════════════════════════════════════════════════════════════
// ── Vertex Shader ─────────────────────────────────────────────
const VS = `
attribute vec2 a_pos;
attribute vec2 a_uv;
uniform float u_time;
uniform vec2  u_mouse;
varying vec2 v_uv;
varying vec2 v_sc;

void main() {
  v_uv = a_uv;
  vec2 pos = a_pos;
  // Gentle float
  pos.y += sin(u_time*0.85)*0.018;
  pos.x += cos(u_time*0.52)*0.007;

  // 3D tilt
  float tx = u_mouse.y*0.2, ty = -u_mouse.x*0.16;
  vec3 p = vec3(pos,0.0);
  float cy=cos(ty),sy=sin(ty);
  p = vec3(p.x*cy+p.z*sy, p.y, -p.x*sy+p.z*cy);
  float cx=cos(tx),sx=sin(tx);
  p = vec3(p.x, p.y*cx-p.z*sx, p.y*sx+p.z*cx);
  float dz = 1.0+p.z*0.28;
  vec2 proj = p.xy/dz * 0.78;
  v_sc = proj;
  gl_Position = vec4(proj,0.0,1.0);
}
`;
// ── Fragment Shader ───────────────────────────────────────────
// Faithfully replicates Balatro's dissolve:
//   • Spiral polar coordinate dissolve field (cards "spiral in")
//   • Orange→red→white fire edge using FBM-modulated threshold
//   • Foil holographic shimmer on intact surface
//   • Bright ember sparks at dissolution boundary
const FS = `
precision highp float;

uniform sampler2D u_tex;
uniform float u_time;
uniform vec2  u_mouse;
uniform float u_dissolve;  // 0=intact, 1=gone
uniform float u_shine;     // reform shine sweep

varying vec2 v_uv;
varying vec2 v_sc;

#define PI 3.14159265359
#define TAU 6.28318530718

// Value noise
float hash(vec2 p){p=fract(p*vec2(127.1,311.7));p+=dot(p,p+19.31);return fract(p.x*p.y);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*vnoise(p);p=p*2.0+vec2(1.7,9.2);a*=0.5;}return v;}

// ── Balatro foil shader (from foil.fs in resources/shaders) ──
vec3 foil(vec2 uv, float time, vec2 mouse) {
  vec2 adj = uv - 0.5;
  vec2 fo = vec2(time*0.9 + mouse.x*0.4, mouse.y*0.3);
  // Two-layer interference rings
  float f1 = max(min(
    2.0*sin((length(90.0*adj)+fo.x*2.0)+3.0*(1.0+0.8*cos(length(113.1121*adj)-fo.x*3.121)))
    -1.0-max(5.0-length(90.0*adj),0.0), 1.0), 0.0);
  vec2 rot = vec2(cos(fo.x*0.1221),sin(fo.x*0.3512));
  float rl = length(rot)*length(adj);
  float ang = rl>0.001 ? dot(rot,adj)/rl : 0.0;
  float f2 = max(min(5.0*(abs(ang)+0.1*cos(length(50.0*adj)*3.0-fo.x*5.0))-4.0+f1,1.0),0.0);
  // Gold / teal / pink spectrum
  vec3 gold=vec3(1.0,0.82,0.1), teal=vec3(0.0,0.9,0.7), pink=vec3(1.0,0.15,0.5);
  return (mix(gold,teal,f1)*f2 + pink*f1*0.25) * 0.22;
}

// ── Balatro-style spiral polar dissolve field ─────────────────
// Returns signed distance: <0 = still alive, >0 = dissolved
// The effect: card dissolves from OUTSIDE IN with a spiral sweep
float spiralField(vec2 uv, float progress) {
  vec2 c = uv - 0.5;
  float r = length(c);
  float theta = atan(c.y, c.x); // -PI..PI

  // Convert to spiral coordinate:
  // As progress goes 0→1, a threshold sweeps from outside (r=0.7) to center (r=0)
  // The spiral twist: theta winds around proportional to radius
  float spiralPhase = (theta / TAU + 0.5)  // 0..1 around circle
                    + r * 2.2;             // adds spiral twist
  spiralPhase = fract(spiralPhase);        // 0..1, creates spiral bands

  // Add FBM noise to break up the clean edge — gives organic fire look
  float n1 = fbm(uv*3.5 + u_time*0.25) * 0.3;
  float n2 = fbm(uv*7.0 - u_time*0.18 + vec2(4.3,1.1)) * 0.12;

  // Primary field: radial distance from center (dissolve outer→inner)
  // + spiral modulation + noise
  float field = r + spiralPhase*0.08 + n1 + n2;

  // Threshold: at progress=0 field must exceed ~1.0 (nothing dissolved),
  // at progress=1 threshold=0 (everything dissolved)
  float thresh = 0.95*(1.0-progress);
  return field - thresh;
}

void main() {
  vec2 uv = v_uv;

  // Subtle alive distortion
  float wave = 0.0012*sin(uv.y*15.0+u_time*2.1)+0.0008*cos(uv.x*11.0+u_time*1.9);
  vec4 card = texture2D(u_tex, clamp(uv+vec2(wave), 0.001, 0.999));

  vec3 col = card.rgb;

  // Foil overlay on intact card
  col += foil(uv, u_time, u_mouse);

  // Vignette
  vec2 vc = uv-0.5;
  col *= 1.0 - dot(vc,vc)*0.5;

  float alpha = card.a;

  if (u_dissolve > 0.001) {
    float d = spiralField(uv, u_dissolve);

    // Edge widths
    float ew  = 0.055;  // core fire edge
    float ew2 = 0.18;   // outer bloom glow

    // Animated noise on fire edge for flicker
    float fn = fbm(uv*7.0 + vec2(u_time*1.4, -u_time*0.9));
    float fn2 = vnoise(uv*20.0 + u_time*3.0); // fine sparks

    // ── Fire colors — Balatro uses orange/red/white ────────
    vec3 hotWhite  = vec3(1.00, 0.98, 0.90);
    vec3 orange    = vec3(1.00, 0.55, 0.05);
    vec3 deepOrange= vec3(0.95, 0.22, 0.0);
    vec3 charcoal  = vec3(0.30, 0.08, 0.0);

    vec3 fireCol = mix(deepOrange, orange,    smoothstep(0.2,0.7,fn));
    fireCol      = mix(fireCol,    hotWhite,  smoothstep(0.6,0.95,fn));

    // ── 1. Outer bloom on surviving card edge ──────────────
    float outerBloom = smoothstep(ew2, 0.0, d + ew2)
                     * (1.0 - smoothstep(-ew*0.5, 0.0, d));
    col += mix(charcoal, deepOrange, fn*0.6) * outerBloom * 2.0;

    // ── 2. Glowing fire edge band ──────────────────────────
    float edgeBand = smoothstep(-ew,0.0,d) * (1.0-smoothstep(0.0,ew,d));
    col = mix(col, fireCol*1.6, edgeBand*0.85);

    // ── 3. White-hot inner core ────────────────────────────
    float coreBand = smoothstep(-ew*0.35,0.0,d)*(1.0-smoothstep(0.0,ew*0.5,d));
    col = mix(col, hotWhite*2.2, coreBand*0.75);

    // ── 4. Ember sparks scattered on edge ─────────────────
    float sparkMask = edgeBand * step(0.74, fn2) * step(0.6, fn);
    col += hotWhite * sparkMask * 4.0;

    // ── Alpha dissolve ─────────────────────────────────────
    float burned = smoothstep(-0.004, 0.018, d);
    alpha *= (1.0-burned) * card.a;
  }

  // Reform shine sweep
  if (u_shine > 0.001 && u_shine < 0.999) {
    float sd = (uv.x*0.55+uv.y*0.45) - (u_shine*1.5-0.25);
    float shine = exp(-sd*sd*220.0) * 1.4;
    col += vec3(1.0, 0.95, 0.82) * shine;
  }

  gl_FragColor = vec4(col, alpha);
}
`;
// ── WebGL setup ───────────────────────────────────────────────
const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl", {
  alpha: true,
  premultipliedAlpha: false
});

function mkShader(src, type) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    console.error(type, "shader:", gl.getShaderInfoLog(s));
  return s;
}
const prog = gl.createProgram();
gl.attachShader(prog, mkShader(VS, gl.VERTEX_SHADER));
gl.attachShader(prog, mkShader(FS, gl.FRAGMENT_SHADER));
gl.linkProgram(prog);
gl.useProgram(prog);
const QUAD_POS = new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]);
const QUAD_UV = new Float32Array([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1]);

function bindBuf(data, attr) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, attr);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
}
bindBuf(QUAD_POS, "a_pos");
bindBuf(QUAD_UV, "a_uv");
const U = {};
["u_time", "u_mouse", "u_tex", "u_dissolve", "u_shine"].forEach(
  (n) => (U[n] = gl.getUniformLocation(prog, n))
);
gl.uniform1i(U.u_tex, 0);
gl.uniform2f(U.u_mouse, 0, 0);
gl.uniform1f(U.u_dissolve, 0);
gl.uniform1f(U.u_shine, 0);
// Texture load
const tex = gl.createTexture();
const img = new Image();
img.crossOrigin = "anonymous";
img.onload = () => {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
};
img.onerror = () => {
  // Fallback cream-colored card if CORS blocks
  const fb = new Uint8Array([245, 238, 230, 255]);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    fb
  );
};
img.src =
  "https://static.wikia.nocookie.net/balatrogame/images/4/4c/King_of_Hearts.png";
// ══════════════════════════════════════════════════════════════
// STATE & ANIMATION
// ══════════════════════════════════════════════════════════════
let mouse = {
  x: 0,
  y: 0
};
let dissolve = 0,
  dissolveTarget = 0;
let burning = false,
  restoring = false;
let doShine = false,
  shineProg = 0;
let burnTimer = 0; // tracks elapsed time through the burn curve
let restoreTimer = 0; // tracks elapsed time through restore
const T0 = performance.now();
// Particles
const pCanvas = document.getElementById("pCanvas");
const pCtx = pCanvas.getContext("2d");
(function resizeP() {
  pCanvas.width = innerWidth;
  pCanvas.height = innerHeight;
})();
window.addEventListener("resize", () => {
  pCanvas.width = innerWidth;
  pCanvas.height = innerHeight;
});
const embers = [],
  smoke = [];

function emitEmbers() {
  const r = canvas.getBoundingClientRect();
  const cx = r.left + r.width * 0.5,
    cy = r.top + r.height * 0.5;
  // Scatter from the edge of the dissolve area
  const angle = Math.random() * Math.PI * 2;
  const rad = (0.15 + Math.random() * 0.5) * r.width * 0.5;
  const ex = cx + Math.cos(angle) * rad;
  const ey = cy + Math.sin(angle) * rad * (r.height / r.width);
  for (let i = 0; i < 2 + Math.floor(Math.random() * 4); i++) {
    const a2 = angle + (Math.random() - 0.5) * 1.5;
    const spd = 1.5 + Math.random() * 3;
    embers.push({
      x: ex,
      y: ey,
      vx: Math.cos(a2) * spd,
      vy: Math.sin(a2) * spd - 1.8,
      life: 1,
      decay: 0.02 + Math.random() * 0.025,
      size: 1.5 + Math.random() * 2.5,
      hue: 15 + Math.random() * 35
    });
  }
  if (Math.random() < 0.12) {
    smoke.push({
      x: ex + (Math.random() - 0.5) * 25,
      y: ey,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -(0.4 + Math.random() * 0.9),
      life: 1,
      decay: 0.004 + Math.random() * 0.004,
      size: 12 + Math.random() * 30,
      op: 0.04 + Math.random() * 0.055
    });
  }
}

function drawParticles() {
  pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
  for (let i = smoke.length - 1; i >= 0; i--) {
    const s = smoke[i];
    s.x += s.vx;
    s.y += s.vy;
    s.size += 0.6;
    s.life -= s.decay;
    if (s.life <= 0) {
      smoke.splice(i, 1);
      continue;
    }
    const g = pCtx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size);
    const a = s.op * s.life;
    g.addColorStop(0, `rgba(100,40,0,${a})`);
    g.addColorStop(0.6, `rgba(40,15,0,${a * 0.3})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    pCtx.fillStyle = g;
    pCtx.beginPath();
    pCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    pCtx.fill();
  }
  for (let i = embers.length - 1; i >= 0; i--) {
    const e = embers[i];
    e.x += e.vx;
    e.y += e.vy;
    e.vy += 0.07;
    e.vx *= 0.98;
    e.life -= e.decay;
    if (e.life <= 0) {
      embers.splice(i, 1);
      continue;
    }
    const flk = 0.65 + 0.35 * Math.random();
    pCtx.save();
    pCtx.globalAlpha = e.life * flk;
    const g = pCtx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 3);
    g.addColorStop(0, `hsl(${e.hue + 25},100%,92%)`);
    g.addColorStop(0.35, `hsl(${e.hue},100%,60%)`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    pCtx.fillStyle = g;
    pCtx.beginPath();
    pCtx.arc(e.x, e.y, e.size * 3, 0, Math.PI * 2);
    pCtx.fill();
    pCtx.fillStyle = `hsl(${e.hue + 40},100%,96%)`;
    pCtx.beginPath();
    pCtx.arc(e.x, e.y, e.size * 0.25, 0, Math.PI * 2);
    pCtx.fill();
    pCtx.restore();
  }
}
// ══════════════════════════════════════════════════════════════
// AUDIO — Tone.js synthesized SFX
// ══════════════════════════════════════════════════════════════
let audioReady = false;
async function initAudio() {
  if (audioReady) return;
  await Tone.start();
  audioReady = true;
}
// ── BURN SFX ─────────────────────────────────────────────────
// Layered fire sound: noise crackle + deep rumble + high sizzle
function playBurnSFX() {
  if (!audioReady) return;
  const now = Tone.now();
  // 1. Main crackling noise — filtered white noise, envelope like fire catching
  const fireNoise = new Tone.Noise("white");
  const fireCrackleFilter = new Tone.Filter({
    frequency: 800,
    type: "bandpass",
    Q: 0.8
  });
  const fireEnv = new Tone.AmplitudeEnvelope({
    attack: 0.3, // slow catch
    decay: 0.4,
    sustain: 0.7,
    release: 1.8
  });
  const fireGain = new Tone.Gain(0.18);
  const fireDistort = new Tone.Distortion(0.45);
  fireNoise.connect(fireCrackleFilter);
  fireCrackleFilter.connect(fireDistort);
  fireDistort.connect(fireEnv);
  fireEnv.connect(fireGain);
  fireGain.toDestination();
  fireNoise.start(now);
  fireEnv.triggerAttack(now);
  // Fade out with burn — sustains for 3s then releases
  fireEnv.triggerRelease(now + 3.0);
  fireNoise.stop(now + 5.5);
  setTimeout(() => {
    fireNoise.dispose();
    fireCrackleFilter.dispose();
    fireEnv.dispose();
    fireGain.dispose();
    fireDistort.dispose();
  }, 6000);
  // 2. Deep low rumble — very low freq noise for the "whoosh" of ignition
  const rumbleNoise = new Tone.Noise("brown");
  const rumbleFilter = new Tone.Filter({
    frequency: 180,
    type: "lowpass",
    Q: 1.2
  });
  const rumbleEnv = new Tone.AmplitudeEnvelope({
    attack: 0.15,
    decay: 0.6,
    sustain: 0.3,
    release: 2.0
  });
  const rumbleGain = new Tone.Gain(0.22);
  rumbleNoise.connect(rumbleFilter);
  rumbleFilter.connect(rumbleEnv);
  rumbleEnv.connect(rumbleGain);
  rumbleGain.toDestination();
  rumbleNoise.start(now);
  rumbleEnv.triggerAttack(now);
  rumbleEnv.triggerRelease(now + 2.2);
  rumbleNoise.stop(now + 4.5);
  setTimeout(() => {
    rumbleNoise.dispose();
    rumbleFilter.dispose();
    rumbleEnv.dispose();
    rumbleGain.dispose();
  }, 5000);
  // 3. High sizzle / embers — pitched noise bursts like crackling sparks
  const sizzle = new Tone.Noise("pink");
  const sizzleFilter = new Tone.Filter({
    frequency: 3800,
    type: "highpass",
    Q: 2
  });
  const sizzleEnv = new Tone.AmplitudeEnvelope({
    attack: 0.05,
    decay: 0.3,
    sustain: 0.15,
    release: 2.5
  });
  const sizzleGain = new Tone.Gain(0.09);
  sizzle.connect(sizzleFilter);
  sizzleFilter.connect(sizzleEnv);
  sizzleEnv.connect(sizzleGain);
  sizzleGain.toDestination();
  sizzle.start(now + 0.2);
  sizzleEnv.triggerAttack(now + 0.2);
  sizzleEnv.triggerRelease(now + 3.2);
  sizzle.stop(now + 6.0);
  setTimeout(() => {
    sizzle.dispose();
    sizzleFilter.dispose();
    sizzleEnv.dispose();
    sizzleGain.dispose();
  }, 7000);
  // 4. Ignition "whomp" — a short pitched thud when fire first catches
  const whomp = new Tone.Synth({
    oscillator: {
      type: "sine"
    },
    envelope: {
      attack: 0.01,
      decay: 0.35,
      sustain: 0,
      release: 0.1
    }
  });
  const wompGain = new Tone.Gain(0.28);
  whomp.connect(wompGain);
  wompGain.toDestination();
  // Pitch drop: starts low, slides down
  whomp.triggerAttack("C2", now);
  whomp.frequency.exponentialRampToValueAtTime(30, now + 0.4);
  whomp.triggerRelease(now + 0.38);
  setTimeout(() => {
    whomp.dispose();
    wompGain.dispose();
  }, 1500);
  // 5. Slow filter sweep — crackle brightens as fire spreads
  fireCrackleFilter.frequency.setValueAtTime(400, now);
  fireCrackleFilter.frequency.exponentialRampToValueAtTime(2400, now + 2.0);
  fireCrackleFilter.frequency.exponentialRampToValueAtTime(600, now + 3.5);
}
// ── REVIVAL SFX ──────────────────────────────────────────────
// Magical reformation: ascending shimmer chord + bell + crystalline sweep
function playRevivalSFX() {
  if (!audioReady) return;
  const now = Tone.now();
  // 1. Ascending magic chord — soft AM synth arpeggio
  const revSynth = new Tone.PolySynth(Tone.AMSynth, {
    harmonicity: 2.5,
    oscillator: {
      type: "sine"
    },
    envelope: {
      attack: 0.08,
      decay: 0.4,
      sustain: 0.3,
      release: 1.2
    },
    modulation: {
      type: "triangle"
    },
    modulationEnvelope: {
      attack: 0.2,
      decay: 0.3,
      sustain: 0.5,
      release: 0.8
    }
  });
  const revReverb = new Tone.Reverb({
    decay: 2.8,
    wet: 0.55
  });
  const revChorus = new Tone.Chorus({
    frequency: 3,
    delayTime: 3.5,
    depth: 0.7,
    wet: 0.4
  });
  const revGain = new Tone.Gain(0.22);
  revSynth.connect(revChorus);
  revChorus.connect(revReverb);
  revReverb.connect(revGain);
  revGain.toDestination();
  // Rapid upward arpeggio — G major pentatonic feels hopeful/magical
  const arpNotes = ["G3", "B3", "D4", "G4", "B4", "D5"];
  arpNotes.forEach((note, i) => {
    revSynth.triggerAttackRelease(note, "8n", now + i * 0.09);
  });
  setTimeout(() => {
    revSynth.dispose();
    revReverb.dispose();
    revChorus.dispose();
    revGain.dispose();
  }, 4000);
  // 2. Crystalline bell ping — high bright bell at peak of restoration
  const bell = new Tone.MetalSynth({
    frequency: 520,
    envelope: {
      attack: 0.001,
      decay: 1.2,
      release: 0.8
    },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4200,
    octaves: 1.5
  });
  const bellGain = new Tone.Gain(0.14);
  const bellReverb = new Tone.Reverb({
    decay: 3.5,
    wet: 0.7
  });
  bell.connect(bellGain);
  bellGain.connect(bellReverb);
  bellReverb.toDestination();
  bell.triggerAttackRelease("16n", now + 0.45);
  bell.triggerAttackRelease("16n", now + 0.85);
  setTimeout(() => {
    bell.dispose();
    bellGain.dispose();
    bellReverb.dispose();
  }, 5000);
  // 3. Shimmer sweep — rising noise with very high-pass filter (like magic dust)
  const shimmer = new Tone.Noise("white");
  const shimFilter = new Tone.Filter({
    frequency: 6000,
    type: "highpass",
    Q: 3
  });
  const shimEnv = new Tone.AmplitudeEnvelope({
    attack: 0.05,
    decay: 0.1,
    sustain: 0.6,
    release: 0.9
  });
  const shimGain = new Tone.Gain(0.07);
  const shimChorus = new Tone.Chorus({
    frequency: 8,
    depth: 0.9,
    wet: 0.6
  });
  shimmer.connect(shimFilter);
  shimFilter.connect(shimChorus);
  shimChorus.connect(shimEnv);
  shimEnv.connect(shimGain);
  shimGain.toDestination();
  shimmer.start(now + 0.1);
  shimEnv.triggerAttack(now + 0.1);
  // Filter sweeps up as card reforms
  shimFilter.frequency.setValueAtTime(3000, now + 0.1);
  shimFilter.frequency.exponentialRampToValueAtTime(12000, now + 1.0);
  shimEnv.triggerRelease(now + 1.1);
  shimmer.stop(now + 2.5);
  setTimeout(() => {
    shimmer.dispose();
    shimFilter.dispose();
    shimEnv.dispose();
    shimGain.dispose();
    shimChorus.dispose();
  }, 3500);
}
// ── Interaction ───────────────────────────────────────────────
canvas.addEventListener("mousemove", (e) => {
  const r = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
});
canvas.addEventListener("mouseleave", () => {
  mouse.x = 0;
  mouse.y = 0;
});

function startBurn() {
  if (restoring) return;
  initAudio().then(playBurnSFX);
  burning = true;
  dissolveTarget = 1.0;
  burnTimer = 0;
  canvas.classList.add("burning");
  document.getElementById("hint").textContent = "dissolving…";
}
canvas.addEventListener("click", startBurn);
document.getElementById("burnBtn").addEventListener("click", startBurn);
document.getElementById("redoBtn").addEventListener("click", () => {
  initAudio().then(playRevivalSFX);
  burning = false;
  restoring = true;
  dissolveTarget = 0.0;
  restoreTimer = 0;
  canvas.classList.remove("burning");
  document.getElementById("hint").textContent = "click card or press burn";
});
// ── Render loop ───────────────────────────────────────────────
let lastEmber = 0,
  bgTick = 0,
  lastNow = 0;

function render(now) {
  const dt = Math.min((now - lastNow) * 0.001, 0.05);
  lastNow = now;
  const t = (now - T0) * 0.001;
  // Natural fire curve: slow ignition catch → accelerates → gentle tail-off (~3.5s total)
  if (burning) {
    burnTimer += dt;
    const raw = Math.min(burnTimer / 3.5, 1.0);
    // Skewed ease: hesitant start (paper catches), then rushes, soft finish
    let eased;
    if (raw < 0.12) {
      eased = raw * raw * 3.5; // slow ignition flicker
    } else if (raw < 0.75) {
      eased = 0.05 + (raw - 0.12) * 1.45; // strong accelerating burn
    } else {
      const tail = (raw - 0.75) / 0.25;
      eased = 0.964 + tail * tail * 0.036; // taper at the end
    }
    dissolve = Math.min(eased, 1.0);
    if (dissolve >= 1.0) {
      dissolve = 1.0;
      burning = false;
    }
  } else if (restoring) {
    // Twice as fast as burn (~1.75s), smooth ease-out
    restoreTimer += dt;
    const raw = Math.min(restoreTimer / 1.75, 1.0);
    const eased = 1.0 - raw * raw * (2.0 - raw); // ease-out quad
    dissolve = Math.max(eased, 0.0);
    if (dissolve <= 0.001) {
      dissolve = 0.0;
      restoring = false;
      doShine = true;
      shineProg = 0.0;
    }
  }
  // Shine on restore
  if (doShine) {
    shineProg += dt * 1.1;
    if (shineProg >= 1.0) {
      shineProg = 1.0;
      doShine = false;
    }
    gl.uniform1f(U.u_shine, shineProg);
  } else gl.uniform1f(U.u_shine, 0.0);
  // Ember emission
  if ((burning || dissolve > 0.04) && dissolve < 0.97 && now - lastEmber > 55) {
    lastEmber = now;
    emitEmbers();
  }
  // Background every 3 frames (slower movement still looks smooth)
  if (bgTick++ % 3 === 0) renderBg(t);
  // Card
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.uniform1f(U.u_time, t);
  gl.uniform2f(U.u_mouse, mouse.x, mouse.y);
  gl.uniform1f(U.u_dissolve, dissolve);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  drawParticles();
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
