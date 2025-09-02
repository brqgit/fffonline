import { $ } from "./index.js";

function hud() {
  return $("#commanderHud");
}

function slots() {
  const h = hud();
  return h ? Array.from(h.querySelectorAll(".equip-grid .item-slot")) : [];
}

function closeBtn() {
  return $("#closeCommanderHud");
}

export function openCommanderHud() {
  const h = hud();
  if (h) h.style.display = "grid";
}

export function closeCommanderHud() {
  const h = hud();
  if (h) h.style.display = "none";
}

export function setSlotItem(i, content) {
  const s = slots()[i];
  if (s) s.textContent = content || "";
}

export function initCommanderHud() {
  const btn = closeBtn();
  if (btn) btn.addEventListener("click", closeCommanderHud);
}

