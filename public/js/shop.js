const $ = sel => document.querySelector(sel);

const FACTIONS = {
  Furioso: { pool: [
    { name: 'Ceifeira Ágil', type: 'unit', atk: 3, hp: 2, cost: 9, rarity: 'common' },
    { name: 'Grito de Guerra', type: 'spell', desc: '+1 ATK a uma unidade', cost: 6, rarity: 'common' },
    { name: 'Totem da Fúria', type: 'totem', desc: '+1 ATK a 1–3 unidades', cost: 12, rarity: 'rare' }
  ]},
  Sombras: { pool: [
    { name: 'Sombras Encapuçado', type: 'unit', atk: 3, hp: 5, cost: 10, rarity: 'common' },
    { name: 'Dreno Sombrio', type: 'spell', desc: 'Drena 2 de HP', cost: 7, rarity: 'common' },
    { name: 'Totem da Lua Nova', type: 'totem', desc: '+1 HP a 1–3 unidades', cost: 11, rarity: 'rare' }
  ]},
  Percepcao: { pool: [
    { name: 'Guardião do Bosque', type: 'unit', atk: 2, hp: 4, cost: 8, rarity: 'common' },
    { name: 'Insight', type: 'spell', desc: 'Compre 2 cartas', cost: 7, rarity: 'common' },
    { name: 'Totem do Olho Antigo', type: 'totem', desc: '+1/+1 a 1–3 unidades', cost: 13, rarity: 'rare' }
  ]}
};

const NEUTRAL = [
  { name: 'Aldeão Valente', type: 'unit', atk: 1, hp: 2, cost: 5, rarity: 'common' },
  { name: 'Afiar Lâminas', type: 'spell', desc: '+1 ATK', cost: 5, rarity: 'common' },
  { name: 'Totem do Carvalho', type: 'totem', desc: '+1 HP', cost: 9, rarity: 'rare' }
];

function getPlayerId(){
  if(window && window.PLAYER_ID) return window.PLAYER_ID;
  const fallback = window.crypto && window.crypto.randomUUID
    ? window.crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);
  if(window) window.PLAYER_ID = fallback;
  return fallback;
}

let shopState = { faction: '', gold: 0, onClose: null, unlimited: false, purchased: [] };
let rerollCount = 0;

function showShopMsg(msg){
  const el = $('#shopMsg');
  if(!el) return;
  el.textContent = msg;
  clearTimeout(showShopMsg._t);
  showShopMsg._t = setTimeout(() => { el.textContent = ''; }, 2000);
}
function fisherYatesShuffle(arr){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// alias to maintain existing shuffle calls
function shuffle(arr){
  return fisherYatesShuffle(arr);
}

const slug = str => str.toLowerCase().replace(/[^a-z0-9]+/g,'-');
const DEFAULT_CARD_MEDIA = {
  "Camponês Vigilante": { deck: 'vikings', img: '/img/decks/farm-vikings/characters/1_Guerreiro_Loiro.png' },
  "Herbalista do Vilarejo": { deck: 'vikings', img: '/img/decks/farm-vikings/characters/2_Guerreiro_Esqueleto.png' },
  "Batedor da Aldeia": { deck: 'vikings', img: '/img/decks/farm-vikings/characters/3_Guerreiro_Rubro.png' },
  "Ancião do Trigo": { deck: 'vikings', img: '/img/decks/farm-vikings/characters/4_Mago_Elder.png' },
  "Patriarca da Fazenda": { deck: 'vikings', img: '/img/decks/farm-vikings/characters/5_Raider_Mascara.png' },
  "Rastreador do Fiorde": { deck: 'vikings', img: '/img/decks/farm-vikings/characters/6_Guerreiro_Machado.png' },
  "Ceifeira Ágil": { deck: 'vikings', img: '/img/decks/farm-vikings/characters/7_Sombras_Encapuzado.png' },
  "Defensor do Arado": { deck: 'vikings', img: '/img/decks/farm-vikings/characters/8_Guerreiro_Espada.png' },
  "Runomante Rural": { deck: 'vikings', img: '/img/decks/farm-vikings/characters/9_Raider_Mascara_Sombra.png' },
  "Guerreiro da Foice": { deck: 'vikings', img: '/img/decks/farm-vikings/characters/10_Mago_Elder_Sombra.png' },
  "Guardiã do Celeiro": { deck: 'vikings', img: '/img/decks/farm-vikings/characters/1_Guerreiro_Loiro.png' },
  "Senhor do Campo": { deck: 'vikings', img: '/img/decks/farm-vikings/characters/2_Guerreiro_Esqueleto.png' },
  "Lobo Alfa": { deck: 'animais', img: '/img/decks/north-beasts/characters/alce-bravo.png' },
  "Lince Ártico": { deck: 'animais', img: '/img/decks/north-beasts/characters/coelho-escudeiro.png' },
  "Falcão das Montanhas": { deck: 'animais', img: '/img/decks/north-beasts/characters/coruja-ancia.png' },
  "Caribu Selvagem": { deck: 'animais', img: '/img/decks/north-beasts/characters/coruja-sabia.png' },
  "Texugo Ártico": { deck: 'animais', img: '/img/decks/north-beasts/characters/esquilo-viking.png' },
  "Foca do Gelo": { deck: 'animais', img: '/img/decks/north-beasts/characters/guerreiro-cervo.png' },
  "Lobo Uivante": { deck: 'animais', img: '/img/decks/north-beasts/characters/morcego-noturno.png' },
  "Raposa Escarlate": { deck: 'animais', img: '/img/decks/north-beasts/characters/raposa-espadachim.png' },
  "Touro das Neves": { deck: 'animais', img: '/img/decks/north-beasts/characters/urso-guardiao.png' },
  "Corvo Astuto": { deck: 'animais', img: '/img/decks/north-beasts/characters/alce-bravo.png' },
  "Fera das Cavernas": { deck: 'animais', img: '/img/decks/north-beasts/characters/coelho-escudeiro.png' },
  "Curandeiro do Mar": { deck: 'pescadores', img: '/img/decks/fJord-fishers/characters/1_Fogueira_Viking.png' },
  "Bardo do Porto": { deck: 'pescadores', img: '/img/decks/fJord-fishers/characters/2_Mistico_Encapuzado.png' },
  "Caçador de Tesouros": { deck: 'pescadores', img: '/img/decks/fJord-fishers/characters/3_Drakkar.png' },
  "Escudeiro do Convés": { deck: 'pescadores', img: '/img/decks/fJord-fishers/characters/4_Guerreiro_do_Escudo.png' },
  "Guarda do Cais": { deck: 'pescadores', img: '/img/decks/fJord-fishers/characters/5_Estandarte_do_Cla.png' },
  "Aprendiz de Rede": { deck: 'pescadores', img: '/img/decks/fJord-fishers/characters/6_Guerreiro_das_Runas.png' },
  "Baleeiro Leal": { deck: 'pescadores', img: '/img/decks/fJord-fishers/characters/7_Guardiao_do_Machado.png' },
  "Atirador do Convés": { deck: 'pescadores', img: '/img/decks/fJord-fishers/characters/8_Batalhador_Duplo.png' },
  "Sacerdote das Ondas": { deck: 'pescadores', img: '/img/decks/fJord-fishers/characters/9_Navegador.png' },
  "Corsário Intrépido": { deck: 'pescadores', img: '/img/decks/fJord-fishers/characters/10_Batalhador.png' },
  "Patrulheiro Náutico": { deck: 'pescadores', img: '/img/decks/fJord-fishers/characters/1_Fogueira_Viking.png' },
  "Almirante do Fiorde": { deck: 'pescadores', img: '/img/decks/fJord-fishers/characters/2_Mistico_Encapuzado.png' },
  "Lince da Sombra": { deck: 'floresta', img: '/img/decks/forest-beasts/characters/Alce_Espiritual.png' },
  "Corvo Observador": { deck: 'floresta', img: '/img/decks/forest-beasts/characters/Coruja_Guardiao.png' },
  "Guardião Musgoso": { deck: 'floresta', img: '/img/decks/forest-beasts/characters/Coruja_Runica.png' },
  "Cervo Rúnico": { deck: 'floresta', img: '/img/decks/forest-beasts/characters/Corvo_de_Odin.png' },
  "Javali Voraz": { deck: 'floresta', img: '/img/decks/forest-beasts/characters/Fogueira_Sagrada.png' },
  "Lebre da Névoa": { deck: 'floresta', img: '/img/decks/forest-beasts/characters/Bode_Sagrado.png' },
  "Guardião da Clareira": { deck: 'floresta', img: '/img/decks/forest-beasts/characters/Esquilo_Ratatoskr.png' },
  "Raposa Sombria": { deck: 'floresta', img: '/img/decks/forest-beasts/characters/Lobo_Fenrir.png' },
  "Urso Musgoso": { deck: 'floresta', img: '/img/decks/forest-beasts/characters/Serpente_Jormungandr.png' },
  "Coruja Mensageira": { deck: 'floresta', img: '/img/decks/forest-beasts/characters/Alce_Espiritual.png' },
  "Cervo das Runas": { deck: 'floresta', img: '/img/decks/forest-beasts/characters/Coruja_Guardiao.png' },
  "Javali Espinhoso": { deck: 'floresta', img: '/img/decks/forest-beasts/characters/Coruja_Runica.png' },
};
const CARD_MEDIA_MAP = (typeof window !== 'undefined' && window.CARD_MEDIA)
  ? window.CARD_MEDIA
  : DEFAULT_CARD_MEDIA;
function withImg(it){
  const media = CARD_MEDIA_MAP[it.name];
  if(media){
    if(media.deck) it.deck = media.deck;
    if(media.img) it.img = media.img;
  }
  return it;
}

// --- tooltip ---
const tooltip = (() => {
  const el = document.createElement('div');
  el.id = 'shopTooltip';
  el.style.position = 'absolute';
  el.style.display = 'none';
  el.style.background = 'rgba(0,0,0,0.85)';
  el.style.color = '#fff';
  el.style.padding = '6px';
  el.style.borderRadius = '4px';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '1000';
  document.body.appendChild(el);
  function hide(){ el.style.display = 'none'; }
  function show(data, target){
    if(!target) return;
    const parts = [];
    if(data.desc) parts.push(`<div>${data.desc}</div>`);
    if(typeof data.atk === 'number' && typeof data.hp === 'number'){
      parts.push(`<div>ATK/HP: ${data.atk}/${data.hp}</div>`);
    }
    if(data.faction){ parts.push(`<div>Sinergia: ${data.faction}</div>`); }
    const inDeck = window && window.G && Array.isArray(window.G.playerDeck)
      && window.G.playerDeck.some(c => c.name === data.name);
    if(inDeck) parts.push('<div style="color: #ffd700;">Já no deck</div>');
    el.innerHTML = parts.join('');
    el.style.display = 'block';
    const r = target.getBoundingClientRect();
    el.style.left = (r.right + 6 + window.scrollX) + 'px';
    el.style.top = (r.top + window.scrollY) + 'px';
  }
  document.addEventListener('click', hide);
  return { show, hide };
})();

function genShopOffers(){
  // produce up to 12 offers, preferring faction pool when available
  const maxOffers = 12;
  const factionPool = (shopState.faction && FACTIONS[shopState.faction])
    ? FACTIONS[shopState.faction].pool.map(c => Object.assign({ faction: shopState.faction }, c))
    : [];
  const neutralPool = NEUTRAL.map(c => Object.assign({ faction: 'Neutro' }, c));
  let pool = [];
  if(factionPool.length){
    pool = pool.concat(shuffle(factionPool).slice(0, Math.ceil(maxOffers/2)));
  }
  const allPools = Object.entries(FACTIONS).flatMap(([fac, obj]) =>
    obj.pool.map(c => Object.assign({ faction: fac }, c))
  );
  const otherCandidates = shuffle([].concat(neutralPool, allPools));
  for(const it of otherCandidates){
    if(pool.length>=maxOffers) break;
    if(!pool.some(p => p.name === it.name)) pool.push(it);
  }
  if(pool.length < 6){
    for(const cand of otherCandidates){
      if(pool.length >= 6) break;
      if(!pool.some(p => p.name === cand.name)) pool.push(cand);
    }
  }
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
  tooltip.hide();
  genShopOffers().forEach(it => {
    const card = document.createElement('div');
    card.className = 'shop-card';

    if(['unit','spell','totem'].includes(it.type) && window.cardNode){
      // normalize data for cardNode: prefer deck/icon or img
      const nodeData = Object.assign({}, it);
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
  btn.innerHTML = `${it.cost}<span class="coin-icon"></span>`;
    btn.onclick = () => {
      if(shopState.gold < it.cost){ showShopMsg('Sem ouro.'); return; }
      btn.disabled = true;
      const currentGold = shopState.gold;
      const req = fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: getPlayerId(),
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

    card.addEventListener('mouseenter', () => tooltip.show(it, card));
    card.addEventListener('mouseleave', () => tooltip.hide());
    card.addEventListener('click', ev => { ev.stopPropagation(); tooltip.show(it, card); });

    wrap.appendChild(card);
  });
}

function updateRerollBtn(){
  const btn = document.getElementById('btnReroll');
  if(!btn) return;
  const cost = 5 * (rerollCount + 1);
  if(!shopState.unlimited){
    const remaining = Math.max(0, 1 - rerollCount);
    if(remaining <= 0){
      btn.disabled = true;
      btn.innerHTML = 'Re-rolar (0 restantes)';
      return;
    }
    btn.disabled = false;
    btn.innerHTML = `Re-rolar (${cost}<span class="coin-icon"></span>, ${remaining} restantes)`;
  }else{
    btn.disabled = false;
    btn.innerHTML = `Re-rolar (${cost}<span class="coin-icon"></span>)`;
  }
}

function openShop({ faction, gold, onClose, unlimited=false }){

  const map = { vikings:'Furioso', animais:'Furioso', pescadores:'Sombras', floresta:'Percepcao', convergentes:'Percepcao' };
  shopState.faction = map[faction] || faction || 'Furioso';
  shopState.gold = gold;
  shopState.onClose = onClose;
  shopState.unlimited = unlimited;
  shopState.purchased = [];
  shopState.pending = [];
  rerollCount = 0;
  updateRerollBtn();
  $('#shopGold').textContent = shopState.gold;
  $('#shopMsg').textContent = '';
  renderShop();
  // ensure the close button is enabled and clickable
  const closeBtn = document.getElementById('closeShop');
  if(closeBtn){ closeBtn.disabled = false; }
  const modal = document.getElementById('shopModal');
  if(modal){
    modal.classList.add('show');
    modal.style.display = 'grid';
  }
}

function closeShop(){
  const modal = document.getElementById('shopModal');
  if(modal){
    modal.classList.remove('show');
    modal.style.display = 'none';
  }
  tooltip.hide();
  // reset any in-flight purchase tracking on close
  shopState.pending = [];
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
  const cost = 5 * (rerollCount + 1);
  if(!shopState.unlimited && rerollCount >= 1){ showShopMsg('Sem re-rolagens.'); return; }
  if(shopState.gold < cost){ showShopMsg('Sem ouro.'); return; }
  shopState.gold -= cost;
  $('#shopGold').textContent = shopState.gold;
  rerollCount++;
  renderShop();
  updateRerollBtn();
});
document.getElementById('closeShop')?.addEventListener('click', closeShop);
