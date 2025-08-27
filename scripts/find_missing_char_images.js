const fs = require('fs');
const path = require('path');

function walk(dir){
  let results=[];
  const list = fs.readdirSync(dir,{withFileTypes:true});
  for(const ent of list){
    const p = path.join(dir, ent.name);
    if(ent.isDirectory()) results = results.concat(walk(p));
    else results.push(p);
  }
  return results;
}

function readJSNames(root){
  const files = walk(root).filter(f=>f.endsWith('.js'));
  const names = new Set();
  const re = /name:\s*['"]([^'"]+)['"]/g;
  for(const f of files){
    try{
      const txt = fs.readFileSync(f,'utf8');
      let m;
      while((m=re.exec(txt))){
        names.add(m[1].trim());
      }
    }catch(e){ /* ignore */ }
  }
  return Array.from(names).sort();
}

function listCharacterFiles(deckRoot){
  const chars = [];
  const decks = fs.readdirSync(deckRoot,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name);
  for(const d of decks){
    const charDir = path.join(deckRoot,d,'characters');
    if(!fs.existsSync(charDir)) continue;
    const files = fs.readdirSync(charDir,{withFileTypes:true}).filter(f=>f.isFile()).map(f=>f.name);
    for(const fn of files) chars.push({deck:d,file:fn});
  }
  return chars;
}

function normalize(s){
  if(!s) return '';
  return s.normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replace(/[^a-zA-Z0-9]+/g,'_')
    .replace(/^_+|_+$/g,'')
    .toLowerCase();
}

const repoRoot = path.resolve(__dirname, '..');
const jsRoot = path.join(repoRoot, 'public','js');
const decksRoot = path.join(repoRoot, 'public','img','decks');

const cardNames = readJSNames(jsRoot);
const charFiles = listCharacterFiles(decksRoot);
const normCharNames = charFiles.map(c=>({deck:c.deck, file:c.file, norm: normalize(path.parse(c.file).name)}));

const missing = [];
for(const cn of cardNames){
  const n = normalize(cn);
  // split tokens and require at least one token to match in filename (conservative)
  const tokens = n.split('_').filter(Boolean);
  const found = normCharNames.some(cf => {
    // if normalized name is substring
    if(cf.norm.includes(n)) return true;
    // require all tokens present
    return tokens.every(t=> cf.norm.includes(t));
  });
  if(!found) missing.push(cn);
}

console.log('TOTAL_CARD_NAMES_FOUND:', cardNames.length);
console.log('TOTAL_CHARACTER_FILES:', normCharNames.length);
console.log('MISSING IMAGES:', missing.length);
for(const m of missing) console.log(m);

// also write JSON for easy reuse
fs.writeFileSync(path.join(repoRoot,'scripts','missing_char_images.json'), JSON.stringify({cardCount:cardNames.length, charFiles: normCharNames, missing},null,2));
console.log('\nWritten scripts/missing_char_images.json');
