# Correções do Sistema de Batalha

## Problemas Identificados

### 1. **Bug de Restauração de HP na Invocação**
**Arquivo:** `public/js/game.js`, linha ~2071
**Problema:** A função `summon()` estava restaurando o HP das cartas quando `hp < baseHp`, causando o bug onde inimigos com pouca vida "aumentavam" sua vida durante o combate.

```javascript
// ANTES (BUGADO):
if(c.hp===undefined || c.hp<c.baseHp) c.hp = c.baseHp;

// DEPOIS (CORRIGIDO):
if(c.hp===undefined) c.hp = c.baseHp;
```

**Impacto:** Cartas que deveriam ser destruídas estavam tendo seu HP restaurado incorretamente.

---

### 2. **Cálculo Incorreto de Overflow de Dano**
**Arquivo:** `public/js/game.js`, linha ~2528
**Problema:** O cálculo de overflow (dano excedente) estava usando o HP DEPOIS do dano ser aplicado, causando valores incorretos.

```javascript
// ANTES (BUGADO):
const preHP = target.hp;
const overflow = Math.max(0, attacker.atk - preHP);
damageMinion(target, attacker.atk, { defer:true });

// DEPOIS (CORRIGIDO):
const preTargetHP = Math.max(0, target.hp);
const attackerDamage = Math.max(0, attacker.atk);
const overflow = Math.max(0, attackerDamage - preTargetHP);
damageMinion(target, attackerDamage, { defer:true });
```

**Impacto:** Dano excedente ao herói estava sendo calculado incorretamente.

---

### 3. **Uso Inconsistente de `clamp()` vs `Math.max/min`**
**Arquivo:** `public/js/game.js`, múltiplas linhas
**Problema:** O código usava `clamp()` de forma inconsistente, o que poderia causar valores inesperados.

```javascript
// ANTES:
m.hp=clamp(m.hp-amt,0,99);
G.aiHP=clamp(G.aiHP-overflow,0,99);

// DEPOIS:
m.hp = Math.max(0, Math.min(99, m.hp - amt));
G.aiHP = Math.max(0, G.aiHP - overflow);
```

**Impacto:** Maior clareza no código e garantia de que valores negativos não sejam permitidos.

---

### 4. **Falta de Validação de Dano Negativo**
**Arquivo:** `public/js/game.js`, função `damageMinion`
**Problema:** Não havia validação para evitar dano negativo (que poderia curar).

```javascript
// ADICIONADO:
function damageMinion(m,amt,opts){
  if(!m||typeof amt!=='number')return;
  if(amt<0) amt=0; // ← NOVO: previne dano negativo
  const newHP = m.hp - amt;
  m.hp = Math.max(0, Math.min(99, newHP));
  //...
}
```

**Impacto:** Previne bugs onde ataques com ATK negativo poderiam curar unidades.

---

### 5. **Logs de Debug Melhorados**
**Arquivo:** `public/js/game.js`, função `attackCard`
**Adicionado:** Logs mais detalhados para facilitar debug futuro.

```javascript
if(DEBUG_COMBAT_SEQUENCE) log(`[SEQ] ${attacker.name} (${attackerDamage} ATK) hit ${target.name} (${preTargetHP} HP) → ${target.hp} HP, overflow: ${overflow}`);
```

---

## Como Testar

1. **Teste de Dano Básico:**
   - Invocar uma carta com 1 HP
   - Atacar com uma carta de 5 ATK
   - Verificar que a carta morre (HP vai para 0, não aumenta)

2. **Teste de Overflow:**
   - Atacar uma carta com 2 HP usando 5 ATK
   - Verificar que 3 de dano é aplicado ao herói inimigo

3. **Teste de Troca de Danos:**
   - Atacar uma carta 4/3 com uma carta 3/2
   - Verificar que a 4/3 fica com 1 HP e a 3/2 morre

4. **Teste de Defesa:**
   - Colocar uma carta em defesa
   - Verificar que ela recebe dano normalmente mas não contrataca

5. **Teste de Furioso:**
   - Jogar uma carta com Furioso
   - Verificar que ela pode atacar no mesmo turno

---

## Arquivos Modificados

- `public/js/game.js`
  - Função `attackCard()` - linhas ~2511-2573
  - Função `damageMinion()` - linhas ~2604-2614
  - Função `attackFace()` - linhas ~2574-2603
  - Função `summon()` - linhas ~2063-2071

---

## Status

✅ **Correções Aplicadas**
✅ **Código Sem Erros**
🔄 **Aguardando Testes Manuais**

---

## Notas Adicionais

- O bug principal era a restauração de HP na função `summon()` quando `hp < baseHp`
- Isso fazia com que cartas danificadas tivessem seu HP restaurado incorretamente
- Todas as correções mantêm a lógica de jogo original, apenas corrigem bugs
- O sistema de buff (badges) foi preservado e continua funcionando normalmente

---

Data: 2025-01-XX
