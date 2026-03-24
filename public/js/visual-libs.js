import * as THREE from '/vendor/three/three.module.min.js';
import * as PIXI from '/vendor/pixi/pixi.min.mjs';

window.THREE = THREE;
window.PIXI = PIXI;

if(typeof window.__FFF_REGISTER_VISUAL_LIBS__ === 'function'){
  window.__FFF_REGISTER_VISUAL_LIBS__({ three: THREE, pixi: PIXI });
}

window.dispatchEvent(new CustomEvent('fff:visual-libs-ready', {
  detail: { three: THREE, pixi: PIXI }
}));
