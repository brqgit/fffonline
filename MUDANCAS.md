# Mudanças Implementadas

## ✅ Bugs Críticos Corrigidos

### 1. Victory Modal
- **Problema**: Botão "Continuar" desnecessário, erro ARIA
- **Solução**: Modal auto-avança após 2s com fade, aplica `setAriaHidden` corretamente

### 2. Sistema de Remoção de Cartas
- **Problema**: Modal não abria, erro "Sistema de remoção indisponível"
- **Solução**: Corrigida função `showCardRemoval` para mostrar `G.playerDeck` atual completo
- **Código**: Remove carta de todas as zonas (deck, mão, mesa, descarte)

### 3. Erro ARIA nos Modais
- **Problema**: "Blocked aria-hidden" em victoryModal e testModal
- **Solução**: Aplicado `setAriaHidden` com blur + inert em `menu.js` e `game.js`

### 4. Frequência de Eventos
- **Problema**: Eventos aparecendo a cada 2 rounds (muito frequente)
- **Solução**: Alterado para a cada 4 rounds e apenas após round 2

### 5. Socket.io 404 no Live Server
- **Problema**: Tentava carregar socket.io em portas 5500-5502
- **Solução**: Detecta Live Server e pula carregamento

## 🔧 Melhorias Pendentes (Próximos Passos)

### Alta Prioridade
1. **Nova Carta (Deck Inimigo)**: Implementar recompensa que adiciona carta aleatória do deck derrotado
2. **Balanceamento de Mana**: Reduzir custos absurdos (ex: Totem 13→6 mana)
3. **UI de Mana**: Cards com >10 mana devem empilhar dots em 2 linhas
4. **Descrições de Totem**: Substituir "Bônus a aliados" por descrição específica

### Média Prioridade
5. **Animações de Transição**: Adicionar fade/slide entre modais e eventos
6. **Feedback Visual em Eventos**: 
   - Tomar dano → animação de shake + particulas vermelhas
   - Ganhar vida → particulas verdes + pulse
   - Ganhar item → brilho dourado
7. **Responsividade**: Ajustar zoom/escala para cartas não cortarem

### Baixa Prioridade
8. **Balancear Recompensas**: "Buff permanente" muito forte, tornar raro
9. **Centralizar Cartas**: Ajustar posicionamento no tabuleiro

## 📝 Notas Técnicas

- `window.storyTestMode`: Flag para ativar botão de vitória instantânea
- `window.silentArtPlaceholders`: Usar SVG placeholder ao invés de tentar carregar imagens
- Eventos usam `G.story.eventsSeen[]` para não repetir
- Relíquias em `G.story.relics[]` com efeitos passivos

## 🐛 Bugs Conhecidos
- "click handler took 1418ms": Performance warning normal em operações pesadas (não crítico)
- Algumas cartas ainda tentam carregar art (404s) - placeholder SVG ativo resolve isso
