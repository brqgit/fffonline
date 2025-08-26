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

let shopState = { faction: '', gold: 0, onClose: null };

function genShopOffers(){
  const pool = [...FACTIONS[shopState.faction].pool, ...NEUTRAL];
  const offers = [];
  for(let i=0;i<6;i++){
    offers.push({ ...pool[Math.floor(Math.random()*pool.length)] });
  }
  offers.push({ name: 'Elixir de Força', type: 'buff', desc: '+1 ATK a suas unidades neste round', cost: 7 });
  return offers;
}

function renderShop(){
  const wrap = $('#shopChoices');
  if(!wrap) return;
  wrap.innerHTML = '';
  genShopOffers().forEach(it => {
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.innerHTML = `<h4>${it.name}</h4>`;
    if(it.atk !== undefined) card.innerHTML += `<div>⚔ ${it.atk} ❤ ${it.hp}</div>`;
    if(it.desc) card.innerHTML += `<div class="sub">${it.desc}</div>`;
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = `Comprar (${it.cost}⦿)`;
    btn.onclick = () => {
      if(shopState.gold < it.cost){ alert('Sem ouro.'); return; }
      shopState.gold -= it.cost;
      $('#shopGold').textContent = shopState.gold;
      btn.disabled = true;
      btn.textContent = 'Comprado';
    };
    card.appendChild(btn);
    wrap.appendChild(card);
  });
}

function openShop({ faction, gold, onClose }){
  const map = { vikings:'Furioso', animais:'Furioso', pescadores:'Sombras', floresta:'Percepcao', convergentes:'Percepcao' };
  shopState.faction = map[faction] || faction || 'Furioso';
  shopState.gold = gold;
  shopState.onClose = onClose;
  $('#shopGold').textContent = shopState.gold;
  renderShop();
  $('#shopModal').style.display = 'grid';
}

function closeShop(){
  $('#shopModal').style.display = 'none';
  if(shopState.onClose) shopState.onClose(shopState);
}

window.openShop = openShop;

document.getElementById('btnReroll')?.addEventListener('click', renderShop);
document.getElementById('closeShop')?.addEventListener('click', closeShop);
