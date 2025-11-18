# Particle Effects System

Sistema de efeitos animados com frames PNG sequenciais.

## 📂 Estrutura de Arquivos

```
effects/
├── Fire Arrow/
│   ├── PNG/
│   │   ├── Fire Arrow_Frame_01.png
│   │   ├── Fire Arrow_Frame_02.png
│   │   └── ... (8 frames)
│   └── Fire Arrow Preview.gif
├── Fire Ball/
│   ├── PNG/ (8 frames)
├── Fire Spell/
│   ├── PNG/ (8 frames)
├── Water Arrow/
│   ├── PNG/ (8 frames)
├── Water Ball/
│   ├── PNG/ (12 frames)
├── Water Spell/
│   ├── PNG/ (8 frames)
└── Icons/
    └── PNG/
        ├── Icons_Fire Arrow.png
        ├── Icons_Fire Ball.png
        └── ...
```

## 🎮 Efeitos Disponíveis

### Fogo (Fire)
- **fire-arrow** - Ataque físico direto (8 frames, 24 fps)
- **fire-ball** - Explosão/morte de criaturas (8 frames, 20 fps)
- **fire-spell** - Magias e buffs de fogo (8 frames, 22 fps)

### Água (Water)
- **water-arrow** - Ataque aquático (8 frames, 24 fps)
- **water-ball** - Cura e regeneração (12 frames, 24 fps)
- **water-spell** - Buffs e proteção (8 frames, 22 fps)

## 💻 Como Usar no Código

### Método Básico
```javascript
// Tocar efeito em posição específica
playParticleEffect('fire-arrow', x, y, {
  scale: 0.8,      // Escala do efeito
  loop: false,     // Repetir?
  onComplete: () => console.log('Efeito terminou')
});
```

### Em Carta Específica
```javascript
// Aplicar efeito sobre uma carta pelo ID
particleOnCard(cardId, 'water-ball', { scale: 0.75 });
```

### Usando Atalhos de Ação
```javascript
// Sistema mapeia ações automaticamente
playGameEffect('heal', cardId);    // water-ball
playGameEffect('attack', cardId);  // fire-arrow
playGameEffect('death', cardId);   // fire-ball
```

## 🔧 Mapeamento de Ações

O sistema já mapeia automaticamente:
- **Ataques físicos** → `fire-arrow`
- **Explosões/Morte** → `fire-ball`
- **Magias/Buffs** → `fire-spell` ou `water-spell`
- **Cura** → `water-ball`

## ➕ Adicionar Novos Efeitos

1. Crie uma pasta com o nome do efeito em `effects/`
2. Adicione os frames PNG em `[nome]/PNG/` seguindo o padrão: `[Nome]_Frame_01.png`
3. Registre em `js/particles.js` no objeto `EFFECTS`:

```javascript
'novo-efeito': { 
  frames: 10,              // Quantidade de frames
  fps: 24,                 // Velocidade da animação
  path: 'Novo Efeito',     // Nome da pasta
  name: 'Novo Efeito'      // Nome base dos arquivos
}
```

## 🎨 Ícones Estáticos

Ícones estáticos de cada efeito estão em `Icons/PNG/` para uso em UI, tooltips, etc.

