# Modo de Teste - Story Mode

## Como Ativar o Botão de Vitória Instantânea

Para testar o modo história sem precisar derrotar inimigos manualmente, você pode ativar o **modo de teste** que habilita o botão "⚡ Vitória Instantânea".

### Passos:

1. **Abra o Console do Navegador** (F12)

2. **Digite o seguinte comando:**
   ```javascript
   window.storyTestMode = true
   ```

3. **Inicie uma partida no Modo História**

4. **O botão "⚡ Vitória Instantânea" aparecerá** ao lado do botão "Encerrar turno"

5. **Clique no botão** para derrotar instantaneamente o inimigo e avançar para o próximo encontro

### Como Desativar:

```javascript
window.storyTestMode = false
```

Ou simplesmente recarregue a página (F5).

## Outras Funcionalidades de Teste

### Ver Estado Atual do Jogo:
```javascript
console.log(G.story)
```

### Adicionar Ouro:
```javascript
G.story.gold += 100
```

### Ver Relíquias Ativas:
```javascript
console.log(G.story.relics)
```

### Forçar Evento na Próxima Rodada:
```javascript
G.story.round = 1 // Eventos aparecem a cada 2 rounds
```

### Adicionar Relíquia Manualmente:
```javascript
G.story.addRelic('martelo-thor') // ou outro ID de relíquia
updateRelicsDisplay()
```

## Lista de IDs de Relíquias

- `bencao-freyja` - Cura 3 HP no início do combate
- `escudo-aegir` - Imune a dano facial por 1 turno
- `amuleto-odin` - +1 carta por turno
- `coroa-jarl` - Buff em todas as suas unidades
- `martelo-thor` - Todas unidades ganham +2/+2
- `lanca-gungnir` - Causa 8 de dano ao inimigo
- E mais...

(Veja o código em `game.js` para lista completa de relíquias e seus IDs)
