/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadShop(){
  // minimal DOM structure required by shop.js
  document.body.innerHTML = `
    <div id="shopChoices"></div>
    <div id="shopGold"></div>
    <div id="shopMsg"></div>
    <div id="shopModal"><div class="box"></div></div>
    <button id="btnReroll"></button>
    <button id="closeShop"></button>
  `;

  const context = {
    window,
    document,
    console,
    fetch: global.fetch,
    setTimeout,
    clearTimeout,
    PLAYER_ID: 'test-player',
    shuffle: arr => arr.slice(), // deterministic for tests
  };
  vm.createContext(context);
  let script = fs.readFileSync(path.join(__dirname, '../public/js/shop.js'), 'utf8');
  // expose internal state and helpers for testing
  script += '\nwindow.shopState = shopState;\nwindow.closeShop = closeShop;';
  vm.runInContext(script, context);
  context.openShop = context.window.openShop;
  context.closeShop = context.window.closeShop;
  context.shopState = context.window.shopState;
  return context;
}

test('queues multiple purchases and resets on close', async () => {
  const ctx = loadShop();
  ctx.fetch = global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ gold: 100 }) })
  );
  
  // Force server-side purchase mode so pending queue is used
  ctx.window.usePurchaseAPI = true;

  ctx.openShop({ faction: 'Furioso', gold: 100 });
  const buttons = document.querySelectorAll('.price-btn');
  expect(buttons.length).toBeGreaterThan(1);

  buttons[0].click();
  buttons[1].click();
  expect(ctx.shopState.pending.length).toBe(2);

  await Promise.all(ctx.shopState.pending);
  ctx.closeShop();
  expect(ctx.shopState.pending.length).toBe(0);
});
