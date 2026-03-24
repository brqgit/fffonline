# Visual Architecture

## Runtime

O runtime visual global fica em `window.FFFVisual`, criado por [public/js/visual-bootstrap.js](c:/Users/jhonny.quirino/APP/My/fffonline/public/js/visual-bootstrap.js).

Campos principais:
- `FFFVisual.layers.three`
- `FFFVisual.layers.pixi`
- `FFFVisual.canvases.three`
- `FFFVisual.canvases.pixi`
- `FFFVisual.libs.three`
- `FFFVisual.libs.pixi`
- `FFFVisual.plugins.threeBackground`
- `FFFVisual.plugins.pixiBattleEffects`
- `FFFVisual.themes.visual`
- `FFFVisual.themes.effects`
- `FFFVisual.stats.three`
- `FFFVisual.stats.pixi`
- `FFFVisual.getStatsSnapshot()`
- `FFFVisual.logStats()`

Flags de estado no DOM:
- `data-bootstrap`
- `data-libs-ready`
- `data-themes-ready`
- `data-three-ready`
- `data-three-active`
- `data-three-screen`
- `data-three-context`
- `data-three-battle-theme`
- `data-pixi-ready`
- `data-pixi-active`
- `data-pixi-assets-ready`

## Event Bus

Os efeitos são dirigidos por `window.FFFEvents`, criado em [public/js/visual-events.js](c:/Users/jhonny.quirino/APP/My/fffonline/public/js/visual-events.js).

Eventos já conectados:
- `screen:change`
- `battle:start`
- `battle:end`
- `battle:theme`
- `card:played`
- `card:damaged`
- `card:healed`
- `card:mana`
- `card:buffed`
- `card:debuffed`
- `shop:open`
- `shop:close`
- `campaign:map:open`
- `campaign:map:close`
- `campaign:event:open`
- `campaign:event:close`
- `campaign:event:theme`
- `campaign:reward:open`
- `campaign:reward:close`
- `overlay:archive:open`
- `overlay:archive:close`
- `overlay:system:open`
- `overlay:system:close`
- `deck:preview:open`
- `deck:preview:close`

## Modules

Base comum:
- [public/js/visual-runtime.js](c:/Users/jhonny.quirino/APP/My/fffonline/public/js/visual-runtime.js): espera runtime/libs compartilhadas
- [public/js/visual-theme.js](c:/Users/jhonny.quirino/APP/My/fffonline/public/js/visual-theme.js): presets e overrides do `Three`
- [public/js/visual-effects-theme.js](c:/Users/jhonny.quirino/APP/My/fffonline/public/js/visual-effects-theme.js): catálogo de cores do `Pixi`

Layers:
- [public/js/visual-three.js](c:/Users/jhonny.quirino/APP/My/fffonline/public/js/visual-three.js): ambiente, contexto de tela, preview 3D restrito
- [public/js/visual-pixi.js](c:/Users/jhonny.quirino/APP/My/fffonline/public/js/visual-pixi.js): efeitos 2D em batalha

## Ownership

Divisão atual:
- DOM/CSS: layout, HUD, modais, fluxo base
- `Three.js`: ambientação de fundo e preview 3D restrito do deck preview
- `PixiJS`: VFX 2D em runtime sobre cartas e área da batalha

## Visual Review

Para revisar no preview do VS Code:
1. Abra `http://localhost:3000`
2. Para `Three`: verifique `data-three-*` no `body`
3. Para `Pixi`: verifique `data-pixi-*` no `#renderRoot`
4. Deck preview: abrir seleção de deck e então o preview do deck
5. Pixi: iniciar uma partida e observar dano/cura/mana/buff/debuff
6. Console rápido:
   `FFFVisual.getStatsSnapshot()`
7. Atalho global:
   `__FFF_VISUAL_STATS__()`
