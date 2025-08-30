const $ = sel => document.querySelector(sel);

const FACTIONS = {
  Furioso: { pool: [
    { name: 'Ceifeira Ágil', type: 'unit', atk: 3, hp: 2, cost: 9 },
    { name: 'Grito de Guerra', type: 'spell', desc: '+1 ATK a uma unidade', cost: 6 },
    { name: 'Totem da Fúria', type: 'totem', desc: '+1 ATK a 1–3 unidades', cost: 12 }
  ]},
  Sombras: { pool: [
    { name: 'Sombras Encapuçado', type: 'unit', atk: 3, hp: 5, cost: 10 },
    { name: 'Dreno Sombrio', type: 'spell', desc: 'Drena 2 de HP', cost: 7 },
    { name: 'Totem da Lua Nova', type: 'totem', desc: '+1 HP a 1–3 unidades', cost: 11 }
  ]},
  Percepcao: { pool: [
    { name: 'Guardião do Bosque', type: 'unit', atk: 2, hp: 4, cost: 8 },
    { name: 'Insight', type: 'spell', desc: 'Compre 2 cartas', cost: 7 },
    { name: 'Totem do Olho Antigo', type: 'totem', desc: '+1/+1 a 1–3 unidades', cost: 13 }
  ]}
};

const NEUTRAL = [
  { name: 'Aldeão Valente', type: 'unit', atk: 1, hp: 2, cost: 5 },
  { name: 'Afiar Lâminas', type: 'spell', desc: '+1 ATK', cost: 5 },
  { name: 'Totem do Carvalho', type: 'totem', desc: '+1 HP', cost: 9 }
];

const PLAYER_ID = (() => {
  try {
    let id = localStorage.getItem('playerId');
    if (!id) {
      id = Math.random().toString(36).slice(2);
      localStorage.setItem('playerId', id);
    }
    return id;
  } catch (_) {
    return 'anon';
  }
})();

let shopState = { faction: '', gold: 0, onClose: null, unlimited: false, purchased: [], pending: [] };
let rerolled = false;

function showShopMsg(msg){
  const el = $('#shopMsg');
  if(!el) return;
  el.textContent = msg;
  clearTimeout(showShopMsg._t);
  showShopMsg._t = setTimeout(() => { el.textContent = ''; }, 2000);
}

const shuffle = arr => arr.sort(() => Math.random() - 0.5);

const slug = str => str.toLowerCase().replace(/[^a-z0-9]+/g,'-');
// Do not force non-existent images; let card renderer pick deck placeholders/emoji
function withImg(it){ return it; }

function genShopOffers(){
  // produce up to 12 offers, preferring faction pool when available
  const maxOffers = 12;
  const factionPool = (shopState.faction && FACTIONS[shopState.faction]) ? FACTIONS[shopState.faction].pool.slice() : [];
  const neutralPool = NEUTRAL.slice();
  let pool = [];
  if(factionPool.length){
    pool = pool.concat(shuffle(factionPool).slice(0, Math.ceil(maxOffers/2)));
  }
  const otherCandidates = shuffle([].concat(neutralPool, ...Object.values(FACTIONS).map(f=>f.pool)));
  for(const it of otherCandidates){ if(pool.length>=maxOffers) break; if(!pool.includes(it)) pool.push(it); }
  if(pool.length < 6){ pool = pool.concat(otherCandidates.slice(0, 6 - pool.length)); }
  const offers = pool.slice(0, maxOffers).map(it => {
    const base = Object.assign({}, it);
    // if player deck choice exists, hint renderer to prefer that deck for art
    if(window && window.G && window.G.playerDeckChoice && !base.deck){ base.deck = window.G.playerDeckChoice; }
    return withImg(base);
  });
  // add a consumable if there's room
  if(offers.length < maxOffers) offers.push(withImg({ name: 'Elixir de Força', type: 'buff', desc: '+1 ATK a suas unidades neste round', cost: 7 }));
  return offers.slice(0, maxOffers);
}

function renderShop(){
  const wrap = $('#shopChoices');
  if(!wrap) return;
  wrap.innerHTML = '';
  genShopOffers().forEach(it => {
    const card = document.createElement('div');
    card.className = 'shop-card';

    if(['unit','spell','totem'].includes(it.type) && window.cardNode){
      // normalize data for cardNode: prefer deck/icon or img
      const nodeData = Object.assign({}, it);
      // clear img if present to avoid 404s; let game.js choose a safe deck placeholder
      if(nodeData.img) delete nodeData.img;
      if(!nodeData.deck && window && window.G && window.G.playerDeckChoice) nodeData.deck = window.G.playerDeckChoice;
      const node = window.cardNode(nodeData,'player');
      node.classList.add('shop-preview');
      card.appendChild(node);
    }else{
      const p = document.createElement('div');
      p.className = 'shop-placeholder';
      p.textContent = it.name;
      card.appendChild(p);
    }

    const btn = document.createElement('button');
    btn.className = 'btn price-btn';
  btn.innerHTML = `${it.cost}<img src="img/ui/coin.png" class="coin-icon" alt="moeda">`;
    btn.onclick = () => {
      if(shopState.gold < it.cost){ showShopMsg('Sem ouro.'); return; }
      btn.disabled = true;
      const currentGold = shopState.gold;
      const req = fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: PLAYER_ID,
          itemId: slug(it.name),
          cost: it.cost,
          gold: currentGold,
        })
      })
      .then(r => r.json())
      .then(data => {
        if(data && typeof data.gold === 'number'){
          shopState.gold = data.gold;
          $('#shopGold').textContent = shopState.gold;
          btn.textContent = '✔';
          shopState.purchased.push(it);
        } else {
          throw new Error('Resposta inválida');
        }
      })
      .catch(err => {
        console.error('purchase error', err);
        showShopMsg('Erro ao registrar compra');
        btn.disabled = false;
      });
      shopState.pending.push(req);
    };
    card.appendChild(btn);
    wrap.appendChild(card);
  });
}

function openShop({ faction, gold, onClose, unlimited=false }){
  const map = { vikings:'Furioso', animais:'Furioso', pescadores:'Sombras', floresta:'Percepcao', convergentes:'Percepcao' };
  shopState.faction = map[faction] || faction || 'Furioso';
  shopState.gold = gold;
  shopState.onClose = onClose;
  shopState.unlimited = unlimited;
  shopState.purchased = [];
  shopState.pending = [];
  rerolled = false;
  $('#btnReroll').disabled = false;
  $('#shopGold').textContent = shopState.gold;
  $('#shopMsg').textContent = '';
  renderShop();
  // ensure the close button is enabled and clickable
  const closeBtn = document.getElementById('closeShop');
  if(closeBtn){ closeBtn.disabled = false; }
  const modal = document.getElementById('shopModal');
  if(modal){
    modal.style.display = 'grid';
  }
}

function closeShop(){
  const modal = document.getElementById('shopModal');
  if(modal){
    modal.classList.remove('show');
    modal.style.display = 'none';
  }
  if(shopState.onClose) shopState.onClose(shopState);
}

window.openShop = openShop;

const shopModal = document.getElementById('shopModal');
shopModal?.addEventListener('click', ev => {
  const box = shopModal.querySelector('.box');
  if(!box) return;
  if(ev.target === shopModal || ev.target.id === 'closeShop'){
    closeShop();
  }
});

document.getElementById('btnReroll')?.addEventListener('click', () => {
  if(!shopState.unlimited && rerolled){ showShopMsg('Sem re-rolagens.'); return; }
  rerolled = true;
  if(!shopState.unlimited) document.getElementById('btnReroll').disabled = true;
  renderShop();
});
document.getElementById('closeShop')?.addEventListener('click', closeShop);
