# Instruções rápidas para agentes (projeto: fffonline)

Resumo curto
- Projeto: jogo web estático + servidor Node. Frontend está em `public/` e é servido por `server.js` (Express + Socket.IO).
- Objetivo para um agente: alterar UI/CSS/JS do cliente e coordenar eventos de multiplayer via Socket.IO no servidor.

Como rodar / comandos importantes
- Instalar dependências: (Node >= 20)
  - `npm install` (se adicionar dependências)
- Iniciar servidor local:
  - `npm start` (executa `node server.js`)
- Não há testes automatizados no repositório atualmente (script `test` apenas ecoa mensagem).

Arquitetura e divisões principais
- Backend: `server.js`
  - Express serve `public/` como estático.
  - Socket.IO lida com salas (rooms) em memória (`rooms` Map). Eventos centrais: `host`, `join`, `listRooms`, `deckChoice`, `startReady`, `move`, `turn`, `emoji`, `rematch`, `rejoin`, `resign`.
  - Estado: sessões e temporizadores de reconexão mantidos em memória (sem persistência). Simples, single-process.
- Frontend (cliente): `public/`
  - `index.html` monta a UI e carrega CSS + scripts.
  - Estilos: `public/css/style.css` usa muitas variáveis CSS (`:root`), controla layout e temas do card game (tamanho de carta via `--card-w`).
  - Rede: `public/js/net-client.js` encapsula o socket.io client e exporta um objeto global `NET` com métodos `host()`, `join(code)`, `deckChoice()`, `startReady()` e `on*` para receber eventos.
  - Interface: `public/js/multiplayer.js` (UI de sala/partida) consome `NET` para interações de MP. Outros módulos (menu, game, shop) ligam-se aos eventos/DOM.

Padrões e convenções do projeto (úteis para editar e testar)
- Deck IDs permitidos: `vikings`, `animais`, `pescadores`, `floresta`, `convergentes`, `custom` (validados no `server.js` via `VALID_DECKS`).
- Frontend usa globals simples: `NET`, `showReconnect`, `hideReconnect`, `window.playerName`, `window.isMultiplayer` — alterar escopo pode quebrar código que espera globals.
- Arquivos estáticos organizados: imagens em `public/img/` (decks em `public/img/decks/<deck-name>/...`). Mantenha caminhos relativos usados no CSS (`--cb-vikings` etc.).
- CSS usa variáveis para theming e dimensões (`--card-w`, `--card-h`) — prefira ajustar variáveis em vez de sobrescrever regras profundas.

Como adicionar/alterar um evento Socket.IO (exemplo concreto)
1. Server: em `server.js` dentro de `io.on('connection', socket => { ... })` adicionar handler:
   ```js
   socket.on('spectate', (room) => { /* lógica */ });
   ```
2. Client network layer: em `public/js/net-client.js` exportar um método e um listener:
   ```js
   spectate(room){ socket.emit('spectate', room) }
   onSpectate(handler){ socket.on('spectate', handler) }
   ```
3. UI hook: no arquivo de UI (ex.: `public/js/multiplayer.js`) chamar `NET.spectate(code)` ou registrar `NET.onSpectate(...)`.

Debug / inspeção rápida
- Logs do servidor: `console.log` no `server.js` aparece no terminal onde `npm start` foi rodado.
- Debug do Socket.IO no cliente: inspecione Console/Network no navegador; `public/js/net-client.js` já registra alguns erros de conexão.
- Estado de salas: `rooms` é um Map em `server.js` — para debugging local pode-se emitir `console.log([...rooms])` quando necessário.

Riscos e limitações a considerar
- Persistência: salas e estados ficam em memória. Reiniciar servidor limpa salas. Não implementar alterações que dependam de armazenamento sem planejar persistência.
- Escalabilidade: design single-process; para cluster multiprocess/arbitragem de sockets seria necessária redis/adapters.
- Segurança: não há autenticação nem rate-limiting — eventos aceitam strings/objetos simples. Evite mudanças que exponham execuções remotas sem sanitizar dados.

Sugestões de tarefas seguras para um agente
- Melhorias visuais isoladas: editar `public/css/style.css` (usar variáveis). Evitar regras globais que alterem `pointer-events` ou z-index das overlays sem testes.
- Pequenas features de socket: adicionar evento para `spectate` ou `chat` seguindo o contrato `server.js` + `net-client.js` + `multiplayer.js`.
- Acessibilidade: respeitar `prefers-reduced-motion` em animações CSS e adicionar `:focus-visible` em elementos interativos.

Onde procurar ao trabalhar neste repo
- Principal: `server.js`, `public/index.html`, `public/css/style.css`, `public/js/net-client.js`, `public/js/multiplayer.js`, `public/js/game.js`.
- Assets: `public/img/decks/` e `public/img/ui/`.

Seções que podem precisar de mais informação (peça ao mantenedor)
- Fluxos esperados de multiplayer (ex.: como o front deve reagir a `startGame` em detalhe).
- Test matrix / browsers alvo (para validações visuais).

Peça de seguimento
- Quer que eu já abra um PR com esse ficheiro no repositório? Ou prefere que eu ajuste linguagem/itens específicos (por exemplo adicionar um checklist de QA para mudanças em CSS)?
