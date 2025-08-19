export const $ = (s) => document.querySelector(s);
export const $$ = (s) => Array.from(document.querySelectorAll(s));
export function log(t) {
  const logBox = document.querySelector("#log");
  if (!logBox) return;
  const d = document.createElement("div");
  d.textContent = t;
  logBox.prepend(d);
}
