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
let rerolled = false;

const slug = str => str.toLowerCase().replace(/[^a-z0-9]+/g,'-');
function withImg(it){
  if(['unit','spell','totem'].includes(it.type)){
    return { ...it, img:`/img/cards/${slug(it.name)}.png` };
  }
  return it;
}

function genShopOffers(){
  const pool = [...FACTIONS[shopState.faction].pool, ...NEUTRAL];
  const offers = [];
  for(let i=0;i<6;i++){
    offers.push(withImg({ ...pool[Math.floor(Math.random()*pool.length)] }));
  }
  offers.push(withImg({ name: 'Elixir de Força', type: 'buff', desc: '+1 ATK a suas unidades neste round', cost: 7 }));
  return offers;
}

function renderShop(){
  const wrap = $('#shopChoices');
  if(!wrap) return;
  wrap.innerHTML = '';
  genShopOffers().forEach(it => {
    const card = document.createElement('div');
    card.className = 'shop-card';

    const imgWrap = document.createElement('div');
    imgWrap.className = 'shop-item-img';
    if(it.img){
      const img = document.createElement('img');
      img.src = it.img;
      img.alt = it.name;
      imgWrap.appendChild(img);
      card.appendChild(imgWrap);
      const h4 = document.createElement('h4');
      h4.textContent = it.name;
      card.appendChild(h4);
      if(it.atk !== undefined){
        const stats = document.createElement('div');
        stats.textContent = `⚔ ${it.atk} ❤ ${it.hp}`;
        card.appendChild(stats);
      }
      if(it.desc){
        const sub = document.createElement('div');
        sub.className = 'sub';
        sub.textContent = it.desc;
        card.appendChild(sub);
      }
    }else{
      imgWrap.classList.add('placeholder');
      imgWrap.innerHTML = `<div class="name">${it.name}</div><div class="desc">${it.desc||''}</div>`;
      card.appendChild(imgWrap);
    }

    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.innerHTML = `Comprar (${it.cost}<img src="/img/ui/coin.png" class="coin-icon" alt="moeda">)`;
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
  rerolled = false;
  $('#btnReroll').disabled = false;

  $('#shopGold').textContent = shopState.gold;
  renderShop();
  $('#shopModal').style.display = 'grid';
}

function closeShop(){
  $('#shopModal').style.display = 'none';
  if(shopState.onClose) shopState.onClose(shopState);
}

window.openShop = openShop;

document.getElementById('btnReroll')?.addEventListener('click', () => {
  if(rerolled){ alert('Sem re-rolagens.'); return; }
  rerolled = true;
  document.getElementById('btnReroll').disabled = true;
  renderShop();
});

document.getElementById('closeShop')?.addEventListener('click', closeShop);
